const mongoose = require("mongoose");
const Counter = require("./Counter");

// One product line within a warranty registration — a single registration
// can cover several products bought on the same invoice.
const warrantyItemSchema = new mongoose.Schema(
  {
    product: { type: String, required: true, trim: true },
    batchNo: { type: Number, required: true },
    quantity: { type: String, required: true, trim: true },
    code: { type: Number, required: true },
  },
  { _id: false }
);

const warrantyRegistrationSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true },

    purchaseDate: { type: Date, required: true },

    district: { type: String, required: true, trim: true },
    outlet: { type: String, required: true, trim: true },

    customerName: { type: String, required: true, trim: true },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid contact number"],
      index: true,
    },
    email: { type: String, trim: true, default: "" },
    address: { type: String, required: true, trim: true },

    invoiceNumber: { type: String, required: true, trim: true, index: true },

    // Name of the painter/contractor who applied the product, if any —
    // common for extended-warranty terms tied to professional application.
    applicatorName: { type: String, trim: true, default: "" },

    items: {
      type: [warrantyItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Add at least one product.",
      },
    },
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