const express = require("express");
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const axios = require("axios");

const router = express.Router();
const prisma = new PrismaClient();

// Start OAuth flow
router.get("/oauth/start", async (req, res) => {
  const { tenantId } = req.query;

  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  const shop = tenant.shopDomain;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES;
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/shopify/oauth/callback`;
  const nonce = crypto.randomBytes(16).toString("hex");

  // Store nonce in session/db for verification
  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce},${tenantId}`;

  res.redirect(installUrl);
});

// OAuth callback
router.get("/oauth/callback", async (req, res) => {
  const { code, shop, state, hmac } = req.query;

  if (!code || !shop || !state) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Extract tenantId from state
  const [nonce, tenantId] = state.split(",");

  // Verify HMAC
  const params = { ...req.query };
  delete params.hmac;
  const queryString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const hash = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(queryString)
    .digest("hex");

  if (hash !== hmac) {
    return res.status(403).json({ error: "HMAC validation failed" });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Update tenant with access token
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        accessToken,
        connected: true,
      },
    });

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=true`);
  } catch (error) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to complete OAuth flow" });
  }
});

// Get OAuth URL for authenticated user's tenant
router.get("/connect-url", async (req, res) => {
  const { tenantId } = req.query;

  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  const shop = tenant.shopDomain;
  const apiKey = process.env.SHOPIFY_API_KEY;
  const scopes = process.env.SHOPIFY_SCOPES;
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/shopify/oauth/callback`;
  const nonce = crypto.randomBytes(16).toString("hex");

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce},${tenantId}`;

  res.json({ url: installUrl });
});

// Manually set access token (for custom apps that don't use OAuth)
router.post("/set-token", async (req, res) => {
  const { tenantId, accessToken, shopDomain } = req.body;

  if (!tenantId || !accessToken) {
    return res
      .status(400)
      .json({ error: "tenantId and accessToken are required" });
  }

  try {
    // Test the token by making a simple API call
    const testResponse = await axios.get(
      `https://${shopDomain}/admin/api/2024-01/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (testResponse.data && testResponse.data.shop) {
      // Token is valid, update tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          accessToken,
          connected: true,
        },
      });

      res.json({
        success: true,
        message: "Access token set successfully",
        shop: testResponse.data.shop.name,
      });
    } else {
      res.status(400).json({ error: "Invalid access token" });
    }
  } catch (error) {
    console.error(
      "Token validation error:",
      error.response?.data || error.message
    );
    res.status(400).json({
      error: "Invalid access token or shop domain",
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
