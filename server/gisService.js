import { db } from "./db.js";
import { gisSnapshots, projects } from "../shared/schema.js";
import { eq } from "drizzle-orm";

/**
 * GIS Service for satellite imagery validation using Sentinel Hub API
 * Note: Sentinel Hub API key should be stored in environment variables
 */

/**
 * Validates project coordinates against satellite imagery
 * @param {string} projectId - Project ID
 * @param {number} latitude - Project latitude
 * @param {number} longitude - Project longitude
 * @param {number} areaHectares - Claimed area in hectares
 * @returns {Promise<{validated: boolean, areaMatches: boolean, ndviData: object}>}
 */
export async function validateProjectLocation(projectId, latitude, longitude, areaHectares) {
  try {
    // Create bounding box around the project location (approximately 1km radius)
    const boundingBox = createBoundingBox(latitude, longitude, 1000);
    
    // For demonstration, using a mock Sentinel Hub API call
    // In production, replace with actual Sentinel Hub API integration
    const sentinelData = await mockSentinelHubQuery(boundingBox);
    
    // Calculate NDVI (Normalized Difference Vegetation Index) statistics
    const ndviStats = calculateNDVIStats(sentinelData);
    
    // Validate vegetation coverage against claimed area
    const vegetationAreaHa = calculateVegetationArea(sentinelData, ndviStats);
    const areaMatches = Math.abs(vegetationAreaHa - areaHectares) / areaHectares <= 0.3; // 30% tolerance
    
    // Store GIS snapshot
    const [gisSnapshot] = await db
      .insert(gisSnapshots)
      .values({
        projectId,
        sentinelSceneId: sentinelData.sceneId,
        geometry: {
          type: "Polygon",
          coordinates: [boundingBoxToPolygon(boundingBox)]
        },
        areaValidatedHa: vegetationAreaHa.toString(),
        ndviStats,
        imageryDate: new Date(sentinelData.acquisitionDate),
      })
      .returning();

    return {
      validated: ndviStats.averageNDVI > 0.3, // Healthy vegetation threshold
      areaMatches,
      vegetationAreaHa,
      claimedAreaHa: areaHectares,
      ndviData: ndviStats,
      gisSnapshotId: gisSnapshot.id,
      imageryDate: sentinelData.acquisitionDate,
    };

  } catch (error) {
    console.error("GIS validation failed:", error);
    return {
      validated: false,
      areaMatches: false,
      error: error.message,
    };
  }
}

/**
 * Get historical satellite data for trend analysis
 * @param {string} projectId - Project ID
 * @param {number} months - Number of months to look back
 * @returns {Promise<object[]>} Array of historical NDVI data
 */
export async function getHistoricalVegetationData(projectId, months = 12) {
  try {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project.length) {
      throw new Error("Project not found");
    }

    const { latitude, longitude } = project[0];
    const boundingBox = createBoundingBox(parseFloat(latitude), parseFloat(longitude), 1000);
    
    // Mock historical data - in production, query Sentinel Hub time series
    const historicalData = await mockHistoricalSentinelData(boundingBox, months);
    
    return historicalData.map(data => ({
      date: data.acquisitionDate,
      ndvi: data.averageNDVI,
      vegetationCover: data.vegetationPercentage,
      sceneId: data.sceneId,
    }));

  } catch (error) {
    console.error("Error fetching historical data:", error);
    return [];
  }
}

/**
 * Get all GIS snapshots for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<object[]>} Array of GIS snapshots
 */
export async function getProjectGISSnapshots(projectId) {
  try {
    const snapshots = await db
      .select()
      .from(gisSnapshots)
      .where(eq(gisSnapshots.projectId, projectId))
      .orderBy(gisSnapshots.verifiedAt);

    return snapshots;
  } catch (error) {
    console.error("Error fetching GIS snapshots:", error);
    return [];
  }
}

/**
 * Create bounding box around coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude  
 * @param {number} radiusMeters - Radius in meters
 * @returns {object} Bounding box {north, south, east, west}
 */
function createBoundingBox(lat, lon, radiusMeters) {
  const earthRadius = 6371000; // Earth radius in meters
  const latDelta = (radiusMeters / earthRadius) * (180 / Math.PI);
  const lonDelta = latDelta / Math.cos(lat * Math.PI / 180);

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  };
}

/**
 * Convert bounding box to polygon coordinates
 * @param {object} bbox - Bounding box
 * @returns {Array} Polygon coordinates array
 */
function boundingBoxToPolygon(bbox) {
  return [
    [bbox.west, bbox.south],
    [bbox.east, bbox.south],
    [bbox.east, bbox.north],
    [bbox.west, bbox.north],
    [bbox.west, bbox.south], // Close the polygon
  ];
}

/**
 * Calculate NDVI statistics from satellite data
 * @param {object} sentinelData - Sentinel satellite data
 * @returns {object} NDVI statistics
 */
function calculateNDVIStats(sentinelData) {
  // Mock NDVI calculation - in production, calculate from NIR and Red bands
  const ndviValues = sentinelData.ndviGrid || [];
  
  if (ndviValues.length === 0) {
    return {
      averageNDVI: 0.4, // Mock healthy vegetation
      maxNDVI: 0.8,
      minNDVI: 0.1,
      vegetationPercentage: 65,
    };
  }

  const validNDVI = ndviValues.filter(val => val > -1 && val < 1);
  const averageNDVI = validNDVI.reduce((sum, val) => sum + val, 0) / validNDVI.length;
  const maxNDVI = Math.max(...validNDVI);
  const minNDVI = Math.min(...validNDVI);
  const vegetationPercentage = (validNDVI.filter(val => val > 0.3).length / validNDVI.length) * 100;

  return {
    averageNDVI: parseFloat(averageNDVI.toFixed(3)),
    maxNDVI: parseFloat(maxNDVI.toFixed(3)),
    minNDVI: parseFloat(minNDVI.toFixed(3)),
    vegetationPercentage: parseFloat(vegetationPercentage.toFixed(1)),
  };
}

/**
 * Calculate vegetation area from satellite data
 * @param {object} sentinelData - Sentinel satellite data
 * @param {object} ndviStats - NDVI statistics
 * @returns {number} Vegetation area in hectares
 */
function calculateVegetationArea(sentinelData, ndviStats) {
  // Mock calculation - in production, calculate from pixel analysis
  const totalAreaHa = sentinelData.areaHectares || 100;
  return totalAreaHa * (ndviStats.vegetationPercentage / 100);
}

/**
 * Mock Sentinel Hub API query (replace with real implementation)
 * @param {object} boundingBox - Bounding box for query
 * @returns {Promise<object>} Mock satellite data
 */
async function mockSentinelHubQuery(boundingBox) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    sceneId: `S2_${Date.now()}`,
    acquisitionDate: new Date().toISOString(),
    cloudCover: 15,
    areaHectares: 100,
    ndviGrid: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.1), // Random NDVI values
  };
}

/**
 * Mock historical Sentinel data (replace with real implementation)
 * @param {object} boundingBox - Bounding box for query
 * @param {number} months - Number of months
 * @returns {Promise<object[]>} Mock historical data
 */
async function mockHistoricalSentinelData(boundingBox, months) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const data = [];
  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    data.push({
      sceneId: `S2_${date.getTime()}`,
      acquisitionDate: date.toISOString(),
      averageNDVI: 0.3 + Math.random() * 0.4, // Simulate vegetation growth over time
      vegetationPercentage: 40 + Math.random() * 40,
    });
  }
  
  return data.reverse(); // Oldest first
}

/**
 * Real Sentinel Hub API integration (template for production use)
 * Requires SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET environment variables
 */
export async function querySentinelHub(boundingBox, fromDate, toDate) {
  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn("Sentinel Hub credentials not configured, using mock data");
    return mockSentinelHubQuery(boundingBox);
  }

  try {
    // Step 1: Get OAuth token
    const tokenResponse = await fetch('https://services.sentinel-hub.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Step 2: Query satellite data
    const evalscript = `
      //VERSION=3
      function setup() {
        return {
          input: ["B04", "B08"],
          output: { bands: 1 }
        };
      }
      
      function evaluatePixel(sample) {
        let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
        return [ndvi];
      }
    `;

    const requestBody = {
      input: {
        bounds: {
          bbox: [boundingBox.west, boundingBox.south, boundingBox.east, boundingBox.north],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" }
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: {
                from: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                to: toDate || new Date().toISOString()
              },
              maxCloudCoverage: 30
            }
          }
        ]
      },
      output: {
        width: 512,
        height: 512,
        responses: [
          {
            identifier: "default",
            format: { type: "image/tiff" }
          }
        ]
      },
      evalscript: evalscript
    };

    const response = await fetch('https://services.sentinel-hub.com/api/v1/process', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Sentinel Hub API error: ${response.statusText}`);
    }

    // Process the response (TIFF data) - this would need additional processing
    const imageData = await response.arrayBuffer();
    
    return {
      sceneId: `S2_${Date.now()}`,
      acquisitionDate: new Date().toISOString(),
      cloudCover: 0,
      areaHectares: 100,
      imageData: imageData,
      // Additional processing would extract NDVI values from the TIFF
    };

  } catch (error) {
    console.error("Sentinel Hub query failed:", error);
    return mockSentinelHubQuery(boundingBox);
  }
}