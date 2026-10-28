-- An archived exchange leaves the active list. The draw and wishlists stay.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS archived_at timestamp;
