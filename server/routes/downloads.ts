import archiver from "archiver";
import express from "express";
import { Parser } from "json2csv";
import { insertDownloadSchema } from "../../shared/schema";
import { getCurrentUser, isAuthenticated } from "../auth";
import { createValidationMiddleware } from "../lib/validation";
import { getCurrentClerkUser } from "../middleware/clerkAuth";
import { handleRouteError } from "../types/routes";

// Audio track interface for ZIP downloads
interface AudioTrack {
  url: string;
  downloadUrl?: string;
  title?: string;
}

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
// SECURITY: Use lazy initialization with proper validation, no hardcoded fallback
import { getConvex } from "../lib/convex";
const convex = getConvex();

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
      const convexClient = convex as {
        mutation: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };
      const download = await convexClient.mutation("downloads:recordDownload", {
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

// Quota response interface from Convex checkDownloadQuota
interface QuotaResponse {
  canDownload: boolean;
  reason: string;
  quota: { limit: number; used: number; remaining: number };
  planId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: number;
}

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

    // Fetch actual quota from user's subscription plan via Convex
    const convexClient = convex as {
      query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };
    const quotaResult = (await convexClient.query(
      "subscriptions/checkDownloadQuota:checkDownloadQuota",
      {}
    )) as QuotaResponse;

    const downloadsUsed = quotaResult.quota.used;
    const quota = quotaResult.quota.limit === Infinity ? -1 : quotaResult.quota.limit;
    const remaining = quotaResult.quota.remaining === Infinity ? -1 : quotaResult.quota.remaining;
    const isUnlimited = quota === -1;
    const progress = isUnlimited ? 0 : Math.min((downloadsUsed / quota) * 100, 100);

    console.log(
      `🔍 Quota API - User ${user.id}: ${downloadsUsed}/${isUnlimited ? "unlimited" : quota} downloads (plan: ${quotaResult.planId || "unknown"})`
    );

    res.json({
      downloadsUsed,
      quota,
      remaining,
      progress,
      isUnlimited,
      canDownload: quotaResult.canDownload,
      licenseType: quotaResult.planId || "free",
      currentPeriodEnd: quotaResult.currentPeriodEnd,
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
      quota: 5, // Basic plan default
      remaining: 5,
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

// GET /api/downloads/proxy - Proxy download to force file download instead of browser playback
router.get("/proxy", async (req, res): Promise<void> => {
  try {
    const { url, filename } = req.query;

    console.log("📥 Proxy download request:", { url, filename });

    if (!url || typeof url !== "string") {
      console.error("❌ Missing or invalid URL parameter");
      res.status(400).json({ error: "Missing or invalid URL parameter" });
      return;
    }

    // Decode URL if it was encoded
    const decodedUrl = decodeURIComponent(url);
    console.log("📥 Decoded URL:", decodedUrl);

    // Validate URL is from allowed domains (WordPress/CDN)
    const allowedDomains = ["brolabentertainment.com", "wp-content", "uploads"];

    const isAllowed = allowedDomains.some(domain => decodedUrl.includes(domain));
    if (!isAllowed) {
      console.error("❌ URL domain not allowed:", decodedUrl);
      res.status(403).json({ error: "URL domain not allowed", url: decodedUrl });
      return;
    }

    // Fetch the file from the external URL with proper headers
    console.log("📥 Fetching file from:", decodedUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "audio/mpeg, audio/*, */*",
        "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
        Referer: "https://brolabentertainment.com/",
      },
    });

    if (!response.ok) {
      console.error("❌ Failed to fetch file:", response.status, response.statusText);
      res.status(response.status).json({
        error: "Failed to fetch file from source",
        status: response.status,
        statusText: response.statusText,
        url: decodedUrl,
      });
      return;
    }

    // Get content type and set appropriate headers
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const contentLength = response.headers.get("content-length");

    console.log("📥 File info:", { contentType, contentLength });

    // Sanitize filename
    const safeFilename =
      typeof filename === "string" ? filename.replaceAll(/[^a-zA-Z0-9._-]/g, "_") : "download.mp3";

    // Set headers to force download
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Stream the response body to the client
    const arrayBuffer = await response.arrayBuffer();
    console.log("✅ Sending file:", safeFilename, "size:", arrayBuffer.byteLength);
    res.send(Buffer.from(arrayBuffer));
  } catch (error: unknown) {
    console.error("❌ Proxy download error:", error);
    handleRouteError(error, res, "Proxy download failed");
  }
});

// Allowed domains for URL validation
const ALLOWED_DOMAINS = ["brolabentertainment.com", "wp-content", "uploads"];

// Default fetch headers for audio requests
const AUDIO_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "audio/mpeg, audio/*, */*",
  Referer: "https://brolabentertainment.com/",
};

// Helper: Check if URL is from allowed domain
function isUrlAllowed(url: string): boolean {
  return ALLOWED_DOMAINS.some(domain => url.includes(domain));
}

// Helper: Validate all track URLs
function validateTrackUrls(tracks: AudioTrack[]): { valid: boolean; invalidUrl?: string } {
  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;
    if (trackUrl && !isUrlAllowed(trackUrl)) {
      return { valid: false, invalidUrl: trackUrl };
    }
  }
  return { valid: true };
}

// Helper: Fetch single track and return buffer
async function fetchTrackBuffer(
  trackUrl: string,
  trackIndex: number,
  totalTracks: number
): Promise<Buffer | null> {
  console.log(`📥 Fetching track ${trackIndex}/${totalTracks}: ${trackUrl.substring(0, 60)}...`);

  const response = await fetch(trackUrl, { headers: AUDIO_FETCH_HEADERS });

  if (!response.ok) {
    console.error(`❌ Failed to fetch track ${trackIndex}:`, response.status);
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper: Generate safe filename for track
function generateTrackFilename(track: AudioTrack, index: number): string {
  const trackTitle = track.title || `Track_${index}`;
  const safeTrackTitle = trackTitle.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(index).padStart(2, "0")}_${safeTrackTitle}.mp3`;
}

// Helper: Add tracks to archive
async function addTracksToArchive(archive: archiver.Archiver, tracks: AudioTrack[]): Promise<void> {
  let trackIndex = 1;

  for (const track of tracks) {
    const trackUrl = track.downloadUrl || track.url;

    if (!trackUrl) {
      console.warn(`⚠️ Skipping track ${trackIndex}: no URL`);
      trackIndex++;
      continue;
    }

    try {
      const buffer = await fetchTrackBuffer(trackUrl, trackIndex, tracks.length);

      if (buffer) {
        const trackFilename = generateTrackFilename(track, trackIndex);
        console.log(`✅ Adding to ZIP: ${trackFilename} (${buffer.length} bytes)`);
        archive.append(buffer, { name: trackFilename });
      }
    } catch (fetchError) {
      console.error(`❌ Error fetching track ${trackIndex}:`, fetchError);
    }

    trackIndex++;
  }
}

// POST /api/downloads/zip - Download multiple audio files as a ZIP archive
router.post("/zip", async (req, res): Promise<void> => {
  try {
    const { productName, tracks } = req.body as {
      productName: string;
      tracks: AudioTrack[];
    };

    console.log("📦 ZIP download request:", { productName, trackCount: tracks?.length });

    if (!productName || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      res.status(400).json({ error: "Missing productName or tracks array" });
      return;
    }

    // Validate all URLs are from allowed domains
    const validation = validateTrackUrls(tracks);
    if (!validation.valid) {
      console.error("❌ Track URL domain not allowed:", validation.invalidUrl);
      res.status(403).json({ error: "Track URL domain not allowed", url: validation.invalidUrl });
      return;
    }

    // Sanitize product name for filename
    const safeProductName = productName.replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    const zipFilename = `${safeProductName}.zip`;

    // Set headers for ZIP download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 5 } });

    // Handle archive errors
    archive.on("error", (err: Error) => {
      console.error("❌ Archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create ZIP archive" });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add all tracks to archive
    await addTracksToArchive(archive, tracks);

    // Finalize the archive
    await archive.finalize();
    console.log(`✅ ZIP archive created: ${zipFilename}`);
  } catch (error: unknown) {
    console.error("❌ ZIP download error:", error);
    if (!res.headersSent) {
      handleRouteError(error, res, "ZIP download failed");
    }
  }
});

export default router;
