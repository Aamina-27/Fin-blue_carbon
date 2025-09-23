import { users, projects, fieldData, auditLogs, type User, type Project, type FieldData, type AuditLog, type InsertUser, type InsertProject, type InsertFieldData, type InsertAuditLog } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Project methods
  getProject(id: string): Promise<Project | undefined>;
  getProjects(status?: string): Promise<Project[]>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;

  // Field data methods
  getFieldDataByProject(projectId: string): Promise<FieldData[]>;
  createFieldData(fieldData: InsertFieldData): Promise<FieldData>;

  // Audit log methods
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(projectId?: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values([{
      ...insertUser,
      role: (insertUser.role || "ngo") as "ngo" | "admin"
    }]).returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(status?: string): Promise<Project[]> {
    if (status) {
      return await db.select().from(projects).where(eq(projects.status, status as any)).orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.submittedBy, userId)).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values([{
      ...insertProject,
      projectType: insertProject.projectType as "mangrove" | "seagrass" | "saltmarsh" | "other"
    }]).returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const [project] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return project;
  }

  async getFieldDataByProject(projectId: string): Promise<FieldData[]> {
    return await db.select().from(fieldData).where(eq(fieldData.projectId, projectId));
  }

  async createFieldData(insertFieldData: InsertFieldData): Promise<FieldData> {
    const [data] = await db.insert(fieldData).values([{
      ...insertFieldData,
      fileType: insertFieldData.fileType as "photo" | "video" | "document"
    }]).returning();
    return data;
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values([{
      ...insertAuditLog,
      action: insertAuditLog.action as "submitted" | "verified" | "rejected" | "credits_minted"
    }]).returning();
    return log;
  }

  async getAuditLogs(projectId?: string): Promise<AuditLog[]> {
    if (projectId) {
      return await db.select().from(auditLogs).where(eq(auditLogs.projectId, projectId)).orderBy(desc(auditLogs.timestamp));
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();
