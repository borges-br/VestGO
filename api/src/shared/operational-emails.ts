import { DonationStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { getWebPublicUrl, sendEmail } from './email';
import {
  donationRegisteredTemplate,
  donationStatusTemplate,
  type EmailTemplate,
} from './email-templates';

type OperationalEmailInput = {
  userId: string;
  templateType: string;
  template: EmailTemplate;
};

type DonationEmailInput = {
  userId: string;
  donationId: string;
  donationCode: string;
  collectionPointName?: string | null;
  ngoName?: string | null;
  pointsDelta?: number;
};

function isDeliverableEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith('@vestgo.invalid');
}

function buildTrackingUrl(donationId: string) {
  const url = new URL(`/rastreio/${donationId}`, getWebPublicUrl());
  return url.toString();
}

async function sendOperationalEmail(
  fastify: FastifyInstance,
  input: OperationalEmailInput,
) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      emailNotificationsEnabled: true,
      anonymizedAt: true,
    },
  });

  if (
    !user ||
    user.anonymizedAt ||
    !user.emailNotificationsEnabled ||
    !isDeliverableEmail(user.email)
  ) {
    return;
  }

  try {
    const result = await sendEmail({
      to: user.email,
      ...input.template,
    });

    if (result.skipped) {
      fastify.log.info(
        { userId: user.id, templateType: input.templateType },
        'Operational email skipped',
      );
      return;
    }

    fastify.log.info(
      { userId: user.id, templateType: input.templateType },
      'Operational email sent',
    );
  } catch (err) {
    fastify.log.warn(
      { err, userId: user.id, templateType: input.templateType },
      'Operational email delivery failed',
    );
  }
}

export async function sendDonationRegisteredOperationalEmail(
  fastify: FastifyInstance,
  input: DonationEmailInput,
) {
  const user = await fastify.prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });

  if (!user) {
    return;
  }

  await sendOperationalEmail(fastify, {
    userId: input.userId,
    templateType: 'donation_registered',
    template: donationRegisteredTemplate({
      name: user.name,
      donationCode: input.donationCode,
      collectionPointName: input.collectionPointName,
      actionUrl: buildTrackingUrl(input.donationId),
    }),
  });
}

function getDonationStatusEmailContent(status: DonationStatus, input: DonationEmailInput) {
  const collectionPointName = input.collectionPointName ?? 'o ponto parceiro';
  const ngoName = input.ngoName ?? 'a ONG parceira';

  switch (status) {
    case DonationStatus.AT_POINT:
      return {
        statusLabel: 'Doação recebida no ponto',
        statusMessage: `Sua doação ${input.donationCode} foi recebida em ${collectionPointName}.`,
      };
    case DonationStatus.IN_TRANSIT:
      return {
        statusLabel: 'Doação a caminho da ONG',
        statusMessage: `Sua doação ${input.donationCode} saiu de ${collectionPointName} e está a caminho de ${ngoName}.`,
      };
    case DonationStatus.DELIVERED:
      return {
        statusLabel: 'Doação entregue à ONG',
        statusMessage: `Sua doação ${input.donationCode} foi entregue para triagem em ${ngoName}.`,
      };
    case DonationStatus.DISTRIBUTED:
      return {
        statusLabel: 'Doação distribuída',
        statusMessage: `Sua doação ${input.donationCode} concluiu a jornada e foi distribuída para atendimento social.`,
      };
    default:
      return null;
  }
}

export async function sendDonationStatusOperationalEmail(
  fastify: FastifyInstance,
  input: DonationEmailInput & { status: DonationStatus },
) {
  const content = getDonationStatusEmailContent(input.status, input);

  if (!content) {
    return;
  }

  const user = await fastify.prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });

  if (!user) {
    return;
  }

  const pointsLabel =
    typeof input.pointsDelta === 'number' && input.pointsDelta > 0
      ? `Essa etapa acrescentou +${input.pointsDelta} pontos ao seu impacto.`
      : null;

  await sendOperationalEmail(fastify, {
    userId: input.userId,
    templateType: `donation_status_${input.status.toLowerCase()}`,
    template: donationStatusTemplate({
      name: user.name,
      donationCode: input.donationCode,
      collectionPointName: input.collectionPointName,
      ngoName: input.ngoName,
      actionUrl: buildTrackingUrl(input.donationId),
      pointsLabel,
      ...content,
    }),
  });
}
