import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

function createTransporter() {
  if (!config.smtpHost) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: config.smtpFrom,
    to,
    subject: 'Verify your Tone Chat email',
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
  });

  if (!config.smtpHost) {
    console.log('[EMAIL DEV] code:', code, '| to:', to, '| raw:', JSON.stringify(info));
  }
}
