import React, { useState, useRef, useMemo } from 'react';
import { 
  SlidersHorizontal,
  Calendar,
  FileText,
  FileCode2,
  FileSpreadsheet,
  CheckCircle2,
  Check,
  Circle,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  Trash2,
  CheckSquare,
  Server,
  X,
  ShieldAlert,
  Building2,
  Wrench,
  Receipt,
  Package,
  ArrowRightLeft,
  Truck,
  Users2,
  Contact,
  CreditCard,
  ShoppingBag,
  Coins,
  Gift,
  RotateCcw,
  Landmark,
  UserCheck,
  Calculator,
  ShieldCheck,
  History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Branch, 
  DailySale, 
  DailyExpense, 
  InventoryItem, 
  StockMovement, 
  Employee, 
  SalaryRecord, 
  ContactPartner, 
  UserAccount,
  isMDUser
} from '../types';

interface DataBackupCenterProps {
  branches: Branch[];
  sales: DailySale[];
  expenses: DailyExpense[];
  inventory: InventoryItem[];
  movements?: StockMovement[];
  stockMovements?: StockMovement[];
  employees: Employee[];
  salaryRecords: SalaryRecord[];
  contacts?: ContactPartner[];
  users: UserAccount[];
  treasuryAccounts?: any[];
  treasuryTransactions?: any[];
  purchases?: any[];
  supplierReturns?: any[];
  supplierBenefits?: any[];
  activityLogs?: any[];
  interBranchTransfers?: any[];
  customPositions?: any;
  currentUser: UserAccount;
  cloudSyncStatus?: string;
  onRestoreBackup?: (restoredData: any) => void;
  onResetOperationsToZero?: () => void;
  onForceSyncLocalToCloud?: () => void;
}

type ExportFormat = 'json' | 'excel' | 'csv';

export interface SktgCollectionDef {
  id: string;
  label: string;
  burmeseLabel: string;
  category: 'Sales & POS' | 'Inventory' | 'Financial' | 'HR & Staff' | 'Administration';
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * 18 Official Shwe Kyal Tagon Data Collections matching the actual system modules.
 */
export const SKTG_COLLECTIONS: SktgCollectionDef[] = [
  // 1. Sales & POS
  {
    id: 'daily_sales',
    label: 'Daily Sales',
    burmeseLabel: 'နေ့စဉ် အရောင်းဘောက်ချာများ',
    category: 'Sales & POS',
    icon: Receipt,
  },
  {
    id: 'service_jobs',
    label: 'Service Jobs',
    burmeseLabel: 'ပြင်ဆင်မှု ဝန်ဆောင်မှု ဘောက်ချာများ',
    category: 'Sales & POS',
    icon: Wrench,
  },
  {
    id: 'customer_debt',
    label: 'Customer Debts',
    burmeseLabel: 'ဖောက်သည် အကြွေးစာရင်းများ',
    category: 'Sales & POS',
    icon: Coins,
  },

  // 2. Inventory & Stock
  {
    id: 'branch_inventory',
    label: 'Branch Inventory',
    burmeseLabel: 'ဆိုင်ခွဲ ကုန်ပစ္စည်းစတော့ စာရင်း',
    category: 'Inventory',
    icon: Package,
  },
  {
    id: 'inventory_movements',
    label: 'Inventory Movements',
    burmeseLabel: 'စတော့ အဝင်/အထွက် မှတ်တမ်း',
    category: 'Inventory',
    icon: ArrowRightLeft,
  },
  {
    id: 'inter_branch_transfers',
    label: 'Inter-Branch Transfers',
    burmeseLabel: 'ဆိုင်ခွဲကြား စတော့လွှဲပြောင်းမှုများ',
    category: 'Inventory',
    icon: Truck,
  },
  {
    id: 'rma_returns',
    label: 'RMA Defect Returns',
    burmeseLabel: 'RMA ချို့ယွင်းချက် ပြန်ပို့စာရင်း',
    category: 'Inventory',
    icon: RotateCcw,
  },

  // 3. Financial Management
  {
    id: 'expenses',
    label: 'Operating Expenses',
    burmeseLabel: 'နေ့စဉ် အသုံးစရိတ် စာရင်း',
    category: 'Financial',
    icon: CreditCard,
  },
  {
    id: 'purchases',
    label: 'Purchases & Payables',
    burmeseLabel: 'ကုန်ဝယ်ယူမှုနှင့် ပေးရန်ကျန် စာရင်း',
    category: 'Financial',
    icon: ShoppingBag,
  },
  {
    id: 'supplier_claims',
    label: 'Supplier Claims',
    burmeseLabel: 'Supplier Incentive ရရန်ရှိ စာရင်း',
    category: 'Financial',
    icon: Gift,
  },
  {
    id: 'treasury_accounts',
    label: 'Treasury & Accounts',
    burmeseLabel: 'ငွေတိုက်နှင့် ဘဏ်စာရင်းများ',
    category: 'Financial',
    icon: Landmark,
  },

  // 4. Contacts & Partners
  {
    id: 'customers',
    label: 'Customers Directory',
    burmeseLabel: 'ဖောက်သည် Customer စာရင်း',
    category: 'Sales & POS',
    icon: Users2,
  },
  {
    id: 'suppliers',
    label: 'Suppliers Directory',
    burmeseLabel: 'ကုန်သွင်းသူ Supplier စာရင်း',
    category: 'Financial',
    icon: Contact,
  },

  // 5. HR & Payroll
  {
    id: 'staff_roster',
    label: 'Staff Roster',
    burmeseLabel: 'ကုမ္ပဏီ ဝန်ထမ်းစာရင်း (၃၁ ဦး)',
    category: 'HR & Staff',
    icon: UserCheck,
  },
  {
    id: 'salary_records',
    label: 'Payroll & Salary Slips',
    burmeseLabel: 'လစာနှင့် ထောက်ပံ့ကြေး စာရင်း',
    category: 'HR & Staff',
    icon: Calculator,
  },

  // 6. Administration & Security
  {
    id: 'branches_overview',
    label: 'Branches Overview',
    burmeseLabel: 'ဆိုင်ခွဲကွန်ရက် စာရင်း (၄ ခု)',
    category: 'Administration',
    icon: Building2,
  },
  {
    id: 'user_accounts',
    label: 'User Accounts',
    burmeseLabel: 'စနစ် အသုံးပြုသူ အကောင့်များ',
    category: 'Administration',
    icon: ShieldCheck,
  },
  {
    id: 'activity_logs',
    label: 'Activity & Audit Logs',
    burmeseLabel: 'လုပ်ဆောင်ချက် မှတ်တမ်းများ',
    category: 'Administration',
    icon: History,
  },
];

export const DataBackupCenter: React.FC<DataBackupCenterProps> = ({
  branches,
  sales,
  expenses,
  inventory,
  movements = [],
  stockMovements = [],
  employees,
  salaryRecords,
  contacts = [],
  users,
  treasuryAccounts = [],
  purchases = [],
  supplierReturns = [],
  supplierBenefits = [],
  activityLogs = [],
  interBranchTransfers = [],
  currentUser,
  onRestoreBackup,
  onResetOperationsToZero,
}) => {
  // 1. Export State
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>('ALL_TIME');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    SKTG_COLLECTIONS.map((c) => c.id)
  );
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // 2. Restore Point State
  const [restoreBranchScope, setRestoreBranchScope] = useState<string>('ALL');
  const [restoreTimeScope, setRestoreTimeScope] = useState<string>('ALL_TIME');
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // 3. Offline Sync State
  const syncFileInputRef = useRef<HTMLInputElement>(null);

  // 4. System Data Reset State
  const [resetYear, setResetYear] = useState<string>('2026-27');
  const [resetYearMode, setResetYearMode] = useState<'FISCAL' | 'CALENDAR'>('FISCAL');
  const [resetScope, setResetScope] = useState<string>('ENTIRE_YEAR');
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetError, setResetError] = useState('');

  // 5. Feedback Notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const isMD = isMDUser(currentUser);
  const allMovements = stockMovements.length > 0 ? stockMovements : movements;

  // Real-time record counts for each collection
  const collectionCounts = useMemo(() => {
    const customerDebts = sales.filter(
      (s) =>
        (s.paymentStatus === 'CREDIT' || s.paymentStatus === 'PARTIAL') &&
        (s.salePrice || 0) - (s.paidAmount || 0) > 0
    );
    const serviceSales = sales.filter(
      (s) => s.saleType === 'SERVICE' || !!(s as any).serviceItem
    );
    const retailSales = sales.filter((s) => s.saleType !== 'SERVICE');
    const customerContacts = contacts.filter((c) => c.type.includes('Customer'));
    const supplierContacts = contacts.filter((c) => c.type === 'Supplier');

    return {
      branches_overview: branches.length,
      daily_sales: retailSales.length,
      service_jobs: serviceSales.length,
      customer_debt: customerDebts.length,
      branch_inventory: inventory.length,
      inventory_movements: allMovements.length,
      inter_branch_transfers: interBranchTransfers.length,
      rma_returns: supplierReturns.length,
      expenses: expenses.length,
      purchases: purchases.length,
      supplier_claims: supplierBenefits.length,
      treasury_accounts: treasuryAccounts.length,
      customers: customerContacts.length,
      suppliers: supplierContacts.length,
      staff_roster: employees.length,
      salary_records: salaryRecords.length,
      user_accounts: users.length,
      activity_logs: activityLogs.length,
    } as Record<string, number>;
  }, [
    branches,
    sales,
    inventory,
    allMovements,
    interBranchTransfers,
    supplierReturns,
    expenses,
    purchases,
    supplierBenefits,
    treasuryAccounts,
    contacts,
    employees,
    salaryRecords,
    users,
    activityLogs,
  ]);

  // Toggle selection of all collections
  const areAllSelected = selectedCollections.length === SKTG_COLLECTIONS.length;
  const toggleSelectAll = () => {
    if (areAllSelected) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(SKTG_COLLECTIONS.map((c) => c.id));
    }
  };

  const toggleCollection = (id: string) => {
    setSelectedCollections((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter collections shown based on quick category tab
  const displayedCollections = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return SKTG_COLLECTIONS;
    return SKTG_COLLECTIONS.filter((c) => c.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  // Helper to filter data by branch and time
  const getFilteredData = useMemo(() => {
    return () => {
      let filteredSales = [...sales];
      let filteredExpenses = [...expenses];
      let filteredInventory = [...inventory];
      let filteredEmployees = [...employees];
      let filteredMovements = [...allMovements];
      let filteredPurchases = [...purchases];
      let filteredSalary = [...salaryRecords];
      let filteredTransfers = [...interBranchTransfers];

      // Branch filter
      if (selectedBranchFilter !== 'ALL') {
        filteredSales = filteredSales.filter((s) => s.branchId === selectedBranchFilter);
        filteredExpenses = filteredExpenses.filter((e) => e.branchId === selectedBranchFilter);
        filteredEmployees = filteredEmployees.filter((e) => e.branchId === selectedBranchFilter);
        filteredSalary = filteredSalary.filter((sr) => sr.branchId === selectedBranchFilter);
        filteredMovements = filteredMovements.filter(
          (m) => m.fromBranchId === selectedBranchFilter || m.toBranchId === selectedBranchFilter
        );
        filteredTransfers = filteredTransfers.filter(
          (t) => t.fromBranchId === selectedBranchFilter || t.toBranchId === selectedBranchFilter
        );
        filteredInventory = filteredInventory.filter((i) => {
          if (!i.branchStock) return true;
          return (i.branchStock[selectedBranchFilter] || 0) > 0;
        });
      }

      // Time filter
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      if (selectedTimeFilter === 'THIS_MONTH') {
        const ymPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        filteredSales = filteredSales.filter((s) => (s.date || '').startsWith(ymPrefix));
        filteredExpenses = filteredExpenses.filter((e) => (e.date || '').startsWith(ymPrefix));
        filteredSalary = filteredSalary.filter((sr) => (sr.month || '').startsWith(ymPrefix));
      } else if (selectedTimeFilter === 'LAST_MONTH') {
        const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
        const ymPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
        filteredSales = filteredSales.filter((s) => (s.date || '').startsWith(ymPrefix));
        filteredExpenses = filteredExpenses.filter((e) => (e.date || '').startsWith(ymPrefix));
        filteredSalary = filteredSalary.filter((sr) => (sr.month || '').startsWith(ymPrefix));
      } else if (selectedTimeFilter === 'FY_2026_27') {
        filteredSales = filteredSales.filter(
          (s) => s.date && s.date >= '2026-04-01' && s.date <= '2027-03-31'
        );
        filteredExpenses = filteredExpenses.filter(
          (e) => e.date && e.date >= '2026-04-01' && e.date <= '2027-03-31'
        );
      } else if (selectedTimeFilter === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
        filteredSales = filteredSales.filter((s) => (s.date || '') >= cutoff);
        filteredExpenses = filteredExpenses.filter((e) => (e.date || '') >= cutoff);
      }

      return {
        filteredSales,
        filteredExpenses,
        filteredInventory,
        filteredEmployees,
        filteredMovements,
        filteredPurchases,
        filteredSalary,
        filteredTransfers,
      };
    };
  }, [
    sales,
    expenses,
    inventory,
    employees,
    allMovements,
    purchases,
    salaryRecords,
    interBranchTransfers,
    selectedBranchFilter,
    selectedTimeFilter,
  ]);

  // Execute export based on chosen format and collections
  const handleDownloadBackup = () => {
    if (selectedCollections.length === 0) {
      showNotification('error', 'Please select at least one data collection to export.');
      return;
    }

    const {
      filteredSales,
      filteredExpenses,
      filteredInventory,
      filteredEmployees,
      filteredMovements,
      filteredPurchases,
      filteredSalary,
      filteredTransfers,
    } = getFilteredData();

    const dateStr = new Date().toISOString().split('T')[0];
    const branchLabel = selectedBranchFilter === 'ALL' ? 'All_Branches' : selectedBranchFilter;

    // Compile the selected datasets with clean, formatted fields
    const exportBundle: Record<string, any[]> = {};

    if (selectedCollections.includes('branches_overview')) {
      exportBundle['Branches'] = branches.map((b) => ({
        'Branch Code': b.code || b.id,
        'Branch Name': b.name,
        City: b.city,
        Address: b.address,
        Phone: b.phone,
        'Mobile Target': b.mobileTarget || 0,
        'Laptop Target': b.laptopTarget || 0,
      }));
    }

    if (selectedCollections.includes('daily_sales')) {
      exportBundle['Daily Sales'] = filteredSales
        .filter((s) => s.saleType !== 'SERVICE')
        .map((s) => ({
          'Voucher No': s.id,
          Date: s.date,
          'Branch Name': s.branchName || '',
          'Customer Name': s.customerName || 'Walk-in Customer',
          'Customer Phone': s.customerPhone || '',
          'Sale Price (MMK)': s.salePrice || 0,
          'Discount (MMK)': s.discount || 0,
          'Net Paid (MMK)': s.paidAmount || 0,
          'Payment Method': s.paymentMethod || 'CASH',
          'Payment Status': s.paymentStatus || 'PAID',
          Cashier: s.cashierName || '',
        }));
    }

    if (selectedCollections.includes('service_jobs')) {
      exportBundle['Service Jobs'] = filteredSales
        .filter((s) => s.saleType === 'SERVICE' || !!(s as any).serviceItem)
        .map((s) => ({
          'Service Voucher': s.id,
          Date: s.date,
          'Branch Name': s.branchName || '',
          Customer: s.customerName || '',
          Phone: s.customerPhone || '',
          'Device / Item': (s as any).serviceItem || 'Device Repair',
          'Service Details': (s as any).serviceDetails || '',
          'Total Charges (MMK)': s.salePrice || 0,
          'Paid Amount (MMK)': s.paidAmount || 0,
          Status: s.paymentStatus || 'PAID',
        }));
    }

    if (selectedCollections.includes('customer_debt')) {
      exportBundle['Customer Debts'] = filteredSales
        .filter(
          (s) =>
            (s.paymentStatus === 'CREDIT' || s.paymentStatus === 'PARTIAL') &&
            (s.salePrice || 0) - (s.paidAmount || 0) > 0
        )
        .map((s) => ({
          'Voucher No': s.id,
          Date: s.date,
          Customer: s.customerName || 'Unknown',
          Phone: s.customerPhone || '',
          'Total Bill (MMK)': s.salePrice || 0,
          'Paid So Far (MMK)': s.paidAmount || 0,
          'Remaining Debt (MMK)': (s.salePrice || 0) - (s.paidAmount || 0),
          'Branch Name': s.branchName || '',
          Due: (s as any).dueDate || 'Pending',
        }));
    }

    if (selectedCollections.includes('branch_inventory')) {
      exportBundle['Branch Inventory'] = filteredInventory.map((i) => ({
        SKU: i.sku,
        Barcode: (i as any).barcode || i.sku,
        'Product Name': i.name,
        Brand: i.brand,
        Category: i.category,
        'Cost Price (MMK)': i.costPrice || 0,
        'Sale Price (MMK)': i.sellingPrice || 0,
        'Total Physical Stock': i.totalStock || 0,
        'Min Alert Level': i.minStockAlert || 5,
      }));
    }

    if (selectedCollections.includes('inventory_movements')) {
      exportBundle['Stock Movements'] = filteredMovements.map((m) => ({
        Date: m.date,
        'Item SKU': m.sku || '',
        'Product Name': m.itemName,
        Type: m.type,
        Quantity: m.quantity,
        'Source Branch': m.fromBranchName || m.fromBranchId || '',
        'Destination Branch': m.toBranchName || m.toBranchId || '',
        Reason: m.notes || m.type || '',
        'Operator / User': m.performedBy || '',
      }));
    }

    if (selectedCollections.includes('inter_branch_transfers')) {
      exportBundle['Branch Transfers'] = filteredTransfers.map((t) => ({
        Date: t.date || '',
        'Transfer Ref': t.transferNo || t.id,
        Product: t.itemName || '',
        SKU: t.sku || '',
        Quantity: t.quantity || 1,
        'From Branch': t.fromBranchName || '',
        'To Branch': t.toBranchName || '',
        Status: t.status || 'COMPLETED',
        'Initiated By': t.initiatedBy || '',
      }));
    }

    if (selectedCollections.includes('rma_returns')) {
      exportBundle['RMA Returns'] = supplierReturns.map((r) => ({
        Date: r.date || '',
        'Return No': r.returnNo || r.id,
        Supplier: r.supplierName || '',
        Product: r.itemName || '',
        'Defect Reason': r.defectReason || '',
        Quantity: r.quantity || 1,
        Status: r.claimStatus || 'PENDING',
      }));
    }

    if (selectedCollections.includes('expenses')) {
      exportBundle['Daily Expenses'] = filteredExpenses.map((e) => ({
        'Expense ID': e.id,
        Date: e.date,
        'Expense Category': e.category,
        Title: e.title,
        'Amount (MMK)': e.amount || 0,
        'Branch Name': e.branchName || '',
        'Payment Method': e.paymentMethod || 'Cash',
        Notes: e.notes || '',
        'Recorded By': e.recordedBy || '',
      }));
    }

    if (selectedCollections.includes('purchases')) {
      exportBundle['Purchases & Payables'] = filteredPurchases.map((p) => ({
        'PO Number': p.poNumber || p.id,
        Date: p.date,
        Supplier: p.supplierName || '',
        'Total Amount (MMK)': p.totalAmount || 0,
        'Paid Amount (MMK)': p.paidAmount || 0,
        'Remaining Debt (MMK)': p.remainingDebt || 0,
        Status: p.status || 'PAID',
      }));
    }

    if (selectedCollections.includes('supplier_claims')) {
      exportBundle['Supplier Claims'] = supplierBenefits.map((b) => ({
        Date: b.date || '',
        Supplier: b.supplierName || '',
        'Incentive Title': b.title || '',
        'Target Units': b.targetUnits || 0,
        'Achieved Units': b.achievedUnits || 0,
        'Claim Amount (MMK)': b.claimAmount || 0,
        Status: b.status || 'PENDING',
      }));
    }

    if (selectedCollections.includes('treasury_accounts')) {
      exportBundle['Treasury Accounts'] = treasuryAccounts.map((a) => ({
        'Account Name': a.accountName || a.name,
        'Account Type': a.accountType || a.type,
        Bank: a.bankName || 'Cash Vault',
        'Account No': a.accountNumber || '',
        'Current Balance (MMK)': a.currentBalance || 0,
      }));
    }

    if (selectedCollections.includes('customers')) {
      exportBundle['Customers'] = contacts
        .filter((c) => c.type.includes('Customer'))
        .map((c) => ({
          'Customer Name': c.name,
          Phone: c.phone || '',
          Type: c.type,
          Address: c.address || '',
          'Transactions Count': c.totalTransactions || 0,
        }));
    }

    if (selectedCollections.includes('suppliers')) {
      exportBundle['Suppliers'] = contacts
        .filter((c) => c.type === 'Supplier')
        .map((c) => ({
          'Supplier Name': c.name,
          Phone: c.phone || '',
          Company: c.company || c.name,
          Address: c.address || '',
          'Balance Due (MMK)': c.balanceDue || 0,
        }));
    }

    if (selectedCollections.includes('staff_roster')) {
      exportBundle['Staff Roster'] = filteredEmployees.map((emp) => ({
        'Employee Code': emp.code,
        Name: emp.name,
        Department: emp.department,
        Position: emp.position,
        'Assigned Branch': emp.branchName,
        Phone: emp.phone || '',
        'Joined Date': emp.joinedDate || '',
        Tenure: emp.tenure || '',
        Status: emp.status || 'active',
      }));
    }

    if (selectedCollections.includes('salary_records')) {
      exportBundle['Payroll & Salary'] = filteredSalary.map((sr) => ({
        'Salary Record ID': sr.id,
        Month: sr.month,
        'Employee Code': sr.employeeCode || '',
        Name: sr.employeeName || '',
        Department: sr.department || '',
        Branch: sr.branchName || '',
        'Basic Salary (MMK)': sr.basicSalary || 0,
        'Attendance Bonus (MMK)': sr.attendanceBonus || 0,
        'Sales Commission (MMK)': sr.salesCommission || 0,
        'Net Salary Paid (MMK)': sr.netSalary || 0,
        'Payment Status': sr.paymentStatus || 'PAID',
      }));
    }

    if (selectedCollections.includes('user_accounts')) {
      exportBundle['User Accounts'] = users.map((u) => ({
        Username: u.username,
        'Display Name': u.displayName,
        Role: u.role,
        Title: u.title,
        'Assigned Branch': u.branchName,
        Status: u.status,
      }));
    }

    if (selectedCollections.includes('activity_logs')) {
      exportBundle['Activity Logs'] = activityLogs.map((log) => ({
        Timestamp: log.timestamp || '',
        User: log.userName || '',
        Module: log.module || '',
        Action: log.action || '',
        Title: log.title || '',
        Description: log.description || '',
      }));
    }

    // Execute Download based on format
    if (exportFormat === 'json') {
      const payload = {
        enterprise: 'Shwe Kyal Tagon Co., Ltd.',
        managingDirector: 'Daw Su Myat Win',
        systemVersion: 'SKTG Enterprise ERP v3.2',
        exportedAt: new Date().toISOString(),
        exportScope: {
          branch: selectedBranchFilter,
          timeFilter: selectedTimeFilter,
          collectionCount: selectedCollections.length,
        },
        data: {
          branches: branches,
          sales: filteredSales,
          expenses: filteredExpenses,
          inventory: filteredInventory,
          stockMovements: filteredMovements,
          interBranchTransfers: filteredTransfers,
          employees: filteredEmployees,
          salaryRecords: filteredSalary,
          contacts: contacts,
          users: users.map((u) => ({ ...u, password: '***' })),
          treasuryAccounts,
          purchases: filteredPurchases,
          supplierReturns,
          supplierBenefits,
          activityLogs,
        },
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SKTG_System_Backup_${branchLabel}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification(
        'success',
        `JSON System Backup successfully generated (${selectedCollections.length} collections).`
      );
    } else if (exportFormat === 'excel') {
      const wb = XLSX.utils.book_new();

      Object.entries(exportBundle).forEach(([sheetName, data]) => {
        if (Array.isArray(data) && data.length > 0) {
          const cleanSheetName = sheetName.substring(0, 31).replace(/[\\/?*[\]]/g, '');
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
        }
      });

      if (wb.SheetNames.length === 0) {
        const emptyWs = XLSX.utils.aoa_to_sheet([['No data found in selected collections']]);
        XLSX.utils.book_append_sheet(wb, emptyWs, 'Empty_Report');
      }

      XLSX.writeFile(wb, `SKTG_ERP_Report_${branchLabel}_${dateStr}.xlsx`);
      showNotification(
        'success',
        `Excel Report workbook successfully generated with ${wb.SheetNames.length} sheet(s).`
      );
    } else if (exportFormat === 'csv') {
      const primaryKey =
        Object.keys(exportBundle).find(
          (k) => Array.isArray(exportBundle[k]) && exportBundle[k].length > 0
        ) || 'Daily Sales';
      const rawData = exportBundle[primaryKey] || [];

      const ws = XLSX.utils.json_to_sheet(rawData);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SKTG_${primaryKey.replace(/\s+/g, '_')}_Raw_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('success', `CSV Raw Export generated for ${primaryKey}.`);
    }
  };

  // Card 1: Restore Point Execution
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const data = parsed.data || parsed;

        if (
          !data ||
          (!Array.isArray(data.sales) &&
            !Array.isArray(data.inventory) &&
            !Array.isArray(data.employees))
        ) {
          showNotification(
            'error',
            'Invalid JSON backup file schema. Please select a valid SKTG Database Backup file.'
          );
          return;
        }

        let restoredData = { ...data };

        // Scope filter: If a specific branch is selected for restore
        if (restoreBranchScope !== 'ALL') {
          if (Array.isArray(data.sales)) {
            restoredData.sales = [
              ...sales.filter((s) => s.branchId !== restoreBranchScope),
              ...data.sales.filter((s: DailySale) => s.branchId === restoreBranchScope),
            ];
          }
          if (Array.isArray(data.expenses)) {
            restoredData.expenses = [
              ...expenses.filter((e) => e.branchId !== restoreBranchScope),
              ...data.expenses.filter((e: DailyExpense) => e.branchId === restoreBranchScope),
            ];
          }
        }

        if (onRestoreBackup) {
          onRestoreBackup(restoredData);
          showNotification(
            'success',
            `Restore executed successfully! Restored ${restoredData.sales?.length || 0} Sales, ${restoredData.inventory?.length || 0} Stock items, ${restoredData.employees?.length || 0} Staff members.`
          );
        }
      } catch (err) {
        showNotification('error', 'Failed to read or parse the JSON backup file.');
      }
    };
    reader.readAsText(file);
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.value = '';
    }
  };

  // Card 2: Sync Offline Data Execution (Intelligent Delta Merge)
  const handleOfflineSyncFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const offlineData = parsed.data || parsed;

        if (!offlineData) {
          showNotification('error', 'Invalid offline backup file. Could not read data payload.');
          return;
        }

        // Merge Sales
        const salesMap = new Map<string, DailySale>();
        sales.forEach((s) => salesMap.set(s.id, s));
        if (Array.isArray(offlineData.sales)) {
          offlineData.sales.forEach((s: DailySale) => {
            salesMap.set(s.id, s);
          });
        }
        const mergedSales = Array.from(salesMap.values());

        // Merge Expenses
        const expenseMap = new Map<string, DailyExpense>();
        expenses.forEach((e) => expenseMap.set(e.id, e));
        if (Array.isArray(offlineData.expenses)) {
          offlineData.expenses.forEach((e: DailyExpense) => {
            expenseMap.set(e.id, e);
          });
        }
        const mergedExpenses = Array.from(expenseMap.values());

        // Merge Inventory
        const invMap = new Map<string, InventoryItem>();
        inventory.forEach((i) => invMap.set(i.id, i));
        if (Array.isArray(offlineData.inventory)) {
          offlineData.inventory.forEach((i: InventoryItem) => {
            invMap.set(i.id, i);
          });
        }
        const mergedInventory = Array.from(invMap.values());

        const mergedPayload = {
          ...offlineData,
          sales: mergedSales,
          expenses: mergedExpenses,
          inventory: mergedInventory,
          employees:
            Array.isArray(offlineData.employees) && offlineData.employees.length > 0
              ? offlineData.employees
              : employees,
          branches:
            Array.isArray(offlineData.branches) && offlineData.branches.length > 0
              ? offlineData.branches
              : branches,
          users:
            Array.isArray(offlineData.users) && offlineData.users.length > 0
              ? offlineData.users
              : users,
        };

        if (onRestoreBackup) {
          onRestoreBackup(mergedPayload);
          showNotification(
            'success',
            `Offline data synchronized successfully! Merged ${mergedSales.length} total sales vouchers and ${mergedInventory.length} inventory items.`
          );
        }
      } catch (err) {
        showNotification('error', 'Error synchronizing offline backup file.');
      }
    };
    reader.readAsText(file);
    if (syncFileInputRef.current) {
      syncFileInputRef.current.value = '';
    }
  };

  // Card 3: Execute Reset Confirmation
  const handleExecuteReset = () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET' && resetConfirmInput.trim() !== '2026') {
      setResetError('Please type "RESET" or enter the MD PIN (2026) to confirm.');
      return;
    }

    if (onResetOperationsToZero) {
      onResetOperationsToZero();
      showNotification(
        'success',
        `System data for ${resetYear} (${resetYearMode}) has been safely reset to zero.`
      );
      setIsResetConfirmModalOpen(false);
      setResetConfirmInput('');
      setResetError('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Server className="w-5 h-5 text-sky-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. TOP CARD: ADVANCED EXPORT FILTERS                           */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sky-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Advanced Export Filters
              </h2>
              <p className="text-[11px] text-slate-500">
                Shwe Kyal Tagon ERP • စနစ်အတွင်းရှိ တရားဝင်ဒေတာကဏ္ဍများကို စစ်ထုတ်ရွေးချယ်ပြီး Export ထုတ်ယူခြင်း
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
          >
            {areAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Filters & Export Format Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Section 1: Filters & Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>1. FILTERS &amp; SCOPE</span>
            </div>

            <div className="space-y-2.5">
              {/* Branch Selector */}
              <div>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL">All Branches (ဆိုင်ခွဲအားလုံး)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selector */}
              <div>
                <select
                  value={selectedTimeFilter}
                  onChange={(e) => setSelectedTimeFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden focus:border-sky-500 cursor-pointer"
                >
                  <option value="ALL_TIME">All Time (Complete Storage)</option>
                  <option value="THIS_MONTH">Current Month (ယခုလ)</option>
                  <option value="LAST_MONTH">Previous Month (ယခင်လ)</option>
                  <option value="FY_2026_27">Financial Year (2026-27 ဘဏ္ဍာရေးနှစ်)</option>
                  <option value="LAST_30_DAYS">Last 30 Days (လွန်ခဲ့သော ၃၀ ရက်)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Export Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>2. EXPORT FORMAT</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* JSON Option */}
              <button
                type="button"
                onClick={() => setExportFormat('json')}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  exportFormat === 'json'
                    ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs'
                    : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    exportFormat === 'json' ? 'text-sky-600' : 'text-slate-500'
                  }`}
                >
                  <FileCode2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase text-slate-900 tracking-wide">
                  JSON
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Restore
                </span>
              </button>

              {/* Excel Option */}
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  exportFormat === 'excel'
                    ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs'
                    : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    exportFormat === 'excel' ? 'text-sky-600' : 'text-slate-400'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase text-slate-900 tracking-wide">
                  EXCEL
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Reports
                </span>
              </button>

              {/* CSV Option */}
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  exportFormat === 'csv'
                    ? 'border-2 border-sky-500 bg-sky-50/50 shadow-xs'
                    : 'border border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mb-1.5 ${
                    exportFormat === 'csv' ? 'text-sky-600' : 'text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase text-slate-900 tracking-wide">
                  CSV
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Raw
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Select Data Collections */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>3. SELECT DATA COLLECTIONS (စနစ်အတွင်းရှိ ဒေတာအုပ်စုများ)</span>
            </div>

            {/* Quick Category Tab Filters */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
              {['ALL', 'Sales & POS', 'Inventory', 'Financial', 'HR & Staff', 'Administration'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      activeCategoryFilter === cat
                        ? 'bg-sky-100 text-sky-800 font-black'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'အားလုံး' : cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedCollections.map((col) => {
              const isSelected = selectedCollections.includes(col.id);
              const count = collectionCounts[col.id] || 0;
              const ColIcon = col.icon;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggleCollection(col.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <ColIcon className="w-4 h-4" />
                    </div>

                    <div className="text-left min-w-0">
                      <div className="truncate flex items-center gap-1.5">
                        <span>{col.label}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {count}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] truncate font-normal mt-0.5 ${
                          isSelected ? 'text-sky-100' : 'text-slate-400'
                        }`}
                      >
                        {col.burmeseLabel}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-1">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Footer Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-sky-600">
            {selectedCollections.length} / {SKTG_COLLECTIONS.length} collections selected.
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full sm:w-auto px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] active:bg-[#075985] text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download System Backup</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. THREE CARDS GRID: RESTORE, SYNC OFFLINE, SYSTEM DATA RESET   */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: RESTORE POINT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Restore Point
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure filters below to select exactly what data scope to restore from the JSON file. Existing duplicate records will be overwritten.
            </p>

            <div className="space-y-2.5">
              <select
                value={restoreBranchScope}
                onChange={(e) => setRestoreBranchScope(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Branches (ဆိုင်ခွဲအားလုံး)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={restoreTimeScope}
                onChange={(e) => setRestoreTimeScope(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL_TIME">All Time (Unfiltered)</option>
                <option value="THIS_MONTH">Current Month (ယခုလ)</option>
              </select>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={restoreFileInputRef}
              onChange={handleRestoreFileSelected}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => restoreFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/20 rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
            >
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
              <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                Select JSON &amp; Execute Restore
              </span>
            </button>
          </div>
        </div>

        {/* CARD 2: SYNC OFFLINE DATA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Sync Offline Data
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Restore an offline backup by merging changes. Deleted records in the offline system will be permanently removed. New/modified records will be seamlessly merged into the current system without overwriting existing data untouched by the offline session.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={syncFileInputRef}
              onChange={handleOfflineSyncFileSelected}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => syncFileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 hover:border-sky-400 hover:bg-sky-50/20 rounded-2xl py-8 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
            >
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
              <span className="text-xs font-bold text-slate-800 group-hover:text-sky-800 transition-colors">
                Select JSON &amp; Execute Sync
              </span>
            </button>
          </div>
        </div>

        {/* CARD 3: SYSTEM DATA RESET */}
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-900">
                System Data Reset
              </h3>
            </div>

            {/* Year Selector & Fiscal/Calendar Toggle */}
            <div className="flex items-center gap-2">
              <select
                value={resetYear}
                onChange={(e) => setResetYear(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
              </select>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetYearMode('FISCAL')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                    resetYearMode === 'FISCAL'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  FISCAL
                </button>
                <button
                  type="button"
                  onClick={() => setResetYearMode('CALENDAR')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
                    resetYearMode === 'CALENDAR'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CALENDAR
                </button>
              </div>
            </div>

            {/* Scope Selector */}
            <div>
              <select
                value={resetScope}
                onChange={(e) => setResetScope(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="ENTIRE_YEAR">Entire Year / Financial Year (လုပ်ငန်းမှတ်တမ်းအားလုံး)</option>
                <option value="SALES_EXPENSES">Daily Sales &amp; Expenses Only (အရောင်းနှင့် အသုံးစရိတ်)</option>
                <option value="ALL_TRANSACTIONS">All Transactional Records (Keep Staff &amp; Branches)</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setResetConfirmInput('');
                setResetError('');
                setIsResetConfirmModalOpen(true);
              }}
              className="w-full py-3 px-4 bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-700" />
              <span>RESET {resetYear} DATA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Confirmation Modal for System Data Reset */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Confirm System Data Reset ({resetYear})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mode: {resetYearMode} • Scope: {resetScope}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5 leading-relaxed">
              <p>
                <strong>သတိပေးချက်:</strong> ဤလုပ်ဆောင်ချက်သည် <strong>{resetYear}</strong> ကာလအတွင်းရှိ အရောင်း၊ အသုံးစရိတ် နှင့် လည်ပတ်မှုမှတ်တမ်းများကို သုညသို့ ပြန်လည်ရှင်းလင်းပေးမည်ဖြစ်ပြီး ကုမ္ပဏီ <strong>ဝန်ထမ်းစာရင်း (၃၁ ဦး)</strong>၊ <strong>User Accounts</strong> နှင့် <strong>ဆိုင်ခွဲကွန်ရက်</strong> များကို လုံးဝမထိခိုက်ဘဲ လုံခြုံစွာ ထိန်းသိမ်းထားပေးပါမည်။
              </p>
              <p className="text-[11px] text-rose-700">
                လုပ်ဆောင်ခြင်းမပြုမီ အပေါ်ရှိ Download System Backup ခလုတ်ဖြင့် Backup အရင်ထုတ်ယူထားရန် အကြံပြုပါသည်။
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                အတည်ပြုရန် <span className="font-mono text-rose-600 uppercase">RESET</span> သို့မဟုတ် Managing Director PIN ရိုက်ထည့်ပါ:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => {
                  setResetConfirmInput(e.target.value);
                  setResetError('');
                }}
                placeholder="RESET သို့မဟုတ် PIN (2026)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden focus:border-rose-500"
              />
              {resetError && (
                <p className="text-[11px] text-rose-600 font-bold">{resetError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                မလုပ်ဆောင်ပါ (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                အတည်ပြုပြီး Reset လုပ်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
