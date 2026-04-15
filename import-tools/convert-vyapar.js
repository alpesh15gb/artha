import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertVyaparExport(inputPath, outputPath) {
  console.log(`Reading Vyapar export from: ${inputPath}`);
  const content = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(content);

  const converted = {
    version: '1.1',
    exportDate: new Date().toISOString(),
    source: 'VyaparApp',
    target: 'Artha Cloud Accounting',
    parties: [],
    items: [],
    invoices: [],
    bankAccounts: [],
    expenses: [],
    payments: [],
  };

  if (data.accounts || data.ledgers) {
    const parties = data.accounts || data.ledgers || [];
    for (const acc of parties) {
      if (acc.type === 'Customer' || acc.type === 'Supplier' || acc.type === 'Sundry Debtors' || acc.type === 'Sundry Creditors') {
        converted.parties.push({
          name: acc.name,
          type: acc.type === 'Customer' || acc.type === 'Sundry Debtors' ? 'CUSTOMER' : 'SUPPLIER',
          gstin: acc.gstin || acc.GSTIN,
          pan: acc.pan || acc.PAN,
          phone: acc.mobile || acc.phone,
          email: acc.email,
          openingBalance: parseFloat(acc.openingBalance || acc.ob || 0),
          balanceType: acc.obType === 'Cr' ? 'PAYABLE' : 'RECEIVABLE',
          dueDays: parseInt(acc.creditPeriod || acc.dueDays || 0),
          billingAddress: parseAddress(acc.address || acc.billingAddress),
        });
      }
    }
  }

  if (data.inventory || data.stockItems || data.items) {
    const items = data.inventory || data.stockItems || data.items || [];
    for (const item of items) {
      converted.items.push({
        name: item.name || item.itemName,
        sku: item.sku || item.itemCode,
        hsnCode: item.hsn || item.hsnCode,
        category: item.category || item.itemGroup,
        unit: item.unit || 'NOS',
        taxRate: parseFloat(item.gstRate || item.taxRate || 18),
        sellingPrice: parseFloat(item.saleRate || item.sellingPrice || item.mrp),
        purchasePrice: parseFloat(item.purchaseRate || item.purchasePrice),
        mrp: item.mrp ? parseFloat(item.mrp) : undefined,
        openingStock: parseFloat(item.openingStock || item.stock || 0),
        currentStock: parseFloat(item.closingStock || item.currentStock || item.stock || 0),
        isService: item.isService || false,
      });
    }
  }

  if (data.vouchers || data.transactions || data.invoices) {
    const vouchers = data.vouchers || data.transactions || data.invoices || [];
    for (const vch of vouchers) {
      if (vch.voucherType === 'Sales' || vch.voucherType === 'Invoice') {
        const items = (vch.items || vch.inventory || []).map(inv => ({
          name: inv.item || inv.name,
          quantity: parseFloat(inv.qty || inv.quantity || 1),
          rate: parseFloat(inv.rate || inv.price),
          discount: parseFloat(inv.discount || 0),
          taxRate: parseFloat(inv.taxRate || 18),
        }));

        converted.invoices.push({
          invoiceNumber: vch.number || vch.voucherNumber || vch.invoiceNo,
          type: 'TAX_INVOICE',
          party: vch.party || vch.partyName || vch.ledger,
          date: vch.date,
          dueDate: vch.dueDate,
          items,
          status: mapStatus(vch.status),
          notes: vch.notes || vch.narration,
        });
      }
    }
  }

  console.log(`Converted: ${converted.parties.length} parties, ${converted.items.length} items, ${converted.invoices.length} invoices`);

  fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
  console.log(`Output written to: ${outputPath}`);

  return converted;
}

function parseAddress(addr) {
  if (!addr) return {};
  if (typeof addr === 'string') {
    const parts = addr.split(',').map(s => s.trim());
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      pincode: parts[3] || '',
    };
  }
  return addr;
}

function mapStatus(status) {
  if (!status) return 'DRAFT';
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('complete')) return 'PAID';
  if (s.includes('partial')) return 'PARTIAL';
  return 'SENT';
}

const args = process.argv.slice(2);
if (args.length >= 2) {
  convertVyaparExport(args[0], args[1]);
} else {
  console.log('Usage: node convert-vyapar.js <input-file> <output-file>');
  console.log('Example: node convert-vyapar.js vyapar-export.json artha-import.json');
}
