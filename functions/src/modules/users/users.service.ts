import {DecodedIdToken} from "firebase-admin/auth";
import {
  createUser,
  findUserByAuthProviderId,
  UserRow,
} from "./users.repository";
import {getPool} from "../../database/pool";

/**
 * Returns the app's own `users` row for a verified Firebase token, creating
 * one on first sign-in. requireFirebaseAuth only proves who the caller is
 * to Firebase — this is what turns that into a row the rest of the schema
 * (squads, transfers, leagues) can actually reference.
 * @param {DecodedIdToken} decoded Verified token from
 *   res.locals.firebaseUser.
 */
export async function findOrCreateUser(
  decoded: DecodedIdToken
): Promise<UserRow> {
  const existing = await findUserByAuthProviderId(decoded.uid);
  console.log("decoded", decoded, "existing", existing);

  if (existing) {
    return existing;
  }

  if (!decoded.email || !decoded.email_verified) {
    throw new Error("Verified email required");
  }

  const existingByEmail = await findUserByPhoneOrEmail(decoded.email);

  if (existingByEmail) {
    // Link the Firebase identity to the existing account.
    return linkAuthProviderId(existingByEmail.id, decoded.uid);
  }

  return createUser({
    authProviderId: decoded.uid,
    email: decoded.email,
    displayName:
      typeof decoded.name === "string" ? decoded.name : decoded.email,
  });
}

export async function findUserByPhoneOrEmail(
  phoneOrEmail: string
): Promise<UserRow | null> {
  const pool = await getPool();

  const result = await pool.query<UserRow>(
    `
      SELECT
        id,
        display_name,
        phone_or_email,
        auth_provider_id,
        created_at,
        role
      FROM users
      WHERE phone_or_email = $1
      LIMIT 1
    `,
    [phoneOrEmail]
  );

  return result.rows[0] ?? null;
}

export async function linkAuthProviderId(
  userId: string,
  authProviderId: string
): Promise<UserRow> {
  const pool = await getPool();

  const result = await pool.query<UserRow>(
    `
      UPDATE users
      SET auth_provider_id = $1
      WHERE id = $2
      RETURNING
        id,
        display_name,
        phone_or_email,
        auth_provider_id,
        created_at,
        role
    `,
    [authProviderId, userId]
  );

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return result.rows[0];
}
