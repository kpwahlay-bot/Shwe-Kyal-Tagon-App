import React, { useState, useMemo, useEffect } from 'react';
import { 
  Banknote, 
  Landmark, 
  Wallet, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  Building2, 
  X, 
  Printer, 
  FileSpreadsheet, 
  Check, 
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { DailySale, Branch, UserAccount, DailyCashAllocation, TreasuryAccount, canUserDelete, isMDUser } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';

interface DailyCashAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: DailySale[];
  branches: Branch[];
  currentUser: UserAccount;
  allocations: DailyCashAllocation[];
  onSaveAllocation: (allocation: DailyCashAllocation) => void;
  onDeleteAllocation: (id: string) => void;
  treasuryAccounts?: TreasuryAccount[];
}

export const DailyCashAllocationModal: React.FC<DailyCashAllocationModalProps> = ({
  isOpen,
  onClose,
  sales,
  branches,
  currentUser,
  allocations,
  onSaveAllocation,
  onDeleteAllocation,
  treasuryAccounts = [],
}) => {
  const isMD = isMDUser(currentUser);
  const canDelete = canUserDelete(currentUser);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentUser.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser.branchId
  );

  // Allocation input amounts
  const [paymentUsed, setPaymentUsed] = useState<number>(0);
  const [shopDrawerKept, setShopDrawerKept] = useState<number>(0);
  const [transferredToMD, setTransferredToMD] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'allocate' | 'history'>('allocate');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute total cash collected for this branch and date
  const branchSalesOnDate = useMemo(() => {
    return sales.filter((s) => {
      const matchDate = s.date === selectedDate;
      const matchBranch = selectedBranchId === 'ALL' || s.branchId === selectedBranchId;
      return matchDate && matchBranch;
    });
  }, [sales, selectedDate, selectedBranchId]);

  const totalCashCollected = useMemo(() => {
    return branchSalesOnDate.reduce((acc, s) => {
      // If paymentMethod is Cash
      if (s.paymentMethod === 'Cash') {
        return acc + (s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0));
      }
      // If mixed or explicit cashAmount
      if (s.cashAmount && s.cashAmount > 0) {
        return acc + s.cashAmount;
      }
      return acc;
    }, 0);
  }, [branchSalesOnDate]);

  const totalNonCashCollected = useMemo(() => {
    return branchSalesOnDate.reduce((acc, s) => {
      if (s.paymentMethod !== 'Cash') {
        const amt = s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0);
        return acc + amt - (s.cashAmount || 0);
      }
      return acc;
    }, 0);
  }, [branchSalesOnDate]);

  // Total allocated vs collected
  const totalAllocated = Number(paymentUsed || 0) + Number(shopDrawerKept || 0) + Number(transferredToMD || 0);
  const balanceDifference = totalCashCollected - totalAllocated;

  // Prepopulate if existing allocation exists for this date and branch
  useEffect(() => {
    const existing = allocations.find(
      (a) => a.date === selectedDate && a.branchId === selectedBranchId
    );
    if (existing) {
      setPaymentUsed(existing.paymentUsed);
      setShopDrawerKept(existing.shopDrawerKept);
      setTransferredToMD(existing.transferredToMD);
      setNotes(existing.notes || '');
    } else {
      setPaymentUsed(0);
      setShopDrawerKept(0);
      setTransferredToMD(totalCashCollected); // by default allocate all surplus to MD
      setNotes('');
    }
  }, [selectedDate, selectedBranchId, allocations, totalCashCollected]);

  const handleAutoFillRemainderToMD = () => {
    const remainder = Math.max(0, totalCashCollected - Number(paymentUsed || 0) - Number(shopDrawerKept || 0));
    setTransferredToMD(remainder);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const branchObj = branches.find((b) => b.id === selectedBranchId);
    const newAllocation: DailyCashAllocation = {
      id: `dca-${selectedDate}-${selectedBranchId}`,
      date: selectedDate,
      branchId: selectedBranchId,
      branchName: branchObj ? `${branchObj.code} - ${branchObj.name}` : selectedBranchId,
      totalCashCollected,
      paymentUsed: Number(paymentUsed || 0),
      shopDrawerKept: Number(shopDrawerKept || 0),
      transferredToMD: Number(transferredToMD || 0),
      notes: notes.trim(),
      recordedBy: currentUser.displayName,
      createdAt: new Date().toISOString(),
    };

    onSaveAllocation(newAllocation);
    setActiveTab('history');
  };

  if (!isOpen) return null;

  const currentBranchName = branches.find((b) => b.id === selectedBranchId)?.name || 'Selected Branch';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-400">
                Daily Cash Allocation
              </h2>
              <p className="text-xs text-slate-300">
                Daily Cash Collected ➔ Payment Expenses ➔ Shop Cash Kept ➔ Transferred to MD
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tab switcher */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('allocate')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'allocate'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Allocate Daily Cash
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Allocation History ({allocations.length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Date: <span className="font-bold text-slate-900">{selectedDate}</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {activeTab === 'allocate' ? (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Date & Branch Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Settlement Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Branch *</span>
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Daily Cash Summary Display */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border-2 border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Total Cash Collected ({selectedDate})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {branchSalesOnDate.length} Vouchers
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                    {formatMMK(totalCashCollected)}
                  </div>
                  {totalNonCashCollected > 0 && (
                    <div className="text-xs text-slate-500 font-medium">
                      (Bank / KPay Income: {formatMMK(totalNonCashCollected)})
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Main Allocation Input Channels */}
              <div className="space-y-4">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Cash Allocation Channels</span>
                  <button
                    type="button"
                    onClick={handleAutoFillRemainderToMD}
                    className="text-amber-700 hover:text-amber-800 text-[11px] font-bold hover:underline cursor-pointer"
                  >
                    Send Remainder to MD
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Channel 1: Payment Used */}
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-800">
                      <Receipt className="w-4 h-4" />
                      <label className="text-xs font-bold">1. Payment Used</label>
                    </div>
                    <p className="text-[10px] text-rose-700">Suppliers, delivery, emergency petty expenses</p>
                    <input
                      type="number"
                      min={0}
                      value={paymentUsed}
                      onChange={(e) => setPaymentUsed(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-sm font-black text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-mono"
                    />
                  </div>

                  {/* Channel 2: Shop Drawer Kept */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Wallet className="w-4 h-4" />
                      <label className="text-xs font-bold">2. Shop Drawer Kept</label>
                    </div>
                    <p className="text-[10px] text-blue-700">Change cash and reserve for next day</p>
                    <input
                      type="number"
                      min={0}
                      value={shopDrawerKept}
                      onChange={(e) => setShopDrawerKept(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-sm font-black text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                    />
                  </div>

                  {/* Channel 3: Transferred to MD */}
                  <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Landmark className="w-4 h-4" />
                      <label className="text-xs font-bold">3. Transferred to MD</label>
                    </div>
                    <p className="text-[10px] text-amber-800">Remaining cash remitted to MD bank account</p>
                    <input
                      type="number"
                      min={0}
                      value={transferredToMD}
                      onChange={(e) => setTransferredToMD(Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Allocation Balance Verification */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Allocated Total:</span>
                  <span className="font-mono font-bold text-white text-sm">{formatMMK(totalAllocated)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-2">
                  <span>Difference:</span>
                  <div className="flex items-center gap-2">
                    {balanceDifference === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Balanced</span>
                      </span>
                    ) : balanceDifference > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Remaining: {formatMMK(balanceDifference)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Over-allocated: {formatMMK(Math.abs(balanceDifference))}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes & Reference
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Transferred to MD KBZ Bank account, kept 50,000 for shop drawer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Cash Allocation</span>
                </button>
              </div>
            </form>
          ) : (
            /* History Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">
                  Daily Cash Allocation History
                </h3>
                <span className="text-xs text-slate-500">
                  Total: {allocations.length} records
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Date & Branch</th>
                      <th className="py-3 px-4 text-right">Total Cash</th>
                      <th className="py-3 px-4 text-right text-rose-700">Payment Used</th>
                      <th className="py-3 px-4 text-right text-blue-700">Shop Drawer</th>
                      <th className="py-3 px-4 text-right text-amber-700">MD Transfer</th>
                      <th className="py-3 px-4">Recorded By</th>
                      {isMD && <th className="py-3 px-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No cash allocation records found
                        </td>
                      </tr>
                    ) : (
                      allocations.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{formatDateDMY(item.date)}</div>
                            <div className="text-[11px] text-slate-500">{item.branchName}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-900">
                            {formatMMK(item.totalCashCollected)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                            {formatMMK(item.paymentUsed)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                            {formatMMK(item.shopDrawerKept)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                            {formatMMK(item.transferredToMD)}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{item.recordedBy}</div>
                            {item.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.notes}</div>}
                          </td>
                          {canDelete && (
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => onDeleteAllocation(item.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
