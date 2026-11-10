import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent, sweep, requestListing } from '@/server/bhandar';

// POST /api/bhandar/requests { listingId } -> ask for a listing; it is held for you for 30 minutes.
export const POST = api(async (request) => {
  const me = await couponStudent(request);
  const { listingId } = await readBody(request);
  const now = await appNow();
  await sweep(now);
  await requestListing(me, listingId, now);
  return NextResponse.json({ ok: true });
});
