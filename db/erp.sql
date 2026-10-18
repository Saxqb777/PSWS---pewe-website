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
