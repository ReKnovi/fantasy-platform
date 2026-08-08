-- ==========================================================
-- NPL FANTASY LEAGUE
-- MIGRATION: Integrity constraint hardening
--
-- Adds four constraints agreed on in schema review of
-- NPL_Fantasy_Final_Combined_Schema_v2.sql. All additive —
-- no columns removed, no data reshaped.
--
--   1. NOT NULL on matches.gameweek_id, team_a_id, team_b_id
--   2. CHECK on scoring_config.position (must match players.position enum, or NULL)
--   3. Partial unique indexes preventing >1 captain / >1 vice-captain
--      per user per gameweek in squad_gameweek_selection
--   4. CHECK linking squad_gameweek_selection.is_starting and bench_order
--
-- NOT included (deliberately rejected in review, see project notes):
--   - unique(name, real_team_id) on players — player master data is
--     known-provisional (104/112 confirmed per MVP tech plan §15);
--     a hard DB constraint would throw on legitimate provisional
--     re-entries. Handle as a soft "possible duplicate" warning in
--     the admin import flow instead, not here.
--   - matches.decided_by_super_over — no current reader of this
--     column; the actual fix is a process rule in the admin
--     scorecard tool (don't enter Super Over deliveries into
--     player_match_stats), not a schema change. Revisit if/when
--     Super Over gets its own display/audit surface.
-- ==========================================================

-- migrate:up

-- ----------------------------------------------------------
-- 1. matches: gameweek_id / team_a_id / team_b_id required
-- ----------------------------------------------------------
-- NOTE: if any existing rows have NULLs in these columns, this will
-- fail — back-fill or delete those rows before running in an
-- environment with real data. Safe against an empty/early dev DB.

ALTER TABLE matches
  ALTER COLUMN gameweek_id SET NOT NULL;

ALTER TABLE matches
  ALTER COLUMN team_a_id SET NOT NULL;

ALTER TABLE matches
  ALTER COLUMN team_b_id SET NOT NULL;

-- ----------------------------------------------------------
-- 2. scoring_config.position: constrain to the same enum as
--    players.position, or NULL (= applies to all positions)
-- ----------------------------------------------------------
-- Prevents a typo'd value (e.g. 'wicketkeeper' vs 'wicket_keeper')
-- from silently never matching in config lookups and quietly
-- zeroing out a scoring rule.

ALTER TABLE scoring_config
  ADD CONSTRAINT chk_scoring_config_position
  CHECK (position IS NULL OR position IN ('batsman', 'bowler', 'all_rounder', 'wicket_keeper'));

-- ----------------------------------------------------------
-- 3. squad_gameweek_selection: at most one captain and at most
--    one vice-captain per (user_id, gameweek_id)
-- ----------------------------------------------------------
-- Without this, a bug that ever lets two rows both have
-- is_captain = true for one user/gameweek makes the squad
-- aggregation query's CASE WHEN multiplier logic silently pick
-- whichever row the join returns first — a wrong total that
-- looks like a normal number, not an error. This is the
-- highest-priority fix in this migration.

CREATE UNIQUE INDEX idx_sgs_one_captain_per_user_gameweek
  ON squad_gameweek_selection (user_id, gameweek_id)
  WHERE is_captain = true;

CREATE UNIQUE INDEX idx_sgs_one_vice_captain_per_user_gameweek
  ON squad_gameweek_selection (user_id, gameweek_id)
  WHERE is_vice_captain = true;

-- ----------------------------------------------------------
-- 4. squad_gameweek_selection: is_starting and bench_order
--    must be consistent with each other
-- ----------------------------------------------------------
-- A row with is_starting = true must have bench_order NULL;
-- a row with is_starting = false must have a bench_order value.
-- Prevents nonsensical states like a "starting" player also
-- carrying a bench position.

ALTER TABLE squad_gameweek_selection
  ADD CONSTRAINT chk_sgs_starting_bench_consistency
  CHECK (
    (is_starting = true AND bench_order IS NULL)
    OR
    (is_starting = false AND bench_order IS NOT NULL)
  );

--migrate:down

DROP INDEX IF EXISTS idx_sgs_one_vice_captain_per_user_gameweek;
DROP INDEX IF EXISTS idx_sgs_one_captain_per_user_gameweek;
ALTER TABLE squad_gameweek_selection DROP CONSTRAINT IF EXISTS chk_sgs_starting_bench_consistency;
ALTER TABLE scoring_config DROP CONSTRAINT IF EXISTS chk_scoring_config_position;
ALTER TABLE matches ALTER COLUMN team_b_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN team_a_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN gameweek_id DROP NOT NULL;