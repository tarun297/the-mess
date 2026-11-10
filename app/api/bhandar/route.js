import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api } from '@/server/session';
import { couponStudent, sweep, mine } from '@/server/bhandar';

// GET /api/bhandar -> your listings (with the buyer's name once they've requested), your requests, your "notify me" list.
export const GET = api(async (request) => {
  const me = await couponStudent(request);
  const now = await appNow();
  await sweep(now);
  return NextResponse.json(await mine(me, now));
});
