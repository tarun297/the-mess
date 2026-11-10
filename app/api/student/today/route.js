import { NextResponse } from 'next/server';
import { row, rows, settings, appNow } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { inIST, weekOf, servingAt, upcomingAfter, hasEnded, hasStarted } from '@/server/time';
import { salesStatus, saleClockFor } from '@/server/passRules';
import { MEAL_SLOTS, messTitle } from '@/server/catalog';
import { menuForDays } from '@/server/menu';

// GET /api/student/today -> everything the student home screen shows, in one call.
export const GET = api(async (request) => {
  const me = await signedIn(request, 'student');
  const now = await appNow();
  const t = inIST(now);
  const { prices, minDays } = await settings();

  const menu = (await menuForDays(me.mess_id, [t.day]))[t.day];
  const ate = (await rows('SELECT meal FROM entries WHERE account_id = ? AND day = ?', [me.id, t.day])).map((r) => r.meal);
  const skipped = (await rows('SELECT meal FROM skips WHERE account_id = ? AND day = ?', [me.id, t.day])).map((r) => r.meal);
  const rated = Object.fromEntries((await rows('SELECT meal, stars FROM ratings WHERE account_id = ? AND day = ?', [me.id, t.day])).map((r) => [r.meal, r.stars]));

  let passes = null;
  if (me.plan === 'coupon') {
    const sale = salesStatus(saleClockFor(me, now), prices, minDays);
    const week = weekOf(t.day);
    const todays = await rows('SELECT meal, diet, used_at FROM passes WHERE holder_id = ? AND day = ?', [me.id, t.day]);
    const counts = await row(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN used_at IS NOT NULL THEN 1 ELSE 0 END) AS used FROM passes WHERE holder_id = ? AND day BETWEEN ? AND date(?, '+6 days')",
      [me.id, week, week],
    );
    const next = await row('SELECT amount FROM purchases WHERE account_id = ? AND week = ?', [me.id, sale.forWeek]);
    passes = {
      sale: { status: sale.status, forWeek: sale.forWeek, endsAt: sale.endsAt ?? null, startsAt: sale.startsAt ?? null },
      boughtForSaleWeek: next ? Number(next.amount) : null,
      today: Object.fromEntries(todays.map((p) => [p.meal, p.used_at ? 'used' : 'ready'])),
      diets: Object.fromEntries(todays.map((p) => [p.meal, p.diet])),
      week: { total: Number(counts.total || 0), used: Number(counts.used || 0) },
    };
  }

  const serving = servingAt(now);
  const next = upcomingAfter(now);
  // The latest meal you ate today that you haven't rated yet, once it's over or you've eaten it.
  const toRate = [...MEAL_SLOTS].reverse().find((m) => ate.includes(m.id) && !rated[m.id]) ?? null;

  return NextResponse.json({
    now,
    day: t.day,
    weekday: t.weekday,
    mess: me.mess_id,
    messTitle: messTitle(me.mess_id),
    plan: me.plan,
    serving: serving && { id: serving.id, name: serving.name, opens: serving.opens, closes: serving.closes },
    next: { id: next.id, name: next.name, opens: next.opens, closes: next.closes, day: next.day, at: next.at },
    menu,
    meals: MEAL_SLOTS.map((m) => ({
      id: m.id,
      name: m.name,
      opens: m.opens,
      closes: m.closes,
      ate: ate.includes(m.id),
      over: hasEnded(t.day, m.id, now),
      pass: passes ? passes.today[m.id] ?? 'none' : null,
      diet: passes ? passes.diets[m.id] ?? null : null,
      stars: rated[m.id] ?? null,
      skipped: skipped.includes(m.id),
      started: hasStarted(t.day, m.id, now),
    })),
    toRate: toRate && { id: toRate.id, name: toRate.name },
    passes,
  });
});
