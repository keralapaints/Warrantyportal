const express = require("express");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const OtpVerification = require("../models/OtpVerification");
const Complaint = require("../models/Complaint");
const { requireAdmin, requireRole } = require("../middleware/auth");
const { PRODUCTS, WARRANTY_YEARS_BY_PRODUCT } = require("../data/productMaster");
const { logActivity } = require("../utils/activityLog");
const { sendRegistrationApprovedEmail } = require("../utils/email");
const { asText, containsRegex, exactRegex } = require("../utils/regex");
const router = express.Router();
const { claimEligibility } = require("../utils/claimEligibility");

const REGISTRATION_WINDOW_DAYS = 15;

const TOP_LEVEL_FIELDS = [
  "customerName", "mobileNumber", "email", "customerType", "alternateMobile",
  "siteName", "houseNo", "street", "panchayat", "siteDistrict", "siteState",
  "pincode", "propertyType", "paintingType", "buildingAge",
  "purchaseDate", "invoiceNumber", "purchaseState", "purchaseDistrict", "outlet",
  "puttyUsed", "puttyBrand", "primerUsed", "primerBrand", "primerProductName", "primerCoats",
  "baseCoatUsed", "baseCoatDetails",
];

const REQUIRED_DECLARATIONS = [
  "infoAccurate", "applicationAccurate", "policyAccepted",
  "eligibilityUnderstood", "inspectionAccess", "privacyConsent",
];

// Sends the "registration approved" email. Never throws — a mail problem
// must not stop the registration from being saved.
async function notifyApproved(registration) {
  try {
    await sendRegistrationApprovedEmail(registration);
    return "sent";
  } catch (err) {
    console.error("Approval email failed:", err.message);
    return "failed";
  }
}

// Shared validation for the product/application arrays — used by the
// public register, and by admin create/update.
function validateItemsAndApplications(items, applications) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Add at least one product.";
  }
  if (items.some((it) => !Array.isArray(it.batchNumbers) || it.batchNumbers.length === 0)) {
    return "Enter at least one batch number for every product.";
  }
  const invalidProduct = items.find((it) => !PRODUCTS.includes(it.product));
  if (invalidProduct) {
    return `"${invalidProduct.product}" is not a Kerala Paints warranty-eligible product.`;
  }
  if (!Array.isArray(applications) || applications.length === 0) {
    return "Add at least one application entry.";
  }
  const completionBeforeStart = applications.find(
    (a) =>
      a.paintingStartDate &&
      a.paintingCompletionDate &&
      new Date(a.paintingCompletionDate) < new Date(a.paintingStartDate)
  );
  if (completionBeforeStart) {
    return "Painting completion date cannot be before the painting start date.";
  }
  return null;
}

function buildItemsPayload(items) {
  return items.map((it) => {
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
}

function buildApplicationsPayload(applications) {
  return applications.map((a) => ({
    paintingStartDate: a.paintingStartDate,
    paintingCompletionDate: a.paintingCompletionDate,
    applicationArea: a.applicationArea,
    paintedAreaSqft: Number(a.paintedAreaSqft),
    topcoats: Number(a.topcoats),
    applicationMethod: a.applicationMethod || "",
    painterName: a.painterName,
    painterMobile: a.painterMobile,
  }));
}

// POST /api/warranty/register — public customer registration. Requires a
// verified OTP for the given email before it will create anything.
router.post("/register", async (req, res) => {
  try {
    const { items, applications, surfaceCondition, declarations, email } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });
    if (!otpRecord || !otpRecord.verified) {
      return res.status(400).json({ message: "Please verify your email before submitting." });
    }

    if (!declarations || REQUIRED_DECLARATIONS.some((key) => declarations[key] !== true)) {
      return res.status(400).json({ message: "All mandatory declarations must be accepted." });
    }

    const itemsError = validateItemsAndApplications(items, applications);
    if (itemsError) return res.status(400).json({ message: itemsError });

    if (req.body.purchaseDate) {
      const purchaseDate = new Date(req.body.purchaseDate);

      const beforePurchase = applications.find(
        (a) => a.paintingStartDate && new Date(a.paintingStartDate) < purchaseDate
      );
      if (beforePurchase) {
        return res.status(400).json({ message: "Painting start date cannot be before the purchase date." });
      }

      const daysSince = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > REGISTRATION_WINDOW_DAYS) {
        return res.status(400).json({
          message: `Registration must be completed within ${REGISTRATION_WINDOW_DAYS} days of purchase. This invoice is outside that window — contact us for manual review.`,
        });
      }
    }

      const invoiceRe = exactRegex(req.body.invoiceNumber);
    const siteRe = exactRegex(req.body.siteName);
    if (invoiceRe && siteRe && Array.isArray(items)) {
      const productNames = items.map((it) => it.product).filter(Boolean);
      const existing = await WarrantyRegistration.findOne({
        invoiceNumber: invoiceRe,
        siteName: siteRe,
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
    payload.items = buildItemsPayload(items);
    payload.applications = buildApplicationsPayload(applications);
    payload.surfaceCondition = surfaceCondition;
    payload.declarations = declarations;
    payload.declarationAcceptedAt = new Date();

    const registration = await WarrantyRegistration.create(payload);

    await logActivity({
      actor: { username: "customer", role: "public" },
      action: "warranty.created",
      entityType: "warranty",
      entityId: registration._id,
      entityToken: registration.token,
      summary: `${registration.customerName} self-registered warranty ${registration.token} via the public form`,
    });

    // Clean up the OTP record now that it's served its purpose.
    await OtpVerification.deleteOne({ email: normalizedEmail });

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
       const invoiceRe = exactRegex(req.query.invoiceNumber);
    const mobile = asText(req.query.contactNumber);
    if (!invoiceRe || !mobile) {
      return res
        .status(400)
        .json({ registered: false, message: "Enter your invoice number and mobile number." });
    }

    const registration = await WarrantyRegistration.findOne({
           invoiceNumber: invoiceRe,
      mobileNumber: mobile,
    });

    if (!registration) {
      return res.status(404).json({
        registered: false,
        message: "No warranty registration found for that invoice number and mobile number.",
      });
    }

        // The Claim page uses this to explain "still under review" / "warranty ended"
    // up front, instead of letting the person fill in a claim that will be refused.
    const eligibility = claimEligibility(registration);

    res.json({
      registered: true,
      claimable: eligibility.claimable,
      claimMessage: eligibility.message,
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
  items: registration.items.map((item, i) => ({
        ...item.toObject(),
        warrantyExpiresOn: eligibility.items[i].expiresOn,
        warrantyExpired: eligibility.items[i].expired,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ registered: false, message: "Something went wrong. Please try again." });
  }
});

// --- Everything below requires login ---
router.use(requireAdmin);

// GET /api/warranty?search=... — any logged-in staff can view/search
// (admin, and happiness_manager for the Lost Invoice review search).
router.get("/", async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
        const re = containsRegex(search);
    if (re) {
      filter.$or = [{ token: re }, { customerName: re }, { mobileNumber: re }, { invoiceNumber: re }];
    }
    const registrations = await WarrantyRegistration.find(filter).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// POST /api/warranty — admin manually creates a registration (phone/walk-in).
// No OTP required (admin is trusted), and the 15-day window is not enforced
// since admin may be backdating an older, legitimate registration.
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { items, applications, surfaceCondition, declarations, status } = req.body;

    if (!declarations || REQUIRED_DECLARATIONS.some((key) => declarations[key] !== true)) {
      return res.status(400).json({ message: "All mandatory declarations must be accepted." });
    }

    const itemsError = validateItemsAndApplications(items, applications);
    if (itemsError) return res.status(400).json({ message: itemsError });

    if (req.body.purchaseDate && applications) {
      const purchaseDate = new Date(req.body.purchaseDate);
      const beforePurchase = applications.find(
        (a) => a.paintingStartDate && new Date(a.paintingStartDate) < purchaseDate
      );
      if (beforePurchase) {
        return res.status(400).json({ message: "Painting start date cannot be before the purchase date." });
      }
    }

    const payload = {};
    for (const field of TOP_LEVEL_FIELDS) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }
    payload.items = buildItemsPayload(items);
    payload.applications = buildApplicationsPayload(applications);
    payload.surfaceCondition = surfaceCondition;
    payload.declarations = declarations;
    payload.declarationAcceptedAt = new Date();
    if (status) payload.status = status;

    const registration = await WarrantyRegistration.create(payload);

    await logActivity({
      actor: req.admin,
      action: "warranty.created",
      entityType: "warranty",
      entityId: registration._id,
      entityToken: registration.token,
      summary: `${req.admin.username} manually created warranty registration ${registration.token} for ${registration.customerName}`,
    });

    // Created directly as APPROVED -> tell the customer.
    const approvalEmail =
      registration.status === "APPROVED" ? await notifyApproved(registration) : "not_applicable";

    res.status(201).json({ message: "Registration created.", registration, approvalEmail });
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

// PATCH /api/warranty/:id — admin edits any field of an existing registration.
router.patch("/:id", requireRole("admin"), async (req, res) => {
  try {
    const registration = await WarrantyRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found." });

    const previousStatus = registration.status;

    const { items, applications, surfaceCondition, declarations, status } = req.body;

    if (!declarations || REQUIRED_DECLARATIONS.some((key) => declarations[key] !== true)) {
      return res.status(400).json({ message: "All mandatory declarations must be accepted." });
    }

    const itemsError = validateItemsAndApplications(items, applications);
    if (itemsError) return res.status(400).json({ message: itemsError });

    for (const field of TOP_LEVEL_FIELDS) {
      if (req.body[field] !== undefined) registration[field] = req.body[field];
    }
    registration.items = buildItemsPayload(items);
    registration.applications = buildApplicationsPayload(applications);
    registration.surfaceCondition = surfaceCondition;
    registration.declarations = declarations;
    if (status) registration.status = status;

    await registration.save();

    const statusChanged = status && status !== previousStatus;
    await logActivity({
      actor: req.admin,
      action: "warranty.updated",
      entityType: "warranty",
      entityId: registration._id,
      entityToken: registration.token,
      summary: statusChanged
        ? `${req.admin.username} updated registration ${registration.token} (status: ${previousStatus} → ${registration.status})`
        : `${req.admin.username} updated registration ${registration.token}`,
      meta: statusChanged ? { from: previousStatus, to: registration.status } : undefined,
    });

    // Email the customer only when the status newly becomes APPROVED —
    // not on every later edit of an already-approved registration.
    let approvalEmail = "not_applicable";
    if (previousStatus !== "APPROVED" && registration.status === "APPROVED") {
      approvalEmail = await notifyApproved(registration);
    }

    res.json({ message: "Registration updated.", registration, approvalEmail });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.fromEntries(
        Object.entries(err.errors).map(([key, val]) => [key, val.message])
      );
      return res.status(400).json({ message: "Please check the form for errors.", errors });
    }
    console.error(err);
    res.status(400).json({ message: "Could not update this registration." });
  }
});

// DELETE /api/warranty/:id — admin deletes a registration, blocked if any
// claim already references it (protects referential integrity).
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const registration = await WarrantyRegistration.findById(req.params.id);
    if (!registration) return res.status(404).json({ message: "Registration not found." });

    const linkedClaims = await Complaint.countDocuments({ warrantyToken: registration.token });
    if (linkedClaims > 0) {
      return res.status(409).json({
        message: `Cannot delete — ${linkedClaims} claim(s) reference this registration (${registration.token}). Resolve those claims first.`,
      });
    }

    await WarrantyRegistration.deleteOne({ _id: registration._id });

    await logActivity({
      actor: req.admin,
      action: "warranty.deleted",
      entityType: "warranty",
      entityId: registration._id,
      entityToken: registration.token,
      summary: `${req.admin.username} deleted warranty registration ${registration.token} (${registration.customerName})`,
    });

    res.json({ message: "Registration deleted." });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Could not delete this registration." });
  }
});

module.exports = router;