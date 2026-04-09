// api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';

import prismaPlugin from './plugins/prisma';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';

import healthRoutes from './modules/health';
import authRoutes from './modules/auth/auth';
import collectionPointRoutes from './modules/collection-points/collection-points';


dotenv.config();

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
  },
});

// ─── Plugins globais ──────────────────────────────────────────────────────────

const allowedOrigins = [
  process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  'http://localhost:3000',
];

app.register(cors, {
  origin: (origin, cb) => {
    // Permite requisições sem origin (ex: curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`Origin não permitida: ${origin}`), false);
    }
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

// ─── Rotas ───────────────────────────────────────────────────────────────────

app.register(healthRoutes,          { prefix: '/health' });
app.register(authRoutes,            { prefix: '/auth' });
app.register(collectionPointRoutes, { prefix: '/collection-points' });


// TODO: registrar módulos futuros aqui
// app.register(donationRoutes,        { prefix: '/donations' });
// app.register(collectionPointRoutes, { prefix: '/collection-points' });

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Fastify rodando em http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();