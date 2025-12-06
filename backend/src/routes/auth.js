const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Register (creates new tenant and admin user)
router.post("/register", async (req, res) => {
  try {
    const { email, password, storeName, shopDomain } = req.body;

    if (!email || !password || !storeName || !shopDomain) {
      return res.status(400).json({
        error: "Email, password, store name, and shop domain are required",
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Check if shop domain already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { shopDomain },
    });

    if (existingTenant) {
      return res.status(400).json({ error: "Shop domain already registered" });
    }

    // Create tenant first
    const tenant = await prisma.tenant.create({
      data: {
        name: storeName,
        shopDomain,
        connected: false,
      },
    });

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        tenantId: tenant.id,
        role: "ADMIN",
      },
    });

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  // Find user
  const user = await prisma.user.findFirst({
    where: { email },
    include: { tenant: true },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Verify password
  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate token
  const token = generateToken(user.id);

  // Set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        shopDomain: user.tenant.shopDomain,
        connected: user.tenant.connected,
      },
    },
    token,
  });
});

// Get current user
router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { tenant: true },
  });

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenant: {
      id: user.tenant.id,
      name: user.tenant.name,
      shopDomain: user.tenant.shopDomain,
      connected: user.tenant.connected,
    },
  });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
