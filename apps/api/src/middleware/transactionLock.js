import prisma from "../lib/prisma.js";

/**
 * Middleware to prevent modifications to transactions if the fiscal year is locked.
 * Checks the business settings for enableFinancialLock and lockDate.
 */
export const checkTransactionLock = (modelName) => async (req, res, next) => {
  try {
    const { businessId, id } = req.params;
    let transactionDate = req.body.date ? new Date(req.body.date) : null;

    // If no date in body (e.g. Delete or specific Update), fetch existing record
    if (!transactionDate && id && modelName) {
      const record = await prisma[modelName].findUnique({
        where: { id },
        select: { date: true },
      });
      if (record) transactionDate = new Date(record.date);
    }

    if (!businessId || !transactionDate) {
      return next();
    }

    const settings = await prisma.businessSettings.findUnique({
      where: { businessId },
      select: {
        enableFinancialLock: true,
        lockDate: true,
      },
    });

    if (settings?.enableFinancialLock && settings.lockDate) {
      const lockDate = new Date(settings.lockDate);

      // Normalize dates to start of day for comparison
      transactionDate.setHours(0, 0, 0, 0);
      lockDate.setHours(0, 0, 0, 0);

      if (transactionDate <= lockDate) {
        return res.status(403).json({
          success: false,
          message: `This period is locked. Cannot create or modify transactions on or before ${lockDate.toLocaleDateString()}.`,
        });
      }
    }

    next();
  } catch (error) {
    console.error(`Transaction Lock Check Error (${modelName}):`, error);
    next();
  }
};
