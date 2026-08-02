import express from "express";
import cors from "cors";
import {playersRouter} from "./modules/players/players.routes";

export const app = express();

app.use(cors({origin: true}));
app.use(express.json());

// Quick liveness check: hits no DB, just confirms the process is up.
app.get("/health", (_req, res) => {
  res.json({status: "ok"});
});

app.use("/players", playersRouter);
