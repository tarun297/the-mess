import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api } from '@/server/session';
import { couponStudent, sweep, sellable } from '@/server/bhandar';

// GET /api/bhandar/sellable -> your unused, upcoming coupons that aren't listed yet.
export const GET = api(async (request) => {
  const me = await couponStudent(request);
  const now = await appNow();
  await sweep(now);
  return NextResponse.json({ passes: await sellable(me, now) });
});
