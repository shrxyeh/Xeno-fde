const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database with demo data...\n");

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { shopDomain: "demo-store.myshopify.com" },
    update: {},
    create: {
      name: "Demo Store",
      shopDomain: "demo-store.myshopify.com",
      accessToken: "demo_token_for_testing",
      connected: true,
    },
  });
  console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);

  // Create admin user
  const hashedPassword = await hashPassword("demo123");
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@demo.com",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create demo customers
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        shopifyCustomerId: `customer_${i}`,
        email: `customer${i}@example.com`,
        firstName: `Customer`,
        lastName: `${i}`,
        phone: `+1234567${String(i).padStart(4, "0")}`,
        totalSpent: Math.random() * 5000,
        ordersCount: Math.floor(Math.random() * 10) + 1,
        createdAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ),
        updatedAt: new Date(),
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Create demo products
  const products = [];
  const productNames = [
    "Wireless Headphones",
    "Smart Watch",
    "Laptop Backpack",
    "USB-C Cable",
    "Phone Case",
    "Bluetooth Speaker",
    "Webcam HD",
    "Mechanical Keyboard",
    "Gaming Mouse",
    "Monitor Stand",
  ];

  for (let i = 0; i < productNames.length; i++) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        shopifyProductId: `product_${i + 1}`,
        title: productNames[i],
        status: "active",
        priceMin: 10 + Math.random() * 90,
        priceMax: 50 + Math.random() * 200,
        createdAt: new Date(
          Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
        ),
        updatedAt: new Date(),
      },
    });
    products.push(product);
  }
  console.log(`✅ Created ${products.length} products`);

  // Create demo orders (last 90 days)
  const orders = [];
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  for (let i = 1; i <= 150; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const orderedAt = new Date(
      ninetyDaysAgo + Math.random() * (now - ninetyDaysAgo)
    );
    const totalPrice = 20 + Math.random() * 500;

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        shopifyOrderId: `order_${i}`,
        customerId: Math.random() > 0.1 ? customer.id : null, // 10% guest orders
        totalPrice,
        currency: "USD",
        status: ["fulfilled", "partial", "unfulfilled"][
          Math.floor(Math.random() * 3)
        ],
        financialStatus: ["paid", "pending", "partially_paid"][
          Math.floor(Math.random() * 3)
        ],
        fulfillmentStatus: ["fulfilled", "partial", "unfulfilled"][
          Math.floor(Math.random() * 3)
        ],
        orderedAt,
        updatedAt: orderedAt,
      },
    });
    orders.push(order);

    // Create 1-3 order items per order
    const itemCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          productTitle: product.title,
          quantity: Math.floor(Math.random() * 3) + 1,
          price:
            product.priceMin +
            Math.random() * (product.priceMax - product.priceMin),
        },
      });
    }
  }
  console.log(`✅ Created ${orders.length} orders with line items`);

  // Create demo events (last 30 days)
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const eventTypes = [
    "CART_ABANDONED",
    "CHECKOUT_STARTED",
    "ORDER_CREATED",
    "CUSTOMER_CREATED",
  ];

  for (let i = 0; i < 200; i++) {
    const customer =
      Math.random() > 0.2
        ? customers[Math.floor(Math.random() * customers.length)]
        : null;
    const occurredAt = new Date(
      thirtyDaysAgo + Math.random() * (now - thirtyDaysAgo)
    );

    await prisma.event.create({
      data: {
        tenantId: tenant.id,
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        customerId: customer?.id || null,
        rawPayload: {
          demo: true,
          timestamp: occurredAt.toISOString(),
        },
        occurredAt,
      },
    });
  }
  console.log(`✅ Created 200 events`);

  console.log("\n Seeding completed!\n");
  console.log("Login credentials:");
  console.log("  Email: admin@demo.com");
  console.log("  Password: demo123");
  console.log("\nVisit: http://localhost:3000\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
