const { PrismaClient } = require("@prisma/client");
const ShopifyService = require("./shopifyService");

const prisma = new PrismaClient();

async function syncTenantData(tenantId, useMockData = false) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // If not connected to Shopify, generate mock data for testing
  if (!tenant.accessToken || useMockData) {
    console.log(`📥 Generating mock data for tenant: ${tenant.name}`);
    await generateMockData(tenantId);
    console.log(`✅ Mock data generated for tenant: ${tenant.name}`);
    return;
  }

  const shopify = new ShopifyService(tenant.shopDomain, tenant.accessToken);

  console.log(`📥 Syncing data for tenant: ${tenant.name}`);

  try {
    // Sync customers
    await syncCustomers(tenantId, shopify);

    // Sync products
    await syncProducts(tenantId, shopify);

    // Sync orders
    await syncOrders(tenantId, shopify);

    console.log(`✅ Sync completed for tenant: ${tenant.name}`);
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      console.log(`⚠️  Shopify API access denied - using demo data instead`);
      console.log(`   Please check your Shopify Custom App has these scopes:`);
      console.log(`   - read_customers`);
      console.log(`   - read_products`);
      console.log(`   - read_orders`);
      console.log(`📥 Generating demo data for tenant: ${tenant.name}`);
      await generateMockData(tenantId);
      console.log(`✅ Demo data generated for tenant: ${tenant.name}`);
    } else {
      throw error; // Re-throw other errors
    }
  }
}

async function syncCustomers(tenantId, shopify) {
  const customers = await shopify.getCustomers();
  console.log(`  📊 Fetched ${customers.length} customers`);

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: {
        tenantId_shopifyCustomerId: {
          tenantId,
          shopifyCustomerId: String(customer.id),
        },
      },
      update: {
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        totalSpent: parseFloat(customer.total_spent || 0),
        ordersCount: customer.orders_count || 0,
        updatedAt: new Date(customer.updated_at),
      },
      create: {
        tenantId,
        shopifyCustomerId: String(customer.id),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        totalSpent: parseFloat(customer.total_spent || 0),
        ordersCount: customer.orders_count || 0,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at),
      },
    });
  }
}

async function syncProducts(tenantId, shopify) {
  const products = await shopify.getProducts();
  console.log(`  📦 Fetched ${products.length} products`);

  for (const product of products) {
    const variants = product.variants || [];
    const prices = variants
      .map((v) => parseFloat(v.price))
      .filter((p) => !isNaN(p));

    await prisma.product.upsert({
      where: {
        tenantId_shopifyProductId: {
          tenantId,
          shopifyProductId: String(product.id),
        },
      },
      update: {
        title: product.title,
        status: product.status,
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
        updatedAt: new Date(product.updated_at),
      },
      create: {
        tenantId,
        shopifyProductId: String(product.id),
        title: product.title,
        status: product.status,
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at),
      },
    });
  }
}

async function syncOrders(tenantId, shopify) {
  const orders = await shopify.getOrders();
  console.log(`  🛒 Fetched ${orders.length} orders`);

  for (const order of orders) {
    // Find or get customer
    let customerId = null;
    if (order.customer?.id) {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId,
            shopifyCustomerId: String(order.customer.id),
          },
        },
      });
      customerId = customer?.id || null;
    }

    // Upsert order
    const orderRecord = await prisma.order.upsert({
      where: {
        tenantId_shopifyOrderId: {
          tenantId,
          shopifyOrderId: String(order.id),
        },
      },
      update: {
        customerId,
        totalPrice: parseFloat(order.total_price || 0),
        currency: order.currency,
        status: order.fulfillment_status || "pending",
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        updatedAt: new Date(order.updated_at),
      },
      create: {
        tenantId,
        shopifyOrderId: String(order.id),
        customerId,
        totalPrice: parseFloat(order.total_price || 0),
        currency: order.currency,
        status: order.fulfillment_status || "pending",
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        orderedAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
      },
    });

    // Sync order items
    if (order.line_items) {
      for (const item of order.line_items) {
        // Find product
        let productId = null;
        if (item.product_id) {
          const product = await prisma.product.findUnique({
            where: {
              tenantId_shopifyProductId: {
                tenantId,
                shopifyProductId: String(item.product_id),
              },
            },
          });
          productId = product?.id || null;
        }

        // Check if order item already exists
        const existing = await prisma.orderItem.findFirst({
          where: {
            orderId: orderRecord.id,
            productTitle: item.title,
          },
        });

        if (!existing) {
          await prisma.orderItem.create({
            data: {
              orderId: orderRecord.id,
              productId,
              productTitle: item.title,
              quantity: item.quantity,
              price: parseFloat(item.price),
            },
          });
        }
      }
    }
  }
}

async function generateMockData(tenantId) {
  // Generate mock customers
  const mockCustomers = [
    {
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
      totalSpent: 1250.5,
      ordersCount: 5,
    },
    {
      email: "jane.smith@example.com",
      firstName: "Jane",
      lastName: "Smith",
      totalSpent: 890.25,
      ordersCount: 3,
    },
    {
      email: "bob.wilson@example.com",
      firstName: "Bob",
      lastName: "Wilson",
      totalSpent: 2100.0,
      ordersCount: 8,
    },
    {
      email: "alice.brown@example.com",
      firstName: "Alice",
      lastName: "Brown",
      totalSpent: 450.75,
      ordersCount: 2,
    },
    {
      email: "charlie.davis@example.com",
      firstName: "Charlie",
      lastName: "Davis",
      totalSpent: 1680.3,
      ordersCount: 6,
    },
  ];

  console.log(`  📊 Creating ${mockCustomers.length} mock customers`);
  const createdCustomers = [];
  for (const customer of mockCustomers) {
    const created = await prisma.customer.upsert({
      where: {
        tenantId_shopifyCustomerId: {
          tenantId,
          shopifyCustomerId: `mock-${customer.email}`,
        },
      },
      update: customer,
      create: {
        tenantId,
        shopifyCustomerId: `mock-${customer.email}`,
        ...customer,
        phone: `+1-555-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdCustomers.push(created);
  }

  // Generate mock products
  const mockProducts = [
    {
      title: "Premium T-Shirt",
      status: "active",
      priceMin: 29.99,
      priceMax: 39.99,
    },
    {
      title: "Designer Jeans",
      status: "active",
      priceMin: 79.99,
      priceMax: 99.99,
    },
    {
      title: "Running Shoes",
      status: "active",
      priceMin: 89.99,
      priceMax: 129.99,
    },
    {
      title: "Leather Jacket",
      status: "active",
      priceMin: 199.99,
      priceMax: 299.99,
    },
    {
      title: "Wool Sweater",
      status: "active",
      priceMin: 49.99,
      priceMax: 69.99,
    },
  ];

  console.log(`  📦 Creating ${mockProducts.length} mock products`);
  const createdProducts = [];
  for (const product of mockProducts) {
    const created = await prisma.product.upsert({
      where: {
        tenantId_shopifyProductId: {
          tenantId,
          shopifyProductId: `mock-prod-${product.title
            .toLowerCase()
            .replace(/\s+/g, "-")}`,
        },
      },
      update: product,
      create: {
        tenantId,
        shopifyProductId: `mock-prod-${product.title
          .toLowerCase()
          .replace(/\s+/g, "-")}`,
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    createdProducts.push(created);
  }

  // Generate mock orders
  console.log(`  🛒 Creating mock orders`);
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const customer =
      createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - daysAgo);

    const numItems = Math.floor(1 + Math.random() * 3);
    let totalPrice = 0;
    const orderItems = [];

    for (let j = 0; j < numItems; j++) {
      const product =
        createdProducts[Math.floor(Math.random() * createdProducts.length)];
      const quantity = Math.floor(1 + Math.random() * 3);
      const price =
        product.priceMin +
        Math.random() * (product.priceMax - product.priceMin);
      totalPrice += price * quantity;
      orderItems.push({ product, quantity, price });
    }

    const order = await prisma.order.upsert({
      where: {
        tenantId_shopifyOrderId: {
          tenantId,
          shopifyOrderId: `mock-order-${i + 1}`,
        },
      },
      update: {
        customerId: customer.id,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        currency: "USD",
        status: "fulfilled",
        financialStatus: "paid",
        fulfillmentStatus: "fulfilled",
        orderedAt: orderDate,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        shopifyOrderId: `mock-order-${i + 1}`,
        customerId: customer.id,
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        currency: "USD",
        status: "fulfilled",
        financialStatus: "paid",
        fulfillmentStatus: "fulfilled",
        orderedAt: orderDate,
        updatedAt: new Date(),
      },
    });

    // Create order items
    for (const item of orderItems) {
      const existing = await prisma.orderItem.findFirst({
        where: {
          orderId: order.id,
          productTitle: item.product.title,
        },
      });

      if (!existing) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.product.id,
            productTitle: item.product.title,
            quantity: item.quantity,
            price: parseFloat(item.price.toFixed(2)),
          },
        });
      }
    }
  }

  // Generate mock events
  console.log(`  📈 Creating mock events`);
  const eventTypes = ["CART_ABANDONED", "CHECKOUT_STARTED", "ORDER_CREATED"];

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() - daysAgo);

    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    await prisma.event.create({
      data: {
        tenantId,
        type: eventType,
        rawPayload: {
          source: "mock",
          timestamp: eventDate.toISOString(),
        },
        occurredAt: eventDate,
      },
    });
  }
}

module.exports = { syncTenantData };
