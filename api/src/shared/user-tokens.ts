import { createHash, randomBytes } from 'crypto';
import { PrismaClient, UserTokenType } from '@prisma/client';

const TOKEN_BYTES = 32;

type CreateUserTokenInput = {
  prisma: PrismaClient;
  userId: string;
  type: UserTokenType;
  expiresInMinutes: number;
};

type ConsumeUserTokenInput = {
  prisma: PrismaClient;
  type: UserTokenType;
  token: string;
};

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getTokenExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function createUserToken(input: CreateUserTokenInput) {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = getTokenExpiry(input.expiresInMinutes);

  await input.prisma.$transaction([
    input.prisma.userToken.updateMany({
      where: {
        userId: input.userId,
        type: input.type,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
    input.prisma.userToken.create({
      data: {
        userId: input.userId,
        type: input.type,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return { token, expiresAt };
}

export async function consumeUserToken(input: ConsumeUserTokenInput) {
  const tokenHash = hashToken(input.token);
  const now = new Date();

  const record = await input.prisma.userToken.findFirst({
    where: {
      tokenHash,
      type: input.type,
      usedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!record) {
    return null;
  }

  const updated = await input.prisma.userToken.updateMany({
    where: {
      id: record.id,
      usedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      usedAt: now,
    },
  });

  if (updated.count !== 1) {
    return null;
  }

  return {
    userId: record.userId,
  };
}
