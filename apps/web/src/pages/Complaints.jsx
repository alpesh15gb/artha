import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit,
  Phone,
  Mail,
  User,
  Search,
  X,
  ArrowRight,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageCircle,
  Send,
  RotateCcw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
  OPEN: "bg-rose-100 text-rose-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PENDING: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-400",
};

const STATUS_OPTIONS = [
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "PENDING", label: "Pending" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
];

const PRIORITIES = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
  { id: "URGENT", label: "Urgent" },
];

function Complaints() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFormModal, setShowFormModal] = useState({
    isOpen: false,
    initialData: null,
  });
  const [showDetailModal, setShowDetailModal] = useState(null);

  const { data: statsData } = useQuery({
    queryKey: ["complaint-stats", currentBusiness?.id],
    queryFn: () =>
      api.get(`/complaints/stats/${currentBusiness?.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "complaints",
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
        .get(`/complaints/business/${currentBusiness?.id}?${params}`)
        .then((r) => r.data);
    },
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/complaints/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["complaints"]);
      toast.success("Complaint deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const complaints = data?.data || [];
  const stats = statsData?.data || {};

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-rose-500" />
            Complaints Tracker
          </h2>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Track and resolve customer issues
          </p>
        </div>
        <Button
          onClick={() => setShowFormModal({ isOpen: true, initialData: null })}
        >
          <Plus className="w-4 h-4 mr-2" /> Register Complaint
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-slate-50/50">
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Open</p>
            <p className="text-xl font-black text-slate-900">
              {stats.open || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
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
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Pending
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.resolved || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Resolved
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.resolved || 0}
            </p>
          </div>
        </Card>
        <Card className="!p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">
              Critical
            </p>
            <p className="text-xl font-black text-slate-900">
              {stats.critical || 0}
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
            placeholder="Search complaints..."
            aria-label="Search complaints"
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
            {STATUS_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-base !py-2 !text-xs"
          >
            <option value="">All Priority</option>
            {PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="flex-1 overflow-auto p-6 pt-0">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Customer</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th className="!pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((complaint) => (
                <motion.tr
                  key={complaint.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setShowDetailModal(complaint)}
                >
                  <td className="!pl-8">
                    <div>
                      <p className="font-bold text-slate-900">
                        {complaint.title}
                      </p>
                      <p className="text-xs text-slate-400 line-clamp-1 max-w-xs">
                        {complaint.description}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-bold text-slate-900">
                        {complaint.customerName}
                      </p>
                      {complaint.customerPhone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />{" "}
                          {complaint.customerPhone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase",
                        PRIORITY_COLORS[complaint.priority],
                      )}
                    >
                      {complaint.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase",
                        STATUS_COLORS[complaint.status],
                      )}
                    >
                      {complaint.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm font-bold text-slate-500">
                      {formatDistanceToNow(new Date(complaint.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </td>
                  <td className="!pr-8">
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setShowFormModal({
                            isOpen: true,
                            initialData: complaint,
                          })
                        }
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(complaint.id)}
                        className="p-2 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {complaints.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">
                No complaints found
              </p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() =>
                  setShowFormModal({ isOpen: true, initialData: null })
                }
              >
                Register first complaint
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Complaint Form Modal */}
      <ComplaintFormModal
        isOpen={showFormModal.isOpen}
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })}
        initialData={showFormModal.initialData}
        businessId={currentBusiness?.id}
      />

      {/* Complaint Detail Modal */}
      <ComplaintDetailModal
        complaint={showDetailModal}
        onClose={() => setShowDetailModal(null)}
        businessId={currentBusiness?.id}
      />
    </div>
  );
}

function ComplaintFormModal({ isOpen, onClose, initialData, businessId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    customerName: initialData?.customerName || "",
    customerPhone: initialData?.customerPhone || "",
    customerEmail: initialData?.customerEmail || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "MEDIUM",
    partyId: initialData?.partyId || "",
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
        return api.put(`/complaints/${initialData.id}`, data);
      }
      return api.post("/complaints", { ...data, businessId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["complaints"]);
      queryClient.invalidateQueries(["complaint-stats"]);
      toast.success(initialData ? "Complaint updated" : "Complaint registered");
      onClose();
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Complaint" : "Register Complaint"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              className="input-base"
              placeholder="Customer name"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Phone
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) =>
                setFormData({ ...formData, customerPhone: e.target.value })
              }
              className="input-base"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Email
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) =>
                setFormData({ ...formData, customerEmail: e.target.value })
              }
              className="input-base"
              placeholder="Email address"
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">
              Issue Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-base"
              placeholder="Brief issue description"
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-black text-slate-400 uppercase">
              Description *
            </label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-base"
              placeholder="Detailed description of the issue..."
            />
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
              Link to Customer
            </label>
            <select
              value={formData.partyId}
              onChange={(e) =>
                setFormData({ ...formData, partyId: e.target.value })
              }
              className="input-base"
            >
              <option value="">Select from parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
                : "Register"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ComplaintDetailModal({ complaint, onClose, businessId }) {
  const queryClient = useQueryClient();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const { data: detailData, isLoading } = useQuery({
    queryKey: ["complaint", complaint?.id],
    queryFn: () => api.get(`/complaints/${complaint?.id}`).then((r) => r.data),
    enabled: !!complaint?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }) =>
      api.patch(`/complaints/${id}/status`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries(["complaints"]);
      queryClient.invalidateQueries(["complaint"]);
      queryClient.invalidateQueries(["complaint-stats"]);
      toast.success("Status updated");
      setShowStatusModal(false);
    },
    onError: () => toast.error("Failed to update"),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }) =>
      api.post(`/complaints/${id}/resolve`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries(["complaints"]);
      queryClient.invalidateQueries(["complaint"]);
      queryClient.invalidateQueries(["complaint-stats"]);
      toast.success("Complaint resolved");
      setShowResolveModal(false);
      onClose();
    },
    onError: () => toast.error("Failed to resolve"),
  });

  const createTaskMutation = useMutation({
    mutationFn: (id) => api.post(`/complaints/${id}/convert-to-task`),
    onSuccess: () => {
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task created from complaint");
      setShowStatusModal(false);
    },
    onError: () => toast.error("Failed to create task"),
  });

  if (!complaint) return null;

  const detail = detailData?.data;

  return (
    <Modal
      isOpen={!!complaint}
      onClose={onClose}
      title="Complaint Details"
      size="xl"
    >
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {complaint.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {complaint.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase",
                  PRIORITY_COLORS[complaint.priority],
                )}
              >
                {complaint.priority}
              </span>
              <span
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase",
                  STATUS_COLORS[complaint.status],
                )}
              >
                {complaint.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="p-4 bg-slate-50 rounded-xl">
            <h4 className="text-xs font-black text-slate-400 uppercase mb-3">
              Customer Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-slate-700">
                  {complaint.customerName}
                </span>
              </div>
              {complaint.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">
                    {complaint.customerPhone}
                  </span>
                </div>
              )}
              {complaint.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">
                    {complaint.customerEmail}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase mb-3">
              Timeline
            </h4>
            <div className="space-y-3">
              {detail?.timeline?.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {item.fromStatus} → {item.toStatus}
                    </p>
                    {item.note && (
                      <p className="text-xs text-slate-500">{item.note}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {format(new Date(item.createdAt), "PPp")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolutions */}
          {detail?.resolutions?.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase mb-3">
                Resolutions
              </h4>
              <div className="space-y-2">
                {detail.resolutions.map((res, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-bold text-slate-700">
                      {res.note}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(res.createdAt), "PPp")}
                      {res.resolvedBy && ` • By ${res.resolvedBy}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <Button onClick={() => setShowStatusModal(true)}>
              Update Status
            </Button>
            {complaint.status !== "RESOLVED" &&
              complaint.status !== "CLOSED" && (
                <Button
                  variant="secondary"
                  onClick={() => setShowResolveModal(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
                </Button>
              )}
            <Button
              variant="secondary"
              onClick={() => createTaskMutation.mutate(complaint.id)}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Convert to Task
            </Button>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Status"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateStatusMutation.mutate({
              id: complaint.id,
              status: newStatus,
              note: statusNote,
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="input-base"
              required
            >
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="input-base"
              placeholder="Add a note..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowStatusModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update</Button>
          </div>
        </form>
      </Modal>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Mark as Resolved"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const note = e.target.note.value;
            resolveMutation.mutate({ id: complaint.id, note });
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">
              Resolution Note
            </label>
            <textarea
              name="note"
              rows={3}
              required
              className="input-base"
              placeholder="How was this issue resolved?"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResolveModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Resolve</Button>
          </div>
        </form>
      </Modal>
    </Modal>
  );
}

export default Complaints;
