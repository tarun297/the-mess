import { NextResponse } from 'next/server';
import { row, settings, appNow, atomically } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { salesStatus, saleClockFor, basketProblems, cartTotal } from '@/server/passRules';
import { menuForDays } from '@/server/menu';

// POST /api/passes/purchase { picks: [{ day, meal }] } -> buy a week of coupons.
// Every rule is checked here, whatever the browser sent.
export const POST = api(async (request) => {
  const me = await signedIn(request, 'student');
  if (me.plan !== 'coupon') throw refuse('Coupons are only for students on the coupon plan.', 403);
  const { picks } = await readBody(request);
  const now = await appNow();
  const { prices, minDays } = await settings();
  const sale = salesStatus(saleClockFor(me, now), prices, minDays);
  const already = await row('SELECT id FROM purchases WHERE account_id = ? AND week = ?', [me.id, sale.forWeek]);

  const menu = await menuForDays(me.mess_id, sale.days);
  const nonvegOk = (day, meal) => Boolean(menu[day]?.[meal]?.nonveg);
  const problems = basketProblems(picks, sale, { boughtAlready: Boolean(already), nonvegOk });
  if (problems.length) return NextResponse.json({ error: problems[0], problems }, { status: 400 });

  const amount = cartTotal(picks, prices);
  const receipt = `TM-${now.toString(36).toUpperCase().slice(-6)}`;
  try {
    // The purchase and all its passes are saved together, or not at all.
    await atomically(async (run) => {
      const res = await run('INSERT INTO purchases (account_id, week, amount, receipt, at) VALUES (?,?,?,?,?)', [me.id, sale.forWeek, amount, receipt, new Date(now).toISOString()]);
      const purchaseId = Number(res.lastInsertRowid);
      for (const p of picks) {
        await run('INSERT INTO passes (purchase_id, holder_id, buyer_id, mess_id, day, meal, price, diet) VALUES (?,?,?,?,?,?,?,?)',
          [purchaseId, me.id, me.id, me.mess_id, p.day, p.meal, prices[p.meal], p.diet]);
      }
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse('You already hold a coupon for one of these meals (a friend may have given it to you).', 409);
    throw err;
  }
  return NextResponse.json({ ok: true, amount, receipt, count: picks.length, week: sale.forWeek }, { status: 201 });
});
