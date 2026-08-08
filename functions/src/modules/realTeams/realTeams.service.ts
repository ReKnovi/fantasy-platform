import {
  createRealTeam,
  findAllRealTeams,
  findRealTeamById,
  RealTeamRow,
  updateRealTeamStatus,
} from "./realTeams.repository";

/**
 * Returns all NPL franchises.
 */
export async function getAllRealTeams(): Promise<RealTeamRow[]> {
  return findAllRealTeams();
}

/**
 * Returns one franchise by id, or null if it doesn't exist.
 * @param {number} id real_teams.id.
 */
export async function getRealTeamById(id: number): Promise<RealTeamRow | null> {
  return findRealTeamById(id);
}

/**
 * Registers a new franchise (roster_admin/super_admin only).
 * @param {object} params New team's name/short_name.
 * @param {string} params.name Full franchise name.
 * @param {string | undefined} params.shortName Optional short/display code.
 */
export async function registerRealTeam(params: {
  name: string;
  shortName?: string;
}): Promise<RealTeamRow> {
  return createRealTeam(params);
}

/**
 * Sets a franchise's active/eliminated status.
 *
 * IMPORTANT: this only flips the status flag. It deliberately does NOT
 * run the forced-transfer cascade (flagging squad_players rows for every
 * user holding a now-eliminated player) — that belongs to a dedicated
 * eliminationJob per the tech plan (section 3) and system-design doc
 * (/jobs/eliminationJob.ts), not this CRUD endpoint. Wire that job in
 * before this endpoint is used for a real elimination, or the cascade
 * simply won't happen.
 * @param {number} id real_teams.id.
 * @param {"active" | "eliminated"} status New status value.
 */
export async function setRealTeamStatus(
  id: number,
  status: "active" | "eliminated"
): Promise<RealTeamRow | null> {
  return updateRealTeamStatus(id, status);
}
