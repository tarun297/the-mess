// Database tables. UNIQUE and CHECK constraints back up the rules inside the database itself.
export const TABLES = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS messes (
  id    TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  tag   TEXT NOT NULL,
  plan  TEXT NOT NULL CHECK (plan IN ('fixed','coupon'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  roll      TEXT UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('student','staff','society','admin')),
  year      INTEGER CHECK (year BETWEEN 1 AND 4),
  gender    TEXT CHECK (gender IN ('M','F')),
  plan      TEXT CHECK (plan IN ('fixed','coupon')),
  mess_id   TEXT REFERENCES messes(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admin-editable settings, stored as JSON.
CREATE TABLE IF NOT EXISTS config (
  name TEXT PRIMARY KEY,
  json TEXT NOT NULL
);

-- The weekly menu of each mess. weekday: 0 = Monday ... 6 = Sunday.
CREATE TABLE IF NOT EXISTS menu (
  mess_id   TEXT NOT NULL REFERENCES messes(id),
  weekday   INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal      TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  common    TEXT NOT NULL,          -- served to everyone
  veg       TEXT,                   -- the veg pick, if this meal has a choice
  nonveg    TEXT,                   -- the non-veg pick; NULL means the meal is veg only
  edited_by INTEGER REFERENCES accounts(id),
  edited_at TEXT,
  PRIMARY KEY (mess_id, weekday, meal)
);

-- One coupon purchase per student per week.
CREATE TABLE IF NOT EXISTS purchases (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  week       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  receipt    TEXT NOT NULL,
  at         TEXT NOT NULL,
  UNIQUE (account_id, week)
);

-- A pass (coupon) is good for one meal on one day. A student holds at most one per meal slot.
CREATE TABLE IF NOT EXISTS passes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER REFERENCES purchases(id),
  holder_id   INTEGER NOT NULL REFERENCES accounts(id),
  buyer_id    INTEGER NOT NULL REFERENCES accounts(id),
  mess_id     TEXT NOT NULL REFERENCES messes(id),
  day         TEXT NOT NULL,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  price       INTEGER NOT NULL,
  diet        TEXT NOT NULL DEFAULT 'veg' CHECK (diet IN ('veg','nonveg')),
  used_at     TEXT,
  UNIQUE (holder_id, day, meal)
);

CREATE TABLE IF NOT EXISTS handovers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_id     INTEGER NOT NULL REFERENCES passes(id),
  giver_id    INTEGER NOT NULL REFERENCES accounts(id),
  receiver_id INTEGER NOT NULL REFERENCES accounts(id),
  at          TEXT NOT NULL
);

-- Who ate where and when. One entry per student per meal per day.
CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  mess_id    TEXT NOT NULL REFERENCES messes(id),
  day        TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  at         TEXT NOT NULL,
  via        TEXT NOT NULL CHECK (via IN ('code','counter')),
  UNIQUE (account_id, day, meal)
);

CREATE TABLE IF NOT EXISTS tickets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id   INTEGER NOT NULL REFERENCES accounts(id),
  hide_name   INTEGER NOT NULL DEFAULT 0,
  mess_id     TEXT NOT NULL REFERENCES messes(id),
  topic       TEXT NOT NULL CHECK (topic IN ('quality','hygiene','quantity','staff','suggestion','other')),
  meal        TEXT CHECK (meal IN ('breakfast','lunch','dinner')),
  body        TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','acknowledged','resolved','escalated')),
  staff_reply TEXT,
  reopened    INTEGER NOT NULL DEFAULT 0,
  opened_at   TEXT NOT NULL,
  touched_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  state     TEXT NOT NULL,
  actor_id  INTEGER REFERENCES accounts(id),
  remark    TEXT,
  automatic INTEGER NOT NULL DEFAULT 0,
  at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_votes (
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  PRIMARY KEY (ticket_id, account_id)
);

-- Fixed-plan students saying in advance that they will skip a meal (lowers the cook-for count).
CREATE TABLE IF NOT EXISTS skips (
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  mess_id    TEXT NOT NULL REFERENCES messes(id),
  day        TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  at         TEXT NOT NULL,
  PRIMARY KEY (account_id, day, meal)
);

-- Star ratings, one per student per meal they actually ate.
CREATE TABLE IF NOT EXISTS ratings (
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  day        TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  mess_id    TEXT NOT NULL REFERENCES messes(id),
  stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  remark     TEXT,
  at         TEXT NOT NULL,
  PRIMARY KEY (account_id, day, meal)
);

-- Hygiene inspections by the mess society.
CREATE TABLE IF NOT EXISTS inspections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mess_id      TEXT NOT NULL REFERENCES messes(id),
  inspector_id INTEGER NOT NULL REFERENCES accounts(id),
  total        INTEGER NOT NULL,
  remark       TEXT,
  at           TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inspection_marks (
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item          TEXT NOT NULL,
  score         INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  PRIMARY KEY (inspection_id, item)
);

-- ---------- Coupon Bhandar (students swap coupons; the money is handled outside the app) ----------
-- A coupon its holder has put up for sale. One live (open/held) listing per coupon.
CREATE TABLE IF NOT EXISTS listings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pass_id    INTEGER NOT NULL REFERENCES passes(id),
  seller_id  INTEGER NOT NULL REFERENCES accounts(id),
  mess_id    TEXT NOT NULL REFERENCES messes(id),
  day        TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  diet       TEXT NOT NULL CHECK (diet IN ('veg','nonveg')),
  face       INTEGER NOT NULL,
  price      INTEGER NOT NULL CHECK (price >= 1 AND price <= face),
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','held','sold','closed')),
  reason     TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_live_listing_per_pass ON listings (pass_id) WHERE status IN ('open','held');

-- "Notify me": a student waiting for one specific meal.
CREATE TABLE IF NOT EXISTS wants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  buyer_id   INTEGER NOT NULL REFERENCES accounts(id),
  mess_id    TEXT NOT NULL REFERENCES messes(id),
  day        TEXT NOT NULL,
  meal       TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner')),
  diet       TEXT NOT NULL CHECK (diet IN ('veg','nonveg')),
  created_at INTEGER NOT NULL,
  UNIQUE (buyer_id, day, meal)
);

-- A buyer's request for a listing. While 'held' the listing is reserved for that buyer.
CREATE TABLE IF NOT EXISTS requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id  INTEGER NOT NULL REFERENCES listings(id),
  buyer_id    INTEGER NOT NULL REFERENCES accounts(id),
  day         TEXT NOT NULL,
  meal        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','done','declined','cancelled','expired')),
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS one_held_request_per_listing ON requests (listing_id) WHERE status = 'held';
CREATE UNIQUE INDEX IF NOT EXISTS one_held_request_per_buyer_meal ON requests (buyer_id, day, meal) WHERE status = 'held';

-- In-app notifications (the bell).
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);
CREATE INDEX IF NOT EXISTS notifications_by_account ON notifications (account_id, read_at);

-- "Report" on a Bhandar deal; the mess society can look these up.
CREATE TABLE IF NOT EXISTS bhandar_reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES requests(id),
  reporter_id INTEGER NOT NULL REFERENCES accounts(id),
  reason      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS passes_by_slot ON passes (mess_id, day, meal);
CREATE INDEX IF NOT EXISTS entries_by_slot ON entries (mess_id, day, meal);
CREATE INDEX IF NOT EXISTS tickets_by_mess ON tickets (mess_id, state);
`;
