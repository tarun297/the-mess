'use client';
import { useKitchenQuery } from '@/store/api';
import { Head, Loader, Problem } from '@/components/kit';
import KitchenView from '@/components/KitchenView';

export default function CookFor() {
  const { data, isLoading, error } = useKitchenQuery(undefined, { pollingInterval: 15_000 });
  if (isLoading) return <Loader />;
  if (error) return <Problem error={error} />;
  return (
    <>
      <Head title="Cook for" lead={`${data.messTitle} · counted from ${data.basis}.`} />
      <KitchenView data={data} />
      {data.plan === 'coupon' && <p className="small muted" style={{ marginTop: 14 }}>Coupon messes know the exact count: every coupon is for one meal on one day, veg or non-veg, so you cook only what was sold.</p>}
    </>
  );
}
