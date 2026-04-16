import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { authenticate } from '../middleware/auth.js';
import { verifyBusinessOwnership } from '../middleware/businessAuth.js';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const convertNumberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];
  
  if (num === 0) return 'Zero';
  
  let words = '';
  let scaleIndex = 0;
  let numStr = Math.floor(num).toString();
  
  while (numStr.length > 0) {
    let chunk = parseInt(numStr.slice(-2)) || 0;
    if (chunk > 0) {
      let chunkWords = '';
      if (chunk < 20) {
        chunkWords = ones[chunk];
      } else {
        chunkWords = tens[Math.floor(chunk / 10)] + (chunk % 10 ? ' ' + ones[chunk % 10] : '');
      }
      words = chunkWords + (scaleIndex > 0 ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
    }
    numStr = numStr.slice(0, -2);
    scaleIndex++;
  }
  
  return words + ' Only';
};

async function generateInvoicePDF(invoice, business, party, items, res) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
  
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
  
  // Invoice Title and Details on Right
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1a1a').text('INVOICE', 400, 40, { align: 'right' });
  doc.fontSize(10).font('Helvetica').fillColor('#666666');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 65, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.date)}`, 400, 78, { align: 'right' });
  if (invoice.dueDate) {
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 400, 91, { align: 'right' });
  }
  if (invoice.stateOfSupply || business?.settings?.stateCode) {
    doc.text(`State: ${invoice.stateOfSupply || business.settings.stateCode}`, 400, 104, { align: 'right' });
  }
  
  // Horizontal Line
  doc.moveTo(40, 130).lineTo(560, 130).stroke('#333333');
  
  // Party Details (Bill To)
  let partyY = 140;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Bill To:', 40, partyY);
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
  doc.text('Description', 65, tableY + 6);
  doc.text('HSN', 260, tableY + 6);
  doc.text('Qty', 310, tableY + 6);
  doc.text('Rate', 355, tableY + 6);
  doc.text('Tax', 400, tableY + 6);
  doc.text('Amount', 455, tableY + 6);
  
  // Items
  tableY += 22;
  doc.fillColor('#1a1a1a').font('Helvetica').fontSize(9);
  let cgstTotal = 0, sgstTotal = 0, igstTotal = 0;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const taxRate = (item.cgstRate || 0) + (item.sgstRate || 0) + (item.igstRate || 0);
    cgstTotal += item.cgstAmount || 0;
    sgstTotal += item.sgstAmount || 0;
    igstTotal += item.igstAmount || 0;
    
    doc.text(String(i + 1), 45, tableY + 5);
    doc.text(item.description.substring(0, 35) || '-', 65, tableY + 5);
    doc.text(item.hsnCode || '-', 260, tableY + 5);
    doc.text(String(item.quantity), 310, tableY + 5);
    doc.text(formatCurrency(item.rate), 355, tableY + 5);
    doc.text(taxRate > 0 ? taxRate + '%' : '-', 400, tableY + 5);
    doc.text(formatCurrency(item.totalAmount), 455, tableY + 5);
    
    doc.moveTo(40, tableY + 18).lineTo(560, tableY + 18).stroke('#cccccc');
    tableY += 20;
  }
  
  // Totals
  tableY += 10;
  doc.text('Subtotal:', 380, tableY);
  doc.text(formatCurrency(invoice.subtotal), 455, tableY);
  tableY += 15;
  
  if (invoice.discountAmount > 0) {
    doc.text('Discount:', 380, tableY);
    doc.text(`-${formatCurrency(invoice.discountAmount)}`, 455, tableY);
    tableY += 15;
  }
  
  if (business?.settings?.showTaxBreakup !== false) {
    if (cgstTotal > 0) {
      doc.text('CGST:', 380, tableY);
      doc.text(formatCurrency(cgstTotal), 455, tableY);
      tableY += 15;
    }
    if (sgstTotal > 0) {
      doc.text('SGST:', 380, tableY);
      doc.text(formatCurrency(sgstTotal), 455, tableY);
      tableY += 15;
    }
    if (igstTotal > 0) {
      doc.text('IGST:', 380, tableY);
      doc.text(formatCurrency(igstTotal), 455, tableY);
      tableY += 15;
    }
  } else {
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    if (totalTax > 0) {
      doc.text('Total Tax:', 380, tableY);
      doc.text(formatCurrency(totalTax), 455, tableY);
      tableY += 15;
    }
  }

  if (invoice.cessAmount > 0) {
    doc.text('Cess:', 380, tableY);
    doc.text(formatCurrency(invoice.cessAmount), 455, tableY);
    tableY += 15;
  }
  if (invoice.roundOff !== 0) {
    doc.text('Round Off:', 380, tableY);
    doc.text(formatCurrency(invoice.roundOff), 455, tableY);
    tableY += 15;
  }
  
  // Total Amount Box
  doc.rect(380, tableY, 180, 25).fillAndStroke('#333333', '#333333');
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
  doc.text('Total:', 390, tableY + 8);
  doc.text(formatCurrency(invoice.totalAmount), 455, tableY + 8);
  
  // Amount in Words
  tableY += 40;
  doc.fillColor('#1a1a1a').fontSize(9).font('Helvetica-Bold');
  doc.text('Amount in Words:', 40, tableY);
  doc.font('Helvetica').text(convertNumberToWords(invoice.totalAmount), 130, tableY);
  
  // Bank Details
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
    tableY += 15;
  }
  
  // UPI QR Code
  if (business?.settings?.showQrCode !== false && business?.upiId) {
    tableY += 15;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Scan to Pay:', 40, tableY);
    try {
      const QRCode = (await import('qrcode')).default;
      const upiUrl = `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(business.name)}&am=${invoice.totalAmount}&cu=INR`;
      const qrBuffer = await QRCode.toBuffer(upiUrl, { width: 80, margin: 1 });
      doc.image(qrBuffer, 40, tableY + 15, { width: 80 });
      tableY += 100; // adjust for next elements
    } catch(e) { console.error('QR code error', e); }
  }
  
  // Notes
  if (invoice.notes) {
    tableY += 30;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Notes:', 40, tableY);
    tableY += 15;
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(invoice.notes, 40, tableY, { width: 520 });
  }
  
  // Terms
  if (invoice.terms) {
    tableY += 30;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a').text('Terms & Conditions:', 40, tableY);
    tableY += 15;
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(invoice.terms, 40, tableY, { width: 520 });
  }
  
  // Signature Area
  doc.fontSize(10).font('Helvetica').fillColor('#1a1a1a');
  doc.text('For, ' + (business?.name || 'Company'), 400, 700, { align: 'right' });
  
  if (business?.settings?.showSignature !== false && business?.signatureImage) {
    try {
      const sigPath = path.join(process.cwd(), business.signatureImage.replace(/^\//, ''));
      if (fs.existsSync(sigPath)) {
        doc.image(sigPath, 450, 715, { width: 100, height: 35 });
      }
    } catch(e) { console.error('Signature load error', e); }
  } else {
    doc.moveTo(400, 750).lineTo(560, 750).stroke('#333333');
  }
  
  doc.text('Authorized Signatory', 400, 755, { align: 'right' });
  
  // Footer
  doc.fontSize(8).fillColor('#999999');
  doc.text('Generated by Artha Cloud Accounting', 297, 785, { align: 'center' });
  
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
