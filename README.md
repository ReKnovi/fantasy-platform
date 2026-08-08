# Fantasy Platform

Fantasy Platform is a Firebase-first fantasy sports backend. The current app
exposes a small Express API through Firebase Functions, stores player data in
PostgreSQL, and keeps the same API runnable as a plain HTTP server for a future
VPS/container deployment.

## Stack

- Firebase Functions v2 for the API deploy target.
- Express for HTTP routing.
- PostgreSQL for relational fantasy data.
- dbmate for SQL migrations.
- Firebase Hosting for static frontend assets.
- Docker for the future VPS/cloud-server runtime.
- GitHub Actions for CI/CD.

## Repository Layout

```text
.
├── database/              # SQL migrations, schema snapshots, seed data
├── docs/                  # Operations documentation
├── functions/             # Firebase Functions / Express API
│   ├── src/app.ts         # Shared Express app
│   ├── src/index.ts       # Firebase Functions entrypoint
│   └── src/server.ts      # Plain HTTP server entrypoint for VPS/Docker
├── hosting/               # Firebase Hosting static files
└── .github/workflows/     # CI, Firebase deploy, VPS deploy workflows
```

## Prerequisites

- Node.js 24.
- npm 11.6.2 for the functions package.
- PostgreSQL running locally.
- dbmate installed locally.
- Firebase CLI installed locally if using emulators or deploying manually.
- Docker if testing the VPS/container path.

## Environment

Create a local `.env` from the example:

```sh
cp .env.example .env
```

Set the database values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fantasy
DB_USER=fantasy_user
DB_PASSWORD=pass123
```

`DATABASE_URL` is optional. If it is set, it overrides the individual `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values.

## Database Setup

Create the local database and user if they do not already exist. The app expects
the `fantasy_user` role to be able to create tables in the `public` schema.

dbmate reads its config from `database/.env.dbmate`, not the root `.env` — make
sure `DATABASE_URL`, `DBMATE_MIGRATIONS_DIR`, and `DBMATE_SCHEMA_FILE` are set
there (see `database/.env.dbmate` for the expected values).

Run migrations:

```sh
dbmate up
```

If dbmate fails with `permission denied for schema public`, grant schema create
permission from a database owner/admin role:

```sh
psql "postgresql://postgres:pass123@localhost:5432/fantasy?sslmode=disable" \
  -c "GRANT CREATE ON SCHEMA public TO fantasy_user;"
```

### Seeding

`psql` does not read `.env` automatically — export `DATABASE_URL` into your
shell first:

```sh
export $(grep DATABASE_URL .env | xargs)
```

Seed files must run in order, since later files resolve foreign keys against
earlier ones by name (e.g. `players.real_team_id` via a subquery against
`real_teams.name`):

```sh
psql "$DATABASE_URL" -f database/seeds/01_real_teams.sql
psql "$DATABASE_URL" -f database/seeds/02_players.sql
```

Verify:

```sh
psql "$DATABASE_URL" -c "SELECT count(*) FROM real_teams;"   # expect 8
psql "$DATABASE_URL" -c "SELECT count(*) FROM players;"      # expect 193
```

**Player seed data is provisional**, sourced from Cricsheet ball-by-ball data
rather than official CAN player master data — `position` is heuristically
derived and `is_overseas`/pricing fields are placeholders. See
[docs/data-import/PLAYER_SEED_TODO.md](docs/data-import/PLAYER_SEED_TODO.md)
before treating this data as final.

#### Test/dev fixtures (optional)

`database/seeds/test-only/gameweeks_matches_TEST_ONLY.sql` seeds a synthetic
gameweek/match schedule for exercising deadline and squad-lock logic locally.
**Do not run this against staging or production** — the schedule is not sourced
from an official NPL fixture list. Requires `01_real_teams.sql` (and
`02_players.sql` if testing squad selection) to have run first:

```sh
psql "$DATABASE_URL" -f database/seeds/test-only/gameweeks_matches_TEST_ONLY.sql
```

## Install

Install root dependencies if you need the root package:

```sh
npm install
```

Install functions dependencies:

```sh
cd functions
npm ci
```

## Run Locally

Two processes need to run together — one recompiles TypeScript on save, the
other runs the emulators.

**Terminal 1** — auto-rebuild on save:

```sh
cd functions && npm run build:watch
```

**Terminal 2** — start all emulators (Functions, Hosting, Auth, UI), with Auth
users and other emulator data persisted across restarts:

```sh
npm run emulators
```

Metrics and UI visualizations available at:

| Service                                                      | URL                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| Emulator Suite UI (logs, Auth users, etc.)                   | http://127.0.0.1:4000/                                     |
| Hosting                                                      | http://127.0.0.1:5000/                                     |
| Functions API base                                           | http://127.0.0.1:5001/premier-league-af352/us-central1/api |
| Auth emulator (used internally, not usually opened directly) | http://127.0.0.1:9099/                                     |

To call a protected endpoint locally without a real Google sign-in, get a test
token from the dev-only helper first (disabled outside emulator/dev):

```sh
curl -X POST http://127.0.0.1:5001/premier-league-af352/us-central1/api/dev/auth/id-token \
  -H "Content-Type: application/json" -d '{}'
```

Run the Firebase Functions emulator:

```sh
cd functions
npm run serve
```

The API is available at:

```text
http://localhost:5001/premier-league-af352/us-central1/api
```

Run the same Express app as a plain HTTP server:

```sh
cd functions
npm run serve:http
```

By default the plain HTTP server listens on:

```text
http://localhost:8080
```

## API

Importable client collections are available in
[api/collections](api/collections):

- [Postman collection](api/collections/fantasy-platform.postman_collection.json)
- [Hoppscotch collection](api/collections/fantasy-platform.hoppscotch_collection.json)

Health check:

```sh
curl http://localhost:5001/premier-league-af352/us-central1/api/health
```

Get a local Firebase Auth emulator ID token for API clients:

```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"postman@example.test","password":"postman-password"}' \
  http://localhost:5001/premier-league-af352/us-central1/api/dev/auth/id-token
```

Players list:

```sh
curl -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  http://localhost:5001/premier-league-af352/us-central1/api/players
```

Single player:

```sh
curl -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  http://localhost:5001/premier-league-af352/us-central1/api/players/1
```

Current endpoints:

| Method | Path                 | Auth         | Description                                                       |
| ------ | -------------------- | ------------ | ----------------------------------------------------------------- |
| `POST` | `/dev/auth/id-token` | None         | Local-only helper that returns a Firebase Auth emulator ID token. |
| `GET`  | `/health`            | None         | Liveness check without DB access.                                 |
| `GET`  | `/players`           | Firebase JWT | Returns non-removed players ordered by name.                      |
| `GET`  | `/players/:id`       | Firebase JWT | Returns one visible player by id.                                 |

Google sign-in is implemented in the hosted app. In local development the
frontend connects to the Firebase Auth emulator at `127.0.0.1:9099`; protected
API requests send the signed-in user's Firebase ID token as a bearer token.

## Quality Checks

Run the functions CI gate locally:

```sh
cd functions
npm run ci
```

This runs ESLint and the TypeScript build.

Build the future VPS container:

```sh
docker build -t fantasy-functions:local functions
```

Run the container locally:

```sh
docker run --rm -p 8080:8080 --env-file .env fantasy-functions:local
```

## Deployment

Firebase deploy:

```sh
firebase deploy --only functions,hosting
```

Functions-only deploy:

```sh
cd functions
npm run deploy
```

CI/CD is documented in [docs/cicd.md](docs/cicd.md). The repository includes:

- CI on pull requests and pushes to `main`.
- Firebase deploy on pushes to `main` and manual workflow dispatch.
- Manual VPS deploy that builds a Docker image and deploys it over SSH.

## GitHub Secrets

For Firebase deployment:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

For VPS deployment later:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_SSH_PORT`
- `VPS_DATABASE_URL`

## Troubleshooting

If `/health` works but `/players` returns `Failed to fetch players`, check the
functions emulator logs. The most common causes are:

- `DATABASE_URL` is set with the wrong password and overrides `DB_PASSWORD`.
- The database has not been migrated.
- The seed file has not been applied.
- `fantasy_user` lacks permission on the `public` schema.

After changing `.env`, restart the Firebase emulator so the function worker
loads the new values.
