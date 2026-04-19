export const errorHandler = (err, req, res, next) => {
  console.error('[System Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.userId,
    timestamp: new Date().toISOString()
  });

  if (err.message.includes("Financial validation failed")) {
    console.warn('🚩 FINANCIAL INTEGRITY ALERT', {
      url: req.originalUrl,
      body: req.body,
      errorDetails: err.details || err.message
    });
    return res.status(400).json({
      success: false,
      message: 'Financial safety check failed. The document totals do not match legal requirements.',
      error: err.message
    });
  }

  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors || err.message,
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};
