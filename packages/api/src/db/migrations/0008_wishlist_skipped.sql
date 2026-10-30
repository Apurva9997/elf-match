-- A membership can decline to leave wishes. That is a choice, not an empty letter.
-- Items already saved stay. A later wish clears the decline.

ALTER TABLE wishlists
  ADD COLUMN IF NOT EXISTS skipped boolean NOT NULL DEFAULT false;
