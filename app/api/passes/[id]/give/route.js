import { NextResponse } from 'next/server';
import { row, appNow, atomically } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { checkHandover, moveCoupon } from '@/server/handover';
import { mealName } from '@/server/catalog';

// POST /api/passes/:id/give { roll } -> hand an unused coupon to a coupon-plan friend in the SAME YEAR
// (boys and girls can share; the coupon moves to their side), before that meal starts, if they don't already have one for it.
export const POST = api(async (request, { params }) => {
  const me = await signedIn(request, 'student');
  const { id } = await params;
  const { roll, check } = await readBody(request);
  if (!roll) throw refuse("Enter your friend's roll number.");

  const pass = await row('SELECT * FROM passes WHERE id = ? AND holder_id = ?', [Number(id), me.id]);
  if (!pass) throw refuse('That coupon is not in your wallet.', 404);
  const friend = await row("SELECT * FROM accounts WHERE roll = ? AND role = 'student'", [String(roll).trim()]);
  if (!friend) throw refuse(`No student has roll number ${roll}.`);
  await checkHandover(pass, me, friend, await appNow());
  // `check: true` only looks the friend up, so the app can ask "Give it to X?" before doing it.
  if (check) return NextResponse.json({ ok: true, to: { name: friend.full_name, roll: friend.roll } });

  try {
    await atomically((run) => moveCoupon(run, pass, me, friend));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw refuse(`${friend.full_name} already has a ${mealName(pass.meal).toLowerCase()} coupon for that day.`);
    throw err;
  }
  return NextResponse.json({ ok: true, to: { name: friend.full_name, roll: friend.roll } });
});
