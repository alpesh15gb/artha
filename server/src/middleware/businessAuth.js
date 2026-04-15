import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const verifyBusinessOwnership = async (req, res, next) => {
  const businessId = req.params.businessId || req.body.businessId || req.query.businessId;
  
  if (!businessId) {
    return next();
  }

  try {
    const business = await prisma.business.findFirst({
      where: { 
        id: businessId, 
        userId: req.user.id 
      }
    });

    if (!business) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden: You do not have access to this business.' 
      });
    }

    req.business = business;
    next();
  } catch (error) {
    next(error);
  }
};
