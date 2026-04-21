const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Searching for invoice with amount 24200...');
  
  const invoices = await prisma.invoice.findMany({
    where: {
      totalAmount: {
        gte: 24199.9,
        lte: 24200.1
      }
    },
    include: {
      business: { select: { name: true } },
      party: { select: { name: true } }
    }
  });

  if (invoices.length === 0) {
    console.log('No exact matches for 24200. Searching for all invoices created in the last 48 hours...');
    const recent = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      },
      include: {
        business: { select: { name: true } },
        party: { select: { name: true } }
      }
    });
    console.log(`Found ${recent.length} recent invoices:`);
    recent.forEach(inv => {
      console.log(`ID: ${inv.id} | No: ${inv.invoiceNumber} | Total: ${inv.totalAmount} | Business: ${inv.business.name} | Party: ${inv.party?.name} | CreatedAt: ${inv.createdAt}`);
    });
  } else {
    console.log(`Found ${invoices.length} potential matches:`);
    invoices.forEach(inv => {
      console.log(`ID: ${inv.id} | No: ${inv.invoiceNumber} | Total: ${inv.totalAmount} | Business: ${inv.business.name} | Party: ${inv.party?.name} | CreatedAt: ${inv.createdAt}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
