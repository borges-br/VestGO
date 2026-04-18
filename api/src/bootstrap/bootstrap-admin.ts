import bcrypt from 'bcrypt';
import { PublicProfileState, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const SALT_ROUNDS = 12;

const bootstrapAdminEnvSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

function readBootstrapAdminEnv() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  const parsed = bootstrapAdminEnvSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      status: 'invalid' as const,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    status: 'configured' as const,
    email: parsed.data.email,
    password: parsed.data.password,
  };
}

export async function ensureBootstrapAdmin(fastify: FastifyInstance) {
  const bootstrapAdmin = readBootstrapAdminEnv();

  if (!bootstrapAdmin) {
    fastify.log.info(
      'Bootstrap admin temporario desativado: BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD ausentes.',
    );
    return;
  }

  if (bootstrapAdmin.status === 'invalid') {
    fastify.log.warn(
      {
        issues: bootstrapAdmin.issues,
      },
      'Bootstrap admin temporario ignorado por configuracao invalida.',
    );
    return;
  }

  const existingUser = await fastify.prisma.user.findUnique({
    where: { email: bootstrapAdmin.email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    if (existingUser.role === UserRole.ADMIN) {
      fastify.log.info(
        { email: bootstrapAdmin.email },
        'Bootstrap admin temporario ja existe. Nenhuma acao adicional foi necessaria.',
      );
      return;
    }

    fastify.log.warn(
      { email: bootstrapAdmin.email, role: existingUser.role },
      'Bootstrap admin temporario ignorado porque o e-mail ja pertence a um usuario nao administrador.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(bootstrapAdmin.password, SALT_ROUNDS);

  await fastify.prisma.user.create({
    data: {
      name: 'Admin Bootstrap Temporario',
      email: bootstrapAdmin.email,
      passwordHash,
      role: UserRole.ADMIN,
      publicProfileState: PublicProfileState.ACTIVE,
    },
  });

  fastify.log.warn(
    { email: bootstrapAdmin.email },
    'Bootstrap admin temporario criado via ambiente. Remova BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD apos o provisionamento inicial.',
  );
}
