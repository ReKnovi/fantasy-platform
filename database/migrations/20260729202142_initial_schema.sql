-- migrate:up

CREATE TABLE real_teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  short_name    TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated')),
  eliminated_at TIMESTAMP NULL
);

CREATE TABLE players (
  id                             SERIAL PRIMARY KEY,
  name                           TEXT NOT NULL,
  real_team_id                   INT REFERENCES real_teams(id),
  position                       TEXT NOT NULL CHECK (position IN ('batsman', 'bowler', 'all_rounder', 'wicket_keeper')),
  is_overseas                    BOOLEAN NOT NULL DEFAULT false,
  category                       TEXT NULL,
  fantasy_category               TEXT NULL CHECK (fantasy_category IN ('A', 'B', 'C')),
  now_cost                       INT NOT NULL,
  season_start_price             INT NOT NULL,
  cost_change_event              INT NOT NULL DEFAULT 0,
  price_change_percent           NUMERIC NOT NULL DEFAULT 0,
  acquisition_status             TEXT NULL,
  real_acquisition_price_npr_lakh NUMERIC NULL,
  status                         TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'injured', 'unavailable', 'suspended')),
  news                           TEXT,
  available_from_date            DATE NULL,
  created_at                     TIMESTAMP NOT NULL DEFAULT now(),
  removed                        BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_players_real_team_id ON players(real_team_id);

-- migrate:down

DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS real_teams;
