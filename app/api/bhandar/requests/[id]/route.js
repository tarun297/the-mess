import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent, sweep, resolveRequest } from '@/server/bhandar';

// PATCH /api/bhandar/requests/:id { action: 'decline' | 'cancel' | 'paid' }
//   decline / paid: the seller.  cancel: the buyer.  'paid' moves the coupon (same checks as giving to a friend).
export const PATCH = api(async (request, { params }) => {
  const me = await couponStudent(request);
  const { id } = await params;
  const { action } = await readBody(request);
  const now = await appNow();
  await sweep(now);
  await resolveRequest(me, id, action, now);
  return NextResponse.json({ ok: true });
});
