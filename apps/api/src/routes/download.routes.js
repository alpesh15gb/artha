import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const formatCurrency = (amount) => {
  const n = parseFloat(amount || 0);
  return '\u20B9' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Correct Indian numbering: crore / lakh / thousand / hundreds
const convertNumberToWords = (num) => {
  if (!num || num === 0) return 'Zero Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (n) => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };

  const threeDigits = (n) => {
    if (n === 0) return '';
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigits(n % 100) : '');
  };

  // Indian system: split into crore (10^7), lakh (10^5), thousand (10^3), remainder
  const n = Math.round(parseFloat(num));
  const crore = Math.floor(n / 10000000);
  const lakh  = Math.floor((n % 10000000) / 100000);
  const thou  = Math.floor((n % 100000) / 1000);
  const rem   = n % 1000;

  let words = '';
  if (crore) words += threeDigits(crore) + ' Crore ';
  if (lakh)  words += twoDigits(lakh)    + ' Lakh ';
  if (thou)  words += twoDigits(thou)    + ' Thousand ';
  if (rem)   words += threeDigits(rem);

  return words.trim() + ' Only';
};

async function generateInvoicePDF(invoice, business, party, items, res) {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  
  doc.pipe(res);
  
  const width = 535; // A4 approx width with margins
  let currentY = 30;

  // Outer Border
  doc.rect(30, 30, width, 780).stroke('#000000');

  // Header Bar
  doc.rect(30, currentY, width, 25).stroke('#000000');
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('DEBIT MEMO', 35, currentY + 8);
  doc.fontSize(10).text('TAX INVOICE', 30, currentY + 4, { align: 'center', width: width });
  doc.fontSize(7).font('Helvetica').text('(Under Section 31 of CGST Act, 2017)', 30, currentY + 15, { align: 'center', width: width });
  doc.fontSize(8).font('Helvetica-Bold').text('ORIGINAL FOR RECIPIENT', currentY, currentY + 8, { align: 'right', width: width - 5 });
  currentY += 25;

  // Business Info Section
  doc.rect(30, currentY, width, 75).stroke('#000000');
  if (business?.logo) {
    try {
      const logoPath = path.join(process.cwd(), business.logo.replace(/^\//, ''));
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, currentY + 10, { width: 50, height: 30 });
      }
    } catch(e){}
  }
  doc.fontSize(16).text(business?.name?.toUpperCase() || 'BUSINESS NAME', 30, currentY + 10, { align: 'center', width: width });
  doc.fontSize(8).font('Helvetica');
  const bizAddr = business?.address || {};
  const bizAddrText = `${bizAddr.street || ''}, ${bizAddr.city || ''}, ${bizAddr.state || ''} - ${bizAddr.pincode || ''}`;
  doc.text(bizAddrText, 30, currentY + 30, { align: 'center', width: width });
  doc.font('Helvetica-Bold').text(`GSTIN/UIN: ${business?.gstin || '-'}`, 30, currentY + 45, { align: 'center', width: width });
  currentY += 75;

  // Invoice Info Grid
  doc.rect(30, currentY, width / 2, 80).stroke('#000000');
  doc.rect(30 + width / 2, currentY, width / 2, 80).stroke('#000000');
  
  // Left Grid (Invoice Details)
  let gridY = currentY + 10;
  doc.fontSize(8).font('Helvetica-Bold').text('Invoice No:', 40, gridY);
  doc.font('Helvetica').text(invoice.invoiceNumber, 110, gridY);
  gridY += 15;
  doc.font('Helvetica-Bold').text('Date:', 40, gridY);
  doc.font('Helvetica').text(formatDate(invoice.date), 110, gridY);
  gridY += 15;
  doc.font('Helvetica-Bold').text('State:', 40, gridY);
  doc.font('Helvetica').text(business.address?.state || business.state || 'N/A', 110, gridY);

  // Right Grid (Transport Details)
  gridY = currentY + 10;
  doc.font('Helvetica-Bold').text('Transport:', 300, gridY);
  doc.font('Helvetica').text('Local Transport', 380, gridY);
  gridY += 15;
  doc.font('Helvetica-Bold').text('Vehicle No:', 300, gridY);
  doc.font('Helvetica').text(invoice.vehicleNo || '-', 380, gridY);
  currentY += 80;

  // Receiver Info
  doc.rect(30, currentY, width / 2, 100).stroke('#000000');
  doc.rect(30 + width / 2, currentY, width / 2, 100).stroke('#000000');
  
  doc.fontSize(8).font('Helvetica-Bold').text('Details of Receiver (Billed To):', 40, currentY + 5);
  doc.fontSize(9).text(party?.name?.toUpperCase() || 'WALKING CUSTOMER', 40, currentY + 20);
  doc.fontSize(8).font('Helvetica').text(party?.address || '-', 40, currentY + 35, { width: 220 });
  doc.font('Helvetica-Bold').text(`GSTIN: ${party?.gstin || '-'}`, 40, currentY + 75);

  doc.fontSize(8).font('Helvetica-Bold').text('Details of Consignee (Shipped To):', 300, currentY + 5);
  doc.fontSize(9).text(party?.name?.toUpperCase() || 'WALKING CUSTOMER', 300, currentY + 20);
  doc.fontSize(8).font('Helvetica').text(party?.address || '-', 300, currentY + 35, { width: 220 });
  currentY += 100;

  // Items Table Header
  const tableTop = currentY;
  doc.rect(30, tableTop, width, 20).fillAndStroke('#f0f0f0', '#000000');
  doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
  doc.text('Sr.', 35, tableTop + 6, { width: 18, align: 'center' });
  doc.text('Description of Goods', 57, tableTop + 6, { width: 178 });
  doc.text('HSN', 240, tableTop + 6, { width: 70 });
  doc.text('Qty', 315, tableTop + 6, { width: 44, align: 'center' });
  doc.text('Rate', 362, tableTop + 6, { width: 60, align: 'right' });
  doc.text('Amount', 430, tableTop + 6, { width: 128, align: 'right' });
  currentY += 20;

  // Items Rows — columns: Sr(35) | Description(55-230) | HSN(240-310) | Qty(315-355) | Rate(360-420) | Amount(430-565 right-aligned)
  items.forEach((item, index) => {
    doc.fontSize(8).font('Helvetica');
    // Sr No — fixed narrow column
    doc.text(String(index + 1), 35, currentY + 6, { width: 18, align: 'center' });
    // Description
    doc.font('Helvetica-Bold').text(item.description || '-', 57, currentY + 6, { width: 178 });
    // HSN
    doc.font('Helvetica').text(item.hsnCode || '-', 240, currentY + 6, { width: 70 });
    // Qty + unit
    doc.text(`${item.quantity} ${item.unit || 'NOS'}`, 315, currentY + 6, { width: 44, align: 'center' });
    // Rate
    doc.text(parseFloat(item.rate || 0).toFixed(2), 362, currentY + 6, { width: 60, align: 'right' });
    // Amount — NO extra ₹ symbol since formatCurrency already adds it
    doc.font('Helvetica-Bold').text(
      formatCurrency(item.totalAmount),
      430, currentY + 6,
      { width: 128, align: 'right' }
    );
    doc.rect(30, currentY, width, 20).stroke('#000000');
    currentY += 20;
  });

  // Empty Rows to fill space
  const emptyRows = Math.max(0, 10 - items.length);
  for(let i=0; i<emptyRows; i++) {
    doc.rect(30, currentY, width, 20).stroke('#000000');
    currentY += 20;
  }

  // Totals Section
  doc.rect(30, currentY, width, 60).stroke('#000000');
  doc.fontSize(9).font('Helvetica-Bold').text('Total Amount in Words:', 40, currentY + 10);
  doc.fontSize(8).font('Helvetica').text(convertNumberToWords(invoice.totalAmount), 40, currentY + 25);
  
  doc.fontSize(9).font('Helvetica-Bold').text('Net Payable:', 380, currentY + 10);
  doc.fontSize(14).text(formatCurrency(invoice.totalAmount), 380, currentY + 25);
  currentY += 60;

  // Footer / Terms & Signature
  doc.rect(30, currentY, width / 2, 80).stroke('#000000');
  doc.rect(30 + width / 2, currentY, width / 2, 80).stroke('#000000');
  
  doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 40, currentY + 10);
  doc.fontSize(7).font('Helvetica').text('1. Goods once sold will not be taken back.\n2. Interest @18% will be charged if payment is not made within due date.', 40, currentY + 25, { width: 220 });

  doc.text(`For, ${business.name}`, 300, currentY + 10, { align: 'center', width: width / 2 });
  
  if (business?.signatureImage) {
    try {
      const sigPath = path.join(process.cwd(), business.signatureImage.replace(/^\//, ''));
      if (fs.existsSync(sigPath)) {
        doc.image(sigPath, 300 + (width / 4) - 25, currentY + 25, { width: 50, height: 30 });
      }
    } catch(e){}
  }

  doc.text('Authorised Signatory', 300, currentY + 65, { align: 'center', width: width / 2 });

  doc.end();
}

router.get('/invoice/:id', async (req, res, next) => {
  try {
    console.log('PDF generation for invoice:', req.params.id);
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const party = await prisma.party.findUnique({ where: { id: invoice.partyId } });
    const business = await prisma.business.findUnique({
      where: { id: invoice.businessId },
      include: { settings: true },
    });
    
    console.log('Business data for PDF:', business?.name, business?.address, business?.logo);

    await generateInvoicePDF(invoice, business, party, invoice.items, res);
  } catch (error) {
    next(error);
  }
});

router.get('/estimate/:id', async (req, res, next) => {
  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        items: true,
      },
    });

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    const party = await prisma.party.findUnique({ where: { id: estimate.partyId } });
    const business = await prisma.business.findUnique({
      where: { id: estimate.businessId },
      include: { settings: true },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=estimate-${estimate.estimateNumber}.pdf`);
    doc.pipe(res);
    
    // Header with Company Name and Logo
    let yPos = 40;
    
    if (business?.logo) {
      try {
        doc.image(business.logo, 40, yPos, { width: 60, height: 30 });
      } catch (e) {}
    }
    
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a1a').text(business?.name || 'Company Name', 40, yPos + (business?.logo ? 35 : 0));
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    const addr = business?.address;
    let addrText = '';
    if (addr?.street) addrText += addr.street;
    if (addr?.city) addrText += (addrText ? ', ' : '') + addr.city;
    if (addr?.state) addrText += (addrText ? ', ' : '') + addr.state;
    if (addr?.pincode) addrText += ' - ' + addr.pincode;
    if (addrText) doc.text(addrText, 40, yPos + (business?.logo ? 55 : 25));
    
    let contactY = yPos + (business?.logo ? 70 : 45);
    if (business?.phone) {
      doc.text(`Ph: ${business.phone}`, 40, contactY);
      contactY += 12;
    }
    if (business?.email) {
      doc.text(`Email: ${business.email}`, 40, contactY);
      contactY += 12;
    }
    if (business?.gstin) {
      doc.text(`GSTIN: ${business.gstin}`, 40, contactY);
    }
    
    // Estimate Title and Details on Right
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a1a').text('QUOTATION', 400, 40, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#666666');
    doc.text(`Quote No: ${estimate.estimateNumber}`, 400, 65, { align: 'right' });
    doc.text(`Date: ${formatDate(estimate.date)}`, 400, 78, { align: 'right' });
    if (estimate.expiryDate) {
      doc.text(`Valid Until: ${formatDate(estimate.expiryDate)}`, 400, 91, { align: 'right' });
    }
    
    // Horizontal Line
    doc.moveTo(40, 130).lineTo(560, 130).stroke('#333333');
    
    // Party Details (To:)
    let partyY = 140;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('To:', 40, partyY);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text(party?.name || 'Customer', 40, partyY + 15);
    
    let partyAddrY = partyY + 30;
    if (party?.billingAddress) {
      const pAddr = party.billingAddress;
      if (pAddr.street) doc.font('Helvetica').fillColor('#666666').text(pAddr.street, 40, partyAddrY);
      partyAddrY += 12;
      let cityText = '';
      if (pAddr.city) cityText += pAddr.city;
      if (pAddr.state) cityText += (cityText ? ', ' : '') + pAddr.state;
      if (pAddr.pincode) cityText += ' - ' + pAddr.pincode;
      if (cityText) doc.text(cityText, 40, partyAddrY);
      partyAddrY += 12;
    }
    if (party?.gstin) {
      doc.text(`GSTIN: ${party.gstin}`, 40, partyAddrY);
    }
    
    // Items Table Header
    let tableY = 230;
    doc.rect(40, tableY, 520, 22).fillAndStroke('#333333', '#333333');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Sr.', 45, tableY + 6);
    doc.text('Description', 70, tableY + 6);
    doc.text('HSN', 280, tableY + 6);
    doc.text('Qty', 330, tableY + 6);
    doc.text('Rate', 380, tableY + 6);
    doc.text('Amount', 460, tableY + 6);
    
    // Items
    tableY += 22;
    doc.fillColor('#1a1a1a').font('Helvetica').fontSize(9);
    let totalTaxable = 0;
    let totalTax = 0;
    
    for (let i = 0; i < estimate.items.length; i++) {
      const item = estimate.items[i];
      const itemTax = (item.taxableAmount * (item.cgstRate + item.sgstRate + item.igstRate)) / 100;
      totalTaxable += item.taxableAmount;
      totalTax += itemTax;
      
      doc.text(String(i + 1), 45, tableY + 5);
      doc.text(item.description.substring(0, 35) || '-', 70, tableY + 5);
      doc.text(item.hsnCode || '-', 280, tableY + 5);
      doc.text(String(item.quantity), 330, tableY + 5);
      doc.text(formatCurrency(item.rate), 380, tableY + 5);
      doc.text(formatCurrency(item.totalAmount), 460, tableY + 5);
      
      doc.moveTo(40, tableY + 18).lineTo(560, tableY + 18).stroke('#cccccc');
      tableY += 20;
    }
    
    // Totals
    tableY += 10;
    doc.text('Subtotal:', 380, tableY);
    doc.text(formatCurrency(totalTaxable), 460, tableY);
    tableY += 15;
    
    if (totalTax > 0) {
      doc.text('Tax:', 380, tableY);
      doc.text(formatCurrency(totalTax), 460, tableY);
      tableY += 15;
    }
    
    // Total Amount Box
    doc.rect(380, tableY, 180, 25).fillAndStroke('#333333', '#333333');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
    doc.text('Total:', 390, tableY + 8);
    doc.text(formatCurrency(estimate.totalAmount), 460, tableY + 8);
    
    // Amount in Words
    tableY += 40;
    doc.fillColor('#1a1a1a').fontSize(9).font('Helvetica-Bold');
    doc.text('Amount in Words:', 40, tableY);
    doc.font('Helvetica').text(convertNumberToWords(estimate.totalAmount), 130, tableY);
    
    // Bank Details (if available)
    if (business?.bankDetails) {
      tableY += 30;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Bank Details:', 40, tableY);
      tableY += 15;
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      const bank = business.bankDetails;
      if (bank.bankName) doc.text(`Bank: ${bank.bankName}`, 40, tableY);
      if (bank.accountNumber) doc.text(`A/c No: ${bank.accountNumber}`, 200, tableY);
      tableY += 12;
      if (bank.ifscCode) doc.text(`IFSC: ${bank.ifscCode}`, 40, tableY);
      if (bank.branch) doc.text(`Branch: ${bank.branch}`, 200, tableY);
    }
    
    // Terms and Conditions
    if (estimate.terms) {
      tableY += 30;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Terms & Conditions:', 40, tableY);
      tableY += 15;
      doc.fontSize(9).font('Helvetica').fillColor('#666666').text(estimate.terms, 40, tableY, { width: 520 });
    }
    
    // Signature Area
    doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a');
    doc.text('For, ' + (business?.name || 'Company'), 400, 700, { align: 'right' });
    doc.moveTo(400, 750).lineTo(560, 750).stroke('#333333');
    doc.text('Authorized Signatory', 400, 755, { align: 'right' });
    
    // Footer
    doc.fontSize(8).fillColor('#999999');
    doc.text('Generated by Artha Cloud Accounting', 297, 785, { align: 'center' });
    
    doc.end();
  } catch (error) {
    next(error);
  }
});

router.get('/payment-receipt/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const party = await prisma.party.findUnique({ where: { id: payment.partyId } });
    const business = await prisma.business.findUnique({
      where: { id: payment.businessId },
      include: { settings: true },
    });
    const adjustments = await prisma.paymentAdjustment.findMany({
      where: { paymentId: payment.id },
      include: { invoice: true },
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.paymentNumber}.pdf`);
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#059669').text('PAYMENT RECEIPT', 50, 50);
    doc.fontSize(10).fillColor('#6b7280').text(`#${payment.paymentNumber}`, 50, 80);
    
    // Business Details
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827').text(business?.name || 'Business', 400, 50, { align: 'right' });
    doc.fontSize(9).fillColor('#6b7280');
    const addr = business?.address;
    if (addr?.street) doc.text(addr.street, 400, 68, { align: 'right' });
    if (addr?.city || addr?.pincode) doc.text(`${addr.city || ''} ${addr.pincode ? '- ' + addr.pincode : ''}`.trim(), 400, doc.y, { align: 'right' });
    if (addr?.state) doc.text(addr.state, 400, doc.y, { align: 'right' });
    if (business?.gstin) doc.text(`GSTIN: ${business.gstin}`, 400, doc.y, { align: 'right' });
    
    // Payment Details
    doc.rect(50, 130, 500, 80).fillAndStroke('#f0fdf4', '#86efac');
    doc.fontSize(12).fillColor('#111827');
    doc.text('Received from:', 60, 145);
    doc.font('Helvetica-Bold').text(party?.name || '-', 150, 145);
    doc.font('Helvetica').fillColor('#6b7280');
    doc.text(`Date: ${formatDate(payment.date)}`, 60, 165);
    doc.text(`Amount: ${formatCurrency(payment.amount)}`, 60, 180);
    doc.text(`Payment Method: ${payment.paymentMethod}`, 300, 180);
    if (payment.reference) doc.text(`Reference: ${payment.reference}`, 300, 165);
    
    // Amount in Words
    doc.fontSize(12).fillColor('#111827');
    doc.text('Rupees:', 60, 230);
    doc.font('Helvetica-Bold').text(convertNumberToWords(payment.amount), 130, 230);
    
    // Invoices Adjusted
    if (adjustments?.length > 0) {
      doc.fontSize(10).text('Invoices Adjusted:', 60, 270);
      let y = 285;
      for (const adj of adjustments) {
        doc.text(`• ${adj.invoice?.invoiceNumber || ''}: ${formatCurrency(adj.amount)}`, 70, y);
        y += 15;
      }
    }
    
    // Footer
    doc.fontSize(8).fillColor('#9ca3af');
    doc.text('Generated by Artha Cloud Accounting', 50, 780, { align: 'center' });
    
    doc.end();
  } catch (error) {
    next(error);
  }
});

export default router;
