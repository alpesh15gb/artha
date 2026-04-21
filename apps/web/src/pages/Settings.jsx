import { useState, useEffect } from "react";
import { useBusinessStore } from "../store/auth";
import api from "../services/api";
import {
  Card,
  Button,
  Input,
  Select,
  Toggle,
  Modal,
  Badge,
  cn,
} from "../components/ui";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Building2,
  FileText,
  Landmark,
  Bell,
  Mail,
  Palette,
  Globe,
  Shield,
  Database,
  Download,
  Plus,
  Trash2,
  Edit,
  ChevronRight,
  Check,
  X,
  FileSpreadsheet,
  Receipt,
  Calculator,
  Users,
  Clock,
  CreditCard,
  Key,
  Zap,
  MapPin,
  Globe2,
  Fingerprint,
  ShieldCheck,
  Activity,
  Camera,
  Briefcase,
  Info,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  InvoiceTemplate1,
  InvoiceTemplate2,
  InvoiceTemplate3,
} from "../components/invoices";

const SETTINGS_SECTIONS = [
  {
    id: "core",
    label: "Foundation",
    items: [
      { id: "business", label: "Company Profile", icon: Building2 },
      { id: "gst", label: "GST & Statutory", icon: ShieldCheck },
      { id: "banking", label: "Banking & UPI", icon: Landmark },
    ],
  },
  {
    id: "workflow",
    label: "Operations",
    items: [
      { id: "templates", label: "Document Design", icon: Palette },
      { id: "numbering", label: "Series Config", icon: Calculator },
      { id: "invoice", label: "Biller Defaults", icon: Receipt },
    ],
  },
  {
    id: "advanced",
    label: "Workspace",
    items: [
      { id: "accounts", label: "General Ledger", icon: FileSpreadsheet },
      { id: "fiscal-year", label: "Fiscal Year", icon: Clock },
      { id: "tax-rates", label: "Tax Protocols", icon: Zap },
      { id: "notifications", label: "Alert Center", icon: Bell },
      { id: "security", label: "Audit & Access", icon: Fingerprint },
      { id: "data", label: "Data Governance", icon: Database },
    ],
  },
];

function Settings() {
  const { currentBusiness, fetchBusinesses } = useBusinessStore();
  const [activeTab, setActiveTab] = useState("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [taxRates, setTaxRates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [showClosingWizard, setShowClosingWizard] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");

  const businessId = currentBusiness?.id;

  useEffect(() => {
    if (businessId) loadSettings();
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, taxRes, accountsRes] = await Promise.all([
        api.get(`/settings/${businessId}`),
        api.get(`/settings/${businessId}/tax-rates`),
        api.get(`/settings/${businessId}/accounts`),
      ]);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
      if (taxRes.data.success) setTaxRates(taxRes.data.data);
      if (accountsRes.data.success) setAccounts(accountsRes.data.data);
    } catch (error) {
      toast.error("Sync failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGstLookup = async () => {
    const gstin = settings?.gstin;
    if (!gstin || gstin.length < 15)
      return toast.error("15-Digit GSTIN Required");
    setIsFetchingGst(true);
    try {
      const { data } = await api.get(`/utils/gst-lookup/${gstin}`);
      if (data.data) {
        toast.success("Identity Refined");
        const d = data.data;
        setSettings({
          ...settings,
          name: d.tradeName || d.legalName,
          legalName: d.legalName,
          address: {
            ...settings.address,
            street:
              `${d.address.buildingName || ""} ${d.address.street || ""}`.trim(),
            city: d.address.city,
            state: d.address.state,
            zip: d.address.pincode,
          },
        });
      }
    } catch (e) {
      toast.error("Check GSTIN format");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      const res = await api.put(`/settings/${businessId}`, payload || settings);
      if (res.data.success) {
        setSettings(res.data.data);
        toast.success("Intelligence Synced");
      }
    } catch (e) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Hydrating Config
        </p>
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 -m-8">
      {/* ── Sub Header ── */}
      <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            System Configuration
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Workspace & Compliance tuning
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="btn-primary !px-8 !rounded-xl !py-2.5"
        >
          {saving ? "SAVING..." : "SAVE CHANGES"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar Nav ── */}
        <aside className="w-72 border-r border-slate-200 bg-white p-6 space-y-8 overflow-y-auto no-scrollbar">
          {SETTINGS_SECTIONS.map((section) => (
            <div key={section.id} className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                {section.label}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group",
                      activeTab === item.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Content Area ── */}
        <main className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-4xl mx-auto space-y-10 pb-20"
            >
              {/* ── Section: Business Profile ────────────────────── */}
              {activeTab === "business" && (
                <div className="space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 bg-white shadow-sm">
                        {currentBusiness?.logo ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || ""}${currentBusiness.logo}`}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Camera className="w-8 h-8 text-slate-200" />
                        )}
                        <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                          <input
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files[0];
                              if (f) {
                                const fd = new FormData();
                                fd.append("logo", f);
                                api
                                  .post(`/businesses/${businessId}/logo`, fd)
                                  .then(() => {
                                    toast.success("Brand Assets Sync");
                                    fetchBusinesses();
                                  });
                              }
                            }}
                          />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            Update
                          </span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        Identity & Presence
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Manage your public brand assets
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Legal Entity Name
                      </label>
                      <input
                        className="input-base"
                        name="name"
                        id="name"
                        value={settings?.name || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        GSTIN Identifier
                      </label>
                      <div className="relative">
                        <input
                          className="input-base pr-20"
                          name="gstin"
                          id="gstin"
                          value={settings?.gstin || ""}
                          onChange={(e) =>
                            setSettings({ ...settings, gstin: e.target.value })
                          }
                        />
                        <button
                          onClick={handleGstLookup}
                          className="absolute right-2 top-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          REFRESH
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Trade Label (DBA)
                      </label>
                      <input
                        className="input-base"
                        name="legalName"
                        id="legalName"
                        value={settings?.legalName || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            legalName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        PAN / Tax ID
                      </label>
                      <input
                        className="input-base"
                        name="pan"
                        id="pan"
                        value={settings?.pan || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, pan: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                        Operational Headquarters
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Full Registered Address
                        </label>
                        <input
                          className="input-base"
                          name="street"
                          id="street"
                          value={settings?.address?.street || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              address: {
                                ...settings.address,
                                street: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          City
                        </label>
                        <input
                          className="input-base"
                          name="city"
                          id="city"
                          value={settings?.address?.city || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              address: {
                                ...settings.address,
                                city: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          State / Region
                        </label>
                        <input
                          className="input-base"
                          name="state"
                          id="state"
                          value={settings?.address?.state || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              address: {
                                ...settings.address,
                                state: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Contact Phone
                      </label>
                      <input
                        className="input-base"
                        name="phone"
                        id="phone"
                        value={settings?.phone || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Support Email
                      </label>
                      <input
                        className="input-base"
                        name="email"
                        id="email"
                        value={settings?.email || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: Document Templates ─────────────────── */}
              {activeTab === "templates" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Document Visuals
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Personalize the exterior of your brand
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      {
                        id: "modern",
                        name: "Premium High-Contrast",
                        Component: InvoiceTemplate1,
                      },
                      {
                        id: "classic",
                        name: "Professional Standard",
                        Component: InvoiceTemplate2,
                      },
                      {
                        id: "minimal",
                        name: "Ultra-Light Clean",
                        Component: InvoiceTemplate3,
                      },
                    ].map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() =>
                          setSettings({ ...settings, invoiceTemplate: tpl.id })
                        }
                        className={cn(
                          "group cursor-pointer rounded-[2rem] border-2 p-5 transition-all duration-500",
                          settings?.invoiceTemplate === tpl.id
                            ? "border-indigo-600 bg-indigo-50/30"
                            : "border-slate-100 bg-white hover:border-slate-300",
                        )}
                      >
                        <div className="aspect-[1/1.4] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-4 relative scale-[0.25] origin-top translate-y-8 -mb-40">
                          <div className="absolute inset-0 z-20" />
                          <div className="w-[1000px] pointer-events-none origin-top-left scale-[0.82]">
                            <tpl.Component
                              business={{
                                name: settings?.name || "BUSINESS NAME",
                                address: "Mumbai, MH",
                                gstin: "27AAAAA0000A1Z5",
                              }}
                              party={{
                                name: "Sample Client",
                                address: "Bangalore, KA",
                              }}
                              invoice={{
                                invoiceNumber: "INV-101",
                                date: new Date(),
                                dueDate: new Date(),
                              }}
                              items={[
                                {
                                  description: "Service Item One",
                                  rate: 1500,
                                  quantity: 2,
                                  taxRate: 18,
                                },
                              ]}
                              totals={{
                                total: 3540,
                                subtotal: 3000,
                                cgst: 270,
                                sgst: 270,
                                igst: 0,
                                discountAmount: 0,
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-center pt-5">
                          <p
                            className={cn(
                              "text-xs font-black uppercase tracking-widest",
                              settings?.invoiceTemplate === tpl.id
                                ? "text-indigo-600"
                                : "text-slate-900",
                            )}
                          >
                            {tpl.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Accent Brand Color
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          className="w-14 h-14 rounded-2xl border-none cursor-pointer bg-transparent"
                          name="themeColor"
                          id="themeColor"
                          value={settings?.themeColor || "#4f46e5"}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              themeColor: e.target.value,
                            })
                          }
                        />
                        <input
                          className="input-base font-mono uppercase"
                          name="themeColor"
                          id="themeColor"
                          value={settings?.themeColor || "#4f46e5"}
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Document Typography
                      </label>
                      <select
                        className="input-base font-bold"
                        name="fontFamily"
                        id="fontFamily"
                        value={settings?.fontFamily || "Plus Jakarta Sans"}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            fontFamily: e.target.value,
                          })
                        }
                      >
                        <option>Plus Jakarta Sans</option>
                        <option>Inter</option>
                        <option>Roboto</option>
                        <option>Outfit</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: GST & Statutory ─────────────────── */}
              {activeTab === "gst" && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        Statutory Compliance
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        GST regime and tax behavior tuning
                      </p>
                    </div>
                    <Toggle
                      checked={settings?.enableGst ?? true}
                      onChange={(val) =>
                        setSettings({
                          ...settings,
                          enableGst: val,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Registration Schema
                      </label>
                      <select
                        className="input-base font-bold"
                        name="gstRegistrationType"
                        id="gstRegistrationType"
                        value={settings?.gstRegistrationType || "REGULAR"}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gstRegistrationType: e.target.value,
                          })
                        }
                      >
                        <option value="REGULAR">Regular GST-Registered</option>
                        <option value="COMPOSITION">Composition Scheme</option>
                        <option value="NON_REG">Non-Registered Entity</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Default HSN Classification
                      </label>
                      <input
                        className="input-base"
                        name="defaultHsnCode"
                        id="defaultHsnCode"
                        value={settings?.defaultHsnCode || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultHsnCode: e.target.value,
                          })
                        }
                        placeholder="998311"
                      />
                    </div>
                  </div>

                  <div className="p-8 bg-indigo-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden ring-4 ring-indigo-50 border-none">
                    <Shield className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
                    <div className="relative z-10 grid grid-cols-3 gap-8 text-center">
                      <div>
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-3">
                          Live CGST Protocol
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            name="cgstRate"
                            id="cgstRate"
                            className="w-16 bg-white/10 border-none text-center rounded-xl py-1 text-xl font-black"
                            value={settings?.cgstRate || 9}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                cgstRate: parseFloat(e.target.value),
                              })
                            }
                          />
                          <span className="text-xl font-black opacity-30">
                            %
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-3">
                          Live SGST Protocol
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            name="sgstRate"
                            id="sgstRate"
                            className="w-16 bg-white/10 border-none text-center rounded-xl py-1 text-xl font-black"
                            value={settings?.sgstRate || 9}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                sgstRate: parseFloat(e.target.value),
                              })
                            }
                          />
                          <span className="text-xl font-black opacity-30">
                            %
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-3">
                          Live IGST Protocol
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            name="igstRate"
                            id="igstRate"
                            className="w-16 bg-white/10 border-none text-center rounded-xl py-1 text-xl font-black"
                            value={settings?.igstRate || 18}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                igstRate: parseFloat(e.target.value),
                              })
                            }
                          />
                          <span className="text-xl font-black opacity-30">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: Banking & UPI ─────────────────── */}
              {activeTab === "banking" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Payment Infrastructure
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Configure your financial accounts and digital payment
                      channels
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Primary Bank Account
                      </label>
                      <select
                        className="input-base font-bold"
                        name="defaultBankAccountId"
                        id="defaultBankAccountId"
                        value={settings?.defaultBankAccountId || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultBankAccountId: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Bank Account</option>
                        {accounts
                          .filter((a) => a.type === "BANK")
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Cash Account
                      </label>
                      <select
                        className="input-base font-bold"
                        name="defaultCashAccountId"
                        id="defaultCashAccountId"
                        value={settings?.defaultCashAccountId || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultCashAccountId: e.target.value,
                          })
                        }
                      >
                        <option value="">Select Cash Account</option>
                        {accounts
                          .filter((a) => a.type === "CASH")
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        UPI Payment ID (Optional)
                      </label>
                      <input
                        className="input-base"
                        name="upiId"
                        id="upiId"
                        placeholder="business@upi"
                        value={settings?.upiId || ""}
                        onChange={(e) =>
                          setSettings({ ...settings, upiId: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Banking Settings
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Section: Series Config ─────────────────── */}
              {activeTab === "numbering" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Document Sequencing
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Configure prefixes and numbering patterns for invoices,
                      estimates, and purchases
                    </p>
                  </div>

                  <div className="space-y-6">
                    {[
                      {
                        key: "invoicePrefix",
                        label: "Invoice Prefix",
                        default: "INV",
                      },
                      {
                        key: "estimatePrefix",
                        label: "Estimate Prefix",
                        default: "EST",
                      },
                      {
                        key: "purchasePrefix",
                        label: "Purchase Prefix",
                        default: "PO",
                      },
                      {
                        key: "paymentPrefix",
                        label: "Payment Receipt Prefix",
                        default: "RCP",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="grid grid-cols-3 gap-4 items-center"
                      >
                        <label className="text-xs font-black text-slate-500 uppercase">
                          {item.label}
                        </label>
                        <input
                          className="input-base"
                          name={item.key}
                          id={item.key}
                          value={settings?.[item.key] || item.default}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [item.key]: e.target.value,
                            })
                          }
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            Starting No:
                          </span>
                          <input
                            type="number"
                            className="input-base !w-20"
                            name={`${item.key}Start`}
                            id={`${item.key}Start`}
                            value={settings?.[`${item.key}Start`] || 1}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                [`${item.key}Start`]: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Numbering Config
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Section: Biller Defaults ─────────────────── */}
              {activeTab === "invoice" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Transaction Defaults
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Set default values for new invoices and transactions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Default Payment Terms (Days)
                      </label>
                      <input
                        type="number"
                        className="input-base"
                        name="defaultPaymentTerms"
                        id="defaultPaymentTerms"
                        value={settings?.defaultPaymentTerms || 30}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultPaymentTerms: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Default Tax Preference
                      </label>
                      <select
                        className="input-base font-bold"
                        name="defaultTaxPreference"
                        id="defaultTaxPreference"
                        value={
                          settings?.defaultTaxPreference || "GST_INCLUSIVE"
                        }
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultTaxPreference: e.target.value,
                          })
                        }
                      >
                        <option value="GST_INCLUSIVE">GST Inclusive</option>
                        <option value="GST_EXCLUSIVE">GST Exclusive</option>
                        <option value="NO_TAX">No Tax</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Default HSN Code
                      </label>
                      <input
                        className="input-base"
                        name="defaultHsnCode"
                        id="defaultHsnCode"
                        placeholder="9971 (Services)"
                        value={settings?.defaultHsnCode || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            defaultHsnCode: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Round Off Method
                      </label>
                      <select
                        className="input-base font-bold"
                        name="roundOffMethod"
                        id="roundOffMethod"
                        value={settings?.roundOffMethod || "RUPEE"}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            roundOffMethod: e.target.value,
                          })
                        }
                      >
                        <option value="RUPEE">Round to Nearest Rupee</option>
                        <option value="POISA">Round to Nearest Paisa</option>
                        <option value="NONE">No Rounding</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Defaults
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Section: General Ledger ─────────────────── */}
              {activeTab === "accounts" && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        Chart of Accounts
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Manage your account ledger structure
                      </p>
                    </div>
                    <Button onClick={() => setShowAccountModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Account
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Account Name</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((acc) => (
                          <tr key={acc.id}>
                            <td className="font-bold">{acc.name}</td>
                            <td>
                              <span className="pill-default">{acc.type}</span>
                            </td>
                            <td>{acc.category || "-"}</td>
                            <td className="font-mono">
                              ₹{(acc.balance || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {accounts.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-8 text-slate-400"
                            >
                              No accounts configured. Add your first account to
                              get started.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Section: Tax Protocols ─────────────────── */}
              {activeTab === "tax-rates" && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        Tax Rate Configuration
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Manage GST and other tax rates
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingTax(null);
                        setShowTaxModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tax Rate
                    </Button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tax Name</th>
                          <th>Rate (%)</th>
                          <th>Type</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxRates.map((tax) => (
                          <tr key={tax.id}>
                            <td className="font-bold">{tax.name}</td>
                            <td>{tax.rate}%</td>
                            <td>
                              <span className="pill-default">{tax.type}</span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingTax(tax);
                                    setShowTaxModal(true);
                                  }}
                                  className="p-2 hover:bg-slate-100 rounded-lg"
                                >
                                  <Edit className="w-4 h-4 text-slate-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {taxRates.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-8 text-slate-400"
                            >
                              No tax rates configured.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Tax Rate Defaults */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-[9px] font-black text-amber-600 uppercase">
                        CGST
                      </p>
                      <input
                        type="number"
                        className="w-full bg-transparent text-2xl font-black text-amber-900 mt-2"
                        value={settings?.cgstRate || 9}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            cgstRate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <p className="text-[9px] font-black text-amber-600 uppercase">
                        SGST
                      </p>
                      <input
                        type="number"
                        className="w-full bg-transparent text-2xl font-black text-amber-900 mt-2"
                        value={settings?.sgstRate || 9}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            sgstRate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="p-4 bg-rose-50 rounded-xl">
                      <p className="text-[9px] font-black text-rose-600 uppercase">
                        IGST
                      </p>
                      <input
                        type="number"
                        className="w-full bg-transparent text-2xl font-black text-rose-900 mt-2"
                        value={settings?.igstRate || 18}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            igstRate: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section: Alert Center ─────────────────── */}
              {activeTab === "notifications" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Notification Preferences
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Configure how you receive alerts and reminders
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        id: "emailInvoice",
                        label: "Invoice sent notifications",
                        default: true,
                      },
                      {
                        id: "emailPayment",
                        label: "Payment received alerts",
                        default: true,
                      },
                      {
                        id: "emailReminder",
                        label: "Due date reminders",
                        default: true,
                      },
                      {
                        id: "emailWeekly",
                        label: "Weekly summary report",
                        default: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100"
                      >
                        <span className="text-sm font-bold text-slate-700">
                          {item.label}
                        </span>
                        <Toggle
                          checked={settings?.[item.id] ?? item.default}
                          onChange={(val) =>
                            setSettings({
                              ...settings,
                              [item.id]: val,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Notifications
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Section: Audit & Access ─────────────────── */}
              {activeTab === "security" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Security & Audit
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Configure access controls and audit logging
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-black text-slate-900">
                          Two-Factor Authentication
                        </h3>
                      </div>
                      <Toggle
                        checked={settings?.twoFactorEnabled || false}
                        onChange={(val) =>
                          setSettings({
                            ...settings,
                            twoFactorEnabled: val,
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Require 2FA for all users
                      </p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-black text-slate-900">
                          Audit Logging
                        </h3>
                      </div>
                      <Toggle
                        checked={settings?.auditLogging ?? true}
                        onChange={(val) =>
                          setSettings({
                            ...settings,
                            auditLogging: val,
                          })
                        }
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Track all user activities
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      className="input-base w-32"
                      name="sessionTimeout"
                      id="sessionTimeout"
                      value={settings?.sessionTimeout || 30}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sessionTimeout: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Section: Data Governance ─────────────────── */}
              {activeTab === "data" && (
                <div className="space-y-10">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-none">
                      Data Management
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                      Configure data retention and export policies
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Data Retention Period (Years)
                      </label>
                      <select
                        className="input-base font-bold"
                        name="retentionYears"
                        id="retentionYears"
                        value={settings?.retentionYears || 7}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            retentionYears: parseInt(e.target.value),
                          })
                        }
                      >
                        <option value={1}>1 Year</option>
                        <option value={3}>3 Years</option>
                        <option value={5}>5 Years</option>
                        <option value={7}>7 Years</option>
                        <option value={10}>10 Years</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Auto-Backup Frequency
                      </label>
                      <select
                        className="input-base font-bold"
                        name="backupFrequency"
                        id="backupFrequency"
                        value={settings?.backupFrequency || "DAILY"}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            backupFrequency: e.target.value,
                          })
                        }
                      >
                        <option value="HOURLY">Hourly</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        window.open(`${import.meta.env.VITE_API_URL || ""}/api/settings/${businessId}/export?format=json`, '_blank');
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All Data
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={async () => {
                        toast.promise(
                          api.post(`/settings/${businessId}/backup`),
                          {
                            loading: 'Archiving Workspace...',
                            success: 'Vault Synced Successfully',
                            error: 'Archive Failed',
                          }
                        );
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Backup Now
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => handleSave()}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Data Settings
                    </Button>
                  </div>

                  <div className="mt-12 pt-8 border-t border-rose-100">
                    <div className="bg-rose-50 rounded-[2.5rem] p-8 border border-rose-100 flex flex-col md:flex-row items-center gap-8">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                        <Trash2 className="w-8 h-8" />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Danger Zone: Workspace Purge</h3>
                        <p className="text-xs font-medium text-rose-600 mt-1 opacity-80">
                          Permanently delete all financial records, items, parties and bank accounts. This action is IRREVOCABLE.
                        </p>
                      </div>
                      <Button 
                        variant="ghost"
                        onClick={() => setShowPurgeModal(true)}
                        className="!bg-rose-600 !text-white hover:!bg-rose-700 !rounded-xl !font-black !text-[10px] uppercase tracking-widest !px-8 shadow-lg shadow-rose-600/20"
                      >
                        Purge All Data
                      </Button>
                    </div>
                  </div>

                  <Modal
                    isOpen={showPurgeModal}
                    onClose={() => {
                      setShowPurgeModal(false);
                      setPurgeConfirmText("");
                    }}
                    title="Critical Account Security: Data Purge"
                  >
                    <div className="space-y-6">
                      <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
                        <div className="flex items-center gap-3 mb-2 text-rose-600">
                          <AlertCircle className="w-5 h-5" />
                          <h4 className="text-sm font-black uppercase tracking-tight">Destructive Action Protocol</h4>
                        </div>
                        <p className="text-xs font-semibold text-rose-800 leading-relaxed">
                          This will erase all Invoices, Purchases, Items, Parties, Estimates and Bank records for this business. This cannot be undone.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Type <span className="text-rose-600 font-black">PURGE</span> to confirm
                        </label>
                        <input 
                          type="text" 
                          className="input-base border-rose-200 focus:ring-rose-500" 
                          placeholder="PURGE"
                          value={purgeConfirmText}
                          onChange={(e) => setPurgeConfirmText(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => {
                            setShowPurgeModal(false);
                            setPurgeConfirmText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          disabled={purgeConfirmText !== 'PURGE'}
                          onClick={async () => {
                            toast.promise(
                              api.post('/import/purge', { businessId }),
                              {
                                loading: 'Purging Workspace...',
                                success: () => {
                                  setShowPurgeModal(false);
                                  setPurgeConfirmText("");
                                  loadSettings();
                                  return 'Workspace Reset Successfully';
                                },
                                error: 'Purge Failed',
                              }
                            );
                          }}
                          className="!bg-rose-600 !text-white hover:!bg-rose-700 disabled:!bg-slate-200 disabled:!text-slate-400"
                        >
                          Confirm Final Purge
                        </Button>
                      </div>
                    </div>
                  </Modal>
                </div>
              )}

              {/* ── Section: Fiscal Year & Locking ─────────────────── */}
              {activeTab === "fiscal-year" && (
                <div className="space-y-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 leading-none">
                        Fiscal Year & Locking
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                        Manage financial periods and lock transactions for closed years
                      </p>
                    </div>
                    <Badge variant={settings?.enableFinancialLock ? "danger" : "default"}>
                      {settings?.enableFinancialLock ? "BOOKS LOCKED" : "BOOKS OPEN"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ring-1 ring-slate-100 p-8 rounded-[2.5rem] bg-slate-50/50">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Fiscal Year Start
                      </label>
                      <select
                        className="input-base font-bold"
                        value={settings?.financialYearStart || "04-01"}
                        onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })}
                      >
                        <option value="04-01">April 1st (Standard India)</option>
                        <option value="01-01">January 1st (Calendar Year)</option>
                        <option value="07-01">July 1st</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Transaction Lock Status
                      </label>
                      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600">Enable Closing Lock</span>
                        <Toggle 
                          checked={settings?.enableFinancialLock || false} 
                          onChange={(val) => setSettings({ ...settings, enableFinancialLock: val })} 
                        />
                      </div>
                    </div>

                    {settings?.enableFinancialLock && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-2 space-y-4 p-6 bg-rose-50 rounded-3xl border border-rose-100"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <ShieldCheck className="w-5 h-5 text-rose-600" />
                          <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Security Lock Protocol</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                              Lock All Transactions On/Before
                            </label>
                            <input
                              type="date"
                              className="input-base border-rose-200 focus:ring-rose-500"
                              value={settings?.lockDate ? new Date(settings.lockDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setSettings({ ...settings, lockDate: e.target.value })}
                            />
                          </div>
                          <div className="flex items-end">
                            <p className="text-[10px] font-medium text-rose-600 leading-relaxed italic">
                              * Once locked, no transactions (Invoices, Expenses, Payments) can be created, edited, or deleted before this date. Only authorized personnel can unlock.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <Card className="bg-indigo-900 text-white border-none p-8 rounded-[2.5rem] overflow-hidden relative">
                    <Calculator className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 -rotate-12" />
                    <div className="relative z-10 space-y-4">
                      <h3 className="text-lg font-black uppercase tracking-tight">Perform Year-End Closing</h3>
                      <p className="text-xs font-medium text-indigo-100 max-w-xl opacity-80 leading-relaxed">
                        Ready to finalize your books for the current financial year? This will calculate your Retained Earnings and roll over balances to the next period.
                      </p>
                      <div className="pt-4 flex gap-4">
                        <Button 
                          className="bg-white text-indigo-900 hover:bg-slate-100 !rounded-xl !font-black !text-[10px] uppercase tracking-widest !px-6"
                          onClick={() => setShowClosingWizard(true)}
                        >
                          Run Closing Wizard
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => setActiveTab('accounts')}
                          className="text-white hover:bg-white/10 !rounded-xl !font-black !text-[10px] uppercase tracking-widest"
                        >
                          Review Balances
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Modal
                    isOpen={showClosingWizard}
                    onClose={() => setShowClosingWizard(false)}
                    title="Fiscal Year Closing Wizard"
                  >
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 italic font-bold text-slate-600 text-sm">
                        This process will finalize the financial records for the current year, calculate Net Profit/Loss, and enable the Transaction Lock automatically.
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"> Closing Date </label>
                          <input 
                            type="date" 
                            className="input-base" 
                            defaultValue="2024-03-31" 
                            id="closing-date-input"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setShowClosingWizard(false)}>Cancel</Button>
                        <Button onClick={async () => {
                          const endDate = document.getElementById('closing-date-input').value;
                          toast.promise(
                            api.post(`/settings/${businessId}/close-year`, { endDate }),
                            {
                              loading: 'Processing Closing Protocol...',
                              success: (res) => {
                                setShowClosingWizard(false);
                                loadSettings();
                                return `Year Closed. Profit: Rs.${res.data.data.netProfit.toLocaleString()}`;
                               },
                               error: 'Closing Failed',
                             }
                           );
                         }}>Finalize Closing</Button>
                      </div>
                    </div>
                  </Modal>

                  <div className="flex justify-end pt-6 border-t border-slate-100">
                    <Button onClick={() => handleSave()} className="!px-10">
                      <Save className="w-4 h-4 mr-2" />
                      Save Fiscal Protocol
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default Settings;
