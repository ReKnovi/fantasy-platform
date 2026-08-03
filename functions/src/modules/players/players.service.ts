import {findAllPlayers, findPlayerById, PlayerRow} from "./players.repository";

/**
 * Thin for now — this is where squad-eligibility filtering, price display
 * formatting (now_cost / 10 = "10.5M"), etc. will live once needed, so
 * routes never talk to the repository directly.
 */
export async function getAllPlayers(): Promise<PlayerRow[]> {
  return findAllPlayers();
}

/**
 * Returns one player by id, or null when no visible player exists.
 * @param {number} id Player database id.
 */
export async function getPlayerById(id: number): Promise<PlayerRow | null> {
  return findPlayerById(id);
}
