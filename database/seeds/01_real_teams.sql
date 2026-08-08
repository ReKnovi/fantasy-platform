-- Seed: real_teams (source: Cricsheet NPL JSON, seasons 2024/25 + 2025/26)
-- ORDER: run this before 02_players.sql — that file FK-resolves real_team_id
-- via (SELECT id FROM real_teams WHERE name = ...) and needs these rows to exist.
-- 'Kathmandu Gurkhas' (2024/25 spelling) canonicalized to 'Kathmandu Gorkhas' (2025/26 spelling).
INSERT INTO real_teams (name, short_name, status) VALUES
  ('Biratnagar Kings', 'BK', 'active'),
  ('Chitwan Rhinos', 'CR', 'active'),
  ('Janakpur Bolts', 'JB', 'active'),
  ('Karnali Yaks', 'KY', 'active'),
  ('Kathmandu Gorkhas', 'KTG', 'active'),
  ('Lumbini Lions', 'LL', 'active'),
  ('Pokhara Avengers', 'PA', 'active'),
  ('Sudur Paschim Royals', 'SPR', 'active');
