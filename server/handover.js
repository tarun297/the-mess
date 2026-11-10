// Moving a coupon from one student to another. Used by "give to a friend" and by Coupon Bhandar,
// so both go through exactly the same checks.
// The rule: coupon-plan students of the SAME YEAR only. Boys and girls can share; the coupon then
// moves to the receiver's side (Boys <-> Girls) so each kitchen's count stays right.
import { row } from './db.js';
import { refuse } from './session.js';
import { hasStarted } from './time.js';
import { mealName } from './catalog.js';

/** Throws a refusal unless `pass` (held by `giver`) can go to `friend` right now. */
export async function checkHandover(pass, giver, friend, now) {
  if (!pass || pass.holder_id !== giver.id) throw refuse('That coupon is not in your wallet.', 404);
  if (pass.used_at) throw refuse('That coupon has been used.');
  if (hasStarted(pass.day, pass.meal, now)) throw refuse('That meal has started, so the coupon can no longer be given away.');
  if (!friend) throw refuse('That student was not found.');
  if (friend.id === giver.id) throw refuse("That's your own roll number.");
  if (friend.year !== giver.year) throw refuse('You can only give coupons to students in your year.');
  if (friend.plan !== 'coupon') throw refuse(`${friend.full_name} is on the fixed plan, so can't receive coupons.`);
  const clash = await row('SELECT 1 AS x FROM passes WHERE holder_id = ? AND day = ? AND meal = ?', [friend.id, pass.day, pass.meal]);
  if (clash) throw refuse(`${friend.full_name} already has a ${mealName(pass.meal).toLowerCase()} coupon for that day.`);
}

/** Does the move inside a transaction (`run`). Only works if the coupon is still the giver's and unused. */
export async function moveCoupon(run, pass, giver, friend) {
  const moved = await run('UPDATE passes SET holder_id = ?, mess_id = ? WHERE id = ? AND holder_id = ? AND used_at IS NULL', [friend.id, friend.mess_id, pass.id, giver.id]);
  if (moved.rowsAffected === 0) throw refuse('That coupon is no longer available to give.');
  await run('INSERT INTO handovers (pass_id, giver_id, receiver_id, at) VALUES (?,?,?,?)', [pass.id, giver.id, friend.id, new Date().toISOString()]);
}
