import prisma from '../lib/prisma.js';

async function main() {
  console.log('Searching Audit logs for "EST" or "24200"...');
  
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { newValue: { path: ['estimateNumber'], equals: 'EST-0004' } },
        { newValue: { path: ['totalAmount'], equals: 24200 } },
        { newValue: { string_contains: '24200' } }
      ]
    },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Found ${logs.length} logs.`);
  logs.forEach(l => {
    console.log(`[${l.createdAt}] Action: ${l.action} | Entity: ${l.entityType} | ID: ${l.entityId}`);
    console.log(`New Value: ${JSON.stringify(l.newValue)}`);
  });

  if (logs.length === 0) {
    console.log('No specific logs. Listing all audit logs from last 24h:');
    const recent = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      take: 10
    });
    recent.forEach(l => console.log(`[${l.createdAt}] ${l.action} on ${l.entityType}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
