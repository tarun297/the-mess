// Runs before each page: signed-out visitors go to /login, and each role stays in its own area.
// The API checks roles again on every request; this only keeps navigation tidy.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const HOME = { student: '/home', staff: '/staff/screen', society: '/society', admin: '/admin/students' };
const AREAS = [
  ['/home', ['student']],
  ['/passes', ['student']],
  ['/bhandar', ['student']],
  ['/staff', ['staff']],
  ['/society', ['society']],
  ['/admin', ['admin']],
];

async function roleOf(request) {
  const token = request.cookies.get('themess_session')?.value;
  if (!token) return null;
  try {
    const key = new TextEncoder().encode(process.env.SESSION_SECRET || 'the-mess-local-session-key');
    return (await jwtVerify(token, key)).payload.role;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const role = await roleOf(request);
  if (pathname === '/login') return role ? NextResponse.redirect(new URL(HOME[role], request.url)) : NextResponse.next();
  if (!role) return NextResponse.redirect(new URL('/login', request.url));
  if (pathname === '/' || pathname === '/entry') return NextResponse.redirect(new URL(HOME[role], request.url)); // check-in now lives on Home
  const area = AREAS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area && !area[1].includes(role)) return NextResponse.redirect(new URL(HOME[role], request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next|art|favicon.ico|icon.svg|manifest.webmanifest|sw.js|app-).*)'] };
