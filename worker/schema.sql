-- Radiology Request Advisor — shared usage log schema (Cloudflare D1)
--
-- PRIVACY: this table holds NO patient data. There is no free-text column,
-- no age, no renal value, no IP address and no user identifier. Every field
-- is a bounded, server-validated enum or counter. Even a malicious client
-- cannot store arbitrary text here — the Worker rejects anything that is not
-- one of the expected shapes.

CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,          -- server-assigned epoch ms (client clock not trusted)
  day       TEXT    NOT NULL,          -- YYYY-MM-DD, UTC, for cheap grouping
  matched   INTEGER NOT NULL,          -- 1 = a scenario matched, 0 = fell through
  rule      TEXT,                      -- scenario id, e.g. 'pe'
  label     TEXT,                      -- scenario label, e.g. 'Suspected pulmonary embolism'
  cat       TEXT,                      -- category, e.g. 'Chest'
  urgency   INTEGER,                   -- 0 routine .. 3 emergency
  contrast  TEXT                       -- 'none' | 'iodinated' | 'gadolinium'
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_ts  ON events(ts);

-- Abuse control only. Buckets are short-lived and purged automatically.
-- The bucket key is a salted hash of the caller IP truncated to 16 hex chars,
-- with the salt rotating daily, so rows cannot be correlated across days and
-- no raw IP is ever written to disk.
CREATE TABLE IF NOT EXISTS ratelimit (
  bucket   TEXT    PRIMARY KEY,
  n        INTEGER NOT NULL,
  expires  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_expires ON ratelimit(expires);
