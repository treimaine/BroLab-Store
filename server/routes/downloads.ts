// BroLab Entertainment - Downloads Management with Quota Enforcement
// Generated: January 23, 2025
// Purpose: Secure download management with license-based quotas

import { Router } from "express";
import { requireAuthentication, checkDownloadQuota } from "../lib/rlsSecurity.js";
import { storage } from "../storage.js";

const router = Router();

// Get user downloads history
router.get("/", requireAuthentication, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get user downloads from storage
    const downloads = await storage.getUserDownloads(userId);
    
    res.json({
      success: true,
      downloads: downloads || [],
      count: downloads?.length || 0
    });
    
  } catch (error: any) {
    console.error("Get downloads error:", error);
    res.status(500).json({
      error: "Failed to retrieve downloads",
      message: error.message
    });
  }
});

// Download a beat with quota enforcement
router.post("/beat/:beatId", requireAuthentication, async (req, res) => {
  try {
    const userId = req.user?.id;
    const beatId = parseInt(req.params.beatId);
    const { licenseType } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!beatId || !licenseType) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["beatId", "licenseType"]
      });
    }

    // Check if user has quota for this license type
    const hasQuota = await checkDownloadQuota(userId, licenseType);
    
    if (!hasQuota) {
      const quotaLimits = {
        basic: 10,
        premium: 25,
        unlimited: 999999
      };
      
      return res.status(403).json({
        error: "Download quota exceeded",
        message: `You have reached the download limit for ${licenseType} license (${quotaLimits[licenseType as keyof typeof quotaLimits]} downloads)`,
        licenseType,
        quotaLimit: quotaLimits[licenseType as keyof typeof quotaLimits]
      });
    }

    // Get beat information
    const beat = await storage.getBeat(beatId);
    if (!beat) {
      return res.status(404).json({ error: "Beat not found" });
    }

    // Record the download
    const download = await storage.logDownload({
      userId,
      beatId,
      licenseType,
      downloadUrl: beat.audio_url || '',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Download recorded successfully",
      download: {
        id: download.id,
        beatTitle: beat.title,
        licenseType,
        downloadUrl: beat.audio_url,
        timestamp: download.timestamp
      }
    });

  } catch (error: any) {
    console.error("Download beat error:", error);
    res.status(500).json({
      error: "Download failed",
      message: error.message
    });
  }
});

// Get download quota status for user
router.get("/quota", requireAuthentication, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Get download counts by license type
    const downloads = await storage.getUserDownloads(userId);
    
    const quotaStatus = {
      basic: {
        used: downloads?.filter((d: any) => d.licenseType === 'basic').length || 0,
        limit: 10,
        remaining: 0
      },
      premium: {
        used: downloads?.filter((d: any) => d.licenseType === 'premium').length || 0,
        limit: 25,
        remaining: 0
      },
      unlimited: {
        used: downloads?.filter((d: any) => d.licenseType === 'unlimited').length || 0,
        limit: 999999,
        remaining: 999999
      }
    };

    // Calculate remaining
    quotaStatus.basic.remaining = Math.max(0, quotaStatus.basic.limit - quotaStatus.basic.used);
    quotaStatus.premium.remaining = Math.max(0, quotaStatus.premium.limit - quotaStatus.premium.used);

    res.json({
      success: true,
      quotaStatus,
      totalDownloads: downloads?.length || 0
    });

  } catch (error: any) {
    console.error("Get quota status error:", error);
    res.status(500).json({
      error: "Failed to get quota status",
      message: error.message
    });
  }
});

// Reset download quota (admin only - for testing)
router.post("/admin/reset-quota/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // In a real implementation, this would check admin permissions
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // This would reset download records for the user
    res.json({
      success: true,
      message: `Download quota reset for user ${userId}`,
      note: "This is a development-only endpoint"
    });

  } catch (error: any) {
    console.error("Reset quota error:", error);
    res.status(500).json({
      error: "Failed to reset quota",
      message: error.message
    });
  }
});

export default router;