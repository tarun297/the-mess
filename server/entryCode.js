// The code on the screen at each mess entrance. It changes every 30 seconds and is
// different for every mess: an HMAC of (secret, mess, 30-second slice). So a code
// forwarded on WhatsApp dies within a minute, and the server knows WHICH mess you're at.
import { createHmac } from 'node:crypto';
import { MESSES } from './catalog.js';

export const SLICE_MS = 30_000;
const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no O/0 or I/1/L mix-ups
const secret = () => process.env.ENTRY_SECRET || 'the-mess-local-entry-key';

export function entryCode(messId, slice = Math.floor(Date.now() / SLICE_MS)) {
  const digest = createHmac('sha256', secret()).update(`${messId}|${slice}`).digest();
  let code = '';
  for (let i = 0; i < 6; i++) code += LETTERS[digest[i] % LETTERS.length];
  return code;
}

/** Which mess is this code from? Accepts this slice and the one before (for slow typers). */
export function messForCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return null;
  const slice = Math.floor(Date.now() / SLICE_MS);
  return MESSES.find((m) => entryCode(m.id, slice) === code || entryCode(m.id, slice - 1) === code)?.id ?? null;
}

export const msToNextCode = () => SLICE_MS - (Date.now() % SLICE_MS);
export const QR_PREFIX = 'THEMESS:';
