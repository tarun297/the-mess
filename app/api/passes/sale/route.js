import { NextResponse } from 'next/server';
import { row, rows, settings, appNow } from '@/server/db';
import { api, signedIn, refuse } from '@/server/session';
import { salesStatus, saleClockFor } from '@/server/passRules';
import { shiftDay } from '@/server/time';
import { menuForDays } from '@/server/menu';

// GET /api/passes/sale -> is the coupon sale open, for which week, which meals are blocked,
// prices and limits, what you already bought, and last week's picks (for "Copy last week").
export const GET = api(async (request) => {
  const me = await signedIn(request, 'student');
  if (me.plan !== 'coupon') throw refuse('Coupons are only for students on the coupon plan.', 403);
  const { prices, minDays } = await settings();
  const sale = salesStatus(saleClockFor(me, await appNow()), prices, minDays);

  const bought = await row('SELECT id, amount, receipt, at FROM purchases WHERE account_id = ? AND week = ?', [me.id, sale.forWeek]);
  const boughtPicks = bought ? await rows('SELECT day, meal, diet FROM passes WHERE purchase_id = ?', [bought.id]) : [];
  const prior = shiftDay(sale.forWeek, -7);
  const previous = (await rows("SELECT day, meal, diet FROM passes WHERE buyer_id = ? AND day BETWEEN ? AND date(?, '+6 days')", [me.id, prior, prior]))
    .map((p) => ({ day: shiftDay(p.day, 7), meal: p.meal, diet: p.diet }));

  return NextResponse.json({
    ...sale,
    bought: bought ? { amount: Number(bought.amount), receipt: bought.receipt, at: bought.at, picks: boughtPicks } : null,
    previous,
    menu: await menuForDays(me.mess_id, sale.days),
  });
});
