import prisma from '../lib/prisma.js';

async function main() {
  console.log('Listing ALL documents in last 48 hours:');
  
  const from = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [invoices, estimates, purchases] = await Promise.all([
    prisma.invoice.findMany({ where: { createdAt: { gte: from } }, include: { business: true } }),
    prisma.estimate.findMany({ where: { createdAt: { gte: from } }, include: { business: true } }),
    prisma.purchase.findMany({ where: { createdAt: { gte: from } }, include: { business: true } }),
  ]);

  const all = [
    ...invoices.map(i => ({ type: 'INV', no: i.invoiceNumber, amount: i.totalAmount, date: i.createdAt, biz: i.business.name, status: i.status })),
    ...estimates.map(e => ({ type: 'EST', no: e.estimateNumber, amount: e.totalAmount, date: e.createdAt, biz: e.business.name, status: e.status })),
    ...purchases.map(p => ({ type: 'PUR', no: p.purchaseNumber, amount: p.totalAmount, date: p.createdAt, biz: p.business.name, status: p.status }))
  ].sort((a,b) => b.date - a.date);

  console.log(`Found ${all.length} total documents.`);
  all.forEach(d => {
    console.log(`[${d.date.toISOString()}] ${d.type} ${d.no} | Amount: ${d.amount} | Status: ${d.status} | Biz: ${d.biz}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
