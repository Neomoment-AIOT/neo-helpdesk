// app/utils/clientemail.js
// Server-only email helpers. Uses Nodemailer if SMTP is configured,
// otherwise falls back to console logs (so your app never crashes).

import nodemailer from "nodemailer";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  const port = Number(SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

async function safeSendMail(opts) {
  const tx = getTransport();
  const from = process.env.SMTP_FROM || "no-reply@example.com";
  const mail = { from, ...opts };
  if (!tx) {
    console.log("[EMAIL FAKE SEND]", mail);
    return;
  }
  await tx.sendMail(mail);
}

export async function sendCredentialsEmail({ to, orgName, email, password, portalUrl }) {
  const subject = `Welcome to ${orgName}`;
  const html = `
    <p>Hello,</p>
    <p>Your account for <strong>${orgName}</strong> is ready.</p>
    <p><strong>Portal:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
    <p><strong>Email:</strong> ${email}<br/>
       <strong>Password:</strong> ${password}</p>
    <p>You can change your password after logging in.</p>
  `;
  await safeSendMail({ to, subject, html });
}

export async function sendRoleChangeEmail({ to, orgName, roleLabel }) {
  const subject = `Your role has changed in ${orgName}`;
  const html = `
    <p>Hello,</p>
    <p>Your role in <strong>${orgName}</strong> is now: <strong>${roleLabel}</strong>.</p>
  `;
  await safeSendMail({ to, subject, html });
}
