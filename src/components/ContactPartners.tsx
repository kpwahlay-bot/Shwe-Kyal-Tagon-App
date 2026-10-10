import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  Crown,
  Sliders,
  Sparkles,
  Save
} from 'lucide-react';
import { 
  ContactPartner, 
  DailySale, 
  Branch, 
  UserAccount, 
  TreasuryAccount, 
  PurchaseRecord,
  SaleInstallment,
  VipConfig,
  canUserDelete 
} from '../types';
import { 
  normalizePhone, 
  loadVipConfig, 
  saveVipConfig,
  DEFAULT_VIP_CONFIG
} from '../utils/customerHelper';
import { formatMMK, formatNumber } from '../utils/formatters';

interface ContactPartnersProps {
  partners: ContactPartner[];
  sales?: DailySale[];
  purchases?: PurchaseRecord[];
  branches?: Branch[];
  currentUser?: UserAccount;
  treasuryAccounts?: TreasuryAccount[];
  onAddPartner: (partner: ContactPartner) => void;
  onUpdatePartner: (partner: ContactPartner) => void;
  onDeletePartner: (id: string) => void;
  onSettleCustomerDebt?: (
    partnerId: string | undefined,
    customerName: string,
    customerPhone: string | undefined,
    amount: number,
    accountId: string,
    notes?: string,
    voucherId?: string,
    paymentMethod?: string
  ) => void;
  onSelectVoucher?: (sale: DailySale) => void;
}

export type ContactTab = 'customers' | 'suppliers';
export type CustomerTypeOption = 'Retail' | 'Wholesale' | 'VIP';
export type ProductCategoryOption = 
  | 'Accessories & Gadgets' 
  | 'Smartphone & Tablet' 
  | 'Laptop & Computer' 
  | 'Service & Spare Part';

export const PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  'Accessories & Gadgets',
  'Smartphone & Tablet',
  'Laptop & Computer',
  'Service & Spare Part'
];

// Helper to auto-generate monthly installment schedule for compatibility
export const getOrGenerateSaleInstallments = (sale: DailySale, overrideMonths?: number): SaleInstallment[] => {
  if (!overrideMonths && sale.installments && sale.installments.length > 0) {
    return sale.installments;
  }

  const originalTotal = sale.salePrice || 0;
  const currentDebt = sale.remainingDebt ?? (sale.paymentStatus === 'CREDIT' ? originalTotal : 0);
  const paidSoFar = sale.paidAmount || (originalTotal - currentDebt);
  
  const totalMonths = overrideMonths || sale.totalInstallments || (sale.installments && sale.installments.length > 0 ? sale.installments.length : 3);
  const monthlyAmount = Math.round(originalTotal / totalMonths);
  const saleDateStr = sale.date || new Date().toISOString().split('T')[0];
  const [sY, sM, sD] = saleDateStr.split('-').map(Number);

  const schedule: SaleInstallment[] = [];
  let cumulativePaidTracker = paidSoFar;

  for (let i = 1; i <= totalMonths; i++) {
    const dueYear = sM + i - 1 > 12 ? sY + Math.floor((sM + i - 2) / 12) : sY;
    const dueMonth = ((sM + i - 2) % 12) + 1;
    const dueDay = Math.min(sD || 1, 28);
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
    const monthName = new Date(dueYear, dueMonth - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

    const plannedAmount = i === totalMonths 
      ? originalTotal - (monthlyAmount * (totalMonths - 1))
      : monthlyAmount;

    let installmentPaid = 0;
    let status: SaleInstallment['status'] = 'PENDING';

    if (cumulativePaidTracker >= plannedAmount) {
      installmentPaid = plannedAmount;
      cumulativePaidTracker -= plannedAmount;
      status = 'PAID';
    } else if (cumulativePaidTracker > 0) {
      installmentPaid = cumulativePaidTracker;
      cumulativePaidTracker = 0;
      status = 'PARTIAL';
    }

    schedule.push({
      installmentNo: i,
      monthName,
      dueDate,
      amount: plannedAmount,
      paidAmount: installmentPaid,
      status,
      paidDate: status === 'PAID' ? dueDate : undefined,
    });
  }

  return schedule;
};

export const ContactPartners: React.FC<ContactPartnersProps> = ({
  partners = [],
  sales = [],
  currentUser,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
}) => {
  const [activeTab, setActiveTab] = useState<ContactTab>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ContactPartner | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // VIP Rules Configuration State
  const [vipConfig, setVipConfig] = useState<VipConfig>(DEFAULT_VIP_CONFIG);

  useEffect(() => {
    setVipConfig(loadVipConfig());
  }, []);

  const canDelete = currentUser ? canUserDelete(currentUser) : true;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    customerType: 'Retail' as CustomerTypeOption,
    category: 'Accessories & Gadgets' as ProductCategoryOption,
    contactPerson: 'Reception',
    phone: '',
    address: '',
  });

  // Extract all unique customers from sales transactions to merge seamlessly with registered partners
  const combinedContacts = useMemo(() => {
    const list: ContactPartner[] = [...partners];
    const registeredPhoneMap = new Map<string, ContactPartner>();
    const registeredNameMap = new Map<string, ContactPartner>();

    partners.forEach((p) => {
      if (p.phone) registeredPhoneMap.set(normalizePhone(p.phone), p);
      if (p.name) registeredNameMap.set(p.name.trim().toLowerCase(), p);
    });

    // Merge customer sales records
    sales.forEach((s) => {
      const cName = (s.customerName || '').trim();
      const cPhone = (s.customerPhone || '').trim();
      if (!cName && !cPhone) return;

      const normP = cPhone ? normalizePhone(cPhone) : '';
      const normN = cName ? cName.toLowerCase() : '';

      if ((normP && registeredPhoneMap.has(normP)) || (normN && registeredNameMap.has(normN))) {
        return;
      }

      const isVip = s.isVipCustomer || false;
      const generatedCust: ContactPartner = {
        id: `cust-pos-${normP || normN.replace(/[^a-z0-9]/g, '-') || Date.now()}`,
        name: cName || 'Retail Customer',
        type: isVip ? 'VIP Customer' : 'Customer',
        phone: cPhone || '-',
        contactPerson: isVip ? 'VIP Customer' : 'Retail Customer',
        productCategory: s.category?.includes('Smartphone') ? 'Smartphone & Tablet' : 
                         s.category?.includes('Laptop') ? 'Laptop & Computer' : 
                         s.category?.includes('Service') ? 'Service & Spare Part' : 'Accessories & Gadgets',
        city: s.branchName || 'Yangon',
        address: 'Direct Walk-in POS Client',
        createdAt: s.date || new Date().toISOString().split('T')[0],
      };

      list.push(generatedCust);
      if (normP) registeredPhoneMap.set(normP, generatedCust);
      if (normN) registeredNameMap.set(normN, generatedCust);
    });

    return list;
  }, [partners, sales]);

  // Filter contacts by active tab (Only Customers & Suppliers)
  const tabFilteredContacts = useMemo(() => {
    return combinedContacts.filter((c) => {
      if (activeTab === 'suppliers') {
        return c.type === 'Supplier';
      }
      // 'customers'
      return c.type !== 'Supplier';
    });
  }, [combinedContacts, activeTab]);

  // Search filter
  const finalFilteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredContacts;
    const q = searchQuery.toLowerCase().trim();
    return tabFilteredContacts.filter((c) => {
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.productCategory || '').toLowerCase().includes(q)
      );
    });
  }, [tabFilteredContacts, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      customerType: 'Retail',
      category: 'Accessories & Gadgets',
      contactPerson: activeTab === 'suppliers' ? 'Reception' : '',
      phone: '',
      address: '',
    });
    setEditingPartner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: ContactPartner) => {
    setEditingPartner(p);
    
    // Determine customer type
    let custType: CustomerTypeOption = 'Retail';
    if (p.type === 'Wholesale Customer') custType = 'Wholesale';
    else if (p.type === 'Corporate') custType = 'Wholesale';
    else if (p.type === 'VIP Customer' || p.productCategory === 'VIP') custType = 'VIP';

    // Normalize category
    let cat: ProductCategoryOption = 'Accessories & Gadgets';
    const rawCat = (p.productCategory || '').toLowerCase();
    if (rawCat.includes('smartphone') || rawCat.includes('tablet') || rawCat.includes('mobile')) {
      cat = 'Smartphone & Tablet';
    } else if (rawCat.includes('laptop') || rawCat.includes('computer')) {
      cat = 'Laptop & Computer';
    } else if (rawCat.includes('service') || rawCat.includes('part')) {
      cat = 'Service & Spare Part';
    }

    setFormData({
      name: p.name || '',
      customerType: custType,
      category: cat,
      contactPerson: p.contactPerson || (activeTab === 'suppliers' ? 'Reception' : ''),
      phone: p.phone || '',
      address: p.address || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please fill required fields: Name and Phone Number.');
      return;
    }

    if (activeTab === 'customers') {
      const typeMapped: ContactPartner['type'] = 
        formData.customerType === 'Wholesale' ? 'Wholesale Customer' :
        formData.customerType === 'VIP' ? 'VIP Customer' : 'Customer';

      if (editingPartner) {
        const updated: ContactPartner = {
          ...editingPartner,
          name: formData.name.trim(),
          type: typeMapped,
          productCategory: formData.category,
          contactPerson: formData.customerType,
          phone: formData.phone.trim(),
          address: formData.address.trim() || '',
        };
        onUpdatePartner(updated);
        showToast(`Customer "${updated.name}" updated successfully.`);
      } else {
        const newContact: ContactPartner = {
          id: `cust-${Date.now()}`,
          name: formData.name.trim(),
          type: typeMapped,
          productCategory: formData.category,
          contactPerson: formData.customerType,
          phone: formData.phone.trim(),
          city: 'Yangon',
          address: formData.address.trim() || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        onAddPartner(newContact);
        showToast(`New customer "${newContact.name}" added successfully.`);
      }
    } else {
      // Supplier
      if (editingPartner) {
        const updated: ContactPartner = {
          ...editingPartner,
          name: formData.name.trim(),
          type: 'Supplier',
          productCategory: formData.category,
          contactPerson: formData.contactPerson.trim() || 'Reception',
          phone: formData.phone.trim(),
          address: formData.address.trim() || '',
        };
        onUpdatePartner(updated);
        showToast(`Supplier "${updated.name}" updated successfully.`);
      } else {
        const newContact: ContactPartner = {
          id: `supp-${Date.now()}`,
          name: formData.name.trim(),
          type: 'Supplier',
          productCategory: formData.category,
          contactPerson: formData.contactPerson.trim() || 'Reception',
          phone: formData.phone.trim(),
          city: 'Yangon',
          address: formData.address.trim() || '',
          createdAt: new Date().toISOString().split('T')[0],
        };
        onAddPartner(newContact);
        showToast(`New supplier "${newContact.name}" added successfully.`);
      }
    }

    setIsModalOpen(false);
  };

  const handleSaveVipRules = (e: React.FormEvent) => {
    e.preventDefault();
    saveVipConfig(vipConfig);
    showToast('VIP Rules & Thresholds saved successfully.');
    setIsVipModalOpen(false);
  };

  const getCategoryBadgeClass = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('accessor')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (cat.includes('laptop') || cat.includes('computer')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (cat.includes('smartphone') || cat.includes('tablet') || cat.includes('mobile')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (cat.includes('service') || cat.includes('part')) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer &amp; Supplier Contacts</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              {combinedContacts.length} Total Records
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified contact directory for customers and authorized suppliers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* VIP Rules Button (Only shown on Customers tab for quick configuration) */}
          {activeTab === 'customers' && (
            <button
              type="button"
              onClick={() => setIsVipModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Configure VIP Qualification Rules & Loyalty Settings"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              <span>👑 VIP Rules</span>
            </button>
          )}

          {/* Add Record Button */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Record</span>
          </button>
        </div>
      </div>

      {/* Main Filter / Tabs Control Strip (Customers & Suppliers Only) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons (CUSTOMERS & SUPPLIERS Only) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customers');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>CUSTOMERS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('suppliers');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SUPPLIERS</span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search existing ${activeTab === 'suppliers' ? 'suppliers' : 'customers'} by Name, Phone or Address...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 font-medium transition-all"
          />
        </div>

        {/* Total Results Pill */}
        <div className="shrink-0 flex items-center justify-end">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">TOTAL RESULTS:</span>
            <span className="font-mono font-black text-slate-900">{finalFilteredContacts.length}</span>
          </div>
        </div>
      </div>

      {/* Directory Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px] tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[180px]">
                  {activeTab === 'suppliers' ? 'SUPPLIER NAME' : 'CUSTOMER NAME'}
                </th>
                <th className="py-3.5 px-4 min-w-[130px]">
                  {activeTab === 'customers' ? 'CUSTOMER TYPE' : 'CATEGORY'}
                </th>
                {activeTab === 'suppliers' && (
                  <th className="py-3.5 px-4 min-w-[140px]">CONTACT PERSON</th>
                )}
                <th className="py-3.5 px-4 min-w-[140px]">PHONE</th>
                <th className="py-3.5 px-4 min-w-[260px]">ADDRESS</th>
                <th className="py-3.5 px-4 w-24 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalFilteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No {activeTab} found matching your search.
                  </td>
                </tr>
              ) : (
                finalFilteredContacts.map((c, idx) => {
                  const isVip = c.type === 'VIP Customer' || c.productCategory === 'VIP';
                  const isWholesale = c.type === 'Wholesale Customer' || c.type === 'Corporate';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* 1. Index # */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* 2. Contact Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isVip && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9.5px] font-black">
                              <Crown className="w-3 h-3 text-amber-600" />
                              <span>VIP</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Type / Category Pill */}
                      {activeTab === 'customers' ? (
                        <td className="py-3.5 px-4">
                          {isVip ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              VIP
                            </span>
                          ) : isWholesale ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Wholesale
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Retail
                            </span>
                          )}
                        </td>
                      ) : (
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(c.productCategory)}`}>
                            {c.productCategory || 'Accessories & Gadgets'}
                          </span>
                        </td>
                      )}

                      {/* 4. Contact Person (For Suppliers tab) */}
                      {activeTab === 'suppliers' && (
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {c.contactPerson || 'Reception'}
                        </td>
                      )}

                      {/* 5. Phone (Highlighted in sky blue font) */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#0284c7] tracking-tight">
                          {c.phone || '-'}
                        </span>
                      </td>

                      {/* 6. Address */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-sm truncate" title={c.address || c.city}>
                        {c.address || (c.city ? `${c.city} Township` : '-')}
                      </td>

                      {/* 7. Action Icons (Edit Pencil & Delete Trash) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete record "${c.name}"?`)) {
                                  onDeletePartner(c.id);
                                  showToast(`Record "${c.name}" deleted.`);
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {editingPartner 
                    ? `Edit ${activeTab === 'customers' ? 'Customer' : 'Supplier'} • ${editingPartner.name}` 
                    : `+ Add New ${activeTab === 'customers' ? 'Customer' : 'Supplier'}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeTab === 'customers' 
                    ? 'Enter customer name, customer type, product preference and address' 
                    : 'Enter supplier name, category, contact person and address'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              {/* Name Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {activeTab === 'customers' ? 'Customer Name *' : 'Supplier Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                  placeholder={activeTab === 'customers' ? 'e.g. U Kyaw Zayar, Daw Thida Lwin' : 'e.g. Nibban, Citicom, MSI'}
                />
              </div>

              {/* Customer Type (Only for Customer) */}
              {activeTab === 'customers' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerTypeOption })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="VIP">VIP Customer</option>
                  </select>
                </div>
              )}

              {/* Category Dropdown (Only for Supplier) */}
              {activeTab === 'suppliers' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategoryOption })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Accessories & Gadgets">Accessories &amp; Gadget</option>
                    <option value="Smartphone & Tablet">Smartphone &amp; Tablet</option>
                    <option value="Laptop & Computer">Laptop &amp; Computer</option>
                    <option value="Service & Spare Part">Service &amp; Spare Part</option>
                  </select>
                </div>
              )}

              {/* Contact Person (Only for Supplier) */}
              {activeTab === 'suppliers' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                    placeholder="Reception / Sales Rep / Manager"
                  />
                </div>
              )}

              {/* Phone No Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone No *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500 text-[#0284c7]"
                  placeholder="09..."
                />
              </div>

              {/* Address Field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-purple-500"
                  placeholder="Physical store or residential address"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingPartner ? 'Update Record' : 'Save Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIP Rules & Loyalty Configuration Modal */}
      {isVipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-amber-200 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950">
                    👑 VIP Rules &amp; Tier Thresholds
                  </h3>
                  <p className="text-[11px] text-amber-800 font-medium">
                    Configure automatic VIP qualification criteria &amp; benefits
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVipModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVipRules} className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Minimum Total Spending (MMK) for VIP
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={vipConfig.minAmount}
                    onChange={(e) => setVipConfig({ ...vipConfig, minAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-amber-950"
                  />
                  <span className="text-[10.5px] text-amber-800 mt-1 block">
                    Current: {formatMMK(vipConfig.minAmount)} (Spend on mobile &amp; laptop devices)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">
                    Minimum Device Purchase Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={vipConfig.minPurchases}
                    onChange={(e) => setVipConfig({ ...vipConfig, minPurchases: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-amber-950"
                  />
                  <span className="text-[10.5px] text-amber-800 mt-1 block">
                    Customer qualifies when buying at least {vipConfig.minPurchases} devices
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoPromoteCheck"
                    checked={vipConfig.autoPromote}
                    onChange={(e) => setVipConfig({ ...vipConfig, autoPromote: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <label htmlFor="autoPromoteCheck" className="text-xs font-bold text-amber-950 cursor-pointer">
                    Enable Automatic VIP Promotion in Sales POS
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVipModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save VIP Rules</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
