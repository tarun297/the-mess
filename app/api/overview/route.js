import { NextResponse } from 'next/server';
import { rows, appNow } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { escalateOverdue } from '@/server/tickets';
import { cookFor } from '@/server/entry';
import { inIST, weekOf } from '@/server/time';
import { MESSES, inspectionVerdict, menuGroupOf } from '@/server/catalog';

// GET /api/overview -> every mess at a glance: students, today's meals, tickets,
// this week's rating and the last inspection. For the mess society and admin.
export const GET = api(async (request) => {
  await signedIn(request, 'society', 'admin');
  await escalateOverdue();
  const day = inIST(await appNow()).day;
  const week = weekOf(day);
  const students = Object.fromEntries((await rows("SELECT mess_id, COUNT(*) AS n FROM accounts WHERE role = 'student' GROUP BY mess_id")).map((r) => [r.mess_id, Number(r.n)]));
  const tickets = await rows('SELECT mess_id, state, COUNT(*) AS n FROM tickets GROUP BY mess_id, state');
  const ratings = Object.fromEntries((await rows("SELECT mess_id, ROUND(AVG(stars), 1) AS avg FROM ratings WHERE day BETWEEN ? AND date(?, '+6 days') GROUP BY mess_id", [week, week])).map((r) => [r.mess_id, Number(r.avg)]));
  const lastInspections = await rows('SELECT mess_id, total, at FROM inspections i WHERE at = (SELECT MAX(at) FROM inspections j WHERE j.mess_id = i.mess_id)');
  const messes = [];
  for (const m of MESSES) {
    const t = { open: 0, acknowledged: 0, escalated: 0, resolved: 0 };
    tickets.filter((r) => r.mess_id === m.id).forEach((r) => { t[r.state] = Number(r.n); });
    // Inspections cover a whole group (boys and girls together), so use the newest one in the group.
    const last = lastInspections.filter((r) => menuGroupOf(m.id).ids.includes(r.mess_id)).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
    messes.push({
      ...m,
      students: students[m.id] ?? 0,
      today: await cookFor(m.id, day),
      tickets: t,
      rating: ratings[m.id] ?? null,
      inspection: last ? { total: Number(last.total), verdict: inspectionVerdict(Number(last.total)), at: last.at } : null,
    });
  }
  return NextResponse.json({ day, messes });
});
