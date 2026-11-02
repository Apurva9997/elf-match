-- A shareable invite link is its own row, not a single hash on the exchange.
-- Expire retires the address. Turning signing off does not.
-- An existing hash becomes one live row so a link already shared still works.
-- The raw token was not stored by this migration. A later migration adds
-- a token column so a newly generated address can be copied again.

CREATE TABLE IF NOT EXISTS shareable_invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  token_hash varchar(255) NOT NULL UNIQUE,
  signing_on boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  expired_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS shareable_invite_links_one_live
  ON shareable_invite_links (team_id)
  WHERE expired_at IS NULL;

INSERT INTO shareable_invite_links (team_id, token_hash, signing_on)
SELECT id, invite_link_token, true
FROM teams
WHERE invite_link_token IS NOT NULL
ON CONFLICT (token_hash) DO NOTHING;

ALTER TABLE teams DROP COLUMN IF EXISTS invite_link_token;
