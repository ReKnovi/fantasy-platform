-- =====================================================================
-- TEST/DEV FIXTURE DATA ONLY — DO NOT RUN AGAINST PRODUCTION
-- ORDER: requires ../01_real_teams.sql (and ../02_players.sql if you also want
-- squads/selections layered on top) to have run first.
-- =====================================================================
-- Source: nplcricketleague.com/schedule (an unofficial fan/SEO site).
-- This site contradicts itself (its own 'Fixture Status' section says the
-- 2026 schedule 'is still awaiting official confirmation'), and other sites
-- carrying the same table disagree with each other on dates. Do NOT treat
-- any date/time/pairing below as the real NPL 2026 schedule.
--
-- What IS reused here: the round-robin format (8 teams, 28 group-stage
-- matches, 4-match playoff bracket), single venue, and Nov-Dec window,
-- which are consistent across sources and match the project docs.
--
-- Purpose: exercise gameweek/match/deadline/squad-lock/playoff-elimination
-- code paths in a local/staging DB before the real CAN schedule is out.
-- Gameweek grouping: matches chunked so every one of the 8 teams appears
-- at least once per gameweek (per the gameweek=round definition in the
-- cricket-vs-football differences doc) — this grouping is our own logic,
-- not sourced from the site.
-- =====================================================================

INSERT INTO gameweeks (label, phase, deadline_time) VALUES
  ('Gameweek 1', 'group_stage', '2026-11-17 16:00:00'),
  ('Gameweek 2', 'group_stage', '2026-11-21 16:00:00'),
  ('Gameweek 3', 'group_stage', '2026-11-27 11:45:00'),
  ('Gameweek 4', 'group_stage', '2026-11-29 11:15:00'),
  ('Gameweek 5', 'group_stage', '2026-12-04 11:45:00'),
  ('Gameweek 6 (Playoffs)', 'playoffs', '2026-12-09 16:00:00');

-- Group-stage matches (team_a_id/team_b_id resolved via real_teams.name)
INSERT INTO matches (gameweek_id, team_a_id, team_b_id, match_date, venue, match_status) VALUES
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 1'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), '2026-11-17 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 1'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), '2026-11-18 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 1'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), '2026-11-18 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 1'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), '2026-11-19 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 1'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), '2026-11-20 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), '2026-11-21 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), '2026-11-22 11:15:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), '2026-11-22 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), '2026-11-24 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), '2026-11-24 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), '2026-11-25 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 2'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), '2026-11-26 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 3'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), '2026-11-27 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 3'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), '2026-11-27 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 3'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), '2026-11-28 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 3'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), '2026-11-28 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), '2026-11-29 11:15:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), '2026-11-29 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), '2026-11-30 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), '2026-12-02 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), '2026-12-02 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 4'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), '2026-12-03 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), (SELECT id FROM real_teams WHERE name = 'Kathmandu Gorkhas'), '2026-12-04 11:45:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), '2026-12-04 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Lumbini Lions'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), '2026-12-05 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Sudur Paschim Royals'), (SELECT id FROM real_teams WHERE name = 'Biratnagar Kings'), '2026-12-06 11:15:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Chitwan Rhinos'), (SELECT id FROM real_teams WHERE name = 'Pokhara Avengers'), '2026-12-06 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 5'), (SELECT id FROM real_teams WHERE name = 'Karnali Yaks'), (SELECT id FROM real_teams WHERE name = 'Janakpur Bolts'), '2026-12-07 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur', 'scheduled');

-- Playoff matches: team_a_id/team_b_id left NULL — which franchises play in
-- Qualifier 1/Eliminator/Qualifier 2/Final depends on group-stage standings,
-- which don't exist yet in a fresh test DB. venue text carries the bracket
-- slot (e.g. '1st vs 2nd') for readability only — not a schema field.
INSERT INTO matches (gameweek_id, team_a_id, team_b_id, match_date, venue, match_status) VALUES
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 6 (Playoffs)'), NULL, NULL, '2026-12-09 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur — Qualifier 1 (1st vs 2nd)', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 6 (Playoffs)'), NULL, NULL, '2026-12-10 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur — Eliminator (3rd vs 4th)', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 6 (Playoffs)'), NULL, NULL, '2026-12-11 16:00:00', 'Tribhuvan University International Cricket Ground, Kirtipur — Qualifier 2 (LoserQ1 vs WinnerElim)', 'scheduled'),
  ((SELECT id FROM gameweeks WHERE label = 'Gameweek 6 (Playoffs)'), NULL, NULL, '2026-12-13 15:30:00', 'Tribhuvan University International Cricket Ground, Kirtipur — Final (WinnerQ1 vs WinnerQ2)', 'scheduled');
