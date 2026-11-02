-- The organizer needs to copy the live address again. Store it on the row.
-- The hash stays what acceptance checks. Expire clears the raw token so a
-- retired address is not kept after it has stopped working.
ALTER TABLE shareable_invite_links
  ADD COLUMN IF NOT EXISTS token varchar(255);
