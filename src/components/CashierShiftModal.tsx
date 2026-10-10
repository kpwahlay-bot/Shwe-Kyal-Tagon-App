import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Wallet, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { CashierShift, Branch, UserAccount, DailySale, DailyExpense } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';

interface CashierShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeShift: CashierShift | null;
  onStartShift: (openingCash: number, notes?: string) => void;
  onCloseShift: (
    actualCash: number, 
    expectedCash: number, 
    notes?: string
  ) => void;
  shifts?: CashierShift[];
  sales?: DailySale[];
  expenses?: DailyExpense[];
  currentUser: UserAccount;
  currentBranch?: Branch;
  branch?: Branch;
}

export const CashierShiftModal: React.FC<CashierShiftModalProps> = ({
  isOpen,
  onClose,
  activeShift,
  onStartShift,
  onCloseShift,
  shifts = [],
  sales = [],
  expenses = [],
  currentUser,
  currentBranch: rawCurrentBranch,
  branch,
}) => {
  const currentBranch = rawCurrentBranch || branch || {
    id: 'branch-1',
    code: 'B1',
    name: 'Main Branch',
    city: 'Yangon',
    address: 'Yangon',
    phone: '',
  };
  // Mode: 'CURRENT' (live shift / start shift) or 'HISTORY' (past Z-Reports)
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');
  const [openingFloatInput, setOpeningFloatInput] = useState<number>(0);
  const [startNotes, setStartNotes] = useState('');

  // End Shift state
  const [actualCashCounted, setActualCashCounted] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [selectedZReport, setSelectedZReport] = useState<CashierShift | null>(null);

  // Calculate live shift numbers for current active shift
  const shiftMetrics = useMemo(() => {
    if (!activeShift) {
      return {
        openingCash: 0,
        cashSales: 0,
        digitalSales: 0,
        cashExpenses: 0,
        totalSalesCount: 0,
        expectedCash: 0,
      };
    }

    const shiftStart = new Date(activeShift.startTime).getTime();

    // Sales made in this branch during this shift
    const relevantSales = sales.filter((s) => {
      const saleTime = new Date(s.createdAt).getTime();
      return s.branchId === activeShift.branchId && saleTime >= shiftStart;
    });

    const cashSales = relevantSales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + (s.paidAmount || s.salePrice || 0), 0);

    const digitalSales = relevantSales
      .filter((s) => s.paymentMethod !== 'Cash')
      .reduce((sum, s) => sum + (s.paidAmount || s.salePrice || 0), 0);

    // Expenses made in cash during this shift
    const relevantExpenses = expenses.filter((e) => {
      const expTime = new Date(e.createdAt).getTime();
      return (
        e.branchId === activeShift.branchId &&
        expTime >= shiftStart &&
        e.paymentMethod === 'Cash'
      );
    });

    const cashExpenses = relevantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const expectedCash = (activeShift.openingCash || 0) + cashSales - cashExpenses;

    return {
      openingCash: activeShift.openingCash || 0,
      cashSales,
      digitalSales,
      cashExpenses,
      totalSalesCount: relevantSales.length,
      expectedCash,
    };
  }, [activeShift, sales, expenses]);

  if (!isOpen) return null;

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartShift(Number(openingFloatInput) || 0, startNotes);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCloseShift(
      Number(actualCashCounted) || 0,
      shiftMetrics.expectedCash,
      closeNotes
    );
    setIsConfirmingClose(false);
  };

  const discrepancy = (Number(actualCashCounted) || 0) - shiftMetrics.expectedCash;

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Cashier Shift Handover & Z-Report
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Branch POS counter shift management and daily cash reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('CURRENT')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'CURRENT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Current Shift
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Shift Logs ({shifts.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'CURRENT' ? (
            activeShift ? (
              /* ACTIVE SHIFT IN PROGRESS / CLOSING WORKFLOW */
              <div className="space-y-4">
                {/* Active Shift Header Badge */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                        <span>Shift #{activeShift.shiftNumber} (Active)</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded-full font-bold">
                          OPEN
                        </span>
                      </div>
                      <div className="text-xs text-emerald-800/80 mt-0.5">
                        Cashier: <strong>{activeShift.cashierName}</strong> • Started at{' '}
                        {formatDateDMY(activeShift.startTime.split('T')[0])}{' '}
                        {new Date(activeShift.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-emerald-700 font-semibold">Opening Float</div>
                    <div className="text-sm font-extrabold font-mono text-emerald-900">
                      {formatMMK(activeShift.openingCash)}
                    </div>
                  </div>
                </div>

                {/* Real-time Drawer Metrics (X-Report stats) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Cash Sales</div>
                    <div className="text-sm font-extrabold font-mono text-slate-900 mt-1">
                      {formatMMK(shiftMetrics.cashSales)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {shiftMetrics.totalSalesCount} transactions
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Digital / KPay</div>
                    <div className="text-sm font-extrabold font-mono text-slate-900 mt-1">
                      {formatMMK(shiftMetrics.digitalSales)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Bank / Digital</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Cash Outflow</div>
                    <div className="text-sm font-extrabold font-mono text-rose-600 mt-1">
                      - {formatMMK(shiftMetrics.cashExpenses)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Drawer Expenses</div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="text-[11px] font-bold text-amber-900 uppercase">Expected Cash</div>
                    <div className="text-sm font-extrabold font-mono text-amber-950 mt-1">
                      {formatMMK(shiftMetrics.expectedCash)}
                    </div>
                    <div className="text-[10px] text-amber-800 mt-0.5">In Cash Drawer</div>
                  </div>
                </div>

                {/* Shift Close / Handover Form */}
                <div className="pt-2">
                  {!isConfirmingClose ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActualCashCounted(shiftMetrics.expectedCash);
                        setIsConfirmingClose(true);
                      }}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <span>End Shift & Reconcile Z-Report</span>
                    </button>
                  ) : (
                    <form onSubmit={handleCloseSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Physical Cash Drawer Count</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClose(false)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Actual Physical Cash in Drawer
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={actualCashCounted}
                            onChange={(e) => setActualCashCounted(Number(e.target.value))}
                            autoFocus
                            className="w-full pl-3 pr-20 py-2.5 text-base font-extrabold font-mono bg-white border-2 border-amber-400 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                            MMK
                          </span>
                        </div>
                      </div>

                      {/* Discrepancy Display */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          discrepancy === 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : discrepancy > 0
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <span>
                          {discrepancy === 0
                            ? 'Status: Balanced (Exact Match)'
                            : discrepancy > 0
                            ? 'Status: Cash Over'
                            : 'Status: Cash Short'}
                        </span>
                        <span className="font-mono text-sm">
                          {discrepancy >= 0 ? `+${formatMMK(discrepancy)}` : formatMMK(discrepancy)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Shift Handover Notes / Remarks
                        </label>
                        <input
                          type="text"
                          value={closeNotes}
                          onChange={(e) => setCloseNotes(e.target.value)}
                          placeholder="Discrepancy explanation or handover remarks..."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingClose(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Close Shift & Save Z-Report</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* START NEW SHIFT FORM */
              <form onSubmit={handleStartSubmit} className="p-4 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="text-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900">
                    Start Cashier Shift
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the opening drawer float before initiating sales transactions
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Opening Drawer Float / Cash
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={openingFloatInput}
                      onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                      placeholder="50000"
                      className="w-full pl-3 pr-20 py-2.5 text-base font-extrabold font-mono bg-white border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-hidden"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      MMK
                    </span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0, 30000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setOpeningFloatInput(amt)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {amt === 0 ? '0 Ks' : formatNumber(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shift Start Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={startNotes}
                    onChange={(e) => setStartNotes(e.target.value)}
                    placeholder="e.g. Morning shift, float counted and verified..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Open Shift & Start POS Selling</span>
                </button>
              </form>
            )
          ) : (
            /* SHIFT LOGS / HISTORY TABLE */
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700">Past Shift Z-Reports</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2.5">Shift #</th>
                      <th className="p-2.5">Date & Cashier</th>
                      <th className="p-2.5 text-right">Cash Sales</th>
                      <th className="p-2.5 text-right">Actual In Drawer</th>
                      <th className="p-2.5 text-right">Discrepancy</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-mono text-slate-900">
                          {s.shiftNumber}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900">{s.cashierName}</div>
                          <div className="text-[10px] text-slate-400">
                            {formatDateDMY(s.startTime.split('T')[0])}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          {formatMMK(s.cashSalesTotal || 0)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatMMK(s.actualCashCounted || s.openingCash)}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {s.cashDiscrepancy !== undefined ? (
                            <span
                              className={`font-bold ${
                                s.cashDiscrepancy === 0
                                  ? 'text-emerald-700'
                                  : s.cashDiscrepancy > 0
                                  ? 'text-blue-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {s.cashDiscrepancy >= 0
                                ? `+${formatMMK(s.cashDiscrepancy)}`
                                : formatMMK(s.cashDiscrepancy)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                          No previous shift records found.
                        </td>
                      </tr>
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
