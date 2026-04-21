import prisma from '../lib/prisma.js';

async function main() {
  console.log('Searching for invoice with amount 24200...');
  
  const invoices = await prisma.invoice.findMany({
    where: {
      totalAmount: {
        gte: 24100,
        lte: 24300
      }
    },
    include: {
      business: { select: { name: true } },
      party: { select: { name: true } }
    }
  });

  if (invoices.length === 0) {
    console.log('No exact matches. Listing latest 5 invoices instead:');
    const latest = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        business: { select: { name: true } },
        party: { select: { name: true } }
      }
    });
    latest.forEach(inv => {
      console.log(`[${inv.createdAt}] ID: ${inv.id} | No: ${inv.invoiceNumber} | Total: ${inv.totalAmount} | Biz: ${inv.business.name} | Status: ${inv.status}`);
    });
  } else {
    console.log(`Found ${invoices.length} potential matches:`);
    invoices.forEach(inv => {
      console.log(`ID: ${inv.id} | No: ${inv.invoiceNumber} | Total: ${inv.totalAmount} | Business: ${inv.business.name} | Party: ${inv.party?.name} | CreatedAt: ${inv.createdAt} | Status: ${inv.status}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
