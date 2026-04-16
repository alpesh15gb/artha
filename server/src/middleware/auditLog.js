import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auditLogger = (entityType) => {
  return (req, res, next) => {
    const originalSend = res.json;
    
    // We override res.json to capture the response data so we can pull the inserted/updated ID
    res.json = function(body) {
      res.locals.body = body;
      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      if (req.method === 'GET' || req.method === 'OPTIONS') return;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let action = 'UNKNOWN';
        if (req.method === 'POST') action = 'CREATE';
        if (req.method === 'PUT' || req.method === 'PATCH') action = 'UPDATE';
        if (req.method === 'DELETE') action = 'DELETE';

        try {
          const businessId = req.business?.id || req.body?.businessId || req.params?.businessId;
          const userId = req.user?.id;
          
          if (!businessId || !userId) return;

          // Determine entity ID. If POST, the new ID is usually in res.locals.body.data.id
          let entityId = req.params.id;
          if (action === 'CREATE' && res.locals.body?.data?.id) {
            entityId = res.locals.body.data.id;
          }

          await prisma.auditLog.create({
            data: {
              businessId,
              userId,
              action,
              entityType,
              entityId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
              newValue: action !== 'DELETE' ? req.body : undefined
            }
          });
        } catch (error) {
          console.error(`Audit Log error for ${entityType}:`, error);
        }
      }
    });
    
    next();
  };
};
