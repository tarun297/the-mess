import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api } from '@/server/session';
import { couponStudent, sweep, browse } from '@/server/bhandar';

// GET /api/bhandar/browse?day=&meal=&diet= -> open listings for one meal in YOUR mess (seller names hidden).
export const GET = api(async (request) => {
  const me = await couponStudent(request);
  const now = await appNow();
  await sweep(now);
  const q = request.nextUrl.searchParams;
  return NextResponse.json(await browse(me, { day: q.get('day'), meal: q.get('meal'), diet: q.get('diet') }, now));
});
