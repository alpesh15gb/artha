export * from './schemas.js';
export * from './sync.js';

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Robust Financial Calculation Engine
 * 
 * Rules:
 * 1. All calculations use 2 decimal precision.
 * 2. Intermediate taxable amounts are rounded up to 2 decimals.
 * 3. GST values are calculated per-item and then summed.
 */
export const calculateDocumentTotals = (items, discountPercent = 0, roundOff = 0, isTaxInclusive = false) => {
  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let discountTotal = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const itemDiscountPercent = parseFloat(item.discountPercent) || 0;
    
    // Taxes Rates
    const cgstRate = parseFloat(item.cgstRate) || 0;
    const sgstRate = parseFloat(item.sgstRate) || 0;
    const igstRate = parseFloat(item.igstRate) || 0;
    const taxRate = cgstRate + sgstRate + igstRate;

    let taxableAmount, cgstAmount, sgstAmount, igstAmount, itemTotal;

    if (isTaxInclusive) {
      // Total = Qty * Rate
      itemTotal = qty * rate;
      const lineDiscountAmount = Math.round((itemTotal * itemDiscountPercent / 100) * 100) / 100;
      itemTotal = itemTotal - lineDiscountAmount;
      
      // Reverse Taxable = Total / (1 + TaxRate/100)
      taxableAmount = Math.round((itemTotal / (1 + taxRate/100)) * 100) / 100;
      const totalTaxAmount = itemTotal - taxableAmount;
      
      // Split Tax
      cgstAmount = Math.round((totalTaxAmount * (cgstRate/taxRate || 0)) * 100) / 100;
      sgstAmount = Math.round((totalTaxAmount * (sgstRate/taxRate || 0)) * 100) / 100;
      igstAmount = Math.round((totalTaxAmount * (igstRate/taxRate || 0)) * 100) / 100;
      
      discountTotal += lineDiscountAmount;
    } else {
      // Taxable Amount = (Qty * Rate) - Item Discount
      const rawLineTotal = qty * rate;
      const lineDiscountAmount = Math.round((rawLineTotal * itemDiscountPercent / 100) * 100) / 100;
      taxableAmount = Math.round((rawLineTotal - lineDiscountAmount) * 100) / 100;
      
      cgstAmount = Math.round((taxableAmount * cgstRate / 100) * 100) / 100;
      sgstAmount = Math.round((taxableAmount * sgstRate / 100) * 100) / 100;
      igstAmount = Math.round((taxableAmount * igstRate / 100) * 100) / 100;
      
      itemTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
      discountTotal += lineDiscountAmount;
    }

    subtotal += taxableAmount;
    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      ...item,
      discountAmount: Math.round((qty * rate * itemDiscountPercent / 100) * 100) / 100,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: itemTotal
    };
  });

  // Document level discount (applied to subtotal)
  const docDiscountAmount = Math.round((subtotal * discountPercent / 100) * 100) / 100;
  
  // Final Grand Total
  const totalTax = cgstTotal + sgstTotal + igstTotal;
  const grandTotalBeforeRounding = subtotal + totalTax - docDiscountAmount;
  const grandTotal = Math.round((grandTotalBeforeRounding + (parseFloat(roundOff) || 0)) * 100) / 100;

  return {
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    cgstAmount: Math.round(cgstTotal * 100) / 100,
    sgstAmount: Math.round(sgstTotal * 100) / 100,
    igstAmount: Math.round(igstTotal * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    discountAmount: Math.round((discountTotal + docDiscountAmount) * 100) / 100,
    totalAmount: grandTotal,
  };
};

export const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const amount = Math.floor(num);
    if (amount === 0) return 'Zero';

    const n = ('000000000' + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    
    return str.trim() + ' Rupees Only';
};
