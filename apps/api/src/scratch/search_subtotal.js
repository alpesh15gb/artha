import prisma from '../lib/prisma.js';

async function main() {
  console.log('Searching for 24200 in subtotal or totalAmount...');
  
  const documents = await Promise.all([
    prisma.invoice.findMany({ where: { OR: [{ subtotal: { gte: 24100, lte: 24300 } }, { totalAmount: { gte: 24100, lte: 24300 } }] } }),
    prisma.estimate.findMany({ where: { OR: [{ subtotal: { gte: 24100, lte: 24300 } }, { totalAmount: { gte: 24100, lte: 24300 } }] } }),
    prisma.purchase.findMany({ where: { OR: [{ subtotal: { gte: 24100, lte: 24300 } }, { totalAmount: { gte: 24100, lte: 24300 } }] } }),
  ]);

  const flat = documents.flat();
  console.log(`Found ${flat.length} matches.`);
  flat.forEach(d => console.log(`${d.createdAt} | ${d.totalAmount} | ${d.invoiceNumber || d.estimateNumber}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
