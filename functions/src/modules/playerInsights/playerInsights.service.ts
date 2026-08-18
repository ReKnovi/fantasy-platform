import {
  findPlayerBaseLine,
  findPlayerStatsAggregate,
  findPlayerPointsHistory,
  findPlayerMarketStats,
  findPlayerTransferActivity,
  findPlayerTallyAndBattingBreakdown,
} from "./playerInsights.repository";
import {notFound} from "../../errors/errors";

export async function getPlayerInsights(playerId: number, gameweekId: number) {
  // 1. fetching all database queries at the same time
  const [
    baseline,
    stats,
    pointsHistory,
    marketStats,
    transferActivity,
    tallyBreakdown,
  ] = await Promise.all([
    findPlayerBaseLine(playerId),
    findPlayerStatsAggregate(playerId),
    findPlayerPointsHistory(playerId),
    findPlayerMarketStats(playerId, gameweekId),
    findPlayerTransferActivity(playerId, gameweekId),
    findPlayerTallyAndBattingBreakdown(playerId),
  ]);

  if (!baseline) {
    throw notFound(`Player with id ${playerId} not found`);
  }

  // 2. calculating the boundary percentage
  let boundaryPercentage = 0;
  let boundaryPercentageAlt = 0;

  const boundaryRuns =
    Number(stats?.total_fours) * 4 + Number(stats?.total_sixes) * 6;

  const totalBoundaryRuns =
    Number(stats?.total_fours) + Number(stats?.total_sixes);

  if (Number(stats?.total_runs) > 0) {
    boundaryPercentage = (boundaryRuns / Number(stats?.total_runs)) * 100;
    boundaryPercentageAlt =
      (totalBoundaryRuns / Number(stats?.balls_faced)) * 100;
  }

  // 3. calculating the total points and value pick
  const totalPoints = pointsHistory.reduce(
    (sum, gw) => sum + Number(gw.total_points),
    0
  );

  let pointsPerPrice = 0;
  if (Number(baseline.now_cost) > 0) {
    pointsPerPrice = totalPoints / Number(baseline.now_cost);
  }

  // 4. Calculate the recent form
  let recentForm = 0;
  if (pointsHistory.length > 0) {
    const lastThree = pointsHistory.slice(-3);
    const lastThreePoints = lastThree.reduce(
      (sum, gw) => sum + Number(gw.total_points),
      0
    );
    recentForm = lastThreePoints / lastThree.length;
  }

  // 5. Calculate selection percentages
  let selectedPercentage = 0;
  let captainPercentage = 0;
  let viceCaptainPercentage = 0;

  const totalUsers = Number(marketStats?.total_active_users);
  if (totalUsers > 0) {
    selectedPercentage =
      (Number(marketStats?.total_selections) / totalUsers) * 100;
    captainPercentage =
      (Number(marketStats?.captain_selections) / totalUsers) * 100;
    viceCaptainPercentage =
      (Number(marketStats?.vice_captain_selections) / totalUsers) * 100;
  }

  /**
   * ========================================================================
   * PENDING PLAYER INSIGHTS FEATURES TO IMPLEMENT LATER:
   * ========================================================================
   * 1. Batting Points Breakdown by Category:
   *    - Extract category-specific batting point metrics (Runs vs.
   *      boundary bonus vs. SR bonus) from player_match_points.
   *
   * 2. Playing XI Confirmation Badge:
   *    - Add a status indicator ("Confirmed" vs "Pending Toss").
   * ========================================================================
   */

  return {
    profile: {
      currentPrice: baseline.now_cost,
      realAuctionPriceTrivia: baseline.real_acquisition_price_npr_lakh,
    },
    performance: {
      totalPoints: totalPoints,
      pointsPerPrice: parseFloat(pointsPerPrice.toFixed(2)),
      recentForm: parseFloat(recentForm.toFixed(1)),
      potmTally: tallyBreakdown,
      gwHistory: pointsHistory.map((gw) => ({
        gameweekId: gw.match_id,
        totalPoints: Number(gw.total_points),
      })),
    },
    battingBreakdown: {
      totalRuns: Number(stats?.total_runs) ?? 0,
      totalFours: Number(stats?.total_fours) ?? 0,
      totalSixes: Number(stats?.total_sixes) ?? 0,
      ballsFaced: Number(stats?.balls_faced) ?? 0,
      boundaryPercentage: parseFloat(boundaryPercentage.toFixed(2)),
      boundaryPercentageAlt: parseFloat(boundaryPercentageAlt.toFixed(2)),
    },
    marketStats: {
      selectedPercentage: parseFloat(selectedPercentage.toFixed(2)),
      captainPercentage: parseFloat(captainPercentage.toFixed(2)),
      viceCaptainPercentage: parseFloat(viceCaptainPercentage.toFixed(2)),
      transfersIn: Number(transferActivity.transfers_in),
      transfersOut: Number(transferActivity.transfers_out),
      netTransfers: Number(transferActivity.net_transfers),
    },
  };
}
