const express = require("express");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const { requireAdmin } = require("../middleware/auth");
const { PRODUCTS, WARRANTY_YEARS_BY_PRODUCT } = require("../data/productMaster");

const router = express.Router();

const REGISTRATION_WINDOW_DAYS = 15;

const TOP_LEVEL_FIELDS = [
  "customerName", "mobileNumber", "email", "customerType", "alternateMobile",
  "siteName", "houseNo", "street", "panchayat", "siteDistrict", "siteState",
  "pincode", "propertyType", "paintingType", "buildingAge",
  "purchaseDate", "invoiceNumber", "purchaseState", "purchaseDistrict", "outlet",
  "paintingStartDate", "paintingCompletionDate", "applicationArea", "paintedAreaSqft",
  "topcoats", "applicationMethod", "painterName", "painterMobile",
  "puttyUsed", "puttyBrand", "primerUsed", "primerBrand", "primerProductName", "primerCoats",
  "baseCoatUsed", "baseCoatDetails",
];

router.post("/register", async (req, res) => {
  try {
    const { items, surfaceCondition, declarations } = req.body;

    const requiredDecls = [
      "infoAccurate", "applicationAccurate", "policyAccepted",
      "eligibilityUnderstood", "inspectionAccess", "privacyConsent",
    ];
    if (!declarations || requiredDecls.some((key) => declarations[key] !== true)) {
      return res.status(400).json({ message: "All mandatory declarations must be accepted." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one product." });
    }
    if (items.some((it) => !Array.isArray(it.batchNumbers) || it.batchNumbers.length === 0)) {
      return res.status(400).json({ message: "Enter at least one batch number for every product." });
    }

    // Rule 1: only products on the master list carry a declared warranty —
    // reject anything else outright, even if someone bypasses the dropdown
    // and calls this endpoint directly.
    const invalidProduct = items.find((it) => !PRODUCTS.includes(it.product));
    if (invalidProduct) {
      return res.status(400).json({
        message: `"${invalidProduct.product}" is not a Kerala Paints warranty-eligible product.`,
      });
    }

    if (req.body.purchaseDate) {
      const purchaseDate = new Date(req.body.purchaseDate);
      const daysSince = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > REGISTRATION_WINDOW_DAYS) {
        return res.status(400).json({
          message: `Registration must be completed within ${REGISTRATION_WINDOW_DAYS} days of purchase. This invoice is outside that window — contact us for manual review.`,
        });
      }
    }

    if (req.body.paintingStartDate && req.body.purchaseDate) {
      if (new Date(req.body.paintingStartDate) < new Date(req.body.purchaseDate)) {
        return res.status(400).json({ message: "Painting start date cannot be before the purchase date." });
      }
    }

    if (req.body.invoiceNumber && req.body.siteName && Array.isArray(items)) {
      const productNames = items.map((it) => it.product).filter(Boolean);
      const existing = await WarrantyRegistration.findOne({
        invoiceNumber: new RegExp(`^${req.body.invoiceNumber.trim()}$`, "i"),
        siteName: new RegExp(`^${req.body.siteName.trim()}$`, "i"),
        "items.product": { $in: productNames },
      });
      if (existing) {
        return res.status(409).json({
          message: "This invoice and site combination already has a registration on file.",
        });
      }
    }

    const payload = {};
    for (const field of TOP_LEVEL_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }

    payload.items = items.map((it) => {
      const containers = Number(it.containers);
      const packMatch = String(it.packSize || "").match(/^([\d.]+)\s*(.*)$/);
      const packQty = packMatch ? parseFloat(packMatch[1]) : null;
      const unit = packMatch ? packMatch[2] : "";
      const totalQuantity =
        packQty !== null && !Number.isNaN(containers)
          ? `${(packQty * containers).toFixed(2).replace(/\.00$/, "")} ${unit}`.trim()
          : "";

      return {
        product: it.product,
        packSize: it.packSize,
        containers,
        totalQuantity,
        batchNumbers: it.batchNumbers,
        shadeType: it.shadeType,
        warrantyPeriod: WARRANTY_YEARS_BY_PRODUCT[it.product] || "",
      };
    });

    payload.surfaceCondition = surfaceCondition;
    payload.declarations = declarations;
    payload.declarationAcceptedAt = new Date();

    const registration = await WarrantyRegistration.create(payload);

    res.status(201).json({
      message: "Registration submitted successfully.",
      token: registration.token,
      status: registration.status,
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

router.get("/verify", async (req, res) => {
  try {
    const { invoiceNumber, contactNumber } = req.query;
    if (!invoiceNumber || !contactNumber) {
      return res
        .status(400)
        .json({ registered: false, message: "Enter your invoice number and mobile number." });
    }

    const registration = await WarrantyRegistration.findOne({
      invoiceNumber: new RegExp(`^${invoiceNumber.trim()}$`, "i"),
      mobileNumber: contactNumber.trim(),
    });

    if (!registration) {
      return res.status(404).json({
        registered: false,
        message: "No warranty registration found for that invoice number and mobile number.",
      });
    }

    res.json({
      registered: true,
      token: registration.token,
      status: registration.status,
      customerName: registration.customerName,
      mobileNumber: registration.mobileNumber,
      siteName: registration.siteName,
      street: registration.street,
      siteDistrict: registration.siteDistrict,
      purchaseDistrict: registration.purchaseDistrict,
      outlet: registration.outlet,
      invoiceNumber: registration.invoiceNumber,
      items: registration.items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ registered: false, message: "Something went wrong. Please try again." });
  }
});

router.use(requireAdmin);

router.get("/", async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const re = new RegExp(search.trim(), "i");
      filter.$or = [{ token: re }, { customerName: re }, { mobileNumber: re }, { invoiceNumber: re }];
    }
    const registrations = await WarrantyRegistration.find(filter).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;