import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = config.smtpHost
      ? nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass,
          },
        })
      : nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const transporter = getTransporter();
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
