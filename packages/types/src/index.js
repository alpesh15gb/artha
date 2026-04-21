import { z } from 'zod';

const BaseScopes = {
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  createdAt: z.date().or(z.string()).default(() => new Date().toISOString()),
  updatedAt: z.date().or(z.string()).default(() => new Date().toISOString()),
};

export const ItemSchema = z.object({
  ...BaseScopes,
  name: z.string().min(1, 'Item name is required'),
  sku: z.string().optional(),
  hsnCode: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().default('NOS'),
  taxRate: z.number().default(18),
  taxability: z.enum(['taxable', 'exempt', 'nilrated']).default('taxable'),
  sellingPrice: z.number().default(0),
  purchasePrice: z.number().default(0),
  mrp: z.number().optional(),
  openingStock: z.number().default(0),
  currentStock: z.number().default(0),
  reorderLevel: z.number().optional(),
  godown: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  isService: z.boolean().default(false),
});

export const PartySchema = z.object({
  ...BaseScopes,
  name: z.string().min(1, 'Party name is required'),
  partyType: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).default('CUSTOMER'),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  billingAddress: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  shippingAddress: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  state: z.string().optional(),
  creditLimit: z.number().optional(),
  openingBalance: z.number().default(0),
  balanceType: z.enum(['RECEIVABLE', 'PAYABLE']).default('RECEIVABLE'),
  dueDays: z.number().default(0),
  taxability: z.enum(['taxable', 'exempt', 'nilrated']).default('taxable'),
  isRegistered: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const InvoiceItemSchema = z.object({
  itemId: z.string().uuid().optional(),
  description: z.string(),
  hsnCode: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().default('NOS'),
  rate: z.number().min(0),
  discountPercent: z.number().default(0),
  discountAmount: z.number().default(0),
  taxableAmount: z.number(),
  cgstRate: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstRate: z.number().default(0),
  sgstAmount: z.number().default(0),
  igstRate: z.number().default(0),
  igstAmount: z.number().default(0),
  cessRate: z.number().default(0),
  cessAmount: z.number().default(0),
  totalAmount: z.number(),
});

export const InvoiceSchema = z.object({
  ...BaseScopes,
  invoiceNumber: z.string(),
  invoiceType: z.enum(['TAX_INVOICE', 'BILL_OF_SUPPLY', 'EXPORT_INVOICE', 'SEZ_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE']).default('TAX_INVOICE'),
  template: z.string().default('template1'),
  partyId: z.string().uuid(),
  date: z.date().or(z.string()),
  dueDate: z.date().or(z.string()).optional(),
  reverseCharge: z.boolean().default(false),
  isTaxInclusive: z.boolean().default(false),
  stateOfSupply: z.string().optional(),
  billingAddress: z.record(z.any()).optional(),
  shippingAddress: z.record(z.any()).optional(),
  subtotal: z.number(),
  discountAmount: z.number().default(0),
  discountPercent: z.number().default(0),
  cgstAmount: z.number().default(0),
  sgstAmount: z.number().default(0),
  igstAmount: z.number().default(0),
  cessAmount: z.number().default(0),
  roundOff: z.number().default(0),
  totalAmount: z.number(),
  amountInWords: z.string().optional(),
  paidAmount: z.number().default(0),
  balanceDue: z.number(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  tags: z.array(z.string()).default([]),
  transportMode: z.string().optional(),
  vehicleNo: z.string().optional(),
  lrNo: z.string().optional(),
  lrDate: z.date().or(z.string()).optional(),
  totalBoxes: z.number().optional(),
  irn: z.string().optional(),
  ackNo: z.string().optional(),
  ackDate: z.date().or(z.string()).optional(),
  qrCode: z.string().optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  items: z.array(InvoiceItemSchema).min(1),
});

export const PaymentSchema = z.object({
  ...BaseScopes,
  paymentNumber: z.string(),
  partyId: z.string().uuid(),
  date: z.date().or(z.string()),
  amount: z.number().positive(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).default('CASH'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  isAdjusted: z.boolean().default(false),
  adjustments: z.array(z.object({
    invoiceId: z.string().uuid().optional(),
    purchaseId: z.string().uuid().optional(),
    amount: z.number(),
  })).default([]),
});

export const ExpenseSchema = z.object({
  ...BaseScopes,
  expenseNumber: z.string(),
  date: z.date().or(z.string()),
  category: z.string(),
  description: z.string().optional(),
  partyId: z.string().uuid().optional(),
  amount: z.number().positive(),
  taxAmount: z.number().default(0),
  totalAmount: z.number(),
  paymentMethod: z.enum(['CASH', 'BANK', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'RTGS']).default('CASH'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  attachmentUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PAID', 'CANCELLED']).default('PAID'),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
  meta: z.object({
    page: z.number().optional(),
    limit: z.number().optional(),
    total: z.number().optional(),
  }).optional(),
});

export const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const ItemInputSchema = ItemSchema.omit({ ...BaseScopes, currentStock: true }).partial({
  businessId: true,
});

export const PartyInputSchema = PartySchema.omit(BaseScopes).partial({
  businessId: true,
});

export const InvoiceInputSchema = InvoiceSchema.omit(BaseScopes).partial({
  businessId: true,
});

export const PaymentInputSchema = PaymentSchema.omit(BaseScopes).partial({
  businessId: true,
});

export const ExpenseInputSchema = ExpenseSchema.omit(BaseScopes).partial({
  businessId: true,
});