// Login sessions: a signed token (JWT) in an httpOnly cookie, so page scripts can't read it.
// Passwords are stored as bcrypt hashes, never as plain text.
import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { row } from './db.js';
import { messTitle } from './catalog.js';

export const SESSION_COOKIE = 'themess_session';
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || 'the-mess-local-session-key');

export const issueToken = (account) =>
  new SignJWT({ role: account.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(account.id)).setIssuedAt().setExpirationTime('7d').sign(key());

export async function readToken(token) {
  try {
    return (await jwtVerify(token, key())).payload;
  } catch {
    return null;
  }
}

export const cookieSettings = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

/** What the browser is allowed to know about an account. */
export function profile(a) {
  return {
    id: a.id,
    name: a.full_name,
    email: a.email,
    roll: a.roll,
    role: a.role,
    year: a.year,
    gender: a.gender,
    plan: a.plan,
    mess: a.mess_id,
    messTitle: a.mess_id ? messTitle(a.mess_id) : null,
  };
}

export class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const refuse = (message, status = 400) => new Refusal(status, message);

/** The signed-in account, or a 401/403 refusal. Pass roles to restrict access. */
export async function signedIn(request, ...roles) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await readToken(token) : null;
  const account = claims ? await row('SELECT * FROM accounts WHERE id = ?', [Number(claims.sub)]) : null;
  if (!account) throw refuse('Please log in again.', 401);
  if (roles.length && !roles.includes(account.role)) throw refuse("Your account can't do this.", 403);
  return account;
}

/** Wraps an API handler so refusals and database errors become clean JSON replies. */
export function api(fn) {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof Refusal) return NextResponse.json({ error: err.message }, { status: err.status });
      if (String(err?.message).includes('UNIQUE constraint failed')) {
        return NextResponse.json({ error: 'That already exists.' }, { status: 409 });
      }
      console.error(err);
      return NextResponse.json({ error: 'The server hit a problem. Try again in a moment.' }, { status: 500 });
    }
  };
}

export const readBody = (request) => request.json().catch(() => ({}));
