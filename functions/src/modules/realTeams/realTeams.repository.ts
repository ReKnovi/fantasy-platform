import {getPool} from "../../database/pool";

export interface RealTeamRow {
  id: number;
  name: string;
  short_name: string | null;
  status: "active" | "eliminated";
  eliminated_at: string | null;
}

const BASE_SELECT = `
  SELECT id, name, short_name, status, eliminated_at
  FROM real_teams
`;

/**
 * Returns all NPL franchises in stable display order.
 */
export async function findAllRealTeams(): Promise<RealTeamRow[]> {
  const pool = await getPool();
  const result = await pool.query<RealTeamRow>(
    `${BASE_SELECT} ORDER BY name ASC`
  );
  return result.rows;
}

/**
 * Returns one franchise by id.
 * @param {number} id real_teams.id.
 */
export async function findRealTeamById(
  id: number
): Promise<RealTeamRow | null> {
  const pool = await getPool();

  const result = await pool.query<RealTeamRow>(`${BASE_SELECT} WHERE id = $1`, [
    id,
  ]);

  return result.rows[0] ?? null;
}

/**
 * Creates a new franchise. Admin-only — see realTeams.routes.ts.
 * @param {object} params New team's name/short_name.
 * @param {string} params.name Full franchise name.
 * @param {string | undefined} params.shortName Optional short/display code.
 */
export async function createRealTeam(params: {
  name: string;
  shortName?: string;
}): Promise<RealTeamRow> {
  const pool = await getPool();
  const result = await pool.query<RealTeamRow>(
    `INSERT INTO real_teams (name, short_name)
     VALUES ($1, $2)
     RETURNING id, name, short_name, status, eliminated_at`,
    [params.name, params.shortName ?? null]
  );
  return result.rows[0];
}

/**
 * Flips a franchise's status. Setting 'eliminated' stamps eliminated_at;
 * setting it back to 'active' clears that stamp (covers admin corrections,
 * e.g. a wrongly-triggered elimination).
 * @param {number} id real_teams.id.
 * @param {"active" | "eliminated"} status New status value.
 */
export async function updateRealTeamStatus(
  id: number,
  status: "active" | "eliminated"
): Promise<RealTeamRow | null> {
  const pool = await getPool();
  const result = await pool.query<RealTeamRow>(
    `UPDATE real_teams
     SET status = $2,
         eliminated_at = CASE WHEN $2 = 'eliminated' THEN now() ELSE NULL END
     WHERE id = $1
     RETURNING id, name, short_name, status, eliminated_at`,
    [id, status]
  );
  return result.rows[0] ?? null;
}
