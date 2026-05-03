import { ItemCategory, Prisma, PrismaClient } from '@prisma/client';

type SeasonalCampaignClient = Pick<PrismaClient, 'seasonalCampaign'> | Prisma.TransactionClient;

export async function findMatchingSeasonalCampaign(
  prisma: SeasonalCampaignClient,
  categories: ItemCategory[],
  at = new Date(),
) {
  const uniqueCategories = Array.from(new Set(categories));

  const candidates = await prisma.seasonalCampaign.findMany({
    where: {
      active: true,
      startsAt: { lte: at },
      endsAt: { gte: at },
    },
    select: {
      id: true,
      categories: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const compatible = candidates
    .map((campaign) => {
      const matchingCategories = campaign.categories.filter((category) =>
        uniqueCategories.includes(category),
      ).length;

      return {
        ...campaign,
        matchingCategories,
        compatible: campaign.categories.length === 0 || matchingCategories > 0,
      };
    })
    .filter((campaign) => campaign.compatible);

  return (
    compatible.sort((left, right) => {
      const leftHasCategoryFilter = left.categories.length > 0 ? 1 : 0;
      const rightHasCategoryFilter = right.categories.length > 0 ? 1 : 0;

      if (leftHasCategoryFilter !== rightHasCategoryFilter) {
        return rightHasCategoryFilter - leftHasCategoryFilter;
      }

      // More specific seasonal campaigns win: category-scoped before broad,
      // then the smallest compatible category set before newer campaigns.
      if (left.categories.length !== right.categories.length) {
        return left.categories.length - right.categories.length;
      }

      if (left.matchingCategories !== right.matchingCategories) {
        return right.matchingCategories - left.matchingCategories;
      }

      return right.startsAt.getTime() - left.startsAt.getTime();
    })[0] ?? null
  );
}
