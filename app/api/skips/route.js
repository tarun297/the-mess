import { NextResponse } from 'next/server';
import { row, exec, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { inIST, shiftDay, hasStarted } from '@/server/time';
import { MEAL_IDS, mealName } from '@/server/catalog';

// POST /api/skips { day, meal, skip: true|false } -> a fixed-plan student says they'll skip a meal
// (or changes their mind). Allowed up to 7 days ahead, until the meal starts.
export const POST = api(async (request) => {
  const me = await signedIn(request, 'student');
  if (me.plan !== 'fixed') throw refuse('Coupon students just skip buying that meal.');
  const { day, meal, skip } = await readBody(request);
  if (!MEAL_IDS.includes(meal)) throw refuse('Pick a meal.');
  const now = await appNow();
  const today = inIST(now).day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || day < today || day > shiftDay(today, 7)) throw refuse('You can plan skips for the next 7 days.');
  if (hasStarted(day, meal, now)) throw refuse(`${mealName(meal)} has already started.`);
  if (skip) {
    const ate = await row('SELECT 1 AS x FROM entries WHERE account_id = ? AND day = ? AND meal = ?', [me.id, day, meal]);
    if (ate) throw refuse("You've already checked in for this meal.");
    await exec('INSERT OR IGNORE INTO skips (account_id, mess_id, day, meal, at) VALUES (?,?,?,?,?)', [me.id, me.mess_id, day, meal, new Date(now).toISOString()]);
  } else {
    await exec('DELETE FROM skips WHERE account_id = ? AND day = ? AND meal = ?', [me.id, day, meal]);
  }
  return NextResponse.json({ ok: true, skipped: Boolean(skip) });
});
