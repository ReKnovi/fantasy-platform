# Player Seed Data — Outstanding Review Items

`database/seeds/02_players.sql` was generated from Cricsheet ball-by-ball data
(64 NPL matches, seasons 2024/25 + 2025/26), not from official CAN player master
data. Every row carries placeholder/derived values that need review before this
is treated as production-ready. Do not remove this file until both items below
are closed out.

## 1. `is_overseas` — currently `false` for all 193 players

Not derivable from Cricsheet data (no nationality field). Needs manual tagging
against the real NPL overseas-signing list before the 'exactly 4 overseas' squad
rule can be enforced meaningfully. Until this is done, squad validation
involving overseas count will be silently wrong for every user.

```sql
-- Find everything still on the placeholder default:
SELECT id, name, real_team_id FROM players WHERE is_overseas = false;
```

## 2. `position` — 31 of 193 players flagged LOW SIGNAL

Position was heuristically derived from ball-by-ball involvement (balls faced /
balls bowled / stumpings effected). The players below had too little data in the
two available seasons to classify confidently — most are likely tail-end
batters, part-time bowlers, or players who only featured in one or two matches.
Their `position` value in the seed is a low-confidence fallback ('batsman'), not
a verified role.

```sql
-- Find them directly in the DB (all carry the placeholder pricing too):
SELECT id, name, real_team_id, position FROM players
WHERE acquisition_status = 'PROVISIONAL' AND news LIKE 'Placeholder cost%'
ORDER BY real_team_id, name;
```

| Player           | Team                 | Balls faced | Balls bowled | Stumpings | Seed position |
| ---------------- | -------------------- | ----------- | ------------ | --------- | ------------- |
| GSNFG Jayasuriya | Biratnagar Kings     | 0           | 0            | 0         | batsman       |
| JK Mukhiya       | Biratnagar Kings     | 1           | 13           | 0         | batsman       |
| B Acharya        | Chitwan Rhinos       | 0           | 0            | 0         | batsman       |
| Gautam KC        | Chitwan Rhinos       | 0           | 12           | 0         | batsman       |
| Nar Sarki        | Chitwan Rhinos       | 14          | 12           | 0         | batsman       |
| Saugat Dhakal    | Chitwan Rhinos       | 0           | 6            | 0         | batsman       |
| B Aagri          | Janakpur Bolts       | 0           | 18           | 0         | batsman       |
| BWM Mike         | Janakpur Bolts       | 0           | 22           | 0         | batsman       |
| J Tromp          | Janakpur Bolts       | 14          | 0            | 0         | batsman       |
| Pappu Yadav      | Janakpur Bolts       | 0           | 0            | 0         | batsman       |
| Deepak Dumre     | Karnali Yaks         | 13          | 0            | 0         | batsman       |
| Rit Gautam       | Karnali Yaks         | 4           | 0            | 0         | batsman       |
| SM Dhakal        | Karnali Yaks         | 0           | 13           | 0         | batsman       |
| R Rijal          | Kathmandu Gorkhas    | 0           | 0            | 0         | batsman       |
| R Vasconcelos    | Kathmandu Gorkhas    | 4           | 0            | 0         | batsman       |
| M Subasingha     | Lumbini Lions        | 0           | 12           | 0         | batsman       |
| TJ Draca         | Lumbini Lions        | 4           | 20           | 0         | batsman       |
| Aakarshit Gomel  | Pokhara Avengers     | 15          | 6            | 0         | batsman       |
| Krishna Poudel   | Pokhara Avengers     | 0           | 0            | 0         | batsman       |
| S Aryal          | Pokhara Avengers     | 0           | 13           | 0         | batsman       |
| SK Chettri       | Pokhara Avengers     | 4           | 9            | 0         | batsman       |
| A Shrestha       | Sudur Paschim Royals | 5           | 0            | 0         | batsman       |
| B Khatri         | Sudur Paschim Royals | 4           | 6            | 0         | batsman       |
| D Parashar       | Sudur Paschim Royals | 0           | 12           | 0         | batsman       |
| DS Bajwa         | Sudur Paschim Royals | 16          | 0            | 0         | batsman       |
| H Mahara         | Sudur Paschim Royals | 0           | 20           | 0         | batsman       |
| Milan Bohara     | Sudur Paschim Royals | 2           | 6            | 0         | batsman       |
| Mukhtar Ahmed    | Sudur Paschim Royals | 11          | 0            | 0         | batsman       |
| P Mehra          | Sudur Paschim Royals | 14          | 20           | 0         | batsman       |
| Rohan Mustafa    | Sudur Paschim Royals | 7           | 6            | 0         | batsman       |
| SP Jackson       | Sudur Paschim Royals | 15          | 0            | 0         | batsman       |

## 3. Pricing placeholders (`now_cost` / `season_start_price` = 50 for everyone)

Deliberate — the Grading & Pricing module (FPL-PGP-0001) is on hold pending the
pricing-philosophy decision. Every player has the identical flat placeholder, so
no squad-building affordability testing will be meaningful until real prices
land. Do not start real pricing work by editing this seed directly — it should
be superseded by whatever the Grading & Pricing module produces, not patched
here.

```sql
-- Sanity check that pricing is still all-placeholder (should return 193):
SELECT count(*) FROM players WHERE now_cost = 50 AND season_start_price = 50;
```
