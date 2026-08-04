import {DecodedIdToken} from "firebase-admin/auth";
import {
  createUser,
  findUserByAuthProviderId,
  UserRow,
} from "./users.repository";

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
  if (existing) {
    return existing;
  }

  // Google accounts always carry an email, so the fallback below is mostly
  // a defensive no-op — phone_or_email is NOT NULL UNIQUE and needs
  // something. decoded.name is Google's account display name, when present.
  const email = decoded.email ?? `${decoded.uid}@unknown.local`;
  const displayName = typeof decoded.name === "string" ? decoded.name : email;

  return createUser({authProviderId: decoded.uid, email, displayName});
}
