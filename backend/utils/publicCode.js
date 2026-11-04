// Customer-facing codes.
//
// Staff keep the running numbers (WR-2026-0020, KP-2026-0005, LI-2026-0003) so they can
// see how many registrations / claims exist. Customers get a RANDOM code instead
// (for example WR-K7M4-9QXD), so nobody outside the company can work out how many
// registrations or complaints there are, or guess somebody else's number.

const crypto = require("crypto");

// Letters and digits that are hard to mix up when read out over the phone:
// no 0/O, no 1/I/L. 31 characters, 8 of them = about 850 billion possible codes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomPart(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

// prefix: "WR" (registration), "KP" (claim) or "LI" (lost-invoice request)
async function generatePublicCode(Model, prefix) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `${prefix}-${randomPart(4)}-${randomPart(4)}`;
    if (!(await Model.exists({ publicCode: code }))) return code;
  }
  throw new Error("Could not generate a unique public code");
}

module.exports = { generatePublicCode, ALPHABET };