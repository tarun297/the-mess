import { NextResponse } from 'next/server';
import { appNow, settings } from '@/server/db';
import { api, signedIn, refuse } from '@/server/session';
import { admit } from '@/server/entry';

// POST /api/entry/demo-scan -> the demo "pretend scan": checks the student in at THEIR OWN mess.
// Only works while the admin has "Simulated QR scan" switched on (Demo clock page). All the usual
// check-in rules still run (coupon, already served, meal hours); only the code itself is skipped.
export const POST = api(async (request) => {
  const student = await signedIn(request, 'student');
  if (!(await settings()).demoScan) throw refuse('Simulated scanning is switched off. Scan the real QR or type the code.', 403);
  return NextResponse.json(await admit({ student, atMess: student.mess_id, ms: await appNow(), via: 'code' }));
});
