import { NextResponse } from 'next/server';
import { row, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { admit } from '@/server/entry';

// POST /api/entry/counter { roll } -> staff check a student in by roll number (no phone, dead battery…).
export const POST = api(async (request) => {
  const staff = await signedIn(request, 'staff');
  const { roll } = await readBody(request);
  if (!roll) throw refuse('Type a roll number.');
  const student = await row("SELECT * FROM accounts WHERE roll = ? AND role = 'student'", [String(roll).trim()]);
  if (!student) return NextResponse.json({ outcome: 'unknown', headline: 'No such student', detail: `Nobody has roll number ${roll}.` });
  return NextResponse.json(await admit({ student, atMess: staff.mess_id, ms: await appNow(), via: 'counter' }));
});
