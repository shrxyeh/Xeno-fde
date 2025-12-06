const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../utils/password");

const router = express.Router();
const prisma = new PrismaClient();

// Onboard a new tenant
router.post("/onboard", async (req, res) => {
  const { name, shopDomain, adminEmail, adminPassword } = req.body;

  if (!name || !shopDomain || !adminEmail || !adminPassword) {
    return res.status(400).json({
      error: "Name, shopDomain, adminEmail, and adminPassword are required",
    });
  }

  // Check if shop domain already exists
  const existing = await prisma.tenant.findUnique({
    where: { shopDomain },
  });

  if (existing) {
    return res.status(409).json({ error: "Shop domain already registered" });
  }

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name,
      shopDomain: shopDomain.toLowerCase(),
    },
  });

  // Create admin user
  const hashedPassword = await hashPassword(adminPassword);
  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      tenantId: tenant.id,
      role: "ADMIN",
    },
  });

  res.status(201).json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      shopDomain: tenant.shopDomain,
    },
    adminUser: {
      id: user.id,
      email: user.email,
    },
    message: "Tenant created. Proceed to Shopify OAuth to connect store.",
  });
});

// Get tenant info
router.get("/:id", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      shopDomain: true,
      connected: true,
      createdAt: true,
    },
  });

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  res.json(tenant);
});

// Update tenant shop domain
router.patch("/:id/shop-domain", async (req, res) => {
  const { shopDomain } = req.body;

  if (!shopDomain) {
    return res.status(400).json({ error: "shopDomain is required" });
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { shopDomain: shopDomain.toLowerCase() },
    });

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        shopDomain: tenant.shopDomain,
      },
    });
  } catch (error) {
    res.status(404).json({ error: "Tenant not found" });
  }
});

module.exports = router;
