-- migrate:up

-- ==========================================================
-- user_chips
--   One row per user per chip type, seeded at squad creation with
--   used_gameweek_id = NULL (seeding is application logic at squad-build
--   time, not this migration's concern — see squadService.ts).
--   Using a chip is an UPDATE to the existing row (set used_gameweek_id +
--   used_at), never an INSERT — this keeps "has this user already used
--   their Wildcard" a simple existence/null check against a small,
--   indexed table rather than a scan.
--
--   Scope: one of each chip for the whole tournament (not FPL's
--   two-per-half-season model) — see the main tech plan, section 10, for
--   the full reasoning. How each chip type affects scoring/transfers is
--   enforced in the squad aggregation job and transferService.ts, not in
--   this schema.
-- ==========================================================

CREATE TABLE user_chips (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id),
  chip_type        TEXT NOT NULL
                      CHECK (chip_type IN ('wildcard', 'triple_captain', 'bench_boost')),
  used_gameweek_id INT REFERENCES gameweeks(id),  -- NULL = not yet used
  used_at          TIMESTAMP,
  UNIQUE (user_id, chip_type)
);

-- migrate:down

DROP TABLE IF EXISTS user_chips;