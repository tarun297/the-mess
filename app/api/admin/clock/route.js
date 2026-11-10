import { NextResponse } from 'next/server';
import { settings, saveSetting } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { inIST, fromIST, weekOf, shiftDay } from '@/server/time';
import { salesStatus } from '@/server/passRules';

// The demo clock lets the admin jump to a Saturday, a grace Monday or lunch time, so every
// time-based rule can be shown live. It is saved as an offset, so the clock keeps ticking.
async function state() {
  const s = await settings();
  const now = Date.now() + s.clockShiftMs;
  const t = inIST(now);
  return { shifted: s.clockShiftMs !== 0, now, day: t.day, clock: t.clock, weekday: t.weekday, sale: salesStatus(now, s.prices, s.minDays).status, anyHourEntry: s.anyHourEntry, demoScan: s.demoScan };
}

export const GET = api(async (request) => {
  await signedIn(request, 'admin');
  return NextResponse.json(await state());
});

// PUT /api/admin/clock { jump } | { day, clock } | { anyHourEntry } | { demoScan }
export const PUT = api(async (request) => {
  await signedIn(request, 'admin');
  const b = await readBody(request);
  if (typeof b.anyHourEntry === 'boolean') await saveSetting('any_hour_entry', b.anyHourEntry);
  if (typeof b.demoScan === 'boolean') await saveSetting('demo_scan', b.demoScan);
  const today = inIST(Date.now()).day;
  const monday = weekOf(today);
  const jumps = {
    saturday: [shiftDay(monday, 5), '11:00'],
    grace: [shiftDay(monday, 7), '10:00'],
    closed: [shiftDay(monday, 2), '16:00'],
    breakfast: [today, '07:45'],
    lunch: [today, '12:30'],
    dinner: [today, '19:30'],
  };
  let target = null;
  if (b.jump === 'real') target = 'real';
  else if (b.jump) {
    if (!jumps[b.jump]) throw refuse('Unknown time.');
    target = fromIST(...jumps[b.jump]);
  } else if (b.day || b.clock) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.day || '') || !/^\d{2}:\d{2}$/.test(b.clock || '')) throw refuse('Pick a date and a time.');
    target = fromIST(b.day, b.clock);
  }
  if (target === 'real') await saveSetting('clock_shift_ms', 0);
  else if (target !== null) await saveSetting('clock_shift_ms', target - Date.now());
  return NextResponse.json(await state());
});
