type SecurityTemplateInput = {
  name: string;
  actionUrl?: string;
};

type DonationEmailInput = {
  name: string;
  donationCode: string;
  actionUrl: string;
  collectionPointName?: string | null;
  ngoName?: string | null;
  pointsLabel?: string | null;
};

export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPublicBaseUrl() {
  return (
    process.env.WEB_PUBLIC_URL ??
    process.env.APP_PUBLIC_URL ??
    process.env.CORS_ORIGIN?.split(',')[0]?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function getEmailLogoUrl() {
  return `${getPublicBaseUrl()}/favicon/android-chrome-192x192.png`;
}

function buildTextEmail(lines: string[], actionUrl?: string) {
  return [
    ...lines,
    ...(actionUrl ? ['', `Link: ${actionUrl}`] : []),
    '',
    'Este é um e-mail automático do VestGO.',
    'Por favor, não responda esta mensagem.',
    'Se precisar de ajuda, entre em contato pelos canais oficiais de suporte.',
  ].filter(Boolean).join('\n');
}

function buildLayout(title: string, body: string, action?: { label: string; url: string }) {
  const safeTitle = escapeHtml(title);
  const logoUrl = getEmailLogoUrl();
  const actionHtml = action
    ? `<tr><td style="padding:28px 0 12px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background-color:#006a62;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700;line-height:1.2;border:1px solid #006a62;font-family:Arial,sans-serif">${escapeHtml(action.label)}</a></td></tr><tr><td style="padding:0;color:#6b7280;font-size:12px;line-height:1.6;font-family:Arial,sans-serif">Se o botão não abrir, copie e cole este link no navegador:<br><a href="${escapeHtml(action.url)}" style="color:#006a62;text-decoration:underline;word-break:break-all">${escapeHtml(action.url)}</a></td></tr>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background-color:#f2f4f5;font-family:Arial,sans-serif;color:#1a1a1a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f2f4f5;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:18px;border:1px solid #e5e7eb;overflow:hidden">
            <tr>
              <td style="background-color:#00333c;padding:24px 28px">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px">
                      <img src="${escapeHtml(logoUrl)}" width="42" height="42" alt="VestGO" style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px">
                    </td>
                    <td style="vertical-align:middle">
                      <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;line-height:1.2;font-family:Arial,sans-serif">VestGO</p>
                      <p style="margin:2px 0 0;color:#b8f2df;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:Arial,sans-serif">Rede solidária</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px">
                <h1 style="margin:0 0 16px;color:#00333c;font-size:24px;line-height:1.25;font-family:Arial,sans-serif">${safeTitle}</h1>
                ${body}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${actionHtml}
                </table>
                <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;font-family:Arial,sans-serif">Se você não solicitou esta ação, ignore este e-mail ou entre em contato com o suporte.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;background-color:#f8faf9;padding:20px 28px;color:#6b7280;font-size:12px;line-height:1.6;font-family:Arial,sans-serif">
                <p style="margin:0">Este é um e-mail automático do VestGO.</p>
                <p style="margin:4px 0 0">Por favor, não responda esta mensagem.</p>
                <p style="margin:4px 0 0">Se precisar de ajuda, entre em contato pelos canais oficiais de suporte.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function paragraph(value: string) {
  return `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;font-family:Arial,sans-serif">${escapeHtml(value)}</p>`;
}

export function emailVerificationTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Confirme seu e-mail no VestGO',
    text: buildTextEmail(
      [
        `Olá, ${name}.`,
        '',
        'Confirme seu e-mail para manter sua conta VestGO segura e receber comunicações importantes.',
      ],
      actionUrl,
    ),
    html: buildLayout(
      'Confirme seu e-mail',
      paragraph(`Olá, ${name}. Confirme seu e-mail para manter sua conta VestGO segura e receber comunicações importantes da sua conta.`),
      actionUrl ? { label: 'Confirmar e-mail', url: actionUrl } : undefined,
    ),
  };
}

export function passwordResetTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Redefina sua senha no VestGO',
    text: buildTextEmail(
      [
        `Olá, ${name}.`,
        '',
        'Use o link abaixo para redefinir sua senha. Ele expira em breve e só pode ser usado uma vez.',
      ],
      actionUrl,
    ),
    html: buildLayout(
      'Redefina sua senha',
      paragraph(`Olá, ${name}. Use este link para criar uma nova senha. Ele expira em breve e só pode ser usado uma vez.`),
      actionUrl ? { label: 'Redefinir senha', url: actionUrl } : undefined,
    ),
  };
}

export function passwordChangedTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';

  return {
    subject: 'Sua senha VestGO foi alterada',
    text: buildTextEmail([
      `Olá, ${name}.`,
      '',
      'Sua senha VestGO foi alterada com sucesso. Se você não fez essa alteração, entre em contato com o suporte imediatamente.',
    ]),
    html: buildLayout(
      'Senha alterada',
      paragraph(`Olá, ${name}. Sua senha VestGO foi alterada com sucesso. Se você não fez essa alteração, entre em contato com o suporte imediatamente.`),
    ),
  };
}

export function accountDeletionRequestTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Confirme o encerramento da sua conta VestGO',
    text: buildTextEmail(
      [
        `Olá, ${name}.`,
        '',
        'Recebemos uma solicitação para encerrar sua conta VestGO.',
        'Esta ação é permanente: seu acesso será encerrado e seus dados pessoais serão anonimizados.',
        'Históricos operacionais de doações e rastreios podem ser preservados de forma não pessoal para manter a consistência dos registros.',
        'Se você não solicitou esta ação, ignore este e-mail.',
      ],
      actionUrl,
    ),
    html: buildLayout(
      'Confirme o encerramento da conta',
      [
        paragraph(`Olá, ${name}. Recebemos uma solicitação para encerrar sua conta VestGO.`),
        paragraph('Esta ação é permanente: seu acesso será encerrado e seus dados pessoais serão anonimizados.'),
        paragraph('Históricos operacionais de doações e rastreios podem ser preservados de forma não pessoal para manter a consistência dos registros.'),
      ].join(''),
      actionUrl ? { label: 'Confirmar encerramento', url: actionUrl } : undefined,
    ),
  };
}

export function accountDeletedTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';

  return {
    subject: 'Sua conta VestGO foi encerrada',
    text: buildTextEmail([
      `Olá, ${name}.`,
      '',
      'Sua conta VestGO foi encerrada e seus dados pessoais foram anonimizados.',
      'Históricos operacionais de doações e rastreios podem ser preservados de forma não pessoal para manter a consistência dos registros.',
      'Se você não confirmou esta ação, entre em contato com o suporte.',
    ]),
    html: buildLayout(
      'Conta encerrada',
      [
        paragraph(`Olá, ${name}. Sua conta VestGO foi encerrada e seus dados pessoais foram anonimizados.`),
        paragraph('Históricos operacionais de doações e rastreios podem ser preservados de forma não pessoal para manter a consistência dos registros. Se você não confirmou esta ação, entre em contato com o suporte.'),
      ].join(''),
    ),
  };
}

export function donationRegisteredTemplate(input: DonationEmailInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const collectionPointName = input.collectionPointName ?? 'o ponto de coleta selecionado';

  return {
    subject: `Doação ${input.donationCode} registrada no VestGO`,
    text: buildTextEmail(
      [
        `Olá, ${name}.`,
        '',
        `Sua doação ${input.donationCode} foi registrada para ${collectionPointName}.`,
        'Você pode acompanhar a jornada pelo rastreio no VestGO.',
      ],
      input.actionUrl,
    ),
    html: buildLayout(
      'Doação registrada',
      [
        paragraph(`Olá, ${name}. Sua doação ${input.donationCode} foi registrada para ${collectionPointName}.`),
        paragraph('Você pode acompanhar a jornada pelo rastreio no VestGO.'),
      ].join(''),
      { label: 'Acompanhar rastreio', url: input.actionUrl },
    ),
  };
}

export function donationStatusTemplate(
  input: DonationEmailInput & { statusLabel: string; statusMessage: string },
): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const pointsText = input.pointsLabel ? ` ${input.pointsLabel}` : '';

  return {
    subject: `${input.statusLabel}: doação ${input.donationCode}`,
    text: buildTextEmail(
      [
        `Olá, ${name}.`,
        '',
        `${input.statusMessage}${pointsText}`,
        'Acompanhe os detalhes pelo rastreio no VestGO.',
      ],
      input.actionUrl,
    ),
    html: buildLayout(
      input.statusLabel,
      [
        paragraph(`Olá, ${name}.`),
        paragraph(`${input.statusMessage}${pointsText}`),
        paragraph('Acompanhe os detalhes pelo rastreio no VestGO.'),
      ].join(''),
      { label: 'Ver rastreio', url: input.actionUrl },
    ),
  };
}
