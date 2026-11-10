import { NextResponse } from 'next/server';
import { rows, exec, appNow, atomically } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { INSPECTION_ITEMS, MESSES, inspectionVerdict, menuGroupOf } from '@/server/catalog';

// GET /api/inspections?mess=CPN-B -> the checklist and the last 6 inspections of that mess's group
// (First-year, Main, or Coupon: boys and girls are inspected together).
export const GET = api(async (request) => {
  await signedIn(request, 'society', 'admin', 'staff');
  const asked = request.nextUrl.searchParams.get('mess');
  const group = menuGroupOf(MESSES.some((m) => m.id === asked) ? asked : 'CPN-B');
  const mess = group.mess;
  const past = await rows(
    `SELECT i.id, i.total, i.remark, i.at, a.full_name AS inspector FROM inspections i JOIN accounts a ON a.id = i.inspector_id
      WHERE i.mess_id IN (${group.ids.map(() => '?').join(',')}) ORDER BY i.at DESC LIMIT 6`, group.ids);
  const marks = past.length
    ? await rows(`SELECT inspection_id, item, score FROM inspection_marks WHERE inspection_id IN (${past.map(() => '?').join(',')})`, past.map((p) => p.id))
    : [];
  return NextResponse.json({
    mess, messTitle: group.title, items: INSPECTION_ITEMS,
    history: past.reverse().map((p) => ({
      id: p.id, total: Number(p.total), verdict: inspectionVerdict(Number(p.total)), remark: p.remark, at: p.at, inspector: p.inspector,
      marks: Object.fromEntries(marks.filter((m) => m.inspection_id === p.id).map((m) => [m.item, Number(m.score)])),
    })),
  });
});

// POST /api/inspections { mess, marks: { item: 1..5 }, remark?, raiseTicket? }
// -> save an inspection. With raiseTicket, items scored 2 or less become an escalated ticket.
export const POST = api(async (request) => {
  const me = await signedIn(request, 'society');
  const body = await readBody(request);
  const { marks, remark, raiseTicket } = body;
  if (!MESSES.some((m) => m.id === body.mess)) throw refuse('Pick a mess.');
  const mess = menuGroupOf(body.mess).mess; // saved under the group's mess id
  for (const it of INSPECTION_ITEMS) {
    const v = Number(marks?.[it.id]);
    if (!Number.isInteger(v) || v < 1 || v > 5) throw refuse(`Score "${it.name}" from 1 to 5.`);
  }
  const note = String(remark || '').trim();
  if (note.length > 400) throw refuse('Keep the note under 400 characters.');
  const total = INSPECTION_ITEMS.reduce((s, it) => s + Number(marks[it.id]), 0);
  const low = INSPECTION_ITEMS.filter((it) => Number(marks[it.id]) <= 2);
  if (raiseTicket && low.length === 0) throw refuse('Nothing scored 2 or less, so there is nothing to raise.');
  const stamp = new Date(await appNow()).toISOString();

  const ticketId = await atomically(async (run) => {
    const res = await run('INSERT INTO inspections (mess_id, inspector_id, total, remark, at) VALUES (?,?,?,?,?)', [mess, me.id, total, note || null, stamp]);
    const id = Number(res.lastInsertRowid);
    for (const it of INSPECTION_ITEMS) await run('INSERT INTO inspection_marks (inspection_id, item, score) VALUES (?,?,?)', [id, it.id, Number(marks[it.id])]);
    if (!raiseTicket) return null;
    const body = `Inspection found problems: ${low.map((it) => `${it.name} (${marks[it.id]}/5)`).join(', ')}.${note ? ` ${note}` : ''}`;
    const t = await run(
      "INSERT INTO tickets (author_id, hide_name, mess_id, topic, body, state, opened_at, touched_at) VALUES (?,0,?, 'hygiene', ?, 'escalated', ?, ?)",
      [me.id, mess, body.slice(0, 600), stamp, stamp]);
    const tid = Number(t.lastInsertRowid);
    await run('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [tid, 'escalated', me.id, 'Raised from a mess inspection and sent to the contractor.', stamp]);
    return tid;
  });
  return NextResponse.json({ ok: true, total, verdict: inspectionVerdict(total), ticketId }, { status: 201 });
});
