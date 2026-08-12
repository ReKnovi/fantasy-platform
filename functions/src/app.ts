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
import {errorHandler} from "./middleware/errorHandler";
import {notFoundHandler} from "./middleware/notFoundHandler";

export const app = express();

app.use(cors({origin: true}));
app.use(express.json());

// Quick liveness check: hits no DB, just confirms the process is up.
app.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

app.use("/dev/auth", devAuthRouter);
app.use("/players", requireFirebaseAuth, playersRouter);
app.use("/users", usersRouter);
app.use("/real-teams", requireFirebaseAuth, realTeamsRouter);
app.use("/gameweeks", requireFirebaseAuth, gameweeksRouter);
app.use("/matches", requireFirebaseAuth, matchesRouter);
app.use("/playing-xi", requireFirebaseAuth, playingXiRouter);
app.use("/leagues", requireFirebaseAuth, leaguesRouter);
/* eslint-disable operator-linebreak */
app.use("/player-match-stats", requireFirebaseAuth, playerMatchStatsRouter);
/* eslint-enable operator-linebreak */
app.use("/squad", requireFirebaseAuth, squadRouter);
/* eslint-disable operator-linebreak */
app.use("/squad-selection", requireFirebaseAuth, squadSelectionRouter);
/* eslint-enable operator-linebreak */

app.use(notFoundHandler);
app.use(errorHandler);
