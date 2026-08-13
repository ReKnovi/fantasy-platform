import express from "express";
import cors from "cors";
import {playersRouter} from "./modules/players/players.routes";
import {requireFirebaseAuth} from "./middleware/firebaseAuth";
import {devAuthRouter} from "./modules/dev/devAuth.routes";
import {usersRouter} from "./modules/users/users.routes";
import {realTeamsRouter} from "./modules/realTeams/realTeams.routes";
import {gameweeksRouter} from "./modules/gameweeks/gameweeks.routes";
import {matchesRouter} from "./modules/matches/matches.routes";
import {playingXiRouter} from "./modules/playingXi/playingXi.routes";
import {playerMatchStatsRouter} from "./modules/playerMS/playerMS.routes";
import {squadSelectionRouter} from "./modules/squadSelection/squadSelection.routes";
import {leaguesRouter} from "./modules/leagues/leagues.routes";
import {squadRouter} from "./modules/squad/squad.routes";
import {transfersRouter} from "./modules/transfers/transfers.routes";
import {errorHandler} from "./middleware/errorHandler";
import {notFoundHandler} from "./middleware/notFoundHandler";
import {apiRateLimiter, authRateLimiter} from "./middleware/rateLimiter";

export const app = express();

// Firebase Functions/Cloud Run sits behind Google's proxy — trust exactly
// one hop so req.ip reads the real client IP from X-Forwarded-For, not
// the proxy's own address. Don't use `true` here (see note below).
app.set("trust proxy", 1);

app.use(cors({origin: true}));
app.use(express.json());

// Quick liveness check: hits no DB, just confirms the process is up.
app.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

app.use("/dev/auth", authRateLimiter, devAuthRouter);
app.use("/players", apiRateLimiter, requireFirebaseAuth, playersRouter);
app.use("/users", apiRateLimiter, requireFirebaseAuth, usersRouter);
app.use("/real-teams", apiRateLimiter, requireFirebaseAuth, realTeamsRouter);
app.use("/gameweeks", apiRateLimiter, requireFirebaseAuth, gameweeksRouter);
app.use("/matches", apiRateLimiter, requireFirebaseAuth, matchesRouter);
app.use("/playing-xi", apiRateLimiter, requireFirebaseAuth, playingXiRouter);
app.use("/leagues", apiRateLimiter, requireFirebaseAuth, leaguesRouter);
app.use(
  "/player-match-stats",
  apiRateLimiter,
  requireFirebaseAuth,
  playerMatchStatsRouter
);
app.use("/squad", apiRateLimiter, requireFirebaseAuth, squadRouter);
app.use(
  "/squad-selection",
  apiRateLimiter,
  requireFirebaseAuth,
  squadSelectionRouter
);
app.use("/transfers", apiRateLimiter, requireFirebaseAuth, transfersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
