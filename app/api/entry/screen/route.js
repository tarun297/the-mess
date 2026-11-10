import { NextResponse } from 'next/server';
import { rows, appNow } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { entryCode, msToNextCode, SLICE_MS, QR_PREFIX } from '@/server/entryCode';
import { mealNow, cookFor } from '@/server/entry';
import { inIST } from '@/server/time';
import { messTitle } from '@/server/catalog';

// GET /api/entry/screen -> the live code for the staff member's mess, the meal on now,
// and how many have come in. The entrance screen asks for this every few seconds.
export const GET = api(async (request) => {
  const staff = await signedIn(request, 'staff');
  const ms = await appNow();
  const t = inIST(ms);
  const now = await mealNow(ms);
  const meal = now.meal?.id;
  const counts = meal ? (await cookFor(staff.mess_id, t.day)).find((c) => c.meal === meal) : null;
  const latest = meal
    ? await rows(
        `SELECT a.full_name, a.roll, e.at, p.diet FROM entries e JOIN accounts a ON a.id = e.account_id
           LEFT JOIN passes p ON p.holder_id = e.account_id AND p.day = e.day AND p.meal = e.meal
          WHERE e.mess_id = ? AND e.day = ? AND e.meal = ? ORDER BY e.at DESC LIMIT 6`,
        [staff.mess_id, t.day, meal],
      )
    : [];
  return NextResponse.json({
    mess: staff.mess_id,
    messTitle: messTitle(staff.mess_id),
    code: entryCode(staff.mess_id),
    qrPrefix: QR_PREFIX,
    msLeft: msToNextCode(),
    sliceMs: SLICE_MS,
    clock: t.clock,
    meal: now.meal ? { id: now.meal.id, name: now.meal.name, opens: now.meal.opens, closes: now.meal.closes, anyHour: now.anyHour } : null,
    next: now.next ? { name: now.next.name, opens: now.next.opens } : null,
    counts,
    latest: latest.map((r) => ({ name: r.full_name, roll: r.roll, clock: inIST(Date.parse(r.at)).clock, diet: r.diet ?? null })),
  });
});
