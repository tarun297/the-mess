import { NextResponse } from 'next/server';
import { rows, appNow } from '@/server/db';
import { api, signedIn, refuse } from '@/server/session';
import { inIST, weekOf, shiftDay, hasEnded, hasStarted, sevenDays } from '@/server/time';
import { menuForDays } from '@/server/menu';
import { plateFor } from '@/server/catalog';

// GET /api/passes?week=YYYY-MM-DD -> your coupons for a week (default: this week),
// each marked used / ready / expired, plus coupons you gave or received.
export const GET = api(async (request) => {
  const me = await signedIn(request, 'student');
  if (me.plan !== 'coupon') throw refuse('Coupons are only for students on the coupon plan.', 403);
  const now = await appNow();
  const today = inIST(now).day;
  const asked = request.nextUrl.searchParams.get('week');
  const week = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? weekOf(asked) : weekOf(today);

  const list = await rows(
    `SELECT p.id, p.day, p.meal, p.price, p.diet, p.used_at, p.buyer_id, b.full_name AS buyer
       FROM passes p JOIN accounts b ON b.id = p.buyer_id
      WHERE p.holder_id = ? AND p.day BETWEEN ? AND date(?, '+6 days')
      ORDER BY p.day, CASE p.meal WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END`,
    [me.id, week, week],
  );
  const menu = await menuForDays(me.mess_id, sevenDays(week));
  const passes = list.map((p) => {
    const state = p.used_at ? 'used' : hasEnded(p.day, p.meal, now) ? 'expired' : 'ready';
    return {
      id: p.id, day: p.day, meal: p.meal, diet: p.diet, price: Number(p.price), plate: plateFor(menu[p.day]?.[p.meal], p.diet), state, usedAt: p.used_at,
      giftFrom: p.buyer_id !== me.id ? p.buyer : null,
      canGive: state === 'ready' && !hasStarted(p.day, p.meal, now),
    };
  });
  const gifts = await rows(
    `SELECT h.at, p.day, p.meal, g.full_name AS giver, g.roll AS giver_roll, r.full_name AS receiver, r.roll AS receiver_roll,
            CASE WHEN h.giver_id = ? THEN 'gave' ELSE 'got' END AS way
       FROM handovers h JOIN passes p ON p.id = h.pass_id
       JOIN accounts g ON g.id = h.giver_id JOIN accounts r ON r.id = h.receiver_id
      WHERE h.giver_id = ? OR h.receiver_id = ? ORDER BY h.at DESC LIMIT 20`,
    [me.id, me.id, me.id],
  );

  return NextResponse.json({
    week, thisWeek: weekOf(today), today, earlier: shiftDay(week, -7), later: shiftDay(week, 7), serverNow: now,
    passes,
    gifts,
    tally: {
      total: passes.length,
      used: passes.filter((p) => p.state === 'used').length,
      ready: passes.filter((p) => p.state === 'ready').length,
      expired: passes.filter((p) => p.state === 'expired').length,
      spent: passes.reduce((s, p) => s + p.price, 0),
    },
  });
});
