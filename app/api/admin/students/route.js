import { NextResponse } from 'next/server';
import { rows } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { messTitle } from '@/server/catalog';

// GET /api/admin/students -> every student with year, gender, plan and their computed mess.
export const GET = api(async (request) => {
  await signedIn(request, 'admin');
  const list = await rows("SELECT id, full_name, email, roll, year, gender, plan, mess_id FROM accounts WHERE role = 'student' ORDER BY year, roll");
  return NextResponse.json({
    students: list.map((s) => ({ id: s.id, name: s.full_name, email: s.email, roll: s.roll, year: s.year, gender: s.gender, plan: s.plan, mess: s.mess_id, messTitle: messTitle(s.mess_id) })),
    perMess: list.reduce((acc, s) => ({ ...acc, [s.mess_id]: (acc[s.mess_id] ?? 0) + 1 }), {}),
  });
});
