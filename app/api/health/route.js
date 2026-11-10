import { NextResponse } from 'next/server';
import { row } from '@/server/db';

// GET /api/health -> is the app up and can it read the database?
export async function GET() {
  try {
    const { n } = await row('SELECT COUNT(*) AS n FROM accounts');
    return NextResponse.json({ ok: true, accounts: Number(n) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err.message) }, { status: 500 });
  }
}
