-- migrate:up

-- Needed for gen_random_uuid() used as the default on users.id.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- 1. Users & Auth
-- ==========================================================

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name     TEXT NOT NULL,
  phone_or_email   TEXT NOT NULL UNIQUE,
  auth_provider_id TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  role             TEXT NOT NULL DEFAULT 'user'
                     CHECK (role IN ('user', 'scorer_admin', 'roster_admin', 'super_admin'))
);

-- ==========================================================
-- 2. Real-world reference data (gameweeks, matches)
--    real_teams and players already exist from the first migration.
-- ==========================================================

CREATE TABLE gameweeks (
  id            SERIAL PRIMARY KEY,
  label         TEXT NOT NULL,
  phase         TEXT NOT NULL DEFAULT 'group_stage'
                  CHECK (phase IN ('group_stage', 'playoffs')),
  deadline_time TIMESTAMP NOT NULL,
  finished      BOOLEAN NOT NULL DEFAULT false,
  data_checked  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE matches (
  id                  SERIAL PRIMARY KEY,
  gameweek_id         INT REFERENCES gameweeks(id),
  team_a_id           INT REFERENCES real_teams(id),
  team_b_id           INT REFERENCES real_teams(id),
  match_date          TIMESTAMP NOT NULL,
  venue               TEXT,
  match_status        TEXT NOT NULL DEFAULT 'scheduled'
                         CHECK (match_status IN ('scheduled', 'completed', 'no_result', 'abandoned', 'dls_adjusted')),
  toss_winner_id      INT REFERENCES real_teams(id),
  player_of_match_id  INT REFERENCES players(id)
);

CREATE INDEX idx_matches_gameweek_id ON matches(gameweek_id);

-- ==========================================================
-- 3. Match data entry (admin-facing)
-- ==========================================================

CREATE TABLE playing_xi (
  id           SERIAL PRIMARY KEY,
  match_id     INT NOT NULL REFERENCES matches(id),
  player_id    INT NOT NULL REFERENCES players(id),
  real_team_id INT REFERENCES real_teams(id),
  UNIQUE (match_id, player_id)
);

CREATE TABLE player_match_stats (
  id                    SERIAL PRIMARY KEY,
  player_id             INT NOT NULL REFERENCES players(id),
  match_id              INT NOT NULL REFERENCES matches(id),

  -- batting
  runs                  INT NOT NULL DEFAULT 0,
  balls_faced           INT NOT NULL DEFAULT 0,
  fours                 INT NOT NULL DEFAULT 0,
  sixes                 INT NOT NULL DEFAULT 0,
  is_batting_dismissal  BOOLEAN NOT NULL DEFAULT false,
  is_duck               BOOLEAN NOT NULL DEFAULT false,

  -- bowling
  overs_bowled          NUMERIC NOT NULL DEFAULT 0,
  runs_conceded         INT NOT NULL DEFAULT 0,
  wickets               INT NOT NULL DEFAULT 0,
  maidens               INT NOT NULL DEFAULT 0,

  -- fielding (position-agnostic — any player in the confirmed XI)
  catches_taken         INT NOT NULL DEFAULT 0,
  stumpings             INT NOT NULL DEFAULT 0,
  run_outs_direct       INT NOT NULL DEFAULT 0,
  run_outs_assist       INT NOT NULL DEFAULT 0,

  published             BOOLEAN NOT NULL DEFAULT false,
  published_at          TIMESTAMP,

  UNIQUE (player_id, match_id)
);

CREATE TABLE stat_corrections (
  id                      SERIAL PRIMARY KEY,
  player_match_stats_id   INT NOT NULL REFERENCES player_match_stats(id),
  field_changed           TEXT NOT NULL,
  old_value               TEXT,
  new_value               TEXT,
  changed_by              UUID REFERENCES users(id),
  changed_at              TIMESTAMP NOT NULL DEFAULT now(),
  reason                  TEXT
);

-- ==========================================================
-- 4. Scoring engine
-- ==========================================================

CREATE TABLE scoring_config (
  id             SERIAL PRIMARY KEY,
  version_id     INT NOT NULL,
  effective_from TIMESTAMP NOT NULL,
  stat_key       TEXT NOT NULL,
  position       TEXT,  -- NULL = applies to all positions
  point_value    NUMERIC NOT NULL,
  UNIQUE (version_id, stat_key, position)
);

CREATE TABLE player_match_points (
  id                    SERIAL PRIMARY KEY,
  player_id             INT NOT NULL REFERENCES players(id),
  match_id              INT NOT NULL REFERENCES matches(id),
  config_version_id     INT NOT NULL,
  batting_points        NUMERIC NOT NULL DEFAULT 0,
  bowling_points        NUMERIC NOT NULL DEFAULT 0,
  fielding_points       NUMERIC NOT NULL DEFAULT 0,
  participation_points  NUMERIC NOT NULL DEFAULT 0,
  total_points          NUMERIC NOT NULL,
  computed_at           TIMESTAMP NOT NULL DEFAULT now(),
  -- This UNIQUE constraint also serves as the (player_id, match_id) composite
  -- index the load-balancing checklist calls for — no separate index needed.
  UNIQUE (player_id, match_id)
);

-- ==========================================================
-- 5. Squad ownership & weekly selection
-- ==========================================================

CREATE TABLE squad_players (
  id                        SERIAL PRIMARY KEY,
  user_id                   UUID NOT NULL REFERENCES users(id),
  player_id                 INT NOT NULL REFERENCES players(id),
  purchase_price            INT NOT NULL,
  forced_transfer_pending   BOOLEAN NOT NULL DEFAULT false,
  forced_transfer_deadline  TIMESTAMP,
  acquired_at               TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, player_id)
);

CREATE TABLE squad_gameweek_selection (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id),
  gameweek_id      INT NOT NULL REFERENCES gameweeks(id),
  player_id        INT NOT NULL REFERENCES players(id),
  is_starting      BOOLEAN NOT NULL,
  bench_order      INT,
  is_captain       BOOLEAN NOT NULL DEFAULT false,
  is_vice_captain  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, gameweek_id, player_id)
);

-- Explicit composite index for the batch aggregation query (section 9/12 of
-- the tech plan) — filters by gameweek_id and joins on player_id, which the
-- (user_id, gameweek_id, player_id) UNIQUE index above doesn't serve well
-- since user_id leads it.
CREATE INDEX idx_sgs_gameweek_player ON squad_gameweek_selection(gameweek_id, player_id);

CREATE TABLE squad_gameweek_points (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  gameweek_id   INT NOT NULL REFERENCES gameweeks(id),
  total_points  NUMERIC NOT NULL,
  computed_at   TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, gameweek_id)
);

-- ==========================================================
-- 6. Transfers (regular + forced)
-- ==========================================================

CREATE TABLE transfers (
  id                     SERIAL PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES users(id),
  gameweek_id            INT REFERENCES gameweeks(id),
  player_out_id          INT REFERENCES players(id),
  player_in_id           INT REFERENCES players(id),
  transfer_type          TEXT NOT NULL CHECK (transfer_type IN ('free', 'paid', 'forced')),
  points_cost            INT NOT NULL DEFAULT 0,
  triggered_by_team_id   INT REFERENCES real_teams(id),
  resolved_at            TIMESTAMP NOT NULL DEFAULT now(),
  auto_resolved          BOOLEAN NOT NULL DEFAULT false
);

-- ==========================================================
-- 7. Leagues (social/competitive layer)
-- ==========================================================

CREATE TABLE leagues (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  join_code   TEXT UNIQUE,
  creator_id  UUID REFERENCES users(id),
  league_type TEXT NOT NULL DEFAULT 'classic' CHECK (league_type IN ('classic')),
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE league_memberships (
  id         SERIAL PRIMARY KEY,
  league_id  INT NOT NULL REFERENCES leagues(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  joined_at  TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

-- migrate:down

DROP TABLE IF EXISTS league_memberships;
DROP TABLE IF EXISTS leagues;
DROP TABLE IF EXISTS transfers;
DROP TABLE IF EXISTS squad_gameweek_points;
DROP TABLE IF EXISTS squad_gameweek_selection;
DROP TABLE IF EXISTS squad_players;
DROP TABLE IF EXISTS player_match_points;
DROP TABLE IF EXISTS scoring_config;
DROP TABLE IF EXISTS stat_corrections;
DROP TABLE IF EXISTS player_match_stats;
DROP TABLE IF EXISTS playing_xi;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS gameweeks;
DROP TABLE IF EXISTS users;
