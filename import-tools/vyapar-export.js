import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VyaparDataExporter {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  generateSampleData() {
    const businessId = uuidv4();

    const parties = [
      {
        name: 'ABC Traders',
        type: 'customer',
        gstin: '27AABCU9603R1ZM',
        pan: 'AABCU9603R',
        phone: '9876543210',
        email: 'abc@tradres.com',
        openingBalance: 50000,
        balanceType: 'receivable',
        dueDays: 30,
        billingAddress: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      },
      {
        name: 'XYZ Suppliers',
        type: 'supplier',
        gstin: '29AABCS1234P1ZX',
        pan: 'AABCS1234P',
        phone: '9876543211',
        email: 'info@xyzsuppliers.com',
        openingBalance: 75000,
        balanceType: 'payable',
        dueDays: 45,
        billingAddress: {
          street: '456 Industrial Area',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
      {
        name: 'Rahul Enterprises',
        type: 'both',
        gstin: '19AAGCR1234C1ZP',
        pan: 'AAGCR1234C',
        phone: '9876543212',
        openingBalance: 25000,
        balanceType: 'receivable',
        dueDays: 15,
        billingAddress: {
          street: '789 Commercial Complex',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700001',
        },
      },
    ];

    const items = [
      {
        name: 'Product A',
        sku: 'PA001',
        hsnCode: '1234',
        category: 'Electronics',
        unit: 'NOS',
        taxRate: 18,
        sellingPrice: 1000,
        purchasePrice: 700,
        openingStock: 100,
        currentStock: 95,
      },
      {
        name: 'Product B',
        sku: 'PB002',
        hsnCode: '5678',
        category: 'Electronics',
        unit: 'NOS',
        taxRate: 18,
        sellingPrice: 2500,
        purchasePrice: 1800,
        openingStock: 50,
        currentStock: 48,
      },
      {
        name: 'Service Charge',
        sku: 'SC001',
        hsnCode: '9955',
        category: 'Services',
        unit: 'HRS',
        taxRate: 18,
        sellingPrice: 500,
        purchasePrice: 0,
        isService: true,
      },
      {
        name: 'Office Supplies',
        sku: 'OS001',
        hsnCode: '3926',
        category: 'Stationery',
        unit: 'NOS',
        taxRate: 12,
        sellingPrice: 150,
        purchasePrice: 100,
        openingStock: 200,
        currentStock: 180,
      },
    ];

    const invoices = [
      {
        invoiceNumber: 'INV-001',
        type: 'tax_invoice',
        party: 'ABC Traders',
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { name: 'Product A', quantity: 5, rate: 1000, taxRate: 18 },
          { name: 'Product B', quantity: 2, rate: 2500, taxRate: 18 },
        ],
        status: 'sent',
      },
      {
        invoiceNumber: 'INV-002',
        type: 'tax_invoice',
        party: 'Rahul Enterprises',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { name: 'Service Charge', quantity: 10, rate: 500, taxRate: 18 },
        ],
        status: 'paid',
        paidAmount: 5900,
      },
    ];

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      source: 'Artha Cloud Accounting',
      sourceApp: 'VyaparApp',
      businessId,
      parties,
      items,
      invoices,
    };
  }

  exportToJson(filename = 'vyapar-export.json') {
    const data = this.generateSampleData();
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Data exported to: ${filePath}`);
    return filePath;
  }

  getExportTemplate() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      source: 'Artha Cloud Accounting',
      instructions: {
        parties: 'Array of party objects with fields: name, type, gstin, pan, phone, email, openingBalance, balanceType, dueDays, billingAddress',
        items: 'Array of item objects with fields: name, sku, hsnCode, category, unit, taxRate, sellingPrice, purchasePrice, openingStock, currentStock, isService',
        invoices: 'Array of invoice objects with fields: invoiceNumber, type, party, date, dueDate, items, status, notes',
      },
      parties: [],
      items: [],
      invoices: [],
    };
  }

  exportTemplate(filename = 'vyapar-import-template.json') {
    const template = this.getExportTemplate();
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    console.log(`Template exported to: ${filePath}`);
    return filePath;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const exporter = new VyaparDataExporter();

  if (process.argv.includes('--sample')) {
    exporter.exportToJson();
  } else if (process.argv.includes('--template')) {
    exporter.exportTemplate();
  } else {
    console.log('Usage:');
    console.log('  node vyapar-export.js --sample    Export sample data');
    console.log('  node vyapar-export.js --template  Export import template');
  }
}

export default VyaparDataExporter;
