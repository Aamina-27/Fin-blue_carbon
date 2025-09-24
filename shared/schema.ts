import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, point } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  role: text("role").notNull().$type<"ngo" | "admin" | "industry" | "government">().default("ngo"),
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

// AI Verification Jobs table
export const aiVerificationJobs = pgTable("ai_verification_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  fieldDataId: varchar("field_data_id").notNull().references(() => fieldData.id),
  modelRunId: text("model_run_id"),
  vegetationMetrics: jsonb("vegetation_metrics"), // canopy density, health score, etc.
  verificationScore: decimal("verification_score", { precision: 5, scale: 4 }), // 0-1 confidence score
  status: text("status").notNull().$type<"pending" | "verified" | "suspicious" | "failed">().default("pending"),
  analysisResults: jsonb("analysis_results"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// GIS Snapshots table  
export const gisSnapshots = pgTable("gis_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  sentinelSceneId: text("sentinel_scene_id"),
  geometry: jsonb("geometry"), // GeoJSON polygon
  areaValidatedHa: decimal("area_validated_ha", { precision: 10, scale: 2 }),
  ndviStats: jsonb("ndvi_stats"),
  imageryDate: timestamp("imagery_date"),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
});

// NFT Certificates table
export const nftCertificates = pgTable("nft_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenId: text("token_id").notNull().unique(),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  metadataCID: text("metadata_cid").notNull(),
  ownerWallet: text("owner_wallet").notNull(),
  mintedTxHash: text("minted_tx_hash").notNull(),
  contractAddress: text("contract_address").notNull(),
  mintedAt: timestamp("minted_at").defaultNow().notNull(),
});

// Registry Locks table for double-counting prevention
export const registryLocks = pgTable("registry_locks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  source: text("source").notNull().$type<"coordinates" | "area" | "ipfs_hash">(),
  hashDigest: text("hash_digest").notNull().unique(),
  lockedAt: timestamp("locked_at").defaultNow().notNull(),
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

export const aiVerificationJobsRelations = relations(aiVerificationJobs, ({ one }) => ({
  project: one(projects, {
    fields: [aiVerificationJobs.projectId],
    references: [projects.id],
  }),
  fieldData: one(fieldData, {
    fields: [aiVerificationJobs.fieldDataId],
    references: [fieldData.id],
  }),
}));

export const gisSnapshotsRelations = relations(gisSnapshots, ({ one }) => ({
  project: one(projects, {
    fields: [gisSnapshots.projectId],
    references: [projects.id],
  }),
}));

export const nftCertificatesRelations = relations(nftCertificates, ({ one }) => ({
  project: one(projects, {
    fields: [nftCertificates.projectId],
    references: [projects.id],
  }),
}));

export const registryLocksRelations = relations(registryLocks, ({ one }) => ({
  project: one(projects, {
    fields: [registryLocks.projectId],
    references: [projects.id],
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

export const insertAiVerificationJobSchema = createInsertSchema(aiVerificationJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertGisSnapshotSchema = createInsertSchema(gisSnapshots).omit({
  id: true,
  verifiedAt: true,
});

export const insertNftCertificateSchema = createInsertSchema(nftCertificates).omit({
  id: true,
  mintedAt: true,
});

export const insertRegistryLockSchema = createInsertSchema(registryLocks).omit({
  id: true,
  lockedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type FieldData = typeof fieldData.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AiVerificationJob = typeof aiVerificationJobs.$inferSelect;
export type GisSnapshot = typeof gisSnapshots.$inferSelect;
export type NftCertificate = typeof nftCertificates.$inferSelect;
export type RegistryLock = typeof registryLocks.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertFieldData = z.infer<typeof insertFieldDataSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertAiVerificationJob = z.infer<typeof insertAiVerificationJobSchema>;
export type InsertGisSnapshot = z.infer<typeof insertGisSnapshotSchema>;
export type InsertNftCertificate = z.infer<typeof insertNftCertificateSchema>;
export type InsertRegistryLock = z.infer<typeof insertRegistryLockSchema>;
