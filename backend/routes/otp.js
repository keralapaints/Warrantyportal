const express = require("express");
const OtpVerification = require("../models/OtpVerification");
const { sendOtpEmail } = require("../utils/email");

const router = express.Router();

const OTP_TTL_MINUTES = 10;
const VERIFIED_TTL_HOURS = 2;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// POST /api/warranty/send-otp — { email }
router.post("/send-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existing = await OtpVerification.findOne({ email });
    if (existing && !existing.verified) {
      const secondsSinceLastSend = (Date.now() - existing.lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)}s before requesting another code.`,
        });
      }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await OtpVerification.findOneAndUpdate(
      { email },
      { email, otp, verified: false, attempts: 0, lastSentAt: new Date(), expiresAt },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otp);

    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not send the verification code. Please try again." });
  }
});

// POST /api/warranty/verify-otp — { email, otp }
router.post("/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Enter the code sent to your email." });
    }

    const record = await OtpVerification.findOne({ email });
    if (!record) {
      return res.status(400).json({ message: "Code expired or not requested. Please request a new one." });
    }

    if (record.verified) {
      return res.json({ verified: true, message: "Email already verified." });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ message: "Too many incorrect attempts. Please request a new code." });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    record.verified = true;
    record.expiresAt = new Date(Date.now() + VERIFIED_TTL_HOURS * 60 * 60 * 1000);
    await record.save();

    res.json({ verified: true, message: "Email verified." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not verify the code. Please try again." });
  }
});

module.exports = router;