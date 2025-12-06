const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { verifyShopifyWebhook } = require("../utils/shopifyHmac");

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify Shopify webhooks
function verifyWebhook(req, res, next) {
  const hmac = req.get("X-Shopify-Hmac-SHA256");
  const shop = req.get("X-Shopify-Shop-Domain");
  const rawBody = JSON.stringify(req.body);

  if (!hmac || !shop) {
    return res.status(401).json({ error: "Missing Shopify headers" });
  }

  req.shopDomain = shop;
  next();
}

// Get tenant by shop domain
async function getTenantByShop(shopDomain) {
  return prisma.tenant.findUnique({
    where: { shopDomain: shopDomain.toLowerCase() },
  });
}

// Orders create webhook
router.post(
  "/orders/create",
  express.json(),
  verifyWebhook,
  async (req, res) => {
    try {
      const tenant = await getTenantByShop(req.shopDomain);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const order = req.body;

      // Find customer
      let customerId = null;
      if (order.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyCustomerId: {
              tenantId: tenant.id,
              shopifyCustomerId: String(order.customer.id),
            },
          },
        });
        customerId = customer?.id;
      }

      // Create order
      const orderRecord = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          shopifyOrderId: String(order.id),
          customerId,
          totalPrice: parseFloat(order.total_price || 0),
          currency: order.currency,
          status: order.fulfillment_status || "pending",
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          orderedAt: new Date(order.created_at),
          updatedAt: new Date(order.updated_at || order.created_at),
        },
      });

      // Create event
      await prisma.event.create({
        data: {
          tenantId: tenant.id,
          type: "ORDER_CREATED",
          customerId,
          rawPayload: order,
          occurredAt: new Date(order.created_at),
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Order webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Customers create webhook
router.post(
  "/customers/create",
  express.json(),
  verifyWebhook,
  async (req, res) => {
    try {
      const tenant = await getTenantByShop(req.shopDomain);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const customer = req.body;

      await prisma.customer.upsert({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId: tenant.id,
            shopifyCustomerId: String(customer.id),
          },
        },
        update: {
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          updatedAt: new Date(customer.updated_at),
        },
        create: {
          tenantId: tenant.id,
          shopifyCustomerId: String(customer.id),
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phone: customer.phone,
          totalSpent: parseFloat(customer.total_spent || 0),
          createdAt: new Date(customer.created_at),
          updatedAt: new Date(customer.updated_at),
        },
      });

      // Create event
      const dbCustomer = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId: tenant.id,
            shopifyCustomerId: String(customer.id),
          },
        },
      });

      await prisma.event.create({
        data: {
          tenantId: tenant.id,
          type: "CUSTOMER_CREATED",
          customerId: dbCustomer.id,
          rawPayload: customer,
          occurredAt: new Date(customer.created_at),
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Customer webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Checkouts create webhook
router.post(
  "/checkouts/create",
  express.json(),
  verifyWebhook,
  async (req, res) => {
    try {
      const tenant = await getTenantByShop(req.shopDomain);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const checkout = req.body;

      // Find customer
      let customerId = null;
      if (checkout.customer?.id) {
        const customer = await prisma.customer.findUnique({
          where: {
            tenantId_shopifyCustomerId: {
              tenantId: tenant.id,
              shopifyCustomerId: String(checkout.customer.id),
            },
          },
        });
        customerId = customer?.id;
      }

      await prisma.event.create({
        data: {
          tenantId: tenant.id,
          type: "CHECKOUT_STARTED",
          customerId,
          rawPayload: checkout,
          occurredAt: new Date(checkout.created_at),
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Checkout webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Carts update webhook (abandoned carts)
router.post(
  "/carts/update",
  express.json(),
  verifyWebhook,
  async (req, res) => {
    try {
      const tenant = await getTenantByShop(req.shopDomain);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const cart = req.body;

      await prisma.event.create({
        data: {
          tenantId: tenant.id,
          type: "CART_ABANDONED",
          rawPayload: cart,
          occurredAt: new Date(),
        },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Cart webhook error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
