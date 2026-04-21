import prisma from '../lib/prisma.js';

async function main() {
  const estimates = await prisma.estimate.findMany({ select: { estimateNumber: true, totalAmount: true } });
  console.log('ALL ESTIMATES:');
  estimates.forEach(e => console.log(`- ${e.estimateNumber}: ${e.totalAmount}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
