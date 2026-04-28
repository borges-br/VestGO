import { UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';
import {
  donationSelect,
  mapDonation,
  type Viewer,
} from '../donations/donations';

const donationCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^VGO-[A-Z0-9]{6,}$/.test(value), {
      message: 'Codigo de doacao invalido',
    }),
});

function ensureOperationalAccess(user: Viewer) {
  if (user.role === UserRole.DONOR) {
    throw new ForbiddenError('A area operacional nao esta disponivel para doadores');
  }
}

function buildOperationalDonationWhere(user: Viewer, code: string) {
  return {
    code,
    ...(user.role === UserRole.ADMIN
      ? {}
      : user.role === UserRole.COLLECTION_POINT
        ? { collectionPointId: user.id }
        : { ngoId: user.id }),
  };
}

export default async function operationalDonationRoutes(fastify: FastifyInstance) {
  fastify.get('/by-code/:code', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureOperationalAccess(request.user);
      const { code } = donationCodeParamSchema.parse(request.params);
      const donation = await fastify.prisma.donation.findFirst({
        where: buildOperationalDonationWhere(request.user, code),
        select: donationSelect,
      });

      if (!donation) {
        throw new NotFoundError('Doacao');
      }

      return reply.send(mapDonation(donation, request.user));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Codigo de doacao invalido',
          issues: err.errors,
        });
      }

      throw err;
    }
  });
}
