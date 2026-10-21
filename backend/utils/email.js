const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Until you verify your own domain in Resend, keep this as onboarding@resend.dev —
// it works immediately for testing. Once your domain is verified, change this
// to something like "Kerala Paints <warranty@yourdomain.com>".
const FROM_ADDRESS = process.env.RESEND_FROM || "Kerala Paints <onboarding@resend.dev>";

// Customer-supplied values (name, product text) end up inside HTML emails,
// so escape them rather than trusting them.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendOtpEmail(email, otp) {
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `${otp} is your Kerala Paints verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 14px; color: #56697a;">Kerala Paints · Warranty Registration</p>
        <h2 style="color: #1f2160;">Verify your email</h2>
        <p style="font-size: 14px; color: #0b1f2a;">Use this code to verify your email and continue your warranty registration:</p>
        <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0a78ab; margin: 20px 0;">
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

async function sendRegistrationApprovedEmail(registration) {
  const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const claimUrl = `${baseUrl}/claim`;

  const productList = (registration.items || [])
    .map(
      (it) =>
        `<li>${escapeHtml(it.product)} — ${escapeHtml(it.packSize)}${
          it.warrantyPeriod ? ` (${escapeHtml(it.warrantyPeriod)} warranty)` : ""
        }</li>`
    )
    .join("");

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: registration.email,
    subject: `Your Kerala Paints warranty registration ${registration.token} is approved`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 14px; color: #56697a;">Kerala Paints · Warranty</p>
        <h2 style="color: #1f2160;">Your warranty registration is approved</h2>
        <p style="font-size: 14px; color: #0b1f2a;">Hi ${escapeHtml(registration.customerName)},</p>
        <p style="font-size: 14px; color: #0b1f2a;">
          Good news — we've reviewed and approved your warranty registration.
        </p>
        <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: #0a78ab; margin: 16px 0;">
          ${escapeHtml(registration.token)}
        </div>
        <p style="font-size: 14px; color: #0b1f2a; margin-bottom: 6px;">Registered products:</p>
        <ul style="font-size: 14px; color: #0b1f2a; margin-top: 0;">${productList}</ul>
        <p style="font-size: 14px; color: #0b1f2a;">
          If you ever need to raise a claim, go to
          <a href="${escapeHtml(claimUrl)}">${escapeHtml(claimUrl)}</a>
          and enter your invoice number (${escapeHtml(registration.invoiceNumber)}) and the mobile number
          you registered with.
        </p>
        <p style="font-size: 13px; color: #56697a;">
          Please keep this email and your purchase invoice for the duration of the warranty period.
          Your warranty remains subject to the Kerala Paints Master Warranty Policy and the applicable
          product-specific terms.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }
}
async function sendClaimSolvedEmail({ email, customerName, token, items }) {
  const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const trackUrl = `${baseUrl}/track`;

  const productList = (items || [])
    .map((it) => `<li>${escapeHtml(it.product)}${it.packSize ? ` — ${escapeHtml(it.packSize)}` : ""}</li>`)
    .join("");

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `Your Kerala Paints warranty claim ${token} has been resolved`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 14px; color: #56697a;">Kerala Paints · Warranty</p>
        <h2 style="color: #1f2160;">Your warranty claim has been resolved</h2>
        <p style="font-size: 14px; color: #0b1f2a;">Hi ${escapeHtml(customerName)},</p>
        <p style="font-size: 14px; color: #0b1f2a;">
          Our team has reviewed your warranty claim and marked it as resolved.
        </p>
        <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: #0a78ab; margin: 16px 0;">
          ${escapeHtml(token)}
        </div>
        <p style="font-size: 14px; color: #0b1f2a; margin-bottom: 6px;">Claim covered:</p>
        <ul style="font-size: 14px; color: #0b1f2a; margin-top: 0;">${productList}</ul>
        <p style="font-size: 14px; color: #0b1f2a;">
          You can check the status of this claim any time at
          <a href="${escapeHtml(trackUrl)}">${escapeHtml(trackUrl)}</a> using the claim number above.
        </p>
        <p style="font-size: 13px; color: #56697a;">
          If you feel the issue has not been resolved, please contact us at
          warranty@keralapaints.com or +91 9539 320 999 and quote your claim number.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }
}
module.exports = { sendOtpEmail, sendRegistrationApprovedEmail, sendClaimSolvedEmail };