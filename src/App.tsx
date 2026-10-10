/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ProfitLossDashboard } from './components/ProfitLossDashboard';
import { DailySalesLedger } from './components/DailySalesLedger';
import { InventoryManagement } from './components/InventoryManagement';
import { ContactPartners } from './components/ContactPartners';
import { DailyExpensesLedger } from './components/DailyExpensesLedger';
import { EmployeeManagement } from './components/EmployeeManagement';
import { HRManagementView } from './components/HRManagementView';
import { FinancialManagementView, FinancialSubTab } from './components/FinancialManagementView';
import { SalesOperationsView, SalesSubTab } from './components/SalesOperationsView';
import { SystemAdminView, AdminSubTab } from './components/SystemAdminView';
import { PayrollTable } from './components/PayrollTable';
import { SalarySummaryCards } from './components/SalarySummaryCards';
import { BranchManagement } from './components/BranchManagement';
import { PayrollCalculatorModal, getDefaultDutyAllowance } from './components/PayrollCalculatorModal';
import { calculateEmployeeTenure } from './utils/tenureHelpers';
import { PayslipModal } from './components/PayslipModal';
import { BatchPayslipsModal } from './components/BatchPayslipsModal';
import { PerformanceBonusManagerModal } from './components/PerformanceBonusManagerModal';
import { StaffBasicPayModal } from './components/StaffBasicPayModal';
import { UserManagement } from './components/UserManagement';
import { FirebaseLogin } from './components/FirebaseLogin';
import { CloudSyncNotice } from './components/CloudSyncNotice';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useFirebaseSession } from './hooks/useFirebaseSession';
import { signOutStaff } from './utils/authProfile';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FinanceTreasuryLedger } from './components/FinanceTreasuryLedger';
import { BranchTransferView } from './components/BranchTransferView';
import { ActivityLogView } from './components/ActivityLogView';
import { DataBackupCenter } from './components/DataBackupCenter';
import { SystemSettingsView } from './components/SystemSettingsView';
import { CalendarMonthPicker } from './components/CalendarMonthPicker';
import { SupplierClaimsAndBenefitsLedger } from './components/SupplierClaimsAndBenefitsLedger';
import { 
  INITIAL_BRANCHES, 
  INITIAL_USERS, 
  INITIAL_SALES, 
  INITIAL_EXPENSES, 
  INITIAL_EMPLOYEES, 
  INITIAL_SALARY_RECORDS, 
  INITIAL_INVENTORY, 
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_CONTACTS,
  INITIAL_SUPPLIERS,
  INITIAL_SUPPLIER_RETURNS,
  INITIAL_SUPPLIER_BENEFITS,
  INITIAL_PURCHASES,
  INITIAL_TREASURY_ACCOUNTS,
  INITIAL_TREASURY_TRANSACTIONS,
  resequenceAllEmployees,
  sanitizeUserAccounts,
  deduplicateEmployees,
  isDummyOrInvalidStaff,
  sanitizeSalaryRecords,
  findSalaryRecordForEmployee
} from './data/initialData';
import { 
  Employee, 
  SalaryRecord, 
  Branch, 
  UserAccount, 
  DailySale, 
  DailyExpense, 
  InventoryItem, 
  InventoryCategory,
  StockMovement, 
  ContactPartner,
  PurchaseRecord,
  PurchaseItemLine,
  PurchaseInstallment,
  PurchasePaymentItem,
  TreasuryAccount,
  TreasuryTransaction,
  InterBranchTransfer,
  SupplierReturn,
  SupplierBenefit,
  ActivityLogEntry,
  normalizeDepartmentName,
  SaleCartItem,
  HoldBill,
  CashierShift,
  hasGlobalBranchAccess,
  canUserDelete,
  canUserDeletePayrollSlip,
  isYaminnwe,
  isMDUser,
  normalizeUserRole,
  canUserViewAdminModules,
  canUserManagePayroll,
  canUserViewPL,
  CompanyDepartment,
  DepartmentPositionsMap,
  DEPARTMENT_POSITIONS
} from './types';
import { formatMMK, formatNumber, getMonthName, getStandardWorkingDaysForMonth, exportFullSystemBackupJSON, getBranchName } from './utils/formatters';
import { normalizeBranch, cleanAndNormalizeBranches, normalizeEmployeeBranch } from './data/shweKyalTagonStaffData';
import { generateAutoSKU, detectBrandFromName, getBrandSKUPrefix } from './utils/skuGenerator';
import { 
  normalizeInventoryItem, 
  deductStockForSale, 
  restoreStockForSale, 
  syncBranchStocks, 
  calculateTotalPhysicalStock, 
  isSharedStockPool, 
  resolveItemWarranty,
  SHOP_1_BRANCH_ID, 
  SYSTEM_2_BRANCH_ID 
} from './utils/inventoryHelper';
import { 
  subscribeToCloudData, 
  pushStateToCloud, 
  fetchCloudData,
  pullAllCloudData,
  isQuotaExceededError,
  isOfflineOrUnavailableError,
  getIsQuotaExceeded,
  resetQuotaCooldown,
  serializePayloadForDiff,
  getLastPushedPayloadString,
  updateLastKnownPayload,
  deleteDocumentFromCloud,
  saveRecordToCloud,
  registerLocalStateProvider,
  CloudSyncPayload
} from './utils/cloudSync';
import { initShopSettingsCloudSync, getSavedVoucherBranches } from './utils/logoStorage';
import { reconcileInventoryWithPoStock } from './utils/inventoryReconciler';
import { 
  ShieldCheck, 
  Users2, 
  Plus, 
  Check, 
  RotateCcw, 
  KeyRound, 
  Lock, 
  Sparkles, 
  FileSpreadsheet, 
  CheckCircle2, 
  ShieldAlert, 
  Store,
  Crown,
  Trash2,
  AlertCircle,
  ExternalLink,
  Award,
  Coins,
  RefreshCw,
  X
} from 'lucide-react';

const CLEAN_SLATE_APPLIED_KEY = 'sktg_clean_slate_2026_v5';

// Perform immediate one-time cleanup of any old demo/mock local storage records and stale branches

try {
  if (typeof window !== 'undefined' && localStorage.getItem(CLEAN_SLATE_APPLIED_KEY) !== 'true') {
    const legacyKeys = [
      'sktg_employees_v1',
      'sktg_salary_records_v1',
      'sktg_sales_v1',
      'sktg_expenses_v1',
      'sktg_inventory_v1',
      'sktg_stock_movements_v1',
      'sktg_contacts_v1',
      'sktg_employees_v2',
      'sktg_salary_records_v2',
      'sktg_sales_v2',
      'sktg_expenses_v2',
      'sktg_inventory_v2',
      'sktg_stock_movements_v2',
      'sktg_contacts_v2',
      'sktg_branches_v1',
      'sktg_branches_v2',
      'sktg_branches_v3',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('sktg_branches_v4', JSON.stringify([]));
    localStorage.setItem(CLEAN_SLATE_APPLIED_KEY, 'true');
  }
} catch (e) {
  console.warn('Storage cleanup notice:', e);
}

const STORAGE_KEYS = {
  BRANCHES: 'sktg_branches_v4',
  USERS: 'sktg_users_v2',
  CURRENT_USER: 'sktg_current_user_v3',
  EMPLOYEES: 'sktg_employees_v2',
  SALARY_RECORDS: 'sktg_salary_records_v2',
  SALES: 'sktg_sales_v2',
  EXPENSES: 'sktg_expenses_v2',
  INVENTORY: 'sktg_inventory_v2',
  STOCK_MOVEMENTS: 'sktg_stock_movements_v2',
  CONTACTS: 'sktg_contacts_v2',
  PURCHASES: 'sktg_purchases_v1',
  TREASURY_ACCOUNTS: 'sktg_treasury_accounts_v1',
  TREASURY_TRANSACTIONS: 'sktg_treasury_transactions_v1',
  INTER_BRANCH_TRANSFERS: 'sktg_inter_branch_transfers_v1',
  ACTIVITY_LOGS: 'sktg_activity_logs_v1',
  CASHIER_SHIFTS: 'sktg_cashier_shifts_v1',
  HELD_BILLS: 'sktg_held_bills_v1',
  CUSTOM_POSITIONS: 'sktg_custom_positions_v2',
  SUPPLIER_RETURNS: 'sktg_supplier_returns_v1',
  SUPPLIER_BENEFITS: 'sktg_supplier_benefits_v1',
};

export default function App() {
  // Navigation & View (Hierarchical Corporate ERP Navigation with persistence across refresh)
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const saved = localStorage.getItem('sktg_current_tab');
      if (saved) return saved as NavTab;
    } catch (e) {}
    return 'inventory';
  });

  useEffect(() => {
    try {
      localStorage.setItem('sktg_current_tab', currentTab);
    } catch (e) {}
  }, [currentTab]);

  const [financialInitialSubTab, setFinancialInitialSubTab] = useState<FinancialSubTab>('pl');
  const [hrInitialSubTab, setHrInitialSubTab] = useState<'directory' | 'payroll' | 'performance'>('directory');
  const [inventoryInitialTab, setInventoryInitialTab] = useState<'catalog' | 'branch_transfer' | 'ground_audit' | 'movements' | 'low_stock_fifo'>(() => {
    try {
      const saved = localStorage.getItem('sktg_inventory_tab');
      if (saved) return saved as any;
    } catch (e) {}
    return 'catalog';
  });

  useEffect(() => {
    try {
      localStorage.setItem('sktg_inventory_tab', inventoryInitialTab);
    } catch (e) {}
  }, [inventoryInitialTab]);
  const [salesSubTab, setSalesSubTab] = useState<SalesSubTab>('pos');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('users');
  const [supplierInitialSubTab, setSupplierInitialSubTab] = useState<'po_payables' | 'claims' | 'rma' | 'directory'>('po_payables');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Always initialize to the active transaction month (2026-09) to avoid stale empty cache
    return '2026-09';
  });
  const [activeBranchFilter, setActiveBranchFilter] = useState<string>('ALL');

  const handleSelectNav = (tab: NavTab, subTab?: string) => {
    if (tab === 'suppliers') {
      setCurrentTab('financial');
      setFinancialInitialSubTab('suppliers');
      return;
    }
    if (tab === 'rma') {
      setCurrentTab('financial');
      setFinancialInitialSubTab('rma');
      return;
    }
    if (tab === 'dashboard') {
      setCurrentTab('financial');
      setFinancialInitialSubTab('pl');
      return;
    }
    if (tab === 'finance') {
      setCurrentTab('financial');
      setFinancialInitialSubTab('purchases');
      return;
    }
    if (tab === 'expenses') {
      setCurrentTab('financial');
      setFinancialInitialSubTab('expenses');
      return;
    }
    if (tab === 'contacts') {
      setCurrentTab('customers');
      return;
    }
    if (tab === 'branch_transfer') {
      setCurrentTab('inventory');
      setInventoryInitialTab('branch_transfer');
      return;
    }
    if (tab === 'payroll') {
      setCurrentTab('hr');
      setHrInitialSubTab('payroll');
      return;
    }
    if (tab === 'team') {
      setCurrentTab('hr');
      setHrInitialSubTab('directory');
      return;
    }

    setCurrentTab(tab);
    if (tab === 'financial') {
      const isMD = isMDUser(currentUser);
      if (subTab === 'pl') {
        setFinancialInitialSubTab(isMD ? 'pl' : 'expenses');
      } else if (subTab === 'expenses' || subTab === 'customer_debt' || subTab === 'purchases' || subTab === 'suppliers' || subTab === 'rma' || subTab === 'treasury') {
        setFinancialInitialSubTab(subTab as FinancialSubTab);
      } else {
        setFinancialInitialSubTab(isMD ? 'pl' : 'expenses');
      }
    } else if (tab === 'hr') {
      if (subTab === 'directory' || subTab === 'payroll' || subTab === 'performance') {
        setHrInitialSubTab(subTab as any);
      }
    } else if (tab === 'inventory') {
      if (subTab) {
        setInventoryInitialTab(subTab as any);
      }
    } else if (tab === 'sales') {
      if (subTab === 'pos' || subTab === 'customers' || subTab === 'suppliers') {
        setSalesSubTab(subTab as SalesSubTab);
      }
    } else if (tab === 'users') {
      if (subTab === 'users' || subTab === 'activity_log' || subTab === 'settings') {
        setAdminSubTab(subTab as AdminSubTab);
      }
    }
  };

  const currentSubTab = 
    currentTab === 'financial' ? financialInitialSubTab :
    currentTab === 'hr' ? hrInitialSubTab :
    currentTab === 'inventory' ? inventoryInitialTab :
    currentTab === 'sales' ? salesSubTab :
    currentTab === 'users' ? adminSubTab :
    undefined;

  // Save selectedMonth to localStorage whenever it updates
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'ALL') {
      localStorage.setItem('sktg_selected_month', selectedMonth);
    }
  }, [selectedMonth]);

  // State with LocalStorage Persistence
  const [branches, setBranches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
      if (saved) {
        let parsed: Branch[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return cleanAndNormalizeBranches(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading branches', e);
    }
    return cleanAndNormalizeBranches(INITIAL_BRANCHES);
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS) || localStorage.getItem('sktg_users_v4');
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        const sanitized = sanitizeUserAccounts(parsed);
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
          localStorage.setItem('sktg_users_v4', JSON.stringify(sanitized));
        } catch (e) {
          // ignore
        }
        return sanitized;
      }
    } catch (e) {
      console.error('Error loading users', e);
    }
    return INITIAL_USERS;
  });

  // Identity comes ONLY from the Firebase sign-in (see useFirebaseSession). It is never read from saved data,
  // so nobody can pretend to be another person by editing the browser storage.
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const session = useFirebaseSession();
  useEffect(() => {
    if (session.status === 'signedIn' && session.user) {
      setCurrentUser((prev) =>
        prev && prev.id === session.user!.id && prev.role === session.user!.role && prev.branchId === session.user!.branchId
          ? prev
          : session.user
      );
    } else if (session.status === 'signedOut') {
      setCurrentUser(null);
    }
  }, [session]);

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const isZeroed = localStorage.getItem('sktg_base_salary_zeroed_v3') === 'true';
      const saved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (saved) {
        let parsed: Employee[] = JSON.parse(saved);
        // Clean and deduplicate employees (preserves all 31 canonical employees and normalizes branches)
        parsed = deduplicateEmployees(parsed).map((e) => {
          const branchRes = normalizeEmployeeBranch(e.branchId, e.branchName, e.code);
          return {
            ...e,
            branchId: branchRes.branchId,
            branchName: branchRes.branchName,
            baseSalary: isZeroed ? (Number(e.baseSalary) || 0) : 0,
            department: normalizeDepartmentName(e.department),
          };
        });

        if (!isZeroed) {
          try {
            localStorage.setItem('sktg_base_salary_zeroed_v3', 'true');
          } catch (e) {
            console.error('Error saving zeroed flag', e);
          }
        }

        const needsResequence = parsed.some(
          (e) => !e.code || !e.code.startsWith('EC') || e.code.includes('-') || !/^EC\d{3}$/.test(e.code)
        ) || (parsed.length > 0 && parsed[0].code !== 'EC001');

        if (needsResequence) {
          const { employees: resequenced } = resequenceAllEmployees(parsed);
          parsed = resequenced;
        }

        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(parsed));
        } catch (err) {
          console.error('Error saving clean employees', err);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading employees', e);
    }
    try {
      localStorage.setItem('sktg_base_salary_zeroed_v3', 'true');
    } catch (e) {
      // ignore
    }
    return INITIAL_EMPLOYEES.map(e => ({ ...e, baseSalary: 0 }));
  });

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALARY_RECORDS);
      if (saved) {
        const parsed: SalaryRecord[] = JSON.parse(saved);
        const empSaved = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
        const curEmps: Employee[] = empSaved ? JSON.parse(empSaved) : INITIAL_EMPLOYEES;
        const sanitized = sanitizeSalaryRecords(parsed, curEmps);
        return sanitized.map((s) => {
          const lateDeduct = s.lateDeduct ?? (s.deductionPenalty ?? 0);
          const absentDeduct = s.absentDeduct ?? 0;
          const unpaidLeave = s.unpaidLeave ?? 0;
          const totalDeductions = lateDeduct + absentDeduct + unpaidLeave;
          
          let serviceAllowance = s.serviceAllowance ?? 0;
          const emp = curEmps.find((e) => e.id === s.employeeId);
          // If serviceAllowance is 120000 (old corrupted value), recalculate from employee's actual tenure
          if (serviceAllowance === 120000 && emp) {
            const tInfo = calculateEmployeeTenure(emp.joinedDate, s.month, emp.tenure);
            serviceAllowance = tInfo.serviceAllowance;
          }
          const dutyAllowance = s.dutyAllowance ?? 0;
          const totalEarnings =
            Number(s.basicSalary || 0) +
            Number(serviceAllowance) +
            Number(dutyAllowance) +
            Number(s.attendanceBonus || 0) +
            Number(s.otTotal || 0) +
            Number(s.salesCommission || 0) +
            Number(s.mealAllowance || 0);

          return {
            ...s,
            serviceAllowance,
            dutyAllowance,
            department: normalizeDepartmentName(s.department),
            month: (!s.month || s.month === 'ALL') ? '2026-09' : s.month,
            lateDeduct,
            absentDeduct,
            unpaidLeave,
            deductionSSB: 0,
            totalDeductions,
            totalEarnings,
            netSalary: Math.max(0, totalEarnings - totalDeductions),
          };
        });
      }
    } catch (e) {
      console.error('Error loading salary records', e);
    }
    return INITIAL_SALARY_RECORDS.map((s) => ({
      ...s,
      month: (!s.month || s.month === 'ALL') ? '2026-09' : s.month,
    }));
  });

// Helper to migrate/normalize voucher numbers across all branches from -DS to -INV
const normalizeSalesInvoiceNo = (list: DailySale[]): DailySale[] => {
  if (!Array.isArray(list)) return [];
  return list.map((s: any) => {
    let updatedInv = s.invoiceNo;
    if (updatedInv) {
      updatedInv = updatedInv
        .replace(/-DS(\d{8}\/\d+)/g, '-INV$1')
        .replace(/-DS-(\d+)/g, '-INV-$1')
        .replace(/\bDS(\d{8}\/\d+)/g, 'INV$1')
        .replace(/(\b[A-Za-z0-9]+)-DS(\d+)/g, '$1-INV$2');
    }
    const updatedParent = s.parentSale ? {
      ...s.parentSale,
      invoiceNo: s.parentSale.invoiceNo ? s.parentSale.invoiceNo
        .replace(/-DS(\d{8}\/\d+)/g, '-INV$1')
        .replace(/-DS-(\d+)/g, '-INV-$1')
        .replace(/\bDS(\d{8}\/\d+)/g, 'INV$1')
        .replace(/(\b[A-Za-z0-9]+)-DS(\d+)/g, '$1-INV$2') : s.parentSale.invoiceNo,
    } : s.parentSale;
    return {
      ...s,
      invoiceNo: updatedInv,
      voucherNo: s.voucherNo ? s.voucherNo
        .replace(/-DS(\d{8}\/\d+)/g, '-INV$1')
        .replace(/-DS-(\d+)/g, '-INV-$1')
        .replace(/\bDS(\d{8}\/\d+)/g, 'INV$1')
        .replace(/(\b[A-Za-z0-9]+)-DS(\d+)/g, '$1-INV$2') : s.voucherNo,
      ...(updatedParent ? { parentSale: updatedParent } : {}),
    };
  });
};

  const [sales, setSales] = useState<DailySale[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      if (saved) return normalizeSalesInvoiceNo(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading sales', e);
    }
    return normalizeSalesInvoiceNo(INITIAL_SALES);
  });

  const [expenses, setExpenses] = useState<DailyExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading expenses', e);
    }
    return INITIAL_EXPENSES;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (saved) {
        const parsed: InventoryItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map(normalizeInventoryItem);
          const { items } = reconcileInventoryWithPoStock(normalized, false);
          return items;
        }
      }
    } catch (e) {
      console.error('Error loading inventory', e);
    }
    const { items } = reconcileInventoryWithPoStock(INITIAL_INVENTORY.map(normalizeInventoryItem), false);
    return items;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCK_MOVEMENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading stock movements', e);
    }
    return INITIAL_STOCK_MOVEMENTS;
  });

  const [contacts, setContacts] = useState<ContactPartner[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      if (saved) {
        const parsed: ContactPartner[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasSuppliers = parsed.some(c => c.type === 'Supplier');
          if (!hasSuppliers) {
            return [...parsed, ...INITIAL_SUPPLIERS];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading contacts', e);
    }
    return INITIAL_CONTACTS;
  });

  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      if (saved) {
        const parsed: PurchaseRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingInvoices = new Set(parsed.map((p) => p.invoiceNo));
          const missing = INITIAL_PURCHASES.filter((p) => !existingInvoices.has(p.invoiceNo));
          return [...parsed, ...missing];
        }
      }
    } catch (e) {
      console.error('Error loading purchases', e);
    }
    return INITIAL_PURCHASES;
  });

  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TREASURY_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading treasury accounts', e);
    }
    return INITIAL_TREASURY_ACCOUNTS;
  });

  const [interBranchTransfers, setInterBranchTransfers] = useState<InterBranchTransfer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INTER_BRANCH_TRANSFERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading inter-branch transfers', e);
    }
    return [];
  });

  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TREASURY_TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading treasury transactions', e);
    }
    return INITIAL_TREASURY_TRANSACTIONS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading activity logs', e);
    }
    return [];
  });

  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIER_RETURNS);
      if (saved !== null) {
        const parsed: SupplierReturn[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading supplier returns', e);
    }
    return INITIAL_SUPPLIER_RETURNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_RETURNS, JSON.stringify(supplierReturns));
    } catch (e) {
      console.error('Error saving supplier returns', e);
    }
  }, [supplierReturns]);

  const [supplierBenefits, setSupplierBenefits] = useState<SupplierBenefit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIER_BENEFITS);
      if (saved !== null) {
        const parsed: SupplierBenefit[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading supplier benefits', e);
    }
    return INITIAL_SUPPLIER_BENEFITS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(supplierBenefits));
    } catch (e) {
      console.error('Error saving supplier benefits', e);
    }
  }, [supplierBenefits]);

  // Central Activity Logger
  const handleLogActivity = (log: Partial<ActivityLogEntry>) => {
    const now = new Date();
    const entry: ActivityLogEntry = {
      id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || now.toISOString(),
      date: log.date || now.toISOString().slice(0, 10),
      time: log.time || now.toTimeString().slice(0, 8),
      userId: log.userId || currentUser?.id,
      userName: log.userName || currentUser?.displayName || 'System User',
      userRole: log.userRole || currentUser?.role || 'Staff',
      userAvatarBg: log.userAvatarBg || currentUser?.avatarBg || 'bg-amber-600',
      branchId: log.branchId || currentUser?.branchId || 'branch-1',
      branchName: log.branchName || currentUser?.branchName || 'Branch 1',
      module: log.module || 'INVENTORY',
      action: log.action || 'UPDATE',
      title: log.title || 'System Operation',
      description: log.description || 'Logged operation',
      details: log.details || {},
      createdAt: now.toISOString(),
    };

    setActivityLogs((prev) => [entry, ...prev.slice(0, 499)]); // Keep up to 500 recent activity logs
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs));
    } catch (e) {
      console.warn('Error saving activity logs', e);
    }
  }, [activityLogs]);

  // Cashier Shifts & Held Bills
  const [shifts, setShifts] = useState<CashierShift[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASHIER_SHIFTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading cashier shifts', e);
    }
    return [];
  });

  const [heldBills, setHeldBills] = useState<HoldBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HELD_BILLS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading held bills', e);
    }
    return [];
  });

  // Current active open shift for current branch/user
  const activeShift = useMemo(() => {
    return shifts.find(
      (s) => s.status === 'OPEN' && (currentUser?.branchId === 'ALL' || s.branchId === currentUser?.branchId)
    ) || null;
  }, [shifts, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CASHIER_SHIFTS, JSON.stringify(shifts));
    } catch (e) {
      console.warn('Error saving cashier shifts', e);
    }
  }, [shifts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify(heldBills));
    } catch (e) {
      console.warn('Error saving held bills', e);
    }
  }, [heldBills]);

  // Customizable Company Positions Map
  const [positionsMap, setPositionsMap] = useState<DepartmentPositionsMap>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_POSITIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            'Sales Department': Array.from(new Set([...(parsed['Sales Department'] || []), ...DEPARTMENT_POSITIONS['Sales Department']])),
            'Finance Department': Array.from(new Set([...(parsed['Finance Department'] || []), ...DEPARTMENT_POSITIONS['Finance Department']])),
            'Service Department': Array.from(new Set([...(parsed['Service Department'] || []), ...DEPARTMENT_POSITIONS['Service Department']])),
          };
        }
      }
    } catch (e) {
      console.error('Error loading custom positions', e);
    }
    return DEPARTMENT_POSITIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_POSITIONS, JSON.stringify(positionsMap));
    } catch (e) {
      console.error('Error saving custom positions', e);
    }
  }, [positionsMap]);

  const handleAddPosition = (department: CompanyDepartment, positionTitle: string) => {
    const trimmed = positionTitle.trim();
    if (!trimmed) return;
    setPositionsMap((prev) => {
      const currentList = prev[department] || [];
      if (currentList.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return prev;
      return {
        ...prev,
        [department]: [...currentList, trimmed],
      };
    });
    handleLogActivity({
      module: 'STAFF',
      action: 'CREATE',
      title: 'New Position Added',
      description: `Added position "${trimmed}" to ${department}.`,
    });
  };

  const handleRenamePosition = (
    department: CompanyDepartment,
    oldTitle: string,
    newTitle: string,
    updateEmployees: boolean
  ) => {
    const trimmedNew = newTitle.trim();
    if (!trimmedNew || trimmedNew === oldTitle) return;

    setPositionsMap((prev) => {
      const currentList = prev[department] || [];
      const nextList = currentList.map((p) => (p === oldTitle ? trimmedNew : p));
      return {
        ...prev,
        [department]: nextList,
      };
    });

    if (updateEmployees) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.position === oldTitle
            ? { ...emp, position: trimmedNew }
            : emp
        )
      );
      setUsers((prev) =>
        prev.map((u) => {
          if (u.title && u.title.includes(oldTitle)) {
            return { ...u, title: u.title.replace(oldTitle, trimmedNew) };
          }
          return u;
        })
      );
      setSalaryRecords((prev) =>
        prev.map((rec) =>
          rec.position === oldTitle
            ? { ...rec, position: trimmedNew }
            : rec
        )
      );
    }

    handleLogActivity({
      module: 'STAFF',
      action: 'UPDATE',
      title: 'Position Renamed',
      description: `Renamed position "${oldTitle}" to "${trimmedNew}" in ${department} (${updateEmployees ? 'updated associated staff records' : 'position catalog only'}).`,
    });
  };

  const handleDeletePosition = (department: CompanyDepartment, positionTitle: string) => {
    setPositionsMap((prev) => {
      const currentList = prev[department] || [];
      return {
        ...prev,
        [department]: currentList.filter((p) => p !== positionTitle),
      };
    });
    handleLogActivity({
      module: 'STAFF',
      action: 'DELETE',
      title: 'Position Removed',
      description: `Removed position "${positionTitle}" from ${department}.`,
    });
  };

  const handleResetPositions = () => {
    setPositionsMap(DEPARTMENT_POSITIONS);
    handleLogActivity({
      module: 'STAFF',
      action: 'UPDATE',
      title: 'Positions Reset',
      description: 'Reset all department positions back to factory standard presets.',
    });
  };

  // Modals
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [calculatorTargetEmpId, setCalculatorTargetEmpId] = useState<string | undefined>(undefined);
  const [isBasicPayMasterOpen, setIsBasicPayMasterOpen] = useState<boolean>(false);
  const [isPayslipOpen, setIsPayslipOpen] = useState<boolean>(false);
  const [selectedPayslipRecord, setSelectedPayslipRecord] = useState<SalaryRecord | null>(null);
  const [isBatchPayslipsOpen, setIsBatchPayslipsOpen] = useState<boolean>(false);
  const [isPerformanceBonusOpen, setIsPerformanceBonusOpen] = useState<boolean>(false);
  const [isBonusBatchPrintMode, setIsBonusBatchPrintMode] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // In-App Confirm Delete State (Iframe-safe replacement for window.confirm)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemName?: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const requestDelete = (
    deleteConfig: {
      title: string;
      description: string;
      itemName?: string;
      confirmText?: string;
      onConfirm: () => void;
    },
    authorized?: boolean
  ) => {
    const isAllowed = authorized !== undefined ? authorized : canUserDelete(currentUser);
    if (!isAllowed) {
      alert('Delete restricted. You do not have permission to delete records.');
      return;
    }
    setDeleteConfirmState({
      isOpen: true,
      ...deleteConfig,
    });
  };

  // Global Escape key listener for open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isBasicPayMasterOpen) {
          setIsBasicPayMasterOpen(false);
        } else if (isCalculatorOpen) {
          setIsCalculatorOpen(false);
          setEditingRecord(null);
          setCalculatorTargetEmpId(undefined);
        } else if (isPayslipOpen) {
          setIsPayslipOpen(false);
          setSelectedPayslipRecord(null);
        } else if (isLoginModalOpen) {
          setIsLoginModalOpen(false);
        } else if (deleteConfirmState) {
          setDeleteConfirmState(null);
        } else if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBasicPayMasterOpen, isCalculatorOpen, isPayslipOpen, isLoginModalOpen, deleteConfirmState, isMobileSidebarOpen]);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'quota_exceeded' | 'idle'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const [isQuotaNoticeDismissed, setIsQuotaNoticeDismissed] = useState<boolean>(false);
  const isInitialCloudLoadRef = React.useRef<boolean>(false);
  const isLocalUpdateRef = React.useRef<boolean>(false);
  const remoteUpdateLockUntilRef = React.useRef<number>(0);
  const lastLocalActionTimeRef = React.useRef<number>(0);

  const livePayloadRef = React.useRef<any>(null);
  livePayloadRef.current = {
    branches,
    users,
    employees,
    salaryRecords,
    sales,
    expenses,
    inventory,
    stockMovements,
    contacts,
    purchases,
    supplierReturns,
    supplierBenefits,
    treasuryAccounts,
    treasuryTransactions,
    interBranchTransfers,
    customPositions: positionsMap,
  };

  const saveToLocalStorage = (data: Partial<CloudSyncPayload>) => {
    try {
      if (Array.isArray(data.branches)) localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(data.branches));
      if (Array.isArray(data.users)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
      if (Array.isArray(data.employees)) localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(data.employees));
      if (Array.isArray(data.salaryRecords)) localStorage.setItem(STORAGE_KEYS.SALARY_RECORDS, JSON.stringify(data.salaryRecords));
      if (Array.isArray(data.sales)) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(normalizeSalesInvoiceNo(data.sales)));
      if (Array.isArray(data.expenses)) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (Array.isArray(data.inventory)) localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data.inventory));
      if (Array.isArray(data.stockMovements)) localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(data.stockMovements));
      if (Array.isArray(data.contacts)) localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(data.contacts));
      if (Array.isArray(data.purchases)) localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases));
      if (Array.isArray(data.supplierReturns)) localStorage.setItem(STORAGE_KEYS.SUPPLIER_RETURNS, JSON.stringify(data.supplierReturns));
      if (Array.isArray(data.supplierBenefits)) localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(data.supplierBenefits));
      if (Array.isArray(data.treasuryAccounts)) localStorage.setItem(STORAGE_KEYS.TREASURY_ACCOUNTS, JSON.stringify(data.treasuryAccounts));
      if (Array.isArray(data.treasuryTransactions)) localStorage.setItem(STORAGE_KEYS.TREASURY_TRANSACTIONS, JSON.stringify(data.treasuryTransactions));
      if (Array.isArray(data.interBranchTransfers)) localStorage.setItem(STORAGE_KEYS.INTER_BRANCH_TRANSFERS, JSON.stringify(data.interBranchTransfers));
      if (data.customPositions && typeof data.customPositions === 'object') {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_POSITIONS, JSON.stringify(data.customPositions));
      }
      if (data.updatedAt) {
        localStorage.setItem('sktg_last_updated_at', data.updatedAt);
      }
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }
  };

  // Helper: Defensive merge to ensure local sales and inventory edits are NEVER lost
  const processAndMergeCloudData = (cloudData: CloudSyncPayload) => {
    // 1. Sales: Cloud is authoritative across devices
    const finalSales = Array.isArray(cloudData.sales) ? normalizeSalesInvoiceNo(cloudData.sales) : undefined;
    if (finalSales) {
      setSales(finalSales);
      try {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(finalSales));
      } catch (e) {
        // ignore
      }
    }

    // 2. Inventory: Cloud is authoritative across devices so changes on one device reflect everywhere
    let finalInventory = undefined;
    if (Array.isArray(cloudData.inventory)) {
      const normalizedInv = cloudData.inventory.map(normalizeInventoryItem);
      const { items: reconciledInv } = reconcileInventoryWithPoStock(normalizedInv, true);
      finalInventory = reconciledInv;
      setInventory(finalInventory);
      try {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(finalInventory));
      } catch (e) {
        // ignore
      }
    }

    // 3. Branches
    if (Array.isArray(cloudData.branches)) {
      const cleanedBranches = cleanAndNormalizeBranches(cloudData.branches);
      setBranches(cleanedBranches);
      try {
        localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(cleanedBranches));
      } catch (e) {}
    }

    // 4. Users
    if (Array.isArray(cloudData.users)) {
      setUsers(sanitizeUserAccounts(cloudData.users));
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cloudData.users));
        localStorage.setItem('sktg_users_v4', JSON.stringify(cloudData.users));
      } catch (e) {}
    }

    // 5. Employees: Cloud is authoritative across devices
    if (Array.isArray(cloudData.employees)) {
      const dedupedCloudEmployees = deduplicateEmployees(cloudData.employees);
      const normalized = dedupedCloudEmployees.map((e) => {
        const branchRes = normalizeEmployeeBranch(e.branchId, e.branchName, e.code);
        return {
          ...e,
          branchId: branchRes.branchId,
          branchName: branchRes.branchName,
          department: normalizeDepartmentName(e.department),
        };
      });
      setEmployees(normalized);
    }

    // 6. Salary Records
    if (Array.isArray(cloudData.salaryRecords)) {
      const empList = Array.isArray(cloudData.employees) ? deduplicateEmployees(cloudData.employees) : employees;
      const sanitizedCloudSalary = sanitizeSalaryRecords(cloudData.salaryRecords, empList);
      setSalaryRecords(
        sanitizedCloudSalary.map((s) => {
          const emp = empList.find((e) => e.id === s.employeeId);
          let sAllowance = s.serviceAllowance ?? 0;
          if (sAllowance === 120000 && emp) {
            sAllowance = calculateEmployeeTenure(emp.joinedDate, s.month, emp.tenure).serviceAllowance;
          }
          const dAllowance = s.dutyAllowance ?? 0;
          const tDeduct = (s.lateDeduct ?? (s.deductionPenalty ?? 0)) + (s.absentDeduct ?? 0) + (s.unpaidLeave ?? 0);
          const tEarn =
            Number(s.basicSalary || 0) +
            Number(sAllowance) +
            Number(dAllowance) +
            Number(s.attendanceBonus || 0) +
            Number(s.otTotal || 0) +
            Number(s.salesCommission || 0) +
            Number(s.mealAllowance || 0);
          return {
            ...s,
            serviceAllowance: sAllowance,
            dutyAllowance: dAllowance,
            department: normalizeDepartmentName(s.department),
            totalEarnings: tEarn,
            netSalary: Math.max(0, tEarn - tDeduct),
          };
        })
      );
    }

    // 7. Other data sets
    if (Array.isArray(cloudData.expenses)) setExpenses(cloudData.expenses);
    if (Array.isArray(cloudData.stockMovements)) setStockMovements(cloudData.stockMovements);
    if (Array.isArray(cloudData.contacts)) setContacts(cloudData.contacts);
    if (Array.isArray(cloudData.purchases)) {
      const existingInvoices = new Set(cloudData.purchases.map((p: any) => p.invoiceNo));
      const missing = INITIAL_PURCHASES.filter((p) => !existingInvoices.has(p.invoiceNo));
      setPurchases([...cloudData.purchases, ...missing]);
    }
    if (Array.isArray(cloudData.supplierReturns)) setSupplierReturns(cloudData.supplierReturns);
    if (Array.isArray(cloudData.supplierBenefits)) setSupplierBenefits(cloudData.supplierBenefits);
    if (Array.isArray(cloudData.treasuryAccounts) && cloudData.treasuryAccounts.length > 0) setTreasuryAccounts(cloudData.treasuryAccounts);
    if (Array.isArray(cloudData.treasuryTransactions)) setTreasuryTransactions(cloudData.treasuryTransactions);
    if (Array.isArray(cloudData.interBranchTransfers)) setInterBranchTransfers(cloudData.interBranchTransfers);
    if (cloudData.customPositions && typeof cloudData.customPositions === 'object') {
      setPositionsMap((prev) => ({
        'Sales Department': Array.from(new Set([...(cloudData.customPositions?.['Sales Department'] || []), ...(prev['Sales Department'] || [])])),
        'Finance Department': Array.from(new Set([...(cloudData.customPositions?.['Finance Department'] || []), ...(prev['Finance Department'] || [])])),
        'Service Department': Array.from(new Set([...(cloudData.customPositions?.['Service Department'] || []), ...(prev['Service Department'] || [])])),
      }));
    }

    // Update diff fingerprint so local auto-save doesn't immediately echo back
    updateLastKnownPayload(cloudData);

    saveToLocalStorage({
      ...cloudData,
      ...(finalSales ? { sales: finalSales } : {}),
      ...(finalInventory ? { inventory: finalInventory } : {}),
    });
  };

  // 1. Initial Cloud Load & Real-time Cloud Subscription
  useEffect(() => {
    registerLocalStateProvider(() => livePayloadRef.current || {});
    const runInitialFetch = async () => {
      try {
        const cloudData = await fetchCloudData();
        if (cloudData) {
          processAndMergeCloudData(cloudData);
          setCloudSyncStatus('synced');
          setLastSyncedTime(new Date(cloudData.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          isInitialCloudLoadRef.current = true;
          return true;
        }
      } catch (err) {
        if (isQuotaExceededError(err) || getIsQuotaExceeded()) {
          setCloudSyncStatus('quota_exceeded');
        } else if (isOfflineOrUnavailableError(err)) {
          setCloudSyncStatus('synced');
        } else {
          console.warn('Initial cloud sync notice:', err);
          setCloudSyncStatus('error');
        }
      }
      isInitialCloudLoadRef.current = true;
      return false;
    };

    runInitialFetch().then((ok) => {
      if (!ok) {
        setTimeout(() => runInitialFetch(), 2500);
      }
    });

    // Real-time listener: any edits made in Web browser or other tabs will sync here instantly
    const unsubscribe = subscribeToCloudData(
      (data) => {
        // Safety window against immediate React state echo
        remoteUpdateLockUntilRef.current = Date.now() + 800;

        processAndMergeCloudData(data);
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date(data.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      },
      (err) => {
        if (isQuotaExceededError(err) || getIsQuotaExceeded()) {
          setCloudSyncStatus('quota_exceeded');
        } else if (isOfflineOrUnavailableError(err)) {
          setCloudSyncStatus('synced');
        } else {
          console.warn('Cloud subscription notice:', err);
          setCloudSyncStatus('error');
        }
      }
    );

    const unsubscribeShopSettings = initShopSettingsCloudSync();

    return () => {
      unsubscribe();
      unsubscribeShopSettings();
    };
  }, []);

  // 2. Debounced auto-save to Cloud Firestore whenever user modifies state
  // OPTIMIZED FOR FREE TIER: Zero redundant write loops (diff string comparison skips duplicate payloads)
  useEffect(() => {
    if (!isInitialCloudLoadRef.current) return;

    const currentPayload = {
      branches,
      users,
      employees,
      salaryRecords,
      sales,
      expenses,
      inventory,
      stockMovements,
      contacts,
      purchases,
      supplierReturns,
      supplierBenefits,
      treasuryAccounts,
      treasuryTransactions,
      interBranchTransfers,
      customPositions: positionsMap,
    };

    // 1. Compute current payload diff
    const currentDiff = serializePayloadForDiff(currentPayload);

    // 2. If payload matches last known pushed/received payload string EXACTLY, return early!
    // Zero network calls, ZERO Firestore write quota consumption!
    if (currentDiff === getLastPushedPayloadString()) {
      return;
    }

    // Save rolling local snapshot & update sktg_last_updated_at
    const nowIso = new Date().toISOString();
    saveToLocalStorage({ ...currentPayload, updatedAt: nowIso });

    // If change was initiated by remote cloud snapshot, skip auto-pushing to prevent echo loops
    if (Date.now() < remoteUpdateLockUntilRef.current) {
      return;
    }

    // If quota exceeded, stay in safe local mode without triggering network writes
    if (getIsQuotaExceeded()) {
      setCloudSyncStatus('quota_exceeded');
      return;
    }

    const timer = setTimeout(async () => {
      isLocalUpdateRef.current = true;
      const res = await pushStateToCloud(currentPayload, currentUser?.displayName || 'User');
      if (res.isQuotaExceeded) {
        setCloudSyncStatus('quota_exceeded');
      } else if (res.success) {
        setCloudSyncStatus('synced');
        if (!res.skipped) {
          setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } else {
        setCloudSyncStatus('error');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [branches, users, employees, salaryRecords, sales, expenses, inventory, stockMovements, contacts, purchases, supplierReturns, supplierBenefits, treasuryAccounts, treasuryTransactions, interBranchTransfers, positionsMap]);

  // Manual Trigger Sync
  const handleManualSync = async () => {
    setCloudSyncStatus('syncing');
    resetQuotaCooldown();
    isLocalUpdateRef.current = true;
    try {
      const res = await pushStateToCloud(
        {
          branches,
          users,
          employees,
          salaryRecords,
          sales,
          expenses,
          inventory,
          stockMovements,
          contacts,
          purchases,
          supplierReturns,
          supplierBenefits,
          treasuryAccounts,
          treasuryTransactions,
          interBranchTransfers,
          customPositions: positionsMap,
        },
        currentUser?.displayName || 'Manual Sync',
        true
      );
      if (res.isQuotaExceeded) {
        setCloudSyncStatus('quota_exceeded');
      } else {
        setCloudSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      console.warn('Manual sync note:', e);
      setCloudSyncStatus('synced');
    }
  };

  // Sync to LocalStorage (as offline fallback)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  }, [employees]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALARY_RECORDS, JSON.stringify(salaryRecords));
  }, [salaryRecords]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(stockMovements));
  }, [stockMovements]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  }, [contacts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
  }, [purchases]);

  // Self-healing synchronization: Ensure PO stock quantities, IMEIs, and Brand Codes are faithfully reflected in Inventory
  useEffect(() => {
    if (!purchases || purchases.length === 0) return;
    setInventory((currentInventory) => {
      let changed = false;
      let updated = currentInventory.map((item) => {
        // Find matching purchase records
        const matchingPurchases = purchases.filter((p) => {
          const pName = p.itemName.trim().toLowerCase();
          const pModel = (p.model || '').trim().toLowerCase();
          const iName = item.name.trim().toLowerCase();
          const iModel = (item.model || '').trim().toLowerCase();
          return (
            pName === iName ||
            (pModel && pModel === iModel) ||
            (p.inventoryItemId && p.inventoryItemId === item.id) ||
            (p.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
          );
        });

        // Collect all IMEIs from matching purchases
        const allPoImeis: string[] = [];
        matchingPurchases.forEach((p) => {
          const list = (p.imeiList || p.serialNumbers || []).map((s) => s.trim()).filter(Boolean);
          list.forEach((im) => {
            if (!allPoImeis.includes(im)) {
              allPoImeis.push(im);
            }
          });
        });

        let newItem = { ...item };
        let itemChanged = false;

        // 1. Sync IMEIs if PO has IMEIs but inventory is missing them
        const currentImeis = item.imeiList && item.imeiList.length > 0
          ? [...item.imeiList]
          : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);

        if (allPoImeis.length > 0) {
          const combined = [...currentImeis];
          allPoImeis.forEach((im) => {
            if (!combined.includes(im)) {
              combined.push(im);
            }
          });
          if (combined.length > currentImeis.length || !item.imeiList || item.imeiList.length === 0) {
            newItem.imeiList = combined;
            newItem.imeiOrSerial = combined.join(', ');
            itemChanged = true;
          }
        }

        // 2. Fix Stock Code if wrong (e.g. Samsung phone with 6-digit category number instead of SS code)
        const detectedBrand = item.brand || detectBrandFromName(item.name, item.category);
        const brandPrefix = getBrandSKUPrefix(detectedBrand, item.category, item.name);
        if (brandPrefix && brandPrefix !== 'SKU' && !newItem.sku.toUpperCase().startsWith(brandPrefix.toUpperCase())) {
          if (/^\d{6}$/.test(newItem.sku) || newItem.sku.startsWith('PO-')) {
            const correctSku = generateAutoSKU(item.category, currentInventory, sales, detectedBrand, item.name);
            newItem.sku = correctSku;
            newItem.brand = detectedBrand;
            itemChanged = true;
          }
        }

        if (itemChanged) {
          changed = true;
          return newItem;
        }
        return item;
      });

      // 3. Ensure canonical PO items from PO vouchers (17 units across Shop 1 & System II) exist in Inventory
      const { items: reconciledList, changed: poChanged } = reconcileInventoryWithPoStock(updated, true);
      if (poChanged) {
        changed = true;
        updated = reconciledList;
      }

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return currentInventory;
    });
  }, [purchases, sales]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TREASURY_ACCOUNTS, JSON.stringify(treasuryAccounts));
  }, [treasuryAccounts]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TREASURY_TRANSACTIONS, JSON.stringify(treasuryTransactions));
  }, [treasuryTransactions]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INTER_BRANCH_TRANSFERS, JSON.stringify(interBranchTransfers));
  }, [interBranchTransfers]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_RETURNS, JSON.stringify(supplierReturns));
  }, [supplierReturns]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(supplierBenefits));
  }, [supplierBenefits]);

  // Branch permission access:
  // All employees can view stocks and select enterprise branches across the system
  useEffect(() => {
    if (!currentUser) return;
  }, [currentUser, branches]);

  // Handle User Switch
  const handleSwitchUser = (_user: UserAccount) => {
    // Switching accounts inside the app is disabled: sign out and sign in with the other account.
  };

  const handleAddUser = (newUser: UserAccount) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    setUsers((prev) => {
      const next = [...prev, newUser];
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save users to localStorage', e);
      }
      return next;
    });
    void saveRecordToCloud('users', newUser, currentUser?.displayName || 'Add User');
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    setUsers((prev) => {
      const next = prev.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save users to localStorage', e);
      }
      return next;
    });
    void saveRecordToCloud('users', updatedUser, currentUser?.displayName || 'Update User');
    if (currentUser && currentUser.id === updatedUser.id) {
      // Role and branch come from the Firebase profile and cannot be changed from this screen.
      setCurrentUser({ ...updatedUser, role: currentUser.role, branchId: currentUser.branchId, branchName: currentUser.branchName });
    }

    // Bidirectional sync to linked employee
    setEmployees((prev) => {
      let changed = false;
      const cleanEmpName = updatedUser.displayName.replace(/\s*\([^)]*\)\s*$/, '').trim() || updatedUser.displayName.trim();
      const next = prev.map((emp) => {
        const isLinked =
          (updatedUser.employeeId && emp.id === updatedUser.employeeId) ||
          (emp.userAccountId && emp.userAccountId === updatedUser.id) ||
          (updatedUser.employeeCode && emp.code === updatedUser.employeeCode) ||
          (emp.username && updatedUser.username && emp.username.toLowerCase() === updatedUser.username.toLowerCase());
        if (isLinked) {
          changed = true;
          return {
            ...emp,
            name: cleanEmpName,
            username: updatedUser.username,
            userAccountId: updatedUser.id,
            employeeCode: emp.code || updatedUser.employeeCode,
          };
        }
        return emp;
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
      }
      return next;
    });
  };

  const handleDeleteUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    requestDelete({
      title: 'Delete User Account',
      description: 'Are you sure you want to delete this user account? The user will no longer be able to log in to the system.',
      itemName: user ? `${user.displayName} (${user.username} • ${user.role})` : 'Selected Account',
      onConfirm: () => {
        lastLocalActionTimeRef.current = Date.now();
        isLocalUpdateRef.current = true;
        setUsers((prev) => {
          const next = prev.filter((u) => u.id !== id);
          try {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
          return next;
        });
        void deleteDocumentFromCloud('users', id, currentUser?.displayName || 'Delete User');
      },
    });
  };

  const executeDeleteBranch = (branchId: string) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    const nextBranches = branches.filter((b) => b.id !== branchId);
    setBranches(nextBranches);
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(nextBranches));
    void deleteDocumentFromCloud('branches', branchId, currentUser?.displayName || 'Delete Branch');
    if (activeBranchFilter === branchId) {
      setActiveBranchFilter('ALL');
    }
    const nextUsers = users.map((u) =>
      u.branchId === branchId ? { ...u, branchId: 'ALL', branchName: 'All Branches (Enterprise)' } : u
    );
    setUsers(nextUsers);
    setCurrentUser((prev) => {
      if (!prev) return prev;
      if (prev.branchId === branchId) {
        return { ...prev, branchId: 'ALL', branchName: 'All Branches (Enterprise)' };
      }
      return prev;
    });
  };

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    const branchEmployees = employees.filter((e) => e.branchId === branchId);
    const branchSales = sales.filter((s) => s.branchId === branchId);

    const detailWarning = branchEmployees.length > 0 || branchSales.length > 0
      ? `Notice: This branch has ${branchEmployees.length} linked staff and ${branchSales.length} linked sales records. Deleting this branch will safely unassign them to All Branches. Are you sure you want to proceed?`
      : 'Are you sure you want to delete this branch location?';

    requestDelete({
      title: 'Delete Branch Location',
      description: detailWarning,
      itemName: branch ? `${branch.code} • ${branch.name} (${branch.city})` : 'Selected Branch',
      confirmText: 'Delete Branch',
      onConfirm: () => {
        executeDeleteBranch(branchId);
      },
    });
  };

  const handleDeleteAllBranches = () => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    setBranches([]);
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify([]));
    setActiveBranchFilter('ALL');

    const nextUsers = users.map((u) => ({ ...u, branchId: 'ALL', branchName: 'All Branches (Enterprise)' }));
    setUsers(nextUsers);
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return { ...prev, branchId: 'ALL', branchName: 'All Branches (Enterprise)' };
    });


  };

  const handleAddBranch = (newB: Branch) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    const normalizedB = normalizeBranch(newB);
    const nextBranches = [...branches, normalizedB];
    setBranches(nextBranches);
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(nextBranches));
    void saveRecordToCloud('branches', normalizedB, currentUser?.displayName || 'Add Branch');
  };

  const handleUpdateBranch = (updatedB: Branch) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    const normalizedB = normalizeBranch(updatedB);
    const nextBranches = branches.map((b) => (b.id === normalizedB.id ? normalizedB : b));
    setBranches(nextBranches);
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(nextBranches));
    void saveRecordToCloud('branches', normalizedB, currentUser?.displayName || 'Update Branch');

    // 2. Cascade updated branch name to Users
    const nextUsers = users.map((u) => (u.branchId === normalizedB.id ? { ...u, branchName: normalizedB.name } : u));
    setUsers(nextUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));

    // 3. Cascade to Current User if active
    setCurrentUser((prev) => {
      if (!prev) return prev;
      if (prev.branchId === updatedB.id) {
        const updatedCurrentUser = { ...prev, branchName: updatedB.name };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser));
        return updatedCurrentUser;
      }
      return prev;
    });

    // 4. Cascade to Employees
    const nextEmployees = employees.map((emp) => (emp.branchId === updatedB.id ? { ...emp, branchName: updatedB.name } : emp));
    setEmployees(nextEmployees);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmployees));

    // 5. Cascade to Salary Records
    const nextSalaryRecords = salaryRecords.map((r) => (r.branchId === updatedB.id ? { ...r, branchName: updatedB.name } : r));
    setSalaryRecords(nextSalaryRecords);
    localStorage.setItem(STORAGE_KEYS.SALARY_RECORDS, JSON.stringify(nextSalaryRecords));

    // 6. Cascade to Daily Sales
    const nextSales = sales.map((s) => (s.branchId === updatedB.id ? { ...s, branchName: `${updatedB.code} - ${updatedB.name}` } : s));
    setSales(nextSales);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(nextSales));

    // 7. Cascade to Daily Expenses
    const nextExpenses = expenses.map((exp) => (exp.branchId === updatedB.id ? { ...exp, branchName: updatedB.name } : exp));
    setExpenses(nextExpenses);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(nextExpenses));

    // 8. Cascade to Stock Movements
    const nextStockMovements = stockMovements.map((m) => {
      let updated = { ...m };
      if (m.fromBranchId === updatedB.id) updated.fromBranchName = updatedB.code;
      if (m.toBranchId === updatedB.id) updated.toBranchName = updatedB.code;
      return updated;
    });
    setStockMovements(nextStockMovements);
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(nextStockMovements));


  };

  const handleSignOut = async () => {
    try {
      await signOutStaff();
    } catch (e) {}
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem('sktg_current_user');
    } catch (e) {}
    setIsLoginModalOpen(false);
  };

  // Sales Handlers
  const handleAddSale = (newSale: DailySale, inventoryItemId?: string, quantity: number = 1) => {
    setSales((prev) => [newSale, ...prev]);

    const branchObj = branches.find((b) => b.id === newSale.branchId);
    const performedByName = newSale.technicianName || newSale.employeeName || (currentUser ? currentUser.displayName : 'Staff');

    // Multi-item inventory stock deduction if sale contains multiple items
    if (newSale.items && newSale.items.length > 0) {
      newSale.items.forEach((ci, idx) => {
        const targetItemId = ci.inventoryItemId || inventory.find((i) => 
          (ci.sku && i.sku.toLowerCase() === ci.sku.toLowerCase()) || 
          (i.name.trim().toLowerCase() === ci.name.trim().toLowerCase())
        )?.id;

        if (targetItemId) {
          const deductQty = Math.max(1, ci.quantity || 1);
          const soldImeis = ci.imeiOrSerial
            ? ci.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
            : [];

          setInventory((prev) =>
            prev.map((item) => {
              if (item.id === targetItemId) {
                const updated = deductStockForSale(item, newSale.branchId, deductQty, soldImeis);
                void saveRecordToCloud('inventory', updated, performedByName);
                return updated;
              }
              return item;
            })
          );

          const itemObj = inventory.find((i) => i.id === targetItemId);
          const imeiNote = soldImeis.length > 0 ? ` • Sold IMEIs: ${soldImeis.join(', ')}` : '';
          const movement: StockMovement = {
            id: `move-${Date.now()}-${idx}`,
            itemId: targetItemId,
            itemName: ci.name,
            itemCategory: (ci.category || itemObj?.category || 'Accessories & Gadgets') as InventoryCategory,
            sku: ci.sku || itemObj?.sku || 'SKU',
            type: 'STOCK_OUT',
            fromBranchId: newSale.branchId,
            fromBranchName: branchObj ? `${branchObj.code} (${branchObj.city})` : 'Main Branch',
            quantity: deductQty,
            date: newSale.date,
            referenceNo: newSale.invoiceNo,
            imeiList: soldImeis.length > 0 ? soldImeis : undefined,
            imeiOrSerial: soldImeis.length > 0 ? soldImeis.join(', ') : undefined,
            performedBy: performedByName,
            notes: `Issued via sales voucher (Voucher: #${newSale.invoiceNo})${imeiNote}`,
            createdAt: new Date().toISOString(),
          };
          setStockMovements((prev) => [movement, ...prev]);
          void saveRecordToCloud('stockMovements', movement, performedByName);
        }
      });
    } else if (inventoryItemId) {
      // Single product stock deduction fallback
      const deductQty = Math.max(1, quantity || 1);
      const soldImeis = newSale.deviceSerial
        ? newSale.deviceSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : [];

      setInventory((prev) =>
        prev.map((item) => {
          if (item.id === inventoryItemId) {
            const updated = deductStockForSale(item, newSale.branchId, deductQty, soldImeis);
            void saveRecordToCloud('inventory', updated, performedByName);
            return updated;
          }
          return item;
        })
      );

      // Record stock-out movement
      const itemObj = inventory.find((i) => i.id === inventoryItemId);
      const isService = newSale.saleType === 'SERVICE';
      const imeiNote = soldImeis.length > 0 ? ` • Sold IMEIs: ${soldImeis.join(', ')}` : '';

      const movement: StockMovement = {
        id: `move-${Date.now()}`,
        itemId: inventoryItemId,
        itemName: isService && newSale.sparePartsUsed ? newSale.sparePartsUsed : newSale.itemName,
        itemCategory: itemObj?.category || 'Accessories & Gadgets',
        sku: itemObj?.sku || 'SKU',
        type: 'STOCK_OUT',
        fromBranchId: newSale.branchId,
        fromBranchName: branchObj ? `${branchObj.code} (${branchObj.city})` : 'Main Branch',
        quantity: deductQty,
        date: newSale.date,
        referenceNo: newSale.invoiceNo,
        imeiList: soldImeis.length > 0 ? soldImeis : undefined,
        imeiOrSerial: soldImeis.length > 0 ? soldImeis.join(', ') : undefined,
        performedBy: performedByName,
        notes: isService 
          ? `Used as spare part in repair service (Voucher: #${newSale.invoiceNo} - ${newSale.deviceModel || ''})${imeiNote}`
          : `Issued via sales voucher (Voucher: #${newSale.invoiceNo})${imeiNote}`,
        createdAt: new Date().toISOString(),
      };
      setStockMovements((prev) => [movement, ...prev]);
      void saveRecordToCloud('stockMovements', movement, performedByName);
    }
    void saveRecordToCloud('sales', newSale, performedByName);
  };

  const handleUpdateSale = (updatedSale: DailySale) => {
    setSales((prev) => prev.map((s) => (s.id === updatedSale.id ? updatedSale : s)));
    void saveRecordToCloud('sales', updatedSale, currentUser?.displayName || 'Update Sale');
    handleLogActivity({
      module: 'SALES',
      action: 'UPDATE',
      title: `Updated Sales Voucher #${updatedSale.invoiceNo}`,
      description: `${currentUser.displayName} (${currentUser.role}) updated voucher #${updatedSale.invoiceNo} for ${updatedSale.itemName} (${formatMMK(updatedSale.salePrice)}).`,
      details: {
        invoiceNo: updatedSale.invoiceNo,
        itemName: updatedSale.itemName,
        salePrice: updatedSale.salePrice,
        customerName: updatedSale.customerName,
        branchName: updatedSale.branchName,
      },
    });
  };

  const handleDeleteSale = (id: string, voidMeta?: { authorizedBy: string; reason: string }) => {
    if (id.startsWith('rma-refund-')) {
      const realRmaId = id.replace('rma-refund-', '');
      handleDeleteSupplierReturn(realRmaId, true);
      return;
    }
    if (id.startsWith('supplier-benefit-')) {
      const realBenefitId = id.replace('supplier-benefit-', '');
      handleDeleteSupplierBenefit(realBenefitId);
      return;
    }
    const sale = sales.find((s) => s.id === id);
    if (!sale) return;

    // Restore stock for multi-item cart OR single inventory item
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        const targetItemId = item.inventoryItemId || inventory.find((i) => 
          (item.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) || 
          (i.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        )?.id;

        if (targetItemId) {
          const restoreQty = Math.max(1, item.quantity || 1);
          const restoredImeis = item.imeiOrSerial
            ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
            : [];
          setInventory((prev) =>
            prev.map((inv) => {
              if (inv.id === targetItemId) {
                return restoreStockForSale(inv, sale.branchId, restoreQty, restoredImeis);
              }
              return inv;
            })
          );
        }
      });
    } else if (sale.inventoryItemId) {
      const restoreQty = Math.max(1, sale.quantity || 1);
      const restoredImeis = sale.deviceSerial
        ? sale.deviceSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : [];
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id === sale.inventoryItemId) {
            return restoreStockForSale(item, sale.branchId, restoreQty, restoredImeis);
          }
          return item;
        })
      );
    }

    // Add RESTOCK movements to StockMovements ledger for complete audit trail
    const branchObj = branches.find((b) => b.id === sale.branchId);
    const voidAuthor = voidMeta?.authorizedBy || currentUser?.displayName || 'Authorized Admin';
    const voidReason = voidMeta?.reason ? ` (Reason: ${voidMeta.reason})` : '';
    const restoreMovements: StockMovement[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item, idx) => {
        const targetItemId = item.inventoryItemId || inventory.find((i) => 
          (item.sku && i.sku.toLowerCase() === item.sku.toLowerCase()) || 
          (i.name.trim().toLowerCase() === item.name.trim().toLowerCase())
        )?.id;
        if (targetItemId) {
          const itemObj = inventory.find((i) => i.id === targetItemId);
          const restoreQty = Math.max(1, item.quantity || 1);
          const restoredImeis = item.imeiOrSerial
            ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
            : [];
          restoreMovements.push({
            id: `move-void-${Date.now()}-${idx}`,
            itemId: targetItemId,
            itemName: item.name,
            itemCategory: (item.category || itemObj?.category || 'Accessories & Gadgets') as InventoryCategory,
            sku: item.sku || itemObj?.sku || 'SKU',
            type: 'STOCK_IN',
            toBranchId: sale.branchId,
            toBranchName: branchObj ? `${branchObj.code} (${branchObj.city})` : 'Main Branch',
            quantity: restoreQty,
            date: todayStr,
            referenceNo: `VOID-#${sale.invoiceNo}`,
            imeiList: restoredImeis.length > 0 ? restoredImeis : undefined,
            imeiOrSerial: restoredImeis.length > 0 ? restoredImeis.join(', ') : undefined,
            performedBy: voidAuthor,
            notes: `Stock restored from voided sale #${sale.invoiceNo}${voidReason}`,
            createdAt: new Date().toISOString(),
          });
        }
      });
    } else if (sale.inventoryItemId) {
      const itemObj = inventory.find((i) => i.id === sale.inventoryItemId);
      const restoreQty = Math.max(1, sale.quantity || 1);
      const restoredImeis = sale.deviceSerial
        ? sale.deviceSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
        : [];
      restoreMovements.push({
        id: `move-void-${Date.now()}-0`,
        itemId: sale.inventoryItemId,
        itemName: sale.itemName,
        itemCategory: (sale.category || itemObj?.category || 'Accessories & Gadgets') as InventoryCategory,
        sku: sale.sku || itemObj?.sku || 'SKU',
        type: 'STOCK_IN',
        toBranchId: sale.branchId,
        toBranchName: branchObj ? `${branchObj.code} (${branchObj.city})` : 'Main Branch',
        quantity: restoreQty,
        date: todayStr,
        referenceNo: `VOID-#${sale.invoiceNo}`,
        imeiList: restoredImeis.length > 0 ? restoredImeis : undefined,
        imeiOrSerial: restoredImeis.length > 0 ? restoredImeis.join(', ') : undefined,
        performedBy: voidAuthor,
        notes: `Stock restored from voided sale #${sale.invoiceNo}${voidReason}`,
        createdAt: new Date().toISOString(),
      });
    }

    let updatedMovements = stockMovements;
    if (restoreMovements.length > 0) {
      updatedMovements = [...restoreMovements, ...stockMovements];
      setStockMovements(updatedMovements);
    }

    const updatedSales = sales.filter((s) => s.id !== id);
    setSales(updatedSales);
    const nowIso = new Date().toISOString();
    localStorage.setItem('sktg_sales_cleared_at', nowIso);
    localStorage.setItem('sktg_last_updated_at', nowIso);
    saveToLocalStorage({ sales: updatedSales, updatedAt: nowIso });
    void deleteDocumentFromCloud('sales', id, currentUser?.displayName || 'Delete Sales Voucher');

    pushStateToCloud(
      {
        branches,
        users,
        employees,
        salaryRecords,
        sales: updatedSales,
        expenses,
        inventory,
        stockMovements: updatedMovements,
        contacts,
        purchases,
        supplierReturns,
        supplierBenefits,
        treasuryAccounts,
        treasuryTransactions,
        interBranchTransfers,
        customPositions: positionsMap,
      },
      currentUser?.displayName || 'Delete Sales Voucher',
      true
    );

    const authText = voidMeta ? `[Authorized by ${voidMeta.authorizedBy} - Reason: ${voidMeta.reason}]` : '';
    handleLogActivity({
      module: 'SALES',
      action: 'DELETE',
      title: `Voided / Deleted Sales Voucher #${sale.invoiceNo}`,
      description: `${currentUser.displayName} (${currentUser.role}) voided voucher #${sale.invoiceNo} (${sale.itemName}, ${formatMMK(sale.salePrice)}). ${authText}`,
      details: {
        invoiceNo: sale.invoiceNo,
        itemName: sale.itemName,
        salePrice: sale.salePrice,
        branchName: sale.branchName,
        authorizedBy: voidMeta?.authorizedBy,
        voidReason: voidMeta?.reason,
      },
    });
  };

  // Modern Smart POS Checkout Handler
  const handleCompleteSmartPOSSale = (newSale: DailySale, cartItems: SaleCartItem[]) => {
    setSales((prev) => [newSale, ...prev]);

    // Multi-item inventory stock deduction and stock movements
    const branchObj = branches.find((b) => b.id === newSale.branchId);
    const performedByName = newSale.salespersonName || (currentUser ? currentUser.displayName : 'Staff');

    cartItems.forEach((cartItem, idx) => {
      const targetItemId = cartItem.inventoryItemId || inventory.find((i) => 
        (cartItem.sku && i.sku.toLowerCase() === cartItem.sku.toLowerCase()) || 
        (i.name.trim().toLowerCase() === cartItem.name.trim().toLowerCase())
      )?.id;

      if (targetItemId) {
        const deductQty = Math.max(1, cartItem.quantity || 1);
        const soldImeis = cartItem.imeiOrSerial
          ? cartItem.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
          : [];

        setInventory((prev) =>
          prev.map((item) => {
            if (item.id === targetItemId) {
              return deductStockForSale(item, newSale.branchId, deductQty, soldImeis);
            }
            return item;
          })
        );

        const movement: StockMovement = {
          id: `move-pos-${Date.now()}-${idx}`,
          itemId: targetItemId,
          itemName: cartItem.name,
          itemCategory: (cartItem.category || 'Accessories & Gadgets') as InventoryCategory,
          sku: cartItem.sku || 'SKU',
          type: 'STOCK_OUT',
          fromBranchId: newSale.branchId,
          fromBranchName: branchObj ? `${branchObj.code} (${branchObj.city})` : 'Main Branch',
          quantity: deductQty,
          date: newSale.date,
          referenceNo: newSale.invoiceNo,
          imeiList: soldImeis.length > 0 ? soldImeis : undefined,
          imeiOrSerial: soldImeis.length > 0 ? soldImeis.join(', ') : undefined,
          performedBy: performedByName,
          notes: `Fast POS Checkout (Voucher: #${newSale.invoiceNo})${soldImeis.length > 0 ? ` • Sold IMEIs: ${soldImeis.join(', ')}` : ''}`,
          createdAt: new Date().toISOString(),
        };
        setStockMovements((prev) => [movement, ...prev]);
      }
    });

    // Update active shift if open
    if (activeShift) {
      const isCash = newSale.paymentMethod === 'Cash';
      setShifts((prev) =>
        prev.map((s) => {
          if (s.id === activeShift.id) {
            return {
              ...s,
              totalSalesCount: (s.totalSalesCount || 0) + 1,
              totalSalesAmount: (s.totalSalesAmount || 0) + newSale.salePrice,
              totalCashSales: (s.totalCashSales || 0) + (isCash ? (newSale.paidAmount || newSale.salePrice) : 0),
              totalDigitalSales: (s.totalDigitalSales || 0) + (!isCash ? (newSale.paidAmount || newSale.salePrice) : 0),
              expectedCashInDrawer: (s.expectedCashInDrawer || s.openingCash) + (isCash ? (newSale.paidAmount || newSale.salePrice) : 0),
            };
          }
          return s;
        })
      );
    }

    handleLogActivity({
      module: 'SALES',
      action: 'CREATE',
      title: `Smart POS Sale #${newSale.invoiceNo}`,
      description: `${performedByName} processed POS checkout #${newSale.invoiceNo} (${cartItems.length} items, Total: ${formatMMK(newSale.salePrice)}).`,
      details: {
        invoiceNo: newSale.invoiceNo,
        itemsCount: cartItems.length,
        salePrice: newSale.salePrice,
        paymentMethod: newSale.paymentMethod,
        customerName: newSale.customerName,
      },
    });
  };

  // Cashier Shift Management Handlers
  const handleStartShift = (openingCash: number, notes?: string) => {
    const userBranch = branches.find(
      (b) => b.id === (currentUser?.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser?.branchId)
    ) || branches[0];
    const now = new Date();
    const newShift: CashierShift = {
      id: `shift-${Date.now()}`,
      shiftNumber: String(shifts.length + 1),
      cashierId: currentUser?.id || 'cashier',
      cashierName: currentUser?.displayName || 'Cashier',
      branchId: userBranch?.id || 'branch-1',
      branchName: userBranch ? `${userBranch.code} - ${userBranch.name}` : 'Main Branch',
      startTime: now.toISOString(),
      openingCash,
      expectedCashInDrawer: openingCash,
      totalSalesCount: 0,
      totalSalesAmount: 0,
      totalCashSales: 0,
      totalDigitalSales: 0,
      status: 'OPEN',
      notes,
    };
    setShifts((prev) => [newShift, ...prev]);
    handleLogActivity({
      module: 'FINANCE',
      action: 'CREATE',
      title: `Cashier Shift #${newShift.shiftNumber} Opened`,
      description: `${newShift.cashierName} opened shift at ${newShift.branchName} with opening float of ${formatMMK(openingCash)}.`,
    });
  };

  const handleCloseShift = (actualCash: number, expectedCash: number, notes?: string) => {
    if (!activeShift) return;
    const discrepancy = actualCash - expectedCash;
    const now = new Date();
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === activeShift.id) {
          return {
            ...s,
            endTime: now.toISOString(),
            actualCashCounted: actualCash,
            cashDiscrepancy: discrepancy,
            status: 'CLOSED',
            notes: notes ? (s.notes ? `${s.notes}; ${notes}` : notes) : s.notes,
          };
        }
        return s;
      })
    );
    handleLogActivity({
      module: 'FINANCE',
      action: 'UPDATE',
      title: `Cashier Shift #${activeShift.shiftNumber} Closed (Z-Report)`,
      description: `${activeShift.cashierName} closed shift. Expected: ${formatMMK(expectedCash)}, Actual: ${formatMMK(actualCash)}, Discrepancy: ${discrepancy >= 0 ? '+' : ''}${formatMMK(discrepancy)}.`,
    });
  };

  const handleSaveHoldBill = (bill: HoldBill) => {
    setHeldBills((prev) => {
      const idx = prev.findIndex((b) => b.id === bill.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = bill;
        return next;
      }
      return [bill, ...prev];
    });
  };

  const handleRemoveHoldBill = (id: string) => {
    setHeldBills((prev) => prev.filter((b) => b.id !== id));
  };

  // Inventory Handlers
  const handleAddInventoryItem = (newItem: InventoryItem) => {
    const normalized = normalizeInventoryItem(newItem);
    setInventory((prev) => [normalized, ...prev]);
    void saveRecordToCloud('inventory', normalized, currentUser?.displayName || 'Inventory Manager');
    handleLogActivity({
      module: 'INVENTORY',
      action: 'CREATE',
      title: `Created New Product: ${normalized.name}`,
      description: `${currentUser.displayName} (${currentUser.role}) added new product ${normalized.name} (SKU: ${normalized.sku}) to catalog.`,
      details: {
        sku: normalized.sku,
        name: normalized.name,
        category: normalized.category,
        totalStock: normalized.totalStock,
      },
    });
  };

  const handleUpdateInventoryItem = (updated: InventoryItem) => {
    const normalized = normalizeInventoryItem(updated);
    setInventory((prev) => prev.map((i) => (i.id === normalized.id ? normalized : i)));
    void saveRecordToCloud('inventory', normalized, currentUser?.displayName || 'Inventory Manager');
    handleLogActivity({
      module: 'INVENTORY',
      action: 'UPDATE',
      title: `Updated Stock Item: ${normalized.name}`,
      description: `${currentUser.displayName} (${currentUser.role}) updated inventory product ${normalized.name} (SKU: ${normalized.sku}). Total stock: ${normalized.totalStock} units.`,
      details: {
        sku: normalized.sku,
        name: normalized.name,
        totalStock: normalized.totalStock,
        costPrice: normalized.costPrice,
        sellingPrice: normalized.sellingPrice,
      },
    });
  };

  const handleDeleteInventoryItem = (id: string) => {
    const item = inventory.find((i) => i.id === id);
    requestDelete({
      title: 'Delete Stock Item',
      description: 'Are you sure you want to permanently delete this inventory item? All associated stock balances will be removed.',
      itemName: item ? `${item.sku} • ${item.name} (${item.model})` : 'Selected Product',
      onConfirm: () => {
        setInventory((prev) => prev.filter((i) => i.id !== id));
        void deleteDocumentFromCloud('inventory', id, currentUser?.displayName || 'Delete Product');
        if (item) {
          handleLogActivity({
            module: 'INVENTORY',
            action: 'DELETE',
            title: `Deleted Stock Item: ${item.name}`,
            description: `${currentUser.displayName} (${currentUser.role}) deleted inventory product SKU ${item.sku} (${item.name}).`,
            details: {
              sku: item.sku,
              name: item.name,
              category: item.category,
            },
          });
        }
      },
    });
  };

  const handleClearAllStock = () => {
    requestDelete({
      title: 'Clear All Inventory Stock Products',
      description: 'Are you sure you want to permanently delete ALL current inventory stock items? All current product stock balances, IMEIs, and serial numbers will be wiped so you can re-enter new stock. Stock ID prefix rules (Samsung = SS0001, iPhone = IP0001, etc.) remain intact.',
      itemName: `${inventory.length} Stock Products in Inventory`,
      onConfirm: async () => {
        const nowIso = new Date().toISOString();
        localStorage.setItem('sktg_inventory_cleared_at', nowIso);
        localStorage.setItem('sktg_last_updated_at', nowIso);
        setInventory([]);
        saveToLocalStorage({ inventory: [], updatedAt: nowIso });

        const clearedPayload: CloudSyncPayload = {
          branches,
          users,
          employees,
          salaryRecords,
          sales,
          expenses,
          inventory: [],
          stockMovements,
          contacts,
          purchases,
          supplierReturns,
          supplierBenefits,
          treasuryAccounts,
          treasuryTransactions,
          interBranchTransfers,
          customPositions: positionsMap,
          updatedAt: nowIso,
          updatedBy: currentUser?.displayName || 'Clear All Inventory Stock',
        };
        updateLastKnownPayload(clearedPayload);

        await pushStateToCloud(
          clearedPayload,
          currentUser?.displayName || 'Clear All Inventory Stock',
          true
        );

        handleLogActivity({
          module: 'INVENTORY',
          action: 'DELETE',
          title: 'Cleared All Inventory Stock',
          description: `${currentUser?.displayName} (${currentUser?.role}) permanently wiped all system inventory stock items. Stock ID standards preserved.`,
        });
        setCacheNotice('စနစ်တစ်ခုလုံးရှိ ကုန်ပစ္စည်း Stock အားလုံးကို အောင်မြင်စွာ ဖျက်သိမ်းပြီးပါပြီ (Stock = 0)');
      },
    });
  };

  const handleStockIn = (movement: StockMovement) => {
    setStockMovements((prev) => [movement, ...prev]);
    if (movement.toBranchId) {
      const targetBId = movement.toBranchId;
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id === movement.itemId) {
            const updatedStock = { ...(item.branchStock || {}) };
            if (isSharedStockPool(targetBId)) {
              const curShared = Number(updatedStock[SHOP_1_BRANCH_ID] ?? updatedStock[SYSTEM_2_BRANCH_ID] ?? 0);
              const nextVal = curShared + movement.quantity;
              updatedStock[SHOP_1_BRANCH_ID] = nextVal;
              updatedStock[SYSTEM_2_BRANCH_ID] = nextVal;
            } else {
              const cur = Number(updatedStock[targetBId] || 0);
              updatedStock[targetBId] = cur + movement.quantity;
            }
            const synced = syncBranchStocks(updatedStock);
            const totalStock = calculateTotalPhysicalStock(synced);
            return {
              ...item,
              branchStock: synced,
              totalStock,
              lastRestockedDate: movement.date,
            };
          }
          return item;
        })
      );
    }
  };

  const handleStockTransfer = (movement: StockMovement) => {
    setStockMovements((prev) => [movement, ...prev]);
    if (movement.fromBranchId && movement.toBranchId) {
      const { fromBranchId, toBranchId, quantity } = movement;
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id === movement.itemId) {
            const updatedStock = { ...(item.branchStock || {}) };
            if (!(isSharedStockPool(fromBranchId) && isSharedStockPool(toBranchId))) {
              // Deduct from source
              if (isSharedStockPool(fromBranchId)) {
                const cur = Number(updatedStock[SHOP_1_BRANCH_ID] ?? updatedStock[SYSTEM_2_BRANCH_ID] ?? 0);
                const nextVal = Math.max(0, cur - quantity);
                updatedStock[SHOP_1_BRANCH_ID] = nextVal;
                updatedStock[SYSTEM_2_BRANCH_ID] = nextVal;
              } else {
                const cur = Number(updatedStock[fromBranchId] || 0);
                updatedStock[fromBranchId] = Math.max(0, cur - quantity);
              }

              // Add to destination
              if (isSharedStockPool(toBranchId)) {
                const cur = Number(updatedStock[SHOP_1_BRANCH_ID] ?? updatedStock[SYSTEM_2_BRANCH_ID] ?? 0);
                const nextVal = cur + quantity;
                updatedStock[SHOP_1_BRANCH_ID] = nextVal;
                updatedStock[SYSTEM_2_BRANCH_ID] = nextVal;
              } else {
                const cur = Number(updatedStock[toBranchId] || 0);
                updatedStock[toBranchId] = cur + quantity;
              }
            }

            const synced = syncBranchStocks(updatedStock);
            const totalStock = calculateTotalPhysicalStock(synced);
            return {
              ...item,
              branchStock: synced,
              totalStock,
            };
          }
          return item;
        })
      );
    }
  };

  const handleStockAuditAdjust = (
    adjustments: Array<{
      itemId: string;
      branchId: string;
      newQty: number;
      difference: number;
      notes: string;
    }>
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const newMovements: StockMovement[] = [];

    adjustments.forEach((adj) => {
      const item = inventory.find((i) => i.id === adj.itemId);
      const branchObj = branches.find((b) => b.id === adj.branchId);
      if (item) {
        newMovements.push({
          id: `move-audit-${Date.now()}-${adj.itemId}`,
          itemId: adj.itemId,
          itemName: item.name,
          itemCategory: item.category,
          sku: item.sku,
          type: 'AUDIT_ADJUSTMENT',
          toBranchId: adj.branchId,
          toBranchName: branchObj?.code || 'Branch',
          quantity: Math.abs(adj.difference),
          date: today,
          referenceNo: `AUDIT-${Date.now().toString().slice(-4)}`,
          performedBy: currentUser.displayName,
          notes: `Stock count adjustment (${adj.difference > 0 ? '+' : ''}${adj.difference}): ${adj.notes}`,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    setInventory((prev) =>
      prev.map((item) => {
        const itemAdjustments = adjustments.filter((a) => a.itemId === item.id);
        if (itemAdjustments.length === 0) return item;

        const updatedBranchStock = { ...item.branchStock };
        itemAdjustments.forEach((adj) => {
          if (isSharedStockPool(adj.branchId)) {
            updatedBranchStock[SHOP_1_BRANCH_ID] = adj.newQty;
            updatedBranchStock[SYSTEM_2_BRANCH_ID] = adj.newQty;
          } else {
            updatedBranchStock[adj.branchId] = adj.newQty;
          }
        });

        const synced = syncBranchStocks(updatedBranchStock);
        const totalStock = calculateTotalPhysicalStock(synced);

        return {
          ...item,
          branchStock: synced,
          totalStock,
        };
      })
    );
  };

  // Expenses Handlers
  const handleAddExpense = (newExp: DailyExpense) => {
    setExpenses((prev) => [newExp, ...prev]);
    void saveRecordToCloud('expenses', newExp, currentUser?.displayName || 'Add Expense');
  };

  const handleDeleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    requestDelete({
      title: 'Delete Expense Voucher',
      description: 'Are you sure you want to permanently delete this expense record?',
      itemName: exp ? `${exp.voucherNo} • ${exp.title} (${formatMMK(exp.amount)})` : 'Selected Expense Voucher',
      onConfirm: () => {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        void deleteDocumentFromCloud('expenses', id, currentUser?.displayName || 'Delete Expense');
      },
    });
  };

  // Employees Handlers
  const handleAddEmployee = (emp: Employee) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    setEmployees((prev) => {
      const next = [...prev, emp];
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save employees to localStorage', e);
      }
      return next;
    });
    void saveRecordToCloud('employees', emp, currentUser?.displayName || 'Add Employee');
  };

  const handleUpdateEmployee = (emp: Employee) => {
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;
    let nextEmployees: Employee[] = [];
    setEmployees((prev) => {
      nextEmployees = prev.map((e) => (e.id === emp.id ? emp : e));
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmployees));
      } catch (e) {
        console.error('Failed to save employees to localStorage', e);
      }
      return nextEmployees;
    });
    void saveRecordToCloud('employees', emp, currentUser?.displayName || 'Update Employee');

    // Bidirectional sync to linked user account
    setUsers((prev) => {
      let changed = false;
      const next = prev.map((u) => {
        const isLinked =
          (emp.userAccountId && u.id === emp.userAccountId) ||
          (u.employeeId && u.employeeId === emp.id) ||
          (emp.code && u.employeeCode === emp.code) ||
          (u.username && emp.username && u.username.toLowerCase() === emp.username.toLowerCase());
        if (isLinked) {
          changed = true;
          return {
            ...u,
            displayName: emp.name,
            username: emp.username || u.username,
            employeeCode: emp.code || u.employeeCode,
            employeeId: emp.id,
          };
        }
        return u;
      });
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
      }
      return next;
    });

    // Also update any salary records for this employee with updated joinDate and recalculated service allowance
    setSalaryRecords((prev) =>
      prev.map((s) => {
        if (s.employeeId !== emp.id) return s;
        const tenureInfo = calculateEmployeeTenure(emp.joinedDate, s.month);
        const newServiceAllowance = tenureInfo.serviceAllowance;
        const dutyAllowance = s.dutyAllowance ?? 0;
        const totalDeductions = (s.lateDeduct ?? (s.deductionPenalty ?? 0)) + (s.absentDeduct ?? 0) + (s.unpaidLeave ?? 0);
        const totalEarnings =
          Number(s.basicSalary || 0) +
          Number(newServiceAllowance) +
          Number(dutyAllowance) +
          Number(s.attendanceBonus || 0) +
          Number(s.otTotal || 0) +
          Number(s.salesCommission || 0) +
          Number(s.mealAllowance || 0);

        return {
          ...s,
          employeeName: emp.name,
          joinedDate: emp.joinedDate,
          serviceAllowance: newServiceAllowance,
          totalEarnings,
          netSalary: Math.max(0, totalEarnings - totalDeductions),
        };
      })
    );

    // Immediate Cloud Push on Staff Target / Profile Edit
    setTimeout(() => {
      pushStateToCloud(
        {
          branches,
          users,
          employees: nextEmployees.length > 0 ? nextEmployees : employees,
          salaryRecords,
          sales,
          expenses,
          inventory,
          stockMovements,
          contacts,
          purchases,
          supplierReturns,
          treasuryAccounts,
          treasuryTransactions,
          interBranchTransfers,
          customPositions: positionsMap,
        },
        currentUser?.displayName || 'User',
        true
      );
    }, 100);
  };

  const handleDeleteEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    requestDelete({
      title: 'Delete Employee Profile',
      description: 'Are you sure you want to permanently delete this employee record?',
      itemName: emp ? `${emp.name} • ${emp.position} (${emp.branchName})` : 'Selected Employee',
      onConfirm: () => {
        lastLocalActionTimeRef.current = Date.now();
        isLocalUpdateRef.current = true;
        setEmployees((prev) => {
          const next = prev.filter((e) => e.id !== id);
          try {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
          return next;
        });
        void deleteDocumentFromCloud('employees', id, currentUser?.displayName || 'Delete Employee');
      },
    });
  };

  const handleCalculateSalaryForEmp = (emp: Employee) => {
    const existing = findSalaryRecordForEmployee(salaryRecords, emp, selectedMonth);
    setEditingRecord(existing || null);
    setCalculatorTargetEmpId(emp.id);
    setIsCalculatorOpen(true);
  };

  const handleUpdateEmployeeBaseSalary = (empId: string, newBaseSalary: number) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === empId ? { ...emp, baseSalary: newBaseSalary } : emp
      )
    );
  };

  const handleResequenceEmployees = () => {
    const { employees: resequenced, idMap, codeMap } = resequenceAllEmployees(employees);
    setEmployees(resequenced);
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(resequenced));
    } catch (e) {
      console.error('Error saving resequenced employees', e);
    }

    // Synchronize user accounts with new employee codes and IDs
    setUsers((prevUsers) => {
      const updatedUsers = prevUsers.map((u) => {
        const matchedEmp = resequenced.find(
          (e) =>
            e.id === u.employeeId ||
            (u.employeeCode && codeMap[u.employeeCode] === e.code) ||
            (u.displayName && u.displayName.toLowerCase().includes(e.name.toLowerCase()))
        );
        if (matchedEmp) {
          return {
            ...u,
            employeeId: matchedEmp.id,
            employeeCode: matchedEmp.code,
          };
        }
        return u;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      } catch (e) {
        console.error('Error saving updated users', e);
      }
      return updatedUsers;
    });

    // Synchronize salary records with new employee IDs
    setSalaryRecords((prevSalary) => {
      const updatedSalary = prevSalary.map((s) => {
        const newId = idMap[s.employeeId];
        if (newId) {
          return { ...s, employeeId: newId };
        }
        const matchedEmp = resequenced.find((e) => e.name === s.employeeName);
        if (matchedEmp) {
          return { ...s, employeeId: matchedEmp.id };
        }
        return s;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.SALARY_RECORDS, JSON.stringify(updatedSalary));
      } catch (e) {
        console.error('Error saving updated salary records', e);
      }
      return updatedSalary;
    });

    handleLogActivity({
      action: 'UPDATE',
      module: 'STAFF',
      title: 'Renumber Employee IDs (EC001)',
      description: 'Renumbered all employee IDs sequentially from EC001 starting from Shop 1',
      branchId: activeBranchFilter,
    });
  };

  // Payroll Handlers
  const handleSaveSalaryRecord = (rec: SalaryRecord) => {
    const validMonth = (rec.month && rec.month !== 'ALL')
      ? rec.month
      : (selectedMonth && selectedMonth !== 'ALL')
        ? selectedMonth
        : '2026-09';
    const cleanRec: SalaryRecord = {
      ...rec,
      month: validMonth,
    };
    setSalaryRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === cleanRec.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = cleanRec;
        return updated;
      }
      return [cleanRec, ...prev];
    });
    void saveRecordToCloud('salaryRecords', cleanRec, currentUser?.displayName || 'Save Payroll');
  };

  const handleEditSalaryRecord = (rec: SalaryRecord) => {
    setEditingRecord(rec);
    setIsCalculatorOpen(true);
  };

  const handleDeleteSalaryRecord = (id: string) => {
    const rec = salaryRecords.find((r) => r.id === id);
    const canDeletePayroll = canUserDeletePayrollSlip(currentUser);
    requestDelete(
      {
        title: 'Delete Payroll Record',
        description: 'Are you sure you want to permanently delete this payroll record?',
        itemName: rec ? `${rec.employeeName} • ${rec.month} (${formatMMK(rec.netPayable)})` : 'Selected Payroll Record',
        confirmText: 'Delete Payroll Record',
        onConfirm: () => {
          setSalaryRecords((prev) => prev.filter((r) => r.id !== id));
          void deleteDocumentFromCloud('salaryRecords', id, currentUser?.displayName || 'Delete Payroll Record');
        },
      },
      canDeletePayroll
    );
  };

  const handleTogglePaymentStatus = (id: string) => {
    const existing = salaryRecords.find((r) => r.id === id);
    if (!existing) return;
    const newStatus = existing.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    const updated: SalaryRecord = {
      ...existing,
      paymentStatus: newStatus,
      paymentDate: newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined,
    };
    setSalaryRecords((prev) => prev.map((r) => (r.id === id ? updated : r)));
    void saveRecordToCloud('salaryRecords', updated, currentUser?.displayName || 'Toggle Payment Status');
  };

  const handleOpenPayslip = (rec: SalaryRecord) => {
    if (!rec) return;
    try {
      const validMonth = (rec.month && rec.month !== 'ALL')
        ? rec.month
        : (selectedMonth && selectedMonth !== 'ALL')
          ? selectedMonth
          : '2026-09';
      const matchedEmp = employees.find(
        (e) => (rec.employeeId && e.id === rec.employeeId) || 
               (rec.employeeCode && e.code === rec.employeeCode) || 
               (rec.employeeName && e.name === rec.employeeName)
      );
      setSelectedPayslipRecord({
        ...rec,
        id: String(rec.id || `sal-${rec.employeeId || 'emp'}-${validMonth}`),
        employeeId: rec.employeeId || matchedEmp?.id || 'emp',
        employeeCode: rec.employeeCode || matchedEmp?.code || '',
        employeeName: rec.employeeName || matchedEmp?.name || 'Staff Member',
        joinedDate: rec.joinedDate || matchedEmp?.joinedDate,
        position: rec.position || matchedEmp?.position || 'Staff',
        department: rec.department || matchedEmp?.department || 'General',
        month: validMonth,
      });
      setIsPayslipOpen(true);
    } catch (err) {
      console.warn('Error opening payslip:', err);
    }
  };

  const handleBatchCalculateStandard = (employeeIds: string[], monthToCalc: string) => {
    const validMonth = (monthToCalc && monthToCalc !== 'ALL') ? monthToCalc : (selectedMonth !== 'ALL' ? selectedMonth : '2026-09');
    const stdDays = getStandardWorkingDaysForMonth(validMonth);
    const newRecords: SalaryRecord[] = [];

    employeeIds.forEach((empId) => {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;

      const base = emp.baseSalary || 0;
      const tenureInfo = calculateEmployeeTenure(emp.joinedDate, validMonth, emp.tenure);
      const serviceAllowance = tenureInfo.serviceAllowance;
      const dutyAllowance = getDefaultDutyAllowance(emp.position);
      const attBonus = 0;
      const totalEarn = base + attBonus + serviceAllowance + dutyAllowance;
      const net = totalEarn;

      const record: SalaryRecord = {
        id: `sal-${emp.id}-${validMonth}`,
        employeeId: emp.id,
        employeeName: emp.name,
        branchId: emp.branchId || 'branch-1',
        branchName: getBranchName(emp.branchId, branches, emp.branchName),
        position: emp.position,
        department: normalizeDepartmentName(emp.department),
        month: validMonth,
        workingDaysStandard: stdDays,
        actualDaysWorked: stdDays,
        absentDays: 0,
        extraDaysWorked: 0,
        extraDaysPay: 0,
        basicSalary: base,
        serviceAllowance,
        dutyAllowance,
        tenure: tenureInfo.tenureString,
        attendanceBonus: attBonus,
        otHours: 0,
        otRatePerHour: 0,
        otTotal: 0,
        salesCommission: 0,
        mealAllowance: 0,
        performanceBonus: 0,
        totalEarnings: totalEarn,
        lateEntries: [],
        lateCount: 0,
        lateDeduct: 0,
        absentDeduct: 0,
        unpaidLeaveDays: 0,
        unpaidLeave: 0,
        deductionPenalty: 0,
        deductionSSB: 0,
        totalDeductions: 0,
        netSalary: net,
        netPayable: net,
        paymentStatus: 'Pending',
        paymentMethod: 'Cash',
        notes: `Auto-calculated with Service Allowance (${tenureInfo.tenureString})`,
        createdAt: new Date().toISOString(),
      };
      newRecords.push(record);
    });

    if (newRecords.length > 0) {
      setSalaryRecords((prev) => {
        const remaining = prev.filter(
          (r) => !newRecords.some((nr) => nr.employeeId === r.employeeId && nr.month === r.month)
        );
        return [...newRecords, ...remaining];
      });

      handleLogActivity({
        action: 'CREATE',
        module: 'STAFF',
        title: `Batch Calculated Payroll (${newRecords.length} staff)`,
        description: `Auto-calculated standard full-attendance payroll for ${newRecords.length} staff for ${validMonth}`,
        branchId: activeBranchFilter,
      });
    }
  };

  // Contact Handlers
  const handleAddContact = (contact: ContactPartner) => {
    setContacts((prev) => [contact, ...prev]);
    void saveRecordToCloud('contacts', contact, currentUser?.displayName || 'Add Contact');
  };

  const handleUpdateContact = (contact: ContactPartner) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? contact : c)));
    void saveRecordToCloud('contacts', contact, currentUser?.displayName || 'Update Contact');
  };

  const handleDeleteContact = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    requestDelete({
      title: 'Delete Contact',
      description: 'Are you sure you want to permanently delete this contact partner record?',
      itemName: contact ? `${contact.name} (${contact.category} - ${contact.company})` : 'Selected Contact',
      onConfirm: () => {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        void deleteDocumentFromCloud('contacts', id, currentUser?.displayName || 'Delete Contact');
      },
    });
  };

  // ==========================================
  // FINANCE & PROCUREMENT HANDLERS
  // ==========================================

  // Inter-Branch Transfer & Financial Settlement Handlers
  const handleAddBranchTransfer = (
    transferData: Omit<InterBranchTransfer, 'id' | 'transferNo' | 'createdAt'>,
    settleNow: boolean
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const transferDate = transferData.date || today;
    const dateStr = transferDate.replace(/-/g, '');
    const todayTransfers = interBranchTransfers.filter((t) => t.date === transferDate);
    const transferNo = `TRF${dateStr}/${String(todayTransfers.length + 1).padStart(3, '0')}`;
    const newId = `trf-${Date.now()}`;

    const newTransfer: InterBranchTransfer = {
      ...transferData,
      id: newId,
      transferNo,
      createdAt: new Date().toISOString(),
    };

    setInterBranchTransfers((prev) => [newTransfer, ...prev]);
    void saveRecordToCloud('interBranchTransfers', newTransfer, currentUser?.displayName || 'Transfer');

    // Move branch stock for items (single item or multiple items in transferData.items)
    const itemsToProcess = transferData.items && transferData.items.length > 0
      ? transferData.items
      : [{ itemId: transferData.itemId, itemName: transferData.itemName, quantity: transferData.quantity }];

    // 1. Atomic inventory stock update
    setInventory((prev) => {
      let next = [...prev];
      itemsToProcess.forEach((ti) => {
        if (!ti.itemId || !transferData.fromBranchId || !transferData.toBranchId) return;
        next = next.map((item) => {
          if (item.id === ti.itemId) {
            const currentFrom = item.branchStock[transferData.fromBranchId] || 0;
            const currentTo = item.branchStock[transferData.toBranchId] || 0;
            return {
              ...item,
              branchStock: {
                ...item.branchStock,
                [transferData.fromBranchId]: Math.max(0, currentFrom - ti.quantity),
                [transferData.toBranchId]: currentTo + ti.quantity,
              },
            };
          }
          return item;
        });
      });
      return next;
    });

    // 2. Log stock movements for each item in the transfer
    const newMovements: StockMovement[] = itemsToProcess
      .filter((ti) => ti.itemId && ti.quantity > 0)
      .map((ti, idx) => {
        const invItem = inventory.find((it) => it.id === ti.itemId);
        return {
          id: `move-trf-${Date.now()}-${idx}`,
          itemId: ti.itemId || 'unknown',
          itemName: ti.itemName || transferData.itemName,
          itemCategory: (invItem?.category || 'Accessories & Gadgets') as InventoryCategory,
          sku: invItem?.sku || transferNo,
          type: 'TRANSFER',
          fromBranchId: transferData.fromBranchId,
          fromBranchName: transferData.fromBranchName,
          toBranchId: transferData.toBranchId,
          toBranchName: transferData.toBranchName,
          quantity: ti.quantity,
          date: transferDate,
          referenceNo: transferNo,
          referenceId: newId,
          performedBy: currentUser?.displayName || 'Admin',
          notes: `Branch stock transfer: ${transferData.fromBranchName} → ${transferData.toBranchName}`,
          createdAt: new Date().toISOString(),
        };
      });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // If settleNow is true and accounts are selected, generate treasury transactions
    if (settleNow && transferData.paidFromAccountId && transferData.receivedInAccountId) {
      const amount = transferData.totalSettlementAmount;
      const payerAcc = treasuryAccounts.find((a) => a.id === transferData.paidFromAccountId);
      const receiverAcc = treasuryAccounts.find((a) => a.id === transferData.receivedInAccountId);

      setTreasuryAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === transferData.paidFromAccountId) {
            return {
              ...acc,
              currentBalance: Math.max(0, acc.currentBalance - amount),
              lastUpdated: today,
            };
          }
          if (acc.id === transferData.receivedInAccountId) {
            return {
              ...acc,
              currentBalance: acc.currentBalance + amount,
              lastUpdated: today,
            };
          }
          return acc;
        })
      );

      const txOut: TreasuryTransaction = {
        id: `tx-trf-out-${Date.now()}`,
        date: today,
        type: 'INTER_BRANCH_TRANSFER_PAYMENT',
        accountId: transferData.paidFromAccountId,
        accountName: payerAcc ? payerAcc.name : 'Account',
        amount,
        direction: 'OUT',
        notes: `Branch transfer payment (${transferData.itemName} - ${transferData.fromBranchName} to ${transferData.toBranchName}): ${transferData.notes || ''}`,
        referenceNo: newId,
        referenceId: newId,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };

      const txIn: TreasuryTransaction = {
        id: `tx-trf-in-${Date.now()}`,
        date: today,
        type: 'INTER_BRANCH_TRANSFER_RECEIPT',
        accountId: transferData.receivedInAccountId,
        accountName: receiverAcc ? receiverAcc.name : 'Account',
        amount,
        direction: 'IN',
        notes: `Branch transfer receipt (${transferData.itemName} - ${transferData.fromBranchName} to ${transferData.toBranchName}): ${transferData.notes || ''}`,
        referenceNo: newId,
        referenceId: newId,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };

      setTreasuryTransactions((prev) => [txIn, txOut, ...prev]);
    }
  };

  const handleSettleBranchPayment = (
    transferId: string,
    arg2: string,
    arg3?: string,
    arg4?: string,
    arg5?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const transfer = interBranchTransfers.find((t) => t.id === transferId);
    if (!transfer) return;

    let paymentMethod = 'Cash';
    let notes = '';
    let paidFromAccountId: string | undefined;
    let receivedInAccountId: string | undefined;

    // Check if called as (transferId, paymentMethod, notes, accountId) or legacy (transferId, paidFromId, receivedInId, method, notes)
    const isLegacy = arg4 && treasuryAccounts.some((a) => a.id === arg2);
    if (isLegacy) {
      paidFromAccountId = arg2;
      receivedInAccountId = arg3;
      paymentMethod = arg4 || 'Cash';
      notes = arg5 || '';
    } else {
      paymentMethod = arg2 || 'Cash';
      notes = arg3 || '';
      paidFromAccountId = arg4;
      receivedInAccountId = undefined;
    }

    // If no specific account was chosen, auto-link to matching Cash or Bank Treasury account if available
    if (!paidFromAccountId && treasuryAccounts.length > 0) {
      if (paymentMethod.toLowerCase().includes('cash')) {
        const cashAcc = treasuryAccounts.find((a) => a.type === 'CASH' || a.name.toLowerCase().includes('cash'));
        if (cashAcc) paidFromAccountId = cashAcc.id;
      } else {
        const matchedBank = treasuryAccounts.find((a) => 
          (paymentMethod.includes('KBZ') && a.name.includes('KBZ')) ||
          (paymentMethod.includes('CB') && a.name.includes('CB')) ||
          (paymentMethod.includes('AYA') && a.name.includes('AYA'))
        ) || treasuryAccounts.find((a) => a.type === 'BANK');
        if (matchedBank) paidFromAccountId = matchedBank.id;
      }
    }

    const amount = transfer.totalSettlementAmount;
    const payerAcc = treasuryAccounts.find((a) => a.id === paidFromAccountId);
    const receiverAcc = receivedInAccountId ? treasuryAccounts.find((a) => a.id === receivedInAccountId) : undefined;

    // Update transfer payment status
    setInterBranchTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              paymentStatus: 'SETTLED',
              paymentMethod,
              paidFromAccountId: paidFromAccountId || t.paidFromAccountId,
              receivedInAccountId: receivedInAccountId || t.receivedInAccountId,
              notes: notes ? `${t.notes || ''} [Paid via ${paymentMethod}: ${notes}]` : `${t.notes || ''} [Paid via ${paymentMethod}]`.trim(),
            }
          : t
      )
    );

    // Deduct from paying account if account exists
    if (paidFromAccountId) {
      setTreasuryAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === paidFromAccountId) {
            return {
              ...acc,
              currentBalance: Math.max(0, acc.currentBalance - amount),
              lastUpdated: today,
            };
          }
          if (receivedInAccountId && acc.id === receivedInAccountId) {
            return {
              ...acc,
              currentBalance: acc.currentBalance + amount,
              lastUpdated: today,
            };
          }
          return acc;
        })
      );

      // Create Treasury Outflow Transaction
      const txOut: TreasuryTransaction = {
        id: `tx-trf-pay-${Date.now()}`,
        date: today,
        type: 'INTER_BRANCH_TRANSFER_PAYMENT',
        accountId: paidFromAccountId,
        accountName: payerAcc ? payerAcc.name : `${paymentMethod} Account`,
        amount,
        direction: 'OUT',
        notes: `Branch stock transfer settlement (${transfer.transferNo} • ${paymentMethod}): ${notes || ''}`,
        referenceNo: transfer.transferNo,
        referenceId: transferId,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };

      if (receivedInAccountId && receiverAcc) {
        const txIn: TreasuryTransaction = {
          id: `tx-trf-rec-${Date.now()}`,
          date: today,
          type: 'INTER_BRANCH_TRANSFER_RECEIPT',
          accountId: receivedInAccountId,
          accountName: receiverAcc.name,
          amount,
          direction: 'IN',
          notes: `Branch stock transfer receipt (${transfer.transferNo}): ${notes || ''}`,
          referenceNo: transfer.transferNo,
          referenceId: transferId,
          recordedBy: currentUser?.displayName || 'Admin',
          createdAt: new Date().toISOString(),
        };
        setTreasuryTransactions((prev) => [txIn, txOut, ...prev]);
      } else {
        setTreasuryTransactions((prev) => [txOut, ...prev]);
      }
    }
  };

  const handleAddPurchase = (purchase: PurchaseRecord, accountId?: string) => {
    const targetBranch = purchase.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : purchase.branchId;
    const bObj = branches.find((b) => b.id === targetBranch);

    // Multi-item lines support (or fallback to single item)
    const linesToProcess: PurchaseItemLine[] = (purchase.items && purchase.items.length > 0)
      ? purchase.items
      : [
          {
            id: `line-${Date.now()}`,
            itemName: purchase.itemName,
            brand: purchase.brand,
            model: purchase.model || purchase.itemName,
            category: purchase.category,
            sku: purchase.sku,
            inventoryItemId: purchase.inventoryItemId,
            warranty: purchase.warranty,
            unitCost: purchase.unitCost,
            quantity: purchase.quantity,
            totalCost: purchase.totalAmount,
            imeiList: purchase.imeiList || purchase.serialNumbers || [],
          }
        ];

    const updatedLines: PurchaseItemLine[] = [];
    const newMovements: StockMovement[] = [];

    // 1. If autoAddToInventory !== false: update stock or create new stock item for EACH model line
    if (purchase.autoAddToInventory !== false) {
      setInventory((prevInventory) => {
        let currentInv = [...prevInventory];

        linesToProcess.forEach((line, lineIdx) => {
          const lineImeis = (line.imeiList || []).map((s) => s.trim()).filter(Boolean);
          const autoBrand = line.brand || detectBrandFromName(line.itemName, line.category) || 'Other';
          const pName = line.itemName.trim().toLowerCase();
          const pModel = (line.model || '').trim().toLowerCase();
          const pSku = (line.sku || '').trim().toLowerCase();

          // Check if item exists in inventory (matching name/model or non-PO sku)
          const existingIndex = currentInv.findIndex((item) => {
            if (line.inventoryItemId && item.id === line.inventoryItemId) return true;
            const iName = item.name.trim().toLowerCase();
            const iModel = (item.model || '').trim().toLowerCase();
            if (iName === pName || (pModel && (iModel === pModel || iName === pModel))) return true;
            if (pSku && !pSku.startsWith('po-') && item.sku.trim().toLowerCase() === pSku) return true;
            return false;
          });

          let lineItemId = line.inventoryItemId || `inv-${Date.now()}-${lineIdx}`;
          let lineSku = line.sku;

          if (existingIndex >= 0) {
            // Existing model -> REUSE EXISTING STOCK CODE (NO DUPLICATE CODE!), merge quantity & IMEIs
            const item = currentInv[existingIndex];
            lineItemId = item.id;
            lineSku = item.sku;
            const currentQty = item.branchStock[targetBranch] || 0;
            const updatedBranchStock = {
              ...item.branchStock,
              [targetBranch]: currentQty + line.quantity,
            };
            const totalStock = (Object.values(updatedBranchStock) as number[]).reduce(
              (acc, val) => acc + (Number(val) || 0),
              0
            );

            // Merge IMEIs
            const currentImeis = item.imeiList && item.imeiList.length > 0
              ? [...item.imeiList]
              : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);
            
            const mergedImeis = [...currentImeis];
            lineImeis.forEach((im) => {
              if (!mergedImeis.includes(im)) {
                mergedImeis.push(im);
              }
            });

            currentInv[existingIndex] = {
              ...item,
              sku: lineSku,
              brand: autoBrand || item.brand,
              costPrice: line.unitCost,
              supplier: purchase.supplierName || item.supplier,
              warranty: resolveItemWarranty(lineSku, autoBrand || item.brand, item.category, item.name, line.warranty || item.warranty, '1 Year Official'),
              branchStock: updatedBranchStock,
              totalStock,
              imeiList: mergedImeis.length > 0 ? mergedImeis : item.imeiList,
              serialNumbers: mergedImeis.length > 0 ? mergedImeis : item.serialNumbers,
              imeiOrSerial: mergedImeis.length > 0 ? mergedImeis.join(', ') : item.imeiOrSerial,
              lastRestockedDate: purchase.date,
            };
          } else {
            // New model -> Generate Brand-specific Stock Code
            lineSku = (line.sku && !line.sku.startsWith('PO-') && !/^\d{6}$/.test(line.sku))
              ? line.sku
              : generateAutoSKU(line.category, currentInv, sales, autoBrand, line.itemName);

            const newItem: InventoryItem = {
              id: lineItemId,
              name: line.itemName,
              category: line.category,
              brand: autoBrand,
              warranty: resolveItemWarranty(lineSku, autoBrand, line.category, line.itemName, line.warranty, '1 Year Official'),
              supplier: purchase.supplierName,
              model: line.model || line.itemName,
              sku: lineSku,
              costPrice: line.unitCost,
              sellingPrice: Math.round(line.unitCost * 1.15),
              branchStock: {
                [targetBranch]: line.quantity,
              },
              totalStock: line.quantity,
              imeiList: lineImeis.length > 0 ? lineImeis : undefined,
              serialNumbers: lineImeis.length > 0 ? lineImeis : undefined,
              imeiOrSerial: lineImeis.length > 0 ? lineImeis.join(', ') : undefined,
              minStockAlert: 5,
              lastRestockedDate: purchase.date,
              notes: `Auto-created from PO ${purchase.invoiceNo} • Supplier: ${purchase.supplierName}`,
            };
            currentInv = [newItem, ...currentInv];
          }

          updatedLines.push({
            ...line,
            inventoryItemId: lineItemId,
            sku: lineSku,
          });

          // Stock Movement for this model line
          newMovements.push({
            id: `move-po-${Date.now()}-${lineIdx}`,
            itemId: lineItemId,
            itemName: line.itemName,
            itemCategory: line.category,
            sku: lineSku,
            type: 'STOCK_IN',
            toBranchId: targetBranch,
            toBranchName: bObj?.code || 'Central',
            quantity: line.quantity,
            date: purchase.date,
            referenceNo: purchase.invoiceNo,
            performedBy: currentUser?.displayName || 'Admin',
            supplierOrCustomer: purchase.supplierName,
            notes: `PO Stock In: ${line.itemName} (${formatMMK(line.unitCost)} / unit)${lineImeis.length > 0 ? ` • IMEIs: ${lineImeis.join(', ')}` : ''}`,
            imeiList: lineImeis.length > 0 ? lineImeis : undefined,
            imeiOrSerial: lineImeis.length > 0 ? lineImeis.join(', ') : undefined,
            createdAt: new Date().toISOString(),
          });
        });

        return currentInv;
      });

      if (newMovements.length > 0) {
        setStockMovements((prev) => [...newMovements, ...prev]);
      }
    }

    // 2. Add purchase record linked to items & installments
    const finalizedPurchase: PurchaseRecord = {
      ...purchase,
      items: updatedLines.length > 0 ? updatedLines : purchase.items,
      sku: updatedLines[0]?.sku || purchase.sku,
      inventoryItemId: updatedLines[0]?.inventoryItemId || purchase.inventoryItemId,
      autoAddToInventory: true,
    };
    setPurchases((prev) => [finalizedPurchase, ...prev]);
    void saveRecordToCloud('purchases', finalizedPurchase, currentUser?.displayName || 'Add Purchase');

    // 3. If down payment > 0 and accountId provided, deduct from treasury account & log transaction
    if (purchase.paidAmount > 0 && accountId) {
      setTreasuryAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === accountId) {
            return {
              ...acc,
              currentBalance: Math.max(0, acc.currentBalance - purchase.paidAmount),
              lastUpdated: purchase.date,
            };
          }
          return acc;
        })
      );

      const accObj = treasuryAccounts.find((a) => a.id === accountId);
      const newTx: TreasuryTransaction = {
        id: `tx-po-${Date.now()}`,
        date: purchase.date,
        type: 'PURCHASE_PAYMENT',
        accountId,
        accountName: accObj ? accObj.name : 'Treasury Account',
        amount: purchase.paidAmount,
        direction: 'OUT',
        referenceNo: purchase.invoiceNo,
        partnerName: purchase.supplierName,
        notes: `Purchase payment: ${purchase.itemName} (${purchase.quantity} pcs) - Voucher: ${purchase.invoiceNo}`,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };
      setTreasuryTransactions((prev) => [newTx, ...prev]);
    }

    // 4. Update or add Supplier in contacts
    if (purchase.supplierName) {
      setContacts((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.name.trim().toLowerCase() === purchase.supplierName.trim().toLowerCase()
        );
        if (existingIdx >= 0) {
          const existing = prev[existingIdx];
          const updatedContact: ContactPartner = {
            ...existing,
            phone: purchase.supplierPhone || existing.phone,
            balanceDue: (existing.balanceDue || 0) + purchase.remainingDebt,
            lastTransactionDate: purchase.date,
            totalTransactions: (existing.totalTransactions || 0) + 1,
          };
          const next = [...prev];
          next[existingIdx] = updatedContact;
          return next;
        } else {
          const newContact: ContactPartner = {
            id: `supp-${Date.now()}`,
            name: purchase.supplierName,
            type: 'Supplier',
            company: purchase.supplierName,
            phone: purchase.supplierPhone || '-',
            email: '',
            city: 'Yangon',
            address: '',
            balanceDue: purchase.remainingDebt,
            notes: `Supplier auto-saved from PO: ${purchase.invoiceNo}`,
          };
          return [newContact, ...prev];
        }
      });
    }
  };

  // One-click Sync / Stock-in for existing POs into Inventory
  const handleSyncPoToInventory = (purchase: PurchaseRecord) => {
    const targetBranch = purchase.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : purchase.branchId;
    const poImeis = (purchase.imeiList || purchase.serialNumbers || []).map((s) => s.trim()).filter(Boolean);
    const autoBrand = purchase.brand || detectBrandFromName(purchase.itemName, purchase.category) || 'Other';
    let finalSku = (purchase.sku && !purchase.sku.startsWith('PO-') && !/^\d{6}$/.test(purchase.sku))
      ? purchase.sku
      : generateAutoSKU(purchase.category, inventory, sales, autoBrand, purchase.itemName);
    let finalItemId = purchase.inventoryItemId || `inv-${Date.now()}`;

    setInventory((prev) => {
      const pName = purchase.itemName.trim().toLowerCase();
      const pModel = (purchase.model || '').trim().toLowerCase();
      const pSku = (purchase.sku || '').trim().toLowerCase();

      const existingIndex = prev.findIndex((item) => {
        if (purchase.inventoryItemId && item.id === purchase.inventoryItemId) return true;
        const iName = item.name.trim().toLowerCase();
        const iModel = (item.model || '').trim().toLowerCase();
        if (iName === pName || (pModel && (iModel === pModel || iName === pModel))) return true;
        if (pSku && !pSku.startsWith('po-') && item.sku.trim().toLowerCase() === pSku) return true;
        return false;
      });

      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        finalSku = item.sku;
        finalItemId = item.id;
        const currentQty = item.branchStock[targetBranch] || 0;
        const updatedBranchStock = {
          ...item.branchStock,
          [targetBranch]: currentQty + purchase.quantity,
        };
        const totalStock = (Object.values(updatedBranchStock) as number[]).reduce(
          (acc, val) => acc + (Number(val) || 0),
          0
        );

        const currentImeis = item.imeiList && item.imeiList.length > 0
          ? [...item.imeiList]
          : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);
        
        const mergedImeis = [...currentImeis];
        poImeis.forEach((im) => {
          if (!mergedImeis.includes(im)) {
            mergedImeis.push(im);
          }
        });

        const updatedItem: InventoryItem = {
          ...item,
          sku: item.sku,
          brand: item.brand || autoBrand,
          costPrice: purchase.unitCost,
          supplier: purchase.supplierName || item.supplier,
          warranty: resolveItemWarranty(item.sku, item.brand || autoBrand, item.category, item.name, purchase.warranty || item.warranty, '1 Year Official'),
          branchStock: updatedBranchStock,
          totalStock,
          imeiList: mergedImeis.length > 0 ? mergedImeis : (poImeis.length > 0 ? poImeis : item.imeiList),
          serialNumbers: mergedImeis.length > 0 ? mergedImeis : (poImeis.length > 0 ? poImeis : item.serialNumbers),
          imeiOrSerial: mergedImeis.length > 0 ? mergedImeis.join(', ') : (poImeis.length > 0 ? poImeis.join(', ') : item.imeiOrSerial),
          lastRestockedDate: purchase.date,
        };

        const nextList = [...prev];
        nextList[existingIndex] = updatedItem;
        return nextList;
      } else {
        const newItem: InventoryItem = {
          id: finalItemId,
          name: purchase.itemName,
          category: purchase.category,
          brand: autoBrand,
          warranty: resolveItemWarranty(finalSku, autoBrand, purchase.category, purchase.itemName, purchase.warranty, '1 Year Official'),
          supplier: purchase.supplierName,
          model: purchase.model || purchase.itemName,
          sku: finalSku,
          costPrice: purchase.unitCost,
          sellingPrice: Math.round(purchase.unitCost * 1.15),
          branchStock: {
            [targetBranch]: purchase.quantity,
          },
          totalStock: purchase.quantity,
          imeiList: poImeis.length > 0 ? poImeis : undefined,
          serialNumbers: poImeis.length > 0 ? poImeis : undefined,
          imeiOrSerial: poImeis.length > 0 ? poImeis.join(', ') : undefined,
          minStockAlert: 5,
          lastRestockedDate: purchase.date,
          notes: `Stocked in from PO ${purchase.invoiceNo} • Supplier: ${purchase.supplierName}`,
        };
        return [newItem, ...prev];
      }
    });

    // Update Purchase Record to link SKU and inventoryItemId
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === purchase.id
          ? { ...p, sku: finalSku, inventoryItemId: finalItemId, autoAddToInventory: true }
          : p
      )
    );

    // Stock Movement
    const bObj = branches.find((b) => b.id === targetBranch);
    const movement: StockMovement = {
      id: `move-po-${Date.now()}`,
      itemId: finalItemId,
      itemName: purchase.itemName,
      itemCategory: purchase.category,
      sku: finalSku,
      type: 'STOCK_IN',
      toBranchId: targetBranch,
      toBranchName: bObj?.code || 'Central',
      quantity: purchase.quantity,
      date: purchase.date,
      referenceNo: purchase.invoiceNo,
      performedBy: currentUser?.displayName || 'Admin',
      supplierOrCustomer: purchase.supplierName,
      notes: `PO Manual Restock: ${purchase.supplierName} (${formatMMK(purchase.unitCost)} / unit)${poImeis.length > 0 ? ` • IMEIs: ${poImeis.join(', ')}` : ''}`,
      imeiList: poImeis.length > 0 ? poImeis : undefined,
      imeiOrSerial: poImeis.length > 0 ? poImeis.join(', ') : undefined,
      createdAt: new Date().toISOString(),
    };
    setStockMovements((prev) => [movement, ...prev]);
  };

  const handleUpdatePurchase = (updated: PurchaseRecord) => {
    setPurchases((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    void saveRecordToCloud('purchases', updated, currentUser?.displayName || 'Update Purchase');
  };

  const handleDeletePurchase = (id: string) => {
    const p = purchases.find((x) => x.id === id);
    requestDelete({
      title: 'Delete Purchase Record',
      description: 'Are you sure you want to permanently delete this purchase record?',
      itemName: p ? `${p.invoiceNo} • ${p.itemName} (${p.supplierName} - ${formatMMK(p.totalAmount)})` : 'Selected Purchase Record',
      onConfirm: () => {
        setPurchases((prev) => prev.filter((x) => x.id !== id));
        void deleteDocumentFromCloud('purchases', id, currentUser?.displayName || 'Delete Purchase');
      },
    });
  };

  const handlePaySupplierDebt = (
    purchaseId: string,
    paymentAmount: number,
    accountId: string,
    notes?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const accObj = treasuryAccounts.find((a) => a.id === accountId);
    let targetPurchase: PurchaseRecord | undefined;

    setPurchases((prev) =>
      prev.map((p) => {
        if (p.id === purchaseId) {
          targetPurchase = p;
          const newPaid = p.paidAmount + paymentAmount;
          const newDebt = Math.max(0, p.totalAmount - newPaid);
          const newStatus: PurchaseRecord['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';

          const installment: PurchasePaymentItem = {
            id: `pay-${Date.now()}`,
            date: today,
            amount: paymentAmount,
            paymentMethod: accObj ? accObj.name : 'Cash/Bank',
            accountId,
            recordedBy: currentUser?.displayName || 'Admin',
            notes: notes || 'Supplier debt installment',
            createdAt: new Date().toISOString(),
          };

          let remainingToAllocate = paymentAmount;
          const updatedInstallments = p.installments?.map((inst) => {
            if (inst.isPaid || remainingToAllocate <= 0) return inst;
            if (remainingToAllocate >= inst.amount) {
              remainingToAllocate -= inst.amount;
              return {
                ...inst,
                isPaid: true,
                paidDate: today,
                paidAccountId: accountId,
                notes: (inst.notes ? inst.notes + ' • ' : '') + 'Paid on ' + today,
              };
            } else {
              const partiallyPaid = remainingToAllocate;
              remainingToAllocate = 0;
              return {
                ...inst,
                notes: (inst.notes ? inst.notes + ' • ' : '') + `Partially paid (${partiallyPaid} Ks) on ${today}`,
              };
            }
          });

          return {
            ...p,
            paidAmount: newPaid,
            remainingDebt: newDebt,
            paymentStatus: newStatus,
            installments: updatedInstallments,
            paymentHistory: [...(p.paymentHistory || []), installment],
          };
        }
        return p;
      })
    );

    // Deduct from Treasury Account
    setTreasuryAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            currentBalance: Math.max(0, acc.currentBalance - paymentAmount),
            lastUpdated: today,
          };
        }
        return acc;
      })
    );

    // Log Treasury Transaction
    const newTx: TreasuryTransaction = {
      id: `tx-debt-${Date.now()}`,
      date: today,
      type: 'SUPPLIER_DEBT_SETTLEMENT',
      accountId,
      accountName: accObj ? accObj.name : 'Treasury Account',
      amount: paymentAmount,
      direction: 'OUT',
      referenceNo: targetPurchase?.invoiceNo || purchaseId,
      partnerName: targetPurchase?.supplierName,
      notes: `Supplier Debt Settlement: ${targetPurchase?.supplierName || ''} - Voucher: ${targetPurchase?.invoiceNo || ''} (${notes || ''})`,
      recordedBy: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
    };
    setTreasuryTransactions((prev) => [newTx, ...prev]);

    // Reduce Supplier balanceDue in contacts
    if (targetPurchase?.supplierName) {
      const sName = targetPurchase.supplierName.trim().toLowerCase();
      setContacts((prev) =>
        prev.map((c) => {
          if (c.name.trim().toLowerCase() === sName) {
            return {
              ...c,
              balanceDue: Math.max(0, (c.balanceDue || 0) - paymentAmount),
            };
          }
          return c;
        })
      );
    }

    handleLogActivity({
      module: 'FINANCE',
      action: 'UPDATE',
      title: `PO Debt Paid: ${formatMMK(paymentAmount)}`,
      description: `Settled ${formatMMK(paymentAmount)} for PO #${targetPurchase?.invoiceNo || purchaseId} to ${targetPurchase?.supplierName || 'Supplier'}.`,
    });
  };

  const handleSettleCustomerDebt = (
    partnerId: string | undefined,
    customerName: string,
    customerPhone: string | undefined,
    paymentAmount: number,
    accountId: string,
    notes?: string,
    voucherId?: string,
    paymentMethod?: string
  ) => {
    if (paymentAmount <= 0) return;
    const today = new Date().toISOString().split('T')[0];
    const accObj = treasuryAccounts.find((a) => a.id === accountId);
    const chosenMethod = paymentMethod || accObj?.name || 'Cash';

    // 1. Update matching ContactPartner balanceDue
    if (partnerId) {
      setContacts((prev) =>
        prev.map((c) => {
          if (c.id === partnerId) {
            const newBal = Math.max(0, (c.balanceDue || 0) - paymentAmount);
            return { ...c, balanceDue: newBal };
          }
          return c;
        })
      );
    } else if (customerPhone || customerName) {
      const qPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
      const qName = customerName.trim().toLowerCase();
      setContacts((prev) =>
        prev.map((c) => {
          const cPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
          const cName = c.name.trim().toLowerCase();
          if ((qPhone && cPhone === qPhone) || (qName && cName === qName)) {
            const newBal = Math.max(0, (c.balanceDue || 0) - paymentAmount);
            return { ...c, balanceDue: newBal };
          }
          return c;
        })
      );
    }

    // 2. Allocate payment to customer's outstanding sales (either specific voucher or FIFO across customer sales)
    let remainingToCredit = paymentAmount;
    setSales((prev) => {
      const qPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
      const qName = customerName.trim().toLowerCase();

      return prev.map((s) => {
        if (voucherId) {
          if (s.id !== voucherId) return s;
          const currentDebt = s.remainingDebt ?? (s.paymentStatus === 'CREDIT' ? s.salePrice : 0);
          const allocated = Math.min(currentDebt, paymentAmount);
          const newDebt = Math.max(0, currentDebt - allocated);
          const newPaid = (s.paidAmount || 0) + allocated;
          const newStatus: DailySale['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';

          const historyItem = {
            id: `spay-${Date.now()}`,
            date: today,
            amount: allocated,
            paymentMethod: chosenMethod,
            accountId,
            recordedBy: currentUser?.displayName || 'Admin',
            notes: notes || 'Installment / Balance Payment',
            createdAt: new Date().toISOString(),
          };

          const initialPaid = s.initialPaidAmount !== undefined
            ? s.initialPaidAmount
            : (s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'CREDIT' ? 0 : (s.salePrice || 0)));
          const initialDebt = s.initialDebtAmount !== undefined
            ? s.initialDebtAmount
            : (s.remainingDebt ?? (s.paymentStatus === 'CREDIT' ? s.salePrice : 0));

          return {
            ...s,
            initialPaidAmount: initialPaid,
            initialDebtAmount: initialDebt,
            paidAmount: newPaid,
            remainingDebt: newDebt,
            paymentStatus: newStatus,
            paymentHistory: [...(s.paymentHistory || []), historyItem],
            notes: (s.notes ? s.notes + ' • ' : '') + `Debt paid: ${formatMMK(allocated)} on ${today}`,
          };
        }

        if (remainingToCredit <= 0) return s;
        const sPhone = s.customerPhone ? s.customerPhone.replace(/\D/g, '') : '';
        const sName = (s.customerName || '').trim().toLowerCase();
        const isMatch = (qPhone && sPhone === qPhone) || (qName && sName === qName);
        if (!isMatch) return s;

        const currentDebt = s.remainingDebt ?? (s.paymentStatus === 'CREDIT' ? s.salePrice : 0);
        if (currentDebt <= 0) return s;

        const allocated = Math.min(currentDebt, remainingToCredit);
        remainingToCredit -= allocated;
        const newDebt = currentDebt - allocated;
        const newPaid = (s.paidAmount || 0) + allocated;
        const newStatus: DailySale['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';

        const historyItem = {
          id: `spay-${Date.now()}`,
          date: today,
          amount: allocated,
          paymentMethod: chosenMethod,
          accountId,
          recordedBy: currentUser?.displayName || 'Admin',
          notes: notes || 'Debt Repayment',
          createdAt: new Date().toISOString(),
        };

        const initialPaid = s.initialPaidAmount !== undefined
          ? s.initialPaidAmount
          : (s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'CREDIT' ? 0 : (s.salePrice || 0)));
        const initialDebt = s.initialDebtAmount !== undefined
          ? s.initialDebtAmount
          : (s.remainingDebt ?? (s.paymentStatus === 'CREDIT' ? s.salePrice : 0));

        return {
          ...s,
          initialPaidAmount: initialPaid,
          initialDebtAmount: initialDebt,
          paidAmount: newPaid,
          remainingDebt: newDebt,
          paymentStatus: newStatus,
          paymentHistory: [...(s.paymentHistory || []), historyItem],
          notes: (s.notes ? s.notes + ' • ' : '') + `Debt paid: ${formatMMK(allocated)} on ${today}`,
        };
      });
    });

    // 3. Deposit money into Treasury Account (Cash In Hand or Bank)
    setTreasuryAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            currentBalance: acc.currentBalance + paymentAmount,
            lastUpdated: today,
          };
        }
        return acc;
      })
    );

    // 4. Record Treasury Inflow Transaction
    const newTx: TreasuryTransaction = {
      id: `tx-cust-debt-${Date.now()}`,
      date: today,
      type: 'CUSTOMER_DEBT_COLLECTION',
      accountId,
      accountName: accObj ? accObj.name : 'Treasury Account',
      amount: paymentAmount,
      direction: 'IN',
      referenceNo: `CUST-REPAY-${Date.now().toString().slice(-4)}`,
      partnerName: customerName,
      notes: `Credit Customer Repayment (${chosenMethod}): ${customerName} (${customerPhone || ''}) - ${notes || 'Debt Balance Settled'}`,
      recordedBy: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
    };
    setTreasuryTransactions((prev) => [newTx, ...prev]);

    handleLogActivity({
      module: 'SALES',
      action: 'UPDATE',
      title: `Customer Debt Collected: ${formatMMK(paymentAmount)}`,
      description: `Collected ${formatMMK(paymentAmount)} from ${customerName} (${customerPhone || 'N/A'}) into ${accObj?.name || 'Account'} via ${chosenMethod}.`,
      details: {
        customerName,
        customerPhone,
        amount: paymentAmount,
        accountId,
        paymentMethod: chosenMethod,
        voucherId,
      }
    });
  };

  const handleTransferFunds = (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    notes?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const fromAcc = treasuryAccounts.find((a) => a.id === fromAccountId);
    const toAcc = treasuryAccounts.find((a) => a.id === toAccountId);

    // Update balances
    setTreasuryAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromAccountId) {
          return {
            ...acc,
            currentBalance: Math.max(0, acc.currentBalance - amount),
            lastUpdated: today,
          };
        }
        if (acc.id === toAccountId) {
          return {
            ...acc,
            currentBalance: acc.currentBalance + amount,
            lastUpdated: today,
          };
        }
        return acc;
      })
    );

    // Log Outflow from source
    const txOut: TreasuryTransaction = {
      id: `tx-trf-out-${Date.now()}`,
      date: today,
      type: 'TRANSFER_OUT',
      accountId: fromAccountId,
      accountName: fromAcc ? fromAcc.name : 'Account',
      amount,
      direction: 'OUT',
      notes: `Account transfer sent (to ${toAcc?.name || 'Account'}): ${notes || ''}`,
      recordedBy: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
    };

    // Log Inflow to destination
    const txIn: TreasuryTransaction = {
      id: `tx-trf-in-${Date.now()}`,
      date: today,
      type: 'TRANSFER_IN',
      accountId: toAccountId,
      accountName: toAcc ? toAcc.name : 'Account',
      amount,
      direction: 'IN',
      notes: `Account transfer received (from ${fromAcc?.name || 'Account'}): ${notes || ''}`,
      recordedBy: currentUser?.displayName || 'Admin',
      createdAt: new Date().toISOString(),
    };

    setTreasuryTransactions((prev) => [txIn, txOut, ...prev]);
  };

  const handleAdjustAccountBalance = (
    accountId: string,
    newBalance: number,
    reason: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const targetAcc = treasuryAccounts.find((a) => a.id === accountId);
    if (!targetAcc) return;

    const diff = newBalance - targetAcc.currentBalance;

    setTreasuryAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            currentBalance: newBalance,
            lastUpdated: today,
            notes: reason || acc.notes,
          };
        }
        return acc;
      })
    );

    if (diff !== 0) {
      const tx: TreasuryTransaction = {
        id: `tx-adj-${Date.now()}`,
        date: today,
        type: 'BALANCE_ADJUSTMENT',
        accountId,
        accountName: targetAcc.name,
        amount: Math.abs(diff),
        direction: diff > 0 ? 'IN' : 'OUT',
        notes: `Balance adjustment: ${reason} (Previous: ${formatMMK(targetAcc.currentBalance)} → New: ${formatMMK(newBalance)})`,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };
      setTreasuryTransactions((prev) => [tx, ...prev]);
    }
  };

  const handleAddSupplierReturn = (ret: SupplierReturn) => {
    setSupplierReturns((prev) => [ret, ...prev]);
    void saveRecordToCloud('supplierReturns', ret, currentUser?.displayName || 'Add Supplier Return');

    // 1. Deduct stock from inventory
    setInventory((prev) => {
      return prev.map((item) => {
        if (
          (ret.itemId && item.id === ret.itemId) ||
          (ret.inventoryItemId && item.id === ret.inventoryItemId) ||
          item.name.toLowerCase() === ret.itemName.toLowerCase() ||
          (ret.sku && item.sku.toLowerCase() === ret.sku.toLowerCase())
        ) {
          const bStock = { ...(item.branchStock || {}) };
          const bId = ret.branchId;
          const currentBQty = bStock[bId] || 0;
          bStock[bId] = Math.max(0, currentBQty - ret.quantity);
          const newTotal = Object.values(bStock).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);

          let updatedImeiList = item.imeiList;
          let updatedSerialNumbers = item.serialNumbers;
          if (ret.imeiList && ret.imeiList.length > 0) {
            const returnedSet = new Set(ret.imeiList.map((im) => im.trim().toLowerCase()));
            if (updatedImeiList) {
              updatedImeiList = updatedImeiList.filter((im) => !returnedSet.has(im.trim().toLowerCase()));
            }
            if (updatedSerialNumbers) {
              updatedSerialNumbers = updatedSerialNumbers.filter((sn) => !returnedSet.has(sn.trim().toLowerCase()));
            }
          }

          return {
            ...item,
            branchStock: bStock,
            totalStock: newTotal,
            imeiList: updatedImeiList,
            serialNumbers: updatedSerialNumbers,
            lastRestockedDate: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      });
    });

    // 2. Add Stock Movement record (DEFECT_OUT / RETURN_TO_SUPPLIER)
    const movement: StockMovement = {
      id: `move-ret-${Date.now()}`,
      itemId: ret.itemId || ret.inventoryItemId || `ret-item-${Date.now()}`,
      itemName: ret.itemName,
      itemCategory: (ret.category as any) || 'Smartphones & Tablets',
      sku: ret.sku || `RMA-${ret.returnNo}`,
      type: 'RETURN_TO_SUPPLIER',
      fromBranchId: ret.branchId,
      fromBranchName: ret.branchName,
      quantity: ret.quantity,
      date: ret.date,
      referenceNo: ret.returnNo,
      performedBy: ret.performedBy || currentUser?.displayName || 'Admin',
      supplierOrCustomer: ret.supplierName,
      notes: `Supplier Return (RMA): ${ret.reason || ret.defectReason || ''} (${ret.actionTaken || ''})`,
      createdAt: new Date().toISOString(),
    };
    setStockMovements((prev) => [movement, ...prev]);

    // 3. Resolution handling (Only if return is already marked COMPLETED upon registration)
    if (ret.status === 'COMPLETED') {
      // If DEDUCT_SUPPLIER_DEBT / DEDUCT_DEBT: Deduct remainingDebt from associated purchase and supplier balance
      if (ret.actionTaken === 'DEDUCT_SUPPLIER_DEBT' || ret.resolutionMethod === 'DEDUCT_DEBT') {
        if (ret.purchaseInvoiceNo) {
          setPurchases((prev) =>
            prev.map((po) => {
              if (po.invoiceNo === ret.purchaseInvoiceNo) {
                const newDebt = Math.max(0, po.remainingDebt - ret.totalAmount);
                const newStatus: PurchaseRecord['paymentStatus'] =
                  newDebt === 0 ? 'PAID' : po.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
                return {
                  ...po,
                  remainingDebt: newDebt,
                  paymentStatus: newStatus,
                  notes: (po.notes ? po.notes + ' • ' : '') + `RMA ${ret.returnNo} deducted ${formatMMK(ret.totalAmount)}`,
                };
              }
              return po;
            })
          );
        }

        setContacts((prev) =>
          prev.map((c) => {
            if (c.name.trim().toLowerCase() === ret.supplierName.trim().toLowerCase()) {
              return {
                ...c,
                balanceDue: Math.max(0, (c.balanceDue || 0) - ret.totalAmount),
              };
            }
            return c;
          })
        );
      }

      // If CASH_OR_BANK_REFUND / CASH_REFUND: Add money into Treasury Account
      if ((ret.actionTaken === 'CASH_OR_BANK_REFUND' || ret.resolutionMethod === 'CASH_REFUND') && (ret.accountId || ret.refundAccountId)) {
        const targetAccId = ret.accountId || ret.refundAccountId;
        const accObj = treasuryAccounts.find((a) => a.id === targetAccId);

        setTreasuryAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === targetAccId) {
              return {
                ...acc,
                currentBalance: acc.currentBalance + ret.totalAmount,
                lastUpdated: new Date().toISOString().split('T')[0],
              };
            }
            return acc;
          })
        );

        const refundTx: TreasuryTransaction = {
          id: `tx-rma-${Date.now()}`,
          date: ret.date,
          accountId: targetAccId!,
          accountName: accObj ? accObj.name : 'Treasury Account',
          type: 'SUPPLIER_REFUND',
          direction: 'IN',
          amount: ret.totalAmount,
          notes: `Supplier RMA Refund: ${ret.itemName} (${ret.returnNo}) from ${ret.supplierName}`,
          partnerName: ret.supplierName,
          recordedBy: ret.performedBy || currentUser?.displayName || 'Admin',
          createdAt: new Date().toISOString(),
        };
        setTreasuryTransactions((prev) => [refundTx, ...prev]);
      }
    }

    handleLogActivity({
      module: 'INVENTORY',
      action: 'RETURN',
      title: 'Supplier Return Processed',
      description: `Returned ${ret.quantity} pcs of "${ret.itemName}" to ${ret.supplierName} (${formatMMK(ret.totalAmount)}).`,
    });
  };

  // Settle RMA Return Record (Repair Restock, New Unit Swap, Cash/Bank Refund, PO Debt Deduction)
  const handleSettleRma = (
    rmaId: string,
    resolutionType: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED',
    details: {
      settlementDate: string;
      replacementImeis?: string[];
      replacementItemName?: string;
      refundAmount?: number;
      settledAccountId?: string;
      settledPoInvoiceNo?: string;
      settledPoId?: string;
      resolutionNotes?: string;
      performedBy: string;
    }
  ) => {
    const targetRma = supplierReturns.find((r) => r.id === rmaId);
    if (!targetRma) return;

    // 1. Update RMA record status to COMPLETED
    setSupplierReturns((prev) =>
      prev.map((r) => {
        if (r.id === rmaId) {
          return {
            ...r,
            status: 'COMPLETED' as const,
            resolutionType,
            settlementDate: details.settlementDate,
            replacementImeis: details.replacementImeis,
            refundAmount: details.refundAmount,
            settledAccountId: details.settledAccountId,
            settledPoId: details.settledPoId,
            settledPoInvoiceNo: details.settledPoInvoiceNo,
            resolutionNotes: details.resolutionNotes,
          };
        }
        return r;
      })
    );

    // 2. If Unit Replacement: add replacement IMEIs into inventory stock and remove old defective IMEIs
    if (resolutionType === 'REPLACED' && details.replacementImeis && details.replacementImeis.length > 0) {
      setInventory((prev) => {
        return prev.map((item) => {
          const isMatch =
            (targetRma.itemId && item.id === targetRma.itemId) ||
            item.name.toLowerCase() === targetRma.itemName.toLowerCase() ||
            (targetRma.sku && item.sku.toLowerCase() === targetRma.sku.toLowerCase());

          if (isMatch) {
            const bStock = { ...(item.branchStock || {}) };
            const bId = targetRma.branchId || 'branch-1';
            bStock[bId] = (bStock[bId] || 0) + details.replacementImeis!.length;
            const newTotal = Object.values(bStock).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);

            // Remove old defective IMEI(s) from item's imeiList
            let updatedImeis = [...(item.imeiList || [])];
            if (targetRma.imeiList && targetRma.imeiList.length > 0) {
              const oldSet = new Set(targetRma.imeiList.map((s) => s.trim().toLowerCase()));
              updatedImeis = updatedImeis.filter((im) => !oldSet.has(im.trim().toLowerCase()));
            }
            // Add new replacement IMEIs
            details.replacementImeis!.forEach((im) => {
              const clean = im.trim();
              if (clean && !updatedImeis.some((u) => u.toLowerCase() === clean.toLowerCase())) {
                updatedImeis.push(clean);
              }
            });

            return {
              ...item,
              quantity: newTotal,
              branchStock: bStock,
              totalStock: newTotal,
              imeiList: updatedImeis,
              imeiOrSerial: updatedImeis.join(', '),
              serialNumbers: updatedImeis,
            };
          }
          return item;
        });
      });
    }

    // 3. If Repaired: restore quantity to inventory stock
    if (resolutionType === 'REPAIRED') {
      setInventory((prev) => {
        return prev.map((item) => {
          const isMatch =
            (targetRma.itemId && item.id === targetRma.itemId) ||
            item.name.toLowerCase() === targetRma.itemName.toLowerCase() ||
            (targetRma.sku && item.sku.toLowerCase() === targetRma.sku.toLowerCase());

          if (isMatch) {
            const bStock = { ...(item.branchStock || {}) };
            const bId = targetRma.branchId || 'branch-1';
            bStock[bId] = (bStock[bId] || 0) + targetRma.quantity;
            const newTotal = Object.values(bStock).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);
            return {
              ...item,
              quantity: newTotal,
              branchStock: bStock,
              imeiList: targetRma.imeiList ? [...(item.imeiList || []), ...targetRma.imeiList] : item.imeiList,
            };
          }
          return item;
        });
      });
    }

    // 4. If Cash/Bank Refund: deposit into Treasury Account & log transaction
    if (resolutionType === 'REFUNDED') {
      const refundAmt = Number(details.refundAmount) || targetRma.totalAmount || 0;
      const targetAccId = details.settledAccountId || treasuryAccounts[0]?.id || 'acc-cash-hq';

      if (refundAmt > 0) {
        setTreasuryAccounts((prev) => {
          const exists = prev.some((acc) => acc.id === targetAccId);
          if (!exists) {
            const fallbackAcc: TreasuryAccount = {
              id: targetAccId,
              name: 'Cash in Hand (HQ / Main Register)',
              type: 'CASH',
              currentBalance: refundAmt,
              lastUpdated: details.settlementDate,
              isDefault: true,
            };
            return [fallbackAcc, ...prev];
          }
          return prev.map((acc) => {
            if (acc.id === targetAccId) {
              return {
                ...acc,
                currentBalance: (Number(acc.currentBalance) || 0) + refundAmt,
                lastUpdated: details.settlementDate,
              };
            }
            return acc;
          });
        });

        const accObj = treasuryAccounts.find((a) => a.id === targetAccId);
        const tx: TreasuryTransaction = {
          id: `tx-rma-refund-${Date.now()}`,
          date: details.settlementDate,
          type: 'SUPPLIER_REFUND',
          accountId: targetAccId,
          accountName: accObj?.name || 'Cash in Hand (HQ / Main Register)',
          amount: refundAmt,
          direction: 'IN',
          referenceNo: targetRma.returnCode || targetRma.returnNo,
          partnerName: targetRma.supplierName,
          notes: `RMA Defect Refund Received: ${targetRma.itemName} (${targetRma.supplierName}) - ${details.resolutionNotes || 'Refund Received'}`,
          recordedBy: currentUser?.displayName || 'Admin',
          createdAt: new Date().toISOString(),
        };
        setTreasuryTransactions((prev) => [tx, ...prev]);
      }
    }

    // 5. If Debt Deducted from PO: reduce remainingDebt on the target PO & update supplier balance
    if (resolutionType === 'DEBT_DEDUCTED' && details.refundAmount) {
      if (details.settledPoId) {
        setPurchases((prev) =>
          prev.map((p) => {
            if (p.id === details.settledPoId) {
              const newDebt = Math.max(0, (p.remainingDebt || 0) - details.refundAmount!);
              const newPaid = (p.paidAmount || 0) + details.refundAmount!;
              const newStatus: PurchaseRecord['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';
              return {
                ...p,
                remainingDebt: newDebt,
                paidAmount: newPaid,
                paymentStatus: newStatus,
                notes: (p.notes ? p.notes + ' • ' : '') + `RMA Debt Deduction: ${formatMMK(details.refundAmount!)} (${targetRma.returnCode || 'RMA'})`,
              };
            }
            return p;
          })
        );
      }

      if (targetRma.supplierName) {
        const sName = targetRma.supplierName.trim().toLowerCase();
        setContacts((prev) =>
          prev.map((c) => {
            if (c.name.trim().toLowerCase() === sName) {
              return {
                ...c,
                balanceDue: Math.max(0, (c.balanceDue || 0) - details.refundAmount!),
              };
            }
            return c;
          })
        );
      }
    }

    // 6. Auto-Link Financial Supplier Benefit Record for RMA Refunds and Compensations
    if ((resolutionType === 'REFUNDED' || resolutionType === 'DEBT_DEDUCTED') && (details.refundAmount || targetRma.totalAmount)) {
      const settledAmount = Number(details.refundAmount) || targetRma.totalAmount || 0;
      if (settledAmount > 0) {
        const autoBenefit: SupplierBenefit = {
          id: `ben-rma-${Date.now()}`,
          claimNo: `CLM-RMA-${Date.now().toString().slice(-4)}`,
          date: details.settlementDate || new Date().toISOString().split('T')[0],
          settlementDate: details.settlementDate,
          supplierName: targetRma.supplierName || 'Supplier',
          category: 'Cashback',
          amount: settledAmount,
          settleAction: resolutionType === 'REFUNDED' ? 'DEPOSIT_TREASURY' : 'DEDUCT_SUPPLIER_DEBT',
          accountId: details.settledAccountId,
          targetPurchaseId: details.settledPoId,
          targetPurchaseInvoiceNo: details.settledPoInvoiceNo,
          status: 'SETTLED',
          referenceNo: targetRma.returnCode || targetRma.returnNo,
          notes: `Auto-linked RMA Defect Compensation for ${targetRma.itemName}: ${details.resolutionNotes || resolutionType}`,
          recordedBy: currentUser?.displayName || 'User',
          createdAt: new Date().toISOString(),
        };
        setSupplierBenefits((prev) => [autoBenefit, ...prev]);
      }
    }

    handleLogActivity({
      module: 'FINANCE',
      action: 'UPDATE',
      title: `RMA Settled: ${targetRma.itemName}`,
      description: `RMA #${targetRma.returnCode || targetRma.returnNo} settled via ${resolutionType} by ${currentUser?.displayName || 'User'}.`,
    });
  };

  // Delete individual RMA Return Record
  const handleDeleteSupplierReturn = (rmaId: string, restoreStock: boolean = true) => {
    const targetRma = supplierReturns.find((r) => r.id === rmaId);
    if (!targetRma) return;

    requestDelete({
      title: 'Delete RMA Return Record',
      description: `Are you sure you want to delete RMA record ${targetRma.returnCode || targetRma.returnNo} for "${targetRma.itemName}" (${targetRma.supplierName})?` +
        (restoreStock && (targetRma.status === 'PENDING' || targetRma.status === 'PENDING_REPLACEMENT') ? ' Stock and IMEIs will be safely restored back to the branch inventory.' : ''),
      itemName: `${targetRma.returnCode || targetRma.returnNo} - ${targetRma.itemName}`,
      confirmText: 'Delete RMA Record',
      onConfirm: () => {
        // 1. If it was pending, restore stock and returned IMEIs back to branch
        if (restoreStock && (targetRma.status === 'PENDING' || targetRma.status === 'PENDING_REPLACEMENT')) {
          setInventory((prev) =>
            prev.map((item) => {
              if (
                (targetRma.itemId && item.id === targetRma.itemId) ||
                (targetRma.inventoryItemId && item.id === targetRma.inventoryItemId) ||
                item.name.toLowerCase() === targetRma.itemName.toLowerCase() ||
                (targetRma.sku && item.sku.toLowerCase() === targetRma.sku.toLowerCase())
              ) {
                const bStock = { ...(item.branchStock || {}) };
                const bId = targetRma.branchId || 'branch-1';
                bStock[bId] = (bStock[bId] || 0) + targetRma.quantity;
                const newTotal = Object.values(bStock).reduce<number>((sum, q) => sum + (Number(q) || 0), 0);

                let updatedImeis = [...(item.imeiList || [])];
                if (targetRma.imeiList && targetRma.imeiList.length > 0) {
                  targetRma.imeiList.forEach((im) => {
                    const clean = im.trim();
                    if (clean && !updatedImeis.some((u) => u.toLowerCase() === clean.toLowerCase())) {
                      updatedImeis.push(clean);
                    }
                  });
                }

                return {
                  ...item,
                  branchStock: bStock,
                  totalStock: newTotal,
                  quantity: newTotal,
                  imeiList: updatedImeis,
                  imeiOrSerial: updatedImeis.join(', '),
                  serialNumbers: updatedImeis,
                };
              }
              return item;
            })
          );
        }

        // 2. Remove RMA from supplierReturns
        const updatedReturns = supplierReturns.filter((r) => r.id !== rmaId);
        setSupplierReturns(updatedReturns);
        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.SUPPLIER_RETURNS, JSON.stringify(updatedReturns));
        localStorage.setItem('sktg_last_updated_at', nowIso);
        void deleteDocumentFromCloud('supplierReturns', rmaId, currentUser?.displayName || 'Delete RMA Return Record');

        pushStateToCloud(
          {
            branches,
            users,
            employees,
            salaryRecords,
            sales,
            expenses,
            inventory,
            stockMovements,
            contacts,
            purchases,
            supplierReturns: updatedReturns,
            supplierBenefits,
            treasuryAccounts,
            treasuryTransactions,
            interBranchTransfers,
            customPositions: positionsMap,
          },
          currentUser?.displayName || 'Delete RMA Return Record',
          true
        );

        handleLogActivity({
          module: 'INVENTORY',
          action: 'DELETE',
          title: `RMA Deleted: ${targetRma.returnCode || targetRma.returnNo}`,
          description: `Deleted RMA return record for "${targetRma.itemName}" (${targetRma.supplierName}).`,
        });
      },
    });
  };

  // Clear all RMA Return Records for fresh testing
  const handleClearAllSupplierReturns = () => {
    if (supplierReturns.length === 0) return;
    requestDelete({
      title: 'Clear All RMA Return Records',
      description: `Are you sure you want to delete all ${supplierReturns.length} RMA return records? This will clear all RMA defect return history so you can test freshly from scratch.`,
      itemName: `All ${supplierReturns.length} RMA Records`,
      confirmText: 'Clear All RMA Records',
      onConfirm: () => {
        setSupplierReturns([]);
        handleLogActivity({
          module: 'INVENTORY',
          action: 'DELETE',
          title: 'All RMA Records Cleared',
          description: 'Cleared all RMA defect return records for fresh testing.',
        });
      },
    });
  };

  // Add Supplier Benefit / Claim Handler
  const handleAddSupplierBenefit = (benefit: SupplierBenefit) => {
    setSupplierBenefits((prev) => {
      const updated = [benefit, ...prev];
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem('sktg_last_updated_at', new Date().toISOString());
    void saveRecordToCloud('supplierBenefits', benefit, currentUser?.displayName || 'Add Supplier Benefit');

    // Only deposit funds or deduct PO debt if the benefit is immediately SETTLED (not PENDING receivable)
    if (benefit.status === 'SETTLED') {
      // 1. If Direct Treasury Deposit: deposit amount into Treasury Account
      if (benefit.settleAction === 'DEPOSIT_TREASURY' && benefit.accountId) {
        setTreasuryAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === benefit.accountId) {
              return {
                ...acc,
                currentBalance: acc.currentBalance + benefit.amount,
                lastUpdated: benefit.date,
              };
            }
            return acc;
          })
        );

        const accObj = treasuryAccounts.find((a) => a.id === benefit.accountId);
        const tx: TreasuryTransaction = {
          id: `tx-supben-${Date.now()}`,
          date: benefit.date,
          type: 'SUPPLIER_REFUND',
          accountId: benefit.accountId,
          accountName: accObj?.name || 'Treasury Account',
          amount: benefit.amount,
          direction: 'IN',
          referenceNo: benefit.claimNo,
          partnerName: benefit.supplierName,
          notes: `Supplier Benefit (${benefit.category}): ${benefit.supplierName} - ${benefit.notes || benefit.category}`,
          recordedBy: currentUser?.displayName || 'Admin',
          createdAt: new Date().toISOString(),
        };
        setTreasuryTransactions((prev) => [tx, ...prev]);
      }

      // 2. If PO Debt Offset: deduct from target purchase PO & update supplier balance
      if (benefit.settleAction === 'DEDUCT_SUPPLIER_DEBT') {
        if (benefit.targetPurchaseId) {
          setPurchases((prev) =>
            prev.map((p) => {
              if (p.id === benefit.targetPurchaseId) {
                const newDebt = Math.max(0, (p.remainingDebt || 0) - benefit.amount);
                const newPaid = (p.paidAmount || 0) + benefit.amount;
                const newStatus: PurchaseRecord['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';
                return {
                  ...p,
                  remainingDebt: newDebt,
                  paidAmount: newPaid,
                  paymentStatus: newStatus,
                  notes: (p.notes ? p.notes + ' • ' : '') + `Supplier Benefit Offset (${benefit.category}): ${formatMMK(benefit.amount)} (${benefit.claimNo})`,
                };
              }
              return p;
            })
          );
        }

        if (benefit.supplierName) {
          const sName = benefit.supplierName.trim().toLowerCase();
          setContacts((prev) =>
            prev.map((c) => {
              if (c.name.trim().toLowerCase() === sName) {
                return {
                  ...c,
                  balanceDue: Math.max(0, (c.balanceDue || 0) - benefit.amount),
                };
              }
              return c;
            })
          );
        }
      }
    }

    handleLogActivity({
      module: 'FINANCE',
      action: 'CREATE',
      title: `Supplier Benefit Recorded: ${formatMMK(benefit.amount)}`,
      description: `Logged ${benefit.category} of ${formatMMK(benefit.amount)} (${benefit.status || 'PENDING'}) from ${benefit.supplierName}.`,
    });
  };

  const handleDeleteSupplierBenefit = (id: string) => {
    const targetBenefit = supplierBenefits.find((b) => b.id === id);
    if (!targetBenefit) return;

    requestDelete({
      title: 'Delete Supplier Benefit / Incentive Voucher',
      description: `Are you sure you want to permanently delete claim voucher ${targetBenefit.claimNo} (${targetBenefit.category} - ${formatMMK(targetBenefit.amount)}) for ${targetBenefit.supplierName}?`,
      itemName: `${targetBenefit.claimNo} • ${targetBenefit.supplierName} (${formatMMK(targetBenefit.amount)})`,
      confirmText: 'Delete Claim Voucher',
      onConfirm: () => {
        const updatedBenefits = supplierBenefits.filter((b) => b.id !== id);
        setSupplierBenefits(updatedBenefits);
        const nowIso = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(updatedBenefits));
        localStorage.setItem('sktg_last_updated_at', nowIso);
        void deleteDocumentFromCloud('supplierBenefits', id, currentUser?.displayName || 'Delete Supplier Benefit');

        pushStateToCloud(
          {
            branches,
            users,
            employees,
            salaryRecords,
            sales,
            expenses,
            inventory,
            stockMovements,
            contacts,
            purchases,
            supplierReturns,
            supplierBenefits: updatedBenefits,
            treasuryAccounts,
            treasuryTransactions,
            interBranchTransfers,
            customPositions: positionsMap,
          },
          currentUser?.displayName || 'Delete Supplier Benefit',
          true
        );

        handleLogActivity({
          module: 'FINANCE',
          action: 'DELETE',
          title: 'Deleted Supplier Benefit / Incentive Claim',
          description: `Deleted supplier benefit claim ${targetBenefit?.claimNo || id} (${targetBenefit?.supplierName || ''}).`,
        });
      },
    });
  };

  const handleUpdateSupplierBenefit = (updatedBenefit: SupplierBenefit) => {
    setSupplierBenefits((prev) => {
      const updated = prev.map((b) => (b.id === updatedBenefit.id ? updatedBenefit : b));
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(updated));
      return updated;
    });
    localStorage.setItem('sktg_last_updated_at', new Date().toISOString());
    void saveRecordToCloud('supplierBenefits', updatedBenefit, currentUser?.displayName || 'Update Supplier Benefit');
    handleLogActivity({
      module: 'FINANCE',
      action: 'UPDATE',
      title: `Supplier Benefit Updated: ${updatedBenefit.claimNo}`,
      description: `Updated ${updatedBenefit.category} claim ${updatedBenefit.claimNo} for ${updatedBenefit.supplierName} (Status: ${updatedBenefit.status}).`,
    });
  };

  const handleSettleSupplierBenefit = (
    benefitId: string,
    optionsOrAccountId?: {
      settleAction?: 'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT';
      accountId?: string;
      targetPoId?: string;
      settleDate?: string;
      notes?: string;
    } | string,
    legacySettleDate?: string,
    legacyNotes?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const target = supplierBenefits.find((b) => b.id === benefitId);
    if (!target) return;

    let settleAction: 'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT' = 'DEPOSIT_TREASURY';
    let accountId: string | undefined = undefined;
    let targetPoId: string | undefined = undefined;
    let sDate = today;
    let notes = '';

    if (typeof optionsOrAccountId === 'object' && optionsOrAccountId !== null) {
      settleAction = optionsOrAccountId.settleAction || (optionsOrAccountId.targetPoId ? 'DEDUCT_SUPPLIER_DEBT' : 'DEPOSIT_TREASURY');
      accountId = optionsOrAccountId.accountId;
      targetPoId = optionsOrAccountId.targetPoId;
      sDate = optionsOrAccountId.settleDate || today;
      notes = optionsOrAccountId.notes || '';
    } else if (typeof optionsOrAccountId === 'string') {
      accountId = optionsOrAccountId;
      sDate = legacySettleDate || today;
      notes = legacyNotes || '';
      settleAction = 'DEPOSIT_TREASURY';
    }

    const targetPo = targetPoId ? purchases.find((p) => p.id === targetPoId) : undefined;
    const accObj = accountId ? treasuryAccounts.find((a) => a.id === accountId) : undefined;

    // 1. Update Benefit Record Status to SETTLED
    setSupplierBenefits((prev) => {
      const updated = prev.map((b) => {
        if (b.id === benefitId) {
          return {
            ...b,
            status: 'SETTLED' as const,
            date: sDate,
            settlementDate: sDate,
            settleAction,
            accountId: settleAction === 'DEPOSIT_TREASURY' ? (accountId || b.accountId) : undefined,
            accountName: settleAction === 'DEPOSIT_TREASURY' ? (accObj?.name || b.accountName) : undefined,
            targetPurchaseId: settleAction === 'DEDUCT_SUPPLIER_DEBT' ? (targetPoId || b.targetPurchaseId) : undefined,
            targetPurchaseInvoiceNo: settleAction === 'DEDUCT_SUPPLIER_DEBT' ? (targetPo?.invoiceNo || b.targetPurchaseInvoiceNo) : undefined,
            notes: notes ? `${b.notes ? b.notes + ' • ' : ''}[Settled: ${notes}]` : b.notes,
          };
        }
        return b;
      });
      localStorage.setItem(STORAGE_KEYS.SUPPLIER_BENEFITS, JSON.stringify(updated));
      const settledItem = updated.find((b) => b.id === benefitId);
      if (settledItem) {
        void saveRecordToCloud('supplierBenefits', settledItem, currentUser?.displayName || 'Settle Benefit');
      }
      return updated;
    });
    localStorage.setItem('sktg_last_updated_at', new Date().toISOString());

    // 2. If Deposit to Treasury: Increase account balance & log transaction
    if (settleAction === 'DEPOSIT_TREASURY' && accountId) {
      setTreasuryAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === accountId) {
            return {
              ...acc,
              currentBalance: acc.currentBalance + target.amount,
              lastUpdated: sDate,
            };
          }
          return acc;
        })
      );

      const tx: TreasuryTransaction = {
        id: `tx-supben-settle-${Date.now()}`,
        date: sDate,
        type: 'SUPPLIER_REFUND',
        accountId,
        accountName: accObj?.name || 'Treasury Account',
        amount: target.amount,
        direction: 'IN',
        referenceNo: target.claimNo,
        partnerName: target.supplierName,
        notes: `Supplier Claim Settled (${target.category}): ${target.supplierName} - ${notes || target.notes || target.category}`,
        recordedBy: currentUser?.displayName || 'Admin',
        createdAt: new Date().toISOString(),
      };
      setTreasuryTransactions((prev) => [tx, ...prev]);
    }

    // 3. If Deduct from PO Debt: Reduce remainingDebt on target PO & reduce supplier balance
    if (settleAction === 'DEDUCT_SUPPLIER_DEBT' && targetPoId) {
      setPurchases((prev) =>
        prev.map((po) => {
          if (po.id === targetPoId) {
            const newDebt = Math.max(0, (po.remainingDebt || 0) - target.amount);
            const newPaid = (po.paidAmount || 0) + target.amount;
            const newStatus: PurchaseRecord['paymentStatus'] = newDebt === 0 ? 'PAID' : 'PARTIAL';
            return {
              ...po,
              remainingDebt: newDebt,
              paidAmount: newPaid,
              paymentStatus: newStatus,
              notes: (po.notes ? po.notes + ' • ' : '') + `Claim ${target.claimNo} deducted ${formatMMK(target.amount)}`,
            };
          }
          return po;
        })
      );

      if (target.supplierName) {
        const sName = target.supplierName.trim().toLowerCase();
        setContacts((prev) =>
          prev.map((c) => {
            if (c.name.trim().toLowerCase() === sName) {
              return {
                ...c,
                balanceDue: Math.max(0, (c.balanceDue || 0) - target.amount),
              };
            }
            return c;
          })
        );
      }
    }

    handleLogActivity({
      module: 'FINANCE',
      action: 'UPDATE',
      title: `Supplier Claim Settled: ${formatMMK(target.amount)}`,
      description: `Settled claim ${target.claimNo} from ${target.supplierName} via ${settleAction === 'DEPOSIT_TREASURY' ? (accObj?.name || 'Treasury') : (`PO #${targetPo?.invoiceNo || ''}`)} on ${sDate}.`,
    });
  };

  // Reset to original clean data
  const handleResetToDefault = () => {
    requestDelete({
      title: 'Reset All System Data',
      description: 'Keep 4 branches and login accounts, but reset all inventory, sales, expenses, purchases, and treasury accounts to clean initial data. Are you sure you want to proceed?',
      itemName: 'All System Records & Database Cache',
      confirmText: 'Reset System',
      onConfirm: async () => {
        setBranches(INITIAL_BRANCHES);
        setUsers(INITIAL_USERS);
        setEmployees(INITIAL_EMPLOYEES);
        setSalaryRecords(INITIAL_SALARY_RECORDS);
        setSales(INITIAL_SALES);
        setExpenses(INITIAL_EXPENSES);
        setInventory(INITIAL_INVENTORY);
        setStockMovements(INITIAL_STOCK_MOVEMENTS);
        setContacts(INITIAL_CONTACTS);
        setPurchases(INITIAL_PURCHASES);
        setTreasuryAccounts(INITIAL_TREASURY_ACCOUNTS);
        setTreasuryTransactions(INITIAL_TREASURY_TRANSACTIONS);
        setActiveBranchFilter('ALL');

        // Clear local storage
        localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
        localStorage.removeItem(STORAGE_KEYS.SALARY_RECORDS);
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.INVENTORY);
        localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
        localStorage.removeItem(STORAGE_KEYS.CONTACTS);
        localStorage.removeItem(STORAGE_KEYS.PURCHASES);
        localStorage.removeItem(STORAGE_KEYS.TREASURY_ACCOUNTS);
        localStorage.removeItem(STORAGE_KEYS.TREASURY_TRANSACTIONS);

        // Sync to cloud
        await pushStateToCloud({
          branches: INITIAL_BRANCHES,
          users: INITIAL_USERS,
          employees: INITIAL_EMPLOYEES,
          salaryRecords: INITIAL_SALARY_RECORDS,
          sales: INITIAL_SALES,
          expenses: INITIAL_EXPENSES,
          inventory: INITIAL_INVENTORY,
          stockMovements: INITIAL_STOCK_MOVEMENTS,
          contacts: INITIAL_CONTACTS,
          purchases: INITIAL_PURCHASES,
          treasuryAccounts: INITIAL_TREASURY_ACCOUNTS,
          treasuryTransactions: INITIAL_TREASURY_TRANSACTIONS,
        }, currentUser?.displayName || 'System Reset');
      },
    });
  };

  // Reset operational data (payroll history, sales, expenses, and inventory stock to 0)
  const handleResetOperationalDataToZero = () => {
    requestDelete({
      title: 'Reset Operational Data to 0',
      description: 'This will reset payroll history to 0 records, sales ledger to 0 MMK, expense ledger to 0 MMK, and set all inventory product stock levels to 0. Master profiles (Branches, Staff Profiles, Login Accounts, and Catalog Products) will remain intact. Are you sure you want to proceed?',
      itemName: 'Payroll, Sales, Expenses, and Stock Counts',
      confirmText: 'Reset Operations to 0',
      onConfirm: async () => {
        const nowIso = new Date().toISOString();
        localStorage.setItem('sktg_sales_cleared_at', nowIso);
        localStorage.setItem('sktg_inventory_cleared_at', nowIso);
        localStorage.setItem('sktg_last_updated_at', nowIso);

        // Zero out inventory quantities across all branches
        const zeroedInventory = inventory.map((item) => {
          const zeroBranchStock: { [branchId: string]: number } = {};
          branches.forEach((b) => {
            zeroBranchStock[b.id] = 0;
          });
          if (item.branchStock) {
            Object.keys(item.branchStock).forEach((bId) => {
              zeroBranchStock[bId] = 0;
            });
          }
          return {
            ...item,
            totalStock: 0,
            branchStock: zeroBranchStock,
            batches: [],
          };
        });

        // Zero out treasury account balances
        const zeroedTreasuryAccounts = treasuryAccounts.map((acc) => ({
          ...acc,
          currentBalance: 0,
        }));

        setSalaryRecords([]);
        setSales([]);
        setExpenses([]);
        setInventory(zeroedInventory);
        setStockMovements([]);
        setPurchases([]);
        setTreasuryAccounts(zeroedTreasuryAccounts);
        setTreasuryTransactions([]);

        // Clear or update local storage
        localStorage.removeItem(STORAGE_KEYS.SALARY_RECORDS);
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(zeroedInventory));
        localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
        localStorage.removeItem(STORAGE_KEYS.PURCHASES);
        localStorage.setItem(STORAGE_KEYS.TREASURY_ACCOUNTS, JSON.stringify(zeroedTreasuryAccounts));
        localStorage.removeItem(STORAGE_KEYS.TREASURY_TRANSACTIONS);

        // Push to cloud with force = true
        await pushStateToCloud(
          {
            branches,
            users,
            employees,
            salaryRecords: [],
            sales: [],
            expenses: [],
            inventory: zeroedInventory,
            stockMovements: [],
            contacts,
            purchases: [],
            supplierReturns,
            supplierBenefits,
            treasuryAccounts: zeroedTreasuryAccounts,
            treasuryTransactions: [],
            interBranchTransfers,
            customPositions: positionsMap,
          },
          currentUser?.displayName || 'Reset Operations to 0',
          true
        );
      },
    });
  };

  // Force overwrite Cloud document with current local screen state
  const handleForceSyncLocalToCloud = async () => {
    setCloudSyncStatus('syncing');
    resetQuotaCooldown();
    isLocalUpdateRef.current = true;
    const nowIso = new Date().toISOString();
    localStorage.setItem('sktg_last_updated_at', nowIso);
    const res = await pushStateToCloud(
      {
        branches,
        users,
        employees,
        salaryRecords,
        sales,
        expenses,
        inventory,
        stockMovements,
        contacts,
        purchases,
        supplierReturns,
        supplierBenefits,
        treasuryAccounts,
        treasuryTransactions,
        interBranchTransfers,
        customPositions: positionsMap,
      },
      currentUser?.displayName || 'Force Local Overwrite',
      true
    );
    if (res.isQuotaExceeded) {
      setCloudSyncStatus('quota_exceeded');
    } else if (res.success) {
      setCloudSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      alert('✅ Successfully overwritten Cloud document with current local screen state!');
    } else {
      setCloudSyncStatus('error');
      alert(`⚠️ Force sync failed: ${res.error || 'Unknown error'}`);
    }
  };

  // Reset all user accounts to default INITIAL_USERS
  const handleResetAllUsers = () => {
    requestDelete({
      title: 'Reset All User Accounts',
      description: 'This will reset all user login accounts back to canonical defaults (MD Daw Su Myat Win and 30 official branch staff accounts with username@sktg.com format). Are you sure you want to proceed?',
      itemName: 'All User Accounts & Login Credentials',
      confirmText: 'Reset User Accounts',
      onConfirm: async () => {
        setUsers(INITIAL_USERS);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));

        await pushStateToCloud({
          branches,
          users: INITIAL_USERS,
          employees,
          salaryRecords,
          sales,
          expenses,
          inventory,
          stockMovements,
          contacts,
          purchases,
          treasuryAccounts,
          treasuryTransactions,
        }, currentUser?.displayName || 'Reset User Accounts');
      },
    });
  };

  // System Reset keeping Employees and User Accounts intact while wiping operational data (Stock, Sales, Salary, Inventory, etc.)
  const handleResetSystemKeepEmployeesAndUsers = () => {
    requestDelete({
      title: 'System Factory Reset (Keep Staff & Users)',
      description: 'Are you sure you want to permanently reset all Stock, Inventory, Sales, Salary Payroll, Expenses, Purchases, Stock Movements, and Financial records? Employee lists and User Accounts will be preserved.',
      itemName: 'All Operational Data (Stock, Sales, Salary, Expenses, Inventory)',
      confirmText: 'Reset System Data',
      onConfirm: async () => {
        setSales([]);
        setSalaryRecords([]);
        setExpenses([]);
        setInventory([]);
        setStockMovements([]);
        setContacts([]);
        setPurchases([]);
        setTreasuryTransactions([]);
        setInterBranchTransfers([]);
        setSupplierReturns([]);
        setHeldBills([]);
        setShifts([]);
        setActivityLogs([]);

        // Clear operational storage keys (keep users, employees, branches)
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.SALARY_RECORDS);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.INVENTORY);
        localStorage.removeItem(STORAGE_KEYS.STOCK_MOVEMENTS);
        localStorage.removeItem(STORAGE_KEYS.CONTACTS);
        localStorage.removeItem(STORAGE_KEYS.PURCHASES);
        localStorage.removeItem(STORAGE_KEYS.TREASURY_TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.INTER_BRANCH_TRANSFERS);
        localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOGS);
        localStorage.removeItem(STORAGE_KEYS.CASHIER_SHIFTS);
        localStorage.removeItem(STORAGE_KEYS.HELD_BILLS);
        localStorage.removeItem(STORAGE_KEYS.SUPPLIER_RETURNS);

        // Push state to cloud preserving employees, users, and branches
        await pushStateToCloud({
          branches,
          users,
          employees, // Preserved!
          salaryRecords: [],
          sales: [],
          expenses: [],
          inventory: [],
          stockMovements: [],
          contacts: [],
          purchases: [],
          treasuryAccounts,
          treasuryTransactions: [],
        }, currentUser?.displayName || 'System Reset (Keep Staff & Users)');
      },
    });
  };

  // Handle full system offline database backup download (.JSON)
  const handleDownloadFullBackup = () => {
    exportFullSystemBackupJSON({
      branches,
      sales,
      expenses,
      inventory,
      stockMovements,
      employees,
      salaryRecords,
      contacts,
      users,
      treasuryAccounts,
      treasuryTransactions,
      purchases,
      supplierReturns,
      activityLogs,
      interBranchTransfers,
    });
  };

  // Handle restoring offline JSON database backup
  const handleRestoreBackup = async (restoredData: any) => {
    if (!restoredData) return;
    lastLocalActionTimeRef.current = Date.now();
    isLocalUpdateRef.current = true;

    const nextBranches = Array.isArray(restoredData.branches) && restoredData.branches.length > 0 ? restoredData.branches : branches;
    const nextSales = Array.isArray(restoredData.sales) ? restoredData.sales : sales;
    const nextExpenses = Array.isArray(restoredData.expenses) ? restoredData.expenses : expenses;
    const nextInventory = Array.isArray(restoredData.inventory) ? restoredData.inventory : inventory;
    const nextMovements = Array.isArray(restoredData.stockMovements) ? restoredData.stockMovements : (Array.isArray(restoredData.movements) ? restoredData.movements : stockMovements);
    const nextEmployees = Array.isArray(restoredData.employees) ? restoredData.employees : employees;
    const nextSalaryRecords = Array.isArray(restoredData.salaryRecords) ? restoredData.salaryRecords : salaryRecords;
    const nextContacts = Array.isArray(restoredData.contacts) ? restoredData.contacts : contacts;
    const nextUsers = Array.isArray(restoredData.users) && restoredData.users.length > 0 ? restoredData.users : users;
    const nextTreasury = Array.isArray(restoredData.treasuryAccounts) ? restoredData.treasuryAccounts : treasuryAccounts;
    const nextTransactions = Array.isArray(restoredData.treasuryTransactions) ? restoredData.treasuryTransactions : treasuryTransactions;
    const nextPurchases = Array.isArray(restoredData.purchases) ? restoredData.purchases : purchases;
    const nextSupplierReturns = Array.isArray(restoredData.supplierReturns) ? restoredData.supplierReturns : supplierReturns;
    const nextActivityLogs = Array.isArray(restoredData.activityLogs) ? restoredData.activityLogs : activityLogs;
    const nextTransfers = Array.isArray(restoredData.interBranchTransfers) ? restoredData.interBranchTransfers : interBranchTransfers;

    setBranches(nextBranches);
    setSales(nextSales);
    setExpenses(nextExpenses);
    setInventory(nextInventory);
    setStockMovements(nextMovements);
    setEmployees(nextEmployees);
    setSalaryRecords(nextSalaryRecords);
    setContacts(nextContacts);
    setUsers(nextUsers);
    setTreasuryAccounts(nextTreasury);
    setTreasuryTransactions(nextTransactions);
    setPurchases(nextPurchases);
    setSupplierReturns(nextSupplierReturns);
    setActivityLogs(nextActivityLogs);
    setInterBranchTransfers(nextTransfers);

    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(nextBranches));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(nextSales));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(nextExpenses));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(nextInventory));
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(nextMovements));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(nextEmployees));
    localStorage.setItem(STORAGE_KEYS.SALARY_RECORDS, JSON.stringify(nextSalaryRecords));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(nextContacts));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
    localStorage.setItem(STORAGE_KEYS.TREASURY_ACCOUNTS, JSON.stringify(nextTreasury));
    localStorage.setItem(STORAGE_KEYS.TREASURY_TRANSACTIONS, JSON.stringify(nextTransactions));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(nextPurchases));
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_RETURNS, JSON.stringify(nextSupplierReturns));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(nextActivityLogs));
    localStorage.setItem(STORAGE_KEYS.INTER_BRANCH_TRANSFERS, JSON.stringify(nextTransfers));

    await pushStateToCloud({
      branches: nextBranches,
      users: nextUsers,
      employees: nextEmployees,
      salaryRecords: nextSalaryRecords,
      sales: nextSales,
      expenses: nextExpenses,
      inventory: nextInventory,
      stockMovements: nextMovements,
      contacts: nextContacts,
      purchases: nextPurchases,
      supplierReturns: nextSupplierReturns,
      treasuryAccounts: nextTreasury,
      treasuryTransactions: nextTransactions,
      interBranchTransfers: nextTransfers,
      customPositions: positionsMap,
    }, currentUser?.displayName || 'Offline Restore');

    handleLogActivity({
      module: 'DATABASE',
      action: 'RESTORE',
      title: 'Database Restored from Offline Backup',
      description: `Restored corporate database snapshot (${nextSales.length} Sales, ${nextInventory.length} Stock, ${nextEmployees.length} Staff).`,
    });
  };

  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const handleClearCache = () => {
    try {
      localStorage.removeItem('sktg_selected_month');
    } catch (e) {
      console.warn('Error clearing cache', e);
    }
    setSelectedMonth('2026-09');
    setActiveBranchFilter('ALL');
    setCurrentTab('dashboard');
    setCacheNotice('UI Cache cleared! Dashboard reset to active live transactions.');
    setTimeout(() => {
      setCacheNotice(null);
    }, 4000);
  };

  const handleBrowserRefresh = async () => {
    setCloudSyncStatus('syncing');
    try {
      // 1. Fetch latest authoritative snapshot from Firestore/REST proxy
      const cloudData = await pullAllCloudData();
      if (cloudData) {
        processAndMergeCloudData(cloudData);
        setCacheNotice(`Cloud Database မှ စာရင်းအသစ် (${cloudData.inventory?.length || 0} items) အောင်မြင်စွာ Refresh လုပ်ပြီးပါပြီ။`);
      } else {
        setCacheNotice('Cloud Database နှင့် ချိတ်ဆက်ပြီးပါပြီ။');
      }
      setTimeout(() => setCacheNotice(null), 4000);
    } catch (e) {
      console.warn('Note during live refresh:', e);
    } finally {
      setCloudSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  // Tab-level security enforcement for MD vs Staff vs Yaminnwe vs Admin
  useEffect(() => {
    if (currentUser) {
      const isMD = isMDUser(currentUser);
      const isYamin = isYaminnwe(currentUser);

      // User Security is strictly Managing Director only
      if (currentTab === 'users' && !isMD) {
        setCurrentTab('sales');
        return;
      }

      // Executive Board / P&L Ledger is strictly Managing Director only
      if (currentTab === 'dashboard' && !isMD) {
        setCurrentTab('sales');
        return;
      }

      // Financial Management: non-MD users cannot access P&L subtab
      if (currentTab === 'financial' && financialInitialSubTab === 'pl' && !isMD) {
        setFinancialInitialSubTab('expenses');
      }

      // HR Payroll is strictly MD and Operation (Yamin Nwe) only
      if (currentTab === 'payroll' && !canUserManagePayroll(currentUser)) {
        setCurrentTab('sales');
        return;
      }

      // Admin modules (Branch Management, Users, Activity & Audit Logs, Data Center)
      const adminModules: NavTab[] = ['branches', 'users', 'activity_log', 'data', 'settings'];
      if (adminModules.includes(currentTab) && !canUserViewAdminModules(currentUser)) {
        setCurrentTab('sales');
        return;
      }
    }
  }, [currentUser, currentTab]);

  const lowStockCount = inventory.filter((i) => {
    const qty = activeBranchFilter !== 'ALL' && i.branchStock
      ? (i.branchStock[activeBranchFilter] || 0)
      : i.totalStock;
    return qty <= i.minStockAlert;
  }).length;

  if (session.status === 'signedOut') {
    return <FirebaseLogin initialError={session.error} />;
  }
  if (session.status === 'loading' || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Left Sidebar (Dark Purple Enterprise Theme) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentSubTab={currentSubTab}
        onSelectNav={handleSelectNav}
        currentUser={currentUser}
        onOpenLogin={handleSignOut}
        onSignOut={handleSignOut}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div id="app-main-content" className="flex-1 flex flex-col min-w-0 overflow-hidden w-full print:hidden">
        {/* Top Header */}
        <Topbar
          branches={branches}
          activeBranchFilter={activeBranchFilter}
          setActiveBranchFilter={setActiveBranchFilter}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          currentUser={currentUser}
          lowStockCount={lowStockCount}
          onOpenLowStockAlert={() => {
            setCurrentTab('inventory');
            setInventoryInitialTab('low_stock_fifo');
          }}
          onOpenLogin={handleSignOut}
          onSignOut={handleSignOut}
          cloudSyncStatus={cloudSyncStatus}
          lastSyncedTime={lastSyncedTime}
          onTriggerSync={handleManualSync}
          onDownloadOfflineBackup={handleDownloadFullBackup}
          onClearCache={handleClearCache}
          onBrowserRefresh={handleBrowserRefresh}
          onOpenDataCenter={() => setCurrentTab('data')}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Scrollable Viewport with Mobile Safe Bottom Padding */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Cache Notice Toast/Banner */}
            {cacheNotice && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-emerald-900 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{cacheNotice}</span>
                </div>
                <button
                  onClick={() => setCacheNotice(null)}
                  className="p-1 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quota Notice Banner temporarily commented out for debugging so it doesn't block the UI */}
            {/*
            {cloudSyncStatus === 'quota_exceeded' && !isQuotaNoticeDismissed && (
              <div className="bg-amber-50 border border-amber-300/90 rounded-xl p-4 text-amber-900 shadow-xs flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-amber-950">
                        Firestore Free Tier Daily Quota • Safe Local Mode Active
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[10px]">
                        ✓ Data 100% Secured Locally
                      </span>
                    </div>
                    <p className="text-amber-800 leading-relaxed text-[11px] sm:text-xs">
                      Firebase Free Tier နေ့စဥ် Write Quota ပြည့်သွားသဖြင့် Cloud သို့ ခေတ္တမသိမ်းနိုင်ဖြစ်နေပါသည်။ သင်ထည့်သွင်းထားသော စတော့နှင့် စာရင်းများအားလုံးသည် ဤစက်၏ Browser LocalStorage တွင် ၁၀၀% လုံခြုံစွာသိမ်းဆည်းထားပြီး ဖြစ်ပါသည်။
                    </p>
                    <p className="text-amber-900 font-semibold text-[11px] sm:text-xs">
                      💡 <strong>အခြားစက်သို့ ချက်ချင်း Data ကူးယူလိုပါက:</strong> Inventory စာမျက်နှာရှိ <strong className="text-purple-900 bg-purple-100 px-1 rounded">"Export JSON"</strong> ဖြင့် ဖိုင်ထုတ်ယူပြီး အခြားစက်တွင် <strong className="text-purple-900 bg-purple-100 px-1 rounded">"Import JSON"</strong> နှိပ်၍ ထည့်သွင်းအသုံးပြုနိုင်ပါသည်။
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleManualSync}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="Check if Firestore quota has reset and sync now"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>🔄 Retry Sync / Check Quota</span>
                      </button>
                      <a
                        href="https://console.firebase.google.com/project/gen-lang-client-0740702082/firestore/databases/ai-studio-shwekyaltakhunhr-e89ca48a-0704-4173-a2ae-8e8e441f2ed2/data?openUpgradeDialog=true"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs transition-colors border border-amber-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Firebase Console တွင် Quota တိုးမြှင့်ရန်</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsQuotaNoticeDismissed(true)}
                        className="px-2.5 py-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100/70 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Dismiss Notice
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsQuotaNoticeDismissed(true)}
                    className="p-1.5 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            */}

            {/* MODULE 6: FINANCIAL MANAGEMENT (P&L, EXPENSES, PURCHASES, SUPPLIERS & BENEFITS, RMA CLAIMS, TREASURY) */}
            {(currentTab === 'financial' || currentTab === 'dashboard' || currentTab === 'finance' || currentTab === 'expenses' || currentTab === 'suppliers' || currentTab === 'rma') && (
              <FinancialManagementView
                initialSubTab={
                  currentTab === 'rma' ? 'rma' :
                  currentTab === 'suppliers' ? 'suppliers' :
                  currentTab === 'expenses' ? 'expenses' :
                  currentTab === 'finance' ? 'purchases' :
                  currentTab === 'dashboard' ? 'pl' :
                  financialInitialSubTab
                }
                sales={sales}
                expenses={expenses}
                salaryRecords={salaryRecords}
                purchases={purchases}
                treasuryAccounts={treasuryAccounts}
                treasuryTransactions={treasuryTransactions}
                supplierBenefits={supplierBenefits}
                supplierReturns={supplierReturns}
                interBranchTransfers={interBranchTransfers}
                contacts={contacts}
                inventory={inventory}
                branches={branches}
                employees={employees}
                currentUser={currentUser}
                activeBranchFilter={activeBranchFilter}
                setActiveBranchFilter={setActiveBranchFilter}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onAddPurchase={handleAddPurchase}
                onUpdatePurchase={handleUpdatePurchase}
                onDeletePurchase={handleDeletePurchase}
                onPaySupplierDebt={handlePaySupplierDebt}
                onTransferFunds={handleTransferFunds}
                onAdjustAccountBalance={handleAdjustAccountBalance}
                onAddBranchTransfer={handleAddBranchTransfer}
                onSettleBranchPayment={handleSettleBranchPayment}
                onAddSupplierReturn={handleAddSupplierReturn}
                onSyncPoToInventory={handleSyncPoToInventory}
                onAddContact={handleAddContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onAddSupplierBenefit={handleAddSupplierBenefit}
                onUpdateSupplierBenefit={handleUpdateSupplierBenefit}
                onDeleteSupplierBenefit={handleDeleteSupplierBenefit}
                onSettleSupplierBenefit={handleSettleSupplierBenefit}
                onDeleteSupplierReturn={handleDeleteSupplierReturn}
                onClearAllSupplierReturns={handleClearAllSupplierReturns}
                onSettleRma={handleSettleRma}
                onSettleCustomerDebt={handleSettleCustomerDebt}
                onNavigateToTab={(tab: string, subTab?: string) => {
                  handleSelectNav(tab as any, subTab);
                }}
              />
            )}

            {/* MODULE 4: SALES & SERVICE POS */}
            {currentTab === 'sales' && (
              <DailySalesLedger
                sales={sales}
                branches={branches}
                employees={employees}
                inventory={inventory}
                purchases={purchases}
                users={users}
                currentUser={currentUser}
                activeBranchFilter={activeBranchFilter}
                contacts={contacts}
                supplierReturns={supplierReturns}
                supplierBenefits={supplierBenefits}
                interBranchTransfers={interBranchTransfers}
                onAddSale={handleAddSale}
                onUpdateSale={handleUpdateSale}
                onDeleteSale={handleDeleteSale}
                shifts={shifts}
                activeShift={activeShift}
                onStartShift={handleStartShift}
                onCloseShift={handleCloseShift}
                heldBills={heldBills}
                onSaveHoldBill={handleSaveHoldBill}
                onRemoveHoldBill={handleRemoveHoldBill}
                onCompleteSmartPOSSale={handleCompleteSmartPOSSale}
                onUpdateBranch={handleUpdateBranch}
              />
            )}

            {/* MODULE 5: STANDALONE CUSTOMER MANAGEMENT (CUSTOMERS & CREDIT DEBT) */}
            {(currentTab === 'customers' || currentTab === 'contacts') && (
              <ContactPartners
                partners={contacts}
                sales={sales}
                purchases={purchases}
                branches={branches}
                currentUser={currentUser}
                treasuryAccounts={treasuryAccounts}
                onAddPartner={handleAddContact}
                onUpdatePartner={handleUpdateContact}
                onDeletePartner={handleDeleteContact}
                onSettleCustomerDebt={handleSettleCustomerDebt}
              />
            )}

            {/* TAB 3: STOCK INVENTORY */}
            {currentTab === 'inventory' && (
              <InventoryManagement
                inventory={inventory}
                branches={branches}
                movements={stockMovements}
                purchases={purchases}
                transfers={interBranchTransfers}
                treasuryAccounts={treasuryAccounts}
                suppliers={contacts}
                supplierBenefits={supplierBenefits}
                supplierReturns={supplierReturns}
                currentUser={currentUser}
                activeBranchFilter={activeBranchFilter}
                initialTab={inventoryInitialTab}
                onBulkReplaceInventory={async (newInv) => {
                  setInventory(newInv);
                  const nowIso = new Date().toISOString();
                  saveToLocalStorage({ inventory: newInv, updatedAt: nowIso });
                  await pushStateToCloud(
                    {
                      branches,
                      users,
                      employees,
                      salaryRecords,
                      sales,
                      expenses,
                      inventory: newInv,
                      stockMovements,
                      contacts,
                      purchases,
                      supplierReturns,
                      supplierBenefits,
                      treasuryAccounts,
                      treasuryTransactions,
                      interBranchTransfers,
                      customPositions: positionsMap,
                    },
                    currentUser?.displayName || 'Bulk Replace Inventory',
                    true
                  );
                }}
                onClearAllStock={handleClearAllStock}
                onNavigateToPurchases={() => handleSelectNav('financial', 'purchases')}
                onNavigateToBranchTransfer={() => setInventoryInitialTab('branch_transfer')}
                onAddTransfer={handleAddBranchTransfer}
                onSettlePayment={handleSettleBranchPayment}
                onAddItem={handleAddInventoryItem}
                onUpdateItem={handleUpdateInventoryItem}
                onDeleteItem={handleDeleteInventoryItem}
                onAddSupplierReturn={handleAddSupplierReturn}
                onDeleteSupplierReturn={handleDeleteSupplierReturn}
                onClearAllSupplierReturns={handleClearAllSupplierReturns}
                onSettleRma={handleSettleRma}
                onAddSupplier={handleAddContact}
                onUpdateSupplier={handleUpdateContact}
                onDeleteSupplier={handleDeleteContact}
                onAddSupplierBenefit={handleAddSupplierBenefit}
                onUpdateSupplierBenefit={handleUpdateSupplierBenefit}
                onDeleteSupplierBenefit={handleDeleteSupplierBenefit}
                onSettleSupplierBenefit={handleSettleSupplierBenefit}
                onPayPurchaseDebt={handlePaySupplierDebt}
                onLogActivity={handleLogActivity}
                onRecordMovement={(movement) => {
                  setStockMovements((prev) => [movement, ...prev]);
                  if (movement.type === 'STOCK_IN') {
                    handleStockIn(movement);
                  } else if (movement.type === 'TRANSFER') {
                    handleStockTransfer(movement);
                  } else if (movement.type === 'STOCK_OUT' && movement.fromBranchId) {
                    setInventory((prev) =>
                      prev.map((item) => {
                        if (item.id === movement.itemId) {
                          return deductStockForSale(item, movement.fromBranchId!, movement.quantity);
                        }
                        return item;
                      })
                    );
                  }
                }}
              />
            )}

            {/* CORE MODULE 2: CONSOLIDATED HR MANAGEMENT (DIRECTORY, PAYROLL & PERFORMANCE) */}
            {(currentTab === 'hr' || currentTab === 'team' || currentTab === 'payroll') && (
              <HRManagementView
                initialSubTab={hrInitialSubTab}
                employees={employees}
                branches={branches}
                sales={sales}
                salaryRecords={salaryRecords}
                users={users}
                currentUser={currentUser}
                activeBranchFilter={activeBranchFilter}
                onBranchFilterChange={setActiveBranchFilter}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                positionsMap={positionsMap}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onCalculateForEmployee={handleCalculateSalaryForEmp}
                onOpenPayslip={handleOpenPayslip}
                onOpenBatchPayslips={() => setIsBatchPayslipsOpen(true)}
                onOpenBatchBonusSlips={() => {
                  setIsBonusBatchPrintMode(true);
                  setIsPerformanceBonusOpen(true);
                }}
                onOpenPerformanceBonus={() => {
                  setIsBonusBatchPrintMode(false);
                  setIsPerformanceBonusOpen(true);
                }}
                onOpenBasicPayMaster={() => setIsBasicPayMasterOpen(true)}
                onEditSalaryRecord={handleEditSalaryRecord}
                onDeleteSalaryRecord={handleDeleteSalaryRecord}
                onTogglePaymentStatus={handleTogglePaymentStatus}
                onOpenCalculator={() => {
                  setEditingRecord(null);
                  setCalculatorTargetEmpId(undefined);
                  setIsCalculatorOpen(true);
                }}
                onBatchCalculateStandard={handleBatchCalculateStandard}
              />
            )}

            {/* TAB 8: BRANCHES */}
            {currentTab === 'branches' && (
              <BranchManagement
                branches={branches}
                employees={employees}
                sales={sales}
                expenses={expenses}
                currentUser={currentUser}
                onSelectBranch={(branchId) => {
                  setActiveBranchFilter(branchId);
                  setCurrentTab('sales');
                }}
                onAddBranch={handleAddBranch}
                onUpdateBranch={handleUpdateBranch}
                onDeleteBranch={handleDeleteBranch}
                onDeleteAllBranches={handleDeleteAllBranches}
              />
            )}

            {/* ADMINISTRATION MODULE: USER MANAGEMENT */}
            {currentTab === 'users' && (
              <UserManagement
                users={users}
                branches={branches}
                employees={employees}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onSwitchUser={handleSwitchUser}
                onUpdateEmployee={handleUpdateEmployee}
              />
            )}

            {/* ADMINISTRATION MODULE: SYSTEM SETTINGS */}
            {currentTab === 'settings' && (
              <SystemSettingsView
                branches={branches}
                currentUser={currentUser}
                onUpdateBranch={handleUpdateBranch}
              />
            )}

            {/* ADMINISTRATION MODULE: ACTIVITY & AUDIT LOG */}
            {currentTab === 'activity_log' && (
              <ActivityLogView
                logs={activityLogs}
                branches={branches}
                users={users}
                currentUser={currentUser}
                onClearLogs={() => {
                  if (confirm('Are you sure you want to clear the local activity audit history?')) {
                    setActivityLogs([]);
                    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify([]));
                  }
                }}
              />
            )}

            {/* ADMINISTRATION MODULE: DATA MANAGEMENT */}
            {currentTab === 'data' && (
              <DataBackupCenter
                branches={branches}
                sales={sales}
                expenses={expenses}
                inventory={inventory}
                stockMovements={stockMovements}
                employees={employees}
                salaryRecords={salaryRecords}
                contacts={contacts}
                users={users}
                treasuryAccounts={treasuryAccounts}
                treasuryTransactions={treasuryTransactions}
                purchases={purchases}
                supplierReturns={supplierReturns}
                supplierBenefits={supplierBenefits}
                activityLogs={activityLogs}
                interBranchTransfers={interBranchTransfers}
                customPositions={positionsMap}
                currentUser={currentUser}
                cloudSyncStatus={cloudSyncStatus}
                onRestoreBackup={handleRestoreBackup}
                onResetOperationsToZero={handleResetOperationalDataToZero}
                onForceSyncLocalToCloud={handleForceSyncLocalToCloud}
              />
            )}
          </div>
        </main>
      </div>

      {/* MODALS */}
      <PayrollCalculatorModal
        key={`payroll-calc-${editingRecord?.id || calculatorTargetEmpId || 'new'}-${isCalculatorOpen ? 'open' : 'closed'}`}
        isOpen={isCalculatorOpen}
        onClose={() => {
          setIsCalculatorOpen(false);
          setEditingRecord(null);
          setCalculatorTargetEmpId(undefined);
        }}
        employees={employees}
        existingRecord={editingRecord}
        onSaveRecord={handleSaveSalaryRecord}
        onDeleteRecord={handleDeleteSalaryRecord}
        currentUser={currentUser}
        selectedMonth={selectedMonth}
        sales={sales}
        expenses={expenses}
        branches={branches}
        salaryRecords={salaryRecords}
        initialEmployeeId={calculatorTargetEmpId}
        onUpdateEmployeeBaseSalary={handleUpdateEmployeeBaseSalary}
      />

      <StaffBasicPayModal
        isOpen={isBasicPayMasterOpen}
        onClose={() => setIsBasicPayMasterOpen(false)}
        employees={employees}
        branches={branches}
        onUpdateEmployee={handleUpdateEmployee}
        onOpenCalculatorForEmp={(emp) => {
          handleCalculateSalaryForEmp(emp);
        }}
        activeBranchFilter={activeBranchFilter}
      />

      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => {
          setIsPayslipOpen(false);
          setSelectedPayslipRecord(null);
        }}
        record={selectedPayslipRecord}
        currentUser={currentUser}
        onDeleteRecord={handleDeleteSalaryRecord}
        employees={employees || []}
      />

      <BatchPayslipsModal
        isOpen={isBatchPayslipsOpen}
        onClose={() => setIsBatchPayslipsOpen(false)}
        salaryRecords={(salaryRecords || []).filter(Boolean).map((r) => ({
          ...r,
          month: (!r?.month || r?.month === 'ALL') ? (selectedMonth !== 'ALL' ? selectedMonth : '2026-09') : r?.month,
        }))}
        branches={branches || []}
        selectedMonth={selectedMonth !== 'ALL' ? selectedMonth : '2026-09'}
        employees={employees || []}
      />

      <PerformanceBonusManagerModal
        isOpen={isPerformanceBonusOpen}
        onClose={() => {
          setIsPerformanceBonusOpen(false);
          setIsBonusBatchPrintMode(false);
        }}
        initialBatchPrint={isBonusBatchPrintMode}
        employees={employees}
        branches={branches}
        sales={sales}
        expenses={expenses}
        salaryRecords={salaryRecords}
        users={users}
        currentUser={currentUser}
        onSyncBonusToPayroll={(updated) => setSalaryRecords(updated)}
        onDeleteSalaryRecord={handleDeleteSalaryRecord}
        selectedMonth={selectedMonth}
      />

      {deleteConfirmState && (
        <ConfirmDeleteModal
          isOpen={deleteConfirmState.isOpen}
          onClose={() => setDeleteConfirmState(null)}
          onConfirm={deleteConfirmState.onConfirm}
          title={deleteConfirmState.title}
          description={deleteConfirmState.description}
          itemName={deleteConfirmState.itemName}
          confirmText={deleteConfirmState.confirmText}
        />
      )}


      {/* Mobile Bottom Navigation Bar (Phones & Tablets) */}
      {currentUser && (
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            handleSelectNav(tab);
            setIsMobileSidebarOpen(false);
          }}
          onToggleMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          isMenuOpen={isMobileSidebarOpen}
          currentUser={currentUser}
        />
      )}

      {/* PWA Offline Mode Floating Indicator */}
      <OfflineIndicator />
      <CloudSyncNotice
        currentUser={currentUser}
        getPayload={() => ({
          ...(livePayloadRef.current as any),
          users: [],
        })}
      />
    </div>
  );
}