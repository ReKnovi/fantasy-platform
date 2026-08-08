-- migrate:up

CREATE UNIQUE INDEX users_auth_provider_id_unique
ON users (auth_provider_id)
WHERE auth_provider_id IS NOT NULL;


-- migrate:down

DROP INDEX IF EXISTS users_auth_provider_id_unique;
