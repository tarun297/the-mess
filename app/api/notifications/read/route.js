import { NextResponse } from 'next/server';
import { exec, appNow } from '@/server/db';
import { api, readBody } from '@/server/session';
import { couponStudent } from '@/server/bhandar';

// POST /api/notifications/read { id? } -> mark one alert (or all of yours) as read.
export const POST = api(async (request) => {
  const me = await couponStudent(request);
  const { id } = await readBody(request);
  const now = await appNow();
  if (id) await exec('UPDATE notifications SET read_at = ? WHERE id = ? AND account_id = ? AND read_at IS NULL', [now, Number(id), me.id]);
  else await exec('UPDATE notifications SET read_at = ? WHERE account_id = ? AND read_at IS NULL', [now, me.id]);
  return NextResponse.json({ ok: true });
});
