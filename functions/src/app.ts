import express from "express";
import cors from "cors";
import {playersRouter} from "./modules/players/players.routes";
import {requireFirebaseAuth} from "./middleware/firebaseAuth";
import {devAuthRouter} from "./modules/dev/devAuth.routes";
import {usersRouter} from "./modules/users/users.routes";
import {realTeamsRouter} from "./modules/realTeams/realTeams.routes";
import {gameweeksRouter} from "./modules/gameweeks/gameweeks.routes";
import {matchesRouter} from "./modules/matches/matches.routes";
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

app.use(notFoundHandler);
app.use(errorHandler);
