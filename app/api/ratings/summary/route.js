import { NextResponse } from 'next/server';
import { rows, appNow } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { inIST, weekOf } from '@/server/time';
import { MESSES } from '@/server/catalog';

// GET /api/ratings/summary?mess= -> average stars per meal this week, and the latest comments.
export const GET = api(async (request) => {
  const me = await signedIn(request, 'staff', 'society', 'admin');
  const asked = request.nextUrl.searchParams.get('mess');
  const mess = me.role === 'staff' ? me.mess_id : MESSES.some((m) => m.id === asked) ? asked : null;
  const week = weekOf(inIST(await appNow()).day);
  const where = mess ? 'AND mess_id = ?' : '';
  const args = mess ? [week, week, mess] : [week, week];
  const byMeal = await rows(`SELECT meal, ROUND(AVG(stars), 1) AS avg, COUNT(*) AS n FROM ratings WHERE day BETWEEN ? AND date(?, '+6 days') ${where} GROUP BY meal`, args);
  const byMess = await rows(`SELECT mess_id, ROUND(AVG(stars), 1) AS avg, COUNT(*) AS n FROM ratings WHERE day BETWEEN ? AND date(?, '+6 days') GROUP BY mess_id`, [week, week]);
  const notes = await rows(`SELECT day, meal, stars, remark FROM ratings WHERE remark IS NOT NULL AND day BETWEEN ? AND date(?, '+6 days') ${where} ORDER BY at DESC LIMIT 6`, args);
  return NextResponse.json({
    week, mess,
    meals: Object.fromEntries(byMeal.map((r) => [r.meal, { avg: Number(r.avg), n: Number(r.n) }])),
    messes: Object.fromEntries(byMess.map((r) => [r.mess_id, { avg: Number(r.avg), n: Number(r.n) }])),
    notes,
  });
});
