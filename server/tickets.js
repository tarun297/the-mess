// Feedback tickets: who may move a ticket to which state, and automatic escalation.
import { rows, exec, settings, appNow } from './db.js';

//  staff (own mess): open -> acknowledged (with a reply) -> resolved
//  society:          open / acknowledged / resolved -> escalated, escalated -> resolved
//  student (author): resolved -> open, once ("reopen")
export const MOVES = {
  staff: { open: ['acknowledged', 'resolved'], acknowledged: ['resolved'] },
  society: { open: ['escalated'], acknowledged: ['escalated'], resolved: ['escalated'], escalated: ['resolved'] },
  student: { resolved: ['open'] },
  admin: {},
};

/** Tickets still open or only acknowledged after N hours go to the mess society on their own. */
export async function escalateOverdue() {
  const { escalateAfterHours } = await settings();
  const now = await appNow();
  const cutoff = new Date(now - escalateAfterHours * 3600_000).toISOString();
  const overdue = await rows("SELECT id FROM tickets WHERE state IN ('open','acknowledged') AND opened_at < ?", [cutoff]);
  const stamp = new Date(now).toISOString();
  for (const t of overdue) {
    const moved = await exec("UPDATE tickets SET state = 'escalated', touched_at = ? WHERE id = ? AND state IN ('open','acknowledged')", [stamp, t.id]);
    if (moved.rowsAffected) {
      await exec('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, automatic, at) VALUES (?,?,?,?,1,?)',
        [t.id, 'escalated', null, `Not fixed within ${escalateAfterHours} hours, so it went to the mess society automatically.`, stamp]);
    }
  }
  return { escalateAfterHours, now };
}
