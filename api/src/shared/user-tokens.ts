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

export type UserTokenFailureReason =
  | 'TOKEN_NOT_FOUND'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_USED'
  | 'TOKEN_REVOKED'
  | 'TOKEN_RACE_LOST';

type DiagnosticConsumeResult =
  | {
      ok: true;
      userId: string;
      tokenHashPrefix: string;
    }
  | {
      ok: false;
      reason: UserTokenFailureReason;
      tokenHashPrefix: string;
    };

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getTokenHashPrefix(token: string) {
  return hashToken(token).slice(0, 8);
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

export async function consumeUserTokenWithDiagnostics(
  input: ConsumeUserTokenInput,
): Promise<DiagnosticConsumeResult> {
  const tokenHash = hashToken(input.token);
  const tokenHashPrefix = tokenHash.slice(0, 8);
  const now = new Date();

  const record = await input.prisma.userToken.findFirst({
    where: {
      tokenHash,
      type: input.type,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
    },
  });

  if (!record) {
    return { ok: false, reason: 'TOKEN_NOT_FOUND', tokenHashPrefix };
  }

  if (record.revokedAt) {
    return { ok: false, reason: 'TOKEN_REVOKED', tokenHashPrefix };
  }

  if (record.usedAt) {
    return { ok: false, reason: 'TOKEN_USED', tokenHashPrefix };
  }

  if (record.expiresAt <= now) {
    return { ok: false, reason: 'TOKEN_EXPIRED', tokenHashPrefix };
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
    return { ok: false, reason: 'TOKEN_RACE_LOST', tokenHashPrefix };
  }

  return {
    ok: true,
    userId: record.userId,
    tokenHashPrefix,
  };
}
