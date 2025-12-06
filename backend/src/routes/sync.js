const express = require("express");
const { authenticate } = require("../middleware/auth");
const { syncTenantData } = require("../services/syncService");

const router = express.Router();

// Manual sync trigger (authenticated user syncs their tenant)
router.post("/shopify", authenticate, async (req, res) => {
  try {
    const { useMockData } = req.body;
    await syncTenantData(req.tenantId, useMockData);

    res.json({
      success: true,
      message: useMockData
        ? "Mock data generated successfully"
        : "Sync completed successfully",
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({
      error: "Sync failed",
      details: error.message,
    });
  }
});

module.exports = router;
