import prisma from '../lib/prisma.js';

async function main() {
  console.log('Searching for Estimate matching "4" or "24200"...');
  
  const estimates = await prisma.estimate.findMany({
    where: {
      OR: [
        { estimateNumber: { contains: '4' } },
        { totalAmount: { gte: 24000, lte: 24500 } }
      ]
    },
    include: { business: true }
  });

  console.log(`Found ${estimates.length} estimates.`);
  estimates.forEach(e => {
    console.log(`- Biz: ${e.business.name} | No: ${e.estimateNumber} | Total: ${e.totalAmount} | Status: ${e.status} | CreatedAt: ${e.createdAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
