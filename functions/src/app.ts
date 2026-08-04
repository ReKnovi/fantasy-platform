import express from "express";
import cors from "cors";
import {playersRouter} from "./modules/players/players.routes";
import {requireFirebaseAuth} from "./middleware/firebaseAuth";
import {devAuthRouter} from "./modules/dev/devAuth.routes";
import {usersRouter} from "./modules/users/users.routes";

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
