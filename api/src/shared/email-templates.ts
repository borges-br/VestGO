type SecurityTemplateInput = {
  name: string;
  actionUrl?: string;
};

type EmailTemplate = {
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

function buildLayout(title: string, body: string, action?: { label: string; url: string }) {
  const safeTitle = escapeHtml(title);
  const actionHtml = action
    ? `<p style="margin:28px 0 12px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background-color:#006a62;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:700;line-height:1.2;border:1px solid #006a62">${escapeHtml(action.label)}</a></p><p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6">Se o botao nao abrir, copie e cole este link no navegador:<br><a href="${escapeHtml(action.url)}" style="color:#006a62;text-decoration:underline;word-break:break-all">${escapeHtml(action.url)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f2f4f5;font-family:Inter,Arial,sans-serif;color:#1a1a1a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f5;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;padding:32px;border:1px solid #e5e7eb">
            <tr>
              <td>
                <p style="margin:0 0 16px;color:#006a62;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">VestGO</p>
                <h1 style="margin:0 0 16px;color:#00333c;font-size:24px;line-height:1.2">${safeTitle}</h1>
                ${body}
                ${actionHtml}
                <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6">Se voce nao solicitou esta acao, ignore este e-mail ou entre em contato com o suporte.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailVerificationTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Confirme seu e-mail no VestGO',
    text: [
      `Ola, ${name}.`,
      '',
      'Confirme seu e-mail para manter sua conta VestGO segura.',
      actionUrl ? `Link de confirmacao: ${actionUrl}` : '',
    ].filter(Boolean).join('\n'),
    html: buildLayout(
      'Confirme seu e-mail',
      `<p style="margin:0;color:#374151;font-size:15px;line-height:1.7">Ola, ${escapeHtml(name)}. Confirme seu e-mail para manter sua conta VestGO segura e receber comunicacoes importantes da sua conta.</p>`,
      actionUrl ? { label: 'Confirmar e-mail', url: actionUrl } : undefined,
    ),
  };
}

export function passwordResetTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Redefina sua senha no VestGO',
    text: [
      `Ola, ${name}.`,
      '',
      'Use o link abaixo para redefinir sua senha. Ele expira em breve e so pode ser usado uma vez.',
      actionUrl ? `Link de redefinicao: ${actionUrl}` : '',
    ].filter(Boolean).join('\n'),
    html: buildLayout(
      'Redefina sua senha',
      `<p style="margin:0;color:#374151;font-size:15px;line-height:1.7">Ola, ${escapeHtml(name)}. Use este link para criar uma nova senha. Ele expira em breve e so pode ser usado uma vez.</p>`,
      actionUrl ? { label: 'Redefinir senha', url: actionUrl } : undefined,
    ),
  };
}

export function passwordChangedTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';

  return {
    subject: 'Sua senha VestGO foi alterada',
    text: `Ola, ${name}.\n\nSua senha VestGO foi alterada com sucesso. Se voce nao fez essa alteracao, entre em contato com o suporte imediatamente.`,
    html: buildLayout(
      'Senha alterada',
      `<p style="margin:0;color:#374151;font-size:15px;line-height:1.7">Ola, ${escapeHtml(name)}. Sua senha VestGO foi alterada com sucesso. Se voce nao fez essa alteracao, entre em contato com o suporte imediatamente.</p>`,
    ),
  };
}

export function accountDeletionRequestTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';
  const actionUrl = input.actionUrl ?? '';

  return {
    subject: 'Confirme o encerramento da sua conta VestGO',
    text: [
      `Ola, ${name}.`,
      '',
      'Recebemos uma solicitacao para encerrar sua conta VestGO.',
      'Esta acao e permanente: seu acesso sera encerrado e seus dados pessoais serao anonimizados.',
      'Historicos operacionais de doacoes e rastreios podem ser preservados de forma nao pessoal para manter a consistencia dos registros.',
      actionUrl ? `Link de confirmacao: ${actionUrl}` : '',
      '',
      'Se voce nao solicitou esta acao, ignore este e-mail.',
    ].filter(Boolean).join('\n'),
    html: buildLayout(
      'Confirme o encerramento da conta',
      `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7">Ola, ${escapeHtml(name)}. Recebemos uma solicitacao para encerrar sua conta VestGO.</p><p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7">Esta acao e permanente: seu acesso sera encerrado e seus dados pessoais serao anonimizados.</p><p style="margin:0;color:#374151;font-size:15px;line-height:1.7">Historicos operacionais de doacoes e rastreios podem ser preservados de forma nao pessoal para manter a consistencia dos registros.</p>`,
      actionUrl ? { label: 'Confirmar encerramento', url: actionUrl } : undefined,
    ),
  };
}

export function accountDeletedTemplate(input: SecurityTemplateInput): EmailTemplate {
  const name = input.name.trim() || 'tudo bem';

  return {
    subject: 'Sua conta VestGO foi encerrada',
    text: [
      `Ola, ${name}.`,
      '',
      'Sua conta VestGO foi encerrada e seus dados pessoais foram anonimizados.',
      'Historicos operacionais de doacoes e rastreios podem ser preservados de forma nao pessoal para manter a consistencia dos registros.',
      'Se voce nao confirmou esta acao, entre em contato com o suporte.',
    ].join('\n'),
    html: buildLayout(
      'Conta encerrada',
      `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7">Ola, ${escapeHtml(name)}. Sua conta VestGO foi encerrada e seus dados pessoais foram anonimizados.</p><p style="margin:0;color:#374151;font-size:15px;line-height:1.7">Historicos operacionais de doacoes e rastreios podem ser preservados de forma nao pessoal para manter a consistencia dos registros. Se voce nao confirmou esta acao, entre em contato com o suporte.</p>`,
    ),
  };
}
