import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from 'pdfkit';
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth.routes.js";
import businessRoutes from "./routes/business.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import partyRoutes from "./routes/party.routes.js";
import itemRoutes from "./routes/item.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import estimateRoutes from "./routes/estimate.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import reportRoutes from "./routes/report.routes.js";
import importRoutes from "./routes/import.routes.js";
import accountRoutes from "./routes/account.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ocrRoutes from "./routes/ocr.routes.js";
import utilsRoutes from "./routes/utils.routes.js";
import taskRoutes from "./routes/task.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders, rateLimiter } from "./middleware/security.js";
import { auditLogger } from "./middleware/auditLog.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(process.cwd(), "tmp")
}));

// Universal Debugger & JSON Fixer
app.use((req, res, next) => {
  console.log(`📡 [API REQUEST] ${req.method} ${req.url}`);
  if (req.body && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
      console.log('🔧 Fixed stringified body from mobile');
    } catch (e) {}
  }
  next();
});

app.use(securityHeaders);
app.use(rateLimiter);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/ocr", ocrRoutes);
app.use("/api/utils", utilsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/parties", auditLogger("PARTY"), partyRoutes);
app.use("/api/items", auditLogger("ITEM"), itemRoutes);
app.use("/api/invoices", auditLogger("INVOICE"), invoiceRoutes);
app.use("/api/estimates", auditLogger("ESTIMATE"), estimateRoutes);
app.use("/api/purchases", auditLogger("PURCHASE"), purchaseRoutes);
app.use("/api/payments", auditLogger("PAYMENT"), paymentRoutes);
app.use("/api/expenses", auditLogger("EXPENSE"), expenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/accounts", accountRoutes);

import prismaShared from "./lib/prisma.js";

app.use("/api/download", downloadRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  console.log(`[404 DEBUG] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: `Route ${req.url} not found` });
});

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Artha API Server running on port ${PORT} (Network Visible)`);

  // Bootstrap Admin for the user
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.user.update({
      where: { email: "admin@artha.com" },
      data: { role: "ADMIN" },
    });

    // Seed Platinum Plan (Single Tier)
    const existingPlan = await prisma.plan.findFirst({ where: { name: "Platinum" } });
    if (!existingPlan) {
      await prisma.plan.create({
        data: {
          name: "Platinum",
          price: 999,
          duration: 365, // Yearly billing
          features: {
            businesses: "Unlimited",
            invoices: "Unlimited",
            items: "Unlimited",
            parties: "Unlimited",
            reports: "Unlimited",
          },
        },
      });
      console.log("Seeded Platinum Unlimited Plan (Yearly: 999)");
    }

    console.log("Successfully initialized system bootstrap.");
  } catch (e) {
    console.log("Bootstrap info:", e.message);
  }
});

export default app;
