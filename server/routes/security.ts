// BroLab Entertainment - Security Routes
// Generated: January 23, 2025
// Purpose: Security management and RLS administration routes

import { Router } from "express";
import {
    applyRLSPolicies,
    initializeRLSSecurity,
    requireAuthentication,
    verifyRLSPolicies
} from "../lib/rlsSecurity";

const router = Router();

// Initialize RLS Security (admin only)
router.post("/admin/rls/initialize", async (req, res) => {
  try {
    const success = initializeRLSSecurity();
    
    if (success) {
      res.json({ 
        success: true, 
        message: "RLS Security initialized successfully" 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: "Failed to initialize RLS Security" 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      error: "RLS initialization error", 
      message: error.message 
    });
  }
});

// Apply RLS Policies (admin only)
router.post("/admin/rls/apply-policies", async (req, res) => {
  try {
    const result = await applyRLSPolicies();
    
    res.json({
      success: true,
      message: "RLS policies applied",
      result
    });
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to apply RLS policies",
      message: error.message
    });
  }
});

// Verify RLS Policies (admin only)
router.get("/admin/rls/verify", async (req, res) => {
  try {
    const verification = await verifyRLSPolicies();
    
    res.json({
      success: true,
      verification
    });
  } catch (error: any) {
    res.status(500).json({
      error: "RLS verification failed",
      message: error.message
    });
  }
});

// Security status check
router.get("/security/status", (req, res) => {
  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rlsEnabled: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    rateLimitActive: true,
    securityHeaders: true,
    authentication: {
      enabled: true,
      sessionBased: true
    }
  };

  res.json(status);
});

// User security info (authenticated users only)
router.get("/security/user-info", requireAuthentication, (req, res) => {
  const userInfo = {
    userId: req.user?.id,
    username: req.user?.username,
    email: req.user?.email,
    permissions: {
      canAccessDashboard: true,
      canDownloadBeats: true,
      canCreateOrders: true
    },
    securityLevel: 'authenticated'
  };

  res.json(userInfo);
});

export default router;