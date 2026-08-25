const mongoose = require("mongoose");
const Counter = require("./Counter");

// Workflow: new -> assigned (admin assigns a manager) -> review (manager
// submitted their description/photo) -> pending / solved (happiness manager decides)
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

const complaintSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, index: true },

    // --- Complaint form fields ---
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
    product: { type: String, required: true, trim: true },
    batchNo: { type: Number, required: true },
    quantity: { type: String, required: true, trim: true },
    code: { type: Number, required: true },
    complaintText: { type: String, required: true, trim: true },

    // --- Workflow fields ---
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "new",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // Manager the admin assigned this complaint to
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null, index: true },
    assignedAt: { type: Date, default: null },

    // What the manager submits after checking the complaint
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