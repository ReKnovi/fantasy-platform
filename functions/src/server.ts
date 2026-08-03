import {app} from "./app";
import {closePool} from "./database/pool";

const port = Number(process.env.PORT ?? "8080");

const server = app.listen(port, () => {
  console.log(`Fantasy API listening on port ${port}`);
});

const shutdown = (signal: string): void => {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => {
    closePool()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Failed to close Postgres pool", err);
        process.exit(1);
      });
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);