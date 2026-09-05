const mongoose = require("mongoose");

// One document per email currently in the OTP flow. MongoDB automatically
// deletes the document once expiresAt passes — no cleanup job needed.
const otpVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  otp: { type: String, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  // TTL index: MongoDB deletes this document once the current time passes
  // expiresAt. Unverified codes expire in 10 minutes; once verified we push
  // this out to 2 hours so a long registration form doesn't time out.
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model("OtpVerification", otpVerificationSchema);