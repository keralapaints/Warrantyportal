const express = require("express");
const Complaint = require("../models/Complaint");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const Admin = require("../models/Admin");
const { requireAdmin, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

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

// POST /api/complaints — customer files a warranty claim. No auth required,
// but a valid warrantyToken from a real registration is mandatory — this
// is enforced here, not just hidden in the UI.
router.post("/", async (req, res) => {
  try {
    const { warrantyToken } = req.body;
    if (!warrantyToken) {
      return res.status(400).json({ message: "A warranty registration is required to file a claim." });
    }

    const registration = await WarrantyRegistration.findOne({
      token: warrantyToken.trim().toUpperCase(),
    });
    if (!registration) {
      return res.status(400).json({
        message: "We couldn't verify that warranty registration. Please register your product first.",
      });
    }

    const payload = { warrantyToken: registration.token };
    for (const field of PUBLIC_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    if (Array.isArray(req.body.items)) {
      payload.items = req.body.items.map((it) => ({
        product: it.product,
        batchNo: Number(it.batchNo),
        quantity: it.quantity,
        code: Number(it.code),
      }));
    }

    const complaint = await Complaint.create(payload);

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
    if (search) {
      const re = new RegExp(search.trim(), "i");
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

      complaint.status = status;
      complaint.statusHistory.push({ status, changedBy: req.admin.id, note });
      await complaint.save();

      res.json(complaint);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Could not update status." });
    }
  }
);

module.exports = router;