import { NextResponse } from 'next/server';
import { row, exec, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { MOVES } from '@/server/tickets';
import { TICKET_STATES } from '@/server/catalog';

// PATCH /api/tickets/:id { state, remark } -> move a ticket along, with a note.
export const PATCH = api(async (request, { params }) => {
  const me = await signedIn(request, 'staff', 'society', 'student');
  const { id } = await params;
  const { state, remark } = await readBody(request);
  const t = await row('SELECT * FROM tickets WHERE id = ?', [Number(id)]);
  if (!t) throw refuse('Ticket not found.', 404);
  if (me.role === 'staff' && t.mess_id !== me.mess_id) throw refuse('This is about another mess.', 403);
  if (me.role === 'student' && t.author_id !== me.id) throw refuse('Only the person who raised it can reopen it.', 403);
  if (me.role === 'student' && t.reopened) throw refuse('You can reopen a ticket only once.');
  if (!(MOVES[me.role][t.state] || []).includes(state)) {
    throw refuse(`You can't move it from ${TICKET_STATES[t.state]} to ${TICKET_STATES[state] ?? state}.`);
  }
  const note = String(remark || '').trim();
  if (me.role === 'staff' && note.length < 3) throw refuse('Write a short reply for the student.');
  if (me.role === 'student' && note.length < 3) throw refuse("Say why it isn't fixed.");
  if (note.length > 400) throw refuse('Keep the note under 400 characters.');

  const stamp = new Date(await appNow()).toISOString();
  // Reopening restarts the clock for automatic escalation.
  await exec(
    `UPDATE tickets SET state = ?, staff_reply = ?, touched_at = ?${me.role === 'student' ? ', reopened = 1, opened_at = ?' : ''} WHERE id = ?`,
    me.role === 'student' ? [state, t.staff_reply, stamp, stamp, t.id] : [state, me.role === 'staff' ? note : t.staff_reply, stamp, t.id],
  );
  await exec('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [t.id, state, me.id, note || null, stamp]);
  return NextResponse.json({ ok: true });
});
