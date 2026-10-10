import React, { useState } from 'react';
import { DailyExpense, Branch, UserAccount, MYANMAR_PAYMENT_METHODS, hasGlobalBranchAccess, canUserDelete } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';
import { DateRangeFilter, DateFilterState, isDateWithinFilter } from './DateRangeFilter';
import { FormattedNumberInput } from './FormattedNumberInput';
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  Calendar, 
  Filter, 
  Trash2, 
  Fuel, 
  Utensils, 
  Home, 
  Truck, 
  Package, 
  Layers, 
  X, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';

interface DailyExpensesLedgerProps {
  expenses: DailyExpense[];
  branches: Branch[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  onAddExpense: (expense: DailyExpense) => void;
  onDeleteExpense: (id: string) => void;
}

export const DailyExpensesLedger: React.FC<DailyExpensesLedgerProps> = ({
  expenses,
  branches,
  currentUser,
  activeBranchFilter,
  onAddExpense,
  onDeleteExpense,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'ALL',
    startDate: todayStr,
    endDate: todayStr,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Global Escape key listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    branchId: currentUser.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser.branchId,
    title: '',
    category: 'Electricity & Generator Fuel',
    amount: 0,
    paymentMethod: 'Cash' as DailyExpense['paymentMethod'],
    recordedBy: currentUser.displayName,
    notes: '',
  });

  const categories = [
    'Store Rent',
    'Electricity & Generator Fuel',
    'Staff Meals & Refreshments',
    'Shipping & Logistics',
    'Store Supplies & Packaging',
    'Marketing & Promo',
    'General & Maintenance',
  ];

  // Filtered Expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchesDate = isDateWithinFilter(exp.date, dateFilter);
    const matchesBranch = activeBranchFilter === 'ALL' || exp.branchId === activeBranchFilter;
    const matchesCategory = selectedCategory === 'ALL' || exp.category === selectedCategory;
    return matchesDate && matchesBranch && matchesCategory;
  });

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleOpenAddModal = () => {
    const defaultBranchId = activeBranchFilter !== 'ALL' ? activeBranchFilter : (currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || 'branch-1'));
    setFormData({
      date: new Date().toISOString().split('T')[0],
      branchId: defaultBranchId,
      title: '',
      category: 'Electricity & Generator Fuel',
      amount: 0,
      paymentMethod: 'Cash',
      recordedBy: currentUser.displayName,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter expense title.');
      return;
    }
    if (formData.amount <= 0) {
      alert('Please specify an amount greater than 0.');
      return;
    }

    const branch = branches.find((b) => b.id === formData.branchId);

    const newExpense: DailyExpense = {
      id: `exp-${Date.now()}`,
      date: formData.date,
      branchId: formData.branchId,
      branchName: branch?.code || 'YGN-1 CS',
      title: formData.title,
      category: formData.category,
      amount: Number(formData.amount) || 0,
      paymentMethod: formData.paymentMethod,
      recordedBy: formData.recordedBy,
      notes: formData.notes,
      createdAt: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Store Operating Expenses</span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              {filteredExpenses.length} Receipts
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log generator fuel, store rents, staff meals, shipping freight, and operational expenditures
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-purple-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Filtered Total Expenses
          </span>
          <p className="text-xl font-black text-rose-700 mt-1 font-mono">
            -{formatMMK(totalExpenseAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Deducted from monthly gross profit
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Recorded Vouchers
          </span>
          <p className="text-xl font-black text-slate-900 mt-1 font-mono">
            {filteredExpenses.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {dateFilter.preset === 'DAILY' && `Filter: Daily (${dateFilter.startDate || todayStr})`}
            {dateFilter.preset === 'RANGE' && `Range: ${dateFilter.startDate} ~ ${dateFilter.endDate}`}
            {dateFilter.preset === 'ALL' && 'Filter: All Dates'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
            Avg per Expense
          </span>
          <p className="text-xl font-black text-purple-900 mt-1 font-mono">
            {formatMMK(
              filteredExpenses.length > 0
                ? Math.round(totalExpenseAmount / filteredExpenses.length)
                : 0
            )}
          </p>
          <p className="text-[11px] text-purple-600 mt-0.5">
            Operational spending rate
          </p>
        </div>
      </div>

      {/* Table and Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date filter */}
            <DateRangeFilter
              value={dateFilter}
              onChange={setDateFilter}
              totalCount={filteredExpenses.length}
              label="Expense Date"
            />

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Expense Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-bold text-slate-500">
            Total {filteredExpenses.length} vouchers
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">DATE</th>
                <th className="py-3 px-4 w-28">BRANCH</th>
                <th className="py-3 px-4 min-w-[200px]">EXPENSE TITLE</th>
                <th className="py-3 px-4 w-44">CATEGORY</th>
                <th className="py-3 px-4 w-32 text-right bg-rose-50/50 text-rose-800">AMOUNT</th>
                <th className="py-3 px-4 w-28">PAYMENT</th>
                <th className="py-3 px-4 w-32">RECORDED BY</th>
                <th className="py-3 px-4 w-16 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-600">{formatDateDMY(e.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{e.branchName}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{e.title}</div>
                    {e.notes && <div className="text-[11px] text-slate-400 mt-0.5">{e.notes}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 bg-rose-50/20">
                    -{formatMMK(e.amount)}
                  </td>
                  <td className="py-3 px-4">
                    {(() => {
                      const methodMeta = MYANMAR_PAYMENT_METHODS.find(
                        (m) => m.id === e.paymentMethod || m.name === e.paymentMethod
                      );
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${methodMeta?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {methodMeta?.name || e.paymentMethod}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{e.recordedBy}</td>
                  <td className="py-3 px-4 text-center">
                    {canUserDelete(currentUser) ? (
                      <button
                        onClick={() => onDeleteExpense(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Voucher"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No expenses recorded for this filter. Click "+ Record Expense" to log a voucher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Operational Expense</h3>
                  <p className="text-xs text-slate-500">Log daily operational expense</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch *</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    disabled={!hasGlobalBranchAccess(currentUser)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name}
                      </option>
                    ))}
                  </select>
                  {!hasGlobalBranchAccess(currentUser) && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      * Restricted to your assigned branch
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  placeholder="e.g. Generator Diesel Fuel (20L) / Store Rent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Amount (MMK) *
                  </label>
                  <FormattedNumberInput
                    value={formData.amount}
                    onChange={(val) => setFormData({ ...formData, amount: val })}
                    min={0}
                    showLiveBadge={true}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-rose-900 font-mono font-bold text-right"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
                  >
                    {MYANMAR_PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} ({pm.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recorded By</label>
                  <input
                    type="text"
                    value={formData.recordedBy}
                    onChange={(e) => setFormData({ ...formData, recordedBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  placeholder="Optional receipt or voucher notes"
                />
              </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
