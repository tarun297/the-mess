# THE MESS. — IIIT Bhubaneswar Mess Management System

**IWT Project** · Tarun Kumar Behera · B423070

**Live app:** _paste your Vercel link here_ · **Password for every demo account:** `demo1234`

THE MESS. runs the daily life of the IIIT Bhubaneswar messes: the weekly menu, buying a week of meal coupons (veg or non-veg, meal by meal), checking in at the mess door with a code that changes every 30 seconds, telling the kitchen exactly how much to cook, feedback that escalates on its own, meal ratings, hygiene inspections by the mess society, and admin control over prices and mess allotment.

It is designed **phone first**: students and the mess team use it on their phones at the counter, so every screen is built for a 390px screen and then widened for laptops.

---

## 1. What each person can do

| Who | What they can do |
| --- | --- |
| **Student, fixed plan** (1st and 2nd years, and 3rd/4th years who chose it) | See their mess and this week's menu, check in from the scanner on Home (scan the QR or type the code), **skip a meal in advance** so the kitchen cooks less, rate meals they ate, raise feedback (optionally hiding their name), "me too" other people's feedback |
| **Student, coupon plan** (3rd and 4th years) | Everything above except skipping, plus: plan and buy next week's coupons meal by meal as **veg or non-veg**, see their coupon wallet with what's on each plate, give an unused coupon to a coupon-plan friend **in their year**, and **swap coupons in Coupon Bhandar** (sell ones they won't use, find one for a specific meal, get alerts on the bell) |
| **Mess staff** (one account per mess) | Show the rotating QR on the entrance screen, check students in by roll number, see how much to cook (veg / non-veg) today and tomorrow, edit their mess's menu, reply to and resolve feedback, see meal ratings |
| **Mess society** | Dashboard of every mess, hygiene **inspections** (one per group: First-year, Main, Coupon; boys and girls together) scored 1–5 per item (low items can be sent to the contractor as an escalated ticket), escalate or resolve any feedback, cook-for check for any mess |
| **Admin** (hostel office) | Manage students (year, gender, plan → the mess is recomputed), edit **coupon prices, weekly minimum and escalation time**, and a **demo clock** for showing every time-based rule live |

## 2. How the mess works (business rules)

**Mess allotment** is computed by the server, never chosen by hand (`server/allotment.js`):

| Year | Plan | Mess |
| --- | --- | --- |
| 1st | Fixed | First-Year Mess (boys and girls together) |
| 2nd | Fixed | Main Mess · Boys / Girls |
| 3rd / 4th | Fixed | Main Mess · Boys / Girls |
| 3rd / 4th | Coupon | Coupon Mess · Boys / Girls |

3rd and 4th years choose fixed or coupon; the admin can still change anyone's plan.

**Menu.** Each meal has dishes everyone gets, plus an optional veg dish and an optional non-veg dish (e.g. *Roti, rice, dal* + *Paneer masala* or *Egg curry*). A meal with no non-veg dish is veg only.

**Only two menus exist** (`server/menu.js`, `menuOwner`): **Menu A** is the First-Year Mess. **Menu B** is shared by Main Mess Boys, Main Mess Girls, Coupon Mess Boys and Coupon Mess Girls, so staff at any of those four edit the same menu (the edit screen says so). Menu A is Menu B with a few dishes changed. They are stored under the ids `FY` and `MAIN-B` in the `menu` table.

**Coupons** (`server/passRules.js`):
- Meals: breakfast ₹20 (7:00–9:00), lunch ₹55 (12:00–14:00), dinner ₹44 (19:00–21:00). Prices are admin settings.
- A coupon is good for **one meal on one date**, and is either **veg or non-veg**. Non-veg can only be bought for meals that have a non-veg dish.
- Sales open **Saturday 00:00 – Sunday 23:59** IST for the next Monday–Sunday. **Grace period:** still open on Monday until dinner; Monday meals that have started are locked.
- The week must add up to at least **4 full days of meals (₹476)**, in any mix. Maximum 7 full days (₹833). One purchase per week. **No refunds** for unused coupons.
- **Sharing rule** (`server/handover.js`, used by giving to a friend *and* by Coupon Bhandar): coupons can only move between **coupon-plan students of the same year**. Boys and girls can share; if the receiver is on the other side (Boys ↔ Girls), the coupon moves to their side. Otherwise: "You can only give coupons to students in your year."
- An unused coupon can be **given to a friend** like that before the meal starts, if they don't already have that meal. The app looks the friend up and asks for confirmation first.

**Coupon Bhandar** (`server/bhandar.js`, screen `/bhandar`, coupon plan only; fixed-plan students get a 403):
- **Sell:** pick one or many unused coupons for meals that haven't started (a date-range shortcut helps when someone is travelling). The price starts at face value and **can't go above it**. People waiting for exactly that meal (day, meal, veg/non-veg, same year) get a bell alert.
- **Look:** pick day + meal + veg/non-veg. Only listings from coupon students **in your year** show (boys and girls together), and meals you already hold are switched off. If nothing is listed, **Notify me** saves a "want" and you're alerted when it appears.
- **Request:** the buyer requests a listing and it is **held for that buyer for 30 minutes**. The seller is alerted, and only then do the two see each other's name and roll number. The seller taps **Paid, hand over**, which uses the same transfer code and checks as giving a coupon to a friend (`server/handover.js`). Decline, cancel or the 30 minutes running out puts the listing back to open.
- **Rules:** listings close when the meal starts, or the coupon is used or goes elsewhere. One open request per buyer per meal, at most 3 open requests per buyer, at most 10 "notify me" waits. A listing holds one coupon, and one coupon can have only one live listing.
- **Payment is outside the app.** The screens say so ("Pay when you meet, or after you see Coupon received") and there is a **Report** button on every deal; reports are stored in `bhandar_reports`.
- **Alerts** are in-app only: a bell with an unread count in the top bar and a list (new matching listing, request received, coupon received, request declined or expired).

**Check-in** (`server/entryCode.js`, `server/entry.js`) lives on the Home screen (the old Check in tab and `/entry` now redirect there; the ⓘ pill explains how it works):
- The entrance screen shows a 6-character code and a QR that **change every 30 seconds**. The code is an HMAC of a secret, the mess and the 30-second window, so a code forwarded on WhatsApp stops working, and each mess has its own code (the server knows which door you're at).
- Checks, in order: right mess → (coupon plan) has a coupon for this meal → not already served.
- Results: *Enjoy your meal* (with **Serve VEG / NON-VEG · dish** for the counter) · *Wrong mess* · *No coupon for this meal* · *Already served*.
- Using a coupon is a single conditional `UPDATE … WHERE used_at IS NULL`, so two scans at the same moment can't both succeed.

**Feedback** (`server/tickets.js`): Open → Acknowledged (staff must reply) → Resolved. The society can escalate to the contractor. **Anything still open or acknowledged after 48 hours escalates automatically** (the time is an admin setting). The author can reopen a resolved ticket once, which restarts the clock.

**Ratings:** only students who checked in for a meal can rate it, once, with 1–5 stars and quick comment chips.

**Skipping (fixed plan):** up to 7 days ahead, until the meal starts. The cook-for count drops by one. If they turn up anyway, they still eat and the skip is cancelled.

**Inspections:** six items (kitchen, storage, water, staff hygiene, serving area, taste) scored 1–5, total out of 30: 24+ Good, 18–23 OK, under 18 Poor.

---

## 3. Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | **Next.js 15** (App Router) + **React 19**, plain JavaScript | A page per screen, file-based routing |
| State | **Redux Toolkit** + **RTK Query** | Signed-in account, the coupon basket, toasts; RTK Query caches every API call and refetches after changes |
| Backend | **Node.js API route handlers** in Next.js (`app/api/**/route.js`) | A REST API on Node.js in the same project and deployment |
| Database | **SQLite via libSQL** — a local file (`themess.db`) on a laptop, **Turso** (hosted SQLite) online | Plain SQL, nothing to install |
| Auth | **bcrypt** password hashes + **JWT** in an **httpOnly cookie** (`jose`) | Page scripts can't read the token, which protects it from XSS |
| Styling | One hand-written stylesheet (`app/globals.css`) with design tokens; fonts bundled with `@fontsource` | No UI kit, works offline |
| QR | `qrcode` draws the entrance QR, `jsqr` reads it from the phone camera | Works on Android, iPhone and laptops |
| Installable | Web app manifest + a minimal service worker | Students can "Add to home screen" |

### Architecture

```
Phone / laptop (React pages + Redux store)
   │  fetch /api/...   (RTK Query)
   ▼
Next.js on Node.js
   ├─ middleware.js          → sends each role to its own screens
   └─ app/api/**/route.js    → REST API: checks the role, enforces every rule
         │
         ▼
   server/  (rules: passRules, allotment, entry, entryCode, tickets, time, menu)
         │  SQL
         ▼
   SQLite (themess.db) / Turso
```

The planner shows hints like "Add ₹57 more", but **every rule is enforced again on the server**. A request sent with Postman or a modified browser is still rejected.

### Where Redux is used
- `store/accountSlice.js` — the signed-in account, filled automatically when `/session` answers (via `extraReducers` matchers).
- `store/basketSlice.js` — the coupon planner's basket: which meals are picked and veg or non-veg, with reducers for toggling, presets ("Full week", "Copy last week", "Non-veg where possible") and a memoised selector (`createSelector`). It survives going to the review page and back.
- `store/toastSlice.js` — pop-up confirmations.
- `store/api.js` — RTK Query: every endpoint, with **cache tags** so that, for example, buying coupons refreshes the wallet and home screen automatically.

---

## 4. Run it on your laptop

Needs **Node.js 18.18 or newer** (`node -v` to check).

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database file and all demo data are created automatically on the first visit. To start again with fresh demo data: stop the app (Ctrl + C), run `npm run db:reset`, then `npm run dev`.

### Demo accounts (password `demo1234`)

| Login | Who |
| --- | --- |
| `tarun@iiit-bh.demo` or `B423070` | Student, 4th year, coupon plan, Coupon Mess · Boys |
| `nishchal@iiit-bh.demo` (`B522041`) | **Coupon buying demo.** Student, 4th year, coupon plan, Coupon Mess · Boys. The sale is always open for this account (it behaves as if it's Saturday when the real sale is closed); every other rule still applies. His coupons and Bhandar rows are cleared at each login |
| `saniya@iiit-bh.demo` (`B525027`) | Student, 1st year, girl, First-Year Mess (Menu A) |
| `soham@iiit-bh.demo` (`B524018`) | Student, 2nd year, fixed plan, Main Mess · Boys (try skipping a meal) |
| `naina@iiit-bh.demo` (`B523044`) | Student, 3rd year, coupon plan, Coupon Mess · Girls (a different year from Tarun, so sharing with him is blocked) |
| `staff.cpnb@iiit-bh.demo` | Mess staff, Coupon Mess · Boys (also `staff.fy`, `staff.mainb`, `staff.maing`, `staff.cpng`) |
| `society@iiit-bh.demo` | Mess society |
| `admin@iiit-bh.demo` | Admin (hostel office) |

The login page has **"Show demo accounts"** for one-tap logins.

### Demo clock
Coupon sales only open at weekends, so the admin's **Demo clock** has one-tap jumps: *Saturday 11 AM* (sales open), *next Monday 10 AM* (grace period), *Wednesday* (closed), and *today breakfast / lunch / dinner* (check-in). A strip shows on every screen while the clock is moved. "Back to real time" turns it off. The admin can also allow check-in outside meal hours so a live demo always works.

### Camera scanning
Phone cameras only work on **https** pages (or `localhost` on the same laptop). On your laptop, scanning works with the laptop camera. To scan from a phone, use the deployed https link.

---

## 5. Put it online (Vercel + Turso, both free)

1. **Push to GitHub.** Create an empty repository, then in this folder:
   ```bash
   git init
   git add .
   git commit -m "THE MESS. mess management system"
   git branch -M main
   git remote add origin https://github.com/<your-username>/the-mess.git
   git push -u origin main
   ```
2. **Create the database on Turso.** Sign up at turso.tech → *Create database* → copy the **database URL** (`libsql://…`) and create an **auth token**.
3. **Deploy on Vercel.** vercel.com → *Add New → Project* → import the repository. Under *Environment Variables* add:

   | Name | Value |
   | --- | --- |
   | `TURSO_DATABASE_URL` | the `libsql://…` URL |
   | `TURSO_AUTH_TOKEN` | the token |
   | `SESSION_SECRET` | any long random string |
   | `ENTRY_SECRET` | another long random string |

   Click **Deploy**. Tables and demo data are created on the first visit.
4. Open `https://<your-app>.vercel.app/api/health` — it should show `{"ok":true,…}`. Then log in with a demo account.

Without the Turso variables the app still runs on Vercel, but on a temporary database that resets whenever Vercel restarts, so use Turso for the link you submit.

---

## 6. REST API

All routes are under `/api`. Errors come back as `{ "error": "message" }` with the right HTTP status (400 rule broken, 401 not logged in, 403 wrong role, 404 not found, 409 duplicate).

| Method and path | Who | Does |
| --- | --- | --- |
| `POST /session` · `GET /session` · `DELETE /session` | public · signed in · anyone | Log in (email or roll number) · who am I · log out |
| `GET /student/today` | student | Everything the home screen shows |
| `GET /menu?mess=` · `PUT /menu` | signed in · staff | Weekly menu · edit your menu: Menu A for First-Year Mess, Menu B for the four Main and Coupon messes (shared dishes, veg dish, non-veg dish) |
| `GET /passes/sale` | coupon student | Sale status, week, locked meals, prices, that week's menu, last week's picks |
| `POST /passes/purchase` | coupon student | Buy `{ picks: [{ day, meal, diet }] }` — all rules checked, one transaction |
| `GET /passes?week=` | coupon student | Wallet: coupons with what's on each plate, and gift history |
| `POST /passes/:id/give` | coupon student | Give a coupon `{ roll }`; with `check: true` only looks the friend up |
| `GET /bhandar` | coupon student | Your listings (with the buyer once they request), your requests, your waiting list, meals you already hold |
| `GET /bhandar/browse?day=&meal=&diet=` | coupon student | Open listings for one meal in **your** mess (seller names hidden) |
| `GET /bhandar/sellable` | coupon student | Your unused, upcoming, unlisted coupons |
| `POST /bhandar/listings` · `DELETE /bhandar/listings/:id` | coupon student | List coupons `{ items: [{ passId, price }] }` (price ≤ face value) · take down an open listing |
| `POST /bhandar/wants` · `DELETE /bhandar/wants/:id` | coupon student | "Notify me" for `{ day, meal, diet }` · stop waiting |
| `POST /bhandar/requests` | coupon student | Request a listing `{ listingId }`: held for you 30 minutes |
| `PATCH /bhandar/requests/:id` | coupon student | `{ action: 'decline' | 'paid' }` (seller) or `'cancel'` (buyer); `paid` moves the coupon |
| `POST /bhandar/requests/:id/report` | coupon student | Report a problem with the other person `{ reason }` |
| `GET /notifications` · `POST /notifications/read` | coupon student | Bell: latest 30 alerts + unread count · mark one or all read |
| `POST /skips` | fixed-plan student | Skip or un-skip a meal `{ day, meal, skip }` |
| `POST /entry` | student | Check in with the entrance code `{ code }` |
| `GET /entry/screen` | staff | Live code, meal on now, served count, latest check-ins |
| `POST /entry/counter` | staff | Check a student in by roll number |
| `GET /kitchen?mess=` | staff, society, admin | Cook-for counts (veg / non-veg) today and tomorrow |
| `GET /tickets` · `POST /tickets` | signed in · student | Feedback list (escalates overdue tickets first) · raise feedback |
| `PATCH /tickets/:id` | staff, society, author | Move a ticket with a note |
| `POST /tickets/:id/vote` | student | Toggle "me too" |
| `POST /ratings` · `GET /ratings/summary` | student · staff, society, admin | Rate a meal you ate · weekly averages and comments |
| `GET /inspections?mess=` · `POST /inspections` | society, admin, staff · society | Inspection history of that mess's group (First-year / Main / Coupon) · save an inspection |
| `GET /overview` | society, admin | Every mess at a glance |
| `GET /admin/students` · `PATCH /admin/students/:id` | admin | List · change year, gender or plan (mess recomputed) |
| `GET /admin/rules` · `PUT /admin/rules` | admin | Prices, weekly minimum, escalation hours |
| `GET /admin/clock` · `PUT /admin/clock` | admin | Demo clock |
| `GET /health` | public | Health check |

---

## 7. Database

Tables in `server/schema.js`; demo data in `server/sampleData.js`.

| Table | Stores | Key constraint |
| --- | --- | --- |
| `messes` | The 5 messes | |
| `accounts` | Students, staff, society, admin | `email`, `roll` unique |
| `config` | Prices, minimum days, escalation hours, demo clock | |
| `menu` | The two weekly menus (`FY` = Menu A, `MAIN-B` = Menu B): shared dishes, veg dish, non-veg dish | `(mess_id, weekday, meal)` primary key |
| `purchases` | One coupon purchase per week | `UNIQUE(account_id, week)` |
| `passes` | One coupon per meal, veg or non-veg | `UNIQUE(holder_id, day, meal)` |
| `handovers` | Coupons given to friends | |
| `listings` | Coupons put up for sale in Bhandar | `price <= face`; one live listing per coupon (partial unique index) |
| `wants` | "Notify me" waits for one specific meal | `UNIQUE(buyer_id, day, meal)` |
| `requests` | A buyer's 30-minute hold on a listing | one held request per listing, and per buyer per meal (partial unique indexes) |
| `notifications` | The in-app bell | |
| `bhandar_reports` | "Report" on a Bhandar deal | |
| `entries` | Who ate where and when | `UNIQUE(account_id, day, meal)` — no double check-in |
| `skips` | Meals fixed-plan students will skip | `(account_id, day, meal)` primary key |
| `tickets`, `ticket_log`, `ticket_votes` | Feedback, its timeline, "me too" votes | |
| `ratings` | Star ratings | `(account_id, day, meal)` primary key — one per meal |
| `inspections`, `inspection_marks` | Society inspections and per-item scores | |

Buying (purchase + all its coupons), giving a coupon (move + log it) and saving an inspection (inspection + scores + optional ticket) each run inside a **transaction**.

---

## 8. Project structure

```
app/
  login/page.js                 full-screen login with one-tap demo accounts
  (signed-in)/layout.js         shared frame: side rail on laptops, tab bar on phones
  (signed-in)/home, menu, passes, passes/review, passes/wallet, entry, feedback
  (signed-in)/staff/screen, staff/counter, staff/kitchen, staff/menu
  (signed-in)/society, society/inspect
  (signed-in)/admin/students, admin/rules, admin/clock
  api/**/route.js               REST API (Node.js)
components/                     Shell, kit (logo, icons, buttons…), Dishes, Receipt, KitchenView, QrScanner…
server/
  catalog.js                    meals, messes, roles, ticket topics, inspection items
  time.js                       IST date helpers
  passRules.js                  coupon sale window, grace, minimum (pure functions)
  bhandar.js, handover.js       Coupon Bhandar rules; moving a coupon between students (shared with give-to-friend)
  allotment.js                  year + plan + gender → mess
  entryCode.js, entry.js        rotating code, check-in rules, cook-for counts
  tickets.js                    who may move a ticket, auto-escalation
  menu.js                       reading the weekly menu
  session.js                    login cookie, role checks, error handling
  db.js, schema.js, sampleData.js
store/                          Redux store, slices, RTK Query API
public/art/                     illustrations
middleware.js                   page access by role
```

## 9. Design

THE MESS. uses a neo-brutalist style: cream paper with grain, thick ink outlines, hard offset shadows, a tilted sticker logo, Archivo Black headings with Space Grotesk and Inter, and lime, orange and violet accents. There are two tiers: **loud** for students (colour blocks, stickers, checkerboards, food illustrations) and **subtle-bold** for staff, society and admin (thinner lines, white cards, lime only for state). Veg and non-veg use the standard Indian green-dot and red-triangle marks everywhere.

## 10. Ideas for later

Notices from the mess society, menu approval by the society, a real payment gateway, attendance charts over time, and a sound or vibration at the counter for each check-in result.
