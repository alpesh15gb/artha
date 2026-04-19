import { Router } from 'express';
import Tesseract from 'tesseract.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

/** 
 * Basic heuristic parser for OCR text
 * Extracts: Date, Bill Number, Total Amount, GSTIN
 */
const parseBillText = (text) => {
  const result = {
    date: null,
    billNumber: null,
    totalAmount: null,
    gstin: null,
    items: []
  };

  const lines = text.split('\n');
  
  // Date pattern: DD-MM-YYYY, DD/MM/YYYY, etc.
  const datePattern = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;
  
  // GSTIN pattern
  const gstinPattern = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}/;
  
  // Amount patterns: Rs. 1000, Total 500, etc.
  const amountPattern = /(?:total|amount|payable|net|sum|amt)[\s:]*₹?[\s]*(\d+[,.]\d{2})/i;

  lines.forEach(line => {
    // Extract date
    if (!result.date) {
      const dMatch = line.match(datePattern);
      if (dMatch) result.date = dMatch[0];
    }
    
    // Extract GSTIN
    if (!result.gstin) {
      const gMatch = line.match(gstinPattern);
      if (gMatch) result.gstin = gMatch[0];
    }
    
    // Extract Total
    if (!result.totalAmount) {
      const aMatch = line.match(amountPattern);
      if (aMatch) result.totalAmount = parseFloat(aMatch[1].replace(',', ''));
    }

    // Heuristic for bill number
    if (!result.billNumber && (line.toLowerCase().includes('invoice') || line.toLowerCase().includes('bill no'))) {
      const nMatch = line.match(/(?:no|num|#)[\s:]*([A-Za-z0-9-]+)/i);
      if (nMatch) result.billNumber = nMatch[1];
    }
  });

  return result;
};

router.post('/bill', async (req, res, next) => {
  try {
    if (!req.files || !req.files.bill) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const file = req.files.bill;
    
    // OCR Processing
    const { data: { text } } = await Tesseract.recognize(file.data, 'eng', {
      logger: m => console.log(m)
    });

    const parsedData = parseBillText(text);

    res.json({
      success: true,
      data: parsedData,
      rawText: text // Useful for debugging
    });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ success: false, message: 'OCR processing failed', error: error.message });
  }
});

export default router;
