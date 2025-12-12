import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teams (Secret Santa groups)
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  budgetMin: decimal("budget_min", { precision: 10, scale: 2 }),
  budgetMax: decimal("budget_max", { precision: 10, scale: 2 }),
  exchangeDate: date("exchange_date"),
  wishlistDeadline: date("wishlist_deadline"),
  status: varchar("status", { length: 50 })
    .default("collecting_wishes")
    .notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team memberships with roles
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    role: varchar("role", { length: 50 }).default("member").notNull(),
    invitationStatus: varchar("invitation_status", { length: 50 })
      .default("pending")
      .notNull(),
    invitationToken: varchar("invitation_token", { length: 255 }).unique(),
    invitedEmail: varchar("invited_email", { length: 255 }),
    invitedAt: timestamp("invited_at").defaultNow(),
    joinedAt: timestamp("joined_at"),
  },
  (table) => ({
    teamUserIdx: uniqueIndex("team_user_idx").on(table.teamId, table.userId),
    teamEmailIdx: uniqueIndex("team_email_idx").on(
      table.teamId,
      table.invitedEmail
    ),
  })
);

// Wishlists
export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamMemberId: uuid("team_member_id")
    .references(() => teamMembers.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual wish items
export const wishItems = pgTable("wish_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  wishlistId: uuid("wishlist_id")
    .references(() => wishlists.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url"),
  priceEstimate: decimal("price_estimate", { precision: 10, scale: 2 }),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shipping addresses
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamMemberId: uuid("team_member_id")
    .references(() => teamMembers.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  streetLine1: varchar("street_line_1", { length: 255 }).notNull(),
  streetLine2: varchar("street_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Secret Santa assignments
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    giverId: uuid("giver_id")
      .references(() => teamMembers.id)
      .notNull(),
    receiverId: uuid("receiver_id")
      .references(() => teamMembers.id)
      .notNull(),
    revealedAt: timestamp("revealed_at"),
    giftStatus: varchar("gift_status", { length: 50 })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    teamGiverIdx: uniqueIndex("team_giver_idx").on(table.teamId, table.giverId),
    teamReceiverIdx: uniqueIndex("team_receiver_idx").on(
      table.teamId,
      table.receiverId
    ),
  })
);

// Exclusion rules (people who shouldn't be matched)
export const exclusions = pgTable("exclusions", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  member1Id: uuid("member_1_id")
    .references(() => teamMembers.id)
    .notNull(),
  member2Id: uuid("member_2_id")
    .references(() => teamMembers.id)
    .notNull(),
  reason: varchar("reason", { length: 255 }),
  bidirectional: boolean("bidirectional").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Magic link tokens for authentication
export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity log for transparency
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  createdTeams: many(teams),
  activityLogs: many(activityLog),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
  }),
  members: many(teamMembers),
  assignments: many(assignments),
  exclusions: many(exclusions),
  activityLogs: many(activityLog),
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  wishlist: one(wishlists),
  address: one(addresses),
  giverAssignments: many(assignments, { relationName: "giver" }),
  receiverAssignments: many(assignments, { relationName: "receiver" }),
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  teamMember: one(teamMembers, {
    fields: [wishlists.teamMemberId],
    references: [teamMembers.id],
  }),
  items: many(wishItems),
}));

export const wishItemsRelations = relations(wishItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishItems.wishlistId],
    references: [wishlists.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  teamMember: one(teamMembers, {
    fields: [addresses.teamMemberId],
    references: [teamMembers.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  team: one(teams, {
    fields: [assignments.teamId],
    references: [teams.id],
  }),
  giver: one(teamMembers, {
    fields: [assignments.giverId],
    references: [teamMembers.id],
    relationName: "giver",
  }),
  receiver: one(teamMembers, {
    fields: [assignments.receiverId],
    references: [teamMembers.id],
    relationName: "receiver",
  }),
}));

export const exclusionsRelations = relations(exclusions, ({ one }) => ({
  team: one(teams, {
    fields: [exclusions.teamId],
    references: [teams.id],
  }),
  member1: one(teamMembers, {
    fields: [exclusions.member1Id],
    references: [teamMembers.id],
    relationName: "member1",
  }),
  member2: one(teamMembers, {
    fields: [exclusions.member2Id],
    references: [teamMembers.id],
    relationName: "member2",
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;
export type WishItem = typeof wishItems.$inferSelect;
export type NewWishItem = typeof wishItems.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Exclusion = typeof exclusions.$inferSelect;
export type NewExclusion = typeof exclusions.$inferInsert;
export type MagicLink = typeof magicLinks.$inferSelect;
export type NewMagicLink = typeof magicLinks.$inferInsert;
