const express = require("express");
const Complaint = require("../models/Complaint");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const Admin = require("../models/Admin");
const { requireAdmin, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { logActivity } = require("../utils/activityLog");
const { sendClaimSolvedEmail } = require("../utils/email");
const { containsRegex, asText, exactRegex } = require("../utils/regex");
const { claimEligibility, itemCoverage, matchRequestedItems, formatDate } = require("../utils/claimEligibility");
const router = express.Router();

// Emails the customer when their claim is marked Solved. Never throws — a mail
// problem must not stop the status change from being saved.
async function notifyClaimSolved(complaint) {
  try {
    const registration = await WarrantyRegistration.findOne({ token: complaint.warrantyToken });
    if (!registration || !registration.email) {
      console.warn(`Solved email skipped for ${complaint.token}: no registration email on file`);
      return "skipped";
    }
    await sendClaimSolvedEmail({
      email: registration.email,
      customerName: complaint.customerName,
      token: complaint.token,
      items: complaint.items,
    });
    return "sent";
  } catch (err) {
    console.error("Claim solved email failed:", err.message);
    return "failed";
  }
}

const PUBLIC_FIELDS = [
  "date",
  "district",
  "outlet",
  "customerName",
  "contactNumber",
  "address",
  "invoiceNumber",
  "complaintText",
];

router.post("/", async (req, res) => {
  try {
        const warrantyToken = asText(req.body.warrantyToken);
    if (!warrantyToken) {
      return res.status(400).json({ message: "A warranty registration is required to file a claim." });
    }

    // WR numbers run in sequence and are easy to guess, so the person must also
    // give the invoice number and mobile number the registration was made with.
    // One message for every kind of mismatch, so nobody can probe which WR numbers exist.
    const registration = await WarrantyRegistration.findOne({ token: warrantyToken.toUpperCase() });
    const invoiceRe = exactRegex(req.body.invoiceNumber);
    const mobile = asText(req.body.contactNumber);
    const detailsMatch =
      registration && invoiceRe && mobile && invoiceRe.test(registration.invoiceNumber) && registration.mobileNumber === mobile;
    if (!detailsMatch) {
      return res.status(400).json({
        message: "We couldn't verify those details. Check the invoice number and mobile number you registered with.",
      });
    }

    // Only approved registrations, and only products whose warranty is still running.
    const eligibility = claimEligibility(registration);
    if (!eligibility.claimable) {
      return res.status(403).json({ message: eligibility.message, code: eligibility.code });
    }

    // Take the product lines from the registration itself, not from the request.
    const matched = matchRequestedItems(registration, req.body.items);
    if (matched.error) {
      return res.status(400).json({ message: matched.error });
    }
    const coverage = itemCoverage(registration);
    const expired = matched.indexes.map((i) => coverage[i]).find((c) => c.expired);
    if (expired) {
      return res.status(403).json({
        code: "EXPIRED",
        message: `The warranty on ${expired.product} ended on ${formatDate(expired.expiresOn)}, so a claim can't be filed for it.`,
      });
    }

    // Customer details and dates also come from the registration / the server clock.
    const complaint = await Complaint.create({
      warrantyToken: registration.token,
      date: new Date(),
      district: registration.siteDistrict,
      outlet: registration.outlet,
      customerName: registration.customerName,
      contactNumber: registration.mobileNumber,
      address: `${registration.siteName}, ${registration.street}`,
      invoiceNumber: registration.invoiceNumber,
      complaintText: req.body.complaintText,
      items: matched.indexes.map((i) => registration.items[i].toObject()),
    });

    res.status(201).json({
      message: "Claim submitted successfully.",
      token: complaint.token,
      status: complaint.status,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.fromEntries(
        Object.entries(err.errors).map(([key, val]) => [key, val.message])
      );
      return res.status(400).json({ message: "Please check the form for errors.", errors });
    }
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/track/:token", async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ token: req.params.token.toUpperCase() }).select(
      "token status date items createdAt updatedAt"
    );
    if (!complaint) {
      return res.status(404).json({ message: "No claim found with that token." });
    }
    res.json(complaint);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.use(requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status && Complaint.STATUS_VALUES.includes(status)) {
      filter.status = status;
    }
      const re = containsRegex(search);
    if (re) {
      filter.$or = [
        { token: re },
        { customerName: re },
        { contactNumber: re },
        { invoiceNumber: re },
        { district: re },
        { outlet: re },
        { warrantyToken: re },
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate("assignedTo", "username name")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/mine", requireRole("manager"), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { assignedTo: req.admin.id };
    if (status && Complaint.STATUS_VALUES.includes(status)) filter.status = status;

    const complaints = await Complaint.find(filter).sort({ assignedAt: -1 });
    res.json(complaints);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/counts", async (req, res) => {
  try {
    const results = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { new: 0, assigned: 0, review: 0, pending: 0, solved: 0 };
    for (const r of results) counts[r._id] = r.count;
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(
      "assignedTo",
      "username name"
    );
    if (!complaint) return res.status(404).json({ message: "Complaint not found." });
    res.json(complaint);
  } catch (err) {
    res.status(400).json({ message: "Invalid complaint id." });
  }
});

router.patch("/:id/assign", requireRole("admin"), async (req, res) => {
  try {
    const { managerId } = req.body;
    const manager = await Admin.findOne({ _id: managerId, role: "manager" });
    if (!manager) {
      return res.status(400).json({ message: "Select a valid manager." });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found." });

    complaint.assignedTo = manager._id;
    complaint.assignedAt = new Date();
    complaint.status = "assigned";
    complaint.statusHistory.push({ status: "assigned", changedBy: req.admin.id });
    await complaint.save();

    const populated = await complaint.populate("assignedTo", "username name");

    await logActivity({
      actor: req.admin,
      action: "complaint.assigned",
      entityType: "complaint",
      entityId: complaint._id,
      entityToken: complaint.token,
      summary: `${req.admin.username} assigned claim ${complaint.token} to ${manager.name || manager.username}`,
    });

    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Could not assign the complaint." });
  }
});

router.patch(
  "/:id/submit",
  requireRole("manager"),
  upload.single("image"),
  async (req, res) => {
    try {
      const { description } = req.body;
      if (!description || !description.trim()) {
        return res.status(400).json({ message: "Add a description before submitting." });
      }

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: "Complaint not found." });

      if (String(complaint.assignedTo) !== String(req.admin.id)) {
        return res.status(403).json({ message: "This complaint isn't assigned to you." });
      }

      complaint.managerSubmission = {
        description: description.trim(),
        imageUrl: req.file ? `/uploads/${req.file.filename}` : complaint.managerSubmission?.imageUrl || "",
        submittedAt: new Date(),
      };
      complaint.status = "review";
      complaint.statusHistory.push({ status: "review", changedBy: req.admin.id });
      await complaint.save();

      await logActivity({
        actor: req.admin,
        action: "complaint.submitted",
        entityType: "complaint",
        entityId: complaint._id,
        entityToken: complaint.token,
        summary: `${req.admin.username} submitted a repair report for claim ${complaint.token}`,
      });

      res.json(complaint);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message || "Could not submit the complaint." });
    }
  }
);

router.patch(
  "/:id/status",
  requireRole("happiness_manager", "admin"),
  async (req, res) => {
    try {
      const { status, note } = req.body;
      if (!["pending", "solved"].includes(status)) {
        return res.status(400).json({ message: "Status must be pending or solved." });
      }

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) return res.status(404).json({ message: "Complaint not found." });

      const previousStatus = complaint.status;

      complaint.status = status;
      complaint.statusHistory.push({ status, changedBy: req.admin.id, note });
      await complaint.save();

      await logActivity({
        actor: req.admin,
        action: "complaint.status_changed",
        entityType: "complaint",
        entityId: complaint._id,
        entityToken: complaint.token,
        summary: `${req.admin.username} marked claim ${complaint.token} as ${status}`,
        meta: note ? { status, note } : { status },
      });

      // Email the customer only when the claim newly becomes Solved.
      if (status === "solved" && previousStatus !== "solved") {
        await notifyClaimSolved(complaint);
      }

      res.json(complaint);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Could not update status." });
    }
  }
);

module.exports = router;