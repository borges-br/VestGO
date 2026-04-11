import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import dotenv from 'dotenv';

import { ensureBootstrapAdmin } from './bootstrap/bootstrap-admin';
import authRoutes from './modules/auth/auth';
import collectionPointRoutes from './modules/collection-points/collection-points';
import donationRoutes from './modules/donations/donations';
import healthRoutes from './modules/health';
import profileRoutes from './modules/profiles/profiles';
import adminProfileRoutes from './modules/admin/admin-profiles';
import partnershipRoutes from './modules/partnerships/partnerships';
import authPlugin from './plugins/auth';
import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';

dotenv.config();

function getAllowedOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production' && !configuredOrigins.includes('http://localhost:3000')) {
    configuredOrigins.push('http://localhost:3000');
  }

  return configuredOrigins;
}

const app = Fastify({
  trustProxy: process.env.TRUST_PROXY === 'true',
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
  },
});

const allowedOrigins = getAllowedOrigins();

app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin nao permitida: ${origin}`), false);
  },
  credentials: true,
});

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'change_me_in_production',
  sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
});

app.register(prismaPlugin);
app.register(redisPlugin);
app.register(authPlugin);

app.register(healthRoutes, { prefix: '/health' });
app.register(authRoutes, { prefix: '/auth' });
app.register(collectionPointRoutes, { prefix: '/collection-points' });
app.register(donationRoutes, { prefix: '/donations' });
app.register(profileRoutes, { prefix: '/profiles' });
app.register(adminProfileRoutes, { prefix: '/admin/profiles' });
app.register(partnershipRoutes, { prefix: '/partnerships' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await app.ready();
    await ensureBootstrapAdmin(app);
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Fastify rodando em http://localhost:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
