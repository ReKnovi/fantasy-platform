import {Pool, PoolClient} from "pg";
import {getPool, withTransaction} from "../../database/pool";

// Both Pool and PoolClient expose a compatible .query() signature —
// this lets read functions run against either a fresh pool connection
// (normal case) or a specific locked client (inside a transaction),
// without duplicating the query logic for each caller type.
type Queryable = Pool | PoolClient;

export interface SquadPlayerRow {
  id: number;
  user_id: string;
  player_id: number;
  purchase_price: number;
  forced_transfer_pending: boolean;
  forced_transfer_deadline: string | null;
  acquired_at: string;
}

export interface SquadPlayerDetailRow extends SquadPlayerRow {
  name: string;
  position: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  real_team_id: number | null;
  is_overseas: boolean;
  now_cost: number;
}

const DETAIL_SELECT = `
  SELECT sp.id, sp.user_id, sp.player_id, sp.purchase_price,
         sp.forced_transfer_pending,
         sp.forced_transfer_deadline, sp.acquired_at,
         p.name, p.position, p.real_team_id, p.is_overseas, p.now_cost
  FROM squad_players sp
  JOIN players p ON p.id = sp.player_id
`;

/**
 * Returns a user's full squad with player details joined in — the
 * primary read path for the "my team" screen.
 *
 * Accepts an optional locked `client` so callers inside a transaction
 * (e.g. transfers.service.ts holding a FOR UPDATE lock on this user's
 * squad_players rows) read the true in-flight state instead of a
 * separate pool connection that could see stale pre-lock data.
 * @param {string} userId users.id.
 * @param {Queryable | undefined} client Optional locked transaction client.
 */
export async function findSquadByUserId(
  userId: string,
  client?: Queryable
): Promise<SquadPlayerDetailRow[]> {
  const queryable = client ?? (await getPool());
  const result = await queryable.query<SquadPlayerDetailRow>(
    `${DETAIL_SELECT} WHERE sp.user_id = $1 ORDER BY p.position, p.name`,
    [userId]
  );
  return result.rows;
}

export interface PlayerForValidation {
  id: number;
  position: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  is_overseas: boolean;
  real_team_id: number | null;
  now_cost: number;
  status: "available" | "injured" | "unavailable" | "suspended";
  removed: boolean;
}

/**
 * Fetches the exact set of players a proposed squad references, for
 * server-side validation (role/overseas/franchise/budget/eligibility) —
 * never trust client-submitted position/price/is_overseas values, since
 * those all live authoritatively on the players row.
 *
 * Accepts an optional locked `client` for the same reason as
 * findSquadByUserId above — kept consistent even though `players` isn't
 * currently written to inside the transfer transaction, since that
 * changes the moment priceUpdateJob (tech plan §11) lands.
 * @param {number[]} playerIds Proposed squad's player ids.
 * @param {Queryable | undefined} client Optional locked transaction client.
 */
export async function findPlayersForValidation(
  playerIds: number[],
  client?: Queryable
): Promise<PlayerForValidation[]> {
  const queryable = client ?? (await getPool());
  const result = await queryable.query<PlayerForValidation>(
    `SELECT id, position, is_overseas, real_team_id, now_cost, status, removed
     FROM players WHERE id = ANY($1::int[])`,
    [playerIds]
  );
  return result.rows;
}

// Matches the user_chips.chip_type CHECK constraint. One row per user per
// chip type gets seeded here, at squad creation — per the combined schema
// doc's own note on user_chips: "seeding is application logic at
// squad-build time, not this migration's concern — see squadService.ts."
// This was previously missing; buildSquad() below is that application
// logic finally landing.
const CHIP_TYPES = ["wildcard", "triple_captain", "bench_boost"] as const;

/**
 * Inserts a full squad for a user, and seeds their three user_chips rows
 * (wildcard/triple_captain/bench_boost, all unused), atomically in one
 * transaction. Callers must have already confirmed the user doesn't have
 * an existing squad (see squadService.buildSquad) — this function itself
 * just performs the inserts; the UNIQUE(user_id, player_id) constraint
 * guards against duplicate player rows within the batch, not against a
 * second squad being built for the same user. (No DB-level "one squad
 * per user" guard exists yet — see squad.service.ts for why that's an
 * accepted MVP gap, not an oversight.)
 * @param {string} userId users.id.
 * @param {{playerId: number, purchasePrice: number}[]} entries Squad entries.
 */
export async function insertSquad(
  userId: string,
  entries: {playerId: number; purchasePrice: number}[]
): Promise<SquadPlayerRow[]> {
  return withTransaction(async (client: PoolClient) => {
    const rows: SquadPlayerRow[] = [];
    for (const entry of entries) {
      const result = await client.query<SquadPlayerRow>(
        `INSERT INTO squad_players (user_id, player_id, purchase_price)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, player_id, purchase_price,
                   forced_transfer_pending,
                   forced_transfer_deadline, acquired_at`,
        [userId, entry.playerId, entry.purchasePrice]
      );
      rows.push(result.rows[0]);
    }

    for (const chipType of CHIP_TYPES) {
      await client.query(
        `INSERT INTO user_chips (user_id, chip_type)
         VALUES ($1, $2)
         ON CONFLICT (user_id, chip_type) DO NOTHING`,
        [userId, chipType]
      );
    }

    return rows;
  });
}
