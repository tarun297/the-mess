import { NextResponse } from 'next/server';
import { row, exec } from '@/server/db';
import { api, signedIn, refuse } from '@/server/session';

// POST /api/tickets/:id/vote -> "Me too" on someone else's ticket in your mess (tap again to undo).
export const POST = api(async (request, { params }) => {
  const me = await signedIn(request, 'student');
  const { id } = await params;
  const t = await row('SELECT * FROM tickets WHERE id = ?', [Number(id)]);
  if (!t || t.mess_id !== me.mess_id) throw refuse('Ticket not found.', 404);
  if (t.author_id === me.id) throw refuse('You raised this one.');
  const had = await row('SELECT 1 AS x FROM ticket_votes WHERE ticket_id = ? AND account_id = ?', [t.id, me.id]);
  if (had) await exec('DELETE FROM ticket_votes WHERE ticket_id = ? AND account_id = ?', [t.id, me.id]);
  else await exec('INSERT INTO ticket_votes (ticket_id, account_id) VALUES (?,?)', [t.id, me.id]);
  return NextResponse.json({ ok: true, voted: !had });
});
