import prisma from "../lib/prisma.js";
import { calculateDocumentTotals } from "@artha/common";

/**
 * IntegrityService
 * 
 * Provides self-healing mechanisms for financial data.
 */
export class IntegrityService {
  
  /**
   * Verify and heal invoice balances for a specific business.
   */
  static async verifyInvoices(businessId) {
    const results = { verified: 0, healed: 0, errors: [] };
    
    const invoices = await prisma.invoice.findMany({
      where: { businessId },
      include: { items: true, payments: true } // Assuming payments relation exists
    });

    for (const inv of invoices) {
      try {
        const calculated = calculateDocumentTotals(inv.items, inv.discountPercent, inv.roundOff);
        const actualPaid = inv.paidAmount; // We should sum real transactions here ideally
        
        let needsUpdate = false;
        const updates = {};

        // Check 1: Total Amount Mismatch
        if (Math.abs(calculated.totalAmount - inv.totalAmount) > 0.05) {
          updates.totalAmount = calculated.totalAmount;
          needsUpdate = true;
        }

        // Check 2: Balance Due Inconsistency
        const expectedBalance = inv.totalAmount - actualPaid;
        if (Math.abs(expectedBalance - inv.balanceDue) > 0.05) {
          updates.balanceDue = Math.max(0, expectedBalance);
          needsUpdate = true;
        }

        if (needsUpdate) {
          await prisma.invoice.update({
            where: { id: inv.id },
            data: updates
          });
          results.healed++;
        }
        
        results.verified++;
      } catch (err) {
        results.errors.push({ id: inv.id, error: err.message });
      }
    }

    return results;
  }

  /**
   * Verify party balances matches sum of their documents
   */
  static async verifyPartyBalances(businessId) {
    const results = { verified: 0, healed: 0, errors: [] };
    
    const parties = await prisma.party.findMany({
      where: { businessId },
      include: {
        invoices: { select: { totalAmount: true, paidAmount: true } },
        purchases: { select: { totalAmount: true, paidAmount: true } },
        transactions: { select: { amount: true, type: true } }
      }
    });

    for (const party of parties) {
      try {
        let needsUpdate = false;
        
        // Sum of unpaid invoices/purchases
        const invoiceUnpaid = party.invoices.reduce((sum, i) => sum + (i.totalAmount - (i.paidAmount || 0)), 0);
        const purchaseUnpaid = party.purchases.reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount || 0)), 0);
        
        // Final expected balance from transactions
        // Note: This is simplified; real logic depends on opening balance
        const expectedBalance = party.openingBalance + invoiceUnpaid - purchaseUnpaid;
        
        if (Math.abs(expectedBalance - (party.balance || 0)) > 0.1) {
          await prisma.party.update({
            where: { id: party.id },
            data: { balance: expectedBalance }
          });
          results.healed++;
        }
        results.verified++;
      } catch (err) {
        results.errors.push({ id: party.id, error: err.message });
      }
    }
    return results;
  }

  /**
   * Reconciles physical stock from purchase/sale history.
   */
  static async verifyStockIntegrity(businessId) {
    const results = { verified: 0, healed: 0, errors: [] };
    
    const items = await prisma.item.findMany({
      where: { businessId },
      include: {
        invoiceItems: { select: { quantity: true } },
        purchaseItems: { select: { quantity: true } }
      }
    });

    for (const item of items) {
      try {
        const sold = item.invoiceItems.reduce((sum, i) => sum + i.quantity, 0);
        const bought = item.purchaseItems.reduce((sum, i) => sum + i.quantity, 0);
        const expectedStock = (item.openingStock || 0) + bought - sold;

        if (Math.abs(expectedStock - (item.stockQuantity || 0)) > 0.001) {
          await prisma.item.update({
            where: { id: item.id },
            data: { stockQuantity: expectedStock }
          });
          results.healed++;
        }
        results.verified++;
      } catch (err) {
        results.errors.push({ id: item.id, error: err.message });
      }
    }
    return results;
  }
}
