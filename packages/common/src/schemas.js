import { z } from 'zod';

export const ItemSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  hsnCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional().nullable(),
  taxRate: z.number().optional().nullable(),
  taxability: z.string().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  mrp: z.number().optional().nullable(),
  openingStock: z.number().optional().nullable(),
  reorderLevel: z.number().optional().nullable(),
  godown: z.string().optional().nullable(),
  isService: z.boolean().default(false).nullable(),
});

export const PartySchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1, 'Party name is required'),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  gstin: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  openingBalance: z.number().default(0),
});

export const InvoiceSchema = z.object({
  businessId: z.string().uuid(),
  partyId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  date: z.date().or(z.string()),
  dueDate: z.date().or(z.string()).optional(),
  type: z.enum(['SALE', 'PURCHASE', 'ESTIMATE']),
  items: z.array(z.object({
    itemId: z.string().uuid().optional().nullable(),
    name: z.string(),
    quantity: z.number().min(0.0001),
    price: z.number().min(0),
    taxRate: z.number().default(0),
    discount: z.number().default(0),
  })).min(1),
  notes: z.string().optional(),
  terms: z.string().optional(),
});
