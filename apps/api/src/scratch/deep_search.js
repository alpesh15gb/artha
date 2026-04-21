import prisma from '../lib/prisma.js';

async function main() {
  console.log('Deep search for 24200 across ALL businesses/tables...');
  
  const [invoices, estimates, purchases, payments, receipts, expenses] = await Promise.all([
    prisma.invoice.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.estimate.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.purchase.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.payment.findMany({ where: { amount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.receipt.findMany({ where: { amount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
    prisma.expense.findMany({ where: { totalAmount: { gte: 24000, lte: 24500 } }, include: { business: true } }),
  ]);

  const results = [
    ...invoices.map(i => ({ type: 'INV', val: i.totalAmount, biz: i.business.name, id: i.id })),
    ...estimates.map(e => ({ type: 'EST', val: e.totalAmount, biz: e.business.name, id: e.id })),
    ...purchases.map(p => ({ type: 'PUR', val: p.totalAmount, biz: p.business.name, id: p.id })),
    ...payments.map(p => ({ type: 'PAY', val: p.amount, biz: p.business.name, id: p.id })),
    ...receipts.map(r => ({ type: 'RCP', val: r.amount, biz: r.business.name, id: r.id })),
    ...expenses.map(e => ({ type: 'EXP', val: e.totalAmount, biz: e.business.name, id: e.id })),
  ];

  console.log(`Results: ${results.length}`);
  results.forEach(r => console.log(`${r.type} | ${r.val} | Business: ${r.biz} | ID: ${r.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
