const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function addDemoData() {
  try {
    const tenantId = "83a18c73-43fb-4ed4-9662-c9d221ff318b"; // Dev Store
    const now = new Date();

    console.log("\n Adding demo data to Dev Store...\n");

    // Create customers with Indian names and emails
    const customers = [
      {
        shopifyCustomerId: "demo-cust-1",
        firstName: "Raj",
        lastName: "Sharma",
        email: "raj.sharma@gmail.com",
        totalSpent: 35000.0,
        ordersCount: 3,
      },
      {
        shopifyCustomerId: "demo-cust-2",
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@gmail.com",
        totalSpent: 52500.0,
        ordersCount: 5,
      },
      {
        shopifyCustomerId: "demo-cust-3",
        firstName: "Amit",
        lastName: "Kumar",
        email: "amit.kumar@outlook.com",
        totalSpent: 28000.0,
        ordersCount: 2,
      },
      {
        shopifyCustomerId: "demo-cust-4",
        firstName: "Sneha",
        lastName: "Reddy",
        email: "sneha.reddy@yahoo.in",
        totalSpent: 67500.0,
        ordersCount: 7,
      },
      {
        shopifyCustomerId: "demo-cust-5",
        firstName: "Vikram",
        lastName: "Singh",
        email: "vikram.singh@gmail.com",
        totalSpent: 18500.0,
        ordersCount: 1,
      },
    ];

    console.log(" Creating customers...");
    for (const customer of customers) {
      await prisma.customer.upsert({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId,
            shopifyCustomerId: customer.shopifyCustomerId,
          },
        },
        update: { ...customer, updatedAt: now },
        create: { ...customer, tenantId, createdAt: now, updatedAt: now },
      });
    }
    console.log(`✅ Created ${customers.length} customers`);

    // Create products with INR pricing
    const products = [
      {
        shopifyProductId: "demo-prod-1",
        title: "Premium Wireless Headphones",
        status: "active",
        priceMin: 12000.0,
        priceMax: 12000.0,
      },
      {
        shopifyProductId: "demo-prod-2",
        title: "Smart Watch Series X",
        status: "active",
        priceMin: 25000.0,
        priceMax: 25000.0,
      },
      {
        shopifyProductId: "demo-prod-3",
        title: "Bluetooth Speaker Pro",
        status: "active",
        priceMin: 6500.0,
        priceMax: 6500.0,
      },
      {
        shopifyProductId: "demo-prod-4",
        title: "USB-C Charging Cable",
        status: "active",
        priceMin: 1500.0,
        priceMax: 1500.0,
      },
      {
        shopifyProductId: "demo-prod-5",
        title: "Laptop Stand Aluminum",
        status: "active",
        priceMin: 4000.0,
        priceMax: 4000.0,
      },
    ];

    console.log(" Creating products...");
    for (const product of products) {
      await prisma.product.upsert({
        where: {
          tenantId_shopifyProductId: {
            tenantId,
            shopifyProductId: product.shopifyProductId,
          },
        },
        update: { ...product, updatedAt: now },
        create: { ...product, tenantId, createdAt: now, updatedAt: now },
      });
    }
    console.log(`✅ Created ${products.length} products`);

    // Get created customers from DB to get their IDs
    const dbCustomers = await prisma.customer.findMany({
      where: { tenantId },
      select: { id: true, shopifyCustomerId: true },
    });

    // Create orders (last 30 days)
    const orders = [];

    console.log("🛒 Creating orders...");
    for (let i = 0; i < 20; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - daysAgo);

      const customer = customers[Math.floor(Math.random() * customers.length)];
      const dbCustomer = dbCustomers.find(
        (c) => c.shopifyCustomerId === customer.shopifyCustomerId
      );
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const totalPrice = product.priceMin * quantity;

      const order = await prisma.order.upsert({
        where: {
          tenantId_shopifyOrderId: {
            tenantId,
            shopifyOrderId: `demo-order-${i + 1}`,
          },
        },
        update: {
          customerId: dbCustomer.id,
          totalPrice,
          currency: "USD",
          status: "paid",
          orderedAt: orderDate,
          updatedAt: orderDate,
        },
        create: {
          tenantId,
          shopifyOrderId: `demo-order-${i + 1}`,
          customerId: dbCustomer.id,
          totalPrice,
          currency: "USD",
          status: "paid",
          orderedAt: orderDate,
          updatedAt: orderDate,
        },
      });

      orders.push(order);
    }
    console.log(`✅ Created ${orders.length} orders`);

    // Create events
    const eventTypes = ["CART_ABANDONED", "CHECKOUT_STARTED", "ORDER_CREATED"];
    const events = [];

    console.log(" Creating events...");
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() - daysAgo);

      const customer = customers[Math.floor(Math.random() * customers.length)];
      const dbCustomer = dbCustomers.find(
        (c) => c.shopifyCustomerId === customer.shopifyCustomerId
      );
      const eventType =
        eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const event = await prisma.event.create({
        data: {
          tenantId,
          customerId: dbCustomer.id,
          type: eventType,
          rawPayload: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
          occurredAt: eventDate,
        },
      });

      events.push(event);
    }
    console.log(`✅ Created ${events.length} events`);

    console.log("\n🎉 Demo data added successfully!");
    console.log(" Summary:");
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${products.length} products`);
    console.log(`   - ${orders.length} orders`);
    console.log(`   - ${events.length} events`);
    console.log("\n💡 Refresh your dashboard to see the data!");
  } catch (error) {
    console.error("❌ Error adding demo data:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDemoData();
