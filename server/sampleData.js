// Sample data for demos, planted the first time the app meets an empty database.
// Every sample account uses the password: demo1234
import bcrypt from 'bcryptjs';
import { MESSES, MENU_GROUPS, MEAL_SLOTS, STARTING_RULES, INSPECTION_ITEMS } from './catalog.js';
import { inIST, weekOf, sevenDays, fromIST, shiftDay } from './time.js';
import { allotMess } from './allotment.js';

export const SAMPLE_PASSWORD = 'demo1234';

// Weekly menu, Monday to Sunday: [breakfast, lunch, dinner].
// Each meal: [shared dishes, veg pick, non-veg pick]. A null non-veg pick = veg-only meal.
export const WEEK_MENU = [
  [['Poha, tea', 'Banana', 'Boiled egg'], ['Rice, dal, aloo bhaja, mixed veg, curd', null, null], ['Roti, rice, dal', 'Paneer masala', 'Egg curry']],
  [['Idli, sambar, coconut chutney, coffee', null, null], ['Rice, dal fry, bhindi fry, papad', null, null], ['Roti, rice, jeera aloo, salad', 'Chole', null]],
  [['Aloo paratha, curd, pickle, tea', null, null], ['Jeera rice, rajma, cabbage fry, curd', null, null], ['Roti, rice, dal', 'Mushroom masala', 'Fish curry']],
  [['Upma, tea', 'Fruit', 'Boiled egg'], ['Rice, dalma, aloo posto, papad', null, null], ['Roti, fried rice', 'Chilli paneer', 'Chilli chicken']],
  [['Puri, ghugni, tea', null, null], ['Rice, sambar, beans poriyal, curd', null, null], ['Roti, rice, kadhai paneer, dal tadka, kheer', null, null]],
  [['Dosa, sambar, chutney, coffee', null, null], ['Veg pulao, raita, dal, aloo gobi', null, null], ['Roti, rice, dal', 'Matar paneer', 'Egg bhurji']],
  [['Chole bhature, tea', null, null], ['Raita, salan', 'Veg biryani', 'Chicken biryani'], ['Roti, rice, mix dal, aloo matar, gulab jamun', null, null]],
];

const BOY_NAMES = ['Aditya', 'Rohan', 'Sourav', 'Abhishek', 'Kunal', 'Debasish', 'Nikhil', 'Pratik', 'Saurabh', 'Ankit', 'Harsh', 'Manas', 'Subham', 'Rakesh', 'Tushar', 'Yash', 'Ayush', 'Sambit', 'Jyoti', 'Bikash'];
const GIRL_NAMES = ['Sneha', 'Pooja', 'Ritika', 'Shreya', 'Ananya', 'Megha', 'Tanvi', 'Swati', 'Kriti', 'Diya', 'Aishwarya', 'Nandini', 'Sonali', 'Pragyan', 'Lipsa', 'Ankita'];
const SURNAMES = ['Mohanty', 'Behera', 'Panda', 'Sahoo', 'Mishra', 'Swain', 'Agarwal', 'Das', 'Nayak', 'Jena', 'Tripathy', 'Pradhan', 'Rout', 'Senapati', 'Dash', 'Patnaik', 'Biswal', 'Sethi', 'Kar', 'Mallick', 'Parida', 'Lenka', 'Hota', 'Barik'];

// Named sample students (also shown as one-tap logins on the login page).
export const NAMED_STUDENTS = [
  { name: 'Tarun K. Behera', email: 'tarun@iiit-bh.demo', roll: 'B423070', year: 4, gender: 'M', plan: 'coupon' }, // Coupon Mess Boys
  { name: 'Nishchal Panda', email: 'nishchal@iiit-bh.demo', roll: 'B522041', year: 4, gender: 'M', plan: 'coupon' }, // always-open buyer, Coupon Mess Boys
  { name: 'Saniya Khan', email: 'saniya@iiit-bh.demo', roll: 'B525027', year: 1, gender: 'F', plan: 'fixed' }, // First-Year Mess
  { name: 'Soham Mishra', email: 'soham@iiit-bh.demo', roll: 'B524018', year: 2, gender: 'M', plan: 'fixed' }, // Main Mess Boys
  { name: 'Naina Sahoo', email: 'naina@iiit-bh.demo', roll: 'B523044', year: 3, gender: 'F', plan: 'coupon' }, // Coupon Mess Girls
];

// Menu A (First-Year Mess) is Menu B with a few dishes changed: [day, meal, [common, veg, non-veg]].
const FIRST_YEAR_CHANGES = [
  [0, 0, ['Upma, tea', 'Banana', 'Boiled egg']],
  [1, 1, ['Rice, dal fry, lauki sabzi, papad', null, null]],
  [2, 2, ['Roti, rice, dal', 'Soya chunk masala', 'Chicken curry']],
  [3, 0, ['Poha, jalebi, tea', 'Fruit', 'Boiled egg']],
  [4, 2, ['Roti, rice, paneer butter masala, dal tadka, kheer', null, null]],
  [5, 0, ['Masala dosa, sambar, chutney, coffee', null, null]],
  [6, 1, ['Raita, mirchi salan', 'Veg biryani', 'Chicken biryani']],
];
export const FIRST_YEAR_MENU = WEEK_MENU.map((day, d) => day.map((meal, m) => FIRST_YEAR_CHANGES.find(([dd, mm]) => dd === d && mm === m)?.[2] ?? meal));

const STAFF = [
  ['Biswajit · First-Year Mess', 'staff.fy@iiit-bh.demo', 'FY'],
  ['Ramesh · Main Mess Boys', 'staff.mainb@iiit-bh.demo', 'MAIN-B'],
  ['Sunita · Main Mess Girls', 'staff.maing@iiit-bh.demo', 'MAIN-G'],
  ['Prakash · Coupon Mess Boys', 'staff.cpnb@iiit-bh.demo', 'CPN-B'],
  ['Lata · Coupon Mess Girls', 'staff.cpng@iiit-bh.demo', 'CPN-G'],
];

/** Repeatable pseudo-random numbers, so the sample data is the same every time. */
function dice(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

export async function plantSampleData(db) {
  const roll = dice(2027);
  const hash = bcrypt.hashSync(SAMPLE_PASSWORD, 8);
  const nowMs = Date.now();
  const today = inIST(nowMs).day;
  const week = sevenDays(weekOf(today));
  const stamp = new Date(nowMs).toISOString();
  const ago = (hours) => new Date(nowMs - hours * 3600_000).toISOString();
  const during = (day, meal) => new Date(fromIST(day, MEAL_SLOTS.find((m) => m.id === meal).opens) + Math.floor(roll() * 110) * 60_000).toISOString();
  const over = (day, meal) => fromIST(day, MEAL_SLOTS.find((m) => m.id === meal).closes) < nowMs;

  const writes = [];
  const add = (sql, args = []) => writes.push({ sql, args });

  for (const m of MESSES) add('INSERT INTO messes (id, title, tag, plan) VALUES (?,?,?,?)', [m.id, m.title, m.tag, m.plan]);
  add('INSERT INTO config (name, json) VALUES (?,?)', ['prices', JSON.stringify(STARTING_RULES.prices)]);
  add('INSERT INTO config (name, json) VALUES (?,?)', ['min_days', JSON.stringify(STARTING_RULES.minDays)]);
  add('INSERT INTO config (name, json) VALUES (?,?)', ['escalate_after_hours', JSON.stringify(STARTING_RULES.escalateAfterHours)]);
  // Only two menus exist: 'FY' is Menu A, 'MAIN-B' is Menu B (shared by Main and Coupon messes, boys and girls).
  for (const [owner, menu] of [['FY', FIRST_YEAR_MENU], ['MAIN-B', WEEK_MENU]]) {
    menu.forEach((day, weekday) =>
      MEAL_SLOTS.forEach((slot, i) => add('INSERT INTO menu (mess_id, weekday, meal, common, veg, nonveg) VALUES (?,?,?,?,?,?)', [owner, weekday, slot.id, ...day[i]])),
    );
  }

  // Students: the named ones, then filler so the counts look like a real mess.
  const students = NAMED_STUDENTS.map((s) => ({ ...s }));
  let serial = 100;
  const fill = (year, gender, plan, count) => {
    for (let i = 0; i < count; i++) {
      serial += 1;
      const r = `B5${26 - year}${String(serial).padStart(3, '0')}`;
      const first = (gender === 'F' ? GIRL_NAMES : BOY_NAMES)[serial % (gender === 'F' ? GIRL_NAMES : BOY_NAMES).length];
      students.push({ name: `${first} ${SURNAMES[(serial * 7) % SURNAMES.length]}`, email: `${r.toLowerCase()}@iiit-bh.demo`, roll: r, year, gender, plan });
    }
  };
  fill(1, 'M', 'fixed', 10); fill(1, 'F', 'fixed', 8);
  fill(2, 'M', 'fixed', 9); fill(2, 'F', 'fixed', 6);
  fill(3, 'M', 'fixed', 5); fill(4, 'F', 'fixed', 4);
  fill(3, 'M', 'coupon', 8); fill(4, 'M', 'coupon', 6);
  fill(3, 'F', 'coupon', 5); fill(4, 'F', 'coupon', 4);

  let nextId = 0;
  for (const s of students) {
    s.id = ++nextId;
    s.mess = allotMess(s);
    add(`INSERT INTO accounts (id, full_name, email, roll, pass_hash, role, year, gender, plan, mess_id)
         VALUES (?,?,?,?,?, 'student', ?,?,?,?)`, [s.id, s.name, s.email, s.roll, hash, s.year, s.gender, s.plan, s.mess]);
  }
  const staffId = {};
  for (const [name, email, mess] of STAFF) {
    staffId[mess] = ++nextId;
    add("INSERT INTO accounts (id, full_name, email, pass_hash, role, mess_id) VALUES (?,?,?,?, 'staff', ?)", [nextId, name, email, hash, mess]);
  }
  const societyId = ++nextId;
  add("INSERT INTO accounts (id, full_name, email, pass_hash, role) VALUES (?,?,?,?, 'society')", [societyId, 'Ishaan · Mess Society', 'society@iiit-bh.demo', hash]);
  add("INSERT INTO accounts (id, full_name, email, pass_hash, role) VALUES (?,?,?,?, 'admin')", [++nextId, 'Hostel Office', 'admin@iiit-bh.demo', hash]);

  // This week's passes for coupon students, "bought last weekend".
  const prices = STARTING_RULES.prices;
  const floor = (prices.breakfast + prices.lunch + prices.dinner) * STARTING_RULES.minDays;
  let purchaseId = 0;
  let passId = 0;
  // Coupon Bhandar demo: tomorrow (or the last day of the week) is the day we stage.
  const todayIdx = week.indexOf(today);
  const demoDay = week[Math.min(todayIdx + 1, 6)];
  const demoDay2 = week[Math.min(todayIdx + 2, 6)];
  // Same-year coupon students who will sell tomorrow's lunch; Tarun and Naina lack that meal so they can shop for it.
  const peer4 = students.find((x) => x.plan === 'coupon' && x.year === 4 && x.roll !== 'B423070' && x.roll !== 'B522041');
  const peer3 = students.find((x) => x.plan === 'coupon' && x.year === 3 && x.roll !== 'B523044');
  const keep = (s, day, meal) => !((s.roll === 'B423070' || s.roll === 'B523044') && day === demoDay && meal === 'lunch');
  const passAt = new Map(); // 'roll|day|meal' -> { id, diet }
  for (const s of students.filter((x) => x.plan === 'coupon')) {
    const picks = [];
    week.forEach((day, i) => {
      for (const slot of MEAL_SLOTS) {
        const take = (s === peer4 || s === peer3) && day === demoDay && slot.id === 'lunch' ? true : s.roll === 'B423070' || s.roll === 'B522041'
          ? slot.id !== 'breakfast' || i % 2 === 0
          : slot.id === 'breakfast' ? roll() < 0.35 : roll() < 0.75;
        const nonvegOk = Boolean(WEEK_MENU[i][MEAL_SLOTS.indexOf(slot)][2]);
        if (take) picks.push({ day, meal: slot.id, diet: nonvegOk && roll() < 0.5 ? 'nonveg' : 'veg' });
      }
    });
    picks.splice(0, picks.length, ...picks.filter((p) => keep(s, p.day, p.meal)));
    let amount = picks.reduce((sum, p) => sum + prices[p.meal], 0);
    for (const day of week) {
      if (amount >= floor) break;
      for (const slot of MEAL_SLOTS) {
        if (keep(s, day, slot.id) && !picks.some((p) => p.day === day && p.meal === slot.id)) {
          picks.push({ day, meal: slot.id, diet: 'veg' });
          amount += prices[slot.id];
        }
      }
    }
    purchaseId += 1;
    add('INSERT INTO purchases (id, account_id, week, amount, receipt, at) VALUES (?,?,?,?,?,?)', [purchaseId, s.id, week[0], amount, `TM-${4200 + purchaseId}`, ago(72)]);
    for (const p of picks) {
      passId += 1;
      passAt.set(`${s.roll}|${p.day}|${p.meal}`, { id: passId, diet: p.diet });
      const usedAt = over(p.day, p.meal) && roll() < 0.85 ? during(p.day, p.meal) : null;
      add('INSERT INTO passes (id, purchase_id, holder_id, buyer_id, mess_id, day, meal, price, diet, used_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [passId, purchaseId, s.id, s.id, s.mess, p.day, p.meal, prices[p.meal], p.diet, usedAt]);
      if (usedAt) add("INSERT INTO entries (account_id, mess_id, day, meal, at, via) VALUES (?,?,?,?,?, 'code')", [s.id, s.mess, p.day, p.meal, usedAt]);
    }
  }

  // Coupon Bhandar demo. Coupons are shared only between coupon students of the SAME YEAR.
  // Tarun (4th year) sees a 4th-year listing and has his own; Naina (3rd year) sees a 3rd-year one.
  {
    const stillAhead = (day, meal) => fromIST(day, MEAL_SLOTS.find((m) => m.id === meal).opens) > nowMs;
    const byRoll = (r) => students.find((x) => x.roll === r);
    const listing = (st, day, meal, price) => {
      const p = st && passAt.get(`${st.roll}|${day}|${meal}`);
      if (!p || !stillAhead(day, meal)) return null;
      add("INSERT INTO listings (pass_id, seller_id, mess_id, day, meal, diet, face, price, status, created_at) VALUES (?,?,?,?,?,?,?,?, 'open', ?)",
        [p.id, st.id, st.mess, day, meal, p.diet, prices[meal], price, nowMs - 20 * 60_000]);
      return p;
    };
    const wait = (st, p, listedBy) => {
      if (!p) return;
      add('INSERT INTO wants (buyer_id, mess_id, day, meal, diet, created_at) VALUES (?,?,?,?,?,?)', [st.id, st.mess, demoDay, 'lunch', p.diet, nowMs - 3600_000]);
      add('INSERT INTO notifications (account_id, kind, title, body, link, created_at) VALUES (?,?,?,?,?,?)',
        [st.id, 'match', 'A coupon you wanted is up', `Lunch on ${demoDay} for ₹50. Open Bhandar to request it.`, '/bhandar', nowMs - 20 * 60_000]);
    };
    wait(byRoll('B423070'), listing(peer4, demoDay, 'lunch', 50));
    wait(byRoll('B523044'), listing(peer3, demoDay, 'lunch', 50));
    listing(byRoll('B423070'), demoDay2 === demoDay ? week[Math.min(todayIdx + 3, 6)] : demoDay2, 'dinner', 40);
  }

  // Fixed-plan students: past meals this week.
  for (const s of students.filter((x) => x.plan === 'fixed')) {
    for (const day of week) {
      for (const slot of MEAL_SLOTS) {
        if (over(day, slot.id) && roll() < 0.7) {
          add("INSERT INTO entries (account_id, mess_id, day, meal, at, via) VALUES (?,?,?,?,?, 'code')", [s.id, s.mess, day, slot.id, during(day, slot.id)]);
        }
      }
    }
  }

  // Some fixed-plan students have said they'll skip upcoming meals.
  for (const s of students.filter((x) => x.plan === 'fixed')) {
    for (const day of [today, shiftDay(today, 1)]) {
      for (const slot of MEAL_SLOTS) {
        if (!over(day, slot.id) && roll() < 0.12) add('INSERT INTO skips (account_id, mess_id, day, meal, at) VALUES (?,?,?,?,?)', [s.id, s.mess, day, slot.id, stamp]);
      }
    }
  }

  // Ratings for some meals already eaten.
  for (const s of students) {
    for (const day of week) {
      for (const slot of MEAL_SLOTS) {
        if (over(day, slot.id) && roll() < 0.18) {
          const stars = 2 + Math.floor(roll() * 4);
          const remark = roll() < 0.25 ? (stars >= 4 ? 'Loved it, more of this please.' : stars === 3 ? 'Okay, but the rotis were cold.' : 'Dal was watery today.') : null;
          add('INSERT OR IGNORE INTO ratings (account_id, day, meal, mess_id, stars, remark, at) VALUES (?,?,?,?,?,?,?)',
            [s.id, day, slot.id, s.mess, stars, remark, stamp]);
        }
      }
    }
  }

  // Complaints, in every state. The first is 3 days old and still open, so it escalates on its own.
  const who = (roll) => students.find((s) => s.roll === roll);
  const tickets = [
    { by: who('B525027'), hide: 1, topic: 'hygiene', meal: 'lunch', body: 'Plates at the counter were still wet and smelled of soap. Please dry them properly.', state: 'open', hoursAgo: 72 },
    { by: who('B522041'), hide: 0, topic: 'quantity', meal: 'dinner', body: 'Paneer pieces in dinner were very few, and the second helping of dal ran out by 8:15.', state: 'acknowledged', reply: 'Noted. We will increase the quantity from this week.', hoursAgo: 20 },
    { by: who('B524018'), hide: 0, topic: 'quality', meal: 'breakfast', body: 'Idli was undercooked on Tuesday, sticky in the middle.', state: 'resolved', reply: 'Steamer timing fixed. Thanks for flagging.', hoursAgo: 40 },
    { by: who('B523044'), hide: 0, topic: 'staff', meal: 'lunch', body: 'Counter closed 15 minutes before 2 PM twice this week.', state: 'escalated', hoursAgo: 60 },
    { by: who('B423070'), hide: 0, topic: 'suggestion', meal: 'dinner', body: 'Could we get dalma with dinner on Thursdays too? It runs out fast at lunch.', state: 'open', hoursAgo: 5 },
  ];
  tickets.forEach((t, i) => {
    const id = i + 1;
    const opened = ago(t.hoursAgo);
    add(`INSERT INTO tickets (id, author_id, hide_name, mess_id, topic, meal, body, state, staff_reply, opened_at, touched_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [id, t.by.id, t.hide, t.by.mess, t.topic, t.meal, t.body, t.state, t.reply ?? null, opened, opened]);
    add('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [id, 'open', t.by.id, 'Raised', opened]);
    if (t.state === 'acknowledged' || t.state === 'resolved') {
      add('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [id, t.state, staffId[t.by.mess], t.reply, ago(t.hoursAgo - 4)]);
    }
    if (t.state === 'escalated') {
      add('INSERT INTO ticket_log (ticket_id, state, actor_id, remark, at) VALUES (?,?,?,?,?)', [id, 'escalated', societyId, 'Happened twice. Raised with the contractor.', ago(t.hoursAgo - 10)]);
    }
  });
  students.slice(8, 14).forEach((s) => add('INSERT INTO ticket_votes (ticket_id, account_id) VALUES (?,?)', [1, s.id]));

  // Past inspections, a few per mess.
  let inspectionId = 0;
  for (const m of MENU_GROUPS) { // inspections are per group: First-year, Main, Coupon
    for (let k = 5; k >= 1; k--) {
      inspectionId += 1;
      const scores = INSPECTION_ITEMS.map(() => 2 + Math.floor(roll() * 4));
      const total = scores.reduce((a, b) => a + b, 0);
      add('INSERT INTO inspections (id, mess_id, inspector_id, total, remark, at) VALUES (?,?,?,?,?,?)',
        [inspectionId, m.mess, societyId, total, null, new Date(fromIST(shiftDay(today, -k * 6), '11:00')).toISOString()]);
      INSPECTION_ITEMS.forEach((it, i) => add('INSERT INTO inspection_marks (inspection_id, item, score) VALUES (?,?,?)', [inspectionId, it.id, scores[i]]));
    }
  }

  await db.batch(writes, 'write');
}
