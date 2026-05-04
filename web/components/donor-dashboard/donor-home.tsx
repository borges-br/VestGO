'use client';

import { DonorDashboardHero } from '@/components/donor-dashboard/dashboard-hero';
import { DonorDashboardSections } from '@/components/donor-dashboard/dashboard-sections';
import { useDonorDashboardData } from '@/hooks/use-donor-dashboard';

export function DonorHome({
  firstName,
  accessToken,
}: {
  firstName: string;
  accessToken?: string;
}) {
  const dashboard = useDonorDashboardData({ firstName, accessToken });
  const locationNotice =
    dashboard.location.source === 'fallback' && dashboard.errors.location
      ? dashboard.errors.location
      : null;

  return (
    <div className="min-h-[calc(100vh-var(--topbar-height))] bg-[var(--cream-soft)] text-[var(--primary-deeper)] dark:bg-[var(--surface)]">
      <DonorDashboardHero
        data={dashboard.data}
        donationsLoading={dashboard.loading.donations}
        donationsError={dashboard.errors.donations}
        onRetryDonations={dashboard.refetch.donations}
      />
      <DonorDashboardSections
        data={dashboard.data}
        donationsLoading={dashboard.loading.donations}
        donationsError={dashboard.errors.donations}
        pointsLoading={dashboard.loading.nearbyPoints}
        pointsError={dashboard.errors.nearbyPoints}
        locationLabel={dashboard.location.label}
        locationNotice={locationNotice}
        onRetryDonations={dashboard.refetch.donations}
        onRetryPoints={dashboard.refetch.nearbyPoints}
      />
    </div>
  );
}
