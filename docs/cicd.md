# CI/CD

This repository uses one shared backend build path for both deployment targets:

- Firebase now: `functions/src/index.ts` exports the Express app through `onRequest`.
- VPS later: `functions/src/server.ts` starts the same Express app with `node lib/server.js`.

The functions package pins npm `11.6.2` so GitHub Actions, Docker, and local installs all evaluate the same lockfile.

## Workflows

- `.github/workflows/ci.yml`
  Runs on pull requests and pushes to `main`. It installs dependencies, runs lint and TypeScript build, then builds the VPS Docker image.

- `.github/workflows/deploy-firebase.yml`
  Runs on pushes to `main` and manual dispatch. It verifies the functions package and deploys Firebase Functions plus Hosting.

- `.github/workflows/deploy-vps.yml`
  Manual only. Runs its own lint/build gate first (`verify`), then builds and pushes the functions Docker image to GHCR, then deploys that image over SSH to a VPS. After starting the new container, it polls `/health` for up to ~20 seconds; if the new container never reports healthy, it rolls back to the previous container automatically and fails the run rather than leaving a broken deploy silently marked "success".

## GitHub Environments

Create these GitHub environments:

- `firebase-production`
- `vps-production`

Use environment approvals for production if the repo is shared.

## Firebase Secrets And Variables

Add this repository or environment variable:

- `FIREBASE_PROJECT_ID`: Firebase project id, for example `premier-league-af352`.

Add this repository or environment secret:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON key for a service account allowed to deploy Firebase Functions and Hosting.

The Firebase CLI supports Application Default Credentials in CI. The workflow uses `google-github-actions/auth` to expose those credentials before running `firebase deploy`.

Minimum practical roles for the service account depend on enabled Firebase resources, but this project deploys Functions and Hosting, so start with Firebase/Cloud Functions/Cloud Run/Artifact Registry permissions for the Firebase project.

## VPS Secrets

Add these only when the VPS target is ready:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_SSH_PORT`
- `VPS_DATABASE_URL`

The VPS must have Docker installed and must be able to pull from GHCR. The app listens on port `8080` inside the container.

## Local Commands

From `functions/`:

```sh
npm run ci
npm run serve
npm run serve:http
docker build -t fantasy-functions:local .
docker run --rm -p 8080:8080 --env-file ../.env fantasy-functions:local
```

Use `serve` for Firebase emulator behavior and `serve:http` for the VPS/container behavior.