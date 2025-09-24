import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertFieldDataSchema, insertAuditLogSchema } from "@shared/schema";
import { verifyMangroveImage, getProjectVerificationStatus, batchVerifyImages } from "./aiVerifier.js";
import { validateProjectLocation, getProjectGISSnapshots, getHistoricalVegetationData } from "./gisService.js";
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
        // Validate and assign the requested role
        const validRoles = ["ngo", "admin", "industry", "government"];
        const assignedRole = validRoles.includes(role) ? role : "ngo";
        
        const userData = insertUserSchema.parse({
          walletAddress,
          role: assignedRole,
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

  // AI Verification Routes
  app.post("/api/verification/submit", upload.single("image"), async (req, res) => {
    try {
      const { projectId, fieldDataId } = req.body;
      const imageFile = req.file;

      if (!imageFile) {
        return res.status(400).json({ message: "Image file is required" });
      }

      // Convert image to base64
      const base64Image = imageFile.buffer.toString('base64');
      
      // Run AI verification
      const result = await verifyMangroveImage(projectId, fieldDataId, base64Image);
      
      res.json(result);
    } catch (error) {
      console.error("AI verification error:", error);
      res.status(500).json({ message: "AI verification failed" });
    }
  });

  app.get("/api/verification/status/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const verificationJobs = await getProjectVerificationStatus(projectId);
      res.json({ verificationJobs });
    } catch (error) {
      console.error("Get verification status error:", error);
      res.status(500).json({ message: "Failed to get verification status" });
    }
  });

  // GIS Validation Routes
  app.post("/api/gis/validate", async (req, res) => {
    try {
      const { projectId, latitude, longitude, areaHectares } = req.body;
      
      const validationResult = await validateProjectLocation(
        projectId, 
        parseFloat(latitude), 
        parseFloat(longitude), 
        parseFloat(areaHectares)
      );
      
      res.json(validationResult);
    } catch (error) {
      console.error("GIS validation error:", error);
      res.status(500).json({ message: "GIS validation failed" });
    }
  });

  app.get("/api/gis/snapshots/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const snapshots = await getProjectGISSnapshots(projectId);
      res.json({ snapshots });
    } catch (error) {
      console.error("Get GIS snapshots error:", error);
      res.status(500).json({ message: "Failed to get GIS snapshots" });
    }
  });

  app.get("/api/gis/overlays", async (req, res) => {
    try {
      // Mock GIS overlay data for map display
      const overlays = [
        {
          projectId: "project1",
          ndviLayer: "https://sentinel-hub.example.com/ndvi/layer1",
          sentinelImagery: "https://sentinel-hub.example.com/rgb/scene1",
          bounds: [[10.0, -5.0], [10.1, -4.9]]
        }
      ];
      
      res.json(overlays);
    } catch (error) {
      console.error("Get GIS overlays error:", error);
      res.status(500).json({ message: "Failed to get GIS overlays" });
    }
  });

  // Map Data Routes
  app.get("/api/projects/map-data", async (req, res) => {
    try {
      const projects = await storage.getProjects("verified");
      
      const mapProjects = projects.map(project => ({
        id: project.id,
        name: project.name,
        latitude: parseFloat(project.latitude),
        longitude: parseFloat(project.longitude),
        status: project.status,
        ecosystem: project.projectType,
        areaHectares: parseFloat(project.areaHectares),
        carbonCredits: parseFloat(project.carbonCredits || "0"),
        aiVerificationScore: Math.random() * 0.3 + 0.7, // Mock AI score
        gisValidated: Math.random() > 0.2, // Mock GIS validation
        nftTokenId: Math.floor(Math.random() * 1000) + 1,
        polygon: [], // Mock polygon data
        ndviData: {
          averageNDVI: Math.random() * 0.4 + 0.4,
          vegetationPercentage: Math.random() * 30 + 60
        }
      }));
      
      res.json(mapProjects);
    } catch (error) {
      console.error("Get map data error:", error);
      res.status(500).json({ message: "Failed to get map data" });
    }
  });

  // Industry Dashboard Routes
  app.get("/api/credits/marketplace", async (req, res) => {
    try {
      const verifiedProjects = await storage.getProjects("verified");
      
      const marketplace = verifiedProjects.map(project => ({
        id: project.id,
        projectId: project.id,
        projectName: project.name,
        location: project.location,
        ecosystem: project.projectType,
        areaHectares: parseFloat(project.areaHectares),
        creditsAvailable: Math.floor(parseFloat(project.carbonCredits || "0") * Math.random()),
        pricePerCredit: Math.floor(Math.random() * 20) + 10,
        nftTokenId: Math.floor(Math.random() * 1000) + 1,
        verifiedAt: project.verifiedAt,
        submitterOrg: "NGO Partner"
      }));
      
      res.json(marketplace);
    } catch (error) {
      console.error("Get marketplace error:", error);
      res.status(500).json({ message: "Failed to get marketplace data" });
    }
  });

  app.get("/api/credits/purchase-history", async (req, res) => {
    try {
      // Mock purchase history data
      const purchaseHistory = [
        {
          id: "purchase1",
          projectId: "proj1",
          projectName: "Mangrove Restoration Sundarbans",
          creditsRetired: 150,
          retirementReason: "Annual carbon offset program",
          retiredAt: new Date().toISOString(),
          nftCertificateUrl: "https://ipfs.io/certificate1"
        }
      ];
      
      res.json(purchaseHistory);
    } catch (error) {
      console.error("Get purchase history error:", error);
      res.status(500).json({ message: "Failed to get purchase history" });
    }
  });

  app.get("/api/industry/stats", async (req, res) => {
    try {
      const stats = {
        totalCreditsPurchased: 1250,
        monthlyGrowth: 15,
        totalCO2Offset: 2500,
        projectsSupported: 8,
        countries: 4,
        nftCertificates: 12
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get industry stats error:", error);
      res.status(500).json({ message: "Failed to get industry stats" });
    }
  });

  app.post("/api/credits/purchase", async (req, res) => {
    try {
      const { projectId, credits, retirementReason } = req.body;
      
      // Mock purchase processing
      const purchase = {
        id: `purchase_${Date.now()}`,
        projectId,
        credits,
        retirementReason,
        timestamp: new Date().toISOString(),
        nftCertificateUrl: `https://ipfs.io/certificate_${Date.now()}`
      };
      
      res.json(purchase);
    } catch (error) {
      console.error("Purchase credits error:", error);
      res.status(500).json({ message: "Failed to purchase credits" });
    }
  });

  // Government Dashboard Routes
  app.get("/api/government/national-stats", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const verifiedProjects = projects.filter(p => p.status === "verified");
      
      const stats = {
        totalCarbonStock: verifiedProjects.reduce((sum, p) => sum + parseFloat(p.carbonCredits || "0"), 0),
        yearOverYearGrowth: 18,
        verifiedProjects: verifiedProjects.length,
        pendingVerification: projects.filter(p => p.status === "pending").length,
        totalAreaRestored: verifiedProjects.reduce((sum, p) => sum + parseFloat(p.areaHectares || "0"), 0),
        regions: 5,
        communitiesEngaged: 45,
        ngoPartners: 12
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get national stats error:", error);
      res.status(500).json({ message: "Failed to get national stats" });
    }
  });

  app.get("/api/government/regional-data", async (req, res) => {
    try {
      const regionalData = [
        {
          region: "Coastal Bengal",
          projectsCount: 8,
          areaRestored: 450,
          carbonStored: 2250,
          communities: 15
        },
        {
          region: "Western Ghats",
          projectsCount: 5,
          areaRestored: 280,
          carbonStored: 1400,
          communities: 8
        },
        {
          region: "Andaman Islands",
          projectsCount: 3,
          areaRestored: 120,
          carbonStored: 600,
          communities: 5
        }
      ];
      
      res.json(regionalData);
    } catch (error) {
      console.error("Get regional data error:", error);
      res.status(500).json({ message: "Failed to get regional data" });
    }
  });

  app.get("/api/government/policy-insights", async (req, res) => {
    try {
      const policyInsights = [
        {
          id: "insight1",
          title: "Accelerated Mangrove Restoration Needed",
          description: "Current restoration rates are below targets for achieving national climate goals by 2030.",
          impact: "high",
          region: "National",
          recommendations: [
            "Increase funding for community-based restoration programs",
            "Streamline verification processes for faster project approval",
            "Develop regional centers of excellence for blue carbon research"
          ]
        }
      ];
      
      res.json(policyInsights);
    } catch (error) {
      console.error("Get policy insights error:", error);
      res.status(500).json({ message: "Failed to get policy insights" });
    }
  });

  app.get("/api/government/carbon-trends", async (req, res) => {
    try {
      const carbonTrends = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        carbonStored: Math.floor(Math.random() * 500) + 1000 + (i * 50)
      }));
      
      res.json(carbonTrends);
    } catch (error) {
      console.error("Get carbon trends error:", error);
      res.status(500).json({ message: "Failed to get carbon trends" });
    }
  });

  app.get("/api/government/ecosystem-distribution", async (req, res) => {
    try {
      const ecosystemData = [
        { name: "Mangrove", area: 650 },
        { name: "Seagrass", area: 280 },
        { name: "Salt Marsh", area: 120 },
        { name: "Other", area: 80 }
      ];
      
      res.json(ecosystemData);
    } catch (error) {
      console.error("Get ecosystem distribution error:", error);
      res.status(500).json({ message: "Failed to get ecosystem distribution" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
