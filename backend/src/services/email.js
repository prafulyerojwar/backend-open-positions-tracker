// src/services/email.js
import nodemailer from 'nodemailer';
import cfg from '../config.js';

let transporter;
export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.mail.host,
      port: cfg.mail.port,
      secure: cfg.mail.secure,
      auth: cfg.mail.auth.user ? cfg.mail.auth : undefined
    });
  }
  return transporter;
}

export async function sendWeekendSummary(html, to = cfg.mail.weekendTo, attachments = []) {
  if (!to) return { skipped: true, reason: 'No WEEKEND_SUMMARY_TO configured' };
  const info = await getTransporter().sendMail({
    from: cfg.mail.from,
    to,
    subject: 'Open Positions - Weekly Summary',
    html,
    attachments
  });
  return { messageId: info.messageId };
}