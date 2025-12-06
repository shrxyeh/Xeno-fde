# Xeno - Multi-Tenant Shopify Analytics Platform

A full-stack B2B SaaS platform that provides Shopify merchants with analytics dashboards, customer insights, and real-time data synchronization.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Key Features](#key-features)

---

## Overview

Xeno allows multiple Shopify merchants to connect their stores and view analytics about customers, orders, products, and engagement events. The platform features multi-tenant architecture with complete data isolation, automated data synchronization, and an interactive dashboard.

**Core Capabilities:**
- Multi-tenant architecture with tenant-scoped data isolation
- Shopify OAuth integration and Admin API (REST v2024-01)
- Automated sync scheduler (runs every 15 minutes)
- Real-time webhook processing for orders, customers, checkouts
- JWT-based authentication with role-based access control
- Interactive dashboard with charts, metrics, and date filtering
- Event tracking for cart abandonment and checkout flows

---

## Tech Stack

**Backend:** Node.js, Express.js, Prisma ORM, PostgreSQL, JWT Authentication, node-cron  
**Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts, Axios  
**Deployment:** Railway/Render (Backend + DB), Vercel (Frontend)

---

## Quick Start

### Live Demo

**Deployed Application:** https://xeno-frontend-shreyash-637f0ecc3f8d.herokuapp.com/

**Demo Credentials:**
- Email: `admin@demo.com`
- Password: `demo123`

The deployed application includes pre-seeded data with 20 customers, 150+ orders, and analytics for demonstration purposes.

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Shopify Partner account (optional for demo)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd xeno

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and credentials

# Run migrations and seed demo data
npx prisma migrate dev --name init
npm run seed

# Start backend (runs on port 3001)
npm run dev

# Frontend setup (in new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env

# Start frontend (runs on port 3000)
npm run dev
```

### Login with Demo Account

**For Local Development:**
Open `http://localhost:3000` and login with:
- Email: `admin@demo.com`
- Password: `demo123`

**For Deployed Application:**
Visit https://xeno-frontend-shreyash-637f0ecc3f8d.herokuapp.com/ and use the same credentials:
- Email: `admin@demo.com`
- Password: `demo123`

You'll see a dashboard with 20 customers, 150+ orders, and analytics charts.

### Environment Variables

**Backend `.env`:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/xeno_db"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
SHOPIFY_API_KEY="your-api-key"
SHOPIFY_API_SECRET="your-api-secret"
SHOPIFY_SCOPES="read_customers,read_orders,read_products,read_checkouts,read_inventory"
SHOPIFY_APP_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
```

**Frontend `.env`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Key Features

### Multi-Tenancy
- Shared database with `tenantId` isolation
- All queries automatically scoped via JWT middleware
- Frontend never exposes tenant IDs

### Data Synchronization
- **Pull**: Automated scheduler runs every 15 minutes
- **Push**: Webhooks for real-time updates
- Idempotent upserts using Shopify IDs

### Dashboard Metrics
- Total customers, orders, revenue
- Average order value, repeat customer rate
- Orders over time (line chart with date filtering)
- Top customers by spend
- Event timeline (cart abandoned, checkout flows)

### Security
- bcrypt password hashing (10 rounds)
- JWT with 7-day expiration
- HTTP-only cookies
- HMAC webhook verification (enable for production)

---

## Project Structure

```
xeno/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Shopify, sync, scheduler logic
│   │   ├── middleware/      # Auth, error handling
│   │   ├── utils/           # JWT, password, HMAC
│   │   └── server.js        # Express app
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.js          # Demo data
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   └── dashboard/       # Dashboard page
│   ├── components/          # Charts, tables, cards
│   ├── lib/api.ts           # API client
│   └── package.json
│
├── VIDEO_SCRIPT.md          # Presentation guide
└── README.md                # This file
```

---

## Common Issues

**Database Connection Error:** Verify PostgreSQL is running and DATABASE_URL is correct

**Port Already in Use:** Kill process on port 3001/3000 or change PORT in .env

**Prisma Migration Failed:** Run `npx prisma migrate reset` to reset database

**Login Not Working:** Check browser console, verify JWT_SECRET matches, check cookies in DevTools

**No Data in Dashboard:** Run `npm run seed` in backend, or trigger manual sync after Shopify OAuth

**Shopify OAuth Fails:** Verify app URLs match in Shopify Partner Dashboard and .env files

---

## Production Considerations

**Current MVP Limitations:**
- Simplified pagination (250 records/batch)
- HMAC verification disabled (enable for production)
- No rate limiting or retry logic
- In-process scheduling (use external queue for scale)
- Single currency support

**Before Production:**
- Enable HMAC verification in webhooks
- Implement rate limiting
- Add email verification for signups
- Encrypt accessToken at rest
- Set up monitoring (Sentry, Datadog)
- Database backups and connection pooling
- Use managed secrets (not .env files)

---

## License

MIT

---

## Contact

Created for Xeno FDE Internship Assignment 2025

Repository: https://github.com/shrxyeh/Xeno-fde
