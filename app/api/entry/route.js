import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { messForCode } from '@/server/entryCode';
import { admit } from '@/server/entry';

// POST /api/entry { code } -> a student checks in with the code on the entrance screen.
// The code tells the server which mess the student is standing at.
export const POST = api(async (request) => {
  const student = await signedIn(request, 'student');
  const { code } = await readBody(request);
  if (!code) throw refuse('Type the 6-character code from the entrance screen.');
  const atMess = messForCode(code);
  if (!atMess) {
    return NextResponse.json({ outcome: 'bad_code', headline: 'Code not valid', detail: 'It changes every 30 seconds. Use the one on the screen right now.' });
  }
  return NextResponse.json(await admit({ student, atMess, ms: await appNow(), via: 'code' }));
});
