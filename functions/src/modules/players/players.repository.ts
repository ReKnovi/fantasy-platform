import { pool } from "../../database/pool";

export interface PlayerRow {
  id: number;
  name: string;
  real_team_id: number | null;
  position: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  is_overseas: boolean;
  now_cost: number;
  status: "available" | "injured" | "unavailable" | "suspended";
}

const BASE_SELECT = `
  SELECT id, name, real_team_id, position, is_overseas, now_cost, status
  FROM players
  WHERE removed = false
`;

export async function findAllPlayers(): Promise<PlayerRow[]> {
  const result = await pool.query<PlayerRow>(`${BASE_SELECT} ORDER BY name ASC`);
  return result.rows;
}

export async function findPlayerById(id: number): Promise<PlayerRow | null> {
  const result = await pool.query<PlayerRow>(
    `${BASE_SELECT} AND id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
