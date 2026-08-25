const mongoose = require("mongoose");

// One counter document per year, e.g. { _id: "complaint-2026", seq: 42 }
// Lets token numbers reset cleanly each year: KP-2026-0001, KP-2026-0002, ...
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
