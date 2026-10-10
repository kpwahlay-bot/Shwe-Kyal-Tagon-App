export type UserRole = 
  | 'MD' 
  | 'Operation' 
  | 'Sales Manager' 
  | 'Admin' 
  | 'Finance' 
  | 'Cashier' 
  | 'Staff';

export const EXACT_SYSTEM_ROLES = [
  'MD',
  'Operation',
  'Sales Manager',
  'Admin',
  'Finance',
  'Cashier',
  'Staff',
] as const;

export const normalizeUserRole = (rawRole: string | undefined | null): UserRole => {
  const r = (rawRole || '').trim().toLowerCase();
  if (r === 'md' || r === 'managing director' || r === 'owner') return 'MD';
  if (r === 'operation' || r === 'operations manager' || r === 'editor' || r === 'operations' || r === 'operations & finance') return 'Operation';
  if (r === 'sales manager' || r === 'manager' || r === 'sales_manager') return 'Sales Manager';
  if (r === 'admin' || r === 'administrator' || r === 'executive') return 'Admin';
  if (r === 'finance' || r === 'accountant') return 'Finance';
  if (r === 'cashier') return 'Cashier';
  return 'Staff';
};

export const isMDUser = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  const username = (user.username || '').toLowerCase().trim();
  const email = ((user as any).email || '').toLowerCase().trim();
  const displayName = (user.displayName || '').toLowerCase().trim();
  const role = normalizeUserRole(user.role);
  const title = ((user as any).title || '').toLowerCase().trim();
  return (
    role === 'MD' ||
    title.includes('managing director') ||
    title.includes('owner') ||
    username === 'sumyatwin.sktg@gmail.com' ||
    username === 'wahwahlwin.1990@gmail.com' ||
    email === 'sumyatwin.sktg@gmail.com' ||
    email === 'wahwahlwin.1990@gmail.com' ||
    displayName.includes('su myat win') ||
    displayName.includes('wah wah lwin') ||
    displayName.includes('managing director')
  );
};

/**
 * Check if the user is Operation role (specifically Yamin Nwe: yaminnwe@sktg.com / Finance & Policy)
 */
export const isYaminnwe = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  const role = normalizeUserRole(user.role);
  if (role === 'Operation') return true;
  const u = (user.username || '').toLowerCase();
  const d = (user.displayName || '').toLowerCase();
  const c = (user.employeeCode || '').toUpperCase();
  const e = ((user as any).email || '').toLowerCase();
  return (
    u.includes('yaminnwe') ||
    u.includes('yamin') ||
    e.includes('yaminnwe') ||
    e.includes('yamin') ||
    d.includes('yamin nwe') ||
    d.includes('yaminnwe') ||
    d.includes('yamin') ||
    c === 'EC010' ||
    c === 'EC-010' ||
    c === 'EC0010'
  );
};

/**
 * Voucher Discount Authorization Permission:
 * - ONLY MD and Operation (Yamin Nwe) can apply or change discounts on sales vouchers.
 * - Staff, Cashier, Sales Manager, Admin, and Finance CANNOT apply discounts.
 */
export const canUserApplyDiscount = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  if (normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return false;
};

/**
 * Global Read Access for Stock & Customer/Supplier:
 * - All 7 roles can view Stock & Inventory and Customer & Supplier across all branches.
 */
export const hasGlobalBranchAccess = (user: UserAccount | null | undefined): boolean => {
  return !!user;
};

/**
 * POS Branch Access:
 * - MD and Operation (Yamin Nwe) can access all branches in POS.
 * - Staff, Cashier, Sales Manager, Admin, and Finance are strictly restricted to their assigned branch only.
 */
export const canUserAccessAllBranchesPOS = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  if (normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return false;
};

/**
 * POS Selling Authorization:
 * - MD and Operation can sell from any branch.
 * - Staff, Cashier, Sales Manager, Admin, and Finance can ONLY sell items physically in their assigned branch.
 */
export const canUserSellBranchStock = (user: UserAccount | null | undefined, targetBranchId: string): boolean => {
  if (!user) return false;
  if (isMDUser(user) || normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return user.branchId === 'ALL' || user.branchId === targetBranchId;
};

/**
 * Global Delete Permission:
 * - ONLY Managing Director (MD) has full delete permission across the system (sales, inventory, suppliers, finance, audit, rma).
 * - Staff, Cashier, Sales Manager, Admin, Finance, and Operation CANNOT delete core sales vouchers or financial items.
 */
export const canUserDelete = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return isMDUser(user);
};

export const canUserDeleteSalesVoucher = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return isMDUser(user);
};

/**
 * Core Financial Vouchers Delete Permission:
 * - STRICT RULE: Operation, Sales Manager, Admin, Finance, Staff CANNOT delete incentive receivables, PO payable vouchers, or supplier claim vouchers.
 * - ONLY MD can delete financial vouchers.
 */
export const canUserDeleteFinancialVoucher = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return isMDUser(user);
};

/**
 * Payroll Slip & Incentive Bonus Deletion & Calculation Permission:
 * - MD and Operation (Yamin Nwe) have full permission to calculate, edit, and delete mistaken records in Payroll.
 * - Sales Manager, Admin, Finance, Cashier, and Staff CANNOT access Payroll at all.
 */
export const canUserDeletePayrollSlip = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  if (normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return false;
};

export const canUserManagePayroll = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  if (normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return false;
};

/**
 * Inventory Management & Stock Adjustment Permission:
 * - Managing Director (MD) has full inventory management and stock adjustment.
 * - Operation has full access across all branches.
 * - Staff, Cashier, Sales Manager, Admin, and Finance: Read-only catalog view.
 */
export const canUserManageInventory = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Operation' || isYaminnwe(user);
};

/**
 * Sales Voucher Edit Permission (Mistake Correction):
 * - Managing Director (MD), Operation (Yamin Nwe), Sales Manager, Admin, and Finance can edit mistaken daily sales vouchers.
 * - Staff and Cashier CANNOT edit any vouchers or data anywhere.
 */
export const canUserManageSales = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Operation' || role === 'Sales Manager' || role === 'Admin' || role === 'Finance' || isYaminnwe(user);
};

/**
 * Branch Target Configuration Permission:
 * - ONLY MD and Operation (Yamin Nwe) can set and update monthly branch quota targets.
 * - Other users can view targets but cannot edit.
 */
export const canUserSetBranchTarget = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  if (normalizeUserRole(user.role) === 'Operation' || isYaminnwe(user)) return true;
  return false;
};

/**
 * Financial Management P&L Access Permission:
 * - ONLY Managing Director (MD) can access the P&L Ledger.
 * - STRICT RULE: Operation (Yamin Nwe), Sales Manager, Admin, Finance, Cashier, and Staff are FORBIDDEN from viewing P&L Ledger.
 */
export const canUserViewPL = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return isMDUser(user);
};

/**
 * Financial Management General Access Permission:
 * - Operation (Yamin Nwe): Can access general financial sections (Expenses, Purchases, Debt, Suppliers, RMA, Treasury) with edit capabilities.
 * - STRICT RULE: CANNOT delete incentive receivables, PO payable vouchers, or supplier claim vouchers.
 * - Sales Manager, Admin, Finance: READ ONLY access to general financial sections. Cannot edit or delete.
 * - Staff, Cashier: NO access to Financial Management.
 */
export const canUserViewFinancials = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Operation' || role === 'Sales Manager' || role === 'Admin' || role === 'Finance' || isYaminnwe(user);
};

export const canUserEditFinancials = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Operation' || isYaminnwe(user);
};

/**
 * Employee Directory Access Permission:
 * - MD, Operation, Sales Manager, Admin, and Finance can access Employee Directory (add new staff).
 * - Staff and Cashier: NO access.
 */
export const canUserViewEmployeeDirectory = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Operation' || role === 'Sales Manager' || role === 'Admin' || role === 'Finance' || isYaminnwe(user);
};

/**
 * Administration Modules (Branch Management, Activity Audit Log):
 * - ONLY MD and Admin can view Branch Management and Activity Audit Log.
 * - STRICT RULE: Operation (Yamin Nwe), Sales Manager, Finance, Cashier, and Staff CANNOT access Branch Management or Audit Logs.
 */
export const canUserViewAdminModules = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  if (isMDUser(user)) return true;
  const role = normalizeUserRole(user.role);
  return role === 'Admin';
};

/**
 * User Account Management (User & Access Security):
 * - STRICT RULE: ONLY Managing Director (MD) can access User Management, link Firestore UIDs, and provision staff accounts.
 * - Operation (Yamin Nwe) and all other roles CANNOT access User Management.
 */
export const canUserManageAccounts = (user: UserAccount | null | undefined): boolean => {
  if (!user) return false;
  return isMDUser(user);
};

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  managerName?: string;
  mobileTarget?: number; // Monthly Mobile Phone Target (Units)
  laptopTarget?: number; // Monthly Laptop Target (Units)
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  title?: string;
  branchId: string; // 'ALL' for Managing Director or specific branch ID
  branchName: string;
  pin: string;
  password?: string;
  avatarBg: string;
  status: 'active' | 'inactive';
  employeeId?: string; // Linked Employee ID
  employeeCode?: string; // Linked Employee Code (e.g. EC-001)
  firebaseUid?: string; // Linked Firebase Auth UID (configured via Firebase Console)
}

export type InventoryCategory = 
  | 'Smartphones & Tablets'
  | 'Laptops & Computers'
  | 'Accessories & Gadgets'
  | 'Service Charges'
  | 'Service Spare Part'
  | 'Spare Parts & Hardware'
  | 'Mobile'
  | 'Laptop'
  | 'Accessories'
  | 'Phone' 
  | 'Laptop/Computer' 
  | 'Spare Parts';

export interface InventoryBatch {
  id: string;
  batchNo: string;
  purchaseDate: string;
  costPrice: number;
  initialQty: number;
  remainingQty: number;
  supplier?: string;
  branchId?: string;
}

export interface InventoryItem {
  id: string;
  sku: string; // Barcode / SKU
  name: string; // e.g. "iPhone 15 Pro Max 256GB"
  category: InventoryCategory;
  brand: string; // Apple, Samsung, Dell, Asus, Anker, Xiaomi, etc.
  model: string;
  imeiOrSerial?: string; // IMEI or Serial Number
  imeiList?: string[]; // Multiple IMEI / Serial Numbers tracked
  imeiNumbers?: string[]; // Alternative alias for tracked IMEI numbers
  serialNumbers?: string[]; // Alternative alias for tracked serial numbers
  costPrice: number; // Purchase / Buying Price (MMK)
  sellingPrice: number; // Retail / Selling Price (MMK)
  minStockAlert: number; // Minimum Stock Alert Level
  warranty: string; // e.g. "1 Year Official", "6 Months Shop"
  supplier?: string;
  branchStock: { [branchId: string]: number }; // Quantity in each branch
  totalStock: number; // Total across all branches
  lastRestockedDate: string;
  lastAuditedDate?: string; // Date of last physical stock audit count
  isOldStock?: boolean; // Flagged as aging / old stock for priority clearance
  batches?: InventoryBatch[]; // FIFO inventory batches tracking purchase cost by arrival date
  notes?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemCategory: InventoryCategory;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'AUDIT_ADJUSTMENT' | 'RETURN_TO_SUPPLIER';
  quantity: number;
  fromBranchId?: string;
  fromBranchName?: string;
  toBranchId?: string;
  toBranchName?: string;
  performedBy: string;
  notes?: string;
  supplierOrCustomer?: string;
  unitCost?: number;
  sku?: string;
  referenceNo?: string;
  imeiList?: string[];
  imeiOrSerial?: string;
  party?: string;
  createdAt: string;
}

export interface StockCheckRecord {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  checkedBy: string;
  items: Array<{
    itemId: string;
    itemName: string;
    category: string;
    systemQty: number;
    actualQty: number;
    difference: number;
    remarks: string;
  }>;
  status: 'Completed' | 'Pending Review';
  createdAt: string;
}

export type CompanyDepartment = 
  | 'Sales Department'
  | 'Service Department'
  | 'Finance Department';

export const COMPANY_DEPARTMENTS: { 
  key: CompanyDepartment; 
  label: string; 
  mmLabel: string; 
  badgeClass: string; 
  dotColor: string;
}[] = [
  { 
    key: 'Sales Department', 
    label: 'Sales Department', 
    mmLabel: 'Sales Department',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500'
  },
  { 
    key: 'Service Department', 
    label: 'Service Department', 
    mmLabel: 'Service Department',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  { 
    key: 'Finance Department', 
    label: 'Finance Department', 
    mmLabel: 'Finance Department',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500'
  },
];

export type DepartmentPositionsMap = Record<CompanyDepartment, string[]>;

export const DEPARTMENT_POSITIONS: Record<CompanyDepartment, string[]> = {
  'Sales Department': [
    'Junior Sales Executive',
    'Junior Sales Assistant',
    'Junior Sale',
    'Sales Assistant',
    'Sales Executive',
    'Senior Sale',
    'Senior Sales Executive',
    'Sales Supervisor',
    'Supervisor',
    'Team Leader',
    'Installment',
    'Installment Specialist',
    'Page Admin',
    'Training',
    'Training Specialist',
    'I Stock & Purchase',
    'Stock & Purchase',
    'Assistant Manager',
    'Sales Manager',
    'Branch Manager',
    'Manager',
    'Store Operations Manager',
    'Managing Director',
  ],
  'Finance Department': [
    'Junior Accountant',
    'Accountant',
    'Finance Executive',
    'Senior Accountant / Finance Supervisor',
    'Junior Cashier',
    'Cashier',
    'Payment',
    'Payment Specialist',
    'Finance',
    'Finance Officer',
    'Finance & Policy',
    'Finance Manager',
  ],
  'Service Department': [
    'Service Technician',
    'Senior Service',
    'Senior Service Technician',
    'Senior Technician',
    'Technical Supervisor',
    'Supervisor',
    'Service Manager',
  ],
};

// Normalize department to the 3 official departments
export function normalizeDepartmentName(dept?: string): CompanyDepartment {
  if (!dept) return 'Sales Department';
  if (
    dept === 'Sales Department' || 
    dept === 'Service Department' || 
    dept === 'Finance Department'
  ) {
    return dept as CompanyDepartment;
  }
  const lower = dept.toLowerCase();
  if (lower.includes('finance') || lower.includes('account')) {
    return 'Finance Department';
  }
  if (
    lower.includes('service') || 
    lower.includes('hardware') || 
    lower.includes('tech repair') || 
    lower.includes('repair') || 
    lower.includes('diagnostic') || 
    lower.includes('customer care')
  ) {
    return 'Service Department';
  }
  if (
    lower.includes('sale') || 
    lower.includes('operation') || 
    lower.includes('retail') || 
    lower.includes('store')
  ) {
    return 'Sales Department';
  }
  return 'Sales Department';
}

export interface Employee {
  id: string;
  code: string; // e.g. "E0047", "E0086"
  name: string;
  position: string; // e.g. "HOD", "DYHOD", "SENIOR MANAGER", "MANAGER", "ASSISTANT MANAGER"
  department: string;
  branchId: string;
  branchName: string; // e.g. "YGN-1 CS", "YGN-7 CS"
  phone: string;
  baseSalary: number; // in MMK
  joinedDate: string;
  tenure?: string; // e.g. "19y 8m", "15y 10m"
  status: 'active' | 'leave' | 'resigned';
  avatarBg?: string;
  isManager?: boolean;
  phoneTargetUnits?: number; // Monthly Smartphone target (Unit Count)
  laptopTargetUnits?: number; // Monthly Laptop / PC target (Unit Count)
  salesTargetUnits?: number; // Total Monthly unit target count
  salesTarget?: number; // Monthly sales target (MMK or legacy)
  kpiScore?: number; // KPI rating or target score
  performancePoints?: number; // Employee performance bonus points for profit sharing
  userAccountId?: string; // Linked UserAccount ID
  username?: string; // Linked login username
  firebaseUid?: string; // Linked Firebase Auth UID (configured via Firebase Console)
  role?: UserRole; // Assigned RBAC role (MD, Manager, Executive, Admin, Staff)
  createdAt?: string;
  updatedAt?: string;
}

export interface LateEntry {
  id: string;
  date?: string;
  minutes?: number;
  fine: number;
  reason?: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  position: string;
  department: string;
  branchId: string;
  branchName: string;
  month: string; // e.g. "2026-03"
  workingDaysStandard: number; // e.g. 26
  actualDaysWorked: number;
  absentDays: number;
  extraDaysWorked?: number; // Days worked beyond standard days (e.g. 28 - 26 = 2)
  extraDaysPay?: number; // Extra worked days allowance / pay (MMK)
  basicSalary: number;
  attendanceBonus: number; // Attendance bonus
  bonus?: number; // General / Performance Bonus
  otHours: number; // Overtime hours
  otRatePerHour: number; // Overtime rate
  otTotal: number;
  salesCommission: number; // Sales bonus / commission
  mealAllowance: number; // Food / living allowance
  serviceAllowance?: number; // လုပ်သက်ခံစားခွင့် (Service Allowance - ၂၀,၀၀၀ ကျပ် / ၁ နှစ်)
  dutyAllowance?: number; // ရာထူးအလိုက် တာဝန်ခံကြေး (Position / Duty Allowance)
  tenure?: string; // ဝန်ထမ်းလုပ်သက် (Length of service e.g. "2 Years")
  joinedDate?: string; // ဝန်ထမ်းစတင်ဝင်ရောက်သည့်ရက်စွဲ (Employee Join Date)
  
  // Quarterly & Yearly Sales Target & Performance Profit Sharing Bonus
  performanceBonus?: number; // Target / Profit-sharing bonus in MMK
  bonusPeriodType?: 'QUARTERLY' | 'YEARLY' | 'MONTHLY'; // Period type
  bonusPeriodLabel?: string; // e.g. "Q3 2026 Bonus", "Year 2026 Annual Bonus"
  salesTarget?: number; // Period Target amount (MMK)
  actualSales?: number; // Actual sales achieved in period (MMK)
  targetMetPercent?: number; // Target Met achievement percentage e.g. 0.52%
  performancePoints?: number; // Performance Points e.g. 0.52 pts
  
  totalEarnings: number; // Total gross earnings
  
  // Deductions
  lateEntries?: LateEntry[];
  lateCount?: number; // Number of late occurrences
  lateDeduct: number; // Late Deduct
  absentDeduct: number; // Absent Deduct
  unpaidLeaveDays?: number; // Unpaid leave days
  unpaidLeave: number; // Unpaid Leave
  deductionAdvance?: number; // Salary advance (deprecated/removed)
  deductionPenalty?: number; // Penalty / fine (deprecated)
  deductionSSB: number; // Social Security / SSB
  totalDeductions: number; // Total deductions
  
  // Net
  netSalary: number; // Net take-home salary
  netPayable?: number; // Net take-home / payable
  paymentStatus: 'Pending' | 'Paid';
  paymentDate?: string;
  paymentMethod: 'Cash' | 'KBZPay' | 'WavePay' | 'Bank Transfer';
  notes?: string;
  createdAt: string;
}

export interface BonusSlipData {
  id: string;
  employee: Employee;
  branchName: string;
  periodType: 'QUARTERLY' | 'YEARLY';
  periodLabel: string; // e.g. "Q3 2026 (Jul - Sep)" or "Year 2026 Annual"
  year: number;
  quarter?: string;
  isManager: boolean;
  
  // Performance & Targets
  salesTarget: number;
  actualSales: number;
  achievementRate: number; // Target Met %
  points: number; // Performance Points
  totalTeamPoints: number;
  bonusWeight: number; // Share ratio e.g. 0.525
  
  // Financial context
  companyNetProfit: number;
  profitSharePercent: number;
  bonusPool: number;
  bonusAmount: number;
  
  date: string;
}

export type PaymentMethod = 
  | 'Cash'
  | 'Split (Cash + Bank)'
  | 'MMQR'
  | 'KBZPay'
  | 'KBZ Bank'
  | 'CB Pay'
  | 'CB Bank'
  | 'AYA Pay'
  | 'AYA Bank'
  | 'WavePay'
  | 'UAB Pay'
  | 'Yoma Bank'
  | 'Bank Transfer'
  | string;

export interface PaymentMethodOption {
  id: string;
  name: string;
  mmName: string;
  category: 'CASH' | 'MOBILE_PAY' | 'BANK' | 'QR' | 'SPLIT';
  color: string;
  badgeClass: string;
}

export const MYANMAR_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'Cash', name: 'Cash', mmName: 'Cash', category: 'CASH', color: '#16a34a', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Split (Cash + Bank)', name: 'Cash + Bank', mmName: 'Cash + Bank', category: 'SPLIT', color: '#8b5cf6', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'MMQR', name: 'MMQR', mmName: 'MMQR', category: 'QR', color: '#7c3aed', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'KBZPay', name: 'KBZPay', mmName: 'KBZPay', category: 'MOBILE_PAY', color: '#2563eb', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'KBZ Bank', name: 'KBZ Bank', mmName: 'KBZ Bank', category: 'BANK', color: '#1d4ed8', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'CB Pay', name: 'CB Pay', mmName: 'CB Pay', category: 'MOBILE_PAY', color: '#dc2626', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'CB Bank', name: 'CB Bank', mmName: 'CB Bank', category: 'BANK', color: '#b91c1c', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'AYA Pay', name: 'AYA Pay', mmName: 'AYA Pay', category: 'MOBILE_PAY', color: '#ea580c', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'AYA Bank', name: 'AYA Bank', mmName: 'AYA Bank', category: 'BANK', color: '#c2410c', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'WavePay', name: 'WavePay', mmName: 'WavePay', category: 'MOBILE_PAY', color: '#ca8a04', badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { id: 'UAB Pay', name: 'UAB Pay', mmName: 'UAB Pay', category: 'MOBILE_PAY', color: '#0284c7', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'Yoma Bank', name: 'Yoma Bank', mmName: 'Yoma Bank', category: 'BANK', color: '#0d9488', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'Bank Transfer', name: 'Bank Transfer', mmName: 'Bank Transfer', category: 'BANK', color: '#64748b', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export type SaleType = 'PRODUCT' | 'SERVICE';

export interface SaleCartItem {
  id: string;
  itemId?: string; // Convenience alias for item/inventory ID
  inventoryItemId?: string;
  sku?: string;
  name: string;
  category: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  cashback?: number; // Cashback deducted from original price
  total: number;
  totalPrice?: number; // Convenience alias for line total
  warranty?: string;
  imeiOrSerial?: string;
  serial?: string;
  serials?: string[];
  deviceSerial?: string;
}

export interface HoldBill {
  id: string;
  holdNumber: string;
  customerName?: string;
  customerPhone?: string;
  township?: string;
  branchId: string;
  branchName: string;
  items: SaleCartItem[];
  subTotal: number;
  discount: number;
  netTotal: number;
  savedAt: string;
  savedBy: string;
  notes?: string;
}

export interface CashierShift {
  id: string;
  shiftNumber: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  startTime: string; // ISO
  endTime?: string; // ISO
  openingCash: number; // Opening drawer float
  status: 'OPEN' | 'CLOSED';
  cashSalesTotal?: number;
  digitalSalesTotal?: number;
  totalSalesCount?: number;
  totalSalesAmount?: number;
  totalCashSales?: number;
  totalDigitalSales?: number;
  expensesTotal?: number;
  expectedCashInDrawer?: number; // openingCash + cashSalesTotal - expensesTotal
  actualCashCounted?: number;
  cashDiscrepancy?: number; // actual - expected
  notes?: string;
  closedBy?: string;
  createdAt?: string;
}

export interface DailySale {
  id: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  receiptNo?: string; // SVC Receipt / Job Sheet No (e.g. 26090201)
  sku?: string; // SKU / Item Code (e.g. 800600)
  saleType?: SaleType; // 'PRODUCT' (Default) or 'SERVICE' (Machine Repair & Maintenance)
  branchId: string;
  branchName: string;
  inventoryItemId?: string; // Linked Inventory Item
  quantity?: number; // Sold quantity (defaults to 1)
  itemName: string;
  category: string;
  costPrice: number; // Buying cost or spare parts cost (Internal only - HIDDEN from customer voucher!)
  salePrice: number; // Selling price or total service charge (Entered manually or calculated)
  profit: number; // salePrice - costPrice (Internal only - HIDDEN from customer voucher!)
  paymentMethod: PaymentMethod;
  cashAmount?: number; // Cash portion collected
  bankAmount?: number; // Bank / Digital pay portion collected
  bankType?: string; // Bank name or digital wallet type (e.g. 'KBZPay', 'UAB PAY', 'AYA MB', 'CB Pay')
  taxAmount?: number; // Tax amount
  paymentStatus?: 'PAID' | 'PARTIAL' | 'CREDIT'; // Track actual money collected vs credit
  paidAmount?: number; // Actual amount collected
  remainingDebt?: number; // Outstanding balance / debt
  initialPaidAmount?: number; // Original paid amount at time of sale
  initialDebtAmount?: number; // Original debt amount at time of sale
  tenderedAmount?: number; // Cash handed over by customer
  changeAmount?: number; // Change given back to customer
  items?: SaleCartItem[]; // Multi-item cart items for modern POS
  employeeId?: string;
  employeeName: string;
  customerName?: string;
  customerPhone?: string;
  township?: string;
  isVipCustomer?: boolean;
  warranty?: string;
  discount?: number;
  cashback?: number; // Cashback deducted from original price (displayed under description on voucher)
  salespersonName?: string;
  salespersonId?: string;
  cashierName?: string;
  cashierId?: string;
  financeName?: string;
  financeId?: string;
  voidReason?: string;
  voidAuthorizedBy?: string;
  isVoided?: boolean;
  finalTotal?: number; // Total after discount and promotions
  // Specific fields for Machine Repair & Maintenance Services
  deviceModel?: string; // e.g. "Canon LBP 2900 Printer", "Dell Latitude 5420", "iPhone 13"
  deviceSerial?: string; // Serial No or IMEI (Single or combined string)
  deviceSerials?: string[]; // Array of Serial/IMEI numbers for multi-quantity item sales
  serviceLaborFee?: number; // Service/Labor charge
  sparePartSku?: string; // Spare Part SKU/Code (e.g. 500001)
  sparePartsCost?: number; // Cost of spare parts used
  sparePartsPrice?: number; // Price charged to customer for spare parts
  sparePartsUsed?: string; // Description of spare parts used
  serviceStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'DELIVERED';
  technicianName?: string;
  issueDescription?: string;
  installmentFrequency?: 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'CUSTOM';
  totalInstallments?: number;
  installments?: SaleInstallment[];
  paymentHistory?: SalePaymentItem[];
  cartItems?: SaleCartItem[];
  netPayable?: number;
  totalAmount?: number;
  unitPrice?: number;
  sparePartsWarranty?: string;
  soldByName?: string;
  soldByEmployeeId?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleInstallment {
  installmentNo: number;
  monthName?: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL';
  paidDate?: string;
  paymentMethod?: string;
  accountId?: string;
  notes?: string;
}

export interface SalePaymentItem {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  accountId?: string;
  recordedBy: string;
  receiptVoucherNo?: string;
  installmentNo?: number;
  notes?: string;
  createdAt: string;
}

export interface DailyExpense {
  id: string;
  voucherNo?: string;
  date: string; // YYYY-MM-DD
  branchId: string;
  branchName: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: 'Cash' | 'KBZPay' | 'WavePay' | 'Bank Transfer';
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface ContactPartner {
  id: string;
  name: string;
  type: 'Supplier' | 'Customer' | 'Credit Customer' | 'Corporate' | 'Service Partner' | 'Wholesale Customer' | 'VIP Customer';
  phone: string;
  category?: string;
  lastTransactionDate?: string;
  totalTransactions?: number;
  contactPerson?: string;
  email?: string;
  company?: string;
  city: string;
  address?: string;
  productCategory?: string; // Product Domain (e.g. Smartphones & Tablets, Laptops & Computers, Accessories & Gadgets)
  balanceDue?: number;
  creditLimit?: number;
  creditTermMonths?: number; // 1 to 5 months
  notes?: string;
  createdAt?: string;
}

export interface DepartmentSummary {
  name: string;
  employeeCount: number;
  totalPayroll: number;
}

export interface PurchasePaymentItem {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  accountId?: string;
  recordedBy: string;
  receiptVoucherNo?: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItemLine {
  id: string;
  itemName: string;
  name?: string;
  brand?: string;
  model?: string;
  category: InventoryCategory;
  sku?: string;
  inventoryItemId?: string;
  warranty?: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  imeiList?: string[];
  isExistingModel?: boolean;
}

export interface PurchaseInstallment {
  id: string;
  installmentNo: number; // 1 to 10
  dueDate: string; // YYYY-MM-DD
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paidAccountId?: string;
  notes?: string;
}

export interface PurchaseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  branchId: string;
  branchName: string;
  itemName: string;
  brand?: string;
  model?: string;
  sku?: string;
  category: InventoryCategory;
  warranty?: string; // e.g. "1 Year Official", "6 Months Shop", "No Warranty"
  unitCost: number;
  quantity: number;
  totalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: string;
  accountId?: string;
  dueDate?: string;
  autoAddToInventory?: boolean;
  inventoryItemId?: string;
  items?: PurchaseItemLine[]; // Multi-model items in single PO
  installments?: PurchaseInstallment[]; // Up to 10 split installment payments with due dates
  imeiList?: string[]; // Serial numbers or IMEIs registered with this PO
  serialNumbers?: string[]; // Alternative alias for serial numbers
  notes?: string;
  paymentHistory: PurchasePaymentItem[];
  recordedBy: string;
  createdAt: string;
}

export interface SupplierReturn {
  id: string;
  returnNo: string;
  returnCode?: string;
  date: string; // YYYY-MM-DD
  supplierName: string;
  supplierPhone?: string;
  branchId: string;
  branchName: string;
  itemId?: string;
  inventoryItemId?: string;
  itemName: string;
  sku?: string;
  category?: InventoryCategory;
  imeiList?: string[]; // Returned defective IMEIs / Serial numbers
  serialNumbers?: string[];
  quantity: number;
  unitCost: number;
  totalAmount: number;
  reason: string; // Reason for defect / error
  defectReason?: string;
  defectDescription?: string;
  actionTaken?: 'DEDUCT_SUPPLIER_DEBT' | 'CASH_OR_BANK_REFUND' | 'PENDING_REPLACEMENT' | string;
  resolutionMethod?: 'DEDUCT_DEBT' | 'CASH_REFUND' | 'REPLACEMENT' | 'REPAIR' | string;
  resolutionType?: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED';
  settlementDate?: string;
  replacementImeis?: string[];
  replacementItemName?: string;
  refundAmount?: number;
  settledAccountId?: string;
  settledAccountName?: string;
  settledPoInvoiceNo?: string;
  settledPoId?: string;
  resolutionNotes?: string;
  accountId?: string;
  refundAccountId?: string;
  refundAccountName?: string;
  purchaseInvoiceNo?: string;
  status: 'COMPLETED' | 'PENDING_REPLACEMENT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  performedBy?: string;
  recordedBy?: string;
  createdAt: string;
}

export type SupplierBenefitCategory = 
  | 'Cashback' 
  | 'Policy Bonus' 
  | 'Counter Rental Fee' 
  | 'Promotion Subsidy' 
  | 'Price Down Compensation' 
  | 'RMA / Defect Claim' 
  | 'Other Benefit';

export interface SupplierBenefit {
  id: string;
  claimNo: string;
  date: string; // YYYY-MM-DD
  settlementDate?: string; // Date when settled / received
  branchId?: string;
  supplierName: string;
  supplierPhone?: string;
  category: SupplierBenefitCategory;
  amount: number;
  settleAction: 'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT';
  accountId?: string;
  accountName?: string;
  targetPurchaseId?: string;
  targetPurchaseInvoiceNo?: string;
  status: 'SETTLED' | 'PENDING';
  referenceNo?: string;
  settleReference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export type TreasuryAccountType = 'CASH' | 'BANK' | 'DIGITAL';

export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryAccountType;
  accountNumber?: string;
  bankName?: string;
  currentBalance: number;
  lastUpdated: string;
  isDefault?: boolean;
  notes?: string;
}

export interface TreasuryTransaction {
  id: string;
  date: string;
  type: 
    | 'INCOME_SALE'
    | 'PURCHASE_PAYMENT'
    | 'SUPPLIER_DEBT_SETTLEMENT'
    | 'SUPPLIER_REFUND'
    | 'OPERATING_EXPENSE'
    | 'PAYROLL_PAYOUT'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'BALANCE_ADJUSTMENT'
    | 'CAPITAL_INJECTION'
    | 'INTER_BRANCH_TRANSFER_PAYMENT'
    | 'INTER_BRANCH_TRANSFER_RECEIPT'
    | 'CUSTOMER_DEBT_COLLECTION'
    | 'INFLOW';
  accountId: string;
  accountName: string;
  amount: number;
  direction: 'IN' | 'OUT';
  referenceNo?: string;
  referenceId?: string;
  partnerName?: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface InterBranchTransfer {
  id: string;
  transferNo: string;
  date: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  itemId?: string;
  itemName: string;
  category: string;
  quantity: number;
  unitValue: number; // item cost or transfer price
  totalValue: number; // quantity * unitValue
  transferFee: number; // delivery / courier / handling fee
  totalSettlementAmount: number; // totalValue + transferFee
  paymentStatus: 'SETTLED' | 'PENDING' | 'WAIVED';
  paymentMethod?: string;
  paidFromAccountId?: string; // Account that paid (e.g. Destination or Source branch account)
  receivedInAccountId?: string; // Account that received payment
  payerRole?: 'RECEIVER_PAYS' | 'SENDER_PAYS' | 'HEADQUARTERS_SETTLED' | string; // Who pays for goods/delivery (optional)
  paymentType?: 'CASH' | 'BANK';
  bankType?: string;
  imeiNumbers?: string[]; // Serial/IMEI numbers for transferred items
  items?: Array<{
    itemId?: string;
    itemName: string;
    category: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
    imeiNumbers?: string[];
    imei?: string;
  }>;
  notes?: string;
  status: 'COMPLETED' | 'IN_TRANSIT' | 'CANCELLED' | 'PENDING';
  recordedBy: string;
  createdAt: string;
}

export interface DailyCashAllocation {
  id: string;
  date: string;
  branchId: string;
  branchName: string;
  totalCashCollected: number;
  paymentUsed: number;
  shopDrawerKept: number;
  transferredToMD: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export type ActivityModule = 
  | 'SALES' 
  | 'SERVICE' 
  | 'INVENTORY' 
  | 'PURCHASE' 
  | 'EXPENSE' 
  | 'TREASURY' 
  | 'FINANCE'
  | 'PAYROLL' 
  | 'STAFF'
  | 'BRANCH_TRANSFER' 
  | 'AUDIT' 
  | 'DATABASE'
  | 'USERS';

export type ActivityAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'RESTOCK' 
  | 'TRANSFER' 
  | 'ADJUST' 
  | 'PAYOUT' 
  | 'RETURN'
  | 'RESTORE'
  | 'LOGIN';

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm:ss
  userId?: string;
  userName: string;
  userRole: string;
  userAvatarBg?: string;
  branchId: string;
  branchName: string;
  module: ActivityModule;
  action: ActivityAction;
  title: string;
  description: string;
  details?: {
    itemName?: string;
    sku?: string;
    quantity?: number;
    amount?: number;
    prevQty?: number;
    newQty?: number;
    costPrice?: number;
    sellingPrice?: number;
    supplier?: string;
    customerName?: string;
    invoiceNo?: string;
    receiptNo?: string;
    referenceNo?: string;
    fromBranch?: string;
    toBranch?: string;
    reason?: string;
    [key: string]: any;
  };
  ipOrDevice?: string;
  createdAt: string;
}

export interface GroundAuditItem {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  model?: string;
  costPrice: number;
  sellingPrice: number;
  systemQty: number;
  physicalQty: number | null; // null if not yet counted
  variance: number; // physicalQty - systemQty
  varianceValue: number; // variance * costPrice
  reason?: string; // 'Damage', 'Loss/Missing', 'Miscount', 'Unrecorded Sale', 'Unrecorded Restock', 'Other'
  notes?: string;
  status: 'MATCHED' | 'SHORTAGE' | 'SURPLUS' | 'UNCOUNTED';
  lastAuditedDate?: string;
  auditedBy?: string;
}

export interface GroundAuditSession {
  id: string;
  auditNo: string;
  date: string;
  branchId: string;
  branchName: string;
  auditorName: string;
  totalItemsCounted: number;
  totalDiscrepancies: number;
  totalFinancialVariance: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'RECONCILED';
  reconciledAt?: string;
  reconciledBy?: string;
  items: GroundAuditItem[];
  notes?: string;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  township?: string;
  address?: string;
  isVip: boolean;
  vipTier?: 'REGULAR' | 'VIP' | 'PLATINUM_VIP';
  totalPurchaseCount: number; // Number of purchases / vouchers
  totalItemsPurchased: number; // Total quantity of items bought (all categories)
  totalSpent: number; // Total MMK spent across all time
  vipEligibleItems?: number; // Total qualifying Laptop & Mobile items bought (excludes accessories)
  vipEligibleSpent?: number; // Total qualifying spend on Laptop & Mobile (excludes accessories)
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  manualVipOverride?: boolean;
  autoVipQualified?: boolean;
  notes?: string;
  isContactPartner?: boolean;
  partnerType?: string;
  contactPartnerId?: string;
}

export interface VipConfig {
  minItems: number; // Minimum items purchased to auto-promote to VIP (default: 5)
  minPurchases: number; // Minimum purchases to auto-promote (default: 3)
  minAmount: number; // Minimum spend in MMK (default: 500,000 MMK)
  autoPromote: boolean; // Enable automatic promotion
}



