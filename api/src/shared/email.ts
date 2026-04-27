import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SendEmailResult = {
  sent: boolean;
  skipped: boolean;
};

let transporter: nodemailer.Transporter | null = null;

function isEmailEnabled() {
  return process.env.EMAIL_ENABLED !== 'false';
}

function getFromAddress() {
  const address = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER;
  const name = process.env.SMTP_FROM_NAME ?? 'VestGO';

  if (!address) {
    return null;
  }

  return `${name} <${address}>`;
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    requireTLS: !secure,
  });

  return transporter;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailEnabled()) {
    return { sent: false, skipped: true };
  }

  const from = getFromAddress();

  if (!from) {
    throw new Error('SMTP sender is not configured');
  }

  await getTransporter().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    encoding: 'utf-8',
  });

  return { sent: true, skipped: false };
}

export function getWebPublicUrl() {
  return (
    process.env.WEB_PUBLIC_URL ??
    process.env.APP_PUBLIC_URL ??
    process.env.CORS_ORIGIN?.split(',')[0]?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}
