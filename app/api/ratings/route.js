import { NextResponse } from 'next/server';
import { row, exec, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { inIST } from '@/server/time';
import { MEAL_IDS } from '@/server/catalog';

// POST /api/ratings { meal, stars, remark? } -> rate a meal you ate today. Once per meal.
export const POST = api(async (request) => {
  const me = await signedIn(request, 'student');
  const { meal, stars, remark } = await readBody(request);
  if (!MEAL_IDS.includes(meal)) throw refuse('Pick a meal to rate.');
  const n = Number(stars);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw refuse('Give 1 to 5 stars.');
  const note = String(remark || '').trim();
  if (note.length > 200) throw refuse('Keep the comment under 200 characters.');
  const now = await appNow();
  const day = inIST(now).day;
  const ate = await row('SELECT mess_id FROM entries WHERE account_id = ? AND day = ? AND meal = ?', [me.id, day, meal]);
  if (!ate) throw refuse('You can only rate a meal you checked in for today.');
  await exec('INSERT INTO ratings (account_id, day, meal, mess_id, stars, remark, at) VALUES (?,?,?,?,?,?,?)', [
    me.id, day, meal, ate.mess_id, n, note || null, new Date(now).toISOString(),
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
});
