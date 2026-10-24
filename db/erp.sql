-- PSWS office (the ERP).
--
-- Safe to run more than once: every statement only adds what is missing.
-- Money is kept in paise (bigint) so totals never round. Dates are the
-- calendar date in Pewe (IST). Nothing is ever hard-deleted from the money
-- tables: a wrong entry is cancelled, with a reason, and drops out of totals.

-- ---------------------------------------------------------------- people with access
CREATE TABLE IF NOT EXISTS erp_user (
  id            bigserial PRIMARY KEY,
  name          text        NOT NULL,
  phone         text        NOT NULL UNIQUE,      -- digits with country code, e.g. 919812345678
  role          text        NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  post          text,                             -- e.g. Treasurer, shown beside the name
  password_hash text,                             -- scrypt; empty until they set it from their link
  active        boolean     NOT NULL DEFAULT true,
  failed_logins int         NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    bigint      REFERENCES erp_user(id)
);

CREATE TABLE IF NOT EXISTS erp_session (
  token_hash text        PRIMARY KEY,             -- sha-256 of the cookie; the cookie itself is never stored
  user_id    bigint      NOT NULL REFERENCES erp_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS erp_invite (
  token_hash text        PRIMARY KEY,             -- sha-256 of the link's token
  user_id    bigint      NOT NULL REFERENCES erp_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_by bigint      REFERENCES erp_user(id)
);

-- ---------------------------------------------------------------- numbering
-- One running number per kind per financial year: R/2026-27/0001, P/2026-27/0001.
CREATE TABLE IF NOT EXISTS erp_counter (
  kind    text NOT NULL,
  fy      text NOT NULL,
  last_no int  NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, fy)
);

-- ---------------------------------------------------------------- families helped
CREATE TABLE IF NOT EXISTS erp_family (
  id             bigserial   PRIMARY KEY,
  name           text        NOT NULL,            -- the person the help goes to
  place          text,                            -- wadi or mohalla
  phone          text,
  people         int,                             -- how many in the household
  notes          text,
  stipend_paise  bigint      CHECK (stipend_paise IS NULL OR stipend_paise > 0),
  stipend_active boolean     NOT NULL DEFAULT false,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     bigint      REFERENCES erp_user(id),
  updated_at     timestamptz,
  updated_by     bigint      REFERENCES erp_user(id)
);

CREATE TABLE IF NOT EXISTS erp_request (
  id             bigserial   PRIMARY KEY,
  family_id      bigint      NOT NULL REFERENCES erp_family(id),
  kind           text        NOT NULL CHECK (kind IN ('medical', 'stipend', 'education', 'livelihood', 'emergency', 'other')),
  asked_on       date        NOT NULL,
  asked_paise    bigint      CHECK (asked_paise IS NULL OR asked_paise > 0),
  details        text,
  status         text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'declined', 'done')),
  approved_paise bigint      CHECK (approved_paise IS NULL OR approved_paise > 0),
  decided_on     date,
  decision_note  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     bigint      REFERENCES erp_user(id),
  updated_at     timestamptz,
  updated_by     bigint      REFERENCES erp_user(id)
);

-- ---------------------------------------------------------------- village works
CREATE TABLE IF NOT EXISTS erp_work (
  id           bigserial   PRIMARY KEY,
  name         text        NOT NULL,
  place        text,
  status       text        NOT NULL DEFAULT 'running' CHECK (status IN ('planned', 'running', 'done')),
  started_on   date,
  finished_on  date,
  budget_paise bigint      CHECK (budget_paise IS NULL OR budget_paise > 0),
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   bigint      REFERENCES erp_user(id),
  updated_at   timestamptz,
  updated_by   bigint      REFERENCES erp_user(id)
);

-- ---------------------------------------------------------------- money
CREATE TABLE IF NOT EXISTS erp_money_in (
  id            bigserial   PRIMARY KEY,
  receipt_no    text        NOT NULL UNIQUE,
  fy            text        NOT NULL,
  on_date       date        NOT NULL,
  from_name     text        NOT NULL,
  from_phone    text,
  from_place    text,
  amount_paise  bigint      NOT NULL CHECK (amount_paise > 0),
  head          text        NOT NULL CHECK (head IN ('zakat', 'donation', 'development', 'other')),
  method        text        NOT NULL CHECK (method IN ('cash', 'upi', 'bank', 'cheque')),
  reference     text,
  note          text,
  cancelled_at  timestamptz,
  cancelled_by  bigint      REFERENCES erp_user(id),
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    bigint      REFERENCES erp_user(id),
  updated_at    timestamptz,
  updated_by    bigint      REFERENCES erp_user(id)
);
CREATE INDEX IF NOT EXISTS erp_money_in_date ON erp_money_in (on_date DESC);

CREATE TABLE IF NOT EXISTS erp_money_out (
  id            bigserial   PRIMARY KEY,
  voucher_no    text        NOT NULL UNIQUE,
  fy            text        NOT NULL,
  on_date       date        NOT NULL,
  paid_to       text        NOT NULL,
  amount_paise  bigint      NOT NULL CHECK (amount_paise > 0),
  head          text        NOT NULL CHECK (head IN ('zakat', 'donation', 'development', 'other')),
  purpose       text        NOT NULL CHECK (purpose IN ('stipend', 'medical', 'education', 'livelihood', 'emergency', 'works', 'office', 'bank', 'other')),
  method        text        NOT NULL CHECK (method IN ('cash', 'upi', 'bank', 'cheque')),
  reference     text,
  family_id     bigint      REFERENCES erp_family(id),
  request_id    bigint      REFERENCES erp_request(id),
  work_id       bigint      REFERENCES erp_work(id),
  stipend_month text        CHECK (stipend_month IS NULL OR stipend_month ~ '^[0-9]{4}-[0-9]{2}$'),
  note          text,
  cancelled_at  timestamptz,
  cancelled_by  bigint      REFERENCES erp_user(id),
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    bigint      REFERENCES erp_user(id),
  updated_at    timestamptz,
  updated_by    bigint      REFERENCES erp_user(id)
);
CREATE INDEX IF NOT EXISTS erp_money_out_date ON erp_money_out (on_date DESC);
CREATE INDEX IF NOT EXISTS erp_money_out_family ON erp_money_out (family_id);
CREATE INDEX IF NOT EXISTS erp_money_out_work ON erp_money_out (work_id);
-- a family's stipend is paid once a month, however many times the run is pressed
CREATE UNIQUE INDEX IF NOT EXISTS erp_money_out_stipend_once
  ON erp_money_out (family_id, stipend_month)
  WHERE stipend_month IS NOT NULL AND cancelled_at IS NULL;

-- ---------------------------------------------------------------- members, meetings
CREATE TABLE IF NOT EXISTS erp_member (
  id         bigserial   PRIMARY KEY,
  name       text        NOT NULL,
  phone      text,
  lives_in   text,                                -- Pewe, Mumbai, Dubai...
  post       text,                                -- committee post, if any
  notes      text,
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint      REFERENCES erp_user(id),
  updated_at timestamptz,
  updated_by bigint      REFERENCES erp_user(id)
);

CREATE TABLE IF NOT EXISTS erp_meeting (
  id          bigserial   PRIMARY KEY,
  on_date     date        NOT NULL,
  kind        text        NOT NULL CHECK (kind IN ('meeting', 'notice')),
  title       text        NOT NULL,
  body        text,                               -- notes and decisions
  for_website boolean     NOT NULL DEFAULT false, -- to go on the website's notice board
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  bigint      REFERENCES erp_user(id),
  updated_at  timestamptz,
  updated_by  bigint      REFERENCES erp_user(id)
);

-- ---------------------------------------------------------------- history
-- One plain line for everything anyone adds, changes or cancels.
CREATE TABLE IF NOT EXISTS erp_audit (
  id        bigserial   PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  user_id   bigint      REFERENCES erp_user(id),
  action    text        NOT NULL,
  entity    text        NOT NULL,
  entity_id bigint,
  summary   text        NOT NULL
);
CREATE INDEX IF NOT EXISTS erp_audit_at ON erp_audit (at DESC);

-- ---------------------------------------------------------------- first sign-in without a link
-- The Gmail a committee member gave in the members' details form. With their
-- mobile number it lets them choose their own password the first time.
ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS first_email text;

-- ---------------------------------------------------------------- what "Other" was
-- When someone picks Other, they type what it is; that text is kept here.
ALTER TABLE erp_money_in  ADD COLUMN IF NOT EXISTS head_other text;
ALTER TABLE erp_money_out ADD COLUMN IF NOT EXISTS head_other text;
ALTER TABLE erp_money_out ADD COLUMN IF NOT EXISTS purpose_other text;
ALTER TABLE erp_request   ADD COLUMN IF NOT EXISTS kind_other text;

-- ---------------------------------------------------------------- approvals by the four
-- Deleting or changing a receipt or payment, and removing a family, member
-- or work, waits for every approver. A request is open for seven days.
ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS approver boolean NOT NULL DEFAULT false;
ALTER TABLE erp_work ADD COLUMN IF NOT EXISTS removed_at timestamptz;

CREATE TABLE IF NOT EXISTS erp_approval (
  id           bigserial   PRIMARY KEY,
  entity       text        NOT NULL,               -- money_in, money_out, transfer, family, member, work, month, opening
  entity_id    bigint,
  entity_key   text        NOT NULL,               -- entity and id (or month) as one text, for "one open request each"
  action       text        NOT NULL CHECK (action IN ('delete', 'change', 'remove', 'reopen')),
  summary      text        NOT NULL,               -- what it is, in one line
  change_lines text,                               -- for a change: "Amount: ₹1,000 → ₹1,500", one per line
  changes      jsonb,                              -- for a change: the new values, applied once approved
  reason       text        NOT NULL,
  approvers    bigint[]    NOT NULL,               -- who must approve, fixed when it was asked
  asked_by     bigint      REFERENCES erp_user(id),
  asked_at     timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  status       text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'expired', 'withdrawn')),
  closed_at    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS erp_approval_one_open ON erp_approval (entity_key) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS erp_approval_status ON erp_approval (status, asked_at DESC);

CREATE TABLE IF NOT EXISTS erp_approval_vote (
  approval_id bigint      NOT NULL REFERENCES erp_approval(id),
  user_id     bigint      NOT NULL REFERENCES erp_user(id),
  vote        text        NOT NULL CHECK (vote IN ('yes', 'no')),
  note        text,
  at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (approval_id, user_id)
);

-- ---------------------------------------------------------------- the books
-- Corrections: what an approved change or deletion did, shown in the cash book on the day it was approved.
CREATE TABLE IF NOT EXISTS erp_correction (
  id           bigserial   PRIMARY KEY,
  on_date      date        NOT NULL,
  dir          text        NOT NULL CHECK (dir IN ('in', 'out', 'transfer')),
  entity_id    bigint      NOT NULL,
  no           text        NOT NULL,
  what         text        NOT NULL,
  before_paise bigint      NOT NULL DEFAULT 0,
  after_paise  bigint      NOT NULL DEFAULT 0,
  approval_id  bigint      REFERENCES erp_approval(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS erp_correction_date ON erp_correction (on_date DESC);

-- Money moved between cash in hand and the bank. Not income or spending, so no fund.
CREATE TABLE IF NOT EXISTS erp_transfer (
  id            bigserial   PRIMARY KEY,
  transfer_no   text        NOT NULL UNIQUE,      -- T/2026-27/0001
  fy            text        NOT NULL,
  on_date       date        NOT NULL,
  direction     text        NOT NULL CHECK (direction IN ('to_bank', 'to_cash')),
  amount_paise  bigint      NOT NULL CHECK (amount_paise > 0),
  note          text,
  cancelled_at  timestamptz,
  cancelled_by  bigint      REFERENCES erp_user(id),
  cancel_reason text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    bigint      REFERENCES erp_user(id)
);
CREATE INDEX IF NOT EXISTS erp_transfer_date ON erp_transfer (on_date DESC);

-- What the Society had on the day the office started counting: in cash and in the bank, and in each fund.
CREATE TABLE IF NOT EXISTS erp_opening (
  id                 int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  on_date            date        NOT NULL,
  cash_paise         bigint      NOT NULL DEFAULT 0,
  bank_paise         bigint      NOT NULL DEFAULT 0,
  zakat_paise        bigint      NOT NULL DEFAULT 0,
  donation_paise     bigint      NOT NULL DEFAULT 0,
  development_paise  bigint      NOT NULL DEFAULT 0,
  other_paise        bigint      NOT NULL DEFAULT 0,
  set_by             bigint      REFERENCES erp_user(id),
  set_at             timestamptz NOT NULL DEFAULT now()
);

-- Month closing: checked against the bank statement and the cash counted, then closed.
CREATE TABLE IF NOT EXISTS erp_month (
  month                text        PRIMARY KEY CHECK (month ~ '^[0-9]{4}-[0-9]{2}$'),
  status               text        NOT NULL CHECK (status IN ('closed', 'open')),
  cash_book_paise      bigint      NOT NULL,
  bank_book_paise      bigint      NOT NULL,
  cash_counted_paise   bigint      NOT NULL,
  bank_statement_paise bigint      NOT NULL,
  note                 text,
  closed_by            bigint      REFERENCES erp_user(id),
  closed_at            timestamptz NOT NULL DEFAULT now(),
  reopened_at          timestamptz
);

-- ---------------------------------------------------------------- the members' portal
-- Every member has a PSWS number of their own (PSWS-48213) and a page of
-- their own: what they gave, what they received, and asks for collections,
-- Zakat and help. The office's people are members too. The number says who
-- someone is; signing in still needs their password.
ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS member_no    text;
ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS lives_in     text;
ALTER TABLE erp_user ADD COLUMN IF NOT EXISTS member_since date;
CREATE UNIQUE INDEX IF NOT EXISTS erp_user_member_no ON erp_user (member_no) WHERE member_no IS NOT NULL;
-- a member has a portal and no say in the office
ALTER TABLE erp_user DROP CONSTRAINT IF EXISTS erp_user_role_check;
ALTER TABLE erp_user ADD CONSTRAINT erp_user_role_check CHECK (role IN ('admin', 'editor', 'viewer', 'member'));

-- An ask: a collection for a cause, a Zakat appeal, or a private ask for help.
-- It is seen by every member only once two approvers say yes.
CREATE TABLE IF NOT EXISTS erp_ask (
  id           bigserial   PRIMARY KEY,
  kind         text        NOT NULL CHECK (kind IN ('collection', 'zakat', 'help')),
  title        text        NOT NULL,
  story        text,                              -- why, as members see it; a Zakat appeal never names the family
  private_note text,                              -- who it is for: the office and the approvers only
  family_id    bigint      REFERENCES erp_family(id),
  target_paise bigint      CHECK (target_paise IS NULL OR target_paise > 0),
  head         text        NOT NULL CHECK (head IN ('zakat', 'donation', 'development', 'other')),
  closes_on    date,
  status       text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'closed', 'declined', 'withdrawn')),
  asked_by     bigint      REFERENCES erp_user(id),
  asked_at     timestamptz NOT NULL DEFAULT now(),
  live_at      timestamptz,
  closed_at    timestamptz,
  closed_by    bigint      REFERENCES erp_user(id),
  closing_note text                               -- how the money was spent, shown to everyone
);
CREATE INDEX IF NOT EXISTS erp_ask_status ON erp_ask (status, asked_at DESC);

CREATE TABLE IF NOT EXISTS erp_ask_vote (
  ask_id  bigint      NOT NULL REFERENCES erp_ask(id),
  user_id bigint      NOT NULL REFERENCES erp_user(id),
  vote    text        NOT NULL CHECK (vote IN ('yes', 'no')),
  note    text,
  at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ask_id, user_id)
);

-- "I sent ₹1,000": a member's word that they paid PSWS, until the Treasurer finds it and it becomes a receipt.
CREATE TABLE IF NOT EXISTS erp_pledge (
  id           bigserial   PRIMARY KEY,
  member_id    bigint      NOT NULL REFERENCES erp_user(id),
  ask_id       bigint      REFERENCES erp_ask(id),       -- empty: a gift to a fund rather than to an ask
  amount_paise bigint      NOT NULL CHECK (amount_paise > 0),
  head         text        NOT NULL CHECK (head IN ('zakat', 'donation', 'development', 'other')),
  method       text        NOT NULL CHECK (method IN ('cash', 'upi', 'bank', 'cheque')),
  reference    text,                                     -- the UPI or cheque number
  sent_on      date        NOT NULL,
  show_name    boolean     NOT NULL DEFAULT false,       -- their name beside it on everyone's screen
  status       text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'confirmed', 'not_found', 'withdrawn')),
  money_in_id  bigint      REFERENCES erp_money_in(id),  -- the receipt, once found
  checked_by   bigint      REFERENCES erp_user(id),
  checked_at   timestamptz,
  check_note   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS erp_pledge_status ON erp_pledge (status, created_at);

-- Who gave, who received, and which ask the money was for.
ALTER TABLE erp_money_in  ADD COLUMN IF NOT EXISTS member_id bigint REFERENCES erp_user(id);
ALTER TABLE erp_money_in  ADD COLUMN IF NOT EXISTS ask_id    bigint REFERENCES erp_ask(id);
ALTER TABLE erp_money_out ADD COLUMN IF NOT EXISTS member_id bigint REFERENCES erp_user(id);
ALTER TABLE erp_money_out ADD COLUMN IF NOT EXISTS ask_id    bigint REFERENCES erp_ask(id);
ALTER TABLE erp_family    ADD COLUMN IF NOT EXISTS member_id bigint REFERENCES erp_user(id);
CREATE INDEX IF NOT EXISTS erp_money_in_member ON erp_money_in (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS erp_money_in_ask ON erp_money_in (ask_id) WHERE ask_id IS NOT NULL;

-- What everyone sees happening. Written as it happens, already without the names that are private.
CREATE TABLE IF NOT EXISTS erp_feed (
  id     bigserial   PRIMARY KEY,
  at     timestamptz NOT NULL DEFAULT now(),
  kind   text        NOT NULL CHECK (kind IN ('live', 'gift', 'target', 'closed', 'notice')),
  ask_id bigint      REFERENCES erp_ask(id),
  line   text        NOT NULL
);
CREATE INDEX IF NOT EXISTS erp_feed_at ON erp_feed (at DESC);

-- A member asking the office to change their details.
CREATE TABLE IF NOT EXISTS erp_member_message (
  id        bigserial   PRIMARY KEY,
  member_id bigint      NOT NULL REFERENCES erp_user(id),
  body      text        NOT NULL,
  at        timestamptz NOT NULL DEFAULT now(),
  done_at   timestamptz,
  done_by   bigint      REFERENCES erp_user(id)
);

-- ---------------------------------------------------------------- money a member collected from others
-- Handed in by a member who gathered it from several people: it counts for the
-- ask, and as that member's collection, never as their own gift.
ALTER TABLE erp_money_in ADD COLUMN IF NOT EXISTS collected_by bigint REFERENCES erp_user(id);
ALTER TABLE erp_money_in ADD COLUMN IF NOT EXISTS people      int CHECK (people IS NULL OR people > 0);  -- how many gave it
ALTER TABLE erp_money_in ADD COLUMN IF NOT EXISTS givers_note text;                                      -- who gave: the office only
ALTER TABLE erp_money_in ADD COLUMN IF NOT EXISTS name_hidden boolean NOT NULL DEFAULT false;             -- the giver or collector asked not to be named
ALTER TABLE erp_pledge   ADD COLUMN IF NOT EXISTS collected   boolean NOT NULL DEFAULT false;
ALTER TABLE erp_pledge   ADD COLUMN IF NOT EXISTS people      int CHECK (people IS NULL OR people > 0);
ALTER TABLE erp_pledge   ADD COLUMN IF NOT EXISTS givers_note text;
CREATE INDEX IF NOT EXISTS erp_money_in_collected_by ON erp_money_in (collected_by) WHERE collected_by IS NOT NULL;
