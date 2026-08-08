-- migrate:up

-- ==========================================================
-- Snapshot the columns we're about to drop, so `down` can restore exact
-- original values instead of reconstructing/defaulting them. Rows that
-- don't exist yet at migration time simply won't be in this table — see
-- the down migration for how that case is handled.
--
-- NOTE: this backup table is intentionally left in place after `up`
-- completes. Drop it manually in a later migration once you're confident
-- this migration won't be rolled back (e.g. after the next release is
-- stable) — don't let it accumulate as permanent clutter.
-- ==========================================================

CREATE TABLE _backup_20260806150000_player_match_stats AS
SELECT id, is_duck, overs_bowled
FROM player_match_stats;

-- ==========================================================
-- player_match_stats
--
-- - legal_balls_bowled (INT) replaces overs_bowled (NUMERIC).
-- - is_duck removed — derived from is_batting_dismissal AND runs = 0
--   in the scoring engine.
-- - is_batting_dismissal remains unchanged and explicit/admin-entered.
-- - strike_rate and economy_rate are tracked as player-match metrics.
--
-- Strike rate:
--   runs / balls_faced * 100
--
-- Economy rate:
--   runs_conceded / legal_balls_bowled * 6
--
-- Both remain NULL when the player has no relevant denominator:
--   strike_rate = NULL when balls_faced = 0
--   economy_rate = NULL when legal_balls_bowled = 0
-- ==========================================================

ALTER TABLE player_match_stats
  ADD COLUMN legal_balls_bowled INT NOT NULL DEFAULT 0,
  ADD COLUMN strike_rate NUMERIC(6,2),
  ADD COLUMN economy_rate NUMERIC(6,2);

-- Convert cricket overs notation to legal balls.
--
-- Examples:
--   3.0 -> 18
--   3.1 -> 19
--   3.2 -> 20
--   3.5 -> 23
--   4.0 -> 24
UPDATE player_match_stats
SET legal_balls_bowled = FLOOR(overs_bowled)::INT * 6
                        + ROUND((overs_bowled - FLOOR(overs_bowled)) * 10)::INT;

-- Calculate strike rate from authoritative batting statistics.
UPDATE player_match_stats
SET strike_rate = ROUND(
  (runs::NUMERIC / NULLIF(balls_faced, 0)) * 100,
  2
);

-- Calculate economy rate from authoritative bowling statistics.
UPDATE player_match_stats
SET economy_rate = ROUND(
  (runs_conceded::NUMERIC / NULLIF(legal_balls_bowled, 0)) * 6,
  2
);

ALTER TABLE player_match_stats
  DROP COLUMN overs_bowled;

ALTER TABLE player_match_stats
  DROP COLUMN is_duck;

-- ==========================================================
-- matches: result fields + match-level publish gate
-- ==========================================================

ALTER TABLE matches
  ADD COLUMN winner_team_id  INT REFERENCES real_teams(id),
  ADD COLUMN win_margin      INT,
  ADD COLUMN win_margin_type TEXT
                     CHECK (win_margin_type IN ('runs', 'wickets', 'tie', 'no_result')),
  ADD COLUMN published       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN published_at    TIMESTAMP;

-- ==========================================================
-- playing_xi: per-match wicketkeeper flag
-- ==========================================================

ALTER TABLE playing_xi
  ADD COLUMN is_match_wicket_keeper BOOLEAN NOT NULL DEFAULT false;


-- migrate:down

-- ==========================================================
-- Remove newly-added derived/tracked metrics.
-- ==========================================================

ALTER TABLE player_match_stats
  DROP COLUMN economy_rate,
  DROP COLUMN strike_rate;


ALTER TABLE playing_xi
  DROP COLUMN is_match_wicket_keeper;

ALTER TABLE matches
  DROP COLUMN published_at,
  DROP COLUMN published,
  DROP COLUMN win_margin_type,
  DROP COLUMN win_margin,
  DROP COLUMN winner_team_id;

-- ==========================================================
-- Restore the dropped columns as nullable first, backfill, THEN apply the
-- original NOT NULL/DEFAULT constraints — you can't add a NOT NULL column
-- and populate it from another table in one statement.
-- ==========================================================

ALTER TABLE player_match_stats
  ADD COLUMN is_duck BOOLEAN,
  ADD COLUMN overs_bowled NUMERIC;

-- Case 1: rows that existed before `up` ran — restore their exact
-- original values from the snapshot.
UPDATE player_match_stats pms
SET is_duck      = b.is_duck,
    overs_bowled = b.overs_bowled
FROM _backup_20260806150000_player_match_stats b
WHERE b.id = pms.id;

-- Case 2: rows created AFTER `up` ran (never had a stored is_duck/
-- overs_bowled, so there's no original value to restore) — best-effort
-- re-derive instead of silently defaulting to false/0.
UPDATE player_match_stats
SET is_duck      = (is_batting_dismissal AND runs = 0),
    overs_bowled = FLOOR(legal_balls_bowled / 6)
                 + (legal_balls_bowled % 6) / 10.0
WHERE id NOT IN (
  SELECT id
  FROM _backup_20260806150000_player_match_stats
);

ALTER TABLE player_match_stats
  ALTER COLUMN is_duck SET NOT NULL,
  ALTER COLUMN is_duck SET DEFAULT false,
  ALTER COLUMN overs_bowled SET NOT NULL,
  ALTER COLUMN overs_bowled SET DEFAULT 0;

ALTER TABLE player_match_stats
  DROP COLUMN legal_balls_bowled;

DROP TABLE _backup_20260806150000_player_match_stats;