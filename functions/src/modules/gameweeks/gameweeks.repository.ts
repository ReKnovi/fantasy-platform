import {getPool} from "../../database/pool";

export interface GameweekRow {
  id: number;
  label: string;
  phase: "group_stage" | "playoffs";
  deadline_time: string;
  finished: boolean;
  data_checked: boolean;
}

const BASE_SELECT = `
  SELECT id, label, phase, deadline_time, finished, data_checked
  FROM gameweeks
`;

/**
 * Returns all gameweeks ordered by deadline (season order).
 */
export async function findAllGameweeks(): Promise<GameweekRow[]> {
  const pool = await getPool();
  const result = await pool.query<GameweekRow>(
    `${BASE_SELECT} ORDER BY deadline_time ASC`
  );
  return result.rows;
}

/**
 * Returns one gameweek by id.
 * @param {number} id gameweeks.id.
 */
export async function findGameweekById(
  id: number
): Promise<GameweekRow | null> {
  const pool = await getPool();
  const result = await pool.query<GameweekRow>(`${BASE_SELECT} WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] ?? null;
}

/**
 * Returns the "current" gameweek: the earliest not-yet-finished one by
 * deadline. This is what squad-lock / transfer-window UI should treat as
 * "the gameweek you're currently acting on" — whether its deadline is
 * still ahead (open for changes) or has just passed with matches still
 * being played (locked, awaiting results) is a separate check the caller
 * makes against deadline_time, not something this query decides.
 */
export async function findCurrentGameweek(): Promise<GameweekRow | null> {
  const pool = await getPool();
  const result = await pool.query<GameweekRow>(
    `${BASE_SELECT} WHERE finished = false ORDER BY deadline_time ASC LIMIT 1`
  );
  return result.rows[0] ?? null;
}

/**
 * Creates a new gameweek. Admin-only — see gameweeks.routes.ts.
 * @param {object} params New gameweek's fields.
 * @param {string} params.label Display label, e.g. "Gameweek 1".
 * @param {"group_stage" | "playoffs"} params.phase Tournament phase.
 * @param {string} params.deadlineTime ISO timestamp squad locks at.
 */
export async function createGameweek(params: {
  label: string;
  phase: "group_stage" | "playoffs";
  deadlineTime: string;
}): Promise<GameweekRow> {
  const pool = await getPool();
  const result = await pool.query<GameweekRow>(
    `INSERT INTO gameweeks (label, phase, deadline_time)
     VALUES ($1, $2, $3)
     RETURNING id, label, phase, deadline_time, finished, data_checked`,
    [params.label, params.phase, params.deadlineTime]
  );
  return result.rows[0];
}

/**
 * Updates mutable gameweek fields (finished / data_checked). Both are
 * admin-driven state flips, not user-facing edits — finished marks all of
 * that round's matches complete (gates the squad aggregation job per the
 * points-calculation doc, section 7); data_checked is a separate "an
 * admin reviewed all scorecards" flag, distinct from finished.
 * @param {number} id gameweeks.id.
 * @param {object} params Fields to update.
 * @param {boolean | undefined} params.finished New finished value, if changing.
 * @param {boolean | undefined} params.dataChecked New value, if changing.
 */
export async function updateGameweekFlags(
  id: number,
  params: {finished?: boolean; dataChecked?: boolean}
): Promise<GameweekRow | null> {
  const pool = await getPool();
  const result = await pool.query<GameweekRow>(
    `UPDATE gameweeks
     SET finished = COALESCE($2, finished),
         data_checked = COALESCE($3, data_checked)
     WHERE id = $1
     RETURNING id, label, phase, deadline_time, finished, data_checked`,
    [id, params.finished ?? null, params.dataChecked ?? null]
  );
  return result.rows[0] ?? null;
}
