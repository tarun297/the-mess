import { NextResponse } from 'next/server';
import { exec, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { weekMenu, menuOwner } from '@/server/menu';
import { MESSES, MEAL_IDS } from '@/server/catalog';
import { inIST } from '@/server/time';

// GET /api/menu?mess=CPN-B -> a mess's weekly menu (default: your own mess).
export const GET = api(async (request) => {
  const me = await signedIn(request);
  const asked = request.nextUrl.searchParams.get('mess');
  const mess = MESSES.some((m) => m.id === asked) ? asked : me.mess_id || 'FY';
  return NextResponse.json({
    mess,
    week: await weekMenu(mess),
    todayIndex: inIST(await appNow()).weekday,
    messes: MESSES,
    canPick: me.role === 'society' || me.role === 'admin',
  });
});

const clean = (v, max) => {
  const t = String(v ?? '').trim();
  if (t.length > max) throw refuse(`Keep each field under ${max} characters.`);
  return t || null;
};

// PUT /api/menu { weekday, meal, common, veg, nonveg } -> staff change their menu. Main and Coupon messes (boys and girls) all share Menu B.
export const PUT = api(async (request) => {
  const me = await signedIn(request, 'staff');
  const b = await readBody(request);
  const weekday = Number(b.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw refuse('Pick a day.');
  if (!MEAL_IDS.includes(b.meal)) throw refuse('Pick a meal.');
  const common = clean(b.common, 160);
  const veg = clean(b.veg, 60);
  const nonveg = clean(b.nonveg, 60);
  if (!common || common.length < 3) throw refuse('List the dishes everyone gets.');
  if (nonveg && !veg) throw refuse('A meal with a non-veg dish needs a veg dish too.');
  await exec('UPDATE menu SET common = ?, veg = ?, nonveg = ?, edited_by = ?, edited_at = ? WHERE mess_id = ? AND weekday = ? AND meal = ?',
    [common, veg, nonveg, me.id, new Date().toISOString(), menuOwner(me.mess_id), weekday, b.meal]);
  return NextResponse.json({ ok: true });
});
