import crypto from 'crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { hashRefreshToken } from './auth-crypto';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_ID_HEADER = 'x-session-id';

export type SessionTokenPayload = {
  id: string;
  email: string;
  role: string;
  sessionId: string;
};

function refreshTtlSeconds(): number {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN_SECONDS;
  if (!raw) return REFRESH_TOKEN_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : REFRESH_TOKEN_TTL_SECONDS;
}

function refreshExpiresInOption(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
}

function refreshSignKey() {
  return process.env.JWT_REFRESH_SECRET ? { key: process.env.JWT_REFRESH_SECRET } : {};
}

export function describeRequest(request: FastifyRequest): {
  userAgent: string | null;
  ipAddress: string | null;
  deviceLabel: string | null;
} {
  const userAgent = request.headers['user-agent'] ?? null;
  const ipAddress = request.ip ?? null;
  const deviceLabel = inferDeviceLabel(typeof userAgent === 'string' ? userAgent : null);

  return {
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 1024) : null,
    ipAddress: ipAddress ? ipAddress.slice(0, 64) : null,
    deviceLabel,
  };
}

function inferDeviceLabel(userAgent: string | null): string | null {
  if (!userAgent) return null;

  const ua = userAgent.toLowerCase();
  let device = 'Desconhecido';
  let browser = '';

  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android')) device = 'Android';
  else if (ua.includes('windows')) device = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macintosh')) device = 'macOS';
  else if (ua.includes('linux')) device = 'Linux';

  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome/') && !ua.includes('edg/')) browser = 'Chrome';
  else if (ua.includes('firefox/')) browser = 'Firefox';
  else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'Safari';

  return browser ? `${device} · ${browser}` : device;
}

export async function createSessionAndIssueTokens(
  fastify: FastifyInstance,
  user: { id: string; email: string; role: string },
  context: { userAgent: string | null; ipAddress: string | null; deviceLabel: string | null },
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const sessionId = crypto.randomUUID();
  const accessToken = fastify.jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });
  const refreshToken = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role, sessionId },
    {
      expiresIn: refreshExpiresInOption(),
      ...refreshSignKey(),
    },
  );

  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);

  await fastify.prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      deviceLabel: context.deviceLabel,
      expiresAt,
    },
  });

  return { accessToken, refreshToken, sessionId };
}

export async function rotateSessionTokens(
  fastify: FastifyInstance,
  user: { id: string; email: string; role: string },
  sessionId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = fastify.jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  });
  const refreshToken = fastify.jwt.sign(
    { id: user.id, email: user.email, role: user.role, sessionId },
    {
      expiresIn: refreshExpiresInOption(),
      ...refreshSignKey(),
    },
  );

  const expiresAt = new Date(Date.now() + refreshTtlSeconds() * 1000);

  await fastify.prisma.userSession.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: hashRefreshToken(refreshToken),
      lastUsedAt: new Date(),
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(
  fastify: FastifyInstance,
  refreshToken: string,
): SessionTokenPayload | null {
  try {
    return fastify.jwt.verify(refreshToken, {
      ...(process.env.JWT_REFRESH_SECRET ? { key: process.env.JWT_REFRESH_SECRET } : {}),
    }) as SessionTokenPayload;
  } catch {
    return null;
  }
}

export async function revokeAllUserSessions(
  fastify: FastifyInstance,
  userId: string,
): Promise<number> {
  const result = await fastify.prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}

export async function revokeOtherSessions(
  fastify: FastifyInstance,
  userId: string,
  currentSessionId: string,
): Promise<number> {
  const result = await fastify.prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      NOT: { id: currentSessionId },
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}

export { SESSION_ID_HEADER, REFRESH_TOKEN_TTL_SECONDS };
