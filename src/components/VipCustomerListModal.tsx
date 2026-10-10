import React, { useState, useMemo } from 'react';
import { DailySale, CustomerProfile, VipConfig } from '../types';
import { formatMMK } from '../utils/formatters';
import { 
  buildCustomerProfiles, 
  loadVipConfig, 
  saveVipConfig, 
  saveVipOverride,
  loadVipOverrides,
  getCustomerPurchaseHistory
} from '../utils/customerHelper';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import { 
  X, 
  Crown, 
  Search, 
  Sparkles, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Award, 
  Sliders, 
  Check, 
  ArrowUpDown,
  History,
  TrendingUp,
  Users
} from 'lucide-react';

interface VipCustomerListModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: DailySale[];
  onSelectVoucher?: (sale: DailySale) => void;
}

export const VipCustomerListModal: React.FC<VipCustomerListModalProps> = ({
  isOpen,
  onClose,
  sales,
  onSelectVoucher,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'VIP_ONLY' | 'AUTO_QUALIFIED'>('VIP_ONLY');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // VIP Configuration state
  const [vipConfig, setVipConfig] = useState<VipConfig>(() => loadVipConfig());
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => loadVipOverrides());

  // Customer History drawer state
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerProfile | null>(null);

  // Build aggregated customer profiles from sales data
  const customerProfiles = useMemo(() => {
    return buildCustomerProfiles(sales, vipConfig, overrides);
  }, [sales, vipConfig, overrides]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCustomers = customerProfiles.length;
    const vipCustomers = customerProfiles.filter((c) => c.isVip).length;
    const totalItemsPurchased = customerProfiles.reduce((sum, c) => sum + c.totalItemsPurchased, 0);
    const totalRevenue = customerProfiles.reduce((sum, c) => sum + c.totalSpent, 0);
    return { totalCustomers, vipCustomers, totalItemsPurchased, totalRevenue };
  }, [customerProfiles]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    let list = customerProfiles;

    if (tabFilter === 'VIP_ONLY') {
      list = list.filter((c) => c.isVip);
    } else if (tabFilter === 'AUTO_QUALIFIED') {
      list = list.filter((c) => c.autoVipQualified);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((c) => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.township && c.township.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customerProfiles, tabFilter, searchTerm]);

  // Toggle manual VIP status
  const handleToggleVip = (customer: CustomerProfile) => {
    const newStatus = !customer.isVip;
    saveVipOverride(customer.phone, newStatus);
    setOverrides(loadVipOverrides());
  };

  // Update VIP config threshold
  const handleSaveConfig = (newConfig: VipConfig) => {
    setVipConfig(newConfig);
    saveVipConfig(newConfig);
    setIsConfigOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-between border-b border-amber-400/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950 text-amber-400 shadow-md shadow-slate-950/20">
              <Crown className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                  VIP Customer Management
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-950 text-amber-300">
                  {metrics.vipCustomers} VIPs
                </span>
              </div>
              <p className="text-xs text-slate-900/80 font-medium">
                Customer purchase count & auto-promoted VIP retail loyalty directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>VIP Threshold ({vipConfig.minItems} Items)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-950 hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Panel (Collapsible) */}
        {isConfigOpen && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  Auto-VIP Qualification Rules
                </h3>
              </div>
              <span className="text-xs text-amber-800 font-medium">
                Automatically promoted to VIP when meeting items or spend threshold
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Min Items Purchased
                </label>
                <input
                  type="number"
                  min={1}
                  value={vipConfig.minItems}
                  onChange={(e) => setVipConfig({ ...vipConfig, minItems: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10.5px] text-slate-500 mt-0.5 block">
                  Default: 5 items or more
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Min Purchase Visits
                </label>
                <input
                  type="number"
                  min={1}
                  value={vipConfig.minPurchases}
                  onChange={(e) => setVipConfig({ ...vipConfig, minPurchases: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10.5px] text-slate-500 mt-0.5 block">
                  Default: 3 orders / vouchers
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Min Total Spend (MMK)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={vipConfig.minAmount}
                  onChange={(e) => setVipConfig({ ...vipConfig, minAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
                <span className="text-[10.5px] text-slate-500 mt-0.5 block">
                  Default: 500,000 MMK
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={vipConfig.autoPromote}
                  onChange={(e) => setVipConfig({ ...vipConfig, autoPromote: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Enable Automated Promotion to VIP List</span>
              </label>

              <button
                type="button"
                onClick={() => handleSaveConfig(vipConfig)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Save Threshold Settings
              </button>
            </div>
          </div>
        )}

        {/* Quick KPI Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Customers
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-slate-900">
                {metrics.totalCustomers}
              </span>
              <span className="text-xs text-slate-400 font-medium">registered</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-2xs">
            <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-600" />
              <span>VIP Members</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-amber-600">
                {metrics.vipCustomers}
              </span>
              <span className="text-xs text-amber-700 font-semibold">
                ({metrics.totalCustomers > 0 ? Math.round((metrics.vipCustomers / metrics.totalCustomers) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Items Sold
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-indigo-700">
                {metrics.totalItemsPurchased}
              </span>
              <span className="text-xs text-slate-400 font-medium">items</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Customer Revenue
            </span>
            <div className="text-lg font-mono font-black text-emerald-700 truncate" title={formatMMK(metrics.totalRevenue)}>
              {formatMMK(metrics.totalRevenue)}
            </div>
          </div>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setTabFilter('VIP_ONLY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'VIP_ONLY'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>VIP Customers ({metrics.vipCustomers})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Customers ({metrics.totalCustomers})</span>
            </button>

            <button
              type="button"
              onClick={() => setTabFilter('AUTO_QUALIFIED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                tabFilter === 'AUTO_QUALIFIED'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Qualified (≥{vipConfig.minItems} Items)</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by phone or name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Customer Name & Phone</th>
                <th className="py-2.5 px-3">Township</th>
                <th className="py-2.5 px-3 text-center">Orders</th>
                <th className="py-2.5 px-3 text-center">Total Items</th>
                <th className="py-2.5 px-3 text-right">Total Spent (MMK)</th>
                <th className="py-2.5 px-3">Last Visit</th>
                <th className="py-2.5 px-3 text-center">VIP Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProfiles.map((c) => (
                <tr
                  key={c.id}
                  className={`hover:bg-amber-50/40 transition-colors ${c.isVip ? 'bg-amber-50/20' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl shrink-0 ${c.isVip ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                        {c.isVip ? <Crown className="w-4 h-4 fill-slate-950" /> : <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {c.isVip && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-400 text-slate-950">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {c.township ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {c.township}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      {c.totalPurchaseCount}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${c.totalItemsPurchased >= vipConfig.minItems ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'}`}>
                      {c.totalItemsPurchased} items
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <span className="font-mono font-extrabold text-slate-900">
                      {formatMMK(c.totalSpent)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {c.lastPurchaseDate || '-'}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {c.isVip ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Award className="w-3 h-3 text-amber-600" />
                        <span>VIP Customer</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium text-slate-500 bg-slate-100">
                        Regular
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForHistory(c)}
                        className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="View Complete Customer History"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleVip(c)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                          c.isVip
                            ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                            : 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100'
                        }`}
                        title={c.isVip ? 'Remove from VIP' : 'Promote to VIP'}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{c.isVip ? 'Remove VIP' : 'Make VIP'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-600">No customer records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try searching with a different name or phone number</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>VIP Rule:</span>
            <span className="font-bold text-slate-700">
              Purchases ≥ {vipConfig.minItems} items or ≥ {vipConfig.minPurchases} visits auto-promoted to VIP list.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>

      {/* Customer Purchase History Modal */}
      {selectedCustomerForHistory && (
        <CustomerHistoryModal
          isOpen={Boolean(selectedCustomerForHistory)}
          onClose={() => setSelectedCustomerForHistory(null)}
          customer={selectedCustomerForHistory}
          historySales={getCustomerPurchaseHistory(selectedCustomerForHistory.phone || selectedCustomerForHistory.name, sales)}
          onSelectVoucher={(sale) => {
            if (onSelectVoucher) onSelectVoucher(sale);
            setSelectedCustomerForHistory(null);
          }}
        />
      )}
    </div>
  );
};
