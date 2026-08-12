import {badRequest, conflict, forbidden, notFound} from "../../errors/errors";
import {
  createLeagueWithCreator,
  findLeagueById,
  findLeagueByJoinCode,
  findLeaguesForUser,
  findMembersByLeagueId,
  findMembership,
  insertMembership,
  LeagueMemberDetailRow,
  LeagueMembershipRow,
  LeagueRow,
  LeagueWithMemberCount,
} from "./leagues.repository";

const MAX_LEAGUE_NAME_LENGTH = 60;

/**
 * Creates a league and auto-joins the creator. See the tech plan's cut
 * list (section 16): this game ships "classic leaderboard + private
 * leagues only" — leagues are invite-code-gated, there's no public
 * league directory or head-to-head/cup format.
 * @param {string} creatorId users.id of the league creator.
 * @param {string} name League display name.
 */
export async function createLeague(
  creatorId: string,
  name: string
): Promise<{league: LeagueRow; membership: LeagueMembershipRow}> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw badRequest("name is required");
  }
  if (trimmed.length > MAX_LEAGUE_NAME_LENGTH) {
    throw badRequest(
      `name must be ${MAX_LEAGUE_NAME_LENGTH} characters or fewer`
    );
  }
  return createLeagueWithCreator(trimmed, creatorId);
}

/**
 * Joins a user to a league via its invite code.
 * @param {string} userId users.id of the user joining.
 * @param {string} joinCode The league's invite code.
 */
export async function joinLeague(
  userId: string,
  joinCode: string
): Promise<{league: LeagueRow; membership: LeagueMembershipRow}> {
  const normalizedCode = joinCode.trim().toUpperCase();
  if (normalizedCode.length === 0) {
    throw badRequest("joinCode is required");
  }

  const league = await findLeagueByJoinCode(normalizedCode);
  if (!league) {
    throw notFound("No league found with that join code");
  }

  const existing = await findMembership(league.id, userId);
  if (existing) {
    throw conflict("You are already a member of this league");
  }

  const membership = await insertMembership(league.id, userId);
  return {league, membership};
}

/**
 * Returns every league a user belongs to.
 * @param {string} userId users.id.
 */
export async function getMyLeagues(
  userId: string
): Promise<LeagueWithMemberCount[]> {
  return findLeaguesForUser(userId);
}

/**
 * Returns a league's details and member list — but only to its own
 * members. Leagues are private, invite-code-gated groups (see
 * createLeague above), so a non-member has no legitimate reason to see
 * who's in one.
 * @param {string} userId users.id of the requester.
 * @param {number} leagueId leagues.id.
 */
export async function getLeagueDetail(
  userId: string,
  leagueId: number
): Promise<{league: LeagueRow; members: LeagueMemberDetailRow[]}> {
  const league = await findLeagueById(leagueId);
  if (!league) {
    throw notFound("League not found");
  }

  const membership = await findMembership(leagueId, userId);
  if (!membership) {
    throw forbidden("You are not a member of this league");
  }

  const members = await findMembersByLeagueId(leagueId);
  return {league, members};
}
