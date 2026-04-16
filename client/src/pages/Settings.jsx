import { useState, useEffect } from 'react';
import { useBusinessStore } from '../store/auth';
import api from '../services/api';
import { Card, Button, Input, Select, Toggle, Modal, Table } from '../components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Building2, FileText, Landmark, Bell, Mail,
  Palette, Globe, Shield, Database, Download, Plus,
  Trash2, Edit, ChevronRight, Check, X, FileSpreadsheet,
  Receipt, Calculator, Users, Clock, CreditCard, Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import { InvoiceTemplate1, InvoiceTemplate2, InvoiceTemplate3 } from '../components/invoices';

function Settings() {
  const { currentBusiness, fetchBusinesses } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [taxRates, setTaxRates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const businessId = currentBusiness?.id;

  useEffect(() => {
    if (businessId) {
      loadSettings();
    }
  }, [businessId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [settingsRes, taxRes, accountsRes] = await Promise.all([
        api.get(`/settings/${businessId}`),
        api.get(`/settings/${businessId}/tax-rates`),
        api.get(`/settings/${businessId}/accounts`)
      ]);
      if (settingsRes.data.success) setSettings(settingsRes.data.data);
      if (taxRes.data.success) setTaxRates(taxRes.data.data);
      if (accountsRes.data.success) setAccounts(accountsRes.data.data);
    } catch (error) {
      console.error('Failed to load settings', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Building2 className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Please select or create a business to manage settings.</p>
        <Button onClick={() => setActiveTab('business')}>Go to Business Setup</Button>
      </div>
    );
  }

  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get(`/settings/${businessId}/audit-logs`);
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (error) {
      console.error('Failed to load audit logs', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSave = async (data) => {
    try {
      setSaving(true);
      const res = await api.put(`/settings/${businessId}`, data);
      if (res.data.success) {
        setSettings(res.data.data);
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTaxSave = async (taxData) => {
    try {
      if (editingTax) {
        const res = await api.put(`/settings/${businessId}/tax-rates/${editingTax.id}`, { ...taxData, isActive: true });
        if (res.data.success) {
          setTaxRates(prev => prev.map(t => t.id === editingTax.id ? res.data.data : t));
          toast.success('Tax rate updated');
        }
      } else {
        const res = await api.post(`/settings/${businessId}/tax-rates`, taxData);
        if (res.data.success) {
          setTaxRates(prev => [...prev, res.data.data]);
          toast.success('Tax rate created');
        }
      }
      setShowTaxModal(false);
      setEditingTax(null);
    } catch (error) {
      toast.error('Failed to save tax rate');
    }
  };

  const handleAccountSave = async (accountData) => {
    try {
      if (editingAccount) {
        const res = await api.put(`/settings/${businessId}/accounts/${editingAccount.id}`, { ...accountData, isActive: true });
        if (res.data.success) {
          setAccounts(prev => prev.map(a => a.id === editingAccount.id ? res.data.data : a));
          toast.success('Account updated');
        }
      } else {
        const res = await api.post(`/settings/${businessId}/accounts`, accountData);
        if (res.data.success) {
          setAccounts(prev => [...prev, res.data.data]);
          toast.success('Account created');
        }
      }
      setShowAccountModal(false);
      setEditingAccount(null);
    } catch (error) {
      toast.error('Failed to save account');
    }
  };

  const handleDeleteTax = async (id) => {
    if (!confirm('Are you sure you want to delete this tax rate?')) return;
    try {
      await api.delete(`/settings/${businessId}/tax-rates/${id}`);
      setTaxRates(prev => prev.filter(t => t.id !== id));
      toast.success('Tax rate deleted');
    } catch (error) {
      toast.error('Failed to delete tax rate');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/settings/${businessId}/accounts/${id}`);
      setAccounts(prev => prev.filter(a => a.id !== id));
      toast.success('Account deleted');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/settings/${businessId}/export?format=json`);
      if (res.data.success) {
        const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `artha-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'gst', label: 'GST & Tax', icon: FileText },
    { id: 'numbering', label: 'Numbering', icon: Calculator },
    { id: 'invoice', label: 'Invoice', icon: Receipt },
    { id: 'templates', label: 'Templates', icon: Palette },
    { id: 'banking', label: 'Banking', icon: Landmark },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'accounts', label: 'Chart of Accounts', icon: FileSpreadsheet },
    { id: 'tax-rates', label: 'Tax Rates', icon: Calculator },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data & Backup', icon: Database },
  ];

  const taxRateInitial = { name: '', rate: 0, cgstRate: 0, sgstRate: 0, igstRate: 0, cessRate: 0, hsnCode: '', description: '', isDefault: false };
  const accountInitial = { code: '', name: '', type: 'ASSET', subType: '', openingBalance: 0, isBankAccount: false, isCashAccount: false, bankName: '', accountNumber: '', ifscCode: '', description: '' };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your workspace and accounting preferences</p>
          </div>
          <Button icon={Save} onClick={() => handleSave(settings)} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="sticky top-4 space-y-1 bg-gray-50 rounded-2xl p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Card className="border-none shadow-xl shadow-gray-200/50">
            <AnimatePresence mode="wait">
              {activeTab === 'business' && (
                <motion.div key="business" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Business Information</h2>
                      <p className="text-sm text-gray-500">Your company details for invoices and documents</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl flex flex-col md:flex-row items-center gap-8 mb-8">
                     <div className="relative group">
                        <div className="w-32 h-32 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400">
                           {currentBusiness?.logo ? (
                              <img src={`${import.meta.env.VITE_API_URL || ''}${currentBusiness.logo}`} alt="Logo" className="w-full h-full object-contain" />
                           ) : (
                              <>
                                 <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Brand Logo</span>
                              </>
                           )}
                           <label className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <input 
                                 type="file" 
                                 accept="image/*"
                                 className="hidden" 
                                 onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                       const formData = new FormData();
                                       formData.append('logo', file);
                                       try {
                                          const res = await api.post(`/businesses/${businessId}/logo`, formData, {
                                             headers: {
                                                'Content-Type': undefined
                                             }
                                          });
                                          if (res.data.success) {
                                             toast.success('Logo updated');
                                             // Update local store state instead of reload
                                             const { setCurrentBusiness, currentBusiness: biz } = useBusinessStore.getState();
                                             setCurrentBusiness({ ...biz, logo: res.data.data.logo });
                                          }
                                       } catch (error) {
                                          toast.error('Logo upload failed');
                                       }
                                    }
                                 }}
                              />
                              <span className="text-white text-xs font-black uppercase tracking-wider">CHANGE</span>
                           </label>
                        </div>
                     </div>
                     <div className="flex-1 text-center md:text-left">
                        <h3 className="text-lg font-black text-gray-900 leading-tight">Brand Identity</h3>
                        <p className="text-sm text-gray-500 mt-1 mb-4">Upload your high-resolution business logo for professional documents</p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">Recommended: PNG or WEBP with transparent background</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Business Legal Name" value={settings?.name || ''} onChange={e => setSettings({ ...settings, name: e.target.value })} />
                    <Input label="Trade Name (DBA)" value={settings?.legalName || ''} onChange={e => setSettings({ ...settings, legalName: e.target.value })} />
                    <Input label="GSTIN" value={settings?.gstin || ''} onChange={e => setSettings({ ...settings, gstin: e.target.value })} />
                    <Input label="PAN" value={settings?.pan || ''} onChange={e => setSettings({ ...settings, pan: e.target.value })} />
                    <Input label="Phone" value={settings?.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
                    <Input label="Email" type="email" value={settings?.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} />
                    <Input label="Website" value={settings?.website || ''} onChange={e => setSettings({ ...settings, website: e.target.value })} />
                    <Select label="Business Type" value={settings?.businessType || ''} onChange={e => setSettings({ ...settings, businessType: e.target.value })}
                      options={[{value:'', label:'Select'}, {value:'SOLE_PROPRIETOR', label:'Sole Proprietorship'}, {value:'PARTNERSHIP', label:'Partnership'}, {value:'PVT_LTD', label:'Private Limited'}, {value:'LLC', label:'LLC'}, {value:'PUBLIC_LTD', label:'Public Limited'}]} />
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Business Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Input 
                          label="Street Address / Building" 
                          value={settings?.address?.street || ''} 
                          onChange={e => setSettings({ ...settings, address: { ...(settings.address || {}), street: e.target.value }})} 
                        />
                      </div>
                      <Input 
                        label="City" 
                        value={settings?.address?.city || ''} 
                        onChange={e => setSettings({ ...settings, address: { ...(settings.address || {}), city: e.target.value }})} 
                      />
                      <Input 
                        label="State" 
                        value={settings?.address?.state || ''} 
                        onChange={e => setSettings({ ...settings, address: { ...(settings.address || {}), state: e.target.value }})} 
                      />
                      <Input 
                        label="Zip Code" 
                        value={settings?.address?.zip || ''} 
                        onChange={e => setSettings({ ...settings, address: { ...(settings.address || {}), zip: e.target.value }})} 
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Regional Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Select label="Currency" value={settings?.currency || 'INR'} onChange={e => setSettings({ ...settings, currency: e.target.value })}
                        options={[{value:'INR', label:'Indian Rupee (₹)'}, {value:'USD', label:'US Dollar ($)'}, {value:'EUR', label:'Euro (€)'}, {value:'GBP', label:'British Pound (£)'}]} />
                      <Select label="Date Format" value={settings?.dateFormat || 'DD/MM/YYYY'} onChange={e => setSettings({ ...settings, dateFormat: e.target.value })}
                        options={[{value:'DD/MM/YYYY', label:'DD/MM/YYYY'}, {value:'MM/DD/YYYY', label:'MM/DD/YYYY'}, {value:'YYYY-MM-DD', label:'YYYY-MM-DD'}]} />
                      <Select label="Time Zone" value={settings?.timeZone || 'Asia/Kolkata'} onChange={e => setSettings({ ...settings, timeZone: e.target.value })}
                        options={[{value:'Asia/Kolkata', label:'India (IST)'}, {value:'America/New_York', label:'US Eastern'}, {value:'Europe/London', label:'UK'}]} />
                      <Select label="Decimal Places" value={String(settings?.decimalPlaces || 2)} onChange={e => setSettings({ ...settings, decimalPlaces: parseInt(e.target.value) })}
                        options={[{value:'0', label:'0'}, {value:'2', label:'2'}, {value:'3', label:'3'}, {value:'4', label:'4'}]} />
                      <Select label="Currency Position" value={settings?.currencyPosition || 'prefix'} onChange={e => setSettings({ ...settings, currencyPosition: e.target.value })}
                        options={[{value:'prefix', label:'Before amount (₹100)'}, {value:'suffix', label:'After amount (100₹)'}]} />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Financial Year</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select label="Financial Year Start" value={settings?.financialYearStart || '04-01'} onChange={e => setSettings({ ...settings, financialYearStart: e.target.value })}
                        options={[{value:'01-01', label:'January 1'}, {value:'04-01', label:'April 1'}, {value:'07-01', label:'July 1'}]} />
                      <Toggle label="Lock Financial Period" checked={settings?.enableFinancialLock || false} onChange={e => setSettings({ ...settings, enableFinancialLock: e.target.checked })} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'gst' && (
                <motion.div key="gst" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">GST & Tax Settings</h2>
                      <p className="text-sm text-gray-500">Configure GSTIN, tax rates, and compliance</p>
                    </div>
                  </div>

                  <Toggle label="Enable GST" checked={settings?.enableGst ?? true} onChange={e => setSettings({ ...settings, enableGst: e.target.checked })} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select label="GST Registration Type" value={settings?.gstRegistrationType || 'REGULAR'} onChange={e => setSettings({ ...settings, gstRegistrationType: e.target.value })}
                      options={[{value:'REGULAR', label:'Regular'}, {value:'COMPOSITION', label:'Composition'}, {value:'SEZ', label:'SEZ'}, {value:'EOU', label:'EOU'}]} />
                    <Input label="State Code" value={settings?.stateCode || ''} onChange={e => setSettings({ ...settings, stateCode: e.target.value })} />
                    <Input label="MSME/UDYAM Number" value={settings?.msmeNumber || ''} onChange={e => setSettings({ ...settings, msmeNumber: e.target.value })} />
                    <Input label="Default HSN Code" value={settings?.defaultHsnCode || ''} onChange={e => setSettings({ ...settings, defaultHsnCode: e.target.value })} />
                  </div>

                  <div className="p-6 bg-emerald-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-emerald-800">Default Tax Rates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">CGST Rate (%)</label>
                        <Input type="number" value={settings?.cgstRate || 9} onChange={e => setSettings({ ...settings, cgstRate: parseFloat(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">SGST Rate (%)</label>
                        <Input type="number" value={settings?.sgstRate || 9} onChange={e => setSettings({ ...settings, sgstRate: parseFloat(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">IGST Rate (%)</label>
                        <Input type="number" value={settings?.igstRate || 18} onChange={e => setSettings({ ...settings, igstRate: parseFloat(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Cess Rate (%)</label>
                        <Input type="number" value={settings?.cessRate || 0} onChange={e => setSettings({ ...settings, cessRate: parseFloat(e.target.value) })} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Toggle label="Enable Reverse Charge" checked={settings?.enableReverseCharge || false} onChange={e => setSettings({ ...settings, enableReverseCharge: e.target.checked })} />
                    <Toggle label="SEZ Unit" checked={settings?.sezUnit || false} onChange={e => setSettings({ ...settings, sezUnit: e.target.checked })} />
                  </div>

                  <div className="p-6 bg-blue-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-blue-800">e-Invoice & e-Way Bill</h3>
                    <Toggle label="Enable e-Invoice" checked={settings?.enableEInvoice || false} onChange={e => setSettings({ ...settings, enableEInvoice: e.target.checked })} />
                    {settings?.enableEInvoice && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <Input label="e-Invoice Username" value={settings?.eInvoiceUsername || ''} onChange={e => setSettings({ ...settings, eInvoiceUsername: e.target.value })} />
                        <Input label="e-Invoice Password" type="password" value={settings?.eInvoicePassword || ''} onChange={e => setSettings({ ...settings, eInvoicePassword: e.target.value })} />
                        <Input label="e-Invoice GSTIN" value={settings?.eInvoiceGstin || ''} onChange={e => setSettings({ ...settings, eInvoiceGstin: e.target.value })} />
                      </div>
                    )}
                    <Toggle label="Enable e-Way Bill" checked={settings?.enableEWayBill || false} onChange={e => setSettings({ ...settings, enableEWayBill: e.target.checked })} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'numbering' && (
                <motion.div key="numbering" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Document Numbering</h2>
                      <p className="text-sm text-gray-500">Configure automatic numbering for invoices and documents</p>
                    </div>
                  </div>

                  <Toggle label="Auto Numbering" checked={settings?.autoNumbering ?? true} onChange={e => setSettings({ ...settings, autoNumbering: e.target.checked })} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Invoice Numbering</h3>
                      <Input label="Invoice Prefix" value={settings?.invoicePrefix || 'INV'} onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })} />
                      <Input label="Start Number" type="number" value={settings?.invoiceStartNumber || 1} onChange={e => setSettings({ ...settings, invoiceStartNumber: parseInt(e.target.value) })} />
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Estimate Numbering</h3>
                      <Input label="Estimate Prefix" value={settings?.estimatePrefix || 'EST'} onChange={e => setSettings({ ...settings, estimatePrefix: e.target.value })} />
                      <Input label="Start Number" type="number" value={settings?.estimateStartNumber || 1} onChange={e => setSettings({ ...settings, estimateStartNumber: parseInt(e.target.value) })} />
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Purchase Numbering</h3>
                      <Input label="Purchase Prefix" value={settings?.purchasePrefix || 'PUR'} onChange={e => setSettings({ ...settings, purchasePrefix: e.target.value })} />
                      <Input label="Start Number" type="number" value={settings?.purchaseStartNumber || 1} onChange={e => setSettings({ ...settings, purchaseStartNumber: parseInt(e.target.value) })} />
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Payment Numbering</h3>
                      <Input label="Payment Prefix" value={settings?.paymentPrefix || 'PAY'} onChange={e => setSettings({ ...settings, paymentPrefix: e.target.value })} />
                      <Input label="Start Number" type="number" value={settings?.paymentStartNumber || 1} onChange={e => setSettings({ ...settings, paymentStartNumber: parseInt(e.target.value) })} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'invoice' && (
                <motion.div key="invoice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Invoice Defaults</h2>
                      <p className="text-sm text-gray-500">Set default values for new invoices</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Default Payment Terms (days)" type="number" value={settings?.defaultPaymentTerms || 30} onChange={e => setSettings({ ...settings, defaultPaymentTerms: parseInt(e.target.value) })} />
                    <Input label="Default Due Days" type="number" value={settings?.defaultDueDays || 15} onChange={e => setSettings({ ...settings, defaultDueDays: parseInt(e.target.value) })} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Default Invoice Terms</label>
                      <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows={3} value={settings?.defaultInvoiceTerms || ''} onChange={e => setSettings({ ...settings, defaultInvoiceTerms: e.target.value })} placeholder="Payment due within 15 days..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Default Invoice Notes</label>
                      <textarea className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows={2} value={settings?.defaultInvoiceNotes || ''} onChange={e => setSettings({ ...settings, defaultInvoiceNotes: e.target.value })} placeholder="Thank you for your business!" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Footer Message</label>
                      <Input value={settings?.footerMessage || ''} onChange={e => setSettings({ ...settings, footerMessage: e.target.value })} placeholder="Goods once sold will not be taken back" />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Digital Signature</h3>
                    <div>
                      {currentBusiness?.signatureImage && (
                        <div className="mb-4">
                          <img src={`${import.meta.env.VITE_API_URL || ''}${currentBusiness.signatureImage}`} alt="Signature" className="h-16 object-contain border border-gray-200 rounded p-2 bg-white" />
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('signatureImage', file);
                            api.post(`/businesses/${businessId}/signature`, formData)
                              .then(res => {
                                fetchBusinesses();
                              })
                              .catch(err => console.error('Failed to upload signature', err));
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Invoice Display Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Toggle label="Show QR Code" checked={settings?.showQrCode ?? true} onChange={e => setSettings({ ...settings, showQrCode: e.target.checked })} />
                      <Toggle label="Show Bank Details" checked={settings?.showBankDetails ?? true} onChange={e => setSettings({ ...settings, showBankDetails: e.target.checked })} />
                      <Toggle label="Show Signature" checked={settings?.showSignature ?? true} onChange={e => setSettings({ ...settings, showSignature: e.target.checked })} />
                      <Toggle label="Show HSN Code" checked={settings?.showHsnCode ?? true} onChange={e => setSettings({ ...settings, showHsnCode: e.target.checked })} />
                      <Toggle label="Show Quantity" checked={settings?.showQuantity ?? true} onChange={e => setSettings({ ...settings, showQuantity: e.target.checked })} />
                      <Toggle label="Show Rate" checked={settings?.showRate ?? true} onChange={e => setSettings({ ...settings, showRate: e.target.checked })} />
                      <Toggle label="Show Discount" checked={settings?.showDiscount ?? true} onChange={e => setSettings({ ...settings, showDiscount: e.target.checked })} />
                      <Toggle label="Show Tax Breakdown" checked={settings?.showTaxBreakup ?? true} onChange={e => setSettings({ ...settings, showTaxBreakup: e.target.checked })} />
                    </div>
                  </div>

                  <Toggle label="Allow Edit After Send" checked={settings?.allowEditAfterSend ?? true} onChange={e => setSettings({ ...settings, allowEditAfterSend: e.target.checked })} />
                  <Toggle label="Require Approval" checked={settings?.requireApproval || false} onChange={e => setSettings({ ...settings, requireApproval: e.target.checked })} />
                </motion.div>
              )}

              {activeTab === 'templates' && (
                <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600">
                      <Palette className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Invoice Template</h2>
                      <p className="text-sm text-gray-500">Customize the appearance of your invoices</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'modern', name: 'Premium Modern', Component: InvoiceTemplate1 },
                      { id: 'classic', name: 'Professional Classic', Component: InvoiceTemplate2 },
                      { id: 'minimal', name: 'Clean Minimal', Component: InvoiceTemplate3 }
                    ].map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => setSettings({ ...settings, invoiceTemplate: tpl.id })}
                        className={`group cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 ${
                          settings?.invoiceTemplate === tpl.id 
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-500/10' 
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="aspect-[1/1.4] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4 relative group-hover:shadow-md transition-all">
                          {/* Scaled Preview - Dynamically fit container */}
                          <div className="absolute top-0 left-0 w-[820px] origin-top-left scale-[0.43] pointer-events-none select-none" style={{ transform: 'scale(var(--preview-scale, 0.43))' }}>
                            <tpl.Component 
                              business={{ name: 'ARTHA CORP', address: 'Bangalore, India', gstin: '29ABCDE1234F1Z5' }}
                              party={{ id: 'CLI-001', name: 'James Wilson', address: 'Downtown, NY 10001' }}
                              invoice={{ invoiceNumber: 'INV-001', date: new Date(), dueDate: new Date() }}
                              items={[
                                { description: 'Software Development', rate: 12000, quantity: 1, taxRate: 18 },
                                { description: 'Cloud Infrastructure', rate: 5000, quantity: 2, taxRate: 18 }
                              ]}
                              totals={{ subtotal: 22000, total: 25960, cgst: 1980, sgst: 1980, igst: 0, discountAmount: 0 }}
                            />
                          </div>
                          {/* Overlay to ensure no interactions */}
                          <div className="absolute inset-0 z-10" />
                        </div>
                        <p className={`text-center font-bold text-sm tracking-tight ${settings?.invoiceTemplate === tpl.id ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {tpl.name}
                        </p>
                        <div className="flex justify-center mt-2">
                           <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${settings?.invoiceTemplate === tpl.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100'}`}>
                              {settings?.invoiceTemplate === tpl.id ? 'Selected' : 'Use This'}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Theme Color</label>
                      <div className="flex gap-3">
                        <input type="color" value={settings?.themeColor || '#4F46E5'} onChange={e => setSettings({ ...settings, themeColor: e.target.value })} className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer" />
                        <Input value={settings?.themeColor || '#4F46E5'} onChange={e => setSettings({ ...settings, themeColor: e.target.value })} />
                      </div>
                    </div>
                    <Select label="Font Family" value={settings?.fontFamily || 'Inter'} onChange={e => setSettings({ ...settings, fontFamily: e.target.value })}
                      options={[{value:'Inter', label:'Inter (Modern)'}, {value:'Roboto', label:'Roboto'}, {value:'Open Sans', label:'Open Sans'}, {value:'system-ui', label:'System Default'}]} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'banking' && (
                <motion.div key="banking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Banking & Payments</h2>
                      <p className="text-sm text-gray-500">Configure bank accounts and payment gateways</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Default Accounts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select label="Default Bank Account" value={settings?.defaultBankAccountId || ''} onChange={e => setSettings({ ...settings, defaultBankAccountId: e.target.value })}
                        options={[{value:'', label:'Select'}, ...accounts.filter(a => a.isBankAccount).map(a => ({value: a.id, label: `${a.bankName || a.name} (${a.accountNumber || 'N/A'})`}))]} />
                      <Select label="Default Cash Account" value={settings?.defaultCashAccountId || ''} onChange={e => setSettings({ ...settings, defaultCashAccountId: e.target.value })}
                        options={[{value:'', label:'Select'}, ...accounts.filter(a => a.isCashAccount).map(a => ({value: a.id, label: a.name}))]} />
                    </div>
                  </div>

                  <div className="p-6 bg-purple-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-purple-800">UPI / QR Setup</h3>
                    <p className="text-sm text-purple-600">Configure your UPI ID to generate B2C QR codes on your invoices.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Business UPI ID" value={settings?.upiId ?? currentBusiness?.upiId ?? ''} onChange={e => setSettings({ ...settings, upiId: e.target.value })} placeholder="merchant@upi" />
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-blue-800">Online Payments</h3>
                    <Toggle label="Enable Online Payments (Razorpay)" checked={settings?.enableOnlinePayments || false} onChange={e => setSettings({ ...settings, enableOnlinePayments: e.target.checked })} />
                    {settings?.enableOnlinePayments && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <Input label="Razorpay Key ID" value={settings?.razorpayKeyId || ''} onChange={e => setSettings({ ...settings, razorpayKeyId: e.target.value })} />
                        <Input label="Razorpay Key Secret" type="password" value={settings?.razorpayKeySecret || ''} onChange={e => setSettings({ ...settings, razorpayKeySecret: e.target.value })} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'notifications' && (
                <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                      <p className="text-sm text-gray-500">Configure email alerts and reminders</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-700">Invoice Notifications</h3>
                    <Toggle label="Email when invoice is created" checked={settings?.emailOnInvoiceCreate ?? true} onChange={e => setSettings({ ...settings, emailOnInvoiceCreate: e.target.checked })} />
                    <Toggle label="Email when payment is received" checked={settings?.emailOnPaymentReceive ?? true} onChange={e => setSettings({ ...settings, emailOnPaymentReceive: e.target.checked })} />
                    <Toggle label="Email when invoice becomes overdue" checked={settings?.emailOnInvoiceOverdue ?? true} onChange={e => setSettings({ ...settings, emailOnInvoiceOverdue: e.target.checked })} />
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">Payment Reminders</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Reminder Days (before due)" type="number" value={settings?.reminderDays || 7} onChange={e => setSettings({ ...settings, reminderDays: parseInt(e.target.value) })} />
                      <Input label="Reminder Frequency (days)" type="number" value={settings?.reminderFrequency || 3} onChange={e => setSettings({ ...settings, reminderFrequency: parseInt(e.target.value) })} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Toggle label="Auto Email Statements" checked={settings?.autoEmailStatements || false} onChange={e => setSettings({ ...settings, autoEmailStatements: e.target.checked })} />
                    {settings?.autoEmailStatements && (
                      <Select label="Statement Frequency" value={settings?.statementFrequency || 'monthly'} onChange={e => setSettings({ ...settings, statementFrequency: e.target.value })}
                        options={[{value:'weekly', label:'Weekly'}, {value:'biweekly', label:'Bi-weekly'}, {value:'monthly', label:'Monthly'}, {value:'quarterly', label:'Quarterly'}]} />
                    )}
                    <Input label="CC Email" type="email" value={settings?.emailCC || ''} onChange={e => setSettings({ ...settings, emailCC: e.target.value })} placeholder="accountant@company.com" />
                  </div>
                </motion.div>
              )}

              {activeTab === 'accounts' && (
                <motion.div key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-cyan-100 rounded-2xl flex items-center justify-center text-cyan-600">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">Chart of Accounts</h2>
                      <p className="text-sm text-gray-500">Manage your financial accounts and ledgers</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={async () => { await api.post(`/settings/${businessId}/accounts/initialize`); loadSettings(); }}>Initialize Default</Button>
                      <Button size="sm" icon={Plus} onClick={() => { setEditingAccount(accountInitial); setShowAccountModal(true); }}>Add Account</Button>
                    </div>
                  </div>

                  {Object.entries({
                    'ASSET': { label: 'Assets', color: 'blue' },
                    'LIABILITY': { label: 'Liabilities', color: 'red' },
                    'EQUITY': { label: 'Equity', color: 'purple' },
                    'INCOME': { label: 'Income', color: 'green' },
                    'EXPENSE': { label: 'Expenses', color: 'orange' },
                  }).map(([type, { label, color }]) => (
                    <div key={type} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className={type === 'ASSET' ? 'px-6 py-3 bg-blue-50 border-b border-blue-100' : type === 'LIABILITY' ? 'px-6 py-3 bg-red-50 border-b border-red-100' : type === 'EQUITY' ? 'px-6 py-3 bg-purple-50 border-b border-purple-100' : type === 'INCOME' ? 'px-6 py-3 bg-green-50 border-b border-green-100' : 'px-6 py-3 bg-orange-50 border-b border-orange-100'}>
                        <h3 className="font-bold text-gray-800">{label}</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {accounts.filter(a => a.type === type).map(account => (
                          <div key={account.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-gray-400">{account.code}</span>
                              <span className="font-medium text-gray-700">{account.name}</span>
                              {account.isBankAccount && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Bank</span>}
                              {account.isCashAccount && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Cash</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">₹{account.balance?.toLocaleString() || 0}</span>
                              <button onClick={() => { setEditingAccount(account); setShowAccountModal(true); }} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-4 h-4 text-gray-400" /></button>
                              <button onClick={() => handleDeleteAccount(account.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </div>
                          </div>
                        ))}
                        {accounts.filter(a => a.type === type).length === 0 && (
                          <div className="px-6 py-3 text-sm text-gray-400 italic">No accounts in this category</div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'tax-rates' && (
                <motion.div key="tax-rates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">Tax Rates</h2>
                      <p className="text-sm text-gray-500">Manage GST rates for your products and services</p>
                    </div>
                    <Button size="sm" icon={Plus} onClick={() => { setEditingTax(taxRateInitial); setShowTaxModal(true); }}>Add Tax Rate</Button>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CGST</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">SGST</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">IGST</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">HSN</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {taxRates.map(rate => (
                          <tr key={rate.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900">{rate.name} {rate.isDefault && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Default</span>}</td>
                            <td className="px-6 py-3 text-gray-600">{rate.rate}%</td>
                            <td className="px-6 py-3 text-gray-600">{rate.cgstRate}%</td>
                            <td className="px-6 py-3 text-gray-600">{rate.sgstRate}%</td>
                            <td className="px-6 py-3 text-gray-600">{rate.igstRate}%</td>
                            <td className="px-6 py-3 text-gray-500 font-mono text-sm">{rate.hsnCode || '-'}</td>
                            <td className="px-6 py-3 text-right">
                              <button onClick={() => { setEditingTax(rate); setShowTaxModal(true); }} className="p-1 hover:bg-gray-200 rounded"><Edit className="w-4 h-4 text-gray-400" /></button>
                              <button onClick={() => handleDeleteTax(rate.id)} className="p-1 hover:bg-red-100 rounded ml-1"><Trash2 className="w-4 h-4 text-red-400" /></button>
                            </td>
                          </tr>
                        ))}
                        {taxRates.length === 0 && (
                          <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No tax rates configured. Click "Add Tax Rate" to create one.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-white">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Security & Access</h2>
                      <p className="text-sm text-gray-500">Configure security settings and audit logs</p>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-gray-700">User Permissions</h3>
                    <Toggle label="Require Approval for Invoices" checked={settings?.requireApproval || false} onChange={e => setSettings({ ...settings, requireApproval: e.target.checked })} />
                    <Toggle label="Allow Edit After Send" checked={settings?.allowEditAfterSend ?? true} onChange={e => setSettings({ ...settings, allowEditAfterSend: e.target.checked })} />
                    <Toggle label="Lock Financial Period" checked={settings?.enableFinancialLock || false} onChange={e => setSettings({ ...settings, enableFinancialLock: e.target.checked })} />
                    {settings?.enableFinancialLock && (
                      <Input label="Lock Date" type="date" value={settings?.lockDate?.split('T')[0] || ''} onChange={e => setSettings({ ...settings, lockDate: e.target.value })} />
                    )}
                  </div>

                  <div className="p-6 bg-amber-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-amber-800">API Keys</h3>
                    <p className="text-sm text-amber-600">API keys are used for integrating with third-party applications.</p>
                    <div className="flex gap-3">
                      <Button variant="outline" icon={Key}>Generate API Key</Button>
                      <Button variant="outline" icon={Download}>Manage Keys</Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                    <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Data & Backup</h2>
                      <p className="text-sm text-gray-500">Export, import, and manage your business data</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Export Data</h3>
                      <p className="text-sm text-gray-500">Download all your business data in JSON format for backup or migration.</p>
                      <Button icon={Download} variant="outline" onClick={handleExport}>Export to JSON</Button>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                      <h3 className="font-bold text-gray-700">Import Data</h3>
                      <p className="text-sm text-gray-500">Import data from Vyapar or other accounting software.</p>
                      <Button variant="outline" icon={FileSpreadsheet} onClick={() => window.location.href = '/import'}>Import from Vyapar</Button>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-2xl space-y-4">
                    <h3 className="font-bold text-blue-800">Audit Logs</h3>
                    <p className="text-sm text-blue-600">Track all changes made to your business data.</p>
                    <Button variant="outline" icon={FileSpreadsheet} onClick={() => { setShowAuditModal(true); loadAuditLogs(); }}>View Audit Logs</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>

      {/* Tax Rate Modal */}
      <Modal isOpen={showTaxModal} onClose={() => setShowTaxModal(false)} title={editingTax?.id ? 'Edit Tax Rate' : 'Add Tax Rate'}>
        <form onSubmit={(e) => { e.preventDefault(); handleTaxSave({ name: e.target.name.value, rate: parseFloat(e.target.rate.value), cgstRate: parseFloat(e.target.cgstRate.value), sgstRate: parseFloat(e.target.sgstRate.value), igstRate: parseFloat(e.target.igstRate.value), cessRate: parseFloat(e.target.cessRate.value), hsnCode: e.target.hsnCode.value, description: e.target.description.value, isDefault: e.target.isDefault.checked }); }}>
          <div className="space-y-4">
            <Input label="Tax Name" name="name" defaultValue={editingTax?.name || ''} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Total Rate (%)" name="rate" type="number" step="0.01" defaultValue={editingTax?.rate || 18} required />
              <Input label="HSN Code" name="hsnCode" defaultValue={editingTax?.hsnCode || ''} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="CGST (%)" name="cgstRate" type="number" step="0.01" defaultValue={editingTax?.cgstRate || 9} />
              <Input label="SGST (%)" name="sgstRate" type="number" step="0.01" defaultValue={editingTax?.sgstRate || 9} />
              <Input label="IGST (%)" name="igstRate" type="number" step="0.01" defaultValue={editingTax?.igstRate || 0} />
            </div>
            <Input label="Cess (%)" name="cessRate" type="number" step="0.01" defaultValue={editingTax?.cessRate || 0} />
            <Input label="Description" name="description" defaultValue={editingTax?.description || ''} />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isDefault" defaultChecked={editingTax?.isDefault || false} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-gray-600">Set as default tax rate</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowTaxModal(false)}>Cancel</Button>
            <Button type="submit">{editingTax?.id ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Account Modal */}
      <Modal isOpen={showAccountModal} onClose={() => setShowAccountModal(false)} title={editingAccount?.id ? 'Edit Account' : 'Add Account'}>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          const formData = new FormData(e.target);
          const data = Object.fromEntries(
            Array.from(formData.entries()).filter(([_, value]) => value !== '')
          );
          if (data.openingBalance) data.openingBalance = parseFloat(data.openingBalance);
          handleAccountSave(data);
        }}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Account Code" name="code" defaultValue={editingAccount?.code || ''} />
              <Input label="Account Name" name="name" defaultValue={editingAccount?.name || ''} required />
            </div>
            <Select label="Account Type" name="type" defaultValue={editingAccount?.type || 'ASSET'}
              options={[{value:'ASSET', label:'Asset'}, {value:'LIABILITY', label:'Liability'}, {value:'EQUITY', label:'Equity'}, {value:'INCOME', label:'Income'}, {value:'EXPENSE', label:'Expense'}]} />
            <Input label="Sub Type" name="subType" defaultValue={editingAccount?.subType || ''} placeholder="e.g., Current Asset, Fixed Asset" />
            <Input label="Opening Balance" name="openingBalance" type="number" step="0.01" defaultValue={editingAccount?.openingBalance || 0} />
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isBankAccount" defaultChecked={editingAccount?.isBankAccount || false} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-600">This is a Bank Account</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isCashAccount" defaultChecked={editingAccount?.isCashAccount || false} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-600">This is a Cash Account</span>
              </label>
            </div>
            {(e => document.getElementsByName('isBankAccount')[0]?.checked)() && (
              <div className="grid grid-cols-3 gap-4">
                <Input label="Bank Name" name="bankName" defaultValue={editingAccount?.bankName || ''} />
                <Input label="Account Number" name="accountNumber" defaultValue={editingAccount?.accountNumber || ''} />
                <Input label="IFSC Code" name="ifscCode" defaultValue={editingAccount?.ifscCode || ''} />
              </div>
            )}
            <Input label="Description" name="description" defaultValue={editingAccount?.description || ''} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => setShowAccountModal(false)}>Cancel</Button>
            <Button type="submit">{editingAccount?.id ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Audit Logs Modal */}
      <Modal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} title="Business Audit Logs" size="xl">
        <div className="space-y-4">
          <Table
            columns={[
              { header: 'Date', render: (log) => new Date(log.createdAt).toLocaleString() },
              { header: 'User', render: (log) => log.user?.name || log.userId },
              { header: 'Action', render: (log) => (
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  log.action === 'CREATE' ? 'bg-green-100 text-green-700' :
                  log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {log.action}
                </span>
              )},
              { header: 'Entity', key: 'entityType' },
              { header: 'ID', key: 'entityId' },
              { header: 'Details', render: (log) => (
                <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-500">
                  {log.newValue ? JSON.stringify(log.newValue) : '-'}
                </div>
              )}
            ]}
            data={auditLogs}
          />
          {auditLogs.length === 0 && !loadingLogs && (
            <div className="text-center py-8 text-gray-500">No logs found for this business.</div>
          )}
          {loadingLogs && <div className="text-center py-8">Loading...</div>}
        </div>
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => setShowAuditModal(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
