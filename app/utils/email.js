// app/utils/email.js
import nodemailer from "nodemailer";

export async function sendAssignmentEmail({ to, memberName, ticketId, ticketDescription }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("Missing SMTP env vars");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
  from: `"Task Manager" <${process.env.SMTP_USER}>`,
  to,
  subject: `🎫 New Ticket Assigned: ${ticketId}`,
  text: `Hi ${memberName},\n\nYou have been assigned a new ticket.\n\nTicket: ${ticketId}\nDescription: ${ticketDescription}\n\nPlease log in to the system to view details.`,
  html: `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px; color:#333;">
    <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background:#1a73e8; color:#fff; padding:16px 24px;">
        <h1 style="margin:0; font-size:20px;">NEOMOMENT</h1>
      </div>
      
      <!-- Body -->
      <div style="padding:24px;">
        <h2 style="margin-top:0; color:#1a73e8;">Hi ${memberName},</h2>
        <p style="font-size:15px;">You have been <strong style="color:#34a853;">assigned a new ticket</strong>. Here are the details:</p>
        
        <div style="border:1px solid #eee; border-radius:6px; background:#fafafa; padding:16px; margin:20px 0;">
          <p style="margin:8px 0;"><strong>🎫 Ticket ID:</strong> ${ticketId}</p>
          <p style="margin:8px 0;"><strong>📝 Description:</strong> ${ticketDescription}</p>
        </div>
        
        <p style="font-size:15px;">Please click the button below to log in and view more details:</p>
        
        <div style="text-align:center; margin:24px 0;">
          <a href="http://localhost:3000"
             style="background:#1a73e8; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-size:16px; font-weight:bold; display:inline-block;">
            View Ticket
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background:#f9f9f9; padding:12px 24px; font-size:12px; color:#888; text-align:center;">
        <p style="margin:0;">This is an automated message from Task Manager.</p>
      </div>
    </div>
  </div>
  `,
};



  await transporter.sendMail(mailOptions);
}
