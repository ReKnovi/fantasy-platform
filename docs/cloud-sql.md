# Moving Postgres to Cloud SQL

The code is already wired for this (see `functions/src/database/pool.ts`) — it's
inactive until `INSTANCE_CONNECTION_NAME` is set, so local dev is unaffected.
This doc is what to actually do once you're on the Blaze plan and ready to
deploy for real.

## 0. Prerequisites

- Blaze (pay-as-you-go) plan enabled on the Firebase project.
- `gcloud` CLI installed and authenticated (`gcloud auth login`), pointed at
  your project: `gcloud config set project YOUR_PROJECT_ID`.

## 1. Create the instance

Sized for the db-f1-micro tier we costed out (~$12/month all-in):

```bash
gcloud sql instances create npl-fantasy-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-size=10 \
  --storage-type=SSD \
  --backup \
  --backup-start-time=03:00
```

This takes several minutes. Then create the database and app user (don't use the
default `postgres` superuser for the app):

```bash
gcloud sql databases create fantasy --instance=npl-fantasy-db

gcloud sql users create fantasy_user \
  --instance=npl-fantasy-db \
  --password=CHOOSE_A_REAL_PASSWORD
```

Grab the instance connection name (you'll need this exact string twice — once
for migrations, once for the deployed function):

```bash
gcloud sql instances describe npl-fantasy-db --format="value(connectionName)"
# prints: your-project:us-central1:npl-fantasy-db
```

## 2. Run your existing migrations against it

Cloud SQL doesn't expose itself to the open internet, so you tunnel in with the
Cloud SQL Auth Proxy — a small Google-provided binary, separate from the Node.js
connector used in the app code.

```bash
# install once (macOS example — see Google's docs for Linux/Windows)
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# open the tunnel (leave this running in its own terminal)
./cloud-sql-proxy your-project:us-central1:npl-fantasy-db --port 5433
```

With the tunnel open, point `dbmate` at `localhost:5433` — same migrations
folder, same command shape you already use locally:

```bash
DATABASE_URL="postgres://fantasy_user:CHOOSE_A_REAL_PASSWORD@localhost:5433/fantasy?sslmode=disable" \
  dbmate --migrations-dir database/migrations --schema-file database/schema.sql up
```

Nothing in `database/migrations/*.sql` changes — Cloud SQL is standard Postgres,
same engine your Docker container runs.

## 3. Give the function access

The Cloud Function's service account needs the `Cloud SQL Client` IAM role:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

(Adjust the service account email if you're using a non-default one — same
account named in `FIREBASE_SERVICE_ACCOUNT_JSON` in your GitHub secrets.)

## 4. Set the production env vars

These are declared as Secret-Manager-backed secrets in `functions/src/index.ts`
(via `defineSecret`), so they need to be created with
`firebase functions:secrets:set` specifically — a plain `.env.<project-id>` file
or the console's generic env var UI won't reach the function, since only secrets
listed in `index.ts`'s `secrets: [...]` array get injected:

```bash
firebase functions:secrets:set INSTANCE_CONNECTION_NAME
# paste: your-project:us-central1:npl-fantasy-db

firebase functions:secrets:set DB_USER
# paste: fantasy_user

firebase functions:secrets:set DB_PASSWORD
# paste: the real password you set in step 1

firebase functions:secrets:set DB_NAME
# paste: fantasy
```

Each prompts for the value interactively (so it never touches shell history or a
file). Once all four exist, `pool.ts` automatically switches to the Cloud SQL
connector branch on next deploy — no code changes needed at that point, just
these four commands.

## 5. Deploy

```bash
firebase deploy --only functions,hosting
```

or let `deploy-firebase.yml` do it once its secrets are added (see the CI/CD doc
— that workflow is currently manual-trigger-only until then).
