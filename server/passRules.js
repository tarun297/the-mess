// Rules for the coupon mess ("meal passes"), written as pure functions so the
// API can enforce them and the planner can show the same hints.
//
//  - A pass covers one meal on one date.
//  - Sales open Saturday 00:00 and close Sunday 23:59 IST, for the coming Monday–Sunday.
//  - Late buyers get until Monday dinner; Monday meals that already started are off the table.
//  - The week must add up to at least `minDays` full days of meals (₹476 by default). Max is 7 full days.
//  - No refunds for unused passes.
import { MEAL_SLOTS, MEAL_IDS } from './catalog.js';
import { inIST, fromIST, shiftDay, weekOf, sevenDays, minutesOf } from './time.js';

const DINNER_OPENS = minutesOf(MEAL_SLOTS[2].opens);

export const fullDay = (prices) => MEAL_IDS.reduce((sum, id) => sum + prices[id], 0);
export const cartTotal = (picks, prices) => picks.reduce((sum, p) => sum + (prices[p.meal] ?? 0), 0);
export const pickKey = (day, meal) => `${day}|${meal}`;

/** Sales status at time `ms`: 'open' (weekend), 'late' (Monday grace) or 'shut'. */
export function salesStatus(ms, prices, minDays) {
  const now = inIST(ms);
  const limits = { prices, minDays, floor: fullDay(prices) * minDays, ceiling: fullDay(prices) * 7, serverNow: ms };

  if (now.weekday >= 5) {
    const forWeek = shiftDay(now.day, 7 - now.weekday);
    return {
      ...limits,
      status: 'open',
      forWeek,
      days: sevenDays(forWeek),
      blocked: [],
      endsAt: fromIST(shiftDay(forWeek, -1), '23:59') + 59_999,
    };
  }
  if (now.weekday === 0 && now.minutes < DINNER_OPENS) {
    return {
      ...limits,
      status: 'late',
      forWeek: now.day,
      days: sevenDays(now.day),
      blocked: MEAL_SLOTS.filter((m) => minutesOf(m.opens) <= now.minutes).map((m) => pickKey(now.day, m.id)),
      endsAt: fromIST(now.day, MEAL_SLOTS[2].opens),
    };
  }
  const saturday = shiftDay(weekOf(now.day), 5);
  const forWeek = shiftDay(saturday, 2);
  return {
    ...limits,
    status: 'shut',
    forWeek,
    runningWeek: weekOf(now.day),
    days: sevenDays(forWeek),
    blocked: [],
    startsAt: fromIST(saturday, '00:00'),
  };
}

/** Everything wrong with a basket, as readable sentences. Empty list = good to buy. */
export function basketProblems(picks, sale, { boughtAlready, nonvegOk = () => true }) {
  const problems = [];
  if (sale.status === 'shut') problems.push('Coupon sales are closed. They open on Saturday.');
  if (boughtAlready) problems.push('You have already bought coupons for this week.');
  if (!Array.isArray(picks) || picks.length === 0) return [...problems, 'Pick at least one meal.'];

  const seen = new Set();
  for (const p of picks) {
    const key = pickKey(p.day, p.meal);
    if (!sale.days.includes(p.day)) problems.push(`${p.day} is outside the week on sale.`);
    if (!MEAL_IDS.includes(p.meal)) problems.push(`"${p.meal}" is not a meal.`);
    if (!['veg', 'nonveg'].includes(p.diet)) problems.push(`Choose veg or non-veg for ${p.meal} on ${p.day}.`);
    else if (p.diet === 'nonveg' && !nonvegOk(p.day, p.meal)) problems.push(`${p.meal} on ${p.day} is veg only.`);
    if (seen.has(key)) problems.push(`${p.meal} on ${p.day} is picked twice.`);
    if (sale.blocked.includes(key)) problems.push(`${p.meal} on ${p.day} has already started.`);
    seen.add(key);
  }
  const total = cartTotal(picks, sale.prices);
  if (total < sale.floor) problems.push(`The week needs at least ₹${sale.floor}. Add ₹${sale.floor - total} more.`);
  if (total > sale.ceiling) problems.push(`The most you can buy is ₹${sale.ceiling} a week.`);
  return [...new Set(problems)];
}

/** A short nudge for the planner when the basket is under the minimum. */
export function nudge(total, sale) {
  const gap = sale.floor - total;
  if (gap <= 0) return null;
  if (total === 0) return `Pick meals worth at least ₹${sale.floor} (${sale.minDays} days' worth, any mix).`;
  const { breakfast, lunch, dinner } = sale.prices;
  if (gap <= breakfast) return `Add ₹${gap} more. One breakfast does it.`;
  if (gap <= dinner) return `Add ₹${gap} more. One dinner does it.`;
  if (gap <= lunch) return `Add ₹${gap} more. One lunch does it.`;
  return `Add ₹${gap} more to reach ₹${sale.floor}.`;
}

// One demo account can always buy, so the purchase can be shown on any weekday.
// Every other rule still applies to it.
export const ALWAYS_OPEN_BUYER = 'nishchal@iiit-bh.demo';

export function saleClockFor(account, ms) {
  if (String(account?.email || '').toLowerCase() !== ALWAYS_OPEN_BUYER) return ms;
  const now = inIST(ms);
  const realOpen = now.weekday >= 5 || (now.weekday === 0 && now.minutes < DINNER_OPENS);
  return realOpen ? ms : fromIST(shiftDay(weekOf(now.day), 5), '10:00');
}
