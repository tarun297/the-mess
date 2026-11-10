import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api } from '@/server/session';
import { couponStudent, sweep, takeDownListing } from '@/server/bhandar';

// DELETE /api/bhandar/listings/:id -> take down your own open listing.
export const DELETE = api(async (request, { params }) => {
  const me = await couponStudent(request);
  const { id } = await params;
  await sweep(await appNow());
  await takeDownListing(me, id);
  return NextResponse.json({ ok: true });
});
