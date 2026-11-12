// SCRUM-48 (Murat): sends emails with Nodemailer (handbook 8.3).
// With SMTP settings in .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM) it uses
// that server. Without them (development) it creates a free Ethereal test inbox: nothing is
// really delivered, and the console prints a link where the email can be opened.
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporterPromise = null;

async function createTransporter() {
  const { host, port, user, pass } = env.smtp;
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 uses TLS from the start; 587 upgrades with STARTTLS
      auth: user ? { user, pass } : undefined,
    });
  }
  const account = await nodemailer.createTestAccount();
  console.log(`Email: no SMTP settings, using the Ethereal test inbox ${account.user}`);
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

// One transporter for the whole app, made on the first email. If making it fails
// (for example no internet for Ethereal), the next email tries again.
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
}

// Sends one email. Resolves with { messageId, previewUrl }; previewUrl is the Ethereal
// link in development and null with a real SMTP server. Rejects if sending fails, so the
// caller decides what a failure means (checkout logs it and answers emailSent: false).
export async function sendMail({ to, subject, text, html, attachments }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: env.smtp.from, to, subject, text, html, attachments });
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  if (previewUrl) console.log(`Email preview: ${previewUrl}`);
  return { messageId: info.messageId, previewUrl };
}

// The invoice email: a short message with the invoice PDF attached (handbook 7.4 step 7).
export function sendInvoiceEmail({ to, name, invoiceNumber, pdf }) {
  return sendMail({
    to,
    subject: `Your Crema & Co. invoice ${invoiceNumber}`,
    text:
      `Hi ${name},\n\n` +
      `Thank you for your order. Your invoice ${invoiceNumber} is attached as a PDF.\n` +
      `You can follow your order under Orders on the site.\n\n` +
      `Crema & Co.`,
    attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}
