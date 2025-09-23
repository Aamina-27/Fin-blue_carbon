import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertFieldDataSchema, insertAuditLogSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth endpoint - register or login user
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { walletAddress, role, organizationName, email } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      let user = await storage.getUserByWallet(walletAddress);
      
      if (!user) {
        const userData = insertUserSchema.parse({
          walletAddress,
          role: "ngo", // Always assign NGO role, ignore client input
          organizationName,
          email,
        });
        user = await storage.createUser(userData);
      }

      res.json({ user });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get all projects or filter by status
  app.get("/api/projects", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const projects = await storage.getProjects(status);
      res.json({ projects });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get projects for a specific user
  app.get("/api/projects/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const projects = await storage.getProjectsByUser(userId);
      res.json({ projects });
    } catch (error) {
      console.error("Get user projects error:", error);
      res.status(500).json({ message: "Failed to fetch user projects" });
    }
  });

  // Get single project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const fieldData = await storage.getFieldDataByProject(id);
      res.json({ project, fieldData });
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Create new project
  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);

      // Create audit log
      await storage.createAuditLog({
        projectId: project.id,
        userId: project.submittedBy,
        action: "submitted",
        details: { projectName: project.name },
      });

      res.status(201).json({ project });
    } catch (error) {
      console.error("Create project error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Verify project (admin only)
  app.post("/api/projects/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, verifiedBy, carbonCredits, blockchainTxHash } = req.body;

      if (!["verified", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updates = {
        status: status as "verified" | "rejected",
        verifiedBy,
        verifiedAt: new Date(),
        ...(carbonCredits && { carbonCredits: carbonCredits.toString() }),
        ...(blockchainTxHash && { blockchainTxHash }),
      };

      const project = await storage.updateProject(id, updates);

      // Create audit log
      await storage.createAuditLog({
        projectId: id,
        userId: verifiedBy,
        action: status === "verified" ? "verified" : "rejected",
        details: { carbonCredits, blockchainTxHash },
      });

      res.json({ project });
    } catch (error) {
      console.error("Verify project error:", error);
      res.status(500).json({ message: "Failed to verify project" });
    }
  });

  // Upload field data
  app.post("/api/field-data", upload.array("files"), async (req, res) => {
    try {
      const { projectId, fileType } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // TODO: Upload files to IPFS using web3.storage
      // For now, we'll simulate IPFS hashes
      const uploadedFiles = [];

      for (const file of files) {
        // Simulate IPFS upload
        const mockIpfsHash = `Qm${Math.random().toString(36).substring(2, 15)}`;
        
        const fieldDataItem = await storage.createFieldData({
          projectId,
          fileType: fileType as "photo" | "video" | "document",
          fileName: file.originalname,
          ipfsHash: mockIpfsHash,
          metadata: {
            size: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString(),
          },
        });

        uploadedFiles.push(fieldDataItem);
      }

      res.status(201).json({ fieldData: uploadedFiles });
    } catch (error) {
      console.error("Upload field data error:", error);
      res.status(500).json({ message: "Failed to upload field data" });
    }
  });

  // Get field data for a project
  app.get("/api/field-data/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const fieldData = await storage.getFieldDataByProject(projectId);
      res.json({ fieldData });
    } catch (error) {
      console.error("Get field data error:", error);
      res.status(500).json({ message: "Failed to fetch field data" });
    }
  });

  // Get audit logs
  app.get("/api/audit", async (req, res) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const auditLogs = await storage.getAuditLogs(projectId);
      res.json({ auditLogs });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
