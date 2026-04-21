import prisma from '../lib/prisma.js';

async function main() {
  console.log('Searching for missing 24200 in Invoices, Estimates, and Purchases...');
  
  const [invoices, estimates, purchases] = await Promise.all([
    prisma.invoice.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.estimate.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.purchase.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
  ]);

  console.log(`Invoices: ${invoices.length}`);
  console.log(`Estimates: ${estimates.length}`);
  console.log(`Purchases: ${purchases.length}`);

  [...invoices, ...estimates, ...purchases].forEach(doc => {
    console.log(`- Type: ${doc.invoiceNumber ? 'INV' : doc.estimateNumber ? 'EST' : 'PUR'} | No: ${doc.invoiceNumber || doc.estimateNumber || doc.purchaseNumber} | Total: ${doc.totalAmount} | Status: ${doc.status} | Biz: ${doc.business.name}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
