const express = require("express");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const PUBLIC_FIELDS = [
  "purchaseDate",
  "district",
  "outlet",
  "customerName",
  "contactNumber",
  "email",
  "address",
  "invoiceNumber",
  "applicatorName",
];

// POST /api/warranty/register — customer registers a purchase. No auth required.
router.post("/register", async (req, res) => {
  try {
    const payload = {};
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

    const registration = await WarrantyRegistration.create(payload);

    res.status(201).json({
      message: "Warranty registered successfully.",
      token: registration.token,
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

// GET /api/warranty/verify?invoiceNumber=..&contactNumber=..
// Used by the claim portal to confirm a warranty registration exists
// before letting the customer file a claim. No auth required.
router.get("/verify", async (req, res) => {
  try {
    const { invoiceNumber, contactNumber } = req.query;
    if (!invoiceNumber || !contactNumber) {
      return res
        .status(400)
        .json({ registered: false, message: "Enter your invoice number and contact number." });
    }

    const registration = await WarrantyRegistration.findOne({
      invoiceNumber: new RegExp(`^${invoiceNumber.trim()}$`, "i"),
      contactNumber: contactNumber.trim(),
    });

    if (!registration) {
      return res.status(404).json({
        registered: false,
        message: "No warranty registration found for that invoice number and contact number.",
      });
    }

    res.json({
      registered: true,
      token: registration.token,
      customerName: registration.customerName,
      contactNumber: registration.contactNumber,
      address: registration.address,
      district: registration.district,
      outlet: registration.outlet,
      invoiceNumber: registration.invoiceNumber,
      items: registration.items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ registered: false, message: "Something went wrong. Please try again." });
  }
});

// --- Admin-only below (for a future warranty admin view) ---
router.use(requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ token: re }, { customerName: re }, { contactNumber: re }, { invoiceNumber: re }];
    }
    const registrations = await WarrantyRegistration.find(filter).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;