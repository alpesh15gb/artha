/**
 * Artha Domain Logic
 * Single source of truth for all accounting calculations.
 * All functions MUST be deterministic and tested.
 * 
 * Rounding Rules:
 * 1. Use 2 decimal precision throughout
 * 2. Round intermediate values after each calculation
 * 3. Calculate tax per-line-item then sum
 */

export const GST_RATES = [0, 3, 5, 12, 18, 28];

const round2 = (n) => Math.round((n || 0) * 100) / 100;

export const calculateTax = (amount, rate, type = 'GST') => {
  if (type === 'GST') {
    const cgst = round2((amount * (rate / 2)) / 100);
    const sgst = round2((amount * (rate / 2)) / 100);
    return {
      cgst,
      sgst,
      igst: cgst + sgst,
      total: cgst + sgst
    };
  }
  return { total: round2((amount * rate) / 100) };
};

export const calculateLineTotal = (quantity, price, discountPercent = 0, taxRate = 0) => {
  const gross = round2(quantity * price);
  const discount = round2((gross * discountPercent) / 100);
  const taxable = round2(gross - discount);
  const tax = round2((taxable * taxRate) / 100);
  
  return {
    gross,
    discount,
    taxable,
    tax,
    total: round2(taxable + tax)
  };
};

export const evaluateStock = (opening, purchase, sales) => {
  return round2(opening + purchase - sales);
};

/**
 * Robust Document Totals Calculation
 * Handles both tax-inclusive and tax-exclusive pricing.
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
    
    const cgstRate = parseFloat(item.cgstRate) || 0;
    const sgstRate = parseFloat(item.sgstRate) || 0;
    const igstRate = parseFloat(item.igstRate) || 0;
    const taxRate = cgstRate + sgstRate + igstRate;

    let taxableAmount, cgstAmount, sgstAmount, igstAmount, itemTotal;

    if (isTaxInclusive) {
      itemTotal = round2(qty * rate);
      const lineDiscountAmount = round2((itemTotal * itemDiscountPercent) / 100);
      itemTotal = round2(itemTotal - lineDiscountAmount);
      
      taxableAmount = round2(itemTotal / (1 + taxRate / 100));
      const totalTaxAmount = round2(itemTotal - taxableAmount);
      
      cgstAmount = round2(totalTaxAmount * (cgstRate / taxRate || 0));
      sgstAmount = round2(totalTaxAmount * (sgstRate / taxRate || 0));
      igstAmount = round2(totalTaxAmount * (igstRate / taxRate || 0));
      
      discountTotal += lineDiscountAmount;
    } else {
      const rawLineTotal = round2(qty * rate);
      const lineDiscountAmount = round2((rawLineTotal * itemDiscountPercent) / 100);
      taxableAmount = round2(rawLineTotal - lineDiscountAmount);
      
      cgstAmount = round2((taxableAmount * cgstRate) / 100);
      sgstAmount = round2((taxableAmount * sgstRate) / 100);
      igstAmount = round2((taxableAmount * igstRate) / 100);
      
      itemTotal = round2(taxableAmount + cgstAmount + sgstAmount + igstAmount);
      discountTotal += lineDiscountAmount;
    }

    subtotal += taxableAmount;
    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      ...item,
      discountAmount: round2((qty * rate * itemDiscountPercent) / 100),
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount: itemTotal
    };
  });

  const docDiscountAmount = round2((subtotal * discountPercent) / 100);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotalBeforeRounding = subtotal + totalTax - docDiscountAmount;
  const grandTotal = round2(grandTotalBeforeRounding + (parseFloat(roundOff) || 0));

  return {
    items: processedItems,
    subtotal: round2(subtotal),
    cgstAmount: round2(cgstTotal),
    sgstAmount: round2(sgstTotal),
    igstAmount: round2(igstTotal),
    totalTax,
    discountAmount: round2(discountTotal + docDiscountAmount),
    totalAmount: grandTotal,
  };
};
