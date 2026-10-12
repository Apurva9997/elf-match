-- The Clerk cutover added users.clerk_id in schema.ts but never applied it
-- to the production database. Without this column every authenticated query
-- throws and the API reports 401.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS clerk_id varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique
  ON users (clerk_id);
