import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  X,
  ArrowRight,
  Filter,
  MoreVertical,
  Phone,
  User,
  Bell,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  formatDistanceToNow,
} from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Button, Input, Card, Badge, Modal, cn } from "../components/ui";
import toast from "react-hot-toast";

const PRIORITY_COLORS = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-rose-100 text-rose-700",
};

const STATUS_COLORS = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-400",
  ON_HOLD: "bg-amber-100 text-amber-600",
};

const STATUS_ICON = {
  PENDING: Clock,
  IN_PROGRESS: Play,
  COMPLETED: CheckCircle,
  OVERDUE: AlertTriangle,
  CANCELLED: XCircle,
  ON_HOLD: Pause,
};

const CATEGORIES = [
  { id: "MAINTENANCE", label: "Maintenance" },
  { id: "INSTALLATION", label: "Installation" },
  { id: "REPAIR", label: "Repair" },
  { id: "SERVICE", label: "Service" },
  { id: "FOLLOWUP", label: "Follow-up" },
  { id: "INSPECTION", label: "Inspection" },
  { id: "OTHER", label: "Other" },
];

const PRIORITIES = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
  { id: "URGENT", label: "Urgent" },
];

function Tasks() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFormModal, setShowFormModal] = useState({
    isOpen: false,
    initialData: null,
  });
  const [viewMode, setViewMode] = useState("list");

  const { data: statsData } = useQuery({
    queryKey: ["task-stats", currentBusiness?.id],
    queryFn: () =>
      api.get(`/tasks/stats/${currentBusiness?.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "tasks",
      currentBusiness?.id,
      search,
      statusFilter,
      priorityFilter,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      return api
        .get(`/tasks/business/${currentBusiness?.id}?${params}`)
        .then((r) => r.data);
    },
    enabled: !!currentBusiness?.id,
  });

  const { data: overdueData } = useQuery({
    queryKey: ["tasks-overdue", currentBusiness?.id],
    queryFn: () =>
      api.get(`/tasks/overdue/${currentBusiness?.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: todayData } = useQuery({
    queryKey: ["tasks-today", currentBusiness?.id],
    queryFn: () =>
      api.get(`/tasks/today/${currentBusiness?.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      queryClient.invalidateQueries(["task-stats"]);
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const tasks = data?.data || [];
  const stats = statsData?.data || {};
  const overdueTasks = overdueData?.data || [];
  const todayTasks = todayData?.data || [];

  const groupedTasks = useMemo(() => {
    const overdue = tasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED" &&
        t.dueDate &&
        isPast(new Date(t.dueDate)),
    );
    const today = tasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED" &&
        t.dueDate &&
        isToday(new Date(t.dueDate)),
    );
    const upcoming = tasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.status !== "CANCELLED" &&
        t.dueDate &&
        !isPast(new Date(t.dueDate)) &&
        !isToday(new Date(t.dueDate)),
    );
    const completed = tasks.filter((t) => t.status === "COMPLETED");
    return { overdue, today, upcoming, completed };
  }, [tasks]);

  const getDueDateLabel = (task) => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    if (isToday(date)) return { label: "Today", color: "text-blue-600" };
    if (isTomorrow(date)) return { label: "Tomorrow", color: "text-amber-600" };
    if (isPast(date)) return { label: "Overdue", color: "text-rose-600" };
    return { label: format(date, "MMM d"), color: "text-slate-500" };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-indigo-600" />
            Tasks & Reminders
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Manage your work schedule
          </p>
        </div>
        <Button
          onClick={() => setShowFormModal({ isOpen: true, initialData: null })}
        >
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50/50">
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Overdue
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.overdue || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Due Today
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.dueToday || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Play className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              In Progress
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.inProgress || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Completed
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.completed || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-0 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-300 transition-all">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search tasks..."
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base !py-2 !text-xs"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-base !py-2 !text-xs"
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-auto p-6 pt-0">
        <div className="space-y-6">
          {/* Overdue Section */}
          {groupedTasks.overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Overdue (
                {groupedTasks.overdue.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.overdue.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() =>
                      setShowFormModal({ isOpen: true, initialData: task })
                    }
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: task.id, status })
                    }
                    onDelete={() => deleteMutation.mutate(task.id)}
                    getDueDateLabel={getDueDateLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {groupedTasks.today.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Due Today (
                {groupedTasks.today.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.today.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() =>
                      setShowFormModal({ isOpen: true, initialData: task })
                    }
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: task.id, status })
                    }
                    onDelete={() => deleteMutation.mutate(task.id)}
                    getDueDateLabel={getDueDateLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {groupedTasks.upcoming.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming (
                {groupedTasks.upcoming.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.upcoming.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() =>
                      setShowFormModal({ isOpen: true, initialData: task })
                    }
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: task.id, status })
                    }
                    onDelete={() => deleteMutation.mutate(task.id)}
                    getDueDateLabel={getDueDateLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {groupedTasks.completed.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Completed (
                {groupedTasks.completed.length})
              </h3>
              <div className="space-y-2">
                {groupedTasks.completed.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() =>
                      setShowFormModal({ isOpen: true, initialData: task })
                    }
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: task.id, status })
                    }
                    onDelete={() => deleteMutation.mutate(task.id)}
                    getDueDateLabel={getDueDateLabel}
                    isCompleted
                  />
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">No tasks found</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() =>
                  setShowFormModal({ isOpen: true, initialData: null })
                }
              >
                Create your first task
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={showFormModal.isOpen}
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })}
        initialData={showFormModal.initialData}
        businessId={currentBusiness?.id}
      />
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onDelete,
  getDueDateLabel,
  isCompleted,
}) {
  const dueInfo = getDueDateLabel(task);
  const StatusIcon = STATUS_ICON[task.status] || Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border p-4 hover:shadow-lg transition-all group",
        task.status === "OVERDUE" ? "border-rose-200" : "border-slate-100",
        isCompleted && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() =>
            onStatusChange(
              task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
            )
          }
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
            task.status === "COMPLETED"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-slate-300 hover:border-indigo-500",
          )}
        >
          {task.status === "COMPLETED" && <CheckCircle className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className={cn(
                  "font-bold text-slate-900",
                  task.status === "COMPLETED" && "line-through",
                )}
              >
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase",
                  PRIORITY_COLORS[task.priority],
                )}
              >
                {task.priority}
              </span>
              <span
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1",
                  STATUS_COLORS[task.status],
                )}
              >
                <StatusIcon className="w-3 h-3" />{" "}
                {task.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3">
            {dueInfo && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-bold",
                  dueInfo.color,
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {dueInfo.label}
                {task.dueTime && (
                  <span className="text-slate-400">{task.dueTime}</span>
                )}
              </div>
            )}
            {task.category && (
              <span className="text-xs font-bold text-slate-400 uppercase">
                {task.category}
              </span>
            )}
            {task.party && (
              <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                <User className="w-3.5 h-3.5" />
                {task.party.name}
              </div>
            )}
            {task.assignedTo && (
              <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                <Bell className="w-3.5 h-3.5" />
                {task.assignedTo}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <Edit className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-rose-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TaskFormModal({ isOpen, onClose, initialData, businessId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    category: initialData?.category || "OTHER",
    priority: initialData?.priority || "MEDIUM",
    dueDate: initialData?.dueDate ? initialData.dueDate.split("T")[0] : "",
    dueTime: initialData?.dueTime || "",
    isRecurring: initialData?.isRecurring || false,
    recurrence: initialData?.recurrence || "",
    partyId: initialData?.partyId || "",
    assignedTo: initialData?.assignedTo || "",
  });

  const { data: partiesData } = useQuery({
    queryKey: ["parties", businessId],
    queryFn: () =>
      api.get(`/parties/business/${businessId}?limit=500`).then((r) => r.data),
    enabled: !!businessId && isOpen,
  });

  const parties = partiesData?.data || [];

  const mutation = useMutation({
    mutationFn: (data) => {
      if (initialData?.id) {
        return api.put(`/tasks/${initialData.id}`, data);
      }
      return api.post("/tasks", { ...data, businessId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      queryClient.invalidateQueries(["task-stats"]);
      toast.success(initialData ? "Task updated" : "Task created");
      onClose();
    },
    onError: () => toast.error("Failed to save task"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Task" : "New Task"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-base"
              placeholder="Task title"
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-base"
              placeholder="Task details..."
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="input-base"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="input-base"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Due Date
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              className="input-base"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Due Time
            </label>
            <input
              type="time"
              value={formData.dueTime}
              onChange={(e) =>
                setFormData({ ...formData, dueTime: e.target.value })
              }
              className="input-base"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Customer
            </label>
            <select
              value={formData.partyId}
              onChange={(e) =>
                setFormData({ ...formData, partyId: e.target.value })
              }
              className="input-base"
            >
              <option value="">Select customer</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Assigned To
            </label>
            <input
              type="text"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
              className="input-base"
              placeholder="Staff name"
            />
          </div>

          <div className="col-span-2 flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isRecurring}
                onChange={(e) =>
                  setFormData({ ...formData, isRecurring: e.target.checked })
                }
                className="w-4 h-4 rounded border-slate-300 text-indigo-600"
              />
              <span className="text-sm font-bold text-slate-600">
                Recurring task
              </span>
            </label>
            {formData.isRecurring && (
              <select
                value={formData.recurrence}
                onChange={(e) =>
                  setFormData({ ...formData, recurrence: e.target.value })
                }
                className="input-base !py-2"
              >
                <option value="">Select frequency</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving..."
              : initialData
                ? "Update"
                : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default Tasks;
