import { NextResponse } from 'next/server';
import { rows, row, exec, appNow } from '@/server/db';
import { api, signedIn, refuse, readBody } from '@/server/session';
import { escalateOverdue } from '@/server/tickets';
import { TICKET_TOPICS, MEAL_IDS, messTitle } from '@/server/catalog';

// GET /api/tickets -> feedback you can see: students and staff see their own mess;
// the society and admin see every mess. Overdue tickets are escalated first.
export const GET = api(async (request) => {
  const me = await signedIn(request);
  const { escalateAfterHours, now } = await escalateOverdue();
  const ownMess = me.role === 'student' || me.role === 'staff';
  const list = await rows(
    `SELECT t.*, a.full_name AS author, a.roll AS author_roll,
            (SELECT COUNT(*) FROM ticket_votes v WHERE v.ticket_id = t.id) AS votes,
            (SELECT COUNT(*) FROM ticket_votes v WHERE v.ticket_id = t.id AND v.account_id = ?) AS my_vote
       FROM tickets t JOIN accounts a ON a.id = t.author_id
      ${ownMess ? 'WHERE t.mess_id = ?' : ''}
      ORDER BY CASE t.state WHEN 'escalated' THEN 0 WHEN 'open' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END, t.opened_at DESC`,
    ownMess ? [me.id, me.mess_id] : [me.id],
  );
  const ids = list.map((t) => t.id);
  const log = ids.length
    ? await rows(`SELECT l.*, a.full_name AS actor, a.role AS actor_role FROM ticket_log l LEFT JOIN accounts a ON a.id = l.actor_id
                   WHERE l.ticket_id IN (${ids.map(() => '?').join(',')}) ORDER BY l.at, l.id`, ids)
    : [];

  const tickets = list.map((t) => {
    const mine = t.author_id === me.id;
    const hidden = Boolean(t.hide_name) && me.role === 'student' && !mine; // staff and society still see who wrote it
    return {
      id: t.id, topic: t.topic, meal: t.meal, body: t.body, state: t.state, reply: t.staff_reply,
      mess: t.mess_id, messTitle: messTitle(t.mess_id), openedAt: t.opened_at, touchedAt: t.touched_at,
      anonymous: Boolean(t.hide_name), author: hidden ? 'Anonymous' : t.author, authorRoll: hidden ? null : t.author_roll,
      mine, votes: Number(t.votes), myVote: Number(t.my_vote) > 0, canReopen: mine && t.state === 'resolved' && !t.reopened,
      dueAt: ['open', 'acknowledged'].includes(t.state) ? Date.parse(t.opened_at) + escalateAfterHours * 3600_000 : null,
      log: log.filter((l) => l.ticket_id === t.id).map((l) => ({
        state: l.state, remark: l.remark, at: l.at, automatic: Boolean(l.automatic),
        by: l.automatic ? 'THE MESS.' : l.actor_role === 'student' && hidden ? 'Anonymous' : l.actor,
      })),
    };
  });
  return NextResponse.json({ tickets, escalateAfterHours, serverNow: now, topics: TICKET_TOPICS });
});

// POST /api/tickets { topic, meal?, body, anonymous? } -> a student raises feedback about their mess.
export const POST = api(async (request) => {
  const me = await signedIn(request, 'student');
  const { topic, meal, body, anonymous } = await readBody(request);
  if (!TICKET_TOPICS.some((t) => t.id === topic)) throw refuse('Pick what it is about.');
  if (meal && !MEAL_IDS.includes(meal)) throw refuse('Pick a real meal.');
  const text = String(body || '').trim();
  if (text.length < 10) throw refuse('Tell us a little more (at least 10 characters).');
  if (text.length > 600) throw refuse('Keep it under 600 characters.');
  const stamp = new Date(await appNow()).toISOString();
  const res = await exec(
    'INSERT INTO tickets (author_id, hide_name, mess_id, topic, meal, body, state, opened_at, touched_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [me.id, anonymous ? 1 : 0, me.mess_id, topic, meal || null, text, 'open', stamp, stamp],
  );
  const id = Number(res.lastInsertRowid);
  await exec('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [id, 'open', me.id, 'Raised', stamp]);
  return NextResponse.json({ ok: true, ticket: await row('SELECT id, state FROM tickets WHERE id = ?', [id]) }, { status: 201 });
});
