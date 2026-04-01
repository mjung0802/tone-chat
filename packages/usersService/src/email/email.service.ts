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

  // Always log verification code for debugging (especially useful during dev/testing)
  console.log(`[VERIFICATION] Code: ${code} | To: ${to} | Message ID: ${info.messageId || 'N/A'}`);
  
  if (!config.smtpHost) {
    console.log('[EMAIL DEV] Raw info:', JSON.stringify(info));
  }
}

export async function sendTestEmail(): Promise<void> {
  if (!config.smtpHost) {
    console.log('[SMTP TEST] Skipped - SMTP not configured (dev mode)');
    return;
  }

  console.log('[SMTP TEST] Sending test email...');
  console.log(`[SMTP TEST] Host: ${config.smtpHost}:${config.smtpPort}`);
  console.log(`[SMTP TEST] From: ${config.smtpFrom}`);
  console.log(`[SMTP TEST] User: ${config.smtpUser}`);

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: config.smtpFrom,
      to: config.smtpFrom, // Send test email to self
      subject: 'Tone Chat - SMTP Configuration Test',
      text: `This is a test email sent on startup to verify SMTP configuration.\n\nIf you received this, your email setup is working correctly!\n\nSent at: ${new Date().toISOString()}`,
      html: `<h2>✅ SMTP Configuration Test</h2><p>This is a test email sent on startup to verify SMTP configuration.</p><p>If you received this, your email setup is working correctly!</p><p><small>Sent at: ${new Date().toISOString()}</small></p>`,
    });

    console.log('[SMTP TEST] ✅ Test email sent successfully');
    console.log(`[SMTP TEST] Message ID: ${info.messageId}`);
  } catch (error: unknown) {
    console.error('[SMTP TEST] ❌ Failed to send test email:', error);
    if (error instanceof Error) {
      console.error(`[SMTP TEST] Error details: ${error.message}`);
    }
  }
}
