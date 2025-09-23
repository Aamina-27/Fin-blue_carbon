import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, point } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  role: text("role").notNull().$type<"ngo" | "admin">().default("ngo"),
  organizationName: text("organization_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  coordinates: point("coordinates"), // PostGIS point for spatial queries
  areaHectares: decimal("area_hectares", { precision: 10, scale: 2 }).notNull(),
  projectType: text("project_type").notNull().$type<"mangrove" | "seagrass" | "saltmarsh" | "other">(),
  status: text("status").notNull().$type<"pending" | "verified" | "rejected">().default("pending"),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  verifiedBy: varchar("verified_by").references(() => users.id),
  carbonCredits: decimal("carbon_credits", { precision: 10, scale: 2 }).default("0"),
  blockchainTxHash: text("blockchain_tx_hash"),
  ipfsHash: text("ipfs_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

export const fieldData = pgTable("field_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  fileType: text("file_type").notNull().$type<"photo" | "video" | "document">(),
  fileName: text("file_name").notNull(),
  ipfsHash: text("ipfs_hash").notNull(),
  metadata: jsonb("metadata"), // GPS coordinates, timestamp, etc.
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull().$type<"submitted" | "verified" | "rejected" | "credits_minted">(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects, { relationName: "submitted_projects" }),
  verifiedProjects: many(projects, { relationName: "verified_projects" }),
  auditLogs: many(auditLogs),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  submitter: one(users, {
    fields: [projects.submittedBy],
    references: [users.id],
    relationName: "submitted_projects",
  }),
  verifier: one(users, {
    fields: [projects.verifiedBy],
    references: [users.id],
    relationName: "verified_projects",
  }),
  fieldData: many(fieldData),
  auditLogs: many(auditLogs),
}));

export const fieldDataRelations = relations(fieldData, ({ one }) => ({
  project: one(projects, {
    fields: [fieldData.projectId],
    references: [projects.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  project: one(projects, {
    fields: [auditLogs.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
  verifiedBy: true,
  carbonCredits: true,
  blockchainTxHash: true,
  status: true,
});

export const insertFieldDataSchema = createInsertSchema(fieldData).omit({
  id: true,
  uploadedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type FieldData = typeof fieldData.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertFieldData = z.infer<typeof insertFieldDataSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
