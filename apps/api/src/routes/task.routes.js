import { Router } from "express";
import prisma from "../lib/prisma.js";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { verifyBusinessOwnership } from "../middleware/businessAuth.js";

const router = Router();

router.use(authenticate);
router.use(verifyBusinessOwnership);

const createTaskSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z
    .enum([
      "MAINTENANCE",
      "INSTALLATION",
      "REPAIR",
      "SERVICE",
      "FOLLOWUP",
      "INSPECTION",
      "OTHER",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional(),
  dueTime: z.string().optional(),
  remindBefore: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z
    .enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])
    .optional(),
  recurrenceEnd: z.string().datetime().optional(),
  partyId: z.string().uuid().optional(),
  assignedTo: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z
    .enum([
      "MAINTENANCE",
      "INSTALLATION",
      "REPAIR",
      "SERVICE",
      "FOLLOWUP",
      "INSPECTION",
      "OTHER",
    ])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional(),
  dueTime: z.string().optional(),
  remindBefore: z.number().optional(),
  isRecurring: z.boolean().optional(),
  recurrence: z
    .enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])
    .optional(),
  recurrenceEnd: z.string().datetime().optional(),
  partyId: z.string().uuid().optional(),
  assignedTo: z.string().optional(),
});

const updateTaskStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "OVERDUE",
    "CANCELLED",
    "ON_HOLD",
  ]),
});

const addTaskNoteSchema = z.object({
  content: z.string().min(1),
});

router.get("/business/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const {
      status,
      category,
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
      ...(category && { category }),
      ...(priority && { priority }),
      ...(partyId && { partyId }),
      ...(fromDate && { dueDate: { gte: new Date(fromDate) } }),
      ...(toDate && { dueDate: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { assignedTo: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          party: { select: { id: true, name: true, phone: true } },
          _count: { select: { notes: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
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

router.get("/due-soon/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { hours = 24 } = req.query;

    const now = new Date();
    const future = new Date(now.getTime() + Number(hours) * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: now, lte: future },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/overdue/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
      orderBy: { dueDate: "asc" },
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/today/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        businessId,
        dueDate: { gte: today, lt: tomorrow },
      },
      orderBy: [{ priority: "desc" }, { dueTime: "asc" }],
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/stats/:businessId", async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, pending, inProgress, completed, overdue, dueToday] =
      await Promise.all([
        prisma.task.count({ where: { businessId } }),
        prisma.task.count({ where: { businessId, status: "PENDING" } }),
        prisma.task.count({ where: { businessId, status: "IN_PROGRESS" } }),
        prisma.task.count({ where: { businessId, status: "COMPLETED" } }),
        prisma.task.count({
          where: {
            businessId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            dueDate: { lt: new Date() },
          },
        }),
        prisma.task.count({
          where: {
            businessId,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            dueDate: { gte: today, lt: tomorrow },
          },
        }),
      ]);

    res.json({
      success: true,
      data: { total, pending, inProgress, completed, overdue, dueToday },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        businessId: data.businessId,
        title: data.title,
        description: data.description,
        category: data.category || "OTHER",
        priority: data.priority || "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        remindBefore: data.remindBefore || 15,
        isRecurring: data.isRecurring || false,
        recurrence: data.recurrence,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        partyId: data.partyId || null,
        assignedTo: data.assignedTo,
      },
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
      include: {
        party: true,
        notes: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const check = await prisma.task.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        recurrenceEnd: data.recurrenceEnd
          ? new Date(data.recurrenceEnd)
          : undefined,
      },
      include: {
        party: { select: { id: true, name: true, phone: true } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const check = await prisma.task.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const data = updateTaskStatusSchema.parse(req.body);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        completedAt: data.status === "COMPLETED" ? new Date() : null,
      },
      include: {
        party: { select: { id: true, name: true, phone: true } },
      },
    });

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/notes", async (req, res, next) => {
  try {
    const check = await prisma.task.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const data = addTaskNoteSchema.parse(req.body);

    const note = await prisma.taskNote.create({
      data: {
        taskId: req.params.id,
        content: data.content,
      },
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const check = await prisma.task.findFirst({
      where: { id: req.params.id, business: { userId: req.user.id } },
    });

    if (!check) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
