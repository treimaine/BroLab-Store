import { Router } from "express";

const router = Router();

// Get music categories for the beats store
router.get("/", async (_req, res) => {
  try {
    const categories = [
      { id: 1, name: "Hip Hop", slug: "hip-hop", count: 15 },
      { id: 2, name: "Trap", slug: "trap", count: 12 },
      { id: 3, name: "R&B", slug: "rb", count: 8 },
      { id: 4, name: "Pop", slug: "pop", count: 10 },
      { id: 5, name: "Electronic", slug: "electronic", count: 6 },
    ];
    res.json(categories);
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;