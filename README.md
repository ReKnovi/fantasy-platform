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
├── dataconnect/           # Firebase Data Connect assets
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

`DATABASE_URL` is optional. If it is set, it overrides the individual
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` values.

## Database Setup

Create the local database and user if they do not already exist. The app expects
the `fantasy_user` role to be able to create tables in the `public` schema.

Example migration command:

```sh
dbmate --url "postgresql://fantasy_user:pass123@localhost:5432/fantasy?sslmode=disable" up
```

Seed the first demo teams and players:

```sh
psql "postgresql://fantasy_user:pass123@localhost:5432/fantasy" \
  -f database/seeds/001_players_seed.sql
```

If dbmate fails with `permission denied for schema public`, grant schema create
permission from a database owner/admin role:

```sh
psql "postgresql://postgres:pass123@localhost:5432/fantasy?sslmode=disable" \
  -c "GRANT CREATE ON SCHEMA public TO fantasy_user;"
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

Run the Firebase all emulator:

```sh
firebase emulators:start
```

metrices and UI visualations available at:

```text
http://127.0.0.1:5000/
http://127.0.0.1:4000/
http://127.0.0.1:9099/
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

| Method | Path           | Auth         | Description                                  |
| ------ | -------------- | ------------ | -------------------------------------------- |
| `POST` | `/dev/auth/id-token` | None | Local-only helper that returns a Firebase Auth emulator ID token. |
| `GET`  | `/health`      | None         | Liveness check without DB access.            |
| `GET`  | `/players`     | Firebase JWT | Returns non-removed players ordered by name. |
| `GET`  | `/players/:id` | Firebase JWT | Returns one visible player by id.            |

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
