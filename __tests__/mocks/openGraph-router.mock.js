// Mock for OpenGraph router
const { Router } = require("express");

const router = Router();

// Mock routes
router.get("/beat/:id", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send("<html><head><title>Mock Beat</title></head><body>Mock Beat Page</body></html>");
});

router.get("/shop", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send("<html><head><title>Mock Shop</title></head><body>Mock Shop Page</body></html>");
});

router.get("/home", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send("<html><head><title>Mock Home</title></head><body>Mock Home Page</body></html>");
});

router.get("/page/:pageName", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(
    `<html><head><title>Mock ${req.params.pageName}</title></head><body>Mock ${req.params.pageName} Page</body></html>`
  );
});

module.exports = router;
