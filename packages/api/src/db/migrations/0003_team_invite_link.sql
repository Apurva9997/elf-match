-- One shareable join link per exchange. Null means there is no open link.
-- Stores the hash of the token, the same way a personal invitation does.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS invite_link_token varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS teams_invite_link_token_unique
  ON teams (invite_link_token);
