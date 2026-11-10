'use client';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectAccount } from '@/store/accountSlice';
import { Loader, Empty } from './kit';

/** Coupon pages are only for coupon-plan students. Everyone else gets a friendly note instead of an error. */
export default function CouponOnly({ children }) {
  const me = useSelector(selectAccount);
  if (!me) return <Loader />;
  if (me.plan !== 'coupon') {
    return (
      <Empty title="Coupons are for the coupon plan" art="meal-lunch">
        You&apos;re on the fixed plan, so every meal at {me.messTitle} is already yours. <Link href="/home">Back home →</Link>
      </Empty>
    );
  }
  return children;
}
