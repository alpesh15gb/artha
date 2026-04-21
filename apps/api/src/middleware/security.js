// Premium custom security headers for Artha Cloud Infrastructure
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Removed HSTS for local development to allow mobile HTTP connectivity
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Artha-Security-Shield', 'Active-v1.2');
  next();
};

// Professional in-memory rate limiter with circuit-breaker style feedback
const requestCounts = new Map();

// Reset the window every 10 minutes (slightly tighter for better protection)
setInterval(() => {
  requestCounts.clear();
}, 10 * 60 * 1000);

export const rateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  // Limit to 300 requests per 10 minutes per IP
  if (count > 300) {
    return res.status(429).json({ 
      success: false, 
      error: 'Security Policy Level 1 Triggered',
      message: 'Artha Cloud detected an unusual request volume from your IP. Access is temporarily restricted. Please retry in 10 minutes.' 
    });
  }
  next();
};
