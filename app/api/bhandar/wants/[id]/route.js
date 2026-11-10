import { NextResponse } from 'next/server';
import { api } from '@/server/session';
import { couponStudent, removeWant } from '@/server/bhandar';

// DELETE /api/bhandar/wants/:id -> stop waiting.
export const DELETE = api(async (request, { params }) => {
  const me = await couponStudent(request);
  const { id } = await params;
  await removeWant(me, id);
  return NextResponse.json({ ok: true });
});
