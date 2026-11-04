// Gives a customer-facing code to every record created before codes existed.
// Safe to run on every start-up: it only touches records that don't have one yet.

const WarrantyRegistration = require("../models/WarrantyRegistration");
const Complaint = require("../models/Complaint");
const LostInvoiceRequest = require("../models/LostInvoiceRequest");
const { generatePublicCode } = require("./publicCode");

async function backfillPublicCodes() {
  const jobs = [
    [WarrantyRegistration, "WR"],
    [Complaint, "KP"],
    [LostInvoiceRequest, "LI"],
  ];
  for (const [Model, prefix] of jobs) {
    const missing = await Model.find({ publicCode: { $exists: false } }).select("_id");
    for (const doc of missing) {
      const code = await generatePublicCode(Model, prefix);
      // updateOne skips the model hooks, so the existing running number is left alone
      await Model.updateOne({ _id: doc._id, publicCode: { $exists: false } }, { $set: { publicCode: code } });
    }
    if (missing.length) console.log(`Customer codes added to ${missing.length} existing ${Model.modelName} record(s)`);
  }
}

module.exports = backfillPublicCodes;