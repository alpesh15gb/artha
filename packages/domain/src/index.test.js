import { describe, it, expect } from 'vitest';
import { calculateTax, calculateLineTotal, calculateDocumentTotals, evaluateStock, GST_RATES } from './index.js';

describe('Domain: GST Rates', () => {
  it('should have valid GST rates', () => {
    expect(GST_RATES).toContain(0);
    expect(GST_RATES).toContain(18);
    expect(GST_RATES).toContain(28);
  });
});

describe('Domain: calculateTax', () => {
  it('should calculate CGST and SGST correctly for interstate', () => {
    const result = calculateTax(1000, 18, 'GST');
    expect(result.cgst).toBe(90);
    expect(result.sgst).toBe(90);
    expect(result.total).toBe(180);
  });

  it('should handle zero amount', () => {
    const result = calculateTax(0, 18, 'GST');
    expect(result.total).toBe(0);
  });

  it('should round to 2 decimals', () => {
    const result = calculateTax(100.50, 18, 'GST');
    expect(result.cgst).toBe(9.05);
    expect(result.sgst).toBe(9.05);
  });
});

describe('Domain: calculateLineTotal', () => {
  it('should calculate line total with discount and tax', () => {
    const result = calculateLineTotal(2, 500, 10, 18);
    expect(result.gross).toBe(1000);
    expect(result.discount).toBe(100);
    expect(result.taxable).toBe(900);
    expect(result.tax).toBe(162);
    expect(result.total).toBe(1062);
  });

  it('should handle zero quantity', () => {
    const result = calculateLineTotal(0, 100, 0, 18);
    expect(result.total).toBe(0);
  });

  it('should handle no discount', () => {
    const result = calculateLineTotal(1, 1000, 0, 0);
    expect(result.total).toBe(1000);
  });
});

describe('Domain: calculateDocumentTotals', () => {
  const basicItems = [
    { quantity: 2, rate: 500, discountPercent: 0, cgstRate: 9, sgstRate: 9, igstRate: 0 },
    { quantity: 1, rate: 1000, discountPercent: 10, cgstRate: 9, sgstRate: 9, igstRate: 0 }
  ];

  it('should calculate totals correctly (tax-exclusive)', () => {
    const result = calculateDocumentTotals(basicItems, 0, 0, false);
    
    expect(result.subtotal).toBe(1900);
    expect(result.cgstAmount).toBe(171);
    expect(result.sgstAmount).toBe(171);
    expect(result.totalTax).toBe(342);
    expect(result.totalAmount).toBe(2242);
  });

  it('should apply document-level discount', () => {
    const result = calculateDocumentTotals(basicItems, 5, 0, false);
    expect(result.discountAmount).toBeGreaterThan(100);
    expect(result.totalAmount).toBeLessThan(2242);
  });

  it('should handle tax-inclusive pricing', () => {
    const taxInclusiveItems = [
      { quantity: 1, rate: 1180, discountPercent: 0, cgstRate: 9, sgstRate: 9, igstRate: 0 }
    ];
    
    const result = calculateDocumentTotals(taxInclusiveItems, 0, 0, true);
    expect(result.subtotal).toBe(1000);
    expect(result.totalAmount).toBe(1180);
  });

  it('should handle roundOff', () => {
    const result = calculateDocumentTotals(basicItems, 0, 0.50, false);
    expect(result.totalAmount).toBe(2242.50);
  });

  it('should return processed items with calculated values', () => {
    const result = calculateDocumentTotals(basicItems, 0, 0, false);
    expect(result.items[0].taxableAmount).toBe(1000);
    expect(result.items[0].cgstAmount).toBe(90);
    expect(result.items[1].taxableAmount).toBe(900);
  });
});

describe('Domain: evaluateStock', () => {
  it('should calculate closing stock', () => {
    const result = evaluateStock(100, 50, 30);
    expect(result).toBe(120);
  });

  it('should return negative for oversold', () => {
    const result = evaluateStock(10, 5, 30);
    expect(result).toBe(-15);
  });
});

describe('Domain: Determinism', () => {
  it('should produce identical results across multiple calls', () => {
    const items = [{ quantity: 2, rate: 500, discountPercent: 10, cgstRate: 9, sgstRate: 9, igstRate: 0 }];
    
    const result1 = calculateDocumentTotals(items, 0, 0, false);
    const result2 = calculateDocumentTotals(items, 0, 0, false);
    
    expect(result1.totalAmount).toBe(result2.totalAmount);
  });
});