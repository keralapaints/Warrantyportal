const mongoose = require("mongoose");
const Counter = require("./Counter");

const lostInvoiceRequestSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true }, // e.g. LI-2026-0001

    customerName: { type: String, required: true, trim: true },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid mobile number"],
      index: true,
    },
    email: { type: String, trim: true, default: "" },

    siteName: { type: String, required: true, trim: true },
    street: { type: String, trim: true, default: "" },
    siteDistrict: { type: String, required: true, trim: true },

    approxPurchaseDate: { type: Date, default: null },
    productDescription: { type: String, required: true, trim: true },
    complaintText: { type: String, required: true, trim: true },

    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    // Filled in once the happiness manager finds and links the real registration.
    matchedWarrantyToken: { type: String, trim: true, default: "" },
    resultingClaimToken: { type: String, trim: true, default: "" },
    reviewNote: { type: String, trim: true, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lostInvoiceRequestSchema.pre("validate", async function assignToken(next) {
  if (this.token) return next();
  try {
    const year = new Date().getFullYear();
    const counter = await Counter.findByIdAndUpdate(
      `lost-invoice-${year}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.token = `LI-${year}-${String(counter.seq).padStart(4, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("LostInvoiceRequest", lostInvoiceRequestSchema);