const mongoose = require("mongoose");
const Counter = require("./Counter");

const YES_NO_UNKNOWN = ["Yes", "No", "Not Known"];

const warrantyItemSchema = new mongoose.Schema(
  {
    product: { type: String, required: true, trim: true },
    packSize: { type: String, required: true, trim: true },
    containers: { type: Number, required: true, min: 1 },
    totalQuantity: { type: String, trim: true, default: "" },
    batchNumbers: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Enter at least one batch number.",
      },
    },
    shadeType: { type: String, enum: ["White", "Tinted Shade"], required: true },
    // Snapshotted at registration time from the product master, e.g. "7 YEARS" —
    // so a later change to the master never alters an already-registered warranty.
    warrantyPeriod: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const warrantyRegistrationSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true },
    warrantyNumber: { type: String, default: null },

    status: {
      type: String,
      enum: ["SUBMITTED", "UNDER_VERIFICATION", "APPROVED", "WARRANTY_ISSUED", "REJECTED", "CANCELLED"],
      default: "SUBMITTED",
    },
    rejectionReason: { type: String, trim: true, default: "" },

    customerName: { type: String, required: true, trim: true, minlength: 2 },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid mobile number"],
      index: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    customerType: {
      type: String,
      enum: ["Owner", "Tenant", "Builder", "Contractor", "Institution", "Other"],
      required: true,
    },
    alternateMobile: { type: String, trim: true, default: "" },

    siteName: { type: String, required: true, trim: true },
    houseNo: { type: String, trim: true, default: "" },
    street: { type: String, required: true, trim: true },
    panchayat: { type: String, required: true, trim: true },
    siteDistrict: { type: String, required: true, trim: true },
    siteState: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, "Enter a 6-digit PIN code"] },
    propertyType: {
      type: String,
      enum: ["Residential", "Apartment", "Commercial", "Institutional", "Industrial", "Other"],
      required: true,
    },
    paintingType: { type: String, enum: ["New Building", "Repainting"], required: true },
    buildingAge: { type: Number, default: null },

    purchaseDate: { type: Date, required: true },
    invoiceNumber: { type: String, required: true, trim: true, index: true },
    purchaseState: { type: String, required: true, trim: true },
    purchaseDistrict: { type: String, required: true, trim: true },
    outlet: { type: String, required: true, trim: true },

    items: {
      type: [warrantyItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Add at least one product.",
      },
    },

    paintingStartDate: { type: Date, required: true },
    paintingCompletionDate: { type: Date, required: true },
    applicationArea: { type: String, enum: ["Interior", "Exterior", "Both"], required: true },
    paintedAreaSqft: { type: Number, required: true },
    topcoats: { type: Number, required: true },
    applicationMethod: { type: String, enum: ["Brush", "Roller", "Spray", "Combination", ""], default: "" },
    painterName: { type: String, required: true, trim: true },
    painterMobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid mobile number"],
    },

    puttyUsed: { type: String, enum: ["Yes", "No"], required: true },
    puttyBrand: { type: String, trim: true, default: "" },
    primerUsed: { type: String, enum: ["Yes", "No"], required: true },
    primerBrand: { type: String, trim: true, default: "" },
    primerProductName: { type: String, trim: true, default: "" },
    primerCoats: { type: Number, default: null },
    baseCoatUsed: { type: String, enum: ["Yes", "No", ""], default: "" },
    baseCoatDetails: { type: String, trim: true, default: "" },

    surfaceCondition: {
      waterLeakageBefore: { type: String, enum: YES_NO_UNKNOWN, required: true },
      dampnessRisingDamp: { type: String, enum: YES_NO_UNKNOWN, required: true },
      structuralCracks: { type: String, enum: YES_NO_UNKNOWN, required: true },
      loosePlaster: { type: String, enum: YES_NO_UNKNOWN, required: true },
      existingPeeling: { type: String, enum: YES_NO_UNKNOWN, required: true },
      efflorescence: { type: String, enum: YES_NO_UNKNOWN, required: true },
      fungusAlgae: { type: String, enum: YES_NO_UNKNOWN, required: true },
      plumbingLeakage: { type: String, enum: YES_NO_UNKNOWN, required: true },
    },

    declarations: {
      infoAccurate: { type: Boolean, required: true },
      applicationAccurate: { type: Boolean, required: true },
      policyAccepted: { type: Boolean, required: true },
      eligibilityUnderstood: { type: Boolean, required: true },
      inspectionAccess: { type: Boolean, required: true },
      privacyConsent: { type: Boolean, required: true },
      marketingConsent: { type: Boolean, default: false },
    },
    acceptedPolicyVersion: { type: String, default: "v1-draft" },
    declarationAcceptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

warrantyRegistrationSchema.pre("validate", async function assignToken(next) {
  if (this.token) return next();

  try {
    const year = new Date().getFullYear();
    const counterId = `warranty-${year}`;

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.token = `WR-${year}-${String(counter.seq).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("WarrantyRegistration", warrantyRegistrationSchema);