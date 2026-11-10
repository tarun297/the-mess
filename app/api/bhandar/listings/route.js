import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent, sweep, postListings } from '@/server/bhandar';

// POST /api/bhandar/listings { items: [{ passId, price }] } -> put coupons up for sale.
// Price can't be above face value. People waiting for exactly that meal get a notification.
export const POST = api(async (request) => {
  const me = await couponStudent(request);
  const { items } = await readBody(request);
  const now = await appNow();
  await sweep(now);
  return NextResponse.json({ ok: true, posted: await postListings(me, items, now) });
});
