const mongoose = require("mongoose");
const Counter = require("./Counter");

const STATUS_VALUES = ["new", "assigned", "review", "pending", "solved"];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUS_VALUES, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    note: { type: String, trim: true },
  },
  { _id: false }
);

// Mirrors the warranty registration's item shape — claims are filed
// against specific registered product lines, copied over as-is.
const complaintItemSchema = new mongoose.Schema(
  {
    product: { type: String, required: true, trim: true },
    packSize: { type: String, required: true, trim: true },
    containers: { type: Number, required: true },
    totalQuantity: { type: String, trim: true, default: "" },
    batchNumbers: { type: [String], default: [] },
    shadeType: { type: String, default: "" },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true },
    warrantyToken: { type: String, required: true, trim: true, uppercase: true, index: true },

    date: { type: Date, required: true, default: Date.now },
    district: { type: String, required: true, trim: true },
    outlet: { type: String, required: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s]{7,15}$/, "Enter a valid contact number"],
    },
    address: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, required: true, trim: true },
    complaintText: { type: String, required: true, trim: true },

    items: {
      type: [complaintItemSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Select at least one product.",
      },
    },

    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "new",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
    assignedAt: { type: Date, default: null },

    managerSubmission: {
      description: { type: String, trim: true, default: "" },
      imageUrl: { type: String, default: "" },
      submittedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

complaintSchema.pre("validate", async function assignToken(next) {
  if (this.token) return next();

  try {
    const year = new Date().getFullYear();
    const counterId = `complaint-${year}`;

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.token = `KP-${year}-${String(counter.seq).padStart(4, "0")}`;
    this.statusHistory.push({ status: this.status || "new" });
    next();
  } catch (err) {
    next(err);
  }
});

complaintSchema.statics.STATUS_VALUES = STATUS_VALUES;

module.exports = mongoose.model("Complaint", complaintSchema);