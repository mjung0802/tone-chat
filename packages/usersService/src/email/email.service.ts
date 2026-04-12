import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../shared/logger.js';

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
    // Dev mode: log OTP to console since no SMTP is configured
    logger.info({ to, code, messageId: info.messageId }, 'Verification email sent (dev mode — OTP logged)');
  } else {
    logger.info({ to, messageId: info.messageId }, 'Verification email sent');
  }
}

export async function sendTestEmail(): Promise<void> {
  if (!config.smtpHost) {
    logger.info('SMTP not configured — skipping startup test email (dev mode)');
    return;
  }

  logger.info({ host: config.smtpHost, port: config.smtpPort, from: config.smtpFrom }, 'Sending SMTP test email');

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: config.smtpFrom,
      to: config.smtpFrom, // Send test email to self
      subject: 'Tone Chat - SMTP Configuration Test',
      text: `This is a test email sent on startup to verify SMTP configuration.\n\nIf you received this, your email setup is working correctly!\n\nSent at: ${new Date().toISOString()}`,
      html: `<h2>✅ SMTP Configuration Test</h2><p>This is a test email sent on startup to verify SMTP configuration.</p><p>If you received this, your email setup is working correctly!</p><p><small>Sent at: ${new Date().toISOString()}</small></p>`,
    });

    logger.info({ messageId: info.messageId }, 'SMTP test email sent successfully');
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to send SMTP test email');
  }
}
