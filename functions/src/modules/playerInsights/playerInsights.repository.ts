import {getPool} from "../../database/pool";

export interface PlayerBaselineRow {
  id: number;
  name: string;
  now_cost: number;
  real_acquisition_price_npr_lakh: number | null;
}

/**
 * Fetches the static baselines info for a player
 */
export async function findPlayerBaseLine(
  playerId: number
): Promise<PlayerBaselineRow | null> {
  const pool = await getPool();
  const result = await pool.query<PlayerBaselineRow>(
    `SELECT id, name, now_cost, real_acquisition_price_npr_lakh
         FROM players
         WHERE id = $1 AND removed = false`,
    [playerId]
  );
  return result.rows[0] ?? null;
}

export interface PlayerStatsAggregateRow {
  total_runs: number;
  total_fours: number;
  total_sixes: number;
  balls_faced: number;
}

/**
 * Aggregates a player's stats related to batting and ball faced.
 */

export async function findPlayerStatsAggregate(
  playerId: number
): Promise<PlayerStatsAggregateRow | null> {
  const pool = await getPool();
  const result = await pool.query<PlayerStatsAggregateRow>(
    `SELECT
        COALESCE(SUM(runs), 0) AS total_runs,
        COALESCE(SUM(fours), 0) AS total_fours,
        COALESCE(SUM(sixes), 0) AS total_sixes,
        COALESCE(SUM(balls_faced), 0) AS balls_faced
        FROM player_match_stats
        WHERE player_id = $1
        AND published = true`,
    [playerId]
  );
  return result.rows[0] ?? null;
}

export interface PlayerMatchPointRow {
  // here match_id refers to gamewek_id as per current schema
  match_id: number;
  total_points: number;
}

/**
 * Fetches the points scored by each player in each gameweek
 */

export async function findPlayerPointsHistory(
  playerId: number
): Promise<PlayerMatchPointRow[]> {
  const pool = await getPool();
  const result = await pool.query<PlayerMatchPointRow>(
    `SELECT match_id, total_points
         FROM player_match_points
         WHERE player_id = $1
         ORDER BY match_id ASC`,
    [playerId]
  );
  return result.rows;
}

export interface PlayerMarketStatsRow {
  total_selections: number;
  captain_selections: number;
  vice_captain_selections: number;
  total_active_users: number;
}

/**
 * Fetches ownership and captaincy stats for a specific gameweek.
 */
export async function findPlayerMarketStats(
  playerId: number,
  gameweekId: number
): Promise<PlayerMarketStatsRow | null> {
  const pool = await getPool();
  const result = await pool.query<PlayerMarketStatsRow>(
    `WITH TotalUsers AS (
        -- Calculate total active users for this gameweek
        SELECT COUNT(DISTINCT user_id) AS total_users 
        FROM squad_gameweek_selection
        WHERE gameweek_id = $2
        )
        SELECT 
        COUNT(sgs.id) AS total_selections,
        COUNT(sgs.id) FILTER (
            WHERE sgs.is_captain = true
        ) AS captain_selections,
        COUNT(sgs.id) FILTER (
            WHERE sgs.is_vice_captain = true
        ) AS vice_captain_selections,
        (SELECT total_users FROM TotalUsers) AS total_active_users
        FROM squad_gameweek_selection sgs
        WHERE sgs.player_id = $1 AND sgs.gameweek_id = $2`,
    [playerId, gameweekId]
  );
  return result.rows[0] ?? null;
}

/**
 * Fetches the ID of the currently active gameweek based on schema.
 */
export async function findActiveGameweekId(): Promise<number> {
  const pool = await getPool();

  const result = await pool.query<{id: number}>(
    `SELECT id FROM gameweeks 
     WHERE finished = false 
     ORDER BY deadline_time ASC 
     LIMIT 1`
  );

  return result.rows[0]?.id ?? 1;
}

export interface PlayerTransferMetricsRow {
  transfers_in: number;
  transfers_out: number;
  net_transfers: number;
}

/**
 * Calculates transfer activity for a specific gameweek.
 */
export async function findPlayerTransferActivity(
  playerId: number,
  gameweekId: number
): Promise<PlayerTransferMetricsRow> {
  const pool = await getPool();

  const result = await pool.query<PlayerTransferMetricsRow>(
    `SELECT 
        (SELECT COUNT(*) FROM transfers 
         WHERE player_in_id = $1 AND gameweek_id = $2) AS transfers_in,
        (SELECT COUNT(*) FROM transfers 
         WHERE player_out_id = $1 AND gameweek_id = $2) AS transfers_out,
        (
            (SELECT COUNT(*) FROM transfers 
             WHERE player_in_id = $1 AND gameweek_id = $2) -
            (SELECT COUNT(*) FROM transfers 
             WHERE player_out_id = $1 AND gameweek_id = $2)
        ) AS net_transfers`,
    [playerId, gameweekId]
  );
  return (
    result.rows[0] ?? {
      transfers_in: 0,
      transfers_out: 0,
      net_transfers: 0,
    }
  );
}

export interface PlayerTallyAndBattingBreakdown {
  potm_count: number;
}

export async function findPlayerTallyAndBattingBreakdown(
  playerId: number
): Promise<number> {
  const pool = await getPool();

  const result = await pool.query<{potm_count: string}>(
    `SELECT COUNT(*) AS potm_count 
         FROM matches 
         WHERE player_of_match_id = $1`,
    [playerId]
  );
  return Number(result.rows[0]?.potm_count ?? 0);
}
