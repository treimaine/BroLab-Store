import { Router } from "express";

const router = Router();

/**
 * GET /api/subscription/plans
 * Returns available subscription plans
 * Note: This is a compatibility endpoint - actual billing is handled by Clerk Billing
 */
router.get("/plans", (_req, res) => {
  // Return Clerk Billing compatible plan structure
  res.json([
    {
      id: "basic",
      name: "Basic",
      price: 999,
      currency: "usd",
      interval: "month",
      features: ["5 downloads per month", "Standard quality", "Email support"],
    },
    {
      id: "pro",
      name: "Pro",
      price: 1999,
      currency: "usd",
      interval: "month",
      features: ["20 downloads per month", "High quality", "Priority support", "Stems included"],
    },
    {
      id: "unlimited",
      name: "Unlimited",
      price: 4999,
      currency: "usd",
      interval: "month",
      features: [
        "Unlimited downloads",
        "Highest quality",
        "24/7 support",
        "Stems included",
        "Custom requests",
      ],
    },
  ]);
});

export default router;
