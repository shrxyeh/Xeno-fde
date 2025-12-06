const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard summary
router.get("/summary", authenticate, async (req, res) => {
  const tenantId = req.tenantId;

  // Total customers
  const totalCustomers = await prisma.customer.count({
    where: { tenantId },
  });

  // Total orders
  const totalOrders = await prisma.order.count({
    where: { tenantId },
  });

  // Total revenue of completed orders only
  const revenueData = await prisma.order.aggregate({
    where: {
      tenantId,
      financialStatus: { in: ["paid", "partially_paid"] },
    },
    _sum: {
      totalPrice: true,
    },
  });

  const totalRevenue = revenueData._sum.totalPrice || 0;

  // Average order value
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Repeat customer rate
  const customersWithMultipleOrders = await prisma.customer.count({
    where: {
      tenantId,
      ordersCount: { gt: 1 },
    },
  });

  const repeatCustomerRate =
    totalCustomers > 0
      ? (customersWithMultipleOrders / totalCustomers) * 100
      : 0;

  res.json({
    totalCustomers,
    totalOrders,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    repeatCustomerRate: parseFloat(repeatCustomerRate.toFixed(2)),
  });
});

// Get orders by date
router.get("/orders-by-date", authenticate, async (req, res) => {
  const tenantId = req.tenantId;
  const { from, to } = req.query;

  if (!from || !to) {
    return res
      .status(400)
      .json({ error: "from and to dates are required (YYYY-MM-DD)" });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  // Get orders grouped by date
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      orderedAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      orderedAt: true,
      totalPrice: true,
      financialStatus: true,
    },
  });

  // Group by date
  const dateMap = {};
  orders.forEach((order) => {
    const date = order.orderedAt.toISOString().split("T")[0];
    if (!dateMap[date]) {
      dateMap[date] = {
        date,
        ordersCount: 0,
        revenue: 0,
      };
    }
    dateMap[date].ordersCount++;
    if (
      order.financialStatus === "paid" ||
      order.financialStatus === "partially_paid"
    ) {
      dateMap[date].revenue += order.totalPrice;
    }
  });

  const result = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      ...item,
      revenue: parseFloat(item.revenue.toFixed(2)),
    }));

  res.json(result);
});

// Get top customers
router.get("/top-customers", authenticate, async (req, res) => {
  const tenantId = req.tenantId;
  const limit = parseInt(req.query.limit || "5");

  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: {
      totalSpent: "desc",
    },
    take: limit,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      totalSpent: true,
      ordersCount: true,
    },
  });

  const result = customers.map((customer) => ({
    customerId: customer.id,
    name:
      `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "N/A",
    email: customer.email || "N/A",
    totalSpend: parseFloat(customer.totalSpent.toFixed(2)),
    orderCount: customer.ordersCount,
  }));

  res.json(result);
});

// Get events summary
router.get("/events-summary", authenticate, async (req, res) => {
  const tenantId = req.tenantId;
  const daysAgo = parseInt(req.query.days || "30");

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysAgo);

  const events = await prisma.event.groupBy({
    by: ["type"],
    where: {
      tenantId,
      occurredAt: { gte: fromDate },
    },
    _count: {
      type: true,
    },
  });

  const summary = {};
  events.forEach((event) => {
    summary[event.type.toLowerCase()] = event._count.type;
  });

  res.json({
    cartAbandoned: summary.cart_abandoned || 0,
    checkoutStarted: summary.checkout_started || 0,
    checkoutCompleted: summary.checkout_completed || 0,
    orderCreated: summary.order_created || 0,
    customerCreated: summary.customer_created || 0,
    daysAnalyzed: daysAgo,
  });
});

// Get recent events timeline
router.get("/events-timeline", authenticate, async (req, res) => {
  const tenantId = req.tenantId;
  const daysAgo = parseInt(req.query.days || "30");

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - daysAgo);

  const events = await prisma.event.findMany({
    where: {
      tenantId,
      occurredAt: { gte: fromDate },
    },
    select: {
      type: true,
      occurredAt: true,
    },
    orderBy: {
      occurredAt: "asc",
    },
  });

  // Group by date and type
  const dateMap = {};
  events.forEach((event) => {
    const date = event.occurredAt.toISOString().split("T")[0];
    if (!dateMap[date]) {
      dateMap[date] = {
        date,
        cart_abandoned: 0,
        checkout_started: 0,
        checkout_completed: 0,
        order_created: 0,
      };
    }
    const typeKey = event.type.toLowerCase();
    if (dateMap[date][typeKey] !== undefined) {
      dateMap[date][typeKey]++;
    }
  });

  const result = Object.values(dateMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  res.json(result);
});

module.exports = router;
