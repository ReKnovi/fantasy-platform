import {getPool} from "../../database/pool";

export interface UserRow {
  id: string;
  display_name: string;
  phone_or_email: string;
  auth_provider_id: string | null;
  role: "user" | "scorer_admin" | "roster_admin" | "super_admin";
}

const BASE_SELECT = `
  SELECT id, display_name, phone_or_email, auth_provider_id, role
  FROM users
`;

/**
 * Looks up an app user by Firebase uid (stored in auth_provider_id).
 * @param {string} authProviderId Firebase uid from the verified ID token.
 */
export async function findUserByAuthProviderId(
  authProviderId: string
): Promise<UserRow | null> {
  const pool = await getPool();
  const result = await pool.query<UserRow>(
    `${BASE_SELECT} WHERE auth_provider_id = $1`,
    [authProviderId]
  );
  return result.rows[0] ?? null;
}

/**
 * Creates a new app user row for a first-time sign-in.
 * @param {object} params New user's Firebase-provided details.
 * @param {string} params.authProviderId Firebase uid.
 * @param {string} params.email Account email from the Firebase ID token.
 * @param {string} params.displayName Display name to show in the app.
 */
export async function createUser(params: {
  authProviderId: string;
  email: string;
  displayName: string;
}): Promise<UserRow> {
  const pool = await getPool();
  const result = await pool.query<UserRow>(
    `INSERT INTO users (display_name, phone_or_email, auth_provider_id)
     VALUES ($1, $2, $3)
     RETURNING id, display_name, phone_or_email, auth_provider_id, role`,
    [params.displayName, params.email, params.authProviderId]
  );
  return result.rows[0];
}

/**
 * Updates a user's role. Callers (see users.service.ts / users.routes.ts)
 * are responsible for authorizing this — this function performs no
 * permission checks of its own, it's a plain data write.
 * @param {string} userId users.id.
 * @param {UserRow["role"]} role New role value.
 */
export async function updateUserRole(
  userId: string,
  role: UserRow["role"]
): Promise<UserRow | null> {
  const pool = await getPool();
  const result = await pool.query<UserRow>(
    `UPDATE users SET role = $2 WHERE id = $1
     RETURNING id, display_name, phone_or_email, auth_provider_id, role`,
    [userId, role]
  );
  return result.rows[0] ?? null;
}
