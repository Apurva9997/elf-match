-- A deleted account or exchange must not leave a row behind.
-- These foreign keys previously blocked that, or kept a renamed seat.

ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_users_id_fk;
ALTER TABLE teams
  ADD CONSTRAINT teams_created_by_users_id_fk
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_users_id_fk;
ALTER TABLE team_members
  ADD CONSTRAINT team_members_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_giver_id_team_members_id_fk;
ALTER TABLE assignments
  ADD CONSTRAINT assignments_giver_id_team_members_id_fk
  FOREIGN KEY (giver_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_receiver_id_team_members_id_fk;
ALTER TABLE assignments
  ADD CONSTRAINT assignments_receiver_id_team_members_id_fk
  FOREIGN KEY (receiver_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE exclusions DROP CONSTRAINT IF EXISTS exclusions_member_1_id_team_members_id_fk;
ALTER TABLE exclusions
  ADD CONSTRAINT exclusions_member_1_id_team_members_id_fk
  FOREIGN KEY (member_1_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE exclusions DROP CONSTRAINT IF EXISTS exclusions_member_2_id_team_members_id_fk;
ALTER TABLE exclusions
  ADD CONSTRAINT exclusions_member_2_id_team_members_id_fk
  FOREIGN KEY (member_2_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_actor_id_users_id_fk;
ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_actor_id_users_id_fk
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
