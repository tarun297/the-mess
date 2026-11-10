import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent, reportRequest } from '@/server/bhandar';

// POST /api/bhandar/requests/:id/report { reason } -> report a problem with the other person in a deal.
export const POST = api(async (request, { params }) => {
  const me = await couponStudent(request);
  const { id } = await params;
  const { reason } = await readBody(request);
  await reportRequest(me, id, reason, await appNow());
  return NextResponse.json({ ok: true });
});
