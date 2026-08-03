# API Collections

Import one of these files into your API client:

- `fantasy-platform.postman_collection.json` for Postman.
- `fantasy-platform.hoppscotch_collection.json` for Hoppscotch.

## Variables

Set these collection/environment variables:

| Variable          | Local Firebase emulator value                                      |
| ----------------- | ------------------------------------------------------------------ |
| `baseUrl`         | `http://localhost:5001/premier-league-af352/us-central1/api`       |
| `authEmulatorUrl` | `http://127.0.0.1:9099`                                            |
| `firebaseIdToken` | Paste a Firebase Auth ID token from the signed-in browser session. |
| `authEmail`       | `postman@example.test`                                             |
| `authPassword`    | `postman-password`                                                 |
| `playerId`        | `1`                                                                |

For the plain HTTP server (`npm run serve:http` inside `functions/`), use:

```text
baseUrl=http://localhost:8080
```

## Included Requests

| Method | Path                 | Auth         | Description                                                       |
| ------ | -------------------- | ------------ | ----------------------------------------------------------------- |
| `POST` | `/dev/auth/id-token` | None         | Local-only helper that returns a Firebase Auth emulator ID token. |
| `GET`  | `/health`            | None         | Liveness check without DB access.                                 |
| `GET`  | `/players`           | Bearer token | Returns non-removed players ordered by name.                      |
| `GET`  | `/players/:id`       | Bearer token | Returns one visible player by id.                                 |

## Firebase Auth

In Postman, run `Dev Auth / Get Firebase ID Token` first. The test script saves
the returned token into `firebaseIdToken` automatically.

In Hoppscotch, run `Dev Auth / Get Firebase ID Token`, copy `idToken` from the
response, and paste it into `firebaseIdToken`.

Protected requests send:

```text
Authorization: Bearer <<firebaseIdToken>>
```
