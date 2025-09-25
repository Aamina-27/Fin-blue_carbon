import OpenAI from "openai";
import { readFileSync } from "fs";
import { db } from "./db.js";
import { aiVerificationJobs, fieldData, projects } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

// Referenced from javascript_openai integration
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Analyzes uploaded drone/satellite images to verify mangrove plantation area and health
 * @param {string} projectId - Project ID
 * @param {string} fieldDataId - Field data ID containing the image
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<{status: 'verified'|'suspicious'|'failed', score: number, metrics: object}>}
 */
export async function verifyMangroveImage(projectId, fieldDataId, base64Image) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return {
        status: "failed",
        score: 0,
        error: "OpenAI API key not configured. AI verification is not available.",
        metrics: {
          vegetationHealth: 0,
          mangroveCharacteristics: false,
          plantationCoverage: 0,
          anomaliesDetected: true,
        }
      };
    }

    // Create AI verification job record
    const [jobRecord] = await db
      .insert(aiVerificationJobs)
      .values({
        projectId,
        fieldDataId,
        status: "pending",
      })
      .returning();

    // Analyze image with GPT-5 Vision
    const analysisPrompt = `
      Analyze this drone or satellite image for mangrove plantation verification. 
      Provide a detailed assessment focusing on:
      
      1. Vegetation Health: Rate the health of visible vegetation (0-100%)
      2. Mangrove Characteristics: Identify if vegetation shows typical mangrove characteristics (coastal location, prop roots, canopy structure)
      3. Plantation Area: Estimate the percentage of image area covered by healthy vegetation
      4. Anomaly Detection: Flag any suspicious elements (obviously fake vegetation, poor image quality, non-coastal environment)
      5. Verification Confidence: Overall confidence score (0-1) for this being a legitimate mangrove restoration site
      
      Respond with JSON in this exact format:
      {
        "vegetationHealth": number (0-100),
        "mangroveCharacteristics": boolean,
        "plantationCoverage": number (0-100),
        "anomaliesDetected": boolean,
        "anomalyDescription": string,
        "verificationConfidence": number (0-1),
        "recommendation": "verified" | "suspicious" | "rejected",
        "analysisNotes": string
      }
    `;

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: analysisPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const analysisResults = JSON.parse(visionResponse.choices[0].message.content);
    
    // Determine verification status based on AI analysis
    let verificationStatus;
    const confidence = analysisResults.verificationConfidence;
    
    if (confidence >= 0.8 && analysisResults.mangroveCharacteristics && !analysisResults.anomaliesDetected) {
      verificationStatus = "verified";
    } else if (confidence >= 0.5 && !analysisResults.anomaliesDetected) {
      verificationStatus = "verified"; // Still acceptable with moderate confidence
    } else {
      verificationStatus = "suspicious";
    }

    // Structure vegetation metrics
    const vegetationMetrics = {
      vegetationHealth: analysisResults.vegetationHealth,
      mangroveCharacteristics: analysisResults.mangroveCharacteristics,
      plantationCoverage: analysisResults.plantationCoverage,
      anomaliesDetected: analysisResults.anomaliesDetected,
    };

    // Update the verification job with results
    await db
      .update(aiVerificationJobs)
      .set({
        status: verificationStatus,
        verificationScore: confidence.toString(),
        vegetationMetrics,
        analysisResults,
        completedAt: new Date(),
        modelRunId: `gpt5-${Date.now()}`,
      })
      .where(eq(aiVerificationJobs.id, jobRecord.id));

    return {
      jobId: jobRecord.id,
      status: verificationStatus,
      score: confidence,
      metrics: vegetationMetrics,
      analysis: analysisResults,
    };

  } catch (error) {
    console.error("AI verification failed:", error);
    
    // Update job status to failed
    await db
      .update(aiVerificationJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        analysisResults: { error: error.message },
      })
      .where(and(
        eq(aiVerificationJobs.projectId, projectId),
        eq(aiVerificationJobs.fieldDataId, fieldDataId)
      ));

    return {
      status: "failed",
      score: 0,
      error: error.message,
    };
  }
}

/**
 * Get verification status for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object[]>} Array of verification jobs for the project
 */
export async function getProjectVerificationStatus(projectId) {
  try {
    const verificationJobs = await db
      .select()
      .from(aiVerificationJobs)
      .where(eq(aiVerificationJobs.projectId, projectId))
      .orderBy(aiVerificationJobs.createdAt);

    return verificationJobs;
  } catch (error) {
    console.error("Error fetching verification status:", error);
    return [];
  }
}

/**
 * Check if a project has been verified by AI
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} True if project has at least one verified image
 */
export async function isProjectAIVerified(projectId) {
  try {
    const verifiedJobs = await db
      .select()
      .from(aiVerificationJobs)
      .where(and(
        eq(aiVerificationJobs.projectId, projectId),
        eq(aiVerificationJobs.status, "verified")
      ))
      .limit(1);

    return verifiedJobs.length > 0;
  } catch (error) {
    console.error("Error checking project verification:", error);
    return false;
  }
}

/**
 * Batch process verification for multiple images
 * @param {string} projectId - Project ID
 * @param {Array} imageData - Array of {fieldDataId, base64Image} objects
 * @returns {Promise<object[]>} Array of verification results
 */
export async function batchVerifyImages(projectId, imageData) {
  const results = [];
  
  for (const { fieldDataId, base64Image } of imageData) {
    const result = await verifyMangroveImage(projectId, fieldDataId, base64Image);
    results.push({ fieldDataId, ...result });
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}