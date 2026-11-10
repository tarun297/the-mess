import { NextResponse } from 'next/server';
import { rows, row, appNow } from '@/server/db';
import { api } from '@/server/session';
import { couponStudent, sweep } from '@/server/bhandar';

// GET /api/notifications -> your latest 30 alerts and how many are unread (the bell).
export const GET = api(async (request) => {
  const me = await couponStudent(request);
  await sweep(await appNow());
  const list = await rows('SELECT id, kind, title, body, link, created_at, read_at FROM notifications WHERE account_id = ? ORDER BY id DESC LIMIT 30', [me.id]);
  const unread = await row('SELECT COUNT(*) AS n FROM notifications WHERE account_id = ? AND read_at IS NULL', [me.id]);
  return NextResponse.json({ unread: Number(unread.n), list: list.map((n) => ({ ...n, id: Number(n.id), created_at: Number(n.created_at), read_at: n.read_at ? Number(n.read_at) : null })) });
});
