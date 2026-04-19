import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createComplaintSchema = z.object({
  businessId: z.string().uuid(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  partyId: z.string().uuid().optional(),
});

const updateComplaintSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  partyId: z.string().uuid().optional(),
});

const updateComplaintStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "PENDING", "RESOLVED", "CLOSED"]),
  note: z.string().optional(),
});

const resolveComplaintSchema = z.object({
  note: z.string().min(1),
  resolvedBy: z.string().optional(),
});

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const {
      status,
      priority,
      fromDate,
      toDate,
      partyId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const where = {
      businessId,
      ...(status && { status: status.split(",") }),
      ...(priority && { priority }),
      ...(partyId && { partyId }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
          { customerPhone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          party: { select: { id: true, name: true, phone: true } },
          _count: { select: { resolutions: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;

    const [total, open, inProgress, resolved, closed, critical] =
      await Promise.all([
        prisma.complaint.count({ where: { businessId } }),
        prisma.complaint.count({ where: { businessId, status: "OPEN" } }),
        prisma.complaint.count({
          where: { businessId, status: "IN_PROGRESS" },
        }),
        prisma.complaint.count({ where: { businessId, status: "RESOLVED" } }),
        prisma.complaint.count({ where: { businessId, status: "CLOSED" } }),
        prisma.complaint.count({
          where: {
            businessId,
            priority: "URGENT",
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        }),
      ]);

    res.json({
      success: true,
      data: { total, open, inProgress, resolved, closed, critical },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const complaint = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        party: true,
        resolutions: { orderBy: { createdAt: "desc" } },
        timeline: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!complaint) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createComplaintSchema.parse(req.body);

    const complaint = await prisma.complaint.create({
      data: {
        businessId: data.businessId,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        partyId: data.partyId || null,
      },
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    await prisma.complaintTimeline.create({
      data: {
        complaintId: complaint.id,
        fromStatus: "OPEN",
        toStatus: "OPEN",
        note: "Complaint registered",
      },
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const check = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const data = updateComplaintSchema.parse(req.body);

    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data,
      include: {
        party: { select: { id: true, name: true, phone: true } },
        resolutions: { orderBy: { createdAt: "desc" } },
      },
    });

    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const check = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const data = updateComplaintStatusSchema.parse(req.body);

    const complaint = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id: req.params.id },
        data: {
          status: data.status,
          resolvedAt: data.status === "RESOLVED" ? new Date() : null,
        },
        include: {
          party: { select: { id: true, name: true, phone: true } },
        },
      });

      await tx.complaintTimeline.create({
        data: {
          complaintId: req.params.id,
          fromStatus: check.status,
          toStatus: data.status,
          note: data.note || `Status changed to ${data.status}`,
        },
      });

      return updated;
    });

    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/resolve", async (req, res, next) => {
  try {
    const check = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const data = resolveComplaintSchema.parse(req.body);

    const resolution = await prisma.$transaction(async (tx) => {
      const res = await tx.complaintResolution.create({
        data: {
          complaintId: req.params.id,
          note: data.note,
          resolvedBy: data.resolvedBy || null,
        },
      });

      await tx.complaint.update({
        where: { id: req.params.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });

      await tx.complaintTimeline.create({
        data: {
          complaintId: req.params.id,
          fromStatus: check.status,
          toStatus: "RESOLVED",
          note: data.note,
        },
      });

      return res;
    });

    res.status(201).json({ success: true, data: resolution });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/convert-to-task", async (req, res, next) => {
  try {
    const check = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    const task = await prisma.task.create({
      data: {
        businessId: check.businessId,
        title: `Task from complaint: ${check.title}`,
        description: check.description,
        priority: check.priority,
        partyId: check.partyId,
      },
    });

    await prisma.complaint.update({
      where: { id: req.params.id },
      data: { taskId: task.id },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const check = await prisma.complaint.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Complaint not found" });
    }

    await prisma.complaint.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: "Complaint deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
