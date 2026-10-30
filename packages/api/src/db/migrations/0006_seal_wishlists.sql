-- Wishlist titles, notes, and shop links are sealed before storage.
-- A sealed title does not fit in varchar(255).

ALTER TABLE wish_items
  ALTER COLUMN title TYPE text;
