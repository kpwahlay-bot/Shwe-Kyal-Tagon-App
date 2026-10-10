import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Building2,
  Gift,
  RotateCcw,
  Coins,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  Copy,
  CalendarCheck2,
  ExternalLink,
  DollarSign,
  Eye,
  History,
  FileText,
  X
} from 'lucide-react';
import { POSCustomerVoucherModal } from './POSCustomerVoucherModal';
import { 
  DailySale, 
  DailyExpense, 
  SalaryRecord, 
  PurchaseRecord, 
  TreasuryAccount, 
  TreasuryTransaction, 
  SupplierBenefit, 
  SupplierReturn, 
  InterBranchTransfer, 
  ContactPartner, 
  InventoryItem, 
  Branch, 
  UserAccount,
  Employee,
  SaleInstallment,
  isMDUser,
  isYaminnwe
} from '../types';
import { ProfitLossDashboard } from './ProfitLossDashboard';
import { DailyExpensesLedger } from './DailyExpensesLedger';
import { FinanceTreasuryLedger } from './FinanceTreasuryLedger';
import { SupplierClaimsAndBenefitsLedger } from './SupplierClaimsAndBenefitsLedger';
import { CustomerDebtPaymentModal } from './CustomerDebtPaymentModal';
import { getOrGenerateSaleInstallments } from './ContactPartners';
import { getMonthName, formatMMK, formatDateDMY, formatNumber } from '../utils/formatters';
import { normalizePhone } from '../utils/customerHelper';

export type FinancialSubTab = 'pl' | 'expenses' | 'customer_debt' | 'purchases' | 'suppliers' | 'rma';

interface FinancialManagementViewProps {
  initialSubTab?: FinancialSubTab;
  sales: DailySale[];
  expenses: DailyExpense[];
  salaryRecords: SalaryRecord[];
  purchases: PurchaseRecord[];
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  supplierBenefits?: SupplierBenefit[];
  supplierReturns?: SupplierReturn[];
  interBranchTransfers?: InterBranchTransfer[];
  contacts: ContactPartner[];
  inventory: InventoryItem[];
  branches: Branch[];
  employees?: Employee[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  setActiveBranchFilter: (branchId: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onAddExpense: (expense: DailyExpense) => void;
  onDeleteExpense: (id: string) => void;
  onAddPurchase: (purchase: PurchaseRecord) => void;
  onUpdatePurchase: (purchase: PurchaseRecord) => void;
  onDeletePurchase: (id: string) => void;
  onPaySupplierDebt: (supplierName: string, amount: number, accountId: string, method: string, notes?: string, poId?: string) => void;
  onTransferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => void;
  onAdjustAccountBalance: (accountId: string, newBalance: number, notes: string) => void;
  onAddBranchTransfer?: (
    transfer: Omit<InterBranchTransfer, 'id' | 'transferNo' | 'createdAt'>,
    settleNow: boolean
  ) => void;
  onSettleBranchPayment?: (transferId: string, method: string, notes?: string, accountId?: string) => void;
  onAddSupplierReturn?: (ret: SupplierReturn) => void;
  onSyncPoToInventory?: (po: PurchaseRecord) => void;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
  onAddContact?: (c: ContactPartner) => void;
  onUpdateContact?: (c: ContactPartner) => void;
  onDeleteContact?: (id: string) => void;
  onAddSupplierBenefit?: (b: SupplierBenefit) => void;
  onUpdateSupplierBenefit?: (b: SupplierBenefit) => void;
  onDeleteSupplierBenefit?: (id: string) => void;
  onSettleSupplierBenefit?: (id: string, method: string, accountId: string, notes?: string) => void;
  onDeleteSupplierReturn?: (id: string) => void;
  onClearAllSupplierReturns?: () => void;
  onSettleRma?: (
    rmaId: string,
    resolutionType: any,
    resolutionDetails?: any
  ) => void;
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
}

export const FinancialManagementView: React.FC<FinancialManagementViewProps> = ({
  initialSubTab = 'pl',
  sales,
  expenses,
  salaryRecords,
  purchases,
  treasuryAccounts,
  treasuryTransactions,
  supplierBenefits = [],
  supplierReturns = [],
  interBranchTransfers = [],
  contacts,
  inventory,
  branches,
  employees = [],
  currentUser,
  activeBranchFilter,
  setActiveBranchFilter,
  selectedMonth,
  setSelectedMonth,
  onAddExpense,
  onDeleteExpense,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onPaySupplierDebt,
  onTransferFunds,
  onAdjustAccountBalance,
  onAddBranchTransfer,
  onSettleBranchPayment,
  onAddSupplierReturn,
  onSyncPoToInventory,
  onNavigateToTab,
  onAddContact = () => {},
  onUpdateContact = () => {},
  onDeleteContact = () => {},
  onAddSupplierBenefit = () => {},
  onUpdateSupplierBenefit = () => {},
  onDeleteSupplierBenefit = () => {},
  onSettleSupplierBenefit = () => {},
  onDeleteSupplierReturn = () => {},
  onClearAllSupplierReturns = () => {},
  onSettleRma = () => {},
  onSettleCustomerDebt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<FinancialSubTab>(initialSubTab);
  const [debtSearchQuery, setDebtSearchQuery] = useState('');
  const [selectedDebtorForPayment, setSelectedDebtorForPayment] = useState<{
    customerName: string;
    customerPhone?: string;
    partnerId?: string;
    totalDebt: number;
    unpaidSales: DailySale[];
  } | null>(null);
  const [selectedSaleForVoucher, setSelectedSaleForVoucher] = useState<DailySale | null>(null);
  const [selectedSaleForHistory, setSelectedSaleForHistory] = useState<DailySale | null>(null);
  const [debtViewMode, setDebtViewMode] = useState<'vouchers' | 'debtors'>('vouchers');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isMD = isMDUser(currentUser);
  const isYamin = isYaminnwe(currentUser);
  const isManagerOrAdmin = currentUser.role === 'Sales Manager' || currentUser.role === 'Admin';
  const canModifyFinancials = isMD || isYamin;

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'pl' && !isMD) {
        setActiveSubTab('expenses');
      } else {
        setActiveSubTab(initialSubTab);
      }
    } else if (!isMD && activeSubTab === 'pl') {
      setActiveSubTab('expenses');
    }
  }, [initialSubTab, isMD]);

  // Aggregate customer credit debtors from sales transactions
  const debtorsList = useMemo(() => {
    const debtorMap = new Map<string, {
      customerName: string;
      customerPhone?: string;
      branchName?: string;
      totalPurchases: number;
      totalPaid: number;
      totalDebt: number;
      unpaidSales: DailySale[];
      partnerId?: string;
    }>();

    sales.forEach((s) => {
      const remainingDebt = s.remainingDebt !== undefined ? s.remainingDebt : (s.paymentStatus === 'CREDIT' ? (s.salePrice || 0) : 0);
      const total = s.salePrice || 0;
      const paid = s.paidAmount !== undefined ? s.paidAmount : (total - remainingDebt);
      const cName = (s.customerName || '').trim() || 'Walk-in Customer';
      const cPhone = (s.customerPhone || '').trim();
      const key = (cPhone ? normalizePhone(cPhone) : cName.toLowerCase());

      if (!debtorMap.has(key)) {
        debtorMap.set(key, {
          customerName: cName,
          customerPhone: cPhone || undefined,
          branchName: s.branchName,
          totalPurchases: 0,
          totalPaid: 0,
          totalDebt: 0,
          unpaidSales: [],
        });
      }

      const debtor = debtorMap.get(key)!;
      debtor.totalPurchases += total;
      debtor.totalPaid += paid;
      if (remainingDebt > 0) {
        debtor.totalDebt += remainingDebt;
        debtor.unpaidSales.push(s);
      }
    });

    return Array.from(debtorMap.values()).filter((d) => d.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [sales]);

  const totalOutstandingCustomerDebt = debtorsList.reduce((sum, d) => sum + d.totalDebt, 0);
  const totalUnpaidVouchersCount = debtorsList.reduce((sum, d) => sum + d.unpaidSales.length, 0);

  // Unpack all individual unpaid credit debt vouchers
  const allDebtVouchers = useMemo(() => {
    const list: DailySale[] = [];
    sales.forEach((s) => {
      const rem = s.remainingDebt !== undefined ? s.remainingDebt : (s.paymentStatus === 'CREDIT' ? (s.salePrice || 0) : 0);
      if (rem > 0) {
        list.push(s);
      }
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);

  const filteredDebtVouchers = useMemo(() => {
    if (!debtSearchQuery.trim()) return allDebtVouchers;
    const q = debtSearchQuery.toLowerCase().trim();
    return allDebtVouchers.filter((s) =>
      s.invoiceNo.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customerPhone && s.customerPhone.includes(q)) ||
      (s.itemName && s.itemName.toLowerCase().includes(q)) ||
      (s.branchName && s.branchName.toLowerCase().includes(q))
    );
  }, [allDebtVouchers, debtSearchQuery]);

  const filteredDebtors = useMemo(() => {
    if (!debtSearchQuery.trim()) return debtorsList;
    const q = debtSearchQuery.toLowerCase().trim();
    return debtorsList.filter(d => 
      d.customerName.toLowerCase().includes(q) ||
      (d.customerPhone && d.customerPhone.includes(q)) ||
      (d.branchName && d.branchName.toLowerCase().includes(q))
    );
  }, [debtorsList, debtSearchQuery]);

  const copyCustomerStatement = (debtor: typeof debtorsList[0]) => {
    let text = `📄 SHWE KYAL TAGON • CUSTOMER DEBT STATEMENT\n`;
    text += `Customer: ${debtor.customerName}\n`;
    if (debtor.customerPhone) text += `Phone: ${debtor.customerPhone}\n`;
    text += `Total Outstanding Balance Due: ${formatMMK(debtor.totalDebt)}\n`;
    text += `Open Invoices (${debtor.unpaidSales.length}):\n`;
    debtor.unpaidSales.forEach((s, idx) => {
      text += `${idx + 1}. Voucher #${s.invoiceNo} (${formatDateDMY(s.date)}) - Balance: ${formatMMK(s.remainingDebt || s.salePrice || 0)}\n`;
    });
    text += `\nPlease settle payment via authorized Shwe Kyal Tagon accounts.`;

    navigator.clipboard.writeText(text);
    showToast(`Debt statement for "${debtor.customerName}" copied to clipboard.`);
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

      {/* Consolidated Financial Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500">
                Consolidated Corporate Financial Management
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>Financial Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial P&amp;L Ledger • Operating Expenses • Customer Debts (AR) • Purchases (AP) • Supplier Claims &amp; RMA
            </p>
          </div>

          {/* Sub-Category Navigation Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-bold flex-wrap">
            {isMD && (
              <button
                onClick={() => setActiveSubTab('pl')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'pl'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>1. P&amp;L Ledger</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('expenses')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'expenses'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-600" />
              <span>{isMD ? '2. Operating Expenses' : '1. Operating Expenses'}</span>
            </button>

            <button
              onClick={() => setActiveSubTab('customer_debt')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'customer_debt'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Customer Debt (AR)</span>
              {debtorsList.length > 0 && (
                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                  {debtorsList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('purchases')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'purchases'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              <span>4. Purchases &amp; Payables</span>
            </button>

            <button
              onClick={() => setActiveSubTab('suppliers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-purple-600" />
              <span>5. Supplier Claims</span>
            </button>

            <button
              onClick={() => setActiveSubTab('rma')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'rma'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>6. RMA Defect Claims</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-CATEGORY 1: EXECUTIVE FINANCIAL P&L LEDGER */}
      {activeSubTab === 'pl' && (
        isMD ? (
          <div className="space-y-4">
            <ProfitLossDashboard
              sales={sales}
              expenses={expenses}
              salaryRecords={salaryRecords}
              supplierBenefits={supplierBenefits}
              branches={branches}
              activeBranchFilter={activeBranchFilter}
              setActiveBranchFilter={setActiveBranchFilter}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          </div>
        ) : (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
              🛡️
            </div>
            <h3 className="font-bold text-base text-rose-900">
              Access Restricted: Financial P&amp;L Ledger
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              Managing Director (MD) သာလျှင် ကုမ္ပဏီအရှုံးအမြတ် (P&amp;L Ledger) စာရင်းကို ကြည့်ရှုခွင့်ရှိပါသည်။ Operation, Sales Manager, Admin, Finance, Cashier နှင့် Staff များ ကြည့်ရှုခွင့် လုံးဝ မရှိပါ။
            </p>
          </div>
        )
      )}

      {/* SUB-CATEGORY 2: OPERATING EXPENSES LEDGER */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <DailyExpensesLedger
            expenses={expenses}
            branches={branches}
            currentUser={currentUser}
            activeBranchFilter={activeBranchFilter}
            onAddExpense={onAddExpense}
            onDeleteExpense={onDeleteExpense}
          />
        </div>
      )}

      {/* SUB-CATEGORY 3: CUSTOMER DEBT & RECEIVABLES (ACCOUNTS RECEIVABLE / AR) */}
      {activeSubTab === 'customer_debt' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4.5 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl text-white shadow-md border border-indigo-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  <span>Total Customer Receivables (AR)</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Outstanding Due
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-indigo-200">
                {formatMMK(totalOutstandingCustomerDebt)}
              </div>
              <p className="text-[11px] text-slate-300">
                Total outstanding credit balances from all branch sales
              </p>
            </div>

            <div className="p-4.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Active Credit Debtors</span>
              </span>
              <div className="text-2xl font-black font-mono text-slate-900">
                {debtorsList.length} <span className="text-xs font-normal text-slate-500">clients</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Customers with active pending balance
              </p>
            </div>

            <div className="p-4.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>Unsettled Credit Vouchers</span>
              </span>
              <div className="text-2xl font-black font-mono text-amber-600">
                {totalUnpaidVouchersCount} <span className="text-xs font-normal text-slate-500">invoices</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Open sales transactions awaiting settlement
              </p>
            </div>
          </div>

          {/* Debt View Selector & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
            {/* Header & View Switcher */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => setDebtViewMode('vouchers')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      debtViewMode === 'vouchers'
                        ? 'bg-white text-indigo-900 shadow-xs font-extrabold border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Debt Vouchers ({filteredDebtVouchers.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDebtViewMode('debtors')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      debtViewMode === 'debtors'
                        ? 'bg-white text-indigo-900 shadow-xs font-extrabold border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    <span>Debtor Account Summary ({filteredDebtors.length})</span>
                  </button>
                </div>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={debtViewMode === 'vouchers' ? "Search voucher #, customer, phone, item..." : "Search debtor name, phone, branch..."}
                  value={debtSearchQuery}
                  onChange={(e) => setDebtSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            {/* VIEW MODE 1: INDIVIDUAL DEBT VOUCHERS LIST */}
            {debtViewMode === 'vouchers' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[130px]">Voucher #</th>
                      <th className="py-3 px-4 min-w-[110px]">Date</th>
                      <th className="py-3 px-4 min-w-[160px]">Customer Name</th>
                      <th className="py-3 px-4 min-w-[120px]">Phone</th>
                      <th className="py-3 px-4 min-w-[180px]">Item Description</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Total Price</th>
                      <th className="py-3 px-4 text-right min-w-[110px]">Paid Amount</th>
                      <th className="py-3 px-4 text-right min-w-[130px] text-rose-700 bg-rose-50/50">Debt Balance</th>
                      <th className="py-3 px-4 text-center min-w-[180px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDebtVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          🎉 No open debt vouchers found. All sales invoices are fully paid!
                        </td>
                      </tr>
                    ) : (
                      filteredDebtVouchers.map((s, idx) => {
                        const rem = s.remainingDebt !== undefined ? s.remainingDebt : (s.salePrice || 0);
                        return (
                          <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                #{s.invoiceNo}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                              {formatDateDMY(s.date)}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              {s.customerName || 'Walk-in Customer'}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-[#0284c7]">
                              {s.customerPhone || '-'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[200px] truncate" title={s.itemName}>
                              {s.itemName}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                              {formatMMK(s.salePrice)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                              {formatMMK(s.paidAmount || 0)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-rose-700 bg-rose-50/40">
                              {formatMMK(rem)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSaleForVoucher(s)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title="View / Print Original Debt Voucher"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>View Voucher</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSaleForHistory(s)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  title="View Repayment History Log"
                                >
                                  <History className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Repay Log</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const debtorObj = debtorsList.find((d) =>
                                      (s.customerPhone && d.customerPhone === s.customerPhone) ||
                                      (d.customerName.toLowerCase() === (s.customerName || '').toLowerCase())
                                    );
                                    if (debtorObj) {
                                      setSelectedDebtorForPayment(debtorObj);
                                    } else {
                                      setSelectedDebtorForPayment({
                                        customerName: s.customerName || 'Customer',
                                        customerPhone: s.customerPhone,
                                        totalDebt: rem,
                                        unpaidSales: [s],
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="Settle Credit Payment"
                                >
                                  Pay
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE 2: DEBTOR SUMMARY ACCOUNTS */}
            {debtViewMode === 'debtors' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4 min-w-[180px]">Customer Name</th>
                      <th className="py-3 px-4 min-w-[140px]">Contact Phone</th>
                      <th className="py-3 px-4 min-w-[140px]">Origin Branch</th>
                      <th className="py-3 px-4 text-right min-w-[130px]">Total Purchases</th>
                      <th className="py-3 px-4 text-right min-w-[130px]">Paid Amount</th>
                      <th className="py-3 px-4 text-right min-w-[140px] text-rose-700 bg-rose-50/50">Outstanding Balance Due</th>
                      <th className="py-3 px-4 text-center min-w-[110px]">Unpaid Bills</th>
                      <th className="py-3 px-4 text-right min-w-[160px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDebtors.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                          🎉 No outstanding customer debts found! All accounts are fully settled.
                        </td>
                      </tr>
                    ) : (
                      filteredDebtors.map((d, idx) => {
                        return (
                          <tr key={d.customerPhone || d.customerName} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-extrabold text-slate-900 text-xs">
                                {d.customerName}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono font-bold text-[#0284c7]">
                                {d.customerPhone || '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {d.branchName || 'All Branches'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700">
                              {formatMMK(d.totalPurchases)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                              {formatMMK(d.totalPaid)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-rose-700 bg-rose-50/40">
                              {formatMMK(d.totalDebt)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                {d.unpaidSales.length} bills
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyCustomerStatement(d)}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                                  title="Copy Debt Statement"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDebtorForPayment(d)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="Settle Customer Debt Payment"
                                >
                                  Settle Payment
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-CATEGORY 4: PURCHASES & SUPPLIER PAYABLES */}
      {activeSubTab === 'purchases' && (
        <div className="space-y-4">
          <FinanceTreasuryLedger
            initialTab="purchases"
            purchases={purchases}
            treasuryAccounts={treasuryAccounts}
            treasuryTransactions={treasuryTransactions}
            contacts={contacts}
            inventory={inventory}
            branches={branches}
            sales={sales}
            expenses={expenses}
            salaryRecords={salaryRecords}
            currentUser={currentUser}
            activeBranchFilter={activeBranchFilter}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            onAddPurchase={onAddPurchase}
            onUpdatePurchase={onUpdatePurchase}
            onDeletePurchase={onDeletePurchase}
            onPaySupplierDebt={onPaySupplierDebt}
            onTransferFunds={onTransferFunds}
            onAdjustAccountBalance={onAdjustAccountBalance}
            interBranchTransfers={interBranchTransfers}
            onAddBranchTransfer={onAddBranchTransfer || (() => {})}
            onSettleBranchPayment={onSettleBranchPayment || (() => {})}
            supplierReturns={supplierReturns}
            onAddSupplierReturn={onAddSupplierReturn || (() => {})}
            onSyncPoToInventory={onSyncPoToInventory}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      )}

      {/* SUB-CATEGORY 5: SUPPLIERS & BENEFIT CLAIMS */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4">
          <SupplierClaimsAndBenefitsLedger
            suppliers={contacts}
            supplierBenefits={supplierBenefits}
            supplierReturns={supplierReturns}
            purchases={purchases}
            treasuryAccounts={treasuryAccounts}
            branches={branches}
            inventory={inventory}
            currentUser={currentUser}
            initialSubTab="claims"
            onAddSupplier={onAddContact}
            onUpdateSupplier={onUpdateContact}
            onDeleteSupplier={onDeleteContact}
            onAddSupplierBenefit={onAddSupplierBenefit}
            onUpdateSupplierBenefit={onUpdateSupplierBenefit}
            onDeleteSupplierBenefit={onDeleteSupplierBenefit}
            onSettleSupplierBenefit={onSettleSupplierBenefit}
            onAddSupplierReturn={onAddSupplierReturn || (() => {})}
            onDeleteSupplierReturn={onDeleteSupplierReturn}
            onClearAllSupplierReturns={onClearAllSupplierReturns}
            onSettleRma={onSettleRma}
            onPayPurchaseDebt={onPaySupplierDebt}
          />
        </div>
      )}

      {/* SUB-CATEGORY 6: RMA & DEFECT CLAIMS */}
      {activeSubTab === 'rma' && (
        <div className="space-y-4">
          <SupplierClaimsAndBenefitsLedger
            suppliers={contacts}
            supplierBenefits={supplierBenefits}
            supplierReturns={supplierReturns}
            purchases={purchases}
            treasuryAccounts={treasuryAccounts}
            branches={branches}
            inventory={inventory}
            currentUser={currentUser}
            initialSubTab="rma"
            onAddSupplier={onAddContact}
            onUpdateSupplier={onUpdateContact}
            onDeleteSupplier={onDeleteContact}
            onAddSupplierBenefit={onAddSupplierBenefit}
            onUpdateSupplierBenefit={onUpdateSupplierBenefit}
            onDeleteSupplierBenefit={onDeleteSupplierBenefit}
            onSettleSupplierBenefit={onSettleSupplierBenefit}
            onAddSupplierReturn={onAddSupplierReturn || (() => {})}
            onDeleteSupplierReturn={onDeleteSupplierReturn}
            onClearAllSupplierReturns={onClearAllSupplierReturns}
            onSettleRma={onSettleRma}
            onPayPurchaseDebt={onPaySupplierDebt}
          />
        </div>
      )}

      {/* Customer Debt Payment Settlement Modal */}
      {selectedDebtorForPayment && (
        <CustomerDebtPaymentModal
          isOpen={!!selectedDebtorForPayment}
          onClose={() => setSelectedDebtorForPayment(null)}
          customerName={selectedDebtorForPayment.customerName}
          customerPhone={selectedDebtorForPayment.customerPhone}
          partnerId={selectedDebtorForPayment.partnerId}
          totalDebt={selectedDebtorForPayment.totalDebt}
          unpaidSales={selectedDebtorForPayment.unpaidSales}
          treasuryAccounts={treasuryAccounts}
          onConfirmPayment={(partnerId, customerName, customerPhone, paymentAmount, accountId, notes, voucherId, paymentMethod) => {
            if (onSettleCustomerDebt) {
              onSettleCustomerDebt(partnerId, customerName, customerPhone, paymentAmount, accountId, notes, voucherId, paymentMethod);
            }
            showToast(`Payment of ${formatMMK(paymentAmount)} received from ${customerName}.`);
            setSelectedDebtorForPayment(null);
          }}
        />
      )}

      {/* POS Original Debt Voucher Modal */}
      {selectedSaleForVoucher && (
        <POSCustomerVoucherModal
          sale={selectedSaleForVoucher}
          branches={branches}
          employees={employees}
          inventory={inventory}
          onClose={() => setSelectedSaleForVoucher(null)}
        />
      )}

      {/* Customer Debt Repayment History Modal */}
      {selectedSaleForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Credit Repayment History</h3>
                  <p className="text-[11px] text-slate-500">
                    Voucher #{selectedSaleForHistory.invoiceNo} • {selectedSaleForHistory.customerName || 'Customer'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSaleForHistory(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {(!selectedSaleForHistory.paymentHistory || selectedSaleForHistory.paymentHistory.length === 0) ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No partial repayments recorded yet for this credit voucher.
                </div>
              ) : (
                selectedSaleForHistory.paymentHistory.map((ph, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Repayment #{idx + 1} ({ph.paymentMethod || 'Cash'})</span>
                      <span className="font-mono text-emerald-700 font-black">+{formatMMK(ph.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                      <span>Date: {formatDateDMY(ph.date)}</span>
                      <span>Recorded By: {ph.recordedBy || 'Staff'}</span>
                    </div>
                    {ph.receiptVoucherNo && (
                      <p className="text-[10px] text-indigo-600 font-mono">Receipt Voucher: {ph.receiptVoucherNo}</p>
                    )}
                    {ph.notes && (
                      <p className="text-[10px] text-slate-500 italic">Note: {ph.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">Remaining Debt: </span>
                <span className="font-extrabold text-rose-600 font-mono">
                  {formatMMK(selectedSaleForHistory.remainingDebt !== undefined ? selectedSaleForHistory.remainingDebt : (selectedSaleForHistory.salePrice || 0))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
