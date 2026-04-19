/**
 * Artha Domain Logic
 * Pure functions for accounting math and business rules.
 */

export const GST_RATES = [0, 3, 5, 12, 18, 28];

export const calculateTax = (amount, rate, type = 'GST') => {
  if (type === 'GST') {
    const cgst = (amount * (rate / 2)) / 100;
    const sgst = (amount * (rate / 2)) / 100;
    return {
      cgst,
      sgst,
      igst: cgst + sgst,
      total: cgst + sgst
    };
  }
  return { total: (amount * rate) / 100 };
};

export const calculateLineTotal = (quantity, price, discountPercent = 0, taxRate = 0) => {
  const gross = quantity * price;
  const discount = (gross * discountPercent) / 100;
  const taxable = gross - discount;
  const tax = (taxable * taxRate) / 100;
  
  return {
    gross,
    discount,
    taxable,
    tax,
    total: taxable + tax
  };
};

export const evaluateStock = (opening, purchase, sales) => {
  return opening + purchase - sales;
};
