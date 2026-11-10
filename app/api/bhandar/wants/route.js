import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent, sweep, addWant } from '@/server/bhandar';

// POST /api/bhandar/wants { day, meal, diet } -> "Notify me" when that exact coupon is listed.
export const POST = api(async (request) => {
  const me = await couponStudent(request);
  const body = await readBody(request);
  const now = await appNow();
  await sweep(now);
  await addWant(me, body, now);
  return NextResponse.json({ ok: true });
});
