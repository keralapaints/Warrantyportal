// Keeps every record's customer code in step with its staff number.
// Runs on every start-up (it only touches what needs fixing).
//
//  1. Records with no customer code yet get one (the scrambled form of their staff number).
//  2. Records whose customer code does NOT match their staff number (for example codes
//     made by an earlier random version, or a changed PUBLIC_CODE_SECRET) are reported.
//     They are only corrected when REALIGN_PUBLIC_CODES=true is set, so codes already
//     given to customers never change by surprise.

const WarrantyRegistration = require("../models/WarrantyRegistration");
const Complaint = require("../models/Complaint");
const LostInvoiceRequest = require("../models/LostInvoiceRequest");
const { encodePublicCode } = require("./publicCode");

async function backfillPublicCodes() {
  const realign = process.env.REALIGN_PUBLIC_CODES === "true";

  for (const Model of [WarrantyRegistration, Complaint, LostInvoiceRequest]) {
    // 1) no code yet
    const missing = await Model.find({ publicCode: { $exists: false } }).select("_id token");
    for (const doc of missing) {
      // updateOne skips the model hooks, so the staff number is left alone
      await Model.updateOne({ _id: doc._id, publicCode: { $exists: false } }, { $set: { publicCode: encodePublicCode(doc.token) } });
    }
    if (missing.length) console.log(`Customer codes added to ${missing.length} existing ${Model.modelName} record(s)`);

    // 2) code does not match the staff number
    const coded = await Model.find({ publicCode: { $exists: true } }).select("_id token publicCode");
    const mismatched = coded.filter((doc) => doc.publicCode !== encodePublicCode(doc.token));
    if (mismatched.length === 0) continue;

    if (!realign) {
      console.warn(
        `WARNING: ${mismatched.length} ${Model.modelName} record(s) have a customer code that does not match their staff number ` +
          `(older random codes, or PUBLIC_CODE_SECRET was changed). Nothing was changed. ` +
          `To make them match, set REALIGN_PUBLIC_CODES=true once and restart. Customers holding the old codes would need the new ones.`
      );
      continue;
    }
    let fixed = 0;
    for (const doc of mismatched) {
      try {
        await Model.updateOne({ _id: doc._id }, { $set: { publicCode: encodePublicCode(doc.token) } });
        fixed += 1;
      } catch (err) {
        console.error(`Could not realign ${doc.token}: ${err.message}`);
      }
    }
    console.log(`Customer codes realigned to staff numbers on ${fixed} ${Model.modelName} record(s)`);
  }
}

module.exports = backfillPublicCodes;