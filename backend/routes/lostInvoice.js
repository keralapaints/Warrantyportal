const express = require("express");
const LostInvoiceRequest = require("../models/LostInvoiceRequest");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const Complaint = require("../models/Complaint");
const { requireAdmin, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");

const router = express.Router();

const PUBLIC_FIELDS = [
  "customerName",
  "mobileNumber",
  "email",
  "siteName",
  "street",
  "siteDistrict",
  "approxPurchaseDate",
  "productDescription",
  "complaintText",
];

// POST /api/warranty/lost-invoice — customer submits without an invoice number.
// No auth required.
router.post("/", async (req, res) => {
  try {
    const payload = {};
    for (const field of PUBLIC_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    const request = await LostInvoiceRequest.create(payload);

    res.status(201).json({
      message: "Request submitted. Our team will review it and get in touch.",
      token: request.token,
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

// --- Everything below is for admin / happiness_manager review ---
router.use(requireAdmin, requireRole("admin", "happiness_manager"));

// GET /api/warranty/lost-invoice?status=pending&search=...
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ token: re }, { customerName: re }, { mobileNumber: re }, { siteName: re }];
    }
    const requests = await LostInvoiceRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// PATCH /api/warranty/lost-invoice/:id/approve
// body: { warrantyToken, itemIndices: [0, 2] } — which of the matched
// registration's products this claim covers. Omit itemIndices to use all.
router.patch("/:id/approve", async (req, res) => {
  try {
    const { warrantyToken, itemIndices } = req.body;
    if (!warrantyToken) {
      return res.status(400).json({ message: "Select the matching warranty registration." });
    }

    const request = await LostInvoiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been reviewed." });
    }

    const registration = await WarrantyRegistration.findOne({
      token: warrantyToken.trim().toUpperCase(),
    });
    if (!registration) {
      return res.status(400).json({ message: "No warranty registration found with that token." });
    }

    const items =
      Array.isArray(itemIndices) && itemIndices.length > 0
        ? registration.items.filter((_, i) => itemIndices.includes(i))
        : registration.items;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Select at least one product from the registration." });
    }

    const complaint = await Complaint.create({
      warrantyToken: registration.token,
      date: new Date(),
      district: registration.siteDistrict,
      outlet: registration.outlet,
      customerName: registration.customerName,
      contactNumber: registration.mobileNumber,
      address: `${registration.siteName}, ${registration.street}`,
      invoiceNumber: registration.invoiceNumber,
      complaintText: request.complaintText,
      items,
    });

    request.status = "approved";
    request.matchedWarrantyToken = registration.token;
    request.resultingClaimToken = complaint.token;
    request.reviewedBy = req.admin.id;
    request.reviewedAt = new Date();
    await request.save();

    await logActivity({
      actor: req.admin,
      action: "lost_invoice.approved",
      entityType: "lost_invoice",
      entityId: request._id,
      entityToken: request.token,
      summary: `${req.admin.username} approved lost-invoice request ${request.token}, creating claim ${complaint.token}`,
      meta: { matchedWarrantyToken: registration.token, claimToken: complaint.token },
    });

    res.json({ message: "Claim created.", claimToken: complaint.token, request });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Could not approve this request." });
  }
});

// PATCH /api/warranty/lost-invoice/:id/reject
router.patch("/:id/reject", async (req, res) => {
  try {
    const { reviewNote } = req.body;
    const request = await LostInvoiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "This request has already been reviewed." });
    }

    request.status = "rejected";
    request.reviewNote = reviewNote || "";
    request.reviewedBy = req.admin.id;
    request.reviewedAt = new Date();
    await request.save();

    await logActivity({
      actor: req.admin,
      action: "lost_invoice.rejected",
      entityType: "lost_invoice",
      entityId: request._id,
      entityToken: request.token,
      summary: `${req.admin.username} rejected lost-invoice request ${request.token}`,
      meta: reviewNote ? { reviewNote } : undefined,
    });

    res.json({ message: "Request rejected.", request });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Could not reject this request." });
  }
});

module.exports = router;