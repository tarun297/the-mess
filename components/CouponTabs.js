'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Switch between the planner and the wallet (shown on phones, where they share one tab). */
export default function CouponTabs() {
  const path = usePathname();
  const onWallet = path.startsWith('/passes/wallet');
  return (
    <nav className="coupon-tabs" aria-label="Coupons">
      <Link href="/passes" className={!onWallet ? 'on' : ''} aria-current={!onWallet ? 'page' : undefined}>Plan next week</Link>
      <Link href="/passes/wallet" className={onWallet ? 'on' : ''} aria-current={onWallet ? 'page' : undefined}>My coupons</Link>
    </nav>
  );
}
