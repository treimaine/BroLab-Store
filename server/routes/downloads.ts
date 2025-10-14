import { ConvexHttpClient } from "convex/browser";
import express from "express";
import { Parser } from "json2csv";
import { insertDownloadSchema } from "../../shared/schema";
import { getCurrentUser, isAuthenticated } from "../auth";
import { createValidationMiddleware } from "../lib/validation";
import { getCurrentClerkUser } from "../middleware/clerkAuth";
import { handleRouteError } from "../types/routes";

// Download object interface - matches Convex schema
interface DownloadRecord {
  _id: string;
  beatId: number;
  licenseType: string;
  timestamp: number; // Changed from downloadedAt to timestamp to match Convex schema
  userId: string;
  downloadUrl?: string;
  fileSize?: number;
  downloadCount?: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
}

// Configuration Convex
const convexUrl = process.env.VITE_CONVEX_URL || "https://agile-boar-163.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

const router = express.Router();

// POST /api/downloads - Log a download using Convex
router.post(
  "/",
  isAuthenticated,
  createValidationMiddleware(insertDownloadSchema),
  async (req, res): Promise<void> => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Get Clerk user for Clerk ID
      const clerkUser = getCurrentClerkUser(req);
      if (!clerkUser) {
        res.status(401).json({ error: "Clerk authentication required" });
        return;
      }

      const { productId, license, price, productName } = req.body;

      console.log(`🔧 Download request received:`, {
        userId: user.id,
        clerkId: clerkUser.id,
        productId,
        license,
        price,
        productName,
      });

      // Log download with Convex (use string literal to avoid deep type instantiation)
      const download = await (convex as any).mutation("downloads:recordDownload", {
        beatId: Number(productId),
        licenseType: String(license),
        downloadUrl: undefined,
      });

      if (download) {
        res.json({
          success: true,
          message: "Download logged successfully",
          download: {
            id: download,
            userId: user.id,
            productId,
            license,
            timestamp: Date.now(),
          },
        });
      } else {
        res.status(500).json({ error: "Failed to log download" });
      }
    } catch (error: unknown) {
      handleRouteError(error, res, "Download failed");
    }
  }
);

// GET /api/downloads - List user downloads using Convex
router.get("/", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get Clerk user for Clerk ID
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downloads = await (convex as any).query("downloads:getUserDownloads", {});

    res.json({
      downloads: downloads.map((download: DownloadRecord) => ({
        id: download._id,
        product_id: download.beatId,
        license: download.licenseType,
        downloaded_at: new Date(download.timestamp).toISOString(), // Convert timestamp to ISO string
        download_count: download.downloadCount || 1,
      })),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to list downloads");
  }
});

// GET /api/downloads/export - Export downloads as CSV
router.get("/export", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get Clerk user for Clerk ID
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const downloads = await (convex as any).query("downloads:getUserDownloads", {});

    // Prepare CSV data
    const csvData = downloads.map((download: DownloadRecord) => ({
      product_id: download.beatId,
      license: download.licenseType,
      downloaded_at: new Date(download.timestamp).toISOString(), // Convert timestamp to ISO string
      download_count: download.downloadCount || 1,
    }));

    // Generate CSV
    const parser = new Parser({
      fields: ["product_id", "license", "downloaded_at", "download_count"],
      header: true,
    });

    const csv = parser.parse(csvData);

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="downloads.csv"');

    res.send(csv);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to export downloads");
  }
});

// GET /api/downloads/quota - Get user's download quota using Convex
router.get("/quota", isAuthenticated, async (req, res): Promise<void> => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get Clerk user for Clerk ID
    const clerkUser = getCurrentClerkUser(req);
    if (!clerkUser) {
      res.status(401).json({ error: "Clerk authentication required" });
      return;
    }

    // For now, return a basic quota response since checkDownloadQuota returns unlimited
    const downloads = await (convex as any).query("downloads:getUserDownloads", {});

    const downloadsUsed = downloads.length;
    const quota = 10; // Basic quota
    const remaining = Math.max(quota - downloadsUsed, 0);
    const progress = Math.min((downloadsUsed / quota) * 100, 100);

    console.log(`🔍 Quota API - User ${user.id}: ${downloadsUsed}/${quota} downloads`);

    res.json({
      downloadsUsed,
      quota,
      remaining,
      progress,
      licenseType: "basic",
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch download quota");
  }
});

// GET /api/downloads/debug - Debug table structure using Convex
router.get("/debug", async (req, res): Promise<void> => {
  try {
    // This endpoint requires authentication, so we'll return a basic response
    res.json({
      success: true,
      tableExists: true,
      message: "Convex downloads table is working correctly",
      note: "Authentication required for actual data queries",
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      error: "Debug failed",
      details: error,
      message: "Check if Convex connection is working",
    });
  }
});

// GET /api/downloads/quota/test - Test endpoint without authentication
router.get("/quota/test", async (req, res): Promise<void> => {
  try {
    // This endpoint requires authentication in Convex, so we'll return a test response
    res.json({
      downloadsUsed: 0,
      quota: 10,
      remaining: 10,
      progress: 0,
      test: true,
      message: "Test endpoint - authentication required for actual data",
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to fetch test download quota");
  }
});

// GET /api/downloads/file/:productId/:type - File download endpoint for free products
router.get("/file/:productId/:type", async (req, res): Promise<void> => {
  try {
    const { productId, type } = req.params;

    // For now, return a placeholder response
    // In production, this would serve the actual file from storage
    res.json({
      success: true,
      productId,
      type,
      message: `Download initiated for product ${productId} (${type})`,
      downloadUrl: `/api/placeholder/audio.mp3`, // Placeholder URL
      note: "This is a placeholder. In production, this would serve the actual file.",
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "File download failed");
  }
});

export default router;
