const express = require("express");
const WarrantyRegistration = require("../models/WarrantyRegistration");
const Complaint = require("../models/Complaint");
const LostInvoiceRequest = require("../models/LostInvoiceRequest");
const { requireAdmin } = require("../middleware/auth");
const { asText } = require("../utils/regex");
const { decodePublicCode, ALPHABET } = require("../utils/publicCode");

const router = express.Router();

const KINDS = {
  WR: { Model: WarrantyRegistration, label: "Warranty registration" },
  KP: { Model: Complaint, label: "Claim" },
  LI: { Model: LostInvoiceRequest, label: "Lost-invoice request" },
};

const CODE_FORMAT = new RegExp(`^(WR|KP|LI)-[${ALPHABET}]{4}-[${ALPHABET}]{4}$`);

// GET /api/codes/decode?code=KP-73AR-4ZSC — staff only.
// Turns the code a customer reads out into the original staff running number
// (and says what it belongs to and where it stands).
router.get("/decode", requireAdmin, async (req, res) => {
  try {
    const code = asText(req.query.code).toUpperCase();
    const match = CODE_FORMAT.exec(code);
    if (!match) {
      return res.status(400).json({
        message: "That doesn't look like a customer code. A customer code looks like KP-73AR-4ZSC.",
      });
    }
    const kind = KINDS[match[1]];
    const decoded = decodePublicCode(code);

    // The record that was given this code.
    const record = await kind.Model.findOne({ publicCode: code }).select("token status publicCode");
    if (record) {
      return res.json({
        code,
        kind: match[1],
        kindLabel: kind.label,
        number: record.token,
        status: record.status,
        // true when the code really is the scrambled form of the staff number (always, for new records)
        consistent: !!decoded && decoded.staffNumber === record.token,
      });
    }

    if (decoded) {
      return res.status(404).json({
        message: `That code unscrambles to ${decoded.staffNumber}, but no ${kind.label.toLowerCase()} was given this code.`,
      });
    }
    return res.status(404).json({ message: `No ${kind.label.toLowerCase()} has that code.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;