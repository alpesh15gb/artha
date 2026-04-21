import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import AdmZip from "adm-zip";

const router = Router();
const prisma = new PrismaClient();

function safeFloat(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

router.use(authenticate);
router.use(verifyBusinessOwnership);

router.post("/vyapar", async (req, res, next) => {
  try {
    if (!req.files || !req.files.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const { businessId, clearExisting } = req.body;
    const file = req.files.file;

    // Clear existing data if requested
    if (clearExisting === "true" || clearExisting === true) {
      await prisma.$transaction([
        prisma.invoiceItem.deleteMany({ where: { invoice: { businessId } } }),
        prisma.invoice.deleteMany({ where: { businessId } }),
        prisma.party.deleteMany({ where: { businessId } }),
        prisma.item.deleteMany({ where: { businessId } }),
      ]);
    }
    const uploadDir = path.join(process.cwd(), "uploads", "imports");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${uuidv4()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    const importLog = await prisma.importLog.create({
      data: {
        businessId,
        importType: "VYAPAR_SQLITE",
        fileName: file.name,
        fileSize: file.size,
        recordsTotal: 0,
        recordsImported: 0,
        recordsFailed: 0,
        status: "PROCESSING",
      },
    });

    // Process import SYNCHRONOUSLY and return results
    try {
      console.log("Starting import for file:", file.name, "at", filePath);
      const result = await processImport(filePath, businessId, importLog.id);
      console.log("Import completed successfully:", result);
      res.json({
        success: true,
        message: "Import completed",
        data: { importId: importLog.id, result }
      });
    } catch (err) {
      console.error("Import error:", err.message, err.stack);
      await prisma.importLog.update({
        where: { id: importLog.id },
        data: { status: "FAILED", notes: err.message }
      }).catch(() => {});
      res.status(500).json({
        success: false,
        message: err.message,
        data: { importId: importLog.id }
      });
    }
  } catch (error) {
    next(error);
  }
});

async function processImport(filePath, businessId, importLogId) {
  let db = null;
  let extractedFile = null;

  try {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      await importJsonData(data, businessId, importLogId);
    } else if (ext === ".vyb" || ext === ".zip") {
      try {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();

        const vypEntry = entries.find((e) => e.entryName.endsWith(".vyp"));
        if (vypEntry) {
          const tempDbPath = path.join(
            path.dirname(filePath),
            `${uuidv4()}.vyp`,
          );
          const zipData = zip.readFile(vypEntry);
          fs.writeFileSync(tempDbPath, zipData);
          extractedFile = tempDbPath;

          db = new Database(extractedFile, { readonly: true });
          await importFromSqlite(db, businessId, importLogId);
        } else {
          throw new Error("No .vyp file found in ZIP");
        }
      } catch (zipError) {
        console.log("ZIP extract failed:", zipError.message, "- trying as direct SQLite");
        try {
          db = new Database(filePath, { readonly: true });
          await importFromSqlite(db, businessId, importLogId);
        } catch (dbError) {
          console.log("Direct SQLite open failed:", dbError.message);
          throw dbError;
        }
      }
    } else if (ext === ".db") {
      db = new Database(filePath, { readonly: true });
      await importFromSqlite(db, businessId, importLogId);
    } else {
      throw new Error("Unsupported file format: " + ext);
    }

    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: "COMPLETED" },
    });
  } catch (error) {
    console.error("Import error:", error);
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: "FAILED" },
    });
  } finally {
    if (db) {
      try {
        db.close();
      } catch {}
    }
    if (extractedFile) {
      try {
        fs.unlinkSync(extractedFile);
      } catch {}
    }
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

router.post("/purge", async (req, res, next) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, message: "Business ID required" });
    }

    // Delete in strict reverse-dependency order
    await prisma.$transaction([
      // 1. Level 3 Dependencies (Adjustments & Line Items)
      prisma.paymentAdjustment.deleteMany({ where: { payment: { businessId } } }),
      prisma.invoiceItem.deleteMany({ where: { invoice: { businessId } } }),
      prisma.purchaseItem.deleteMany({ where: { purchase: { businessId } } }),
      prisma.estimateItem.deleteMany({ where: { estimate: { businessId } } }),
      prisma.journalEntryLine.deleteMany({ where: { journalEntry: { businessId } } }),

      // 2. Level 2 Dependencies (Parent Transactions/Events)
      prisma.invoice.deleteMany({ where: { businessId } }),
      prisma.purchase.deleteMany({ where: { businessId } }),
      prisma.estimate.deleteMany({ where: { businessId } }),
      prisma.payment.deleteMany({ where: { businessId } }),
      prisma.receipt.deleteMany({ where: { businessId } }),
      prisma.expense.deleteMany({ where: { businessId } }),
      prisma.journalEntry.deleteMany({ where: { businessId } }),
      prisma.transaction.deleteMany({ where: { businessId } }),
      prisma.auditLog.deleteMany({ where: { businessId } }),
      prisma.task.deleteMany({ where: { businessId } }),
      prisma.complaint.deleteMany({ where: { businessId } }),

      // 3. Level 1 Base Data (Entities & Accounts)
      prisma.cashAccount.deleteMany({ where: { businessId } }),
      prisma.bankAccount.deleteMany({ where: { businessId } }),
      prisma.party.deleteMany({ where: { businessId } }),
      prisma.item.deleteMany({ where: { businessId } }),
    ]);

    res.json({ success: true, message: "Workspace purged successfully" });
  } catch (error) {
    next(error);
  }
});

async function importFromSqlite(db, businessId, importLogId) {
  console.log("=== IMPORT START: businessId =", businessId, "importLogId =", importLogId);
  console.log("Importing from Vyapar SQLite - Enhanced Import...");
  let imported = 0;
  let failed = 0;

  // Write debug to import log
  await prisma.importLog.update({
    where: { id: importLogId },
    data: { status: "PROCESSING", notes: "Starting import..." }
  }).catch(() => {});

  try {
    console.log("Reading VYP tables...");
    let items = [];
    try {
      items = db.prepare("SELECT * FROM kb_items").all();
    } catch (e) {
      console.log("kb_items missing, trying 'items' table...");
      try { items = db.prepare("SELECT * FROM items").all(); } catch(e2) {}
    }
    const parties = db.prepare("SELECT * FROM kb_names").all();
    const transactions = db.prepare("SELECT * FROM kb_transactions").all();
    const lineItems = db.prepare("SELECT * FROM kb_lineitems").all();
    const taxCodes = db.prepare("SELECT * FROM kb_tax_code").all();
    console.log(`Items: ${items.length}, Parties: ${parties.length}, Transactions: ${transactions.length}, LineItems: ${lineItems.length}`);
    
    // Update with counts
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { recordsTotal: items.length + parties.length + transactions.length, notes: `Found ${items.length} items, ${parties.length} parties, ${transactions.length} transactions` }
    }).catch(() => {});
    console.log("All tables read, building tax map...");
    
    // Debug: Check line item column names
    const lineItemSample = lineItems[0] || {};
    console.log("Line item keys:", Object.keys(lineItemSample));
    console.log("Line item sample:", lineItemSample);
    
    // Bank & Payment Metadata
    let paymentTypes = [];
    try {
      paymentTypes = db.prepare("SELECT * FROM kb_paymentTypes").all();
      console.log("Payment types:", paymentTypes.length);
    } catch (err) {
      console.log("kb_paymentTypes failed, trying kb_banks or other_accounts...");
    }

    const paymentMappings = db.prepare("SELECT * FROM txn_payment_mapping").all();
    const txnLinks = db.prepare("SELECT * FROM kb_txn_links").all();

    console.log(
      `Read: ${items.length} items, ${parties.length} parties, ${transactions.length} txns, ${lineItems.length} line items, ${paymentTypes.length} p-types`,
    );

    const taxRateMap = new Map();
    for (const tax of taxCodes) {
      taxRateMap.set(tax.tax_code_id, safeFloat(tax.tax_rate));
    }

    // 0. Import BANK/CASH ACCOUNTS
    const bankMap = new Map();
    const cashMap = new Map();

    for (const pt of paymentTypes) {
      try {
        if (pt.paymentType_type === 'CASH') {
          const cashAcc = await prisma.cashAccount.create({
            data: {
              businessId,
              name: pt.paymentType_name || "Main Cash",
              openingBalance: safeFloat(pt.paymentType_opening_balance),
              currentBalance: safeFloat(pt.paymentType_opening_balance),
            }
          });
          cashMap.set(pt.paymentType_id, cashAcc.id);
        } else if (pt.paymentType_type === 'BANK' || pt.paymentType_type === 'CHEQUE') {
          const bankAcc = await prisma.bankAccount.create({
            data: {
              businessId,
              bankName: pt.paymentType_name || pt.paymentType_bankName || "Business Bank",
              accountName: pt.pt_bank_account_holder_name || pt.paymentType_name || "Main",
              accountNumber: pt.paymentType_accountNumber || "0000",
              ifscCode: pt.pt_bank_ifsc_code || "UNKNOWN",
              branchName: "",
              openingBalance: safeFloat(pt.paymentType_opening_balance),
              currentBalance: safeFloat(pt.paymentType_opening_balance),
            }
          });
          bankMap.set(pt.paymentType_id, bankAcc.id);
        }
      } catch (e) {
        console.error("Account Import Failed:", e.message);
      }
    }

    // 1. Import ITEMS
    const itemMap = new Map();
    const itemNameMap = new Map();
    const itemByNameMap = new Map();
    for (const item of items) {
      try {
        const vyId = String(item.item_id);
        const name = item.item_name || "Unnamed Item";
        const taxRate = item.item_tax_id ? taxRateMap.get(item.item_tax_id) || 18 : 18;
        // Detect service: item_type=2 OR (no stock tracking AND no purchase price)
        const isService = item.item_type === 2 || (safeFloat(item.item_purchase_unit_price) === 0 && safeFloat(item.item_stock_quantity) === 0);
        
        const newItem = await prisma.item.create({
          data: {
            businessId,
            name: item.item_name || "Unnamed Item",
            sku: item.item_code || "",
            hsnCode: item.item_hsn_sac_code || "",
            description: item.item_description || "",
            unit: "NOS",
            sellingPrice: safeFloat(item.item_sale_unit_price),
            purchasePrice: safeFloat(item.item_purchase_unit_price),
            mrp: safeFloat(item.item_mrp),
            taxRate,
            currentStock: safeFloat(item.item_stock_quantity),
            isService,
            isActive: item.item_is_active !== 0,
          },
        });
        itemMap.set(vyId, newItem.id);
        itemNameMap.set(vyId, name);
        itemByNameMap.set(name.trim().toLowerCase(), newItem.id);
        imported++;
      } catch (e) {
        failed++;
      }
    }

    // 2. Import PARTIES
    const partyMap = new Map();
    // Build quick lookup for transaction types to optimize role discovery
    const salesPartyIds = new Set(transactions.filter(t => [1, 4, 3, 27].includes(Number(t.txn_type))).map(t => String(t.txn_name_id)));
    const purchasePartyIds = new Set(transactions.filter(t => [2, 5, 83].includes(Number(t.txn_type))).map(t => String(t.txn_name_id)));

    for (const party of parties) {
      try {
        // name_type: 1 = Party (Customer/Supplier), 2 = Expense/Income
        if (party.name_type === 2) continue;

        const vyPartyId = String(party.name_id);
        const hasSales = salesPartyIds.has(vyPartyId);
        const hasPurchases = purchasePartyIds.has(vyPartyId);
        
        // Smart Role Discovery
        let partyType = "CUSTOMER"; 
        if (hasPurchases && !hasSales) partyType = "SUPPLIER";
        else if (party.name_customer_type === 1 || party.name_vendor_type === 1) partyType = "SUPPLIER";

        // Parse address: multi-line with city, state, pincode
        const address = party.address || "";
        let street = "", city = "", state = "", pincode = "";
        if (address) {
          const lines = address.split('\n').map(l => l.trim()).filter(l => l);
          street = lines[0] || "";
          // Find city/state line (usually "City, State-Pincode" or "City, State")
          for (const line of lines) {
            const match = line.match(/^([^,]+),\s*([^-\n]+)-?(\d{6})?$/);
            if (match) {
              city = match[1].trim();
              state = match[2].trim();
              pincode = match[3] || "";
              break;
            }
          }
          if (!city && lines.length > 1) {
            const lastLine = lines[lines.length - 1];
            const parts = lastLine.split(',').map(p => p.trim());
            if (parts.length >= 2) {
              city = parts[0] || "";
              state = parts[1].replace(/\d+$/, '').trim() || "";
              const pinMatch = parts[1].match(/(\d{6})/);
              pincode = pinMatch ? pinMatch[1] : "";
            }
          }
        }

        const newParty = await prisma.party.create({
          data: {
            businessId,
            name: party.full_name || party.name || "Unknown Party",
            partyType,
            gstin: party.name_gstin_number || "",
            phone: party.phone_number || "",
            billingAddress: { street, city, state, pincode },
            isActive: party.name_is_active !== 0,
          },
        });
        partyMap.set(String(party.name_id), newParty.id);
        imported++;
      } catch (e) {
        failed++;
      }
    }

    // 3. Import TRANSACTIONS (Invoices / Purchases / Estimates)
    const txToAccMap = new Map();
    for (const m of paymentMappings) {
      if (m.payment_id) txToAccMap.set(String(m.txn_id), m.payment_id);
    }

    for (const txn of transactions) {
      try {
        const partyId = partyMap.get(String(txn.txn_name_id));
        if (!partyId) continue;

        // Handle both snake_case and camelCase
        const cashAmt = safeFloat(txn.txn_cash_amount || txn.txnCashAmount || 0);
        const balAmt = safeFloat(txn.txn_balance_amount || txn.txnBalanceAmount || 0);
        const totalAmount = cashAmt + balAmt;
        const paidAmount = cashAmt;
        const balanceDue = balAmt;
        
        const pTypeId = txn.txn_payment_type_id || txn.txnPaymentTypeId || txToAccMap.get(String(txn.txn_id));
        const bankId = bankMap.get(pTypeId);
        const cashId = cashMap.get(pTypeId);

        const invLineItems = lineItems
          .filter((li) => String(li.lineitem_txn_id) === String(txn.txn_id))
          .map((li) => {
            // Enhanced Item Matching: By ID (multiple column check) or by Name
            const vId = String(li.item_id || li.li_item_id || li.liItemId || "");
            const vName = li.li_item_name || li.liItemName || li.lineitem_name || "";
            
            let itemId = itemMap.get(vId);
            
            // Fallback: Match by name if ID link fails
            if (!itemId && vName) {
              itemId = itemByNameMap.get(vName.trim().toLowerCase());
            }

            // AUTO-DISCOVERY: If item still not found, create it now!
            if (!itemId && vName) {
               try {
                 const taxRate = li.li_tax_rate || li.taxRate || 18;
                 const createdItem = await prisma.item.create({
                   data: {
                     businessId,
                     name: vName,
                     taxRate: safeFloat(taxRate),
                     unit: li.li_unit || li.unit || "NOS",
                     sellingPrice: safeFloat(li.priceperunit || li.pricePerUnit || 0),
                   }
                 });
                 itemMap.set(vId, createdItem.id);
                 itemByNameMap.set(vName.trim().toLowerCase(), createdItem.id);
                 itemId = createdItem.id;
               } catch (e) { console.log("Auto-Discovery item creation failed:", e.message); }
            }

            // Description: use item name if linked, otherwise use lineitem_description
            let description = "";
            if (itemId) {
              // Item is linked - find its name
              description = vName || itemNameMap.get(vId) || "";
            } else {
              // No item linked - use free text description
              description = li.lineitem_description || li.li_description || vName || `Item #${vId}`;
            }

            // Handle both snake_case and camelCase column names from better-sqlite3
            const rate = safeFloat(li.priceperunit || li.pricePerUnit || li.li_rate || 0);
            const qty = safeFloat(li.quantity || li.qty || li.li_quantity || 1);
            const taxableAmount = rate * qty;
            const lineTaxAmount = safeFloat(
              li.lineitem_tax_amount || 
              li.lineitemTaxAmount || 
              li.taxAmount ||
              li.li_tax_amount ||
              0
            );
            
            // Get tax rate from lineitem_tax_id instead of assuming 18%
            const taxRateId = li.lineitem_tax_id || li.lineitemTaxId || li.taxId || li.li_tax_id;
            const taxRate = taxRateId ? (taxRateMap.get(taxRateId) || 18) : 18;
            const cgstRate = taxRate / 2;
            const sgstRate = taxRate / 2;
            
            return {
              itemId: itemId,
              description: description,
              quantity: qty,
              unit: "NOS",
              rate,
              discountPercent: safeFloat(li.lineitem_discount_percent || li.discountPercent || 0),
              discountAmount: safeFloat(li.lineitem_discount_amount || li.discountAmount || 0),
              taxableAmount,
              cgstRate, cgstAmount: lineTaxAmount / 2,
              sgstRate, sgstAmount: lineTaxAmount / 2,
              totalAmount: taxableAmount + lineTaxAmount,
              hsnCode: li.lineitem_hsn_code || li.hsnCode || "",
            };
          });

        // Sum taxes from line items instead of using transaction-level tax
        const lineItemTaxes = invLineItems.reduce((sum, li) => sum + (li.cgstAmount + li.sgstAmount || 0), 0);
        const vyaparTaxAmount = lineItemTaxes > 0 ? lineItemTaxes : safeFloat(txn.txn_tax_amount || txn.txnTaxAmount || 0);
        const subtotal = totalAmount - vyaparTaxAmount;
        
        if (invLineItems.length > 0) {
          console.log(`Txn ${txn.txn_id}: ${invLineItems.length} items, totalAmount=${totalAmount}, lineItemTaxes=${lineItemTaxes}, vyaparTaxAmount=${vyaparTaxAmount}, subtotal=${subtotal}`);
          console.log(`  First item: rate=${invLineItems[0].rate}, qty=${invLineItems[0].quantity}, taxableAmount=${invLineItems[0].taxableAmount}, cgstAmount=${invLineItems[0].cgstAmount}, totalAmount=${invLineItems[0].totalAmount}`);
        }
        const txnType = Number(txn.txn_type);

        if (txnType === 1) { // SALE (Invoice to Customer)
          const status = balanceDue > 0 ? (paidAmount > 0 ? "PARTIAL" : "SENT") : "PAID";
          await prisma.invoice.create({
            data: {
              businessId,
              invoiceNumber: txn.txn_ref_number_char || `INV-${txn.txn_id}`,
              partyId,
              date: new Date(txn.txn_date),
              subtotal,
              cgstAmount: vyaparTaxAmount / 2,
              sgstAmount: vyaparTaxAmount / 2,
              totalAmount,
              paidAmount,
              balanceDue,
              status,
              bankAccountId: bankId || null,
              cashAccountId: cashId || (bankId ? null : (cashMap.size > 0 ? Array.from(cashMap.values())[0] : null)),
              notes: txn.txn_description || "",
              items: { create: invLineItems },
            },
          });
        } else if (txnType === 2) { // PURCHASE (Invoice from Supplier)
          await prisma.purchase.create({
            data: {
              businessId,
              purchaseNumber: txn.txn_ref_number_char || `PUR-${txn.txn_id}`,
              partyId,
              date: new Date(txn.txn_date),
              subtotal,
              cgstAmount: vyaparTaxAmount / 2,
              sgstAmount: vyaparTaxAmount / 2,
              totalAmount,
              paidAmount,
              balanceDue,
              status: balanceDue > 0 ? "PARTIAL" : "RECEIVED",
              notes: txn.txn_description || "",
              items: { create: invLineItems },
            },
          });
        } else if (txnType === 27) { // ESTIMATE
          await prisma.estimate.create({
            data: {
              businessId,
              estimateNumber: txn.txn_ref_number_char || `EST-${txn.txn_id}`,
              partyId,
              date: new Date(txn.txn_date),
              subtotal,
              taxAmount: vyaparTaxAmount,
              totalAmount,
              status: "SENT",
              notes: txn.txn_description || "",
              items: { create: invLineItems },
            },
          });
        } else if (txnType === 3) { // SALE RETURN (Credit Note)
          await prisma.invoice.create({
            data: {
              businessId,
              invoiceNumber: `SR-${txn.txn_ref_number_char || txn.txn_id}`,
              partyId,
              date: new Date(txn.txn_date),
              subtotal: -subtotal,
              cgstAmount: -vyaparTaxAmount / 2,
              sgstAmount: -vyaparTaxAmount / 2,
              totalAmount: -totalAmount,
              paidAmount: -paidAmount,
              balanceDue: -balanceDue,
              status: "PAID",
              notes: `[VYAPAR SALE RETURN] ${txn.txn_description || ""}`,
              items: { create: invLineItems },
            },
          });
        } else if (txnType === 83) { // PURCHASE RETURN (Debit Note) // PURCHASE RETURN
          await prisma.purchase.create({
            data: {
              businessId,
              purchaseNumber: `PR-${txn.txn_ref_number_char || txn.txn_id}`,
              partyId,
              date: new Date(txn.txn_date),
              subtotal: -subtotal,
              cgstAmount: -vyaparTaxAmount / 2,
              sgstAmount: -vyaparTaxAmount / 2,
              totalAmount: -totalAmount,
              paidAmount: -paidAmount,
              balanceDue: -balanceDue,
              status: "RECEIVED",
              notes: `[VYAPAR PURCHASE RETURN] ${txn.txn_description || ""}`,
              items: { create: invLineItems },
            },
          });
        } else if (txnType === 4 || txnType === 5) { // PAYMENT IN / OUT
          const isReceipt = txnType === 4;
          const method = bankId ? "BANK" : "CASH";
          
          if (isReceipt) {
            await prisma.receipt.create({
              data: {
                businessId,
                receiptNumber: txn.txn_ref_number_char || `REC-${txn.txn_id}`,
                partyId,
                date: new Date(txn.txn_date),
                amount: totalAmount,
                paymentMethod: method,
                reference: txn.txn_payment_reference || "",
                notes: txn.txn_description || "",
              },
            });
          } else {
            await prisma.payment.create({
              data: {
                businessId,
                paymentNumber: txn.txn_ref_number_char || `PAY-${txn.txn_id}`,
                partyId,
                date: new Date(txn.txn_date),
                amount: totalAmount,
                paymentMethod: method,
                reference: txn.txn_payment_reference || "",
                notes: txn.txn_description || "",
              },
            });
          }

          // Also create a Transaction record for Ledger/Balance synchronization
          await prisma.transaction.create({
            data: {
              businessId,
              date: new Date(txn.txn_date),
              type: isReceipt ? "RECEIPT" : "PAYMENT",
              reference: txn.txn_ref_number_char || (isReceipt ? `REC-${txn.txn_id}` : `PAY-${txn.txn_id}`),
              partyId,
              bankAccountId: bankId || null,
              cashAccountId: cashId || (bankId ? null : (cashMap.size > 0 ? Array.from(cashMap.values())[0] : null)),
              amount: totalAmount,
              balance: 0,
              narration: txn.txn_description || (isReceipt ? "Payment Received (Vyapar)" : "Payment Made (Vyapar)"),
            },
          });

          // Atomic update for Bank/Cash balances
          if (bankId) {
            await prisma.bankAccount.update({
              where: { id: bankId },
              data: { currentBalance: { [isReceipt ? 'increment' : 'decrement']: totalAmount } }
            });
          } else if (cashId) {
            await prisma.cashAccount.update({
              where: { id: cashId },
              data: { currentBalance: { [isReceipt ? 'increment' : 'decrement']: totalAmount } }
            });
          }
        }
        imported++;
      } catch (e) {
        console.error(`Txn Import Fail [ID: ${txn.txn_id}]:`, e.message);
        failed++;
      }
    }

    await prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: failed > imported ? "PARTIAL" : "COMPLETED",
        recordsImported: imported,
        recordsFailed: failed,
        recordsTotal: imported + failed,
      },
    });

    console.log(`=== IMPORT DONE: ${imported} imported, ${failed} failed ===`);
    return { imported, failed, items: items.length, parties: parties.length, transactions: transactions.length };
  } catch (e) {
    console.error("=== IMPORT FAILED ===", e.message, e.stack);
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: "FAILED" },
    });
    throw e;
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
            name: party.name || "",
            partyType: party.type === "Vendor" ? "SUPPLIER" : "CUSTOMER",
          },
        });
        imported++;
      } catch (e) {}
    }
  }

  await prisma.importLog.update({
    where: { id: importLogId },
    data: {
      status: "COMPLETED",
      recordsImported: imported,
    },
  });
}

router.get("/status/:importId", async (req, res, next) => {
  try {
    const log = await prisma.importLog.findUnique({
      where: { id: req.params.importId },
    });

    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Import log not found" });
    }

    if (!log.businessId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Import log is not linked to a business",
        });
    }

    const business = await prisma.business.findFirst({
      where: { id: log.businessId, userId: req.user.id },
      select: { id: true },
    });

    if (!business) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Forbidden: You do not have access to this import log.",
        });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

router.get("/history/business/:businessId", async (req, res, next) => {
  try {
    const logs = await prisma.importLog.findMany({
      where: { businessId: req.params.businessId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// Debug endpoint - check import logs
router.get("/debug-logs", async (req, res, next) => {
  try {
    const businessId = req.query.businessId;
    const where = businessId ? { businessId } : {};
    const logs = await prisma.importLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: 10,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
