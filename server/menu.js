// Reading the weekly menu of a mess.
import { rows } from './db.js';
import { inIST } from './time.js';

// There are only two menus: Menu A (First-Year Mess) and Menu B (Main and Coupon messes, boys and girls).
// They are stored under the mess ids 'FY' and 'MAIN-B'. Every read and edit goes through this.
export const menuOwner = (messId) => (messId === 'FY' ? 'FY' : 'MAIN-B');

const shape = (r) => ({ common: r.common, veg: r.veg ?? null, nonveg: r.nonveg ?? null });

/** The whole week of a mess: weeks[weekday][meal] = { common, veg, nonveg }. weekday 0 = Monday. */
export async function weekMenu(messId) {
  const list = await rows('SELECT weekday, meal, common, veg, nonveg FROM menu WHERE mess_id = ?', [menuOwner(messId)]);
  const week = Array.from({ length: 7 }, () => ({}));
  for (const r of list) week[Number(r.weekday)][r.meal] = shape(r);
  return week;
}

/** Menu for each date in a list: { 'YYYY-MM-DD': { breakfast: {...}, ... } }. */
export async function menuForDays(messId, days) {
  const week = await weekMenu(messId);
  return Object.fromEntries(days.map((d) => [d, week[inIST(Date.parse(`${d}T06:30:00Z`)).weekday]]));
}
