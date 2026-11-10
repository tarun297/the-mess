// Coupon Bhandar: students swap unused coupons. The app only matches people and moves the coupon;
// the money is settled outside the app (UPI or cash), so the seller confirms "Paid, hand over".
//
// Rules (all enforced here, never only in the browser):
//  - coupon-plan students only; listings and requests stay inside one year (boys and girls can share;
//    the coupon moves to the buyer's side when handed over)
//  - a listing's price can't be above the coupon's face value
//  - a listing closes when its meal starts, or the coupon is used or goes elsewhere
//  - a request holds the listing for 30 minutes; decline, cancel or timeout reopens it
//  - one open request per buyer per meal, at most 3 open requests per buyer
//  - names and roll numbers are shown only to the two people in a request
import { rows, row, exec, atomically, settings } from './db.js';
import { refuse, signedIn } from './session.js';
import { inIST, hasStarted, shiftDay } from './time.js';
import { menuForDays } from './menu.js';
import { MEAL_IDS, mealName } from './catalog.js';
import { checkHandover, moveCoupon } from './handover.js';

export const HOLD_MS = 30 * 60_000;
export const MAX_REQUESTS = 3;
export const MAX_WANTS = 10;
export const WINDOW_DAYS = 14;

/** The signed-in student, only if on the coupon plan (fixed-plan students get a 403). */
export async function couponStudent(request) {
  const me = await signedIn(request, 'student');
  if (me.plan !== 'coupon') throw refuse('Coupon Bhandar is only for students on the coupon plan.', 403);
  return me;
}

const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
export const slotLabel = (day, meal) => `${mealName(meal)} on ${dayLabel(day)}`;

async function notify(run, accountId, kind, title, body, now) {
  await run('INSERT INTO notifications (account_id, kind, title, body, link, created_at) VALUES (?,?,?,?,?,?)', [accountId, kind, title, body ?? null, '/bhandar', now]);
}

/** Tidies up before every Bhandar call: ends old holds, closes dead listings, drops stale wants. */
export async function sweep(now) {
  // 1. Holds that ran out their 30 minutes.
  const late = await rows(
    `SELECT r.id, r.listing_id, r.buyer_id, l.seller_id, l.day, l.meal
       FROM requests r JOIN listings l ON l.id = r.listing_id WHERE r.status = 'held' AND r.expires_at <= ?`, [now]);
  for (const r of late) {
    await atomically(async (run) => {
      const done = await run("UPDATE requests SET status = 'expired', resolved_at = ? WHERE id = ? AND status = 'held'", [now, r.id]);
      if (!done.rowsAffected) return;
      await run("UPDATE listings SET status = 'open' WHERE id = ? AND status = 'held'", [r.listing_id]);
      await notify(run, r.buyer_id, 'expired', 'Your request expired', `The 30 minutes for ${slotLabel(r.day, r.meal)} ran out.`, now);
      await notify(run, r.seller_id, 'expired', 'A request expired', `${slotLabel(r.day, r.meal)} is open for sale again.`, now);
    });
  }
  // 2. Listings whose meal started, or whose coupon was used or went elsewhere.
  const live = await rows(
    `SELECT l.id, l.seller_id, l.day, l.meal, l.status, p.holder_id, p.used_at
       FROM listings l JOIN passes p ON p.id = l.pass_id WHERE l.status IN ('open','held')`);
  for (const l of live) {
    const reason = hasStarted(l.day, l.meal, now) ? 'The meal has started.' : l.used_at ? 'The coupon was used.' : l.holder_id !== l.seller_id ? 'The coupon went to someone else.' : null;
    if (!reason) continue;
    await atomically(async (run) => {
      const held = await run("SELECT buyer_id FROM requests WHERE listing_id = ? AND status = 'held'", [l.id]);
      await run("UPDATE requests SET status = 'expired', resolved_at = ? WHERE listing_id = ? AND status = 'held'", [now, l.id]);
      await run("UPDATE listings SET status = 'closed', reason = ? WHERE id = ? AND status IN ('open','held')", [reason, l.id]);
      for (const h of held.rows) await notify(run, h.buyer_id, 'closed', 'Listing closed', `${slotLabel(l.day, l.meal)}: ${reason}`, now);
    });
  }
  // 3. Wants for meals that started, or that the student now has.
  const wants = await rows('SELECT id, day, meal FROM wants');
  for (const w of wants) if (hasStarted(w.day, w.meal, now)) await exec('DELETE FROM wants WHERE id = ?', [w.id]);
  await exec('DELETE FROM wants WHERE EXISTS (SELECT 1 FROM passes p WHERE p.holder_id = wants.buyer_id AND p.day = wants.day AND p.meal = wants.meal)');
}

/** Checks a day + meal + diet the student chose; throws a readable refusal. */
export async function checkSlot(me, { day, meal, diet }, now) {
  const today = inIST(now).day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) throw refuse('Pick a day.');
  if (day < today || day > shiftDay(today, WINDOW_DAYS - 1)) throw refuse(`Pick a day within the next ${WINDOW_DAYS} days.`);
  if (!MEAL_IDS.includes(meal)) throw refuse('Pick a meal.');
  if (!['veg', 'nonveg'].includes(diet)) throw refuse('Choose veg or non-veg.');
  if (hasStarted(day, meal, now)) throw refuse('That meal has already started.');
  if (diet === 'nonveg') {
    const dish = (await menuForDays(me.mess_id, [day]))[day]?.[meal];
    if (!dish?.nonveg) throw refuse(`${slotLabel(day, meal)} is veg only on this menu.`);
  }
}

const holds = (me, day, meal) => row('SELECT 1 AS x FROM passes WHERE holder_id = ? AND day = ? AND meal = ?', [me.id, day, meal]);

/** Open listings for one meal from coupon students in the student's own year. Seller names stay hidden here. */
export async function browse(me, slot, now) {
  await checkSlot(me, slot, now);
  const have = Boolean(await holds(me, slot.day, slot.meal));
  const listings = have ? [] : (await rows(
    `SELECT l.id, l.price, l.face FROM listings l JOIN accounts s ON s.id = l.seller_id
      WHERE l.status = 'open' AND s.year = ? AND s.plan = 'coupon' AND l.day = ? AND l.meal = ? AND l.diet = ? AND l.seller_id <> ? ORDER BY l.price, l.id`,
    [me.year, slot.day, slot.meal, slot.diet, me.id])).map((l) => ({ id: Number(l.id), price: Number(l.price), face: Number(l.face) }));
  const waiting = await row('SELECT id FROM wants WHERE buyer_id = ? AND day = ? AND meal = ?', [me.id, slot.day, slot.meal]);
  return { have, listings, want: waiting ? Number(waiting.id) : null };
}

/** Coupons the student could put up for sale. */
export async function sellable(me, now) {
  const today = inIST(now).day;
  const list = await rows(
    `SELECT p.id, p.day, p.meal, p.diet, p.price FROM passes p
      WHERE p.holder_id = ? AND p.used_at IS NULL AND p.day >= ?
        AND NOT EXISTS (SELECT 1 FROM listings l WHERE l.pass_id = p.id AND l.status IN ('open','held'))
      ORDER BY p.day, CASE p.meal WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END`, [me.id, today]);
  return list.filter((p) => !hasStarted(p.day, p.meal, now)).map((p) => ({ id: Number(p.id), day: p.day, meal: p.meal, diet: p.diet, price: Number(p.price) }));
}

/** Everything the Bhandar home screen needs for one student. */
export async function mine(me, now) {
  const today = inIST(now).day;
  const listings = await rows(
    `SELECT l.id, l.day, l.meal, l.diet, l.face, l.price, l.status, l.reason,
            r.id AS request_id, r.expires_at, b.full_name AS buyer_name, b.roll AS buyer_roll
       FROM listings l
       LEFT JOIN requests r ON r.listing_id = l.id AND r.status = 'held'
       LEFT JOIN accounts b ON b.id = r.buyer_id
      WHERE l.seller_id = ? AND (l.status IN ('open','held') OR l.id IN (SELECT id FROM listings WHERE seller_id = ? AND status IN ('sold','closed') ORDER BY id DESC LIMIT 4))
      ORDER BY CASE l.status WHEN 'held' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, l.day, l.id`, [me.id, me.id]);
  const requests = await rows(
    `SELECT r.id, r.day, r.meal, r.status, r.expires_at, l.diet, l.price, s.full_name AS seller_name, s.roll AS seller_roll
       FROM requests r JOIN listings l ON l.id = r.listing_id JOIN accounts s ON s.id = l.seller_id
      WHERE r.buyer_id = ? AND (r.status = 'held' OR r.id IN (SELECT id FROM requests WHERE buyer_id = ? ORDER BY id DESC LIMIT 4))
      ORDER BY CASE r.status WHEN 'held' THEN 0 ELSE 1 END, r.id DESC`, [me.id, me.id]);
  const wants = await rows('SELECT id, day, meal, diet FROM wants WHERE buyer_id = ? ORDER BY day, id', [me.id]);
  const have = await rows('SELECT day, meal FROM passes WHERE holder_id = ? AND day >= ?', [me.id, today]);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => shiftDay(today, i));
  const { prices } = await settings();
  return {
    serverNow: now, today, days, prices, menu: await menuForDays(me.mess_id, days),
    holdMinutes: HOLD_MS / 60_000, maxRequests: MAX_REQUESTS,
    listings: listings.map((l) => ({ ...l, id: Number(l.id), face: Number(l.face), price: Number(l.price), request_id: l.request_id ? Number(l.request_id) : null, expires_at: l.expires_at ? Number(l.expires_at) : null })),
    requests: requests.map((r) => ({ ...r, id: Number(r.id), price: Number(r.price), expires_at: Number(r.expires_at) })),
    wants: wants.map((w) => ({ ...w, id: Number(w.id) })),
    holding: have.map((p) => `${p.day}|${p.meal}`),
  };
}

/** Put one or more coupons up for sale: items = [{ passId, price }]. */
export async function postListings(me, items, now) {
  if (!Array.isArray(items) || items.length === 0) throw refuse('Pick at least one coupon to sell.');
  if (items.length > 30) throw refuse('Sell up to 30 coupons at a time.');
  const ids = items.map((i) => Number(i.passId));
  if (new Set(ids).size !== ids.length) throw refuse('A coupon is picked twice.');
  const planned = [];
  for (const item of items) {
    const pass = await row('SELECT * FROM passes WHERE id = ? AND holder_id = ?', [Number(item.passId), me.id]);
    if (!pass) throw refuse('One of those coupons is not in your wallet.', 404);
    const name = slotLabel(pass.day, pass.meal);
    if (pass.used_at) throw refuse(`${name} has been used.`);
    if (hasStarted(pass.day, pass.meal, now)) throw refuse(`${name} has already started.`);
    const price = item.price === undefined || item.price === null || item.price === '' ? Number(pass.price) : Number(item.price);
    if (!Number.isInteger(price) || price < 1) throw refuse(`Enter a price in whole rupees for ${name}.`);
    if (price > Number(pass.price)) throw refuse(`${name} can't be sold above its face value of ₹${pass.price}.`);
    planned.push({ pass, price });
  }
  try {
    await atomically(async (run) => {
      for (const { pass, price } of planned) {
        await run('INSERT INTO listings (pass_id, seller_id, mess_id, day, meal, diet, face, price, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [pass.id, me.id, pass.mess_id, pass.day, pass.meal, pass.diet, pass.price, price, now]);
        const waiting = await run(
          `SELECT w.buyer_id FROM wants w JOIN accounts b ON b.id = w.buyer_id
            WHERE b.year = ? AND b.plan = 'coupon' AND w.day = ? AND w.meal = ? AND w.diet = ? AND w.buyer_id <> ?
             AND NOT EXISTS (SELECT 1 FROM passes p WHERE p.holder_id = w.buyer_id AND p.day = w.day AND p.meal = w.meal)`,
          [me.year, pass.day, pass.meal, pass.diet, me.id]);
        for (const w of waiting.rows) {
          await notify(run, w.buyer_id, 'match', 'A coupon you wanted is up',
            `${slotLabel(pass.day, pass.meal)} (${pass.diet === 'veg' ? 'veg' : 'non-veg'}) for ₹${price}. Open Bhandar to request it.`, now);
        }
      }
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse('One of those coupons is already listed.');
    throw err;
  }
  return planned.length;
}

export async function takeDownListing(me, id) {
  const l = await row('SELECT * FROM listings WHERE id = ? AND seller_id = ?', [Number(id), me.id]);
  if (!l) throw refuse('Listing not found.', 404);
  if (l.status === 'held') throw refuse('Someone has requested it. Decline the request first.');
  if (l.status !== 'open') throw refuse('That listing is already closed.');
  await exec("UPDATE listings SET status = 'closed', reason = 'Taken down by you.' WHERE id = ? AND status = 'open'", [l.id]);
}

export async function addWant(me, slot, now) {
  await checkSlot(me, slot, now);
  if (await holds(me, slot.day, slot.meal)) throw refuse(`You already have ${slotLabel(slot.day, slot.meal).toLowerCase()}.`);
  const count = await row('SELECT COUNT(*) AS n FROM wants WHERE buyer_id = ?', [me.id]);
  if (Number(count.n) >= MAX_WANTS) throw refuse(`You can wait for up to ${MAX_WANTS} meals at a time.`);
  try {
    await exec('INSERT INTO wants (buyer_id, mess_id, day, meal, diet, created_at) VALUES (?,?,?,?,?,?)', [me.id, me.mess_id, slot.day, slot.meal, slot.diet, now]);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse("You're already waiting for that meal.");
    throw err;
  }
}

export async function removeWant(me, id) {
  const done = await exec('DELETE FROM wants WHERE id = ? AND buyer_id = ?', [Number(id), me.id]);
  if (!done.rowsAffected) throw refuse('That is not on your list.', 404);
}

/** The buyer asks for a listing. It is held for them for 30 minutes. */
export async function requestListing(me, listingId, now) {
  const l = await row('SELECT * FROM listings WHERE id = ?', [Number(listingId)]);
  const seller = l ? await row('SELECT year, plan FROM accounts WHERE id = ?', [l.seller_id]) : null;
  if (!l || !seller) throw refuse('That listing is not available.', 404);
  if (seller.year !== me.year || seller.plan !== 'coupon') throw refuse('You can only get coupons from students in your year.');
  if (l.seller_id === me.id) throw refuse("That's your own listing.");
  if (l.status !== 'open') throw refuse(l.status === 'held' ? 'Someone else has just requested it.' : 'That listing is no longer open.');
  if (hasStarted(l.day, l.meal, now)) throw refuse('That meal has already started.');
  if (await holds(me, l.day, l.meal)) throw refuse(`You already have ${slotLabel(l.day, l.meal).toLowerCase()}.`);
  const open = await row("SELECT COUNT(*) AS n FROM requests WHERE buyer_id = ? AND status = 'held'", [me.id]);
  if (Number(open.n) >= MAX_REQUESTS) throw refuse(`You can have ${MAX_REQUESTS} open requests at a time. Cancel one first.`);
  try {
    await atomically(async (run) => {
      const held = await run("UPDATE listings SET status = 'held' WHERE id = ? AND status = 'open'", [l.id]);
      if (!held.rowsAffected) throw refuse('Someone else has just requested it.');
      await run('INSERT INTO requests (listing_id, buyer_id, day, meal, created_at, expires_at) VALUES (?,?,?,?,?,?)', [l.id, me.id, l.day, l.meal, now, now + HOLD_MS]);
      await notify(run, l.seller_id, 'request', `${me.full_name} wants your coupon`,
        `${slotLabel(l.day, l.meal)} for ₹${l.price}. You have 30 minutes: get paid, then tap "Paid, hand over" in Bhandar.`, now);
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse('You already have an open request for that meal.');
    throw err;
  }
}

/** Decline (seller), cancel (buyer) or "Paid, hand over" (seller). */
export async function resolveRequest(me, id, action, now) {
  const r = await row(
    `SELECT r.*, l.seller_id, l.pass_id, l.price FROM requests r JOIN listings l ON l.id = r.listing_id WHERE r.id = ?`, [Number(id)]);
  if (!r || (r.seller_id !== me.id && r.buyer_id !== me.id)) throw refuse('Request not found.', 404);
  if (r.status !== 'held') throw refuse('That request is already finished.');
  const label = slotLabel(r.day, r.meal);

  if (action === 'decline' || action === 'cancel') {
    const bySeller = action === 'decline';
    if (bySeller && r.seller_id !== me.id) throw refuse('Only the seller can decline.', 403);
    if (!bySeller && r.buyer_id !== me.id) throw refuse('Only the buyer can cancel.', 403);
    await atomically(async (run) => {
      const done = await run("UPDATE requests SET status = ?, resolved_at = ? WHERE id = ? AND status = 'held'", [bySeller ? 'declined' : 'cancelled', now, r.id]);
      if (!done.rowsAffected) throw refuse('That request is already finished.');
      await run("UPDATE listings SET status = 'open' WHERE id = ? AND status = 'held'", [r.listing_id]);
      if (bySeller) await notify(run, r.buyer_id, 'declined', 'Request declined', `${label} is no longer held for you.`, now);
      else await notify(run, r.seller_id, 'cancelled', 'Request cancelled', `${label} is open for sale again.`, now);
    });
    return;
  }
  if (action !== 'paid') throw refuse('Unknown action.');
  if (r.seller_id !== me.id) throw refuse('Only the seller can hand the coupon over.', 403);
  if (r.expires_at <= now) throw refuse('The 30 minutes ran out. The listing is open again.');
  const pass = await row('SELECT * FROM passes WHERE id = ?', [r.pass_id]);
  const buyer = await row('SELECT * FROM accounts WHERE id = ?', [r.buyer_id]);
  await checkHandover(pass, me, buyer, now); // the same checks as giving to a friend
  try {
    await atomically(async (run) => {
      await moveCoupon(run, pass, me, buyer);
      await run("UPDATE listings SET status = 'sold' WHERE id = ?", [r.listing_id]);
      await run("UPDATE requests SET status = 'done', resolved_at = ? WHERE id = ? AND status = 'held'", [now, r.id]);
      await run('DELETE FROM wants WHERE buyer_id = ? AND day = ? AND meal = ?', [buyer.id, r.day, r.meal]);
      await notify(run, buyer.id, 'received', 'Coupon received', `${label} is now in your wallet, handed over by ${me.full_name}.`, now);
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse(`${buyer.full_name} already has that meal.`);
    throw err;
  }
}

export async function reportRequest(me, id, reason, now) {
  const text = String(reason ?? '').trim();
  if (text.length < 5) throw refuse('Tell us what went wrong (a few words).');
  if (text.length > 300) throw refuse('Keep it under 300 characters.');
  const r = await row('SELECT r.id, r.buyer_id, l.seller_id FROM requests r JOIN listings l ON l.id = r.listing_id WHERE r.id = ?', [Number(id)]);
  if (!r || (r.buyer_id !== me.id && r.seller_id !== me.id)) throw refuse('Request not found.', 404);
  const again = await row('SELECT 1 AS x FROM bhandar_reports WHERE request_id = ? AND reporter_id = ?', [r.id, me.id]);
  if (again) throw refuse("You've already reported this one.");
  await exec('INSERT INTO bhandar_reports (request_id, reporter_id, reason, created_at) VALUES (?,?,?,?)', [r.id, me.id, text, now]);
}
