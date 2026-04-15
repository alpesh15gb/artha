// Basic custom security headers (equivalent to simple Helmet config)
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

// Basic in-memory rate limiter to prevent massive brute force attacks
const requestCounts = new Map();

// Clear the memory map every 15 minutes to reset the window
setInterval(() => {
  requestCounts.clear();
}, 15 * 60 * 1000);

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  // Limit to 200 requests per 15 minutes per IP
  if (count > 200) {
    return res.status(429).json({ 
      success: false, 
      message: 'Too many requests from this IP, please try again after 15 minutes.' 
    });
  }
  next();
};
