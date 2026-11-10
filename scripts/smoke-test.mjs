// Smoke test: starts its own copy of the built app on port 3999 with a throwaway database
// (smoke-test.db, deleted afterwards), then checks the important rules through the real API.
// It never touches themess.db. Run:  npm run build   then   npm run test:smoke
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const PORT = 3999;
const BASE = `http://localhost:${PORT}/api`;
const DB = 'smoke-test.db';
const dropDb = () => ['', '-wal', '-shm', '-journal'].forEach((x) => rmSync(DB + x, { force: true }));

if (!existsSync('.next/BUILD_ID')) {
  console.log('There is no production build yet. Stop `npm run dev`, run `npm run build`, then run this again.');
  process.exit(1);
}

let passed = 0;
const failed = [];
const section = (name) => console.log(`\n${name}`);
const check = (name, ok, detail = '') => {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`); } else { failed.push(name); console.log(`  ✗ ${name}${detail ? `  <- ${detail}` : ''}`); }
};
const brief = (r) => `${r.status} ${JSON.stringify(r.json).slice(0, 140)}`;

async function login(who, password = 'demo1234') {
  const id = who.includes('@') || /^B\d/.test(who) ? who : `${who}@iiit-bh.demo`;
  const res = await fetch(`${BASE}/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: id, password }) });
  const json = await res.json().catch(() => ({}));
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const call = async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { cookie, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };
  call.me = json.account;
  call.status = res.status;
  return call;
}

const dayPlus = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

async function run() {
  // ---------- start ----------
  section('Start-up');
  const admin = await login('admin');
  check('admin can log in', admin.status === 200);
  const clock = await admin('PUT', '/admin/clock', { jump: 'lunch' });
  check('demo clock jumps to lunch time (so meal-hour rules can be tested)', clock.status === 200 && clock.json.clock === '12:30', brief(clock));

  // ---------- accounts & allotment ----------
  section('Logins and mess allotment');
  const tarun = await login('tarun'), soham = await login('soham'), saniya = await login('saniya'), naina = await login('naina');
  const staffCpn = await login('staff.cpnb'), staffMainG = await login('staff.maing'), staffFy = await login('staff.fy'), society = await login('society');
  const expect = [[tarun, 4, 'coupon', 'CPN-B'], [soham, 2, 'fixed', 'MAIN-B'], [saniya, 1, 'fixed', 'FY'], [naina, 3, 'coupon', 'CPN-G']];
  for (const [c, year, plan, mess] of expect) check(`${c.me?.name}: year ${year}, ${plan} plan, ${mess}`, c.me?.year === year && c.me?.plan === plan && c.me?.mess === mess, JSON.stringify(c.me));
  const wrong = await login('tarun', 'wrong-password');
  check('wrong password is refused (401)', wrong.status === 401);
  const anon = await fetch(`${BASE}/student/today`);
  check('not logged in -> 401 on a student page API', anon.status === 401);
  for (const old of ['arjun', 'neha', 'priya', 'riya']) check(`${old}@ no longer exists`, (await login(old)).status === 401);

  // ---------- role guards ----------
  section('Who may do what');
  check('fixed-plan student cannot use Bhandar (403)', (await soham('GET', '/bhandar')).status === 403);
  check('fixed-plan student cannot see coupons (403)', (await saniya('GET', '/passes')).status === 403);
  check('student cannot open admin data (403)', (await tarun('GET', '/admin/students')).status === 403);
  check('coupon student cannot skip meals', (await tarun('POST', '/skips', { day: dayPlus(clock.json.day, 1), meal: 'lunch', skip: true })).status === 400);

  // ---------- menus ----------
  section('Menus: only two exist');
  const edit = await staffCpn('PUT', '/menu', { weekday: 0, meal: 'lunch', common: 'Rice, dal, smoke test dish', veg: null, nonveg: null });
  check('staff at Coupon Boys can edit Menu B', edit.status === 200, brief(edit));
  const seenByMainG = (await staffMainG('GET', '/menu')).json.week?.[0]?.lunch?.common;
  check('Main Girls staff see the same edit (shared menu)', seenByMainG === 'Rice, dal, smoke test dish', seenByMainG);
  const fyWeek = (await staffFy('GET', '/menu')).json.week;
  const mainWeek = (await staffMainG('GET', '/menu')).json.week;
  check('First-Year (Menu A) was not changed by that edit', fyWeek?.[0]?.lunch?.common !== 'Rice, dal, smoke test dish');
  check('Menu A differs from Menu B (Tuesday lunch)', fyWeek?.[1]?.lunch?.common !== mainWeek?.[1]?.lunch?.common, `${fyWeek?.[1]?.lunch?.common} / ${mainWeek?.[1]?.lunch?.common}`);
  check('a non-veg dish without a veg dish is refused', (await staffCpn('PUT', '/menu', { weekday: 0, meal: 'lunch', common: 'Rice, dal', veg: null, nonveg: 'Egg curry' })).status === 400);
  check('society cannot edit menus (403)', (await society('PUT', '/menu', { weekday: 0, meal: 'lunch', common: 'Rice, dal' })).status === 403);

  // ---------- sharing rule ----------
  section('Sharing coupons: same year, coupon plan only');
  let nishchal = await login('nishchal');
  const mine = (await tarun('GET', '/passes')).json.passes?.filter((p) => p.canGive) ?? [];
  check('Tarun has coupons he can give', mine.length >= 3, `${mine.length}`);
  const p1 = mine[0];
  const toNish = await tarun('POST', `/passes/${p1.id}/give`, { roll: 'B522041' });
  check('Tarun -> Nishchal (same year) works', toNish.status === 200, brief(toNish));
  const nishHas = (await nishchal('GET', `/passes?week=${p1.day}`)).json.passes?.some((p) => p.day === p1.day && p.meal === p1.meal);
  check('the coupon is now in Nishchal\'s wallet', nishHas === true);
  const toNaina = await tarun('POST', `/passes/${mine[1].id}/give`, { roll: 'B523044' });
  check('Tarun -> Naina (different year) is blocked with the year message', toNaina.status === 400 && /in your year/.test(toNaina.json.error ?? ''), brief(toNaina));
  const toSoham = await tarun('POST', `/passes/${mine[1].id}/give`, { roll: 'B524018' });
  check('Tarun -> Soham (2nd year, fixed plan) is blocked', toSoham.status === 400, brief(toSoham));
  check('giving to yourself is blocked', (await tarun('POST', `/passes/${mine[1].id}/give`, { roll: 'B423070' })).status === 400);
  check('giving a coupon you no longer hold is refused', (await tarun('POST', `/passes/${p1.id}/give`, { roll: 'B522041' })).status === 404);
  const girl4 = (await admin('GET', '/admin/students')).json.students?.find((s) => s.year === 4 && s.gender === 'F' && s.plan === 'coupon');
  const girl = await login(girl4.email);
  const hers = new Set((await girl('GET', '/passes')).json.passes.map((p) => `${p.day}|${p.meal}`));
  const forGirl = mine.slice(1).find((p) => !hers.has(`${p.day}|${p.meal}`));
  const toGirl = await tarun('POST', `/passes/${forGirl.id}/give`, { roll: girl4.roll });
  check('boys can share with girls of the same year (4th-year girl)', toGirl.status === 200, brief(toGirl));

  // ---------- buying coupons ----------
  section('Buying coupons (Nishchal, whose sale is always open)');
  nishchal = await login('nishchal'); // logging in empties his wallet again
  const sale = (await nishchal('GET', '/passes/sale')).json;
  check('sale is open for Nishchal and his wallet starts empty', sale.status === 'open' && (await nishchal('GET', `/passes?week=${sale.forWeek}`)).json.passes.length === 0);
  const taruSale = (await tarun('GET', '/passes/sale')).json;
  if (taruSale.status === 'shut') check('Tarun cannot buy while the sale is shut', (await tarun('POST', '/passes/purchase', { picks: [{ day: sale.days[0], meal: 'lunch', diet: 'veg' }] })).status === 400);
  const few = sale.days.slice(0, 2).map((day) => ({ day, meal: 'lunch', diet: 'veg' }));
  const tooFew = await nishchal('POST', '/passes/purchase', { picks: few });
  check('a basket below the weekly minimum is refused', tooFew.status === 400 && /at least/i.test(JSON.stringify(tooFew.json)), brief(tooFew));
  const vegOnly = sale.days.flatMap((day) => ['breakfast', 'lunch', 'dinner'].map((meal) => ({ day, meal }))).find((s) => !sale.menu[s.day]?.[s.meal]?.nonveg);
  const nonvegBad = await nishchal('POST', '/passes/purchase', { picks: [{ day: vegOnly.day, meal: vegOnly.meal, diet: 'nonveg' }] });
  check('non-veg on a veg-only meal is refused', nonvegBad.status === 400, brief(nonvegBad));
  const full = sale.days.flatMap((day) => ['lunch', 'dinner'].map((meal) => ({ day, meal, diet: 'veg' })));
  const bought = await nishchal('POST', '/passes/purchase', { picks: full });
  check('a valid week of lunches and dinners is bought', bought.status === 201 || bought.status === 200, brief(bought));
  check('he now holds 14 coupons', (await nishchal('GET', `/passes?week=${sale.forWeek}`)).json.passes.length === 14);
  check('a second purchase in the same week is refused', (await nishchal('POST', '/passes/purchase', { picks: full })).status === 400);

  // ---------- Coupon Bhandar ----------
  section('Coupon Bhandar');
  const nMine = (await naina('GET', '/bhandar')).json;
  const want = nMine.wants?.[0];
  if (want) {
    const seen = (await naina('GET', `/bhandar/browse?day=${want.day}&meal=${want.meal}&diet=${want.diet}`)).json;
    check('Naina (3rd year) sees the 3rd-year listing she was waiting for', seen.listings?.length >= 1, JSON.stringify(seen));
    const lid = seen.listings[0].id;
    const cross = await tarun('POST', '/bhandar/requests', { listingId: lid });
    check('Tarun (4th year) cannot request a 3rd-year listing', cross.status === 400 && /your year/.test(cross.json.error ?? ''), brief(cross));
    const ask = await naina('POST', '/bhandar/requests', { listingId: lid });
    check('Naina requests it: held for her', ask.status === 200, brief(ask));
    const second = await saniya('POST', '/bhandar/requests', { listingId: lid });
    check('a held listing cannot be requested by someone else', second.status !== 200);
    const req = (await naina('GET', '/bhandar')).json.requests?.find((r) => r.status === 'held');
    check('the seller\'s name is shown to the buyer only after requesting', Boolean(req?.seller_name));
    const cancel = await naina('PATCH', `/bhandar/requests/${req.id}`, { action: 'cancel' });
    check('buyer can cancel; listing reopens', cancel.status === 200 && (await naina('GET', `/bhandar/browse?day=${want.day}&meal=${want.meal}&diet=${want.diet}`)).json.listings.some((l) => l.id === lid), brief(cancel));
  } else console.log('  (skipped: no staged Naina listing today)');

  const sell = (await tarun('GET', '/bhandar/sellable')).json.passes;
  const q = sell.find((p) => p.price > 1);
  const over = await tarun('POST', '/bhandar/listings', { items: [{ passId: q.id, price: q.price + 1 }] });
  check('a price above face value is refused', over.status === 400, brief(over));
  const posted = await tarun('POST', '/bhandar/listings', { items: [{ passId: q.id, price: q.price - 1 }] });
  check('Tarun lists a coupon below face value', posted.status === 200, brief(posted));
  check('listing the same coupon twice is refused', (await tarun('POST', '/bhandar/listings', { items: [{ passId: q.id, price: q.price - 1 }] })).status === 400);
  const find = async (c) => (await c('GET', `/bhandar/browse?day=${q.day}&meal=${q.meal}&diet=${q.diet}`)).json;
  const forNish = await find(nishchal);
  check('Nishchal (same year) can see it, without the seller\'s name', forNish.listings?.length >= 1 && !JSON.stringify(forNish).includes('Behera'), JSON.stringify(forNish));
  const nishAsk = await nishchal('POST', '/bhandar/requests', { listingId: forNish.listings[0].id });
  check('Nishchal requests it', nishAsk.status === 200, brief(nishAsk));
  const tHeld = (await tarun('GET', '/bhandar')).json.listings.find((l) => l.status === 'held');
  check('Tarun now sees who asked (name and roll)', tHeld?.buyer_name === 'Nishchal Panda' && tHeld?.buyer_roll === 'B522041', JSON.stringify(tHeld));
  check('the other year cannot see this listing', ((await find(naina)).listings ?? []).length === 0 || (await find(naina)).have === true);
  check('only the seller can hand over', (await nishchal('PATCH', `/bhandar/requests/${tHeld.request_id}`, { action: 'paid' })).status === 403);
  check('a held listing cannot be taken down', (await tarun('DELETE', `/bhandar/listings/${tHeld.id}`)).status === 400);
  const paid = await tarun('PATCH', `/bhandar/requests/${tHeld.request_id}`, { action: 'paid' });
  check('"Paid, hand over" moves the coupon', paid.status === 200, brief(paid));
  const nishNow = (await nishchal('GET', `/passes?week=${q.day}`)).json.passes.some((p) => p.day === q.day && p.meal === q.meal);
  check('the coupon is in Nishchal\'s wallet', nishNow);
  check('handing over twice is refused', (await tarun('PATCH', `/bhandar/requests/${tHeld.request_id}`, { action: 'paid' })).status === 400);
  const note = (await nishchal('GET', '/notifications')).json;
  check('Nishchal got a "Coupon received" alert', note.list?.some((n) => n.title === 'Coupon received'));
  await nishchal('POST', '/notifications/read', {});
  check('"mark all read" clears the bell', (await nishchal('GET', '/notifications')).json.unread === 0);

  // ---------- check-in ----------
  section('Check-in (meal hours are simulated at 12:30)');
  const screen = (await staffCpn('GET', '/entry/screen')).json;
  check('entrance screen shows a 6-character code', /^[A-Z0-9]{6}$/.test(screen.code ?? ''));
  const typed = await tarun('POST', '/entry', { code: screen.code });
  check('Tarun checks in with the right mess code', ['in', 'already'].includes(typed.json.outcome), brief(typed));
  check('checking in twice says already served', (await tarun('POST', '/entry', { code: screen.code })).json.outcome === 'already');
  check('Naina (other mess) with the Coupon Boys code -> wrong mess', (await naina('POST', '/entry', { code: screen.code })).json.outcome === 'wrong_mess');
  check('a made-up code is refused', (await tarun('POST', '/entry', { code: 'ZZZZZZ' })).json.outcome === 'bad_code');
  const noPass = await nishchal('POST', '/entry', { code: screen.code });
  check('a coupon student with no coupon for today gets "no coupon"', noPass.json.outcome === 'no_pass', brief(noPass));
  const rated = await tarun('POST', '/ratings', { meal: 'lunch', stars: 5 });
  const ratedTwice = await tarun('POST', '/ratings', { meal: 'lunch', stars: 4 });
  check('after eating, a meal can be rated, once', [200, 201].includes(rated.status) || ratedTwice.status === 400 || ratedTwice.status === 409, `${rated.status}/${ratedTwice.status}`);
  check('simulated QR scan works for a fixed-plan student', ['in', 'already'].includes((await saniya('POST', '/entry/demo-scan')).json.outcome));
  await admin('PUT', '/admin/clock', { demoScan: false });
  check('with the admin switch off, simulated scanning is refused (403)', (await saniya('POST', '/entry/demo-scan')).status === 403);
  await admin('PUT', '/admin/clock', { demoScan: true });
  check('a staff account cannot use the simulated scan (403)', (await staffCpn('POST', '/entry/demo-scan')).status === 403);
  const counter = await staffCpn('POST', '/entry/counter', { roll: 'B522041' });
  check('staff can check a student in by roll number', counter.status === 200 && Boolean(counter.json.outcome), brief(counter));

  // ---------- skips ----------
  section('Skipping meals (fixed plan)');
  const tomorrow = dayPlus(clock.json.day, 1);
  const skip = await soham('POST', '/skips', { day: tomorrow, meal: 'lunch', skip: true });
  check('Soham skips tomorrow\'s lunch', skip.status === 200 && skip.json.skipped === true, brief(skip));
  check('more than 7 days ahead is refused', (await soham('POST', '/skips', { day: dayPlus(clock.json.day, 9), meal: 'lunch', skip: true })).status === 400);
  check('he can undo it', (await soham('POST', '/skips', { day: tomorrow, meal: 'lunch', skip: false })).json.skipped === false);

  // ---------- feedback ----------
  section('Feedback tickets');
  check('a too-short complaint is refused', (await tarun('POST', '/tickets', { topic: 'quality', body: 'bad' })).status === 400);
  const ticket = await tarun('POST', '/tickets', { topic: 'quality', meal: 'lunch', body: 'The dal was cold at lunch today.' });
  const tid = ticket.json.ticket?.id;
  check('Tarun raises feedback', ticket.status === 201 && tid, brief(ticket));
  check('staff must write a reply to acknowledge', (await staffCpn('PATCH', `/tickets/${tid}`, { state: 'acknowledged' })).status === 400);
  check('staff acknowledge with a reply', (await staffCpn('PATCH', `/tickets/${tid}`, { state: 'acknowledged', remark: 'Checking with the kitchen.' })).status === 200);
  check('staff of another mess cannot touch it (403)', (await staffMainG('PATCH', `/tickets/${tid}`, { state: 'resolved', remark: 'Done' })).status === 403);
  check('society escalates it to the contractor', (await society('PATCH', `/tickets/${tid}`, { state: 'escalated' })).status === 200);

  // ---------- inspections ----------
  section('Inspections (First-year, Main, Coupon groups)');
  const form = (await society('GET', '/inspections?mess=CPN-G')).json;
  const boysView = (await society('GET', '/inspections?mess=CPN-B')).json;
  check('boys and girls share one Coupon inspection history', JSON.stringify(form.history.map((h) => h.id)) === JSON.stringify(boysView.history.map((h) => h.id)));
  const marks = Object.fromEntries(form.items.map((i) => [i.id, 4]));
  check('a missing score is refused', (await society('POST', '/inspections', { mess: 'CPN-B', marks: { ...marks, [form.items[0].id]: undefined } })).status === 400);
  check('a score above 5 is refused', (await society('POST', '/inspections', { mess: 'CPN-B', marks: { ...marks, [form.items[0].id]: 6 } })).status === 400);
  check('staff cannot save an inspection (403)', (await staffCpn('POST', '/inspections', { mess: 'CPN-B', marks })).status === 403);
  const saved = await society('POST', '/inspections', { mess: 'MAIN-G', marks, remark: 'smoke test' });
  check('society saves a full inspection', saved.status === 201 && saved.json.total === 24, brief(saved));
  check('it shows up for both Main Boys and Main Girls', (await society('GET', '/inspections?mess=MAIN-B')).json.history.some((h) => h.remark === 'smoke test'));

  // ---------- admin ----------
  section('Admin rules and students');
  const rules = (await admin('GET', '/admin/rules')).json;
  const newPrices = { ...rules.prices, lunch: rules.prices.lunch + 1 };
  check('admin changes a meal price', (await admin('PUT', '/admin/rules', { prices: newPrices, minDays: rules.minDays, escalateAfterHours: rules.escalateAfterHours })).status === 200 && (await admin('GET', '/admin/rules')).json.prices.lunch === newPrices.lunch);
  check('an impossible price is refused', (await admin('PUT', '/admin/rules', { prices: { ...rules.prices, lunch: 0 }, minDays: rules.minDays, escalateAfterHours: rules.escalateAfterHours })).status === 400);
  await admin('PUT', '/admin/rules', { prices: rules.prices, minDays: rules.minDays, escalateAfterHours: rules.escalateAfterHours });
  const nainaId = naina.me.id;
  const moved = await admin('PATCH', `/admin/students/${nainaId}`, { year: 2 });
  check('moving Naina to 2nd year forces the fixed plan and a Main mess', moved.json.student?.plan === 'fixed' && moved.json.student?.mess === 'MAIN-G', brief(moved));
  const back = await admin('PATCH', `/admin/students/${nainaId}`, { year: 3, plan: 'coupon' });
  check('and back to 3rd year, coupon -> Coupon Mess Girls', back.json.student?.mess === 'CPN-G');
  check('1st and 2nd years cannot be put on the coupon plan', (await admin('PATCH', `/admin/students/${nainaId}`, { year: 1, plan: 'coupon' })).json.student?.plan === 'fixed');
  await admin('PATCH', `/admin/students/${nainaId}`, { year: 3, plan: 'coupon' });

  await admin('PUT', '/admin/clock', { jump: 'real' });
}

// ---------- boot the app on its own port and run ----------
dropDb();
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  env: { ...process.env, TURSO_DATABASE_URL: `file:${DB}`, NODE_ENV: 'production' },
  stdio: 'ignore',
});
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(`${BASE}/health`)).ok; } catch { await new Promise((r) => setTimeout(r, 500)); }
}
if (!up) {
  console.log(`The app did not start on port ${PORT}. Is something else using it?`);
  stop();
  process.exit(1);
}

try {
  await run();
} catch (err) {
  failed.push('the test run crashed');
  console.log(`\n  ✗ the test run stopped early: ${err.stack || err}`);
} finally {
  stop();
  await new Promise((r) => setTimeout(r, 800));
  dropDb();
}

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) {
  console.log('Failed:\n - ' + failed.join('\n - '));
  process.exit(1);
}
console.log('All good.');
