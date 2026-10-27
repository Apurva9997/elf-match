-- Lets an organizer copy the same invitation link the email carries.
-- The hashed invitation_token remains the value acceptance checks.
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS invitation_link_token varchar(255);

-- viewed_at is the first time the giver opened their assignment.
-- revealed_at remains the assignment-email delivery stamp.
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS viewed_at timestamp;
