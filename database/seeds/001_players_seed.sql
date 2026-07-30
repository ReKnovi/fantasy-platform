INSERT INTO real_teams (name, short_name, status) VALUES
  ('Kathmandu Kings', 'KTK', 'active'),
  ('Pokhara Avengers', 'POK', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO players (name, real_team_id, position, is_overseas, now_cost, season_start_price, status) VALUES
  ('Rohit Paudel',     1, 'batsman',      false, 105, 105, 'available'),
  ('Sandeep Lamichhane', 1, 'bowler',     false, 120, 120, 'available'),
  ('Dipendra Airee',   2, 'all_rounder',  false, 95,  95,  'available'),
  ('Aasif Sheikh',     2, 'wicket_keeper', false, 80, 80,  'available')
ON CONFLICT DO NOTHING;
