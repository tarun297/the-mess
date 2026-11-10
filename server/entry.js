// Letting a student into a meal. Used by the student's code check-in and the staff counter.
// Checks, in order: right mess -> (coupon plan) holds a coupon for this meal -> not served yet.
import { rows, row, exec, settings } from './db.js';
import { inIST, servingAt, closestMeal, upcomingAfter, fromIST } from './time.js';
import { messTitle, mealName } from './catalog.js';
import { menuForDays } from './menu.js';

const clockOf = (iso) => inIST(Date.parse(iso)).clock;

/** Which meal an entry at `ms` counts for. The demo can allow entry outside meal hours. */
export async function mealNow(ms) {
  const serving = servingAt(ms);
  if (serving) return { meal: serving, anyHour: false };
  if ((await settings()).anyHourEntry) return { meal: closestMeal(ms), anyHour: true };
  return { meal: null, next: upcomingAfter(ms) };
}

/**
 * Try to let `student` in at mess `atMess`. Returns what the result card shows:
 * { outcome: 'in' | 'wrong_mess' | 'no_pass' | 'already' | 'closed', headline, detail, serve, ... }
 */
export async function admit({ student, atMess, ms, via }) {
  const day = inIST(ms).day;
  const now = await mealNow(ms);
  const who = { name: student.full_name, roll: student.roll, plan: student.plan, year: student.year };
  if (!now.meal) {
    return { outcome: 'closed', headline: 'No meal right now', detail: `Next up: ${now.next.name} at ${now.next.opens}.`, who };
  }
  const meal = now.meal.id;
  const base = { meal, mealName: now.meal.name, day, who, anyHour: now.anyHour };

  if (student.mess_id !== atMess) {
    return {
      ...base, outcome: 'wrong_mess', headline: 'Wrong mess',
      detail: `${student.full_name} eats at ${messTitle(student.mess_id)}, not ${messTitle(atMess)}.`,
      goTo: messTitle(student.mess_id),
    };
  }

  const stamp = new Date(ms).toISOString();
  let serve = null; // 'veg' | 'nonveg' for coupon students; fixed plan chooses at the counter
  if (student.plan === 'coupon') {
    // One conditional update: two scans at the same moment can't both use the coupon.
    const used = await exec('UPDATE passes SET used_at = ? WHERE holder_id = ? AND day = ? AND meal = ? AND used_at IS NULL', [stamp, student.id, day, meal]);
    const pass = await row('SELECT diet, used_at FROM passes WHERE holder_id = ? AND day = ? AND meal = ?', [student.id, day, meal]);
    if (used.rowsAffected === 0) {
      if (pass?.used_at) {
        return { ...base, serve: pass.diet, outcome: 'already', headline: 'Already served', detail: `${mealName(meal)} coupon was used at ${clockOf(pass.used_at)}.` };
      }
      return { ...base, outcome: 'no_pass', headline: 'No coupon for this meal', detail: `${student.full_name} has no ${mealName(meal).toLowerCase()} coupon for today.` };
    }
    serve = pass.diet;
  }
  const dish = (await menuForDays(atMess, [day]))[day]?.[meal];
  const serveDish = serve && dish ? (serve === 'nonveg' ? dish.nonveg : dish.veg) : null;

  // Said they'd skip but came anyway: they still eat, and the skip is cancelled.
  await exec('DELETE FROM skips WHERE account_id = ? AND day = ? AND meal = ?', [student.id, day, meal]);
  try {
    await exec('INSERT INTO entries (account_id, mess_id, day, meal, at, via) VALUES (?,?,?,?,?,?)', [student.id, atMess, day, meal, stamp, via]);
  } catch (err) {
    if (!String(err.message).includes('UNIQUE')) throw err;
    const earlier = await row('SELECT at FROM entries WHERE account_id = ? AND day = ? AND meal = ?', [student.id, day, meal]);
    return { ...base, serve, outcome: 'already', headline: 'Already served', detail: `Checked in for ${mealName(meal).toLowerCase()} at ${clockOf(earlier.at)}.` };
  }
  return {
    ...base, serve, serveDish, outcome: 'in', headline: 'Enjoy your meal',
    detail: student.plan === 'coupon' ? `${mealName(meal)} coupon used.` : `${mealName(meal)} · fixed plan.`,
  };
}

/** How many to cook for, and how many came, for each meal of a day at a mess. Split veg / non-veg for coupon messes. */
export async function cookFor(messId, day) {
  const mess = await row('SELECT plan FROM messes WHERE id = ?', [messId]);
  const came = Object.fromEntries((await rows('SELECT meal, COUNT(*) AS n FROM entries WHERE mess_id = ? AND day = ? GROUP BY meal', [messId, day])).map((r) => [r.meal, Number(r.n)]));
  const out = { breakfast: {}, lunch: {}, dinner: {} };
  if (mess.plan === 'coupon') {
    for (const r of await rows('SELECT meal, diet, COUNT(*) AS n FROM passes WHERE mess_id = ? AND day = ? GROUP BY meal, diet', [messId, day])) {
      out[r.meal][r.diet] = Number(r.n);
    }
  } else {
    const { n } = await row("SELECT COUNT(*) AS n FROM accounts WHERE role = 'student' AND mess_id = ?", [messId]);
    const skipped = Object.fromEntries((await rows('SELECT meal, COUNT(*) AS n FROM skips WHERE mess_id = ? AND day = ? GROUP BY meal', [messId, day])).map((r) => [r.meal, Number(r.n)]));
    for (const m of Object.keys(out)) { out[m].all = Number(n) - (skipped[m] ?? 0); out[m].skipped = skipped[m] ?? 0; }
  }
  return Object.entries(out).map(([meal, c]) => ({
    meal,
    veg: c.veg ?? null,
    nonveg: c.nonveg ?? null,
    expected: c.all ?? (c.veg ?? 0) + (c.nonveg ?? 0),
    skipped: c.skipped ?? null,
    came: came[meal] ?? 0,
  }));
}

export const mealStartMs = (day, meal) => fromIST(day, { breakfast: '07:00', lunch: '12:00', dinner: '19:00' }[meal]);
