import { NextResponse } from 'next/server';
import { row, exec } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { allowedPlan, allotMess } from '@/server/allotment';
import { messTitle } from '@/server/catalog';

// PATCH /api/admin/students/:id { year?, gender?, plan? } -> the server works out the mess again.
// The browser never sends a mess: it is always computed.
export const PATCH = api(async (request, { params }) => {
  await signedIn(request, 'admin');
  const { id } = await params;
  const s = await row("SELECT * FROM accounts WHERE id = ? AND role = 'student'", [Number(id)]);
  if (!s) throw refuse('Student not found.', 404);
  const b = await readBody(request);
  const year = b.year !== undefined ? Number(b.year) : s.year;
  const gender = b.gender ?? s.gender;
  if (![1, 2, 3, 4].includes(year)) throw refuse('Year must be 1 to 4.');
  if (!['M', 'F'].includes(gender)) throw refuse('Gender must be M or F.');
  const plan = allowedPlan(year, b.plan ?? s.plan);
  const mess = allotMess({ year, plan, gender });
  await exec('UPDATE accounts SET year = ?, gender = ?, plan = ?, mess_id = ? WHERE id = ?', [year, gender, plan, mess, s.id]);
  return NextResponse.json({
    ok: true,
    student: { id: s.id, name: s.full_name, year, gender, plan, mess, messTitle: messTitle(mess) },
    note: b.plan === 'coupon' && plan === 'fixed' ? '1st and 2nd years can only be on the fixed plan.' : null,
  });
});
