import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = Router();

// This is a placeholder for a real GST API integration.
// Most real APIs require a key (e.g., Karza, Signzy, GSTINCheck).
// For now, we provide a structured mock response that can be easily 
// replaced with a real API call.

router.get('/gst-lookup/:gstin', authenticate, async (req, res, next) => {
  try {
    const { gstin } = req.params;
    const apiKey = process.env.GSTIN_CHECK_API_KEY || '9928d7eef0a37aeb8fb0b2c94720a22e';
    
    // Basic validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstin)) {
      return res.status(400).json({ success: false, message: 'Invalid GSTIN format' });
    }

    try {
      const response = await axios.get(`https://sheet.gstincheck.co.in/check/${apiKey}/${gstin}`);
      
      if (response.data && response.data.flag && response.data.data) {
        const gstData = response.data.data;
        const addr = gstData.pradr?.addr || {};
        
        // Map to our structure
        const mappedData = {
          gstin: gstin,
          tradeName: gstData.tradeNam || gstData.lgnm,
          legalName: gstData.lgnm,
          address: {
            buildingName: [addr.flno, addr.bno, addr.bnm].filter(Boolean).join(', '),
            street: [addr.st, addr.loc].filter(Boolean).join(', '),
            city: addr.dst || '',
            state: addr.stcd || '',
            pincode: addr.pncd || '',
          },
          status: gstData.sts || 'Unknown'
        };

        return res.json({ success: true, data: mappedData });
      } else {
        return res.status(404).json({ success: false, message: response.data?.message || 'GSTIN not found or API error' });
      }
    } catch (apiError) {
      console.error('GST API Error:', apiError.message);
      return res.status(500).json({ success: false, message: 'Could not connect to GST verification service' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
