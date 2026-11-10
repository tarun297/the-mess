import { NextResponse } from 'next/server';
import { settings, saveSetting } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { fullDay } from '@/server/passRules';

const shape = (s) => ({ prices: s.prices, minDays: s.minDays, escalateAfterHours: s.escalateAfterHours, floor: fullDay(s.prices) * s.minDays, ceiling: fullDay(s.prices) * 7 });

// GET /api/admin/rules -> coupon prices, weekly minimum and the auto-escalation time.
export const GET = api(async (request) => {
  await signedIn(request, 'admin');
  return NextResponse.json(shape(await settings()));
});

// PUT /api/admin/rules { prices: { breakfast, lunch, dinner }, minDays, escalateAfterHours }
// Prices change every semester, so they live in the database, not in the code.
export const PUT = api(async (request) => {
  await signedIn(request, 'admin');
  const { prices, minDays, escalateAfterHours } = await readBody(request);
  const p = {};
  for (const meal of ['breakfast', 'lunch', 'dinner']) {
    const v = Number(prices?.[meal]);
    if (!Number.isInteger(v) || v < 1 || v > 500) throw refuse(`Price for ${meal} must be a whole number of rupees, 1 to 500.`);
    p[meal] = v;
  }
  const days = Number(minDays);
  if (!Number.isInteger(days) || days < 1 || days > 7) throw refuse('Minimum must be 1 to 7 days.');
  const hours = Number(escalateAfterHours);
  if (!Number.isInteger(hours) || hours < 6 || hours > 240) throw refuse('Escalation time must be 6 to 240 hours.');
  await saveSetting('prices', p);
  await saveSetting('min_days', days);
  await saveSetting('escalate_after_hours', hours);
  return NextResponse.json(shape(await settings()));
});
