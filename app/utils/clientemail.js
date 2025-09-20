// app/utils/clientemail.js
import nodemailer from "nodemailer";

function ensureEnv() {
  const miss = [];
  if (!process.env.SMTP_HOST) miss.push("SMTP_HOST");
  if (!process.env.SMTP_USER) miss.push("SMTP_USER");
  if (!process.env.SMTP_PASS) miss.push("SMTP_PASS");
  if (miss.length) throw new Error("Missing env: " + miss.join(", "));
}

function buildTransport() {
  ensureEnv();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = port === 465;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
// app/utils/clientemail.js
// ... your existing transporter + sendCredentialsEmail here

export async function sendRoleChangeEmail({ to, orgName, roleLabel }) {
  const subject = `Your role was updated in ${orgName}`;
  const text = `Hello,\n\nYour role in ${orgName} is now: ${roleLabel}.\n\nThanks.`;
  const html = `<p>Hello,</p><p>Your role in <b>${orgName}</b> is now: <b>${roleLabel}</b>.</p><p>Thanks.</p>`;

  // Use your existing transporter; adjust to your provider if needed
  return await transporter.sendMail({
    to,
    subject,
    text,
    html,
  });
}

export async function sendCredentialsEmail({ to, orgName, email, password, portalUrl }) {
  const transporter = buildTransport();
  await transporter.verify().catch((e) => {
    console.error("SMTP verify failed:", e);
    throw e;
  });

  const from = process.env.FROM_EMAIL || `"NeoTickets" <${process.env.SMTP_USER}>`;
  const url = portalUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Your NeoTickets login credentials",
    text: `Email: ${email}\nPassword: ${password}\nLogin: ${url}`,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI;background:#f6f8fa;padding:24px">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden">
          <div style="background:#111827;color:#fff;padding:14px 18px">
            <b>${orgName || "Your Organization"}</b> — Account Created
          </div>
          <div style="padding:18px">
            <p>Your account has been created.</p>
            <p><b>Login credentials</b></p>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
              <div><b>Email:</b> ${email}</div>
              <div><b>Password:</b> ${password}</div>
            </div>
            <p style="margin-top:12px">Sign in: <a href="${url}" target="_blank">${url}</a></p>
            <p style="font-size:12px;color:#6b7280">Change your password after first login.</p>
          </div>
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Credentials email sent (messageId):", info.messageId);
  }
  return info;
}
