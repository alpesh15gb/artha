import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const parties = await prisma.party.findMany({
    include: {
      invoices: true,
      purchases: true,
      transactions: true
    }
  });

  console.log("=== Prisma Party Balance Analysis ===");
  for (const p of parties) {
    const totalInvoiced = p.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPurchased = p.purchases.reduce((sum, pur) => sum + pur.totalAmount, 0);
    const totalReceipts = p.transactions.filter(t => t.type === 'RECEIPT').reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = p.transactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);
    
    // Balance = Opening + Invoiced - Purchased - Receipts + Payments 
    // Usually for Customer: Balance = Invoiced - Receipts
    // Usually for Supplier: Balance = Purchased - Payments (but represented as negative or separate)
    
    const balance = (p.openingBalance || 0) + totalInvoiced - totalPurchased - totalReceipts + totalPayments;
    
    console.log(`${p.name.padEnd(35)} Bal=${balance.toString().padStart(10)} Type=${p.partyType}`);
  }
}

check().finally(() => prisma.$disconnect());
