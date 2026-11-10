import { NextResponse } from 'next/server';
import { appNow } from '@/server/db';
import { api, signedIn } from '@/server/session';
import { cookFor } from '@/server/entry';
import { inIST, shiftDay } from '@/server/time';
import { MESSES, messTitle } from '@/server/catalog';

// GET /api/kitchen?mess=CPN-B -> how many to cook for today and tomorrow, veg / non-veg,
// and how many have eaten. Staff see their own mess; society and admin pick any.
export const GET = api(async (request) => {
  const me = await signedIn(request, 'staff', 'society', 'admin');
  const asked = request.nextUrl.searchParams.get('mess');
  const mess = me.role === 'staff' ? me.mess_id : MESSES.some((m) => m.id === asked) ? asked : 'CPN-B';
  const today = inIST(await appNow()).day;
  const plan = MESSES.find((m) => m.id === mess).plan;
  return NextResponse.json({
    mess, messTitle: messTitle(mess), plan,
    basis: plan === 'coupon' ? 'coupons sold for each meal' : 'every student allotted to this mess',
    days: [
      { label: 'Today', day: today, meals: await cookFor(mess, today) },
      { label: 'Tomorrow', day: shiftDay(today, 1), meals: await cookFor(mess, shiftDay(today, 1)) },
    ],
  });
});
