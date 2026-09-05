const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Until you verify your own domain in Resend, keep this as onboarding@resend.dev —
// it works immediately for testing. Once your domain is verified, change this
// to something like "Kerala Paints <warranty@yourdomain.com>".
const FROM_ADDRESS = process.env.RESEND_FROM || "Kerala Paints <onboarding@resend.dev>";

async function sendOtpEmail(email, otp) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `${otp} is your Kerala Paints verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 14px; color: #56697a;">Kerala Paints · Warranty Registration</p>
        <h2 style="color: #0b1f3a;">Verify your email</h2>
        <p style="font-size: 14px; color: #0b1f2a;">Use this code to verify your email and continue your warranty registration:</p>
        <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f8a80; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #56697a;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  // The Resend SDK never throws on API errors — it always resolves with
  // { data, error }. Without this check, a bad API key or unverified sender
  // would silently "succeed" while no email was ever actually sent.
  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }

  return data;
}

module.exports = { sendOtpEmail };