import { ItemCategory, Prisma, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  toErrorResponse,
} from '../../shared/errors';

const seasonalCampaignSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  categories: true,
  multiplier: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      donations: true,
    },
  },
} satisfies Prisma.SeasonalCampaignSelect;

const campaignBaseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug deve usar letras minusculas, numeros e hifens.'),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(600).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  categories: z.array(z.nativeEnum(ItemCategory)).default([]),
  multiplier: z.coerce.number().positive().max(10).default(2),
  active: z.boolean().default(true),
});

const campaignWriteSchema = campaignBaseSchema
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: 'A data final deve ser maior que a data inicial.',
    path: ['endsAt'],
  });

const campaignPatchSchema = campaignBaseSchema.partial();

function ensureAdmin(user: { role: string }) {
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenError('Apenas administradores podem gerenciar campanhas sazonais');
  }
}

function mapCampaign(campaign: Prisma.SeasonalCampaignGetPayload<{ select: typeof seasonalCampaignSelect }>) {
  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    startsAt: campaign.startsAt.toISOString(),
    endsAt: campaign.endsAt.toISOString(),
    categories: campaign.categories,
    multiplier: campaign.multiplier,
    active: campaign.active,
    donationsCount: campaign._count.donations,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

function assertValidPeriod(startsAt: Date, endsAt: Date) {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new AppError('A data final deve ser maior que a data inicial.', 422, 'VALIDATION_ERROR');
  }
}

async function ensureUniqueSlug(
  fastify: FastifyInstance,
  slug: string,
  currentId?: string,
) {
  const existing = await fastify.prisma.seasonalCampaign.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && existing.id !== currentId) {
    throw new ConflictError('Ja existe uma campanha sazonal com este slug');
  }
}

export default async function seasonalCampaignRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureAdmin(request.user);

      const campaigns = await fastify.prisma.seasonalCampaign.findMany({
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        select: seasonalCampaignSelect,
      });

      return reply.send({
        data: campaigns.map(mapCampaign),
        meta: {
          count: campaigns.length,
        },
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureAdmin(request.user);
      const body = campaignWriteSchema.parse(request.body);

      await ensureUniqueSlug(fastify, body.slug);

      const campaign = await fastify.prisma.seasonalCampaign.create({
        data: {
          slug: body.slug,
          title: body.title,
          description: body.description ?? null,
          startsAt: new Date(body.startsAt),
          endsAt: new Date(body.endsAt),
          categories: body.categories,
          multiplier: body.multiplier,
          active: body.active,
        },
        select: seasonalCampaignSelect,
      });

      return reply.code(201).send(mapCampaign(campaign));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para campanha sazonal',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureAdmin(request.user);
      const { id } = request.params as { id: string };
      const body = campaignPatchSchema.parse(request.body);
      const existing = await fastify.prisma.seasonalCampaign.findUnique({
        where: { id },
        select: seasonalCampaignSelect,
      });

      if (!existing) {
        throw new NotFoundError('Campanha sazonal');
      }

      const startsAt = body.startsAt ? new Date(body.startsAt) : existing.startsAt;
      const endsAt = body.endsAt ? new Date(body.endsAt) : existing.endsAt;

      assertValidPeriod(startsAt, endsAt);

      if (body.slug) {
        await ensureUniqueSlug(fastify, body.slug, id);
      }

      const campaign = await fastify.prisma.seasonalCampaign.update({
        where: { id },
        data: {
          ...(body.slug ? { slug: body.slug } : {}),
          ...(body.title ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.startsAt ? { startsAt } : {}),
          ...(body.endsAt ? { endsAt } : {}),
          ...(body.categories ? { categories: body.categories } : {}),
          ...(body.multiplier !== undefined ? { multiplier: body.multiplier } : {}),
          ...(body.active !== undefined ? { active: body.active } : {}),
        },
        select: seasonalCampaignSelect,
      });

      return reply.send(mapCampaign(campaign));
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }
      if (err instanceof z.ZodError) {
        return reply.code(422).send({
          error: 'VALIDATION_ERROR',
          message: 'Dados invalidos para campanha sazonal',
          issues: err.errors,
        });
      }

      throw err;
    }
  });

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      ensureAdmin(request.user);
      const { id } = request.params as { id: string };
      const existing = await fastify.prisma.seasonalCampaign.findUnique({
        where: { id },
        select: seasonalCampaignSelect,
      });

      if (!existing) {
        throw new NotFoundError('Campanha sazonal');
      }

      if (existing._count.donations > 0) {
        const campaign = await fastify.prisma.seasonalCampaign.update({
          where: { id },
          data: { active: false },
          select: seasonalCampaignSelect,
        });

        return reply.send({
          deleted: false,
          deactivated: true,
          data: mapCampaign(campaign),
        });
      }

      await fastify.prisma.seasonalCampaign.delete({ where: { id } });

      return reply.send({
        deleted: true,
        deactivated: false,
      });
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send(toErrorResponse(err));
      }

      throw err;
    }
  });
}
