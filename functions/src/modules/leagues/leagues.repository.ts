import {randomInt} from "crypto";
import {PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

export interface LeagueRow {
  id: number;
  name: string;
  join_code: string;
  creator_id: string;
  league_type: "classic";
  created_at: string;
}

export interface LeagueMembershipRow {
  id: number;
  league_id: number;
  user_id: string;
  joined_at: string;
}

export interface LeagueWithMemberCount extends LeagueRow {
  member_count: number;
}

export interface LeagueMemberDetailRow {
  user_id: string;
  display_name: string;
  joined_at: string;
}

/**
 * Returns one league by id.
 * @param {number} id leagues.id.
 */
export async function findLeagueById(id: number): Promise<LeagueRow | null> {
  const pool = await getPool();
  const result = await pool.query<LeagueRow>(
    `SELECT id, name, join_code, creator_id, league_type, created_at
     FROM leagues WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Returns one league by its invite code.
 * @param {string} joinCode leagues.join_code.
 */
export async function findLeagueByJoinCode(
  joinCode: string
): Promise<LeagueRow | null> {
  const pool = await getPool();
  const result = await pool.query<LeagueRow>(
    `SELECT id, name, join_code, creator_id, league_type, created_at
     FROM leagues WHERE join_code = $1`,
    [joinCode]
  );
  return result.rows[0] ?? null;
}

/**
 * Returns every league a user belongs to, with a live member count per
 * league — the primary read path for a "my leagues" list screen.
 * @param {string} userId users.id.
 */
export async function findLeaguesForUser(
  userId: string
): Promise<LeagueWithMemberCount[]> {
  const pool = await getPool();
  const result = await pool.query<LeagueWithMemberCount>(
    `SELECT l.id, l.name, l.join_code, l.creator_id, l.league_type, l.created_at,
            COUNT(lm2.id)::int AS member_count
     FROM leagues l
     JOIN league_memberships lm ON lm.league_id = l.id AND lm.user_id = $1
     JOIN league_memberships lm2 ON lm2.league_id = l.id
     GROUP BY l.id
     ORDER BY l.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Returns every member of a league, with their display name — the
 * caller (leagues.service.ts) is responsible for checking that the
 * requester is themself a member before calling this; this function has
 * no access-control opinion of its own.
 * @param {number} leagueId leagues.id.
 */
export async function findMembersByLeagueId(
  leagueId: number
): Promise<LeagueMemberDetailRow[]> {
  const pool = await getPool();
  const result = await pool.query<LeagueMemberDetailRow>(
    `SELECT u.id AS user_id, u.display_name, lm.joined_at
     FROM league_memberships lm
     JOIN users u ON u.id = lm.user_id
     WHERE lm.league_id = $1
     ORDER BY lm.joined_at ASC`,
    [leagueId]
  );
  return result.rows;
}

/**
 * Returns a user's membership row for a league, or null if they aren't
 * a member.
 * @param {number} leagueId leagues.id.
 * @param {string} userId users.id.
 */
export async function findMembership(
  leagueId: number,
  userId: string
): Promise<LeagueMembershipRow | null> {
  const pool = await getPool();
  const result = await pool.query<LeagueMembershipRow>(
    `SELECT id, league_id, user_id, joined_at FROM league_memberships
     WHERE league_id = $1 AND user_id = $2`,
    [leagueId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Inserts a membership row for a user joining a league. Caller is
 * responsible for having already checked they aren't already a member —
 * see leagues.service.ts.
 * @param {number} leagueId leagues.id.
 * @param {string} userId users.id.
 */
export async function insertMembership(
  leagueId: number,
  userId: string
): Promise<LeagueMembershipRow> {
  const pool = await getPool();
  const result = await pool.query<LeagueMembershipRow>(
    `INSERT INTO league_memberships (league_id, user_id)
     VALUES ($1, $2)
     RETURNING id, league_id, user_id, joined_at`,
    [leagueId, userId]
  );
  return result.rows[0];
}

// Excludes visually ambiguous characters (0/O, 1/I) since join codes get
// read aloud and typed by hand — a code someone can't confidently
// transcribe from a screenshot or a shout across a room isn't doing its
// job.
const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JOIN_CODE_LENGTH = 6;
const MAX_JOIN_CODE_ATTEMPTS = 5;

function generateJoinCode(): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_CHARS[randomInt(JOIN_CODE_CHARS.length)];
  }
  return code;
}

/**
 * Creates a league and auto-joins its creator as the first member, both
 * in one transaction — a league with a creator but no membership row (or
 * vice versa) should never be possible to observe.
 *
 * Retries join-code generation on collision (leagues.join_code is UNIQUE)
 * up to MAX_JOIN_CODE_ATTEMPTS times. At 6 chars from a 33-character
 * alphabet that's ~1.3 billion possible codes, so a collision — let alone
 * exhausting every retry — is not a case worth over-engineering for.
 * @param {string} name League display name (already validated by the caller).
 * @param {string} creatorId users.id of the league creator.
 */
export async function createLeagueWithCreator(
  name: string,
  creatorId: string
): Promise<{league: LeagueRow; membership: LeagueMembershipRow}> {
  return withTransaction(async (client: PoolClient) => {
    let league: LeagueRow | undefined;
    for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt++) {
      const joinCode = generateJoinCode();
      const result = await client.query<LeagueRow>(
        `INSERT INTO leagues (name, join_code, creator_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (join_code) DO NOTHING
         RETURNING id, name, join_code, creator_id, league_type, created_at`,
        [name, joinCode, creatorId]
      );
      if (result.rows[0]) {
        league = result.rows[0];
        break;
      }
    }
    if (!league) {
      throw new Error(
        "Failed to generate a unique league join code — please retry"
      );
    }

    const membershipResult = await client.query<LeagueMembershipRow>(
      `INSERT INTO league_memberships (league_id, user_id)
       VALUES ($1, $2)
       RETURNING id, league_id, user_id, joined_at`,
      [league.id, creatorId]
    );

    return {league, membership: membershipResult.rows[0]};
  });
}
