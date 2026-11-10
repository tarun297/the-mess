import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { row, atomically, settings } from '@/server/db';
import { api, signedIn, refuse, readBody, issueToken, cookieSettings, SESSION_COOKIE, profile } from '@/server/session';
import { ALWAYS_OPEN_BUYER } from '@/server/passRules';

// GET /api/session -> who is signed in, and whether the demo clock is moved.
export const GET = api(async (request) => {
  const account = await signedIn(request);
  const { clockShiftMs, demoScan } = await settings();
  return NextResponse.json({ account: profile(account), demoClock: clockShiftMs !== 0, demoScan });
});

// POST /api/session { login: email or roll number, password } -> sign in.
export const POST = api(async (request) => {
  const { login, password } = await readBody(request);
  if (!login || !password) throw refuse('Enter your email or roll number, and your password.');
  const id = String(login).trim();
  const account = await row('SELECT * FROM accounts WHERE email = ? OR roll = ?', [id, id]);
  if (!account || !bcrypt.compareSync(String(password), account.pass_hash)) {
    throw refuse("That email or roll number and password don't match.", 401);
  }
  // The always-open demo buyer starts with an empty wallet every time.
  if (account.email.toLowerCase() === ALWAYS_OPEN_BUYER) {
    await atomically(async (run) => {
      const mine = 'SELECT id FROM passes WHERE holder_id = ? OR buyer_id = ?';
      const myListings = `SELECT id FROM listings WHERE seller_id = ? OR pass_id IN (${mine})`;
      const myRequests = `SELECT id FROM requests WHERE buyer_id = ? OR listing_id IN (${myListings})`;
      const L = [account.id, account.id, account.id];
      // Listings that were held for him go back on sale.
      await run("UPDATE listings SET status = 'open' WHERE status = 'held' AND id IN (SELECT listing_id FROM requests WHERE buyer_id = ? AND status = 'held')", [account.id]);
      await run(`DELETE FROM bhandar_reports WHERE request_id IN (${myRequests})`, [account.id, ...L]);
      await run(`DELETE FROM requests WHERE id IN (${myRequests})`, [account.id, ...L]);
      await run(`DELETE FROM listings WHERE id IN (${myListings})`, L);
      await run('DELETE FROM wants WHERE buyer_id = ?', [account.id]);
      await run(`DELETE FROM handovers WHERE pass_id IN (${mine})`, [account.id, account.id]);
      await run('DELETE FROM passes WHERE holder_id = ? OR buyer_id = ?', [account.id, account.id]);
      await run('DELETE FROM purchases WHERE account_id = ?', [account.id]);
    });
  }
  const res = NextResponse.json({ account: profile(account) });
  res.cookies.set(SESSION_COOKIE, await issueToken(account), cookieSettings);
  return res;
});

// DELETE /api/session -> sign out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieSettings, maxAge: 0 });
  return res;
}
