-- Existing amounts were entered as rupees. New exchanges choose a currency.
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'INR';
