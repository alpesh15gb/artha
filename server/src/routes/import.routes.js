import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import AdmZip from 'adm-zip';

const router = Router();
const prisma = new PrismaClient();

function safeFloat(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

router.use(authenticate);
router.use(verifyBusinessOwnership);

router.post('/vyapar', async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { businessId, clearExisting } = req.body;
    const file = req.files.file;
    
    // Clear existing data if requested
    if (clearExisting === 'true' || clearExisting === true) {
      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({ where: { invoice: { businessId } } }),
        prisma.invoice.deleteMany({ where: { businessId } }),
        prisma.party.deleteMany({ where: { businessId } }),
        prisma.item.deleteMany({ where: { businessId } }),
      ]);
    }
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${uuidv4()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    const importLog = await prisma.importLog.create({
      data: {
        businessId,
        importType: 'VYAPAR_SQLITE',
        fileName: file.name,
        fileSize: file.size,
        recordsTotal: 0,
        recordsImported: 0,
        recordsFailed: 0,
        status: 'PROCESSING',
      },
    });

    res.json({
      success: true,
      message: 'File uploaded, processing started',
      data: { importId: importLog.id },
    });

    processImport(filePath, businessId, importLog.id).catch(console.error);
  } catch (error) {
    next(error);
  }
});

async function processImport(filePath, businessId, importLogId) {
  let db = null;
  let extractedFile = null;
  
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      await importJsonData(data, businessId, importLogId);
    } else if (ext === '.vyb' || ext === '.zip') {
      try {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();
        
        const vypEntry = entries.find(e => e.entryName.endsWith('.vyp'));
        if (vypEntry) {
          const tempDbPath = path.join(path.dirname(filePath), `${uuidv4()}.vyp`);
          const zipData = zip.readFile(vypEntry);
          fs.writeFileSync(tempDbPath, zipData);
          extractedFile = tempDbPath;
          
          db = new Database(extractedFile, { readonly: true });
          await importFromSqlite(db, businessId, importLogId);
        } else {
          throw new Error('No .vyp file found in ZIP');
        }
      } catch (zipError) {
        db = new Database(filePath, { readonly: true });
        await importFromSqlite(db, businessId, importLogId);
      }
    } else if (ext === '.db') {
      db = new Database(filePath, { readonly: true });
      await importFromSqlite(db, businessId, importLogId);
    } else {
      throw new Error('Unsupported file format: ' + ext);
    }

    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: 'COMPLETED' },
    });
  } catch (error) {
    console.error('Import error:', error);
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: 'FAILED' },
    });
  } finally {
    if (db) {
      try { db.close(); } catch {}
    }
    if (extractedFile) {
      try { fs.unlinkSync(extractedFile); } catch {}
    }
    try { fs.unlinkSync(filePath); } catch {}
  }
}

async function importFromSqlite(db, businessId, importLogId) {
  console.log('Importing from Vyapar SQLite - Full Import...');
  let imported = 0;
  let failed = 0;

  try {
    const items = db.prepare("SELECT * FROM kb_items").all();
    const parties = db.prepare("SELECT * FROM kb_names").all();
    const transactions = db.prepare("SELECT * FROM kb_transactions").all();
    const lineItems = db.prepare("SELECT * FROM kb_lineitems").all();
    const taxCodes = db.prepare("SELECT * FROM kb_tax_code").all();
    
    console.log(`Read: ${items.length} items, ${parties.length} parties, ${transactions.length} txns, ${lineItems.length} line items`);
    
    const taxRateMap = new Map();
    for (const tax of taxCodes) {
      taxRateMap.set(tax.tax_code_id, safeFloat(tax.tax_rate));
    }

    // 1. Import ITEMS
    const itemMap = new Map();
    for (const item of items) {
      try {
        const taxRate = item.item_tax_id ? (taxRateMap.get(item.item_tax_id) || 18) : 18;
        const newItem = await prisma.item.create({
          data: {
              businessId,
              name: item.item_name || '',
              sku: item.item_code || '',
              hsnCode: item.item_hsn_sac_code || '',
              description: item.item_description || '',
              unit: 'NOS',
              sellingPrice: safeFloat(item.item_sale_unit_price),
              purchasePrice: safeFloat(item.item_purchase_unit_price),
              mrp: safeFloat(item.item_mrp),
              taxRate,
              currentStock: safeFloat(item.item_stock_quantity),
              isService: item.item_type === 2,
              isActive: item.item_is_active !== 0,
            },
          });
          itemMap.set(item.item_id, newItem.id);
          imported++;
        } catch (e) {
          console.error("Item Import Failed:", e.message, "Item:", item.item_name);
          failed++;
        }
      }

      // 2. Import PARTIES
      const partyMap = new Map();
      
      // Pre-compute transaction sums per party for classification
      const partyStats = {};
      for (const txn of transactions) {
        const pId = txn.txn_name_id;
        if (!partyStats[pId]) partyStats[pId] = { recv: 0, paidOut: 0, owed: 0 };
        const amount = safeFloat(txn.txn_cash_amount || 0);
        const bal = safeFloat(txn.txn_balance_amount || 0);
        const type = txn.txn_type;
        
        if (type === 1 || type === 2 || type === 27) {
          partyStats[pId].recv += amount;
          partyStats[pId].owed += bal;
        } else if (type === 3 || type === 83) {
          partyStats[pId].paidOut += amount;
        }
      }

      for (const party of parties) {
        try {
          if (party.name_type === 2 && party.name_expense_type === '2') continue;
          
          let partyType = 'CUSTOMER';
          const stat = partyStats[party.name_id] || { recv: 0, paidOut: 0, owed: 0 };

          if (stat.paidOut > 0 && stat.recv === 0 && stat.owed === 0) {
            partyType = 'SUPPLIER';
          } else if (stat.owed > 0 || stat.recv > 0) {
            partyType = 'CUSTOMER';
          } else if (party.name_customer_type === 0 && party.name_type === 1) {
            partyType = 'SUPPLIER';
          }
          
          const newParty = await prisma.party.create({
            data: {
              businessId,
              name: party.full_name || party.name || '',
              partyType,
              gstin: party.name_gstin_number || '',
              pan: party.name_tin_number || '',
              email: party.email || '',
              phone: party.phone_number || '',
              billingAddress: {
                street: party.address || '',
                city: party.city || '',
                state: party.state_name || '',
                pincode: party.pincode || '',
              },
              isActive: party.name_is_active !== 0,
            },
          });
          partyMap.set(party.name_id, newParty.id);
          imported++;
        } catch (e) {
          failed++;
        }
      }

      // 3. Import TRANSACTIONS (Invoices / Purchases)
      let invoiceNum = 1;
      let purchaseNum = 1;
      
      for (const txn of transactions) {
        try {
          const partyId = partyMap.get(txn.txn_name_id);
          if (!partyId) continue;
          
          const totalAmount = safeFloat(txn.txn_cash_amount || 0) + safeFloat(txn.txn_balance_amount || 0);
          const taxAmount = safeFloat(txn.txn_tax_amount || 0);
          const subtotal = totalAmount - taxAmount;
          const status = safeFloat(txn.txn_balance_amount || 0) > 0 ? 'PARTIAL' : 'PAID';
          
          const invoiceLineItems = lineItems.filter(li => li.lineitem_txn_id === txn.txn_id).map(li => {
              const itemId = itemMap.get(li.item_id);
              const rate = safeFloat(li.priceperunit || 0);
              const qty = safeFloat(li.quantity || 1);
              const taxableAmount = rate * qty;
              const lineTaxAmount = safeFloat(li.lineitem_tax_amount || 0);
              return {
                  itemId: itemId || null,
                  description: li.lineitem_description || '',
                  quantity: qty,
                  unit: 'NOS',
                  rate,
                  discountPercent: safeFloat(li.lineitem_discount_percent || 0),
                  discountAmount: safeFloat(li.lineitem_discount_amount || 0),
                  taxableAmount,
                  cgstRate: 9,
                  cgstAmount: lineTaxAmount / 2,
                  sgstRate: 9,
                  sgstAmount: lineTaxAmount / 2,
                  totalAmount: taxableAmount + lineTaxAmount,
              };
          });

          // Invoice = Customer transactions
          if ([1, 2, 27].includes(txn.txn_type)) {
            await prisma.invoice.create({
              data: {
                businessId,
                invoiceNumber: `INV${String(invoiceNum++).padStart(4, '0')}`,
                partyId,
                date: new Date(txn.txn_date),
                dueDate: txn.txn_due_date ? new Date(txn.txn_due_date) : null,
                subtotal,
                discountAmount: safeFloat(txn.txn_discount_amount || 0),
                discountPercent: safeFloat(txn.txn_discount_percent || 0),
                cgstAmount: taxAmount / 2,
                sgstAmount: taxAmount / 2,
                igstAmount: 0,
                roundOff: safeFloat(txn.txn_round_off_amount || 0),
                totalAmount,
                amountInWords: '',
                paidAmount: safeFloat(txn.txn_cash_amount || 0),
                balanceDue: safeFloat(txn.txn_balance_amount || 0),
                status,
                notes: txn.txn_description || '',
                items: { create: invoiceLineItems }
              },
            });
          } 
          // Purchase = Supplier transactions
          else if ([3, 83].includes(txn.txn_type)) {
            await prisma.purchase.create({
              data: {
                businessId,
                purchaseNumber: `PUR${String(purchaseNum++).padStart(4, '0')}`,
                partyId,
                date: new Date(txn.txn_date),
                dueDate: txn.txn_due_date ? new Date(txn.txn_due_date) : null,
                subtotal,
                discountAmount: parseFloat(txn.txn_discount_amount || 0),
                discountPercent: parseFloat(txn.txn_discount_percent || 0),
                cgstAmount: taxAmount / 2,
                sgstAmount: taxAmount / 2,
                igstAmount: 0,
                roundOff: parseFloat(txn.txn_round_off_amount || 0),
                totalAmount,
                amountInWords: '',
                paidAmount: parseFloat(txn.txn_cash_amount || 0),
                balanceDue: parseFloat(txn.txn_balance_amount || 0),
                status: status === 'PARTIAL' ? 'PARTIAL' : 'RECEIVED',
                notes: txn.txn_description || '',
                items: { create: invoiceLineItems }
              },
            });
          }
          

          imported++;
        } catch (e) {
          failed++;
        }
      }

    await prisma.importLog.update({
      where: { id: importLogId },
      data: { 
        status: failed > imported ? 'PARTIAL' : 'COMPLETED',
        recordsImported: imported,
        recordsFailed: failed,
      },
    });
    
    console.log(`Import completed: ${imported} imported, ${failed} failed`);
  } catch (e) {
    console.error('Transaction error:', e);
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: 'FAILED' },
    });
  }
}

async function importJsonData(data, businessId, importLogId) {
  let imported = 0;
  
  if (data.parties && Array.isArray(data.parties)) {
    for (const party of data.parties) {
      try {
        await prisma.party.create({
          data: {
            businessId,
            name: party.name || '',
            partyType: party.type === 'Vendor' ? 'SUPPLIER' : 'CUSTOMER',
          },
        });
        imported++;
      } catch (e) {}
    }
  }

  await prisma.importLog.update({
    where: { id: importLogId },
    data: { 
      status: 'COMPLETED',
      recordsImported: imported,
    },
  });
}

router.get('/status/:importId', async (req, res, next) => {
  try {
    const log = await prisma.importLog.findFirst({
      where: { id: req.params.importId, business: { userId: req.user.id } },
    });
    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

router.get('/history/business/:businessId', async (req, res, next) => {
  try {
    const logs = await prisma.importLog.findMany({
      where: { businessId: req.params.businessId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
