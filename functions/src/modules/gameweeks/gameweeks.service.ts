import {
  createGameweek,
  findAllGameweeks,
  findCurrentGameweek,
  findGameweekById,
  GameweekRow,
  updateGameweekFlags,
} from "./gameweeks.repository";

/**
 * Returns all gameweeks in season order.
 */
export async function getAllGameweeks(): Promise<GameweekRow[]> {
  return findAllGameweeks();
}

/**
 * Returns one gameweek by id, or null if it doesn't exist.
 * @param {number} id gameweeks.id.
 */
export async function getGameweekById(id: number): Promise<GameweekRow | null> {
  return findGameweekById(id);
}

/**
 * Returns the current (earliest not-yet-finished) gameweek, or null if
 * the season hasn't been scheduled yet / every gameweek is finished.
 */
export async function getCurrentGameweek(): Promise<GameweekRow | null> {
  return findCurrentGameweek();
}

/**
 * Creates a new gameweek (roster_admin/super_admin only).
 * @param {object} params New gameweek's fields.
 * @param {string} params.label Display label, e.g. "Gameweek 1".
 * @param {"group_stage" | "playoffs"} params.phase Tournament phase.
 * @param {string} params.deadlineTime ISO timestamp squad locks at.
 */
export async function scheduleGameweek(params: {
  label: string;
  phase: "group_stage" | "playoffs";
  deadlineTime: string;
}): Promise<GameweekRow> {
  return createGameweek(params);
}

/**
 * Flips a gameweek's finished / data_checked flags.
 * @param {number} id gameweeks.id.
 * @param {object} params Fields to update.
 * @param {boolean | undefined} params.finished New finished value, if changing.
 * @param {boolean | undefined} params.dataChecked New value, if changing.
 */
export async function updateGameweekStatus(
  id: number,
  params: {finished?: boolean; dataChecked?: boolean}
): Promise<GameweekRow | null> {
  return updateGameweekFlags(id, params);
}
