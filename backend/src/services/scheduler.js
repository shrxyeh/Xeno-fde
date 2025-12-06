const { PrismaClient } = require('@prisma/client');
const { syncTenantData } = require('./syncService');

const prisma = new PrismaClient();

async function scheduledSync() {
  try {
    // Get all connected tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        accessToken: { not: null },
        connected: true
      }
    });

    console.log(`Found ${tenants.length} connected tenants to sync`);

    for (const tenant of tenants) {
      try {
        await syncTenantData(tenant.id);
      } catch (error) {
        console.error(`Failed to sync tenant ${tenant.name}:`, error.message);
        // Continue with other tenants
      }
    }

    console.log('Scheduled sync completed');
  } catch (error) {
    console.error('Scheduled sync error:', error);
  }
}

module.exports = { scheduledSync };
