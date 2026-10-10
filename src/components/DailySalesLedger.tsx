import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Smartphone, 
  Laptop, 
  Wrench, 
  Headphones, 
  CheckCircle2, 
  X, 
  CreditCard, 
  Building2, 
  Receipt, 
  Package, 
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  User,
  UserCheck,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  Users,
  LayoutList,
  Table,
  BarChart3,
  Check,
  Coins,
  Banknote,
  FileText,
  Edit3,
  Scan,
  ShieldAlert,
  Crown,
  History,
  Sparkles,
  Layers,
  Lock,
  CalendarDays,
  Target
} from 'lucide-react';
import { 
  DailySale, 
  SaleType, 
  Branch, 
  Employee, 
  UserAccount, 
  InventoryItem, 
  MYANMAR_PAYMENT_METHODS, 
  PaymentMethod, 
  DailyCashAllocation,
  SaleCartItem,
  HoldBill,
  CashierShift,
  CustomerProfile,
  ContactPartner,
  PurchaseRecord,
  hasGlobalBranchAccess,
  normalizeDepartmentName,
  isYaminnwe,
  isMDUser,
  canUserApplyDiscount,
  canUserSetBranchTarget,
  canUserDelete,
  canUserAccessAllBranchesPOS,
  canUserManageSales,
  SaleInstallment,
  SupplierReturn,
  SupplierBenefit,
  InterBranchTransfer
} from '../types';
import { formatMMK, formatNumber, formatDateDMY, exportSalesToCSV, exportServicesToCSV, exportSalesStatementReportToCSV, exportSalesStatementReportToPDF } from '../utils/formatters';
import { isDummyOrInvalidStaff } from '../data/initialData';
import { generateAutoSKU, CATEGORY_SKU_CONFIGS, getCategorySKUConfig, PRIMARY_INVENTORY_CATEGORIES } from '../utils/skuGenerator';
import { POSCustomerVoucherModal, VoucherPrintType } from './POSCustomerVoucherModal';
import { DailyCashAllocationModal } from './DailyCashAllocationModal';
import { DateRangeFilter, DateFilterState, isDateWithinFilter, cleanItemDescription } from './DateRangeFilter';
import { CalendarMonthPicker } from './CalendarMonthPicker';
import { ManagerAuthModal } from './ManagerAuthModal';
import { SmartPOSModal } from './SmartPOSModal';
import { CashierShiftModal } from './CashierShiftModal';
import { CustomerWarrantyTrackerModal } from './CustomerWarrantyTrackerModal';
import { FormattedNumberInput } from './FormattedNumberInput';
import { VipCustomerListModal } from './VipCustomerListModal';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import { ItemSalesBreakdownModal } from './ItemSalesBreakdownModal';
import { buildCustomerProfiles, findCustomerByPhone, findCustomerByName, getCustomerPurchaseHistory, normalizePhone } from '../utils/customerHelper';
import { getAvailableStockForBranch, isSharedStockPool, isNoWarrantyItem, resolveItemWarranty, getInStockImeisForBranch } from '../utils/inventoryHelper';
import { 
  getBranchCashierStaff, 
  getBranchFinanceStaff, 
  getDefaultCashierForBranch, 
  getDefaultFinanceForBranch 
} from '../utils/staffBranchHelper';

export const getBranchVoucherPrefix = (branchId?: string, branchName?: string): string => {
  const bId = (branchId || '').toLowerCase().trim();
  const bName = (branchName || '').toLowerCase().trim();
  
  if (
    bId === 'branch-sys2' ||
    bId === 'sys-02' ||
    bId === 'sys2' ||
    bId === 'system2' ||
    bId.includes('sys') ||
    bName.includes('system ii') ||
    bName.includes('system 2') ||
    bName.includes('ssii') ||
    bName.includes('sii')
  ) {
    return 'SII-INV';
  }
  
  if (
    bId === 'branch-3' ||
    bId === 'cs-03' ||
    bId === 'shop-3' ||
    bId.includes('branch-3') ||
    bName.includes('shop 3') ||
    bName.includes('shop-3') ||
    bName.includes('ဆိုင်ခွဲ (၃)') ||
    bName.includes('ဆိုင်ခွဲ ၃') ||
    bName.includes('ဆိုင်ခွဲ(၃)') ||
    bName.includes('sktg3') ||
    bName.includes('sktg 3')
  ) {
    return 'SKTG3-INV';
  }
  
  if (
    bId === 'branch-2' ||
    bId === 'cs-02' ||
    bId === 'shop-2' ||
    bId.includes('branch-2') ||
    bName.includes('shop 2') ||
    bName.includes('shop-2') ||
    bName.includes('ဆိုင်ခွဲ (၂)') ||
    bName.includes('ဆိုင်ခွဲ ၂') ||
    bName.includes('ဆိုင်ခွဲ(၂)') ||
    bName.includes('sktg2') ||
    bName.includes('sktg 2')
  ) {
    return 'SKTG2-INV';
  }

  // Default to Branch 1 (Shop 1)
  return 'SKTG1-INV';
};

export const generateDailySalesInvoiceNo = (
  dateStr: string,
  existingSales: DailySale[] = [],
  branchId?: string,
  branchName?: string
): string => {
  // Format: e.g. SKTG1-INV20260925/001, SKTG2-INV20260925/001, SKTG3-INV20260925/001, SII-INV20260925/001
  const cleanDate = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const branchPrefix = getBranchVoucherPrefix(branchId, branchName);
  const fullPrefix = `${branchPrefix}${cleanDate}/`;
  const legacyPrefix = branchPrefix.replace('-INV', '-DS') + `${cleanDate}/`;
  
  let maxSeq = 0;
  existingSales.forEach((s) => {
    if (s && s.invoiceNo) {
      if (s.invoiceNo.startsWith(fullPrefix)) {
        const seqPart = s.invoiceNo.replace(fullPrefix, '').split(/[^0-9]/)[0];
        const num = parseInt(seqPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else if (s.invoiceNo.startsWith(legacyPrefix)) {
        const seqPart = s.invoiceNo.replace(legacyPrefix, '').split(/[^0-9]/)[0];
        const num = parseInt(seqPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else if (
        (branchPrefix === 'SII-INV' || branchPrefix === 'SII-DS') &&
        (s.invoiceNo.startsWith(`SSII-INV${cleanDate}/`) || s.invoiceNo.startsWith(`SSII-DS${cleanDate}/`))
      ) {
        const seqPart = s.invoiceNo.replace(`SSII-INV${cleanDate}/`, '').replace(`SSII-DS${cleanDate}/`, '').split(/[^0-9]/)[0];
        const num = parseInt(seqPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      } else if (
        // Support backward compatibility for existing sales of same date and branch
        (!branchId || s.branchId === branchId) &&
        s.invoiceNo.includes(`${cleanDate}/`)
      ) {
        const parts = s.invoiceNo.split(`${cleanDate}/`);
        if (parts.length > 1) {
          const num = parseInt(parts[1].split(/[^0-9]/)[0], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${fullPrefix}${paddedSeq}`;
};

export const cleanSerialDisplay = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '')
    .trim();
};

export interface AdditionalProductLine {
  id: string;
  inventoryItemId?: string;
  itemName: string;
  category: string;
  sku: string;
  unitCostPrice: number;
  unitSalePrice: number;
  quantity: number;
  discount: number;
  cashback?: number;
  warranty: string;
  serials: string[];
}

export interface StatementItemLine {
  id: string;
  parentSale?: DailySale;
  invoiceNo: string;
  itemName: string;
  deviceSerial?: string;
  sku: string;
  quantity: number;
  saleType: 'PRODUCT' | 'SERVICE';
  deviceModel?: string;
  issueDescription?: string;
  sparePartsUsed?: string;
  employeeName: string;
  technicianName?: string;
  paymentMethod: string;
  cashAmount: number;
  bankAmount: number;
  bankType: string;
  taxAmount: number;
  salePrice: number;
  paidAmount: number;
  costPrice: number;
  category: string;
}

export function unpackSaleToStatementLines(sale: DailySale): StatementItemLine[] {
  // If sale is a SERVICE sale:
  if (sale.saleType === 'SERVICE') {
    const isCash = sale.paymentMethod === 'Cash' || (sale.cashAmount !== undefined && sale.cashAmount > 0);
    const total = sale.salePrice || 0;
    const paid = sale.paidAmount !== undefined ? sale.paidAmount : total;
    const cashVal = sale.cashAmount !== undefined && sale.cashAmount > 0 ? sale.cashAmount : (isCash ? paid : 0);
    const bankVal = sale.bankAmount !== undefined && sale.bankAmount > 0 ? sale.bankAmount : (!isCash ? paid : 0);

    return [{
      id: `${sale.id}-service`,
      parentSale: sale,
      invoiceNo: sale.invoiceNo,
      itemName: sale.itemName,
      deviceSerial: sale.deviceSerial,
      sku: sale.sku || '800600',
      quantity: sale.quantity || 1,
      saleType: 'SERVICE',
      deviceModel: sale.deviceModel,
      issueDescription: sale.issueDescription,
      sparePartsUsed: sale.sparePartsUsed,
      employeeName: sale.employeeName || '-',
      technicianName: sale.technicianName || sale.employeeName || '-',
      paymentMethod: sale.paymentMethod,
      cashAmount: cashVal,
      bankAmount: bankVal,
      bankType: sale.bankType && sale.bankType !== '-' ? sale.bankType : (!isCash ? sale.paymentMethod : '-'),
      taxAmount: sale.taxAmount || 0,
      salePrice: total,
      paidAmount: paid,
      costPrice: sale.costPrice || 0,
      category: sale.category || 'Service Charges',
    }];
  }

  // Invoice level amounts
  const invoiceTotal = sale.salePrice || 0;
  const isCash = sale.paymentMethod === 'Cash' || (sale.cashAmount !== undefined && sale.cashAmount > 0);
  const totalPaid = sale.paidAmount !== undefined ? sale.paidAmount : invoiceTotal;
  const invoiceCash = sale.cashAmount !== undefined && sale.cashAmount > 0 ? sale.cashAmount : (isCash ? totalPaid : 0);
  const invoiceBank = sale.bankAmount !== undefined && sale.bankAmount > 0 ? sale.bankAmount : (!isCash ? totalPaid : 0);
  const invoiceTax = sale.taxAmount || 0;
  const bankTypeStr = sale.bankType && sale.bankType !== '-' ? sale.bankType : (!isCash ? sale.paymentMethod : '-');
  const staffStr = sale.employeeName || '-';

  // Case 1: Sale has multi-item cart items array (Modern POS / Multi-product sales)
  if (sale.items && sale.items.length > 0) {
    const rawItems = sale.items;

    interface ExpandedItem {
      name: string;
      sku: string;
      category: string;
      costPrice: number;
      totalPrice: number;
      quantity: number;
      serial?: string;
    }

    const expandedList: ExpandedItem[] = [];

    rawItems.forEach((cItem, cIdx) => {
      let itemSerials: string[] = [];
      if (cItem.imeiOrSerial) {
        itemSerials = cItem.imeiOrSerial.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      } else if (sale.deviceSerials && sale.deviceSerials.length === rawItems.length) {
        itemSerials = [sale.deviceSerials[cIdx]];
      } else if (sale.deviceSerial && rawItems.length === 1) {
        itemSerials = sale.deviceSerial.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      }

      const itemQty = cItem.quantity || 1;
      const itemGrossUnitPrice = Number(cItem.unitPrice) || 0;
      const itemDisc = Math.max(0, Number(cItem.discount) || 0);
      // Net line total after discount (e.g. 920,000 - 30,000 = 890,000)
      const itemNetLineTotal = cItem.total !== undefined
        ? Math.max(0, Number(cItem.total))
        : Math.max(0, (itemGrossUnitPrice * itemQty) - itemDisc);
      // Net price per single item unit
      const unitNetPrice = itemQty > 0 ? (itemNetLineTotal / itemQty) : itemNetLineTotal;
      const unitCost = Number(cItem.costPrice) || 0;

      if (itemSerials.length > 0) {
        // Expand 1 row per serial with correct net price per unit
        itemSerials.forEach((ser) => {
          expandedList.push({
            name: cItem.name,
            sku: cItem.sku || sale.sku || '-',
            category: cItem.category || sale.category,
            costPrice: unitCost,
            totalPrice: unitNetPrice,
            quantity: 1,
            serial: ser,
          });
        });
        const extraQty = itemQty - itemSerials.length;
        if (extraQty > 0) {
          expandedList.push({
            name: cItem.name,
            sku: cItem.sku || sale.sku || '-',
            category: cItem.category || sale.category,
            costPrice: unitCost * extraQty,
            totalPrice: unitNetPrice * extraQty,
            quantity: extraQty,
            serial: undefined,
          });
        }
      } else {
        expandedList.push({
          name: cItem.name,
          sku: cItem.sku || sale.sku || '-',
          category: cItem.category || sale.category,
          costPrice: unitCost * itemQty,
          totalPrice: itemNetLineTotal,
          quantity: itemQty,
          serial: undefined,
        });
      }
    });

    const totalExpandedPrice = expandedList.reduce((acc, it) => acc + it.totalPrice, 0);

    let allocatedCash = 0;
    let allocatedBank = 0;
    let allocatedTax = 0;
    let allocatedSalePrice = 0;

    return expandedList.map((it, idx) => {
      const isLast = idx === expandedList.length - 1;
      const ratio = totalExpandedPrice > 0 ? it.totalPrice / totalExpandedPrice : (1 / expandedList.length);

      let itemCash: number;
      let itemBank: number;
      let itemTax: number;
      let itemSalePrice: number;

      if (isLast) {
        itemCash = Math.max(0, invoiceCash - allocatedCash);
        itemBank = Math.max(0, invoiceBank - allocatedBank);
        itemTax = Math.max(0, invoiceTax - allocatedTax);
        itemSalePrice = Math.max(0, invoiceTotal - allocatedSalePrice);
      } else {
        itemCash = Math.round(invoiceCash * ratio);
        itemBank = Math.round(invoiceBank * ratio);
        itemTax = Math.round(invoiceTax * ratio);
        itemSalePrice = Math.round(invoiceTotal * ratio);
        allocatedCash += itemCash;
        allocatedBank += itemBank;
        allocatedTax += itemTax;
        allocatedSalePrice += itemSalePrice;
      }

      return {
        id: `${sale.id}-item-${idx}`,
        parentSale: sale,
        invoiceNo: sale.invoiceNo,
        itemName: it.name,
        deviceSerial: it.serial,
        sku: it.sku,
        quantity: it.quantity,
        saleType: 'PRODUCT',
        employeeName: staffStr,
        paymentMethod: sale.paymentMethod,
        cashAmount: itemCash,
        bankAmount: itemBank,
        bankType: bankTypeStr,
        taxAmount: itemTax,
        salePrice: itemSalePrice,
        paidAmount: itemCash + itemBank,
        costPrice: it.costPrice,
        category: it.category,
      };
    });
  }

  // Case 2: Comma separated itemName (legacy or bulk entries)
  const splitNames = sale.itemName.includes(',')
    ? sale.itemName.split(',').map(n => n.trim()).filter(Boolean)
    : [];

  const splitSerials = sale.deviceSerials && sale.deviceSerials.length > 0
    ? sale.deviceSerials
    : (sale.deviceSerial ? sale.deviceSerial.split(',').map(s => s.trim()).filter(Boolean) : []);

  if (splitNames.length > 1) {
    const totalCount = splitNames.length;
    let allocatedCash = 0;
    let allocatedBank = 0;
    let allocatedTax = 0;
    let allocatedPrice = 0;

    return splitNames.map((name, idx) => {
      const isLast = idx === totalCount - 1;
      const ratio = 1 / totalCount;

      let itemPrice: number;
      let itemCash: number;
      let itemBank: number;
      let itemTax: number;

      if (isLast) {
        itemPrice = Math.max(0, invoiceTotal - allocatedPrice);
        itemCash = Math.max(0, invoiceCash - allocatedCash);
        itemBank = Math.max(0, invoiceBank - allocatedBank);
        itemTax = Math.max(0, invoiceTax - allocatedTax);
      } else {
        itemPrice = Math.round(invoiceTotal * ratio);
        itemCash = Math.round(invoiceCash * ratio);
        itemBank = Math.round(invoiceBank * ratio);
        itemTax = Math.round(invoiceTax * ratio);
        allocatedPrice += itemPrice;
        allocatedCash += itemCash;
        allocatedBank += itemBank;
        allocatedTax += itemTax;
      }

      const ser = splitSerials[idx] || undefined;

      return {
        id: `${sale.id}-split-${idx}`,
        parentSale: sale,
        invoiceNo: sale.invoiceNo,
        itemName: name,
        deviceSerial: ser,
        sku: sale.sku || '-',
        quantity: 1,
        saleType: 'PRODUCT',
        employeeName: staffStr,
        paymentMethod: sale.paymentMethod,
        cashAmount: itemCash,
        bankAmount: itemBank,
        bankType: bankTypeStr,
        taxAmount: itemTax,
        salePrice: itemPrice,
        paidAmount: itemCash + itemBank,
        costPrice: Math.round((sale.costPrice || 0) / totalCount),
        category: sale.category,
      };
    });
  }

  // Case 3: Multiple serials on single item
  if (splitSerials.length > 1 && (sale.quantity || 1) >= splitSerials.length) {
    const totalCount = splitSerials.length;
    let allocatedCash = 0;
    let allocatedBank = 0;
    let allocatedTax = 0;
    let allocatedPrice = 0;

    const lines: StatementItemLine[] = splitSerials.map((ser, idx) => {
      const isLast = idx === totalCount - 1 && (sale.quantity || 1) === totalCount;
      const ratio = 1 / (sale.quantity || 1);

      const itemPrice = Math.round(invoiceTotal * ratio);
      const itemCash = Math.round(invoiceCash * ratio);
      const itemBank = Math.round(invoiceBank * ratio);
      const itemTax = Math.round(invoiceTax * ratio);

      allocatedPrice += itemPrice;
      allocatedCash += itemCash;
      allocatedBank += itemBank;
      allocatedTax += itemTax;

      return {
        id: `${sale.id}-ser-${idx}`,
        parentSale: sale,
        invoiceNo: sale.invoiceNo,
        itemName: sale.itemName,
        deviceSerial: ser,
        sku: sale.sku || '-',
        quantity: 1,
        saleType: 'PRODUCT',
        employeeName: staffStr,
        paymentMethod: sale.paymentMethod,
        cashAmount: itemCash,
        bankAmount: itemBank,
        bankType: bankTypeStr,
        taxAmount: itemTax,
        salePrice: itemPrice,
        paidAmount: itemCash + itemBank,
        costPrice: Math.round((sale.costPrice || 0) / (sale.quantity || 1)),
        category: sale.category,
      };
    });

    const extraQty = (sale.quantity || 1) - splitSerials.length;
    if (extraQty > 0) {
      lines.push({
        id: `${sale.id}-ser-extra`,
        parentSale: sale,
        invoiceNo: sale.invoiceNo,
        itemName: sale.itemName,
        deviceSerial: undefined,
        sku: sale.sku || '-',
        quantity: extraQty,
        saleType: 'PRODUCT',
        employeeName: staffStr,
        paymentMethod: sale.paymentMethod,
        cashAmount: Math.max(0, invoiceCash - allocatedCash),
        bankAmount: Math.max(0, invoiceBank - allocatedBank),
        bankType: bankTypeStr,
        taxAmount: Math.max(0, invoiceTax - allocatedTax),
        salePrice: Math.max(0, invoiceTotal - allocatedPrice),
        paidAmount: Math.max(0, (invoiceCash + invoiceBank) - (allocatedCash + allocatedBank)),
        costPrice: Math.round(((sale.costPrice || 0) / (sale.quantity || 1)) * extraQty),
        category: sale.category,
      });
    }

    return lines;
  }

  // Case 4: Standard single item sale
  return [{
    id: sale.id,
    parentSale: sale,
    invoiceNo: sale.invoiceNo,
    itemName: sale.itemName,
    deviceSerial: sale.deviceSerial,
    sku: sale.sku || '-',
    quantity: sale.quantity || 1,
    saleType: 'PRODUCT',
    employeeName: staffStr,
    paymentMethod: sale.paymentMethod,
    cashAmount: invoiceCash,
    bankAmount: invoiceBank,
    bankType: bankTypeStr,
    taxAmount: invoiceTax,
    salePrice: invoiceTotal,
    paidAmount: totalPaid,
    costPrice: sale.costPrice || 0,
    category: sale.category,
  }];
}

interface DailySalesLedgerProps {
  sales: DailySale[];
  branches: Branch[];
  employees?: Employee[];
  inventory?: InventoryItem[];
  purchases?: PurchaseRecord[];
  users?: UserAccount[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  contacts?: ContactPartner[];
  supplierReturns?: SupplierReturn[];
  supplierBenefits?: SupplierBenefit[];
  interBranchTransfers?: InterBranchTransfer[];
  onAddSale: (sale: DailySale, inventoryItemId?: string, quantity?: number) => void;
  onUpdateSale?: (sale: DailySale) => void;
  onDeleteSale: (id: string, voidMeta?: { authorizedBy: string; reason: string }) => void;
  dailyCashAllocations?: DailyCashAllocation[];
  onSaveDailyCashAllocation?: (allocation: DailyCashAllocation) => void;
  onDeleteDailyCashAllocation?: (id: string) => void;
  shifts?: CashierShift[];
  activeShift?: CashierShift | null;
  onStartShift?: (openingCash: number, notes?: string) => void;
  onCloseShift?: (actualCash: number, expectedCash: number, notes?: string) => void;
  heldBills?: HoldBill[];
  onSaveHoldBill?: (bill: HoldBill) => void;
  onRemoveHoldBill?: (id: string) => void;
  onCompleteSmartPOSSale?: (sale: DailySale, cartItems: SaleCartItem[]) => void;
  onUpdateBranch?: (branch: Branch) => void;
}

export const DailySalesLedger: React.FC<DailySalesLedgerProps> = ({
  sales,
  branches,
  employees = [],
  inventory = [],
  purchases = [],
  users = [],
  currentUser,
  activeBranchFilter,
  contacts = [],
  supplierReturns = [],
  supplierBenefits = [],
  interBranchTransfers = [],
  onAddSale,
  onUpdateSale,
  onDeleteSale,
  dailyCashAllocations = [],
  onSaveDailyCashAllocation,
  onDeleteDailyCashAllocation,
  shifts = [],
  activeShift = null,
  onStartShift,
  onCloseShift,
  heldBills = [],
  onSaveHoldBill,
  onRemoveHoldBill,
  onCompleteSmartPOSSale,
  onUpdateBranch,
}) => {
  const [isCashAllocationModalOpen, setIsCashAllocationModalOpen] = useState(false);
  const isMD = isMDUser(currentUser);
  const canManageSales = canUserManageSales(currentUser);
  const isStaffReadOnly = currentUser.role === 'Staff' || currentUser.role === 'Cashier';

  // View Mode: Categorized Daily Statement, Standard Table, Salesperson Performance, or Branch Targets & Achievement
  const [viewMode, setViewMode] = useState<'categorized' | 'table' | 'salesperson' | 'targets'>('categorized');

  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'ALL',
    startDate: todayStr,
    endDate: todayStr,
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [salespersonDateMode, setSalespersonDateMode] = useState<'DAILY' | 'MONTHLY'>('MONTHLY');
  const [salespersonSelectedDate, setSalespersonSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCT' | 'SERVICE' | 'TARGETS'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [salesPage, setSalesPage] = useState<number>(1);
  const [salesPageSize, setSalesPageSize] = useState<number>(50);

  // Branch Target Editing Modal State
  const [editingBranchTarget, setEditingBranchTarget] = useState<Branch | null>(null);
  const [targetFormMobile, setTargetFormMobile] = useState<number>(0);
  const [targetFormLaptop, setTargetFormLaptop] = useState<number>(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<DailySale | null>(null);
  const [modalSaleType, setModalSaleType] = useState<SaleType>('PRODUCT');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [productSerials, setProductSerials] = useState<string[]>(['']);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [sparePartInventoryId, setSparePartInventoryId] = useState<string>('');
  const [selectedVoucherSale, setSelectedVoucherSale] = useState<DailySale | null>(null);
  const [voucherPrintType, setVoucherPrintType] = useState<VoucherPrintType>('invoice');

  // Discount authorization check (MD & Yamin Only)
  const canApplyDiscount = useMemo(() => canUserApplyDiscount(currentUser), [currentUser]);
  const canDelete = useMemo(() => canUserDelete(currentUser), [currentUser]);

  // Credit Installment Months Selection State (e.g. 1, 2, 3, 4, 5, 6 Months)
  const [creditInstallmentMonths, setCreditInstallmentMonths] = useState<number>(1);

  // Multi-Model Voucher Support (Multiple different models on a single invoice)
  const [additionalProductLines, setAdditionalProductLines] = useState<AdditionalProductLine[]>([]);
  const [isProductPaidManual, setIsProductPaidManual] = useState<boolean>(false);

  // Modern Enterprise POS States
  const [isSmartPOSOpen, setIsSmartPOSOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isWarrantyTrackerOpen, setIsWarrantyTrackerOpen] = useState(false);
  const [isManagerAuthOpen, setIsManagerAuthOpen] = useState(false);
  const [pendingVoidSale, setPendingVoidSale] = useState<DailySale | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerProfile | null>(null);
  const [showModalPhoneSuggestions, setShowModalPhoneSuggestions] = useState(false);
  const [isItemBreakdownOpen, setIsItemBreakdownOpen] = useState(false);

  // Aggregated Customer Profiles & VIP calculation (includes Contacts & Suppliers list!)
  const customerProfiles = useMemo(() => {
    return buildCustomerProfiles(sales, contacts);
  }, [sales, contacts]);

  const vipCount = useMemo(() => {
    return customerProfiles.filter((c) => c.isVip).length;
  }, [customerProfiles]);

  // Global Keyboard shortcuts listener (F2: Open Smart POS, Escape: Close modals)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsSmartPOSOpen(true);
      } else if (e.key === 'Escape') {
        setIsModalOpen(false);
        setSelectedVoucherSale(null);
        setIsProductSuggestionsOpen(false);
        setIsSmartPOSOpen(false);
        setIsShiftModalOpen(false);
        setIsWarrantyTrackerOpen(false);
        setIsManagerAuthOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Product Search & Autocomplete
  const [productCode, setProductCode] = useState<string>('');
  const [isProductSuggestionsOpen, setIsProductSuggestionsOpen] = useState<boolean>(false);
  const [activeLineSuggestionId, setActiveLineSuggestionId] = useState<string | null>(null);

  const initialDate = new Date().toISOString().split('T')[0];

    const defaultBranchId = currentUser.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser.branchId;
    const defaultBranch = branches.find(b => b.id === defaultBranchId);

  // Product Form State
  const [productForm, setProductForm] = useState({
    date: initialDate,
    invoiceNo: generateDailySalesInvoiceNo(initialDate, sales, defaultBranchId, defaultBranch?.name),
    branchId: defaultBranchId,
    category: 'Smartphones & Tablets',
    itemName: '',
    sku: '',
    unitCostPrice: 0,
    unitSalePrice: 0,
    discount: 0,
    cashback: 0,
    paymentMethod: 'Cash' as DailySale['paymentMethod'],
    cashAmount: 0,
    bankAmount: 0,
    bankType: 'KBZPay',
    paymentStatus: 'PAID' as 'PAID' | 'PARTIAL' | 'CREDIT',
    paidAmount: 0,
    employeeName: currentUser.displayName,
    cashierName: getDefaultCashierForBranch(employees, defaultBranchId),
    financeName: getDefaultFinanceForBranch(employees, defaultBranchId),
    customerName: '',
    customerPhone: '',
    customerTownship: '',
    warranty: '1 Year',
    deviceSerial: '',
    notes: '',
  });

  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    date: initialDate,
    invoiceNo: generateDailySalesInvoiceNo(initialDate, sales, defaultBranchId, defaultBranch?.name),
    branchId: defaultBranchId,
    sku: '400001',
    deviceModel: '',
    deviceSerial: '',
    issueDescription: '',
    serviceLaborFee: 0,
    hasSparePart: false,
    sparePartSku: '500001',
    sparePartsCost: 0,
    sparePartsPrice: 0,
    sparePartsUsed: '',
    technicianName: currentUser.displayName,
    cashierName: getDefaultCashierForBranch(employees, defaultBranchId),
    financeName: getDefaultFinanceForBranch(employees, defaultBranchId),
    serviceStatus: 'COMPLETED' as 'COMPLETED' | 'IN_PROGRESS' | 'DELIVERED',
    paymentMethod: 'Cash' as DailySale['paymentMethod'],
    cashAmount: 0,
    bankAmount: 0,
    bankType: 'KBZPay',
    paymentStatus: 'PAID' as 'PAID' | 'PARTIAL' | 'CREDIT',
    paidAmount: 0,
    customerName: '',
    customerPhone: '',
    customerTownship: '',
    warranty: 'No Warranty',
    notes: '',
  });

  const activeModalPhone = modalSaleType === 'PRODUCT' ? productForm.customerPhone : serviceForm.customerPhone;
  const activeModalName = modalSaleType === 'PRODUCT' ? productForm.customerName : serviceForm.customerName;

  // Multi-item combined totals calculation for product voucher
  const combinedProductSubtotal = useMemo(() => {
    const line1Sub = (Number(productForm.unitSalePrice) || 0) * quantity;
    const extraSub = additionalProductLines.reduce((s, l) => s + (Number(l.unitSalePrice) || 0) * (l.quantity || 1), 0);
    return line1Sub + extraSub;
  }, [productForm.unitSalePrice, quantity, additionalProductLines]);

  const combinedProductCashback = useMemo(() => {
    const line1Cashback = Math.max(0, Number(productForm.cashback) || 0) * quantity;
    const extraCashback = additionalProductLines.reduce((s, l) => s + (Math.max(0, Number(l.cashback) || 0) * (l.quantity || 1)), 0);
    return line1Cashback + extraCashback;
  }, [productForm.cashback, quantity, additionalProductLines]);

  const combinedProductDiscount = useMemo(() => {
    const line1Disc = Math.max(0, Number(productForm.discount) || 0);
    const extraDisc = additionalProductLines.reduce((s, l) => s + Math.max(0, Number(l.discount) || 0), 0);
    return line1Disc + extraDisc;
  }, [productForm.discount, additionalProductLines]);

  const combinedProductNetTotal = useMemo(() => {
    return Math.max(0, combinedProductSubtotal - combinedProductCashback - combinedProductDiscount);
  }, [combinedProductSubtotal, combinedProductCashback, combinedProductDiscount]);

  // Keep paidAmount auto-synced with Net Total when not manually overridden for partial/credit payment
  useEffect(() => {
    if (modalSaleType === 'PRODUCT' && isModalOpen && !isProductPaidManual) {
      setProductForm((prev) => {
        if (prev.paidAmount === combinedProductNetTotal && prev.paymentStatus === 'PAID') {
          return prev;
        }
        return {
          ...prev,
          paidAmount: combinedProductNetTotal,
          paymentStatus: 'PAID',
        };
      });
    }
  }, [modalSaleType, isModalOpen, isProductPaidManual, combinedProductNetTotal]);

  const matchedCustomerInModal = useMemo(() => {
    return findCustomerByPhone(activeModalPhone, customerProfiles) || findCustomerByName(activeModalName, customerProfiles);
  }, [activeModalPhone, activeModalName, customerProfiles]);

  const modalPhoneSuggestions = useMemo(() => {
    if (!activeModalPhone || activeModalPhone.trim().length < 1) return [];
    const q = activeModalPhone.trim().toLowerCase();
    const normQ = normalizePhone(q);
    return customerProfiles.filter((c) => {
      const cPhone = c.phone.toLowerCase();
      const cNorm = normalizePhone(c.phone);
      const cName = c.name.toLowerCase();
      return (
        cPhone.includes(q) ||
        (normQ && cNorm.includes(normQ)) ||
        cName.includes(q)
      );
    }).slice(0, 8);
  }, [activeModalPhone, customerProfiles]);

  const handleModalPhoneChange = (input: string) => {
    setShowModalPhoneSuggestions(true);
    if (modalSaleType === 'PRODUCT') {
      setProductForm((prev) => ({ ...prev, customerPhone: input }));
    } else {
      setServiceForm((prev) => ({ ...prev, customerPhone: input }));
    }
    const found = findCustomerByPhone(input, customerProfiles);
    if (found) {
      if (modalSaleType === 'PRODUCT') {
        setProductForm((prev) => ({
          ...prev,
          customerName: found.name,
          customerTownship: found.township || prev.customerTownship,
        }));
      } else {
        setServiceForm((prev) => ({
          ...prev,
          customerName: found.name,
          customerTownship: found.township || prev.customerTownship,
        }));
      }
    }
  };

  const handleModalCustomerNameChange = (input: string) => {
    if (modalSaleType === 'PRODUCT') {
      setProductForm((prev) => ({ ...prev, customerName: input }));
    } else {
      setServiceForm((prev) => ({ ...prev, customerName: input }));
    }
    const found = findCustomerByName(input, customerProfiles);
    if (found) {
      if (modalSaleType === 'PRODUCT') {
        setProductForm((prev) => ({
          ...prev,
          customerPhone: prev.customerPhone || found.phone,
          customerTownship: found.township || prev.customerTownship,
        }));
      } else {
        setServiceForm((prev) => ({
          ...prev,
          customerPhone: prev.customerPhone || found.phone,
          customerTownship: found.township || prev.customerTownship,
        }));
      }
    }
  };

  const handleSelectModalCustomer = (c: CustomerProfile) => {
    if (modalSaleType === 'PRODUCT') {
      setProductForm((prev) => ({
        ...prev,
        customerPhone: c.phone,
        customerName: c.name,
        customerTownship: c.township || prev.customerTownship,
      }));
    } else {
      setServiceForm((prev) => ({
        ...prev,
        customerPhone: c.phone,
        customerName: c.name,
        customerTownship: c.township || prev.customerTownship,
      }));
    }
    setShowModalPhoneSuggestions(false);
  };

  const handleUpdateQuantity = (newQty: number) => {
    const q = Math.max(1, newQty);
    setQuantity(q);
    setProductSerials((prev) => {
      const next = [...prev];
      while (next.length < q) next.push('');
      return next.slice(0, q);
    });
  };

  const handleSerialChange = (index: number, val: string) => {
    // If user pasted comma or newline separated values into one slot:
    if (val.includes(',') || val.includes('\n') || val.includes('|')) {
      const parts = val.split(/[,|\n\r]+/).map(s => s.replace(/(?:IMEI\s*\d*|SN\s*\d*|Serial\s*\d*):/gi, '').trim()).filter(Boolean);
      if (parts.length > 1) {
        setProductSerials((prev) => {
          const next = [...prev];
          parts.forEach((p, pIdx) => {
            const targetSlot = index + pIdx;
            if (targetSlot < next.length) {
              next[targetSlot] = p;
            } else {
              next.push(p);
            }
          });
          return next;
        });
        if (index + parts.length > quantity) {
          handleUpdateQuantity(index + parts.length);
        }
        return;
      }
    }

    setProductSerials((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddProductUnit = () => {
    handleUpdateQuantity(quantity + 1);
  };

  const handleRemoveProductUnit = (indexToRemove: number) => {
    if (quantity <= 1) return;
    const nextSerials = productSerials.filter((_, idx) => idx !== indexToRemove);
    setProductSerials(nextSerials);
    const newQty = nextSerials.length;
    setQuantity(newQty);
  };

  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split(/[\r\n,]+/)
      .map(s => s.replace(/(?:IMEI\s*\d*|SN\s*\d*|Serial\s*\d*):/gi, '').trim())
      .filter(Boolean);

    if (lines.length > 0) {
      const newQty = Math.max(quantity, lines.length);
      const newSerials = [...lines];
      while (newSerials.length < newQty) {
        newSerials.push('');
      }
      setProductSerials(newSerials.slice(0, newQty));
      if (newQty !== quantity) {
        setQuantity(newQty);
        const subtotal = (Number(productForm.unitSalePrice) || 0) * newQty;
        const net = Math.max(0, subtotal - (Number(productForm.discount) || 0));
        setProductForm((prev) => ({
          ...prev,
          paidAmount: net,
        }));
      }
    }
    setShowBulkPasteModal(false);
    setBulkPasteText('');
  };

  // Filter Sales
  const filteredSales = sales.filter((sale) => {
    const matchesDate = isDateWithinFilter(sale.date, dateFilter);
    const matchesBranch = activeBranchFilter === 'ALL' || sale.branchId === activeBranchFilter;
    const matchesType = 
      activeTab === 'ALL' ? true :
      activeTab === 'SERVICE' ? sale.saleType === 'SERVICE' :
      sale.saleType !== 'SERVICE';
    const matchesCategory = selectedCategory === 'ALL' || sale.category === selectedCategory;
    
    const matchesSearch =
      !searchQuery ||
      sale.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.receiptNo && sale.receiptNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.sku && sale.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.deviceModel && sale.deviceModel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.deviceSerial && sale.deviceSerial.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.deviceSerials && sale.deviceSerials.some((ds) => ds.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (sale.customerPhone && sale.customerPhone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sale.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.technicianName && sale.technicianName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDate && matchesBranch && matchesType && matchesCategory && matchesSearch;
  });

  const totalSalesPages = salesPageSize >= 999999 ? 1 : (Math.ceil(filteredSales.length / salesPageSize) || 1);
  const paginatedSales = useMemo(() => {
    if (salesPageSize >= 999999) return filteredSales;
    const start = (salesPage - 1) * salesPageSize;
    return filteredSales.slice(start, start + salesPageSize);
  }, [filteredSales, salesPage, salesPageSize]);

  // Sales filtered by selected month or daily date for Salesperson Performance
  const monthlyFilteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesBranch = activeBranchFilter === 'ALL' || sale.branchId === activeBranchFilter;
      if (!matchesBranch) return false;
      if (salespersonDateMode === 'DAILY') {
        return sale.date === salespersonSelectedDate;
      } else {
        const saleMonth = sale.date ? sale.date.slice(0, 7) : '';
        return !selectedMonth || saleMonth === selectedMonth;
      }
    });
  }, [sales, selectedMonth, salespersonDateMode, salespersonSelectedDate, activeBranchFilter]);

  // Aggregated Performance per Salesperson
  const salespersonStats = useMemo(() => {
    const staffNames = new Set<string>();
    employees.forEach(e => {
      if (e.name) staffNames.add(e.name);
    });
    sales.forEach(s => {
      if (s.employeeName) staffNames.add(s.employeeName);
      if (s.technicianName) staffNames.add(s.technicianName);
      if (s.salespersonName) staffNames.add(s.salespersonName);
    });

    return Array.from(staffNames).filter(Boolean).map((staffName) => {
      const trimmedName = staffName.trim().toLowerCase();
      const empProfile = employees.find(e => 
        e.name.trim().toLowerCase() === trimmedName ||
        (e.code && e.code.trim().toLowerCase() === trimmedName) ||
        e.id === staffName
      );
      const userProfile = users?.find(u =>
        (empProfile?.userAccountId && u.id === empProfile.userAccountId) ||
        (empProfile?.username && u.username === empProfile.username) ||
        (u.displayName && u.displayName.trim().toLowerCase() === trimmedName) ||
        (u.username && u.username.trim().toLowerCase() === trimmedName)
      );

      const branchName = empProfile?.branchName || userProfile?.branchName || 'All Branches';
      const staffSales = monthlyFilteredSales.filter(s => 
        (s.employeeName && s.employeeName.trim().toLowerCase() === trimmedName) ||
        (s.technicianName && s.technicianName.trim().toLowerCase() === trimmedName) ||
        (s.salespersonName && s.salespersonName.trim().toLowerCase() === trimmedName)
      );

      const totalAmount = staffSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
      const totalInvoices = staffSales.length;
      const cashAmount = staffSales.reduce((acc, s) => {
        if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
        if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0);
      const bankAmount = staffSales.reduce((acc, s) => {
        if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
        if (s.paymentMethod !== 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0);

      const target = empProfile?.salesTarget !== undefined && empProfile?.salesTarget !== null ? Number(empProfile.salesTarget) : 5000000;
      const targetMetPercent = target > 0 ? ((totalAmount / target) * 100) : (totalAmount > 0 ? 100 : 0);

      const catCount: { [cat: string]: number } = {};
      staffSales.forEach(s => {
        catCount[s.category] = (catCount[s.category] || 0) + (s.salePrice || 0);
      });
      const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

      // 1. Official Job Position (from employee profile or linked user title)
      const officialPosition = empProfile?.position || userProfile?.title || '';
      const fallbackPos = staffSales.some(s => s.saleType === 'SERVICE') ? 'Service Technician' : 'Sales Executive';
      const displayPosition = officialPosition || fallbackPos;

      // 2. System Role (e.g. Managing Director, Admin, Manager, Staff)
      const systemRole = userProfile?.role || (empProfile?.isManager ? 'Manager' : (empProfile?.position?.toLowerCase().includes('manager') ? 'Manager' : 'Staff'));

      return {
        name: empProfile?.name || staffName,
        code: empProfile?.code || '',
        position: displayPosition,
        role: systemRole,
        department: empProfile?.department || (staffSales.some(s => s.saleType === 'SERVICE') ? 'Service Department' : 'Sales Department'),
        branch: branchName,
        totalSales: totalAmount,
        invoicesCount: totalInvoices,
        cashCollected: cashAmount,
        bankCollected: bankAmount,
        target,
        targetMetPercent,
        topCategory: topCat,
        kpiScore: empProfile?.kpiScore || 85,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [monthlyFilteredSales, employees, sales, users]);

  // Branch Targets & Monthly Performance Analytics (Mobile & Laptop Units)
  const branchTargetStats = useMemo(() => {
    const monthSales = sales.filter((s) => {
      const sDate = s.date || '';
      return sDate.startsWith(selectedMonth);
    });

    const isMobileSale = (s: DailySale) => {
      const cat = (s.category || '').toLowerCase();
      const name = (s.itemName || '').toLowerCase();
      return (
        cat.includes('smartphone') ||
        cat.includes('phone') ||
        cat.includes('tablet') ||
        name.includes('iphone') ||
        name.includes('samsung') ||
        name.includes('xiaomi') ||
        name.includes('redmi') ||
        name.includes('honor') ||
        name.includes('oppo') ||
        name.includes('vivo') ||
        name.includes('realme') ||
        name.includes('phone')
      );
    };

    const isLaptopSale = (s: DailySale) => {
      const cat = (s.category || '').toLowerCase();
      const name = (s.itemName || '').toLowerCase();
      return (
        cat.includes('laptop') ||
        cat.includes('computer') ||
        name.includes('laptop') ||
        name.includes('macbook') ||
        name.includes('dell') ||
        name.includes('lenovo') ||
        name.includes('asus') ||
        name.includes('acer') ||
        name.includes('thinkpad') ||
        name.includes('hp ')
      );
    };

    const stats = branches.map((b) => {
      const bSales = monthSales.filter((s) => s.branchId === b.id);
      
      const mobileUnitsSold = bSales.filter(isMobileSale).reduce((sum, s) => sum + (s.quantity || 1), 0);
      const laptopUnitsSold = bSales.filter(isLaptopSale).reduce((sum, s) => sum + (s.quantity || 1), 0);
      const totalRevenue = bSales.reduce((sum, s) => sum + (s.finalTotal || s.salePrice || 0), 0);

      const mobileTarget = b.mobileTarget || 0;
      const laptopTarget = b.laptopTarget || 0;

      const mobilePct = mobileTarget > 0 ? Math.round((mobileUnitsSold / mobileTarget) * 100) : (mobileUnitsSold > 0 ? 100 : 0);
      const laptopPct = laptopTarget > 0 ? Math.round((laptopUnitsSold / laptopTarget) * 100) : (laptopUnitsSold > 0 ? 100 : 0);

      return {
        branch: b,
        mobileTarget,
        mobileUnitsSold,
        mobilePct,
        laptopTarget,
        laptopUnitsSold,
        laptopPct,
        totalRevenue,
      };
    });

    const totalMobileTarget = stats.reduce((sum, s) => sum + s.mobileTarget, 0);
    const totalMobileSold = stats.reduce((sum, s) => sum + s.mobileUnitsSold, 0);
    const totalMobilePct = totalMobileTarget > 0 ? Math.round((totalMobileSold / totalMobileTarget) * 100) : (totalMobileSold > 0 ? 100 : 0);

    const totalLaptopTarget = stats.reduce((sum, s) => sum + s.laptopTarget, 0);
    const totalLaptopSold = stats.reduce((sum, s) => sum + s.laptopUnitsSold, 0);
    const totalLaptopPct = totalLaptopTarget > 0 ? Math.round((totalLaptopSold / totalLaptopTarget) * 100) : (totalLaptopSold > 0 ? 100 : 0);

    const totalAllRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);

    return {
      branches: stats,
      totalMobileTarget,
      totalMobileSold,
      totalMobilePct,
      totalLaptopTarget,
      totalLaptopSold,
      totalLaptopPct,
      totalAllRevenue,
    };
  }, [branches, sales, selectedMonth]);

  const handleOpenEditTarget = (branch: Branch) => {
    setEditingBranchTarget(branch);
    setTargetFormMobile(branch.mobileTarget || 0);
    setTargetFormLaptop(branch.laptopTarget || 0);
  };

  const handleSaveTarget = () => {
    if (!editingBranchTarget) return;
    if (onUpdateBranch) {
      onUpdateBranch({
        ...editingBranchTarget,
        mobileTarget: Number(targetFormMobile) || 0,
        laptopTarget: Number(targetFormLaptop) || 0,
      });
    }
    setEditingBranchTarget(null);
  };

  // Helper to get branch-specific staff for Product Sales (Sales, Cashier, Finance, etc.)
  const getSalesStaffOptions = (branchId?: string) => {
    const list: { name: string; title: string; branch: string; position: string; role: string; dept: string }[] = [];
    const seen = new Set<string>();

    employees.forEach((emp) => {
      if (emp.status === 'resigned') return;
      if (isDummyOrInvalidStaff(emp.name)) return;
      if (branchId && branchId !== 'ALL' && emp.branchId !== branchId) return;

      const dept = normalizeDepartmentName(emp.department || emp.position);

      if (emp.name && !seen.has(emp.name)) {
        seen.add(emp.name);
        const pos = emp.position || emp.department || 'Staff';
        list.push({
          name: emp.name,
          title: pos,
          position: pos,
          role: emp.isManager ? 'Manager' : 'Staff',
          branch: emp.branchName || '',
          dept: dept,
        });
      }
    });

    // If no staff found specifically for this branch, fallback to active staff across branches
    if (list.length === 0) {
      employees.forEach((emp) => {
        if (emp.status === 'resigned' || isDummyOrInvalidStaff(emp.name)) return;
        const dept = normalizeDepartmentName(emp.department || emp.position);
        if (emp.name && !seen.has(emp.name)) {
          seen.add(emp.name);
          list.push({
            name: emp.name,
            title: `${emp.position || 'Staff'} (${emp.branchName?.replace('ရွှေကြယ်တံခွန် (', '').replace(')', '') || 'HQ'})`,
            position: emp.position || 'Staff',
            role: emp.isManager ? 'Manager' : 'Staff',
            branch: emp.branchName || '',
            dept: dept,
          });
        }
      });
    }

    // Sort to group: Sales first, then Cashier, then Finance/Accounting, then other staff
    return list.sort((a, b) => {
      const getPriority = (d: string, p: string) => {
        const text = `${d} ${p}`.toLowerCase();
        if (text.includes('sale')) return 1;
        if (text.includes('cashier')) return 2;
        if (text.includes('finance') || text.includes('account')) return 3;
        if (text.includes('service') || text.includes('technician')) return 4;
        return 5;
      };
      const pA = getPriority(a.dept, a.position);
      const pB = getPriority(b.dept, b.position);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  };

  // Helper to get branch-specific staff for Service Vouchers (Service, Sales, Cashier, Finance)
  const getServiceTechniciansOptions = (branchId?: string) => {
    const list: { name: string; title: string; branch: string; position: string; role: string; dept: string }[] = [];
    const seen = new Set<string>();

    employees.forEach((emp) => {
      if (emp.status === 'resigned') return;
      if (isDummyOrInvalidStaff(emp.name)) return;
      if (branchId && branchId !== 'ALL' && emp.branchId !== branchId) return;

      const dept = normalizeDepartmentName(emp.department || emp.position);

      if (emp.name && !seen.has(emp.name)) {
        seen.add(emp.name);
        const pos = emp.position || emp.department || 'Staff';
        list.push({
          name: emp.name,
          title: pos,
          position: pos,
          role: emp.isManager ? 'Manager' : 'Staff',
          branch: emp.branchName || '',
          dept: dept,
        });
      }
    });

    if (list.length === 0) {
      employees.forEach((emp) => {
        if (emp.status === 'resigned' || isDummyOrInvalidStaff(emp.name)) return;
        const dept = normalizeDepartmentName(emp.department || emp.position);
        if (emp.name && !seen.has(emp.name)) {
          seen.add(emp.name);
          list.push({
            name: emp.name,
            title: `${emp.position || 'Staff'} (${emp.branchName?.replace('ရွှေကြယ်တံခွန် (', '').replace(')', '') || 'Service HQ'})`,
            position: emp.position || 'Staff',
            role: emp.isManager ? 'Manager' : 'Staff',
            branch: emp.branchName || '',
            dept: dept,
          });
        }
      });
    }

    return list.sort((a, b) => {
      const getPriority = (d: string, p: string) => {
        const text = `${d} ${p}`.toLowerCase();
        if (text.includes('service') || text.includes('technician')) return 1;
        if (text.includes('sale')) return 2;
        if (text.includes('cashier')) return 3;
        if (text.includes('finance') || text.includes('account')) return 4;
        return 5;
      };
      const pA = getPriority(a.dept, a.position);
      const pB = getPriority(b.dept, b.position);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  };

  // List of all active staff names (user-created employees and system users)
  const staffOptions = useMemo(() => {
    const list: { name: string; title: string; branch: string; position: string; role: string }[] = [];
    const seen = new Set<string>();

    employees.forEach((emp) => {
      if (emp.status === 'resigned' || isDummyOrInvalidStaff(emp.name)) return;
      if (emp.name && !seen.has(emp.name)) {
        seen.add(emp.name);
        list.push({
          name: emp.name,
          title: emp.position || emp.department || 'Employee',
          position: emp.position || 'Sales Executive',
          role: emp.isManager ? 'Manager' : 'Staff',
          branch: emp.branchName || '',
        });
      }
    });

    return list;
  }, [employees]);

  // Customer Credit Repayments (Debt Settlement Collections) matching date filter & branch filter
  const matchingRepaymentLines = useMemo(() => {
    const list: StatementItemLine[] = [];

    sales.forEach((s) => {
      if (activeBranchFilter !== 'ALL' && s.branchId !== activeBranchFilter) return;

      if (s.paymentHistory && s.paymentHistory.length > 0) {
        s.paymentHistory.forEach((ph, pIdx) => {
          const repDate = ph.date;
          if (!isDateWithinFilter(repDate, dateFilter)) return;

          const amt = ph.amount || 0;
          if (amt <= 0) return;

          const isCash = ph.paymentMethod === 'Cash' || (ph.paymentMethod || '').toLowerCase().includes('cash');
          const cashVal = isCash ? amt : 0;
          const bankVal = !isCash ? amt : 0;
          const bankType = !isCash ? (ph.paymentMethod || 'Bank') : '-';
          const recBy = ph.recordedBy || s.employeeName || 'Staff';
          const invNo = ph.receiptVoucherNo || s.invoiceNo;

          const matchesSearch =
            !searchQuery ||
            invNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (s.customerPhone && s.customerPhone.toLowerCase().includes(searchQuery.toLowerCase())) ||
            recBy.toLowerCase().includes(searchQuery.toLowerCase());

          if (!matchesSearch) return;

          list.push({
            id: `repay-${s.id}-${ph.id || pIdx}`,
            parentSale: s,
            invoiceNo: invNo,
            itemName: `Credit Repay - ${s.customerName || 'Customer'} [Voucher: ${s.invoiceNo}]`,
            deviceSerial: undefined,
            sku: 'REPAY',
            quantity: 1,
            saleType: 'PRODUCT',
            employeeName: recBy,
            technicianName: recBy,
            paymentMethod: ph.paymentMethod || 'Cash',
            cashAmount: cashVal,
            bankAmount: bankVal,
            bankType: bankType,
            taxAmount: 0,
            salePrice: amt,
            paidAmount: amt,
            costPrice: 0,
            category: 'Credit Repayment',
          });
        });
      }
    });

    return list;
  }, [sales, activeBranchFilter, dateFilter, searchQuery]);

  // Unpack settled Supplier RMA Cash/Bank Refunds matching the date & branch filter
  const matchingRmaRefundLines = useMemo(() => {
    if (!supplierReturns || supplierReturns.length === 0) return [];
    const list: StatementItemLine[] = [];

    supplierReturns.forEach((ret) => {
      // Only completed RMA cash/bank refunds
      if (ret.status === 'COMPLETED' && ret.resolutionType === 'REFUNDED') {
        const rDate = ret.settlementDate || ret.date;
        if (!rDate) return;
        if (!isDateWithinFilter(rDate, dateFilter)) return;
        if (activeBranchFilter !== 'ALL' && ret.branchId && ret.branchId !== activeBranchFilter) return;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSup = (ret.supplierName || '').toLowerCase().includes(q);
          const matchItem = (ret.itemName || '').toLowerCase().includes(q);
          const matchCode = (ret.returnCode || ret.returnNo || '').toLowerCase().includes(q);
          if (!matchSup && !matchItem && !matchCode) return;
        }

        const refundAmt = ret.refundAmount || ret.totalAmount || 0;
        if (refundAmt <= 0) return;

        const isBank = (ret.settledAccountId && ret.settledAccountId.includes('bank')) || (ret.refundAccountId && ret.refundAccountId.includes('bank'));

        list.push({
          id: `rma-refund-${ret.id}`,
          invoiceNo: ret.returnCode || ret.returnNo || `RMA-${ret.id.slice(-4)}`,
          itemName: `[RMA Cash Refund] ${ret.itemName} (${ret.supplierName})`,
          deviceSerial: ret.imeiList && ret.imeiList.length > 0 ? ret.imeiList.join(', ') : undefined,
          sku: ret.sku || 'RMA-REFUND',
          quantity: ret.quantity || 1,
          saleType: 'PRODUCT',
          employeeName: ret.performedBy || 'Admin',
          paymentMethod: isBank ? 'KBZPay / Bank' : 'Cash',
          cashAmount: isBank ? 0 : refundAmt,
          bankAmount: isBank ? refundAmt : 0,
          bankType: isBank ? 'Bank Transfer' : undefined,
          taxAmount: 0,
          salePrice: refundAmt,
          paidAmount: refundAmt,
          costPrice: 0,
          category: 'Supplier RMA Refund',
        });
      }
    });

    return list;
  }, [supplierReturns, activeBranchFilter, dateFilter, searchQuery]);

  // Unpack settled Supplier Benefits & Claims (Cashback, Rebates, Policy Bonus) deposited into Cash/Bank
  const matchingBenefitLines = useMemo(() => {
    if (!supplierBenefits || supplierBenefits.length === 0) return [];
    const list: StatementItemLine[] = [];

    supplierBenefits.forEach((ben) => {
      // Only settled benefits that deposited into Cash/Bank Treasury
      if (ben.status === 'SETTLED' && ben.settleAction === 'DEPOSIT_TREASURY') {
        const bDate = ben.settlementDate || ben.date;
        if (!bDate) return;
        if (!isDateWithinFilter(bDate, dateFilter)) return;
        if (activeBranchFilter !== 'ALL' && ben.branchId && ben.branchId !== activeBranchFilter) return;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSup = (ben.supplierName || '').toLowerCase().includes(q);
          const matchCat = (ben.category || '').toLowerCase().includes(q);
          const matchClaim = (ben.claimNo || '').toLowerCase().includes(q);
          const matchNote = (ben.notes || '').toLowerCase().includes(q);
          if (!matchSup && !matchCat && !matchClaim && !matchNote) return;
        }

        const amt = ben.amount || 0;
        if (amt <= 0) return;

        const isBank = (ben.accountId && ben.accountId.includes('bank')) || (ben.accountName && ben.accountName.toLowerCase().includes('bank'));

        list.push({
          id: `supplier-benefit-${ben.id}`,
          invoiceNo: ben.claimNo || ben.referenceNo || `BEN-${ben.id.slice(-4)}`,
          itemName: `[Supplier Claim Settled] ${ben.category} (${ben.supplierName})`,
          sku: 'BENEFIT-CLAIM',
          quantity: 1,
          saleType: 'PRODUCT',
          employeeName: ben.recordedBy || 'Admin',
          paymentMethod: isBank ? 'KBZPay / Bank' : 'Cash',
          cashAmount: isBank ? 0 : amt,
          bankAmount: isBank ? amt : 0,
          bankType: isBank ? 'Bank Transfer' : undefined,
          taxAmount: 0,
          salePrice: amt,
          paidAmount: amt,
          costPrice: 0,
          category: 'Supplier Benefit / Claim',
        });
      }
    });

    return list;
  }, [supplierBenefits, activeBranchFilter, dateFilter, searchQuery]);

  // Aggregate stats including Credit Repayments, RMA Refunds and Supplier Benefit Inflows so daily cash inflow matches cash drawer!
  const totalRepaymentsCollected = matchingRepaymentLines.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
  const totalRepaymentsCash = matchingRepaymentLines.reduce((acc, r) => acc + (r.cashAmount || 0), 0);
  const totalRepaymentsBank = matchingRepaymentLines.reduce((acc, r) => acc + (r.bankAmount || 0), 0);

  const totalRmaRefundsCollected = matchingRmaRefundLines.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
  const totalRmaRefundsCash = matchingRmaRefundLines.reduce((acc, r) => acc + (r.cashAmount || 0), 0);
  const totalRmaRefundsBank = matchingRmaRefundLines.reduce((acc, r) => acc + (r.bankAmount || 0), 0);

  const totalBenefitsCollected = matchingBenefitLines.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
  const totalBenefitsCash = matchingBenefitLines.reduce((acc, r) => acc + (r.cashAmount || 0), 0);
  const totalBenefitsBank = matchingBenefitLines.reduce((acc, r) => acc + (r.bankAmount || 0), 0);

  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
  const totalCollectedSales = filteredSales.reduce((acc, s) => acc + (s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0)), 0);
  const totalCollectedCash = totalCollectedSales + totalRepaymentsCollected + totalRmaRefundsCollected + totalBenefitsCollected;
  const totalOutstandingCredit = Math.max(0, totalSalesRevenue - totalCollectedSales);
  const productSalesRev = filteredSales.filter(s => s.saleType !== 'SERVICE').reduce((acc, s) => acc + (s.salePrice || 0), 0);
  const serviceSalesRev = filteredSales.filter(s => s.saleType === 'SERVICE').reduce((acc, s) => acc + (s.salePrice || 0), 0);

  // Cash vs Bank split across filtered sales + repayments + RMA refunds + Supplier Benefits
  const salesCashInflow = filteredSales.reduce((acc, s) => {
    if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
    if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
    return acc;
  }, 0);
  const totalCashInflow = salesCashInflow + totalRepaymentsCash + totalRmaRefundsCash + totalBenefitsCash;

  const salesBankInflow = filteredSales.reduce((acc, s) => {
    if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
    if (s.paymentMethod !== 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
    return acc;
  }, 0);
  const totalBankInflow = salesBankInflow + totalRepaymentsBank + totalRmaRefundsBank + totalBenefitsBank;

  // Realized Gross Profit
  const totalRealizedProfit = filteredSales.reduce((acc, s) => {
    const sale = s.salePrice || 0;
    const profit = s.profit || 0;
    const paid = s.paidAmount !== undefined ? s.paidAmount : sale;
    if (sale <= 0) return acc;
    const ratio = Math.min(1, Math.max(0, paid / sale));
    return acc + (profit * ratio);
  }, 0);
  const profitMargin = totalCollectedCash > 0 ? ((totalRealizedProfit / totalCollectedCash) * 100).toFixed(1) : '0';

  // Categorized Groups for the Statement View (1. Service Income, 2. Mobile, 3. Laptop, 4. Accessories, 5. Service Spare Part, 6. Credit Repayments, 7. Supplier RMA Refunds)
  const categorizedSections = useMemo(() => {
    // Unpack all filtered sales into line-by-line item rows
    const allLines: StatementItemLine[] = filteredSales.flatMap(s => unpackSaleToStatementLines(s));

    // 1. Service Income / Service Charges
    const s1Services = allLines.filter(line => 
      line.saleType === 'SERVICE' || 
      line.category === 'Service Charges' || 
      line.category === 'Service Income' ||
      (line.sku && (line.sku.startsWith('400') || line.sku.startsWith('800'))) ||
      (line.itemName && line.itemName.toLowerCase().includes('service charge')) ||
      (line.itemName && line.itemName.toLowerCase().includes('service /'))
    );

    const productLines = allLines.filter(line => !s1Services.includes(line));

    // 5. Service Spare Part (Code 500001+)
    const s5SpareParts = productLines.filter(line =>
      line.category === 'Service Spare Part' ||
      line.category === 'Spare Parts & Hardware' ||
      line.category.toLowerCase().includes('spare') ||
      (line.sku && line.sku.startsWith('500'))
    );

    const nonSpareLines = productLines.filter(line => !s5SpareParts.includes(line));

    // 2. Mobile (Code 100001+)
    const s2Mobile = nonSpareLines.filter(line => {
      const cat = (line.category || '').toLowerCase();
      const name = (line.itemName || '').toLowerCase();
      const sku = line.sku || '';

      return (
        line.category === 'Mobile' ||
        cat.includes('smartphones') ||
        cat.includes('phone') ||
        cat.includes('mobile') ||
        cat.includes('tablet') ||
        sku.startsWith('100') ||
        name.includes('iphone') ||
        name.includes('samsung') ||
        name.includes('oppo') ||
        name.includes('vivo') ||
        name.includes('redmi') ||
        name.includes('xiaomi') ||
        name.includes('realme') ||
        name.includes('infinix') ||
        name.includes('tecno')
      );
    });

    const nonMobileLines = nonSpareLines.filter(line => !s2Mobile.includes(line));

    // 3. Laptop (Code 200001+)
    const s3Laptop = nonMobileLines.filter(line => {
      const cat = (line.category || '').toLowerCase();
      const name = (line.itemName || '').toLowerCase();
      const sku = line.sku || '';

      return (
        line.category === 'Laptop' ||
        cat.includes('laptop') ||
        cat.includes('computer') ||
        sku.startsWith('200') ||
        name.includes('macbook') ||
        name.includes('thinkpad') ||
        name.includes('notebook')
      );
    });

    // 4. Accessories (Code 300001+)
    const s4Accessories = nonMobileLines.filter(line => !s3Laptop.includes(line));

    const sections = [
      {
        id: 'SEC-1',
        title: '1. SERVICE INCOME',
        categoryKey: 'SERVICE',
        subtitle: 'Repair, Maintenance, Labor & Technical Service Charges',
        isService: true,
        items: s1Services,
      },
      {
        id: 'SEC-2',
        title: '2. MOBILE',
        categoryKey: 'MOBILE',
        subtitle: 'Smartphones, Feature Phones, Tablets & Handsets',
        isService: false,
        items: s2Mobile,
      },
      {
        id: 'SEC-3',
        title: '3. LAPTOP',
        categoryKey: 'LAPTOP',
        subtitle: 'Laptops, Notebooks, MacBooks & Desktop Computers',
        isService: false,
        items: s3Laptop,
      },
      {
        id: 'SEC-4',
        title: '4. ACCESSORIES',
        categoryKey: 'ACCESSORIES',
        subtitle: 'Chargers, Cases, Audio, Cables, Power Banks, Batteries & Retail Items',
        isService: false,
        items: s4Accessories,
      },
      ...(s5SpareParts.length > 0 ? [{
        id: 'SEC-5',
        title: '5. SERVICE SPARE PART',
        categoryKey: 'SPARE_PARTS',
        subtitle: 'Screens, Batteries, ICs, Ribbon Cables & Hardware Parts',
        isService: false,
        items: s5SpareParts,
      }] : []),
      ...(matchingRepaymentLines.length > 0 ? [{
        id: 'SEC-6',
        title: '6. CREDIT REPAYMENTS',
        categoryKey: 'CREDIT_REPAYMENT',
        subtitle: 'Customer Credit & Debt Repayment Collections on Historical Vouchers',
        isService: false,
        items: matchingRepaymentLines,
      }] : []),
      ...(matchingRmaRefundLines.length > 0 ? [{
        id: 'SEC-7',
        title: '7. SUPPLIER REFUNDS & RMA INFLOWS',
        categoryKey: 'SUPPLIER_REFUND',
        subtitle: 'RMA Cash & Bank Refund Collections Settled by Suppliers',
        isService: false,
        items: matchingRmaRefundLines,
      }] : []),
      ...(matchingBenefitLines.length > 0 ? [{
        id: 'SEC-8',
        title: '8. SUPPLIER BENEFITS & CLAIMS RECEIVED',
        categoryKey: 'SUPPLIER_BENEFIT',
        subtitle: 'Cashback, Rebates, Promotion Subsidies & Policy Bonuses Settled into Treasury',
        isService: false,
        items: matchingBenefitLines,
      }] : []),
    ];

    return sections;
  }, [filteredSales, matchingRepaymentLines, matchingRmaRefundLines, matchingBenefitLines]);

  // Export structured Sales Statement Report directly to Excel / CSV
  const handleExportSalesStatement = () => {
    const branchObj = activeBranchFilter !== 'ALL' ? branches.find((b) => b.id === activeBranchFilter) : null;
    const branchName = branchObj ? branchObj.name : (currentUser.branchId !== 'ALL' ? branches.find(b => b.id === currentUser.branchId)?.name : 'All Branches');
    
    let periodText = 'All Historical Records';
    if (dateFilter.preset === 'DAILY') {
      periodText = `Date: ${formatDateDMY(dateFilter.startDate || todayStr)}`;
    } else if (dateFilter.preset === 'RANGE') {
      periodText = `${formatDateDMY(dateFilter.startDate)} ~ ${formatDateDMY(dateFilter.endDate)}`;
    }

    exportSalesStatementReportToCSV(categorizedSections, {
      branchName,
      periodText,
      dateStr: dateFilter.preset === 'DAILY' ? (dateFilter.startDate || todayStr) : todayStr,
      totalCashInflow,
      totalBankInflow,
      totalSalesRevenue
    });
  };

  // Export structured Sales Statement Report directly to PDF
  const handleExportSalesStatementPDF = () => {
    const branchObj = activeBranchFilter !== 'ALL' ? branches.find((b) => b.id === activeBranchFilter) : null;
    const branchName = branchObj ? branchObj.name : (currentUser.branchId !== 'ALL' ? branches.find(b => b.id === currentUser.branchId)?.name : 'All Branches');
    
    let periodText = 'All Historical Records';
    if (dateFilter.preset === 'DAILY') {
      periodText = `Date: ${formatDateDMY(dateFilter.startDate || todayStr)}`;
    } else if (dateFilter.preset === 'RANGE') {
      periodText = `${formatDateDMY(dateFilter.startDate)} ~ ${formatDateDMY(dateFilter.endDate)}`;
    }

    exportSalesStatementReportToPDF(categorizedSections, {
      branchName,
      periodText,
      dateStr: dateFilter.preset === 'DAILY' ? (dateFilter.startDate || todayStr) : todayStr,
      totalCashInflow,
      totalBankInflow,
      totalSalesRevenue
    });
  };

  const handleInitiateVoidSale = (sale: DailySale) => {
    // Open in-app void confirmation modal for iframe compatibility
    setPendingVoidSale(sale);
    setIsManagerAuthOpen(true);
  };

  const handleConfirmVoid = (authorizedBy: string, reason: string) => {
    if (pendingVoidSale) {
      onDeleteSale(pendingVoidSale.id, { authorizedBy, reason });
    }
    setPendingVoidSale(null);
    setIsManagerAuthOpen(false);
  };

  // Branch-specific memoized staff lists for modal forms
  const productSalesStaff = useMemo(() => {
    return getSalesStaffOptions(productForm.branchId);
  }, [employees, users, productForm.branchId]);

  const productCashierStaff = useMemo(() => {
    return getBranchCashierStaff(employees, productForm.branchId);
  }, [employees, productForm.branchId]);

  const productFinanceStaff = useMemo(() => {
    return getBranchFinanceStaff(employees, productForm.branchId);
  }, [employees, productForm.branchId]);

  const serviceTechnicians = useMemo(() => {
    return getServiceTechniciansOptions(serviceForm.branchId);
  }, [employees, users, serviceForm.branchId]);

  const serviceCashierStaff = useMemo(() => {
    return getBranchCashierStaff(employees, serviceForm.branchId);
  }, [employees, serviceForm.branchId]);

  const serviceFinanceStaff = useMemo(() => {
    return getBranchFinanceStaff(employees, serviceForm.branchId);
  }, [employees, serviceForm.branchId]);

  const handleOpenAddModal = (initialType: SaleType = 'PRODUCT') => {
    const defaultBranchId = !hasGlobalBranchAccess(currentUser)
      ? (currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || 'branch-1'))
      : (activeBranchFilter !== 'ALL' ? activeBranchFilter : (currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || 'branch-1')));
    const defaultBranch = branches.find(b => b.id === defaultBranchId);
    const targetDate = (dateFilter.preset === 'DAILY' ? dateFilter.startDate : '') || new Date().toISOString().split('T')[0];
    const generatedInv = generateDailySalesInvoiceNo(targetDate, sales, defaultBranchId, defaultBranch?.name);

    // Pick branch-specific sales staff and service technician
    const branchSalesStaff = getSalesStaffOptions(defaultBranchId);
    const defaultSalesStaff = branchSalesStaff.length > 0 ? branchSalesStaff[0].name : (staffOptions[0]?.name || currentUser.displayName);

    const branchTechStaff = getServiceTechniciansOptions(defaultBranchId);
    const defaultTech = branchTechStaff.length > 0 ? branchTechStaff[0].name : (staffOptions[0]?.name || currentUser.displayName);

    const defaultCashier = getDefaultCashierForBranch(employees, defaultBranchId);
    const defaultFinance = getDefaultFinanceForBranch(employees, defaultBranchId);

    setModalSaleType(initialType);
    setSelectedInventoryId('');
    setSparePartInventoryId('');
    setQuantity(1);
    setProductSerials(['']);
    setProductCode('');
    setIsProductSuggestionsOpen(false);

    const initialProductCat = 'Smartphones & Tablets';
    const initialProductSku = generateAutoSKU(initialProductCat, inventory, sales);
    const initialServiceSku = generateAutoSKU('Service Charges', inventory, sales);

    setProductForm({
      date: targetDate,
      invoiceNo: generatedInv,
      branchId: defaultBranchId,
      category: initialProductCat,
      itemName: '',
      sku: initialProductSku,
      unitCostPrice: 0,
      unitSalePrice: 0,
      discount: 0,
      cashback: 0,
      paymentMethod: 'Cash',
      cashAmount: 0,
      bankAmount: 0,
      bankType: 'KBZPay',
      paymentStatus: 'PAID',
      paidAmount: 0,
      employeeName: defaultSalesStaff,
      cashierName: defaultCashier,
      financeName: defaultFinance,
      warranty: '1 Year',
      deviceSerial: '',
      customerName: '',
      customerPhone: '',
      customerTownship: '',
      notes: '',
    });

    setServiceForm({
      date: targetDate,
      invoiceNo: generatedInv,
      branchId: defaultBranchId,
      sku: initialServiceSku,
      deviceModel: '',
      deviceSerial: '',
      issueDescription: '',
      serviceLaborFee: 0,
      hasSparePart: false,
      sparePartSku: generateAutoSKU('Service Spare Part', inventory, sales),
      sparePartsCost: 0,
      sparePartsPrice: 0,
      sparePartsUsed: '',
      technicianName: defaultTech,
      cashierName: defaultCashier,
      financeName: defaultFinance,
      serviceStatus: 'COMPLETED',
      paymentMethod: 'Cash',
      cashAmount: 0,
      bankAmount: 0,
      bankType: 'KBZPay',
      paymentStatus: 'PAID',
      paidAmount: 0,
      customerName: '',
      customerPhone: '',
      customerTownship: '',
      warranty: 'No Warranty',
      notes: '',
    });

    setAdditionalProductLines([]);
    setIsProductPaidManual(false);
    setCreditInstallmentMonths(1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sale: DailySale) => {
    setEditingSale(sale);
    setModalSaleType(sale.saleType || 'PRODUCT');
    setIsProductSuggestionsOpen(false);
    setCreditInstallmentMonths(sale.totalInstallments || (sale.installments && sale.installments.length > 0 ? sale.installments.length : 1));

    if (sale.saleType === 'SERVICE') {
      const partsUsed = sale.sparePartsUsed || '';
      const partsPrice = Number(sale.sparePartsPrice) || 0;
      const partsCost = Number(sale.sparePartsCost) || 0;
      const labor = Number(sale.serviceLaborFee) || Math.max(0, (sale.salePrice || 0) - partsPrice);
      const servicePaid = sale.paidAmount ?? sale.salePrice;
      const isServiceCash = sale.paymentMethod === 'Cash';
      const svcCash = sale.cashAmount !== undefined && sale.cashAmount > 0 ? sale.cashAmount : (isServiceCash ? servicePaid : 0);
      const svcBank = sale.bankAmount !== undefined && sale.bankAmount > 0 ? sale.bankAmount : (!isServiceCash ? servicePaid : 0);
      setServiceForm({
        branchId: sale.branchId,
        date: sale.date,
        invoiceNo: sale.invoiceNo,
        customerName: sale.customerName || '',
        customerPhone: sale.customerPhone || '',
        customerTownship: sale.township || '',
        deviceModel: sale.deviceModel || (sale.itemName.replace('Service / ', '')) || '',
        deviceSerial: sale.deviceSerial || '',
        issueDescription: sale.issueDescription || '',
        serviceLaborFee: labor,
        sparePartsPrice: partsPrice,
        sparePartsCost: partsCost,
        sparePartsUsed: partsUsed,
        sparePartSku: sale.sparePartSku || (partsUsed ? '500001' : ''),
        hasSparePart: !!(partsUsed || partsPrice > 0),
        technicianName: sale.technicianName || sale.employeeName || '',
        cashierName: sale.cashierName || getDefaultCashierForBranch(employees, sale.branchId),
        financeName: sale.financeName || getDefaultFinanceForBranch(employees, sale.branchId),
        paymentMethod: sale.paymentMethod || 'Cash',
        cashAmount: svcCash,
        bankAmount: svcBank,
        bankType: sale.bankType || (sale.paymentMethod !== 'Cash' ? sale.paymentMethod : 'KBZPay'),
        paidAmount: servicePaid,
        paymentStatus: sale.paymentStatus || 'PAID',
        serviceStatus: sale.serviceStatus || 'COMPLETED',
        warranty: sale.warranty || 'No Warranty',
        notes: sale.notes || '',
        sku: sale.sku || '400001',
      });
      setSparePartInventoryId(sale.inventoryItemId || '');
      setAdditionalProductLines([]);
    } else {
      const item1 = sale.items && sale.items.length > 0 ? sale.items[0] : null;
      const unitCost = item1?.costPrice !== undefined 
        ? item1.costPrice 
        : (sale.costPrice && sale.quantity ? Math.round(sale.costPrice / sale.quantity) : 0);
      const rawSubtotal = (sale.salePrice || 0) + (sale.discount || 0) + (sale.cashback || 0);
      const unitSale = item1?.unitPrice !== undefined 
        ? item1.unitPrice 
        : (sale.quantity ? Math.round(rawSubtotal / sale.quantity) : rawSubtotal);
      const line1Disc = item1?.discount !== undefined ? item1.discount : (sale.discount || 0);
      const line1Cashback = item1?.cashback !== undefined 
        ? item1.cashback 
        : (sale.cashback && sale.quantity ? Math.round(sale.cashback / sale.quantity) : (sale.cashback || 0));
      const productPaid = sale.paidAmount ?? sale.salePrice;
      const isProductCash = sale.paymentMethod === 'Cash';
      const prodCash = sale.cashAmount !== undefined && sale.cashAmount > 0 ? sale.cashAmount : (isProductCash ? productPaid : 0);
      const prodBank = sale.bankAmount !== undefined && sale.bankAmount > 0 ? sale.bankAmount : (!isProductCash ? productPaid : 0);
      setProductForm({
        branchId: sale.branchId,
        date: sale.date,
        invoiceNo: sale.invoiceNo,
        customerName: sale.customerName || '',
        customerPhone: sale.customerPhone || '',
        customerTownship: sale.township || '',
        category: item1?.category || sale.category || 'Smartphones & Tablets',
        itemName: item1?.name || sale.itemName,
        sku: item1?.sku || sale.sku || '',
        unitCostPrice: unitCost,
        unitSalePrice: unitSale,
        discount: line1Disc,
        cashback: line1Cashback,
        paymentMethod: sale.paymentMethod || 'Cash',
        cashAmount: prodCash,
        bankAmount: prodBank,
        bankType: sale.bankType || (sale.paymentMethod !== 'Cash' ? sale.paymentMethod : 'KBZPay'),
        paidAmount: productPaid,
        paymentStatus: sale.paymentStatus || 'PAID',
        employeeName: sale.employeeName || sale.salespersonName || '',
        cashierName: sale.cashierName || getDefaultCashierForBranch(employees, sale.branchId),
        financeName: sale.financeName || getDefaultFinanceForBranch(employees, sale.branchId),
        warranty: item1?.warranty || sale.warranty || '1 Year',
        deviceSerial: sale.deviceSerial || '',
        notes: sale.notes || '',
      });
      const editQty = item1?.quantity || sale.quantity || 1;
      setQuantity(editQty);
      let initialSerials: string[] = [];
      if (sale.deviceSerials && sale.deviceSerials.length > 0) {
        initialSerials = [...sale.deviceSerials];
      } else if (sale.deviceSerial) {
        const parts = sale.deviceSerial.split(/[,|\n\r]+/).map(s => s.replace(/(?:IMEI\s*\d*|SN\s*\d*|Serial\s*\d*):/gi, '').trim()).filter(Boolean);
        initialSerials = parts.length > 0 ? parts : [sale.deviceSerial];
      }
      while (initialSerials.length < editQty) {
        initialSerials.push('');
      }
      setProductSerials(initialSerials.slice(0, editQty));
      setSelectedInventoryId(sale.inventoryItemId || '');

      if (sale.items && sale.items.length > 1) {
        const addLines: AdditionalProductLine[] = sale.items.slice(1).map((it, idx) => {
          const lQty = it.quantity || 1;
          let lSerials: string[] = [];
          if (it.imeiOrSerial) {
            lSerials = it.imeiOrSerial.split(/[,;\n\/|]+/).map(s => s.trim()).filter(Boolean);
          }
          while (lSerials.length < lQty) {
            lSerials.push('');
          }
          return {
            id: it.id || `line-${Date.now()}-${idx}`,
            inventoryItemId: it.inventoryItemId || '',
            itemName: it.name,
            category: it.category || 'Smartphones & Tablets',
            sku: it.sku || '',
            unitCostPrice: it.costPrice || 0,
            unitSalePrice: it.unitPrice || 0,
            quantity: lQty,
            discount: it.discount || 0,
            cashback: it.cashback || 0,
            warranty: it.warranty || '1 Year',
            serials: lSerials.slice(0, lQty),
          };
        });
        setAdditionalProductLines(addLines);
      } else {
        setAdditionalProductLines([]);
      }
      const isFull = (sale.paidAmount ?? sale.salePrice) >= (sale.salePrice || 0);
      setIsProductPaidManual(!isFull);
    }

    setIsModalOpen(true);
  };

  // Multi-Model Line Handlers
  const handleAddProductLine = () => {
    const defaultCat = productForm.category || 'Smartphones & Tablets';
    const autoCode = generateAutoSKU(defaultCat, inventory, sales);
    setAdditionalProductLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        inventoryItemId: '',
        itemName: '',
        category: defaultCat,
        sku: autoCode,
        unitCostPrice: 0,
        unitSalePrice: 0,
        quantity: 1,
        discount: 0,
        warranty: '1 Year',
        serials: [''],
      },
    ]);
  };

  const handleRemoveProductLine = (lineId: string) => {
    setAdditionalProductLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const handleUpdateProductLine = (lineId: string, updates: Partial<AdditionalProductLine>) => {
    setAdditionalProductLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, ...updates } : l))
    );
  };

  const handleAddLineUnit = (lineId: string) => {
    setAdditionalProductLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          quantity: l.quantity + 1,
          serials: [...l.serials, ''],
        };
      })
    );
  };

  const handleRemoveLineUnit = (lineId: string, unitIdx: number) => {
    setAdditionalProductLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        if (l.quantity <= 1) return l;
        return {
          ...l,
          quantity: l.quantity - 1,
          serials: l.serials.filter((_, i) => i !== unitIdx),
        };
      })
    );
  };

  const handleLineSerialChange = (lineId: string, unitIdx: number, val: string) => {
    if (val.includes(',') || val.includes('\n') || val.includes('|')) {
      const parts = val.split(/[,|\n\r]+/).map(s => s.replace(/(?:IMEI\s*\d*|SN\s*\d*|Serial\s*\d*):/gi, '').trim()).filter(Boolean);
      if (parts.length > 1) {
        setAdditionalProductLines((prev) =>
          prev.map((l) => {
            if (l.id !== lineId) return l;
            const nextSerials = [...l.serials];
            parts.forEach((p, pIdx) => {
              const targetSlot = unitIdx + pIdx;
              if (targetSlot < nextSerials.length) {
                nextSerials[targetSlot] = p;
              } else {
                nextSerials.push(p);
              }
            });
            const newQty = Math.max(l.quantity, nextSerials.length);
            return {
              ...l,
              quantity: newQty,
              serials: nextSerials,
            };
          })
        );
        return;
      }
    }

    setAdditionalProductLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const newSerials = [...l.serials];
        newSerials[unitIdx] = val;
        return {
          ...l,
          serials: newSerials,
        };
      })
    );
  };

  const handleSelectLineInventoryItem = (lineId: string, item: InventoryItem) => {
    let resolvedWarranty = resolveItemWarranty(
      item.sku,
      item.brand,
      item.category,
      item.name,
      item.warranty
    );

    if (resolvedWarranty !== 'No Warranty' && (!resolvedWarranty || resolvedWarranty === '-' || resolvedWarranty.toLowerCase() === 'no warranty')) {
      if (purchases && purchases.length > 0) {
        for (const po of purchases) {
          const pi = po.items?.find((p) => 
            (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) || 
            (p.name && item.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim())
          );
          if (pi?.warranty && pi.warranty.trim() && pi.warranty.trim() !== '-' && !pi.warranty.toLowerCase().includes('no warranty')) {
            resolvedWarranty = resolveItemWarranty(item.sku, item.brand, item.category, item.name, pi.warranty.trim());
            break;
          }
        }
      }
    }

    setAdditionalProductLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          inventoryItemId: item.id,
          itemName: item.name,
          category: item.category,
          sku: item.sku,
          unitCostPrice: item.costPrice || 0,
          unitSalePrice: item.sellingPrice || 0,
          warranty: resolvedWarranty,
          serials: item.imeiOrSerial ? [item.imeiOrSerial] : l.serials,
        };
      })
    );
    setActiveLineSuggestionId(null);
  };

  // Autocomplete suggestions
  const matchingProducts = inventory.filter((item) => {
    if (!productForm.itemName || productForm.itemName.trim().length === 0) return false;
    const q = productForm.itemName.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.brand && item.brand.toLowerCase().includes(q))
    );
  }).slice(0, 8);

  const handleSelectProductItem = (item: InventoryItem) => {
    setSelectedInventoryId(item.id);
    setProductCode(item.sku);

    // Resolve warranty from inventory item or linked POs
    let resolvedWarranty = resolveItemWarranty(
      item.sku,
      item.brand,
      item.category,
      item.name,
      item.warranty
    );

    if (resolvedWarranty !== 'No Warranty' && (!resolvedWarranty || resolvedWarranty === '-' || resolvedWarranty.toLowerCase() === 'no warranty')) {
      if (purchases && purchases.length > 0) {
        for (const po of purchases) {
          const pi = po.items?.find((p) => 
            (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) || 
            (p.name && item.name && p.name.toLowerCase().trim() === item.name.toLowerCase().trim())
          );
          if (pi?.warranty && pi.warranty.trim() && pi.warranty.trim() !== '-' && !pi.warranty.toLowerCase().includes('no warranty')) {
            resolvedWarranty = resolveItemWarranty(item.sku, item.brand, item.category, item.name, pi.warranty.trim());
            break;
          }
        }
      }
    }

    setProductForm((prev) => ({
      ...prev,
      category: item.category,
      itemName: item.name,
      sku: item.sku,
      unitCostPrice: item.costPrice,
      unitSalePrice: item.sellingPrice,
      warranty: resolvedWarranty,
      notes: item.imeiOrSerial ? item.imeiOrSerial : (prev.notes || ''),
    }));
    setIsProductSuggestionsOpen(false);
  };

  const handleProductCodeInput = (code: string) => {
    setProductCode(code);
    if (!code.trim()) return;
    const matched = inventory.find((i) => i.sku.toLowerCase() === code.trim().toLowerCase());
    if (matched) {
      handleSelectProductItem(matched);
    }
  };

  const handleSelectSparePart = (itemId: string) => {
    setSparePartInventoryId(itemId);
    if (!itemId) {
      setServiceForm((prev) => ({
        ...prev,
        hasSparePart: false,
        sparePartsCost: 0,
        sparePartsPrice: 0,
        sparePartsUsed: '',
        paidAmount: Number(prev.serviceLaborFee || 0),
      }));
      return;
    }
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    setServiceForm((prev) => ({
      ...prev,
      hasSparePart: true,
      sparePartSku: item.sku || generateAutoSKU('Service Spare Part', inventory, sales),
      sparePartsCost: item.costPrice,
      sparePartsPrice: item.sellingPrice,
      sparePartsUsed: item.name,
      paidAmount: Number(prev.serviceLaborFee || 0) + Number(item.sellingPrice || 0),
    }));
  };

  const getSelectedProductBranchStock = (): number => {
    if (!selectedInventoryId) return 999;
    const item = inventory.find((i) => i.id === selectedInventoryId);
    if (!item || !item.branchStock) return 0;
    return getAvailableStockForBranch(item, productForm.branchId);
  };

  const currentAvailableStock = getSelectedProductBranchStock();

  const activeProductItem = useMemo(() => {
    if (selectedInventoryId) {
      const found = inventory.find((i) => i.id === selectedInventoryId);
      if (found) return found;
    }
    const nameQ = productForm.itemName.trim().toLowerCase();
    const skuQ = (productForm.sku || productCode || '').trim().toLowerCase();
    if (!nameQ && !skuQ) return null;
    return (
      inventory.find(
        (i) =>
          (skuQ && i.sku.toLowerCase() === skuQ) ||
          (nameQ && i.name.toLowerCase() === nameQ) ||
          (nameQ && i.model && i.model.toLowerCase() === nameQ)
      ) || null
    );
  }, [selectedInventoryId, productForm.itemName, productForm.sku, productCode, inventory]);

  // Set of all IMEIs that have already been sold in previous non-voided vouchers
  const soldImeisSet = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.isVoided) return;
      if (editingSale && s.id === editingSale.id) return;

      if (s.deviceSerial) {
        s.deviceSerial.split(/[,;\n\r\/|]+/).forEach((sn) => {
          const cleaned = sn.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase();
          if (cleaned) set.add(cleaned);
        });
      }

      if (s.items && Array.isArray(s.items)) {
        s.items.forEach((it) => {
          if (it.serial) {
            const cleaned = it.serial.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase();
            if (cleaned) set.add(cleaned);
          }
          if (Array.isArray(it.serials)) {
            it.serials.forEach((sn) => {
              const cleaned = sn.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase();
              if (cleaned) set.add(cleaned);
            });
          }
        });
      }
    });
    return set;
  }, [sales, editingSale]);

  const mainItemStockImeis = useMemo(() => {
    if (!activeProductItem) return [];
    return getInStockImeisForBranch(activeProductItem, productForm.branchId, {
      purchases,
      transfers: interBranchTransfers,
      supplierReturns,
      sales,
      soldImeisSet,
    });
  }, [activeProductItem, productForm.branchId, purchases, interBranchTransfers, supplierReturns, sales, soldImeisSet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalSaleType === 'PRODUCT') {
      if (!productForm.itemName.trim()) {
        alert('Please enter or select a product name.');
        return;
      }
      if (productForm.unitSalePrice <= 0) {
        alert('Please enter unit selling price.');
        return;
      }
      // Hard block: Out of stock or quantity exceeding available stock is strictly prevented
      if (selectedInventoryId && (currentAvailableStock <= 0 || quantity > currentAvailableStock)) {
        alert(
          `❌ Out of stock or requested quantity exceeds available inventory!\n\nCurrent Branch Stock: ${currentAvailableStock} Units\nRequested Quantity: ${quantity} Units\n\nVoucher creation for items without sufficient stock is blocked. Please verify inventory stock.`
        );
        return;
      }

      // Check additional product lines stock
      for (const line of additionalProductLines) {
        if (line.inventoryItemId) {
          const invItem = inventory.find(i => i.id === line.inventoryItemId);
          if (invItem) {
            const avail = productForm.branchId === 'ALL' ? invItem.totalStock : (invItem.branchStock[productForm.branchId] || 0);
            if (avail <= 0 || line.quantity > avail) {
              alert(
                `❌ Insufficient stock for "${line.itemName}"!\n\nAvailable Stock: ${avail} Units\nRequested Quantity: ${line.quantity} Units\n\nVoucher creation for out of stock items is blocked.`
              );
              return;
            }
          }
        }
      }

      const branch = branches.find((b) => b.id === productForm.branchId);
      const invoiceNumber = productForm.invoiceNo.trim() || generateDailySalesInvoiceNo(productForm.date, sales, productForm.branchId, branch?.name);

      const validSerials = productSerials.map((s) => s.trim()).filter(Boolean);

      // Strict IMEI Validation for Main Product against inventory stock
      if (activeProductItem && mainItemStockImeis.length > 0) {
        if (validSerials.length === 0) {
          alert(
            `⚠️ Device IMEI is required!\n\nProduct "${activeProductItem.name}" has ${mainItemStockImeis.length} in-stock units. Please enter or select a valid IMEI from stock.`
          );
          return;
        }

        const invalidMainImeis = validSerials.filter(
          (s) => !mainItemStockImeis.some((im) => im.toLowerCase() === s.toLowerCase())
        );
        if (invalidMainImeis.length > 0) {
          alert(
            `❌ Invalid IMEI / Not in Stock!\n\nThe following IMEI is not available in stock or has already been sold:\n${invalidMainImeis.join(', ')}\n\nPlease select or enter a valid in-stock IMEI.\n(Available In-Stock IMEIs: ${mainItemStockImeis.slice(0, 5).join(', ')}${mainItemStockImeis.length > 5 ? '...' : ''})`
          );
          return;
        }

        const duplicates = validSerials.filter((s, idx) => validSerials.indexOf(s) !== idx);
        if (duplicates.length > 0) {
          alert(`⚠️ Duplicate IMEI detected: ${duplicates.join(', ')}\nPlease enter a unique IMEI for each unit.`);
          return;
        }

        if (validSerials.length < quantity) {
          alert(
            `⚠️ Please enter all ${quantity} IMEIs for the ${quantity} units being sold. (Currently entered: ${validSerials.length})`
          );
          return;
        }
      }

      // Strict IMEI Validation for Additional Product Lines
      for (let idx = 0; idx < additionalProductLines.length; idx++) {
        const line = additionalProductLines[idx];
        const lInv = inventory.find((i) =>
          (line.inventoryItemId && i.id === line.inventoryItemId) ||
          (line.sku && i.sku.toLowerCase() === line.sku.toLowerCase()) ||
          (line.itemName && i.name.toLowerCase().trim() === line.itemName.toLowerCase().trim())
        );
        const lStockImeis = getInStockImeisForBranch(lInv, productForm.branchId, {
          purchases,
          transfers: interBranchTransfers,
          supplierReturns,
          sales,
          soldImeisSet,
        });

        if (lInv && lStockImeis.length > 0) {
          const lValid = line.serials.map((s) => s.trim()).filter(Boolean);
          if (lValid.length === 0) {
            alert(`⚠️ Device IMEI is required for Item #${idx + 2} (${line.itemName}).`);
            return;
          }
          const invalidL = lValid.filter((s) => !lStockImeis.some((im) => im.toLowerCase() === s.toLowerCase()));
          if (invalidL.length > 0) {
            alert(`❌ Invalid IMEI for Item #${idx + 2} (${line.itemName})!\n\n${invalidL.join(', ')} is not available in stock or already sold.\nPlease enter a valid in-stock IMEI.`);
            return;
          }
          const lDuplicates = lValid.filter((s, sI) => lValid.indexOf(s) !== sI);
          if (lDuplicates.length > 0) {
            alert(`⚠️ Duplicate IMEI for Item #${idx + 2} (${line.itemName}): ${lDuplicates.join(', ')}`);
            return;
          }
          if (lValid.length < (line.quantity || 1)) {
            alert(`⚠️ Please enter all ${line.quantity} IMEIs for Item #${idx + 2} (${line.itemName}).`);
            return;
          }
        }
      }

      const resolvedInventoryItemId = selectedInventoryId || activeProductItem?.id || undefined;
      const line1Cost = (Number(productForm.unitCostPrice) || 0) * quantity;
      const line1SubTotal = (Number(productForm.unitSalePrice) || 0) * quantity;
      const line1Discount = Math.max(0, Number(productForm.discount) || 0);
      const line1Cashback = Math.max(0, Number(productForm.cashback) || 0);

      let totalCost = line1Cost;
      let totalSubTotal = line1SubTotal;
      let totalDiscount = line1Discount;
      let totalCashback = line1Cashback * quantity;
      let totalQuantity = quantity;

      additionalProductLines.forEach((line) => {
        const lQty = line.quantity || 1;
        const lCost = (Number(line.unitCostPrice) || 0) * lQty;
        const lSub = (Number(line.unitSalePrice) || 0) * lQty;
        const lDisc = Math.max(0, Number(line.discount) || 0);
        const lCash = Math.max(0, Number(line.cashback) || 0) * lQty;
        totalCost += lCost;
        totalSubTotal += lSub;
        totalDiscount += lDisc;
        totalCashback += lCash;
        totalQuantity += lQty;
      });

      const totalSale = Math.max(0, totalSubTotal - totalCashback - totalDiscount);
      const profit = totalSale - totalCost;

      const allValidSerials = [
        ...validSerials,
        ...additionalProductLines.flatMap((l) => l.serials.map((s) => s.trim()).filter(Boolean)),
      ];

      const combinedSerial = allValidSerials.length > 0
        ? allValidSerials.join(', ')
        : (productForm.deviceSerial ? productForm.deviceSerial.trim() : undefined);

      // Construct cart items for voucher & reporting
      const cartItems: SaleCartItem[] = [
        {
          id: `item-1-${Date.now()}`,
          inventoryItemId: resolvedInventoryItemId,
          sku: productForm.sku || productCode || activeProductItem?.sku || 'SKU-GEN',
          name: productForm.itemName.trim(),
          category: productForm.category,
          quantity: quantity,
          unitPrice: Number(productForm.unitSalePrice) || 0,
          costPrice: Number(productForm.unitCostPrice) || 0,
          discount: line1Discount,
          cashback: line1Cashback > 0 ? line1Cashback : undefined,
          total: Math.max(0, line1SubTotal - (line1Cashback * quantity) - line1Discount),
          warranty: productForm.warranty ? productForm.warranty.trim() : resolveItemWarranty(productForm.sku || productCode || activeProductItem?.sku, undefined, productForm.category, productForm.itemName, activeProductItem?.warranty, '1 Year'),
          imeiOrSerial: validSerials.join(', '),
        },
        ...additionalProductLines.map((line, idx) => {
          const lQty = line.quantity || 1;
          const lSub = (Number(line.unitSalePrice) || 0) * lQty;
          const lDisc = Math.max(0, Number(line.discount) || 0);
          const lCash = Math.max(0, Number(line.cashback) || 0);
          const lSerials = line.serials.map((s) => s.trim()).filter(Boolean);
          const lInv = inventory.find((i) =>
            (line.inventoryItemId && i.id === line.inventoryItemId) ||
            (line.sku && i.sku.toLowerCase() === line.sku.toLowerCase()) ||
            (line.itemName && i.name.toLowerCase().trim() === line.itemName.toLowerCase().trim())
          );
          return {
            id: line.id || `item-${idx + 2}-${Date.now()}`,
            inventoryItemId: line.inventoryItemId || lInv?.id || undefined,
            sku: line.sku || lInv?.sku || 'SKU-GEN',
            name: line.itemName.trim(),
            category: line.category,
            quantity: lQty,
            unitPrice: Number(line.unitSalePrice) || 0,
            costPrice: Number(line.unitCostPrice) || 0,
            discount: lDisc,
            cashback: lCash > 0 ? lCash : undefined,
            total: Math.max(0, lSub - (lCash * lQty) - lDisc),
            warranty: line.warranty ? line.warranty.trim() : resolveItemWarranty(line.sku, undefined, line.category, line.itemName, lInv?.warranty, '1 Year'),
            imeiOrSerial: lSerials.join(', '),
          };
        }),
      ];

      const allItemNames = cartItems.map((c) => c.name).filter(Boolean).join(', ');

      const isSplit = productForm.paymentMethod === 'Split (Cash + Bank)' || productForm.paymentMethod?.toLowerCase().includes('split');
      const isCash = productForm.paymentMethod === 'Cash';
      let actualPaid = Number(productForm.paidAmount) || 0;
      let cashAmt = 0;
      let bankAmt = 0;

      if (isSplit) {
        cashAmt = Number(productForm.cashAmount) || 0;
        bankAmt = Number(productForm.bankAmount) || 0;
        actualPaid = cashAmt + bankAmt;
      } else if (isCash) {
        cashAmt = actualPaid;
        bankAmt = 0;
      } else {
        cashAmt = 0;
        bankAmt = actualPaid;
      }

      const bankTypeLabel = isSplit 
        ? (productForm.bankType && productForm.bankType !== '-' ? productForm.bankType : 'KBZPay')
        : (!isCash ? (productForm.bankType || productForm.paymentMethod) : '-');

      const paymentStatus: 'PAID' | 'PARTIAL' | 'CREDIT' =
        actualPaid >= totalSale ? 'PAID' : (actualPaid > 0 ? 'PARTIAL' : 'CREDIT');

      const empName = (productForm.employeeName || '').trim().toLowerCase();
      const matchedEmp = employees.find(
        (e) =>
          e.name.trim().toLowerCase() === empName ||
          (e.code && e.code.toLowerCase() === empName) ||
          e.id === currentUser.id
      );

      const cashierVal = productForm.cashierName || getDefaultCashierForBranch(employees, productForm.branchId);
      const financeVal = productForm.financeName || getDefaultFinanceForBranch(employees, productForm.branchId);

      const resolvedSaleWarranty = productForm.warranty ? productForm.warranty.trim() : resolveItemWarranty(
        productForm.sku || productCode,
        undefined,
        productForm.category,
        productForm.itemName,
        resolvedInventoryItemId ? inventory.find(i => i.id === resolvedInventoryItemId)?.warranty : undefined,
        '1 Year'
      );

      const productRemainingDebt = Math.max(0, totalSale - actualPaid);
      let saleInstallments: SaleInstallment[] | undefined = undefined;
      if (productRemainingDebt > 0) {
        const months = Math.max(1, creditInstallmentMonths);
        const monthlyAmt = Math.ceil(productRemainingDebt / months);
        const [sY, sM, sD] = productForm.date.split('-').map(Number);
        saleInstallments = Array.from({ length: months }).map((_, idx) => {
          const instNo = idx + 1;
          const dueYear = sM + idx > 12 ? sY + Math.floor((sM + idx - 1) / 12) : sY;
          const dueMonth = ((sM + idx - 1) % 12) + 1;
          const dueDay = Math.min(sD || 1, 28);
          const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
          const monthName = new Date(dueYear, dueMonth - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
          const isLast = instNo === months;
          const amount = isLast ? productRemainingDebt - (monthlyAmt * (months - 1)) : monthlyAmt;
          return {
            installmentNo: instNo,
            monthName,
            dueDate,
            amount,
            paidAmount: 0,
            status: 'PENDING' as const,
          };
        });
      }

      if (editingSale) {
        const updatedSale: DailySale = {
          ...editingSale,
          date: productForm.date,
          invoiceNo: invoiceNumber,
          sku: productForm.sku || productCode || editingSale.sku,
          branchId: productForm.branchId,
          branchName: branch ? `${branch.code} - ${branch.name}` : editingSale.branchName,
          township: productForm.customerTownship.trim() || branch?.name || branch?.code,
          saleType: 'PRODUCT',
          inventoryItemId: resolvedInventoryItemId || editingSale.inventoryItemId,
          quantity: totalQuantity,
          itemName: allItemNames || productForm.itemName.trim(),
          category: productForm.category,
          costPrice: totalCost,
          salePrice: totalSale,
          discount: totalDiscount > 0 ? totalDiscount : undefined,
          cashback: totalCashback > 0 ? totalCashback : undefined,
          profit: profit,
          paymentMethod: productForm.paymentMethod,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankType: bankTypeLabel,
          paymentStatus: paymentStatus,
          paidAmount: actualPaid,
          remainingDebt: productRemainingDebt,
          installmentFrequency: productRemainingDebt > 0 ? 'MONTHLY' : undefined,
          totalInstallments: productRemainingDebt > 0 ? creditInstallmentMonths : undefined,
          installments: saleInstallments,
          employeeId: matchedEmp?.id || editingSale.employeeId,
          employeeName: productForm.employeeName,
          salespersonId: matchedEmp?.id || editingSale.salespersonId,
          salespersonName: productForm.employeeName,
          cashierName: cashierVal,
          financeName: financeVal,
          customerName: productForm.customerName,
          customerPhone: productForm.customerPhone,
          isVipCustomer: matchedCustomerInModal?.isVip || false,
          warranty: resolvedSaleWarranty,
          deviceSerial: combinedSerial,
          deviceSerials: allValidSerials.length > 0 ? allValidSerials : undefined,
          items: cartItems,
          notes: productForm.notes,
        };
        if (onUpdateSale) {
          onUpdateSale(updatedSale);
        }
        setSelectedVoucherSale(updatedSale);
      } else {
        const newSale: DailySale = {
          id: `sale-${Date.now()}`,
          date: productForm.date,
          invoiceNo: invoiceNumber,
          sku: productForm.sku || productCode || 'SKU-GEN',
          branchId: productForm.branchId,
          branchName: branch ? `${branch.code} - ${branch.name}` : 'Main Branch',
          township: productForm.customerTownship.trim() || branch?.name || branch?.code,
          saleType: 'PRODUCT',
          inventoryItemId: resolvedInventoryItemId,
          quantity: totalQuantity,
          itemName: allItemNames || productForm.itemName.trim(),
          category: productForm.category,
          costPrice: totalCost,
          salePrice: totalSale,
          discount: totalDiscount > 0 ? totalDiscount : undefined,
          cashback: totalCashback > 0 ? totalCashback : undefined,
          profit: profit,
          paymentMethod: productForm.paymentMethod,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankType: bankTypeLabel,
          paymentStatus: paymentStatus,
          paidAmount: actualPaid,
          remainingDebt: productRemainingDebt,
          installmentFrequency: productRemainingDebt > 0 ? 'MONTHLY' : undefined,
          totalInstallments: productRemainingDebt > 0 ? creditInstallmentMonths : undefined,
          installments: saleInstallments,
          employeeId: matchedEmp?.id || currentUser.id,
          employeeName: productForm.employeeName,
          salespersonId: matchedEmp?.id || currentUser.id,
          salespersonName: productForm.employeeName,
          cashierName: cashierVal,
          financeName: financeVal,
          customerName: productForm.customerName,
          customerPhone: productForm.customerPhone,
          isVipCustomer: matchedCustomerInModal?.isVip || false,
          warranty: resolvedSaleWarranty,
          deviceSerial: combinedSerial,
          deviceSerials: allValidSerials.length > 0 ? allValidSerials : undefined,
          items: cartItems,
          notes: productForm.notes,
          createdAt: new Date().toISOString(),
        };

        onAddSale(newSale, resolvedInventoryItemId, quantity);
        setSelectedVoucherSale(newSale);
      }
    } else {
      // SERVICE / REPAIR
      if (!serviceForm.deviceModel.trim()) {
        alert('Please enter device model.');
        return;
      }
      const laborFee = Number(serviceForm.serviceLaborFee) || 0;
      const partsPrice = Number(serviceForm.sparePartsPrice) || 0;
      const partsCost = Number(serviceForm.sparePartsCost) || 0;
      const totalBill = laborFee + partsPrice;
      const serviceProfit = totalBill - partsCost;

      const branch = branches.find((b) => b.id === serviceForm.branchId);
      const invoiceNumber = serviceForm.invoiceNo.trim() || generateDailySalesInvoiceNo(serviceForm.date, sales, serviceForm.branchId, branch?.name);

      const isSplit = serviceForm.paymentMethod === 'Split (Cash + Bank)' || serviceForm.paymentMethod?.toLowerCase().includes('split');
      const isCash = serviceForm.paymentMethod === 'Cash';
      let actualServicePaid = Number(serviceForm.paidAmount) || 0;
      let cashAmt = 0;
      let bankAmt = 0;

      if (isSplit) {
        cashAmt = Number(serviceForm.cashAmount) || 0;
        bankAmt = Number(serviceForm.bankAmount) || 0;
        actualServicePaid = cashAmt + bankAmt;
      } else if (isCash) {
        cashAmt = actualServicePaid;
        bankAmt = 0;
      } else {
        cashAmt = 0;
        bankAmt = actualServicePaid;
      }

      const bankTypeLabel = isSplit 
        ? (serviceForm.bankType && serviceForm.bankType !== '-' ? serviceForm.bankType : 'KBZPay')
        : (!isCash ? (serviceForm.bankType || serviceForm.paymentMethod) : '-');

      const srvPaymentStatus: 'PAID' | 'PARTIAL' | 'CREDIT' =
        actualServicePaid >= totalBill ? 'PAID' : (actualServicePaid > 0 ? 'PARTIAL' : 'CREDIT');

      const techName = (serviceForm.technicianName || '').trim().toLowerCase();
      const matchedTech = employees.find(
        (e) =>
          e.name.trim().toLowerCase() === techName ||
          (e.code && e.code.toLowerCase() === techName) ||
          e.id === currentUser.id
      );

      const serviceCashierVal = serviceForm.cashierName || getDefaultCashierForBranch(employees, serviceForm.branchId);
      const serviceFinanceVal = serviceForm.financeName || getDefaultFinanceForBranch(employees, serviceForm.branchId);

      if (editingSale) {
        const updatedServiceSale: DailySale = {
          ...editingSale,
          date: serviceForm.date,
          invoiceNo: invoiceNumber,
          sku: serviceForm.sku || editingSale.sku,
          branchId: serviceForm.branchId,
          branchName: branch ? `${branch.code} - ${branch.name}` : editingSale.branchName,
          township: serviceForm.customerTownship.trim() || branch?.name || branch?.code,
          saleType: 'SERVICE',
          inventoryItemId: sparePartInventoryId || editingSale.inventoryItemId,
          quantity: 1,
          itemName: `Service / ${serviceForm.deviceModel}`,
          category: 'Service Charges',
          costPrice: partsCost,
          salePrice: totalBill,
          profit: serviceProfit,
          paymentMethod: serviceForm.paymentMethod,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankType: bankTypeLabel,
          paymentStatus: srvPaymentStatus,
          paidAmount: actualServicePaid,
          remainingDebt: Math.max(0, totalBill - actualServicePaid),
          employeeId: matchedTech?.id || editingSale.employeeId,
          employeeName: serviceForm.technicianName,
          technicianName: serviceForm.technicianName,
          salespersonId: matchedTech?.id || editingSale.salespersonId,
          salespersonName: serviceForm.technicianName,
          cashierName: serviceCashierVal,
          financeName: serviceFinanceVal,
          customerName: serviceForm.customerName,
          customerPhone: serviceForm.customerPhone,
          isVipCustomer: matchedCustomerInModal?.isVip || false,
          deviceModel: serviceForm.deviceModel,
          deviceSerial: serviceForm.deviceSerial,
          serviceLaborFee: laborFee,
          sparePartSku: serviceForm.hasSparePart || serviceForm.sparePartsUsed ? (serviceForm.sparePartSku || '500001') : undefined,
          sparePartsCost: partsCost,
          sparePartsPrice: partsPrice,
          sparePartsUsed: serviceForm.sparePartsUsed,
          serviceStatus: serviceForm.serviceStatus,
          issueDescription: serviceForm.issueDescription,
          notes: serviceForm.notes,
          warranty: 'No Warranty',
        };
        if (onUpdateSale) {
          onUpdateSale(updatedServiceSale);
        }
        setSelectedVoucherSale(updatedServiceSale);
      } else {
        const newServiceSale: DailySale = {
          id: `service-${Date.now()}`,
          date: serviceForm.date,
          invoiceNo: invoiceNumber,
          sku: serviceForm.sku || '400001',
          branchId: serviceForm.branchId,
          branchName: branch ? `${branch.code} - ${branch.name}` : 'Main Branch',
          township: serviceForm.customerTownship.trim() || branch?.name || branch?.code,
          saleType: 'SERVICE',
          inventoryItemId: sparePartInventoryId || undefined,
          quantity: 1,
          itemName: `Service / ${serviceForm.deviceModel}`,
          category: 'Service Charges',
          costPrice: partsCost,
          salePrice: totalBill,
          profit: serviceProfit,
          paymentMethod: serviceForm.paymentMethod,
          cashAmount: cashAmt,
          bankAmount: bankAmt,
          bankType: bankTypeLabel,
          paymentStatus: srvPaymentStatus,
          paidAmount: actualServicePaid,
          remainingDebt: Math.max(0, totalBill - actualServicePaid),
          employeeId: matchedTech?.id || currentUser.id,
          employeeName: serviceForm.technicianName,
          technicianName: serviceForm.technicianName,
          salespersonId: matchedTech?.id || currentUser.id,
          salespersonName: serviceForm.technicianName,
          cashierName: serviceCashierVal,
          financeName: serviceFinanceVal,
          customerName: serviceForm.customerName,
          customerPhone: serviceForm.customerPhone,
          isVipCustomer: matchedCustomerInModal?.isVip || false,
          deviceModel: serviceForm.deviceModel,
          deviceSerial: serviceForm.deviceSerial,
          serviceLaborFee: laborFee,
          sparePartSku: serviceForm.hasSparePart || serviceForm.sparePartsUsed ? (serviceForm.sparePartSku || '500001') : undefined,
          sparePartsCost: partsCost,
          sparePartsPrice: partsPrice,
          sparePartsUsed: serviceForm.sparePartsUsed,
          serviceStatus: serviceForm.serviceStatus,
          issueDescription: serviceForm.issueDescription,
          notes: serviceForm.notes,
          warranty: 'No Warranty',
          createdAt: new Date().toISOString(),
        };

        onAddSale(newServiceSale, sparePartInventoryId || undefined, 1);
        setSelectedVoucherSale(newServiceSale);
      }
    }

    setEditingSale(null);
    setIsModalOpen(false);
  };

  const categories = [
    'Smartphones & Tablets',
    'Laptops & Computers',
    'Accessories & Gadgets',
    'Service Spare Part',
    'Service Charges',
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
            <span>Daily Sales & Service Ledger</span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
              Shwe Kyal Tagon
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured daily sales records, service receipts, technician tracking & staff performance
          </p>
        </div>

        {/* Action Controls & View Switchers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 shadow-2xs">
            <button
              onClick={() => setViewMode('categorized')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'categorized'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Daily Category Statement View (Categorized Ledger)"
            >
              <LayoutList className="w-3.5 h-3.5 text-amber-600" />
              <span>Category Statement</span>
            </button>

            <button
              onClick={() => setViewMode('salesperson')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'salesperson'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Salesperson Monthly Performance"
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Salesperson Sales</span>
            </button>

            <button
              onClick={() => setViewMode('targets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'targets'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-300 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Branch Monthly Sales Targets & Achievement"
            >
              <Target className="w-3.5 h-3.5 text-purple-600" />
              <span>Branch Targets</span>
            </button>
          </div>

          {/* Smart Retail POS High-Speed Checkout (F2) */}
          <button
            onClick={() => setIsSmartPOSOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer ring-2 ring-amber-400/40"
            title="Fast Barcode Scan & Multi-Item POS Checkout (Shortcut: F2)"
          >
            <Scan className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>⚡ Smart POS (F2)</span>
          </button>

          {/* Shift Handover & Z-Report Trigger */}
          <button
            onClick={() => setIsShiftModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer border ${
              activeShift?.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Cashier Shift Handover & Drawer Z-Report"
          >
            <Clock className={`w-4 h-4 ${activeShift?.status === 'OPEN' ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
            <span>
              {activeShift?.status === 'OPEN' ? `Shift #${activeShift.shiftNumber} (Open)` : 'Shift Handover'}
            </span>
          </button>

          {/* Customer CRM & Warranty Tracker */}
          <button
            onClick={() => setIsWarrantyTrackerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Customer Warranty Tracker & Purchase History Lookup"
          >
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Warranty Tracker</span>
          </button>

          {/* Item-wise Sales Quantity & Performance (Item Sales Breakdown) */}
          <button
            onClick={() => setIsItemBreakdownOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Item Sales Breakdown & Quantity Sold"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Item Sales Qty</span>
          </button>


          {/* Daily Cash Allocation Modal Trigger */}
          <button
            onClick={() => setIsCashAllocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Daily Sales Revenue Settlement & Cash Allocation"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Daily Settlement</span>
          </button>

          {/* Export CSV / Sales Statement */}
          <button
            onClick={() => {
              if (viewMode === 'categorized') {
                handleExportSalesStatement();
              } else {
                exportSalesToCSV(filteredSales);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title={viewMode === 'categorized' ? 'Export Sales Statement Report (Excel / CSV)' : 'Export Sales Ledger CSV'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{viewMode === 'categorized' ? 'Export Statement' : 'Export CSV'}</span>
          </button>

          {/* Export PDF for Category Statement */}
          {viewMode === 'categorized' && (
            <button
              onClick={handleExportSalesStatementPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Export Sales Statement as PDF Document"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>PDF</span>
            </button>
          )}

          {/* Add Sale & Service Buttons (Staff can add daily sales vouchers) */}
          <div className="flex items-center gap-2">
            {/* Add Sale Button */}
            <button
              onClick={() => handleOpenAddModal('PRODUCT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Product</span>
            </button>

            {/* Add Service Button */}
            <button
              onClick={() => handleOpenAddModal('SERVICE')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>+ Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Inflow Split (Cash vs Bank), Sales Total, Realized Gross Profit (Hidden on Branch Targets & Salesperson views as requested) */}
      {viewMode !== 'targets' && viewMode !== 'salesperson' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Sales Value */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Revenue
              </span>
              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {formatMMK(totalSalesRevenue)}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              {filteredSales.length} Total Invoices
            </span>
          </div>

          {/* Total Cash Inflow */}
          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Cash Inflow
              </span>
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <DollarSign className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xl font-black text-emerald-700 mt-1.5 font-mono">
              {formatMMK(totalCashInflow)}
            </p>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5 truncate" title={`Sales Cash: ${formatMMK(salesCashInflow)}, Repays: ${formatMMK(totalRepaymentsCash)}, RMA Refund: ${formatMMK(totalRmaRefundsCash)}, Incentive: ${formatMMK(totalBenefitsCash)}`}>
              Cash (Sales: {formatMMK(salesCashInflow)}
              {totalRepaymentsCash > 0 && ` + Debt: ${formatMMK(totalRepaymentsCash)}`}
              {totalRmaRefundsCash > 0 && ` + RMA: ${formatMMK(totalRmaRefundsCash)}`}
              {totalBenefitsCash > 0 && ` + Benefit: ${formatMMK(totalBenefitsCash)}`})
            </span>
          </div>

          {/* Total Bank / Digital Wallet Inflow */}
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                Bank / Digital Pay
              </span>
              <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <CreditCard className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xl font-black text-indigo-700 mt-1.5 font-mono">
              {formatMMK(totalBankInflow)}
            </p>
            <span className="text-[10px] text-indigo-700 font-semibold block mt-0.5 truncate" title={`Sales Bank: ${formatMMK(salesBankInflow)}, Repays: ${formatMMK(totalRepaymentsBank)}, RMA Refund: ${formatMMK(totalRmaRefundsBank)}, Incentive: ${formatMMK(totalBenefitsBank)}`}>
              Bank/KPay (Sales: {formatMMK(salesBankInflow)}
              {totalRepaymentsBank > 0 && ` + Debt: ${formatMMK(totalRepaymentsBank)}`}
              {totalRmaRefundsBank > 0 && ` + RMA: ${formatMMK(totalRmaRefundsBank)}`}
              {totalBenefitsBank > 0 && ` + Benefit: ${formatMMK(totalBenefitsBank)}`})
            </span>
          </div>

          {/* Outstanding Credit / Balance */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Pending / Debt
              </span>
              <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className={`text-xl font-black mt-1.5 font-mono ${totalOutstandingCredit > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {formatMMK(totalOutstandingCredit)}
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              Receivables Balance
            </span>
          </div>

          {/* Realized Profit (MD Level only) */}
          {isMD ? (
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                  Realized Gross Profit
                </span>
                <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded">
                  MD Level
                </span>
              </div>
              <p className="text-xl font-black text-purple-700 mt-1.5 font-mono">
                +{formatMMK(totalRealizedProfit)}
              </p>
              <span className="text-[10px] text-purple-600 font-semibold">
                Profit Margin: {profitMargin}%
              </span>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Service Breakdown
                </span>
                <span className="p-1 rounded-md bg-cyan-50 text-cyan-700">
                  <Wrench className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black text-cyan-900 mt-1.5 font-mono">
                {formatMMK(serviceSalesRev)}
              </p>
              <span className="text-[10px] text-cyan-700 font-medium">
                Product: {formatMMK(productSalesRev)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CATEGORIZED DAILY STATEMENT VIEW (As requested in spreadsheet format) */}
      {/* ========================================================================= */}
      {viewMode === 'categorized' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Date Filter */}
              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
                totalCount={filteredSales.length}
                label="Sale Date"
              />

              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice, SKU, tech, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportSalesStatement}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Export this Sales Statement Report as formatted Excel / CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Export Statement (Excel)</span>
              </button>

              <button
                onClick={handleExportSalesStatementPDF}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Export this Sales Statement Report as official PDF file"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>Export Statement (PDF)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Print this sheet or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>Print / Save Sheet</span>
              </button>
            </div>
          </div>

          {/* Official Daily Sales Report Sheet (Excel Spreadsheet View) */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-5 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Header matching specifications */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-black">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wider uppercase font-sans">
                SHWE KYAL TAGON
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 tracking-wide">
                IT & Mobile Center
              </p>
              <h3 className="text-base sm:text-lg font-black text-slate-900 underline underline-offset-4 tracking-tight pt-1">
                {activeBranchFilter !== 'ALL'
                  ? `${branches.find(b => b.id === activeBranchFilter)?.code || 'BRANCH'} Sales Statement Report`
                  : 'Sales Statement Report'}
              </h3>
              <p className="text-xs font-bold text-slate-800 font-mono pt-0.5">
                {dateFilter.preset === 'DAILY' && `Date: ${formatDateDMY(dateFilter.startDate || todayStr)}`}
                {dateFilter.preset === 'RANGE' && `Period: ${formatDateDMY(dateFilter.startDate)} ~ ${formatDateDMY(dateFilter.endDate)}`}
                {dateFilter.preset === 'ALL' && 'Period: All Historical Records'}
              </p>
            </div>

            {/* Categorized Sections */}
            {categorizedSections.map((sec) => {
              const secQty = sec.items.reduce((acc, s) => acc + (s.quantity || 1), 0);
              const secInvoicesCount = new Set(sec.items.map(s => (s.parentSale ? s.parentSale.id : s.id) || s.invoiceNo)).size;
              const secCash = sec.items.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
              const secBank = sec.items.reduce((acc, s) => acc + (s.bankAmount || 0), 0);
              const secTotal = sec.items.reduce((acc, s) => acc + (s.salePrice || 0), 0);
              const secTax = sec.items.reduce((acc, s) => acc + (s.taxAmount || 0), 0);

              return (
                <div key={sec.id} className="space-y-2">
                  {/* Category Section Title with Left Accent Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-black inline-block"></span>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 tracking-tight uppercase">
                        {sec.title}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({sec.subtitle})
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-700">
                      {secQty} {sec.isService ? 'Services' : 'Units'} ({secInvoicesCount} Invoices)
                    </span>
                  </div>

                  {/* Excel Grid Table with Black Border */}
                  <div className="overflow-x-auto border border-black">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-black bg-slate-50 text-[11px] font-black text-slate-900 uppercase font-sans">
                          <th className="py-2 px-3 border-r border-black w-44">Invoice No</th>
                          <th className="py-2 px-3 border-r border-black min-w-[220px]">Description</th>
                          <th className="py-2 px-3 border-r border-black w-24 text-center">SKU</th>
                          <th className="py-2 px-3 border-r border-black w-14 text-center font-black bg-amber-50/60 text-amber-950">Qty</th>
                          <th className="py-2 px-3 border-r border-black w-36">
                            {sec.isService ? 'Technician' : 'Salesperson'}
                          </th>
                          <th className="py-2 px-3 border-r border-black w-28 text-right">Cash</th>
                          <th className="py-2 px-3 border-r border-black w-28 text-right">Bank</th>
                          <th className="py-2 px-3 border-r border-black w-28 text-right bg-slate-100 font-black text-slate-950">Total</th>
                          <th className="py-2 px-3 border-r border-black w-24 text-center">Bank Type</th>
                          <th className="py-2 px-3 border-r border-black w-20 text-center">Tax</th>
                          <th className="py-2 px-2 text-center w-16 print:hidden">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {sec.items.map((s) => {
                          const cashVal = s.cashAmount || 0;
                          const bankVal = s.bankAmount || 0;
                          const rowTotal = s.salePrice || 0;
                          const bankTypeStr = s.bankType && s.bankType !== '-' ? s.bankType : '-';
                          const staffStr = sec.isService 
                            ? (s.technicianName || s.employeeName || '-') 
                            : (s.employeeName || '-');

                          const cleanName = cleanItemDescription(s.itemName);
                          const descriptionTitle = s.saleType === 'SERVICE'
                            ? (s.itemName.startsWith('Service') ? cleanName : `Service Charges / ${s.deviceModel || cleanName}`)
                            : cleanName;

                          const descriptionSub = s.saleType === 'SERVICE'
                            ? [s.issueDescription, s.sparePartsUsed ? `Replaced parts: ${s.sparePartsUsed}` : ''].filter(Boolean).join(' • ')
                            : '';

                          return (
                            <tr key={s.id} className="hover:bg-amber-50/20 transition-colors border-b border-slate-200">
                              <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold text-slate-900">
                                {s.invoiceNo}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-medium text-slate-900">
                                <div className="font-bold text-slate-900">{descriptionTitle}</div>
                                {descriptionSub && (
                                  <div className="text-[11px] text-slate-500 font-normal italic">
                                    {descriptionSub}
                                  </div>
                                )}
                                {s.deviceSerial && (
                                  <div className="text-[10px] text-indigo-700 font-mono font-bold flex items-center gap-1 mt-0.5 flex-wrap">
                                    <span>{cleanSerialDisplay(s.deviceSerial)}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-mono text-center font-bold text-slate-800">
                                {s.sku || (sec.isService ? '800600' : '-')}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-mono text-center font-black text-slate-900 bg-amber-50/20">
                                {s.quantity || 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 font-bold text-blue-700">
                                {staffStr !== '-' ? (
                                  <span>{staffStr}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                                {cashVal > 0 ? formatNumber(cashVal) : '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-bold text-slate-900">
                                {bankVal > 0 ? formatNumber(bankVal) : '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-right font-mono font-black text-slate-950 bg-slate-50/50">
                                {formatNumber(rowTotal)}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-center font-mono font-bold text-[11px] text-slate-900">
                                {bankTypeStr && bankTypeStr !== '-' ? (
                                  <span className="uppercase">{bankTypeStr}</span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-300 text-center font-mono text-slate-600">
                                {s.taxAmount && s.taxAmount > 0 ? formatNumber(s.taxAmount) : '-'}
                              </td>
                              <td className="py-2 px-2 text-center print:hidden">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      const targetSale = (s.parentSale || (sales.find((item) => item.id === s.id) as DailySale) || (s as unknown as DailySale));
                                      setSelectedVoucherSale(targetSale);
                                    }}
                                    className="p-1 text-amber-700 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                    title="Print Customer Voucher"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  {canManageSales && (
                                    <button
                                      onClick={() => {
                                        const targetSale = (s.parentSale || (sales.find((item) => item.id === s.id) as DailySale) || (s as unknown as DailySale));
                                        handleOpenEditModal(targetSale);
                                      }}
                                      className="p-1 text-purple-700 hover:bg-purple-100 rounded transition-colors cursor-pointer"
                                      title="Edit Sales Voucher"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => {
                                        const targetSale = (s.parentSale || (sales.find((item) => item.id === s.id) as DailySale) || (s as unknown as DailySale));
                                        handleInitiateVoidSale(targetSale);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      title="Delete Sale Record (MD Only)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {sec.items.length === 0 && (
                          <tr>
                            <td colSpan={11} className="py-4 text-center text-slate-400 italic font-mono text-xs">
                              - No transactions recorded for {sec.title} on this date -
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {/* Subtotal Row */}
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-black font-black font-mono text-xs text-slate-900">
                          <td colSpan={5} className="py-2.5 px-3 border-r border-black uppercase text-[11px] font-sans">
                            {sec.title} Total ({secQty} {sec.isService ? 'Services' : 'Units'} / {secInvoicesCount} Invoices)
                          </td>
                          <td className="py-2.5 px-3 border-r border-black text-right font-mono font-bold text-emerald-800">
                            {secCash > 0 ? formatNumber(secCash) : '-'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-black text-right font-mono font-bold text-blue-900">
                            {secBank > 0 ? formatNumber(secBank) : '-'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-black text-right font-mono font-black text-slate-950 bg-slate-200/60">
                            {formatNumber(secTotal)}
                          </td>
                          <td className="py-2.5 px-3 border-r border-black text-center font-mono text-slate-500">
                            -
                          </td>
                          <td className="py-2.5 px-3 border-r border-black text-center font-mono text-slate-600">
                            {secTax > 0 ? formatNumber(secTax) : '-'}
                          </td>
                          <td className="print:hidden"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Daily Settlement Summary Box */}
            <div className="pt-4 border-t-2 border-black">
              <h4 className="font-black text-sm uppercase text-slate-900 tracking-tight pb-2">
                Daily Revenue & Cash Settlement Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 border border-black bg-slate-50 font-mono">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">1. Service Income</span>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatMMK(categorizedSections[0]?.items.reduce((acc, s) => acc + (s.salePrice || 0), 0) || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {new Set(categorizedSections[0]?.items.map(s => s.parentSale?.id || s.invoiceNo) || []).size} Service Tickets
                  </span>
                </div>

                <div className="p-3 border border-black bg-slate-50 font-mono">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">2. Mobile Sales</span>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatMMK(categorizedSections[1]?.items.reduce((acc, s) => acc + (s.salePrice || 0), 0) || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {categorizedSections[1]?.items.reduce((acc, s) => acc + (s.quantity || 1), 0) || 0} Devices Sold
                  </span>
                </div>

                <div className="p-3 border border-black bg-slate-50 font-mono">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">3. Laptop Sales</span>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatMMK(categorizedSections[2]?.items.reduce((acc, s) => acc + (s.salePrice || 0), 0) || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {categorizedSections[2]?.items.reduce((acc, s) => acc + (s.quantity || 1), 0) || 0} Units Sold
                  </span>
                </div>

                <div className="p-3 border border-black bg-slate-50 font-mono">
                  <span className="text-[10px] font-bold text-slate-600 uppercase block">4. Accessories Sales</span>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatMMK(categorizedSections[3]?.items.reduce((acc, s) => acc + (s.salePrice || 0), 0) || 0)}
                  </p>
                  <span className="text-[10px] text-slate-500 font-sans">
                    {categorizedSections[3]?.items.reduce((acc, s) => acc + (s.quantity || 1), 0) || 0} Retail Items
                  </span>
                </div>
              </div>

              {/* Settlement Reconciliation Footer */}
              <div className="mt-3 p-4 bg-black text-white font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="font-bold text-xs uppercase text-amber-400 font-sans">
                    Daily Closing Settlement
                  </h5>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Verified total physical cash in drawer and digital banking settlement
                  </p>
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Cash In Drawer</span>
                    <span className="text-base font-bold text-emerald-300">{formatMMK(totalCashInflow)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-300 uppercase font-bold block">Bank Transfer / Pay</span>
                    <span className="text-base font-bold text-indigo-200">{formatMMK(totalBankInflow)}</span>
                  </div>
                  <div className="pl-4 border-l border-slate-700">
                    <span className="text-[10px] text-amber-400 uppercase font-black block">Grand Daily Total</span>
                    <span className="text-xl font-black text-amber-400">{formatMMK(totalSalesRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SALESPERSON MONTHLY PERFORMANCE VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'salesperson' && (
        <div className="space-y-4">
          {/* Date / Month & Branch Filter Bar */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Daily / Monthly Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setSalespersonDateMode('DAILY');
                    setSalespersonSelectedDate(new Date().toISOString().slice(0, 10));
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    salespersonDateMode === 'DAILY'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSalespersonDateMode('MONTHLY');
                    setSelectedMonth(new Date().toISOString().slice(0, 7));
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    salespersonDateMode === 'MONTHLY'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
              </div>

              {/* Calendar Month & Date Picker Component */}
              <CalendarMonthPicker
                mode={salespersonDateMode === 'DAILY' ? 'DATE' : 'MONTH'}
                selectedDate={salespersonSelectedDate}
                onSelectDate={(d) => {
                  setSalespersonSelectedDate(d);
                  if (d) setSelectedMonth(d.slice(0, 7));
                }}
                selectedMonth={selectedMonth}
                onSelectMonth={(m) => setSelectedMonth(m)}
              />

              <div className="text-xs text-slate-500 font-medium">
                Showing sales performance for {salespersonDateMode === 'DAILY' ? formatDateDMY(salespersonSelectedDate) : (selectedMonth || 'All Time')}
              </div>
            </div>

            {salespersonStats.length > 0 && (
              <div className="flex items-center gap-2 bg-purple-50 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-bold">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Top Performer: {salespersonStats[0].name} ({formatMMK(salespersonStats[0].totalSales)})</span>
              </div>
            )}
          </div>

          {/* Salesperson Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">RANK</th>
                    <th className="py-3 px-4 min-w-[180px]">SALES PERSON / TECHNICIAN</th>
                    <th className="py-3 px-4 min-w-[180px]">POSITION & ROLE / BRANCH</th>
                    <th className="py-3 px-4 w-28 text-center">INVOICES / JOBS</th>
                    <th className="py-3 px-4 w-36 text-right bg-blue-50/40 text-blue-900 font-bold">TOTAL SALES VALUE</th>
                    <th className="py-3 px-4 w-32 text-right bg-emerald-50/40 text-emerald-900">CASH COLLECTED</th>
                    <th className="py-3 px-4 w-32 text-right bg-indigo-50/40 text-indigo-900">BANK / DIGITAL</th>
                    <th className="py-3 px-4 w-36">TARGET & ACHIEVEMENT</th>
                    <th className="py-3 px-4 w-28">TOP CATEGORY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salespersonStats.map((st, idx) => {
                    const isTop = idx === 0 && st.totalSales > 0;
                    return (
                      <tr key={st.name} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 text-center">
                          {isTop ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
                              🥇
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{st.name}</span>
                            {st.code && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {st.code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{st.position}</span>
                            {st.role && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                st.role === 'Managing Director'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : st.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : st.role === 'Manager'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {st.role}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{st.branch}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {st.invoicesCount} Invoices
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-blue-900 bg-blue-50/20">
                          {formatMMK(st.totalSales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/20">
                          {formatMMK(st.cashCollected)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700 bg-indigo-50/20">
                          {formatMMK(st.bankCollected)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-mono text-slate-500 font-medium">Target: {st.target > 0 ? formatMMK(st.target) : '0 MMK (No Quota)'}</span>
                              <span className={`font-bold ${st.target > 0 ? (st.targetMetPercent >= 100 ? 'text-emerald-700' : 'text-amber-700') : 'text-slate-400'}`}>
                                {st.target > 0 ? `${st.targetMetPercent.toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${st.targetMetPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${st.target > 0 ? Math.min(100, Math.max(0, st.targetMetPercent)) : (st.totalSales > 0 ? 100 : 0)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {st.topCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {salespersonStats.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        No sales records found for this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2.5 BRANCH MONTHLY SALES TARGETS & ACHIEVEMENT VIEW */}
      {/* ========================================================================= */}
      {/* 4. BRANCH SALES TARGETS (CLEAN & COMPACT QUANTITY-BASED UI) */}
      {/* ========================================================================= */}
      {viewMode === 'targets' && (
        <div className="space-y-4">
          {/* Clean, Compact Branch Targets Table with integrated controls (No extra cards) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    Monthly Branch Unit Targets ({selectedMonth})
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Tracking Mobile &amp; Laptop Sales Unit Quotas per Shop Branch
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Target Month Selector */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                  />
                </div>

                {/* Set Target Button (MD and Yamin only) */}
                {branches.length > 0 && canUserSetBranchTarget(currentUser) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditTarget(branches[0])}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Set Branch Target</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 min-w-[160px]">Branch Name</th>
                    <th className="py-3 px-4 min-w-[200px]">Mobile Target (Units)</th>
                    <th className="py-3 px-4 min-w-[200px]">Laptop Target (Units)</th>
                    <th className="py-3 px-4 text-center min-w-[110px]">Status</th>
                    <th className="py-3 px-4 text-right min-w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchTargetStats.branches.map((bs, idx) => {
                    const isExceeded = (bs.mobileTarget > 0 && bs.mobilePct >= 100) && (bs.laptopTarget === 0 || bs.laptopPct >= 100);
                    const isOnTrack = bs.mobilePct >= 75 || bs.laptopPct >= 75;

                    return (
                      <tr key={bs.branch.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px]">
                              {bs.branch.code || bs.branch.id}
                            </span>
                            <div className="font-bold text-slate-900 text-xs">{bs.branch.name}</div>
                          </div>
                        </td>

                        {/* Mobile Quantity Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 flex items-center gap-1 min-w-[90px]">
                              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                              <span>{bs.mobileUnitsSold} / {bs.mobileTarget} pcs</span>
                            </span>
                            <span className={`font-mono font-bold text-[11px] ${bs.mobilePct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                              ({bs.mobilePct}%)
                            </span>
                          </div>
                        </td>

                        {/* Laptop Quantity Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800 flex items-center gap-1 min-w-[90px]">
                              <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{bs.laptopUnitsSold} / {bs.laptopTarget} pcs</span>
                            </span>
                            <span className={`font-mono font-bold text-[11px] ${bs.laptopPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                              ({bs.laptopPct}%)
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {isExceeded ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              Target Met
                            </span>
                          ) : isOnTrack ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                              On Track
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[10px]">
                              In Progress
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {canUserSetBranchTarget(currentUser) ? (
                            <button
                              onClick={() => handleOpenEditTarget(bs.branch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="Set Target Qty"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Set Target</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Read Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STANDARD TRANSACTIONS TABLE VIEW */}
      {/* ========================================================================= */}
      {false && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ALL'
                  ? 'border-amber-500 text-slate-900 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>All Transactions</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
                {sales.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PRODUCT')}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'PRODUCT'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Product Sales</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                {sales.filter(s => s.saleType !== 'SERVICE').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SERVICE')}
              className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SERVICE'
                  ? 'border-cyan-600 text-cyan-800 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-600" />
              <span>Repair & Service</span>
              <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded-full">
                {sales.filter(s => s.saleType === 'SERVICE').length}
              </span>
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Date filter */}
              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
                totalCount={filteredSales.length}
                label="Sale Date"
              />

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search voucher, item, customer, staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Showing {filteredSales.length} transactions
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1380px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[130px] font-mono">VOUCHER #</th>
                  <th className="py-3 px-4 min-w-[100px]">DATE</th>
                  <th className="py-3 px-4 min-w-[160px]">BRANCH</th>
                  <th className="py-3 px-4 min-w-[90px]">TYPE</th>
                  <th className="py-3 px-4 min-w-[220px]">ITEM / SERVICE</th>
                  <th className="py-3 px-4 min-w-[70px] text-center font-bold text-amber-900 bg-amber-50/40">QTY</th>
                  <th className="py-3 px-4 min-w-[150px]">CUSTOMER</th>
                  <th className="py-3 px-4 min-w-[120px] text-right bg-blue-50/40 text-blue-900">TOTAL</th>
                  <th className="py-3 px-4 min-w-[120px] text-right bg-emerald-50/40 text-emerald-900">PAID</th>
                  <th className="py-3 px-4 min-w-[110px] text-right bg-slate-100/60 text-slate-900">BALANCE</th>
                  {isMD && (
                    <th className="py-3 px-4 min-w-[110px] text-right bg-emerald-100/40 text-emerald-950">PROFIT</th>
                  )}
                  <th className="py-3 px-4 min-w-[160px]">PAYMENT / STAFF</th>
                  <th className="py-3 px-4 min-w-[110px] text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSales.map((s) => {
                  const isService = s.saleType === 'SERVICE';
                  const total = s.salePrice || 0;
                  const paid = s.paidAmount !== undefined ? s.paidAmount : total;
                  const balance = Math.max(0, total - paid);

                  return (
                    <tr key={s.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {s.invoiceNo}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatDateDMY(s.date)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {s.branchName}
                      </td>
                      <td className="py-3 px-4">
                        {isService ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <Wrench className="w-3 h-3 text-cyan-600" />
                            <span>Service</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Package className="w-3 h-3 text-emerald-600" />
                            <span>Sale</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isService ? (
                          <div>
                            <div className="font-bold text-cyan-950 flex items-center gap-1.5">
                              <span>{s.deviceModel || s.itemName}</span>
                              {s.serviceStatus && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800">
                                  {s.serviceStatus}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {s.issueDescription && <span>Defect: {s.issueDescription}</span>}
                              {s.sparePartsUsed && (
                                <span className="ml-1 text-amber-800">• Spare: {s.sparePartsUsed}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900">{cleanItemDescription(s.itemName)}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="text-amber-800 font-semibold">{s.category}</span>
                              {s.notes && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{s.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-center text-slate-900 bg-amber-50/20">
                        {s.quantity || 1}
                      </td>
                      <td className="py-3 px-4">
                        {s.customerName ? (
                          <div>
                            <div className="font-semibold text-slate-800">{s.customerName}</div>
                            {s.customerPhone && s.category !== 'Credit Repayment' && s.sku !== 'REPAY' && !s.itemName?.toLowerCase().includes('credit repay') && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{s.customerPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {formatMMK(total)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/20">
                        {formatMMK(paid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold bg-slate-50">
                        {balance > 0 ? (
                          <span className="text-rose-600">
                            {formatMMK(balance)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">
                            0
                          </span>
                        )}
                      </td>
                      {isMD && (
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                          +{formatMMK(s.profit || 0)}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        {(() => {
                          const methodMeta = MYANMAR_PAYMENT_METHODS.find(
                            (m) => m.id === s.paymentMethod || m.name === s.paymentMethod
                          );
                          return (
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${methodMeta?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {methodMeta?.name || s.paymentMethod}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">{s.technicianName || s.employeeName}</div>
                              {s.paymentStatus && s.paymentStatus !== 'PAID' && (
                                <div className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                  {s.paymentStatus === 'CREDIT' ? 'Due / Credit' : `Partial (${formatMMK(paid)})`}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setVoucherPrintType('invoice');
                              setSelectedVoucherSale(s);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Print as Commercial Invoice (Default)"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-600" />
                            <span>Invoice</span>
                          </button>
                          <button
                            onClick={() => {
                              setVoucherPrintType('receipt');
                              setSelectedVoucherSale(s);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Print as Receipt (Tax-Safe Version)"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Receipt</span>
                          </button>
                          {canManageSales && (
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Sales Voucher"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleInitiateVoidSale(s)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Delete Sale Record (MD Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-sm text-slate-600">No sales or service transactions found</p>
                      <p className="text-xs text-slate-400 mt-0.5">Adjust your filters or add a new transaction</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredSales.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>Showing <b>{salesPageSize >= 999999 ? filteredSales.length : Math.min(filteredSales.length, (salesPage - 1) * salesPageSize + 1)}</b> to <b>{salesPageSize >= 999999 ? filteredSales.length : Math.min(filteredSales.length, salesPage * salesPageSize)}</b> of <b>{filteredSales.length}</b> records</span>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-slate-400">| Per page:</span>
                    <select
                      value={salesPageSize}
                      onChange={(e) => {
                        setSalesPageSize(Number(e.target.value));
                        setSalesPage(1);
                      }}
                      className="px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-800 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={999999}>All</option>
                    </select>
                  </div>
                </div>

                {salesPageSize < 999999 && totalSalesPages > 1 && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={salesPage <= 1}
                      onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-2 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                      Page {salesPage} of {totalSalesPages}
                    </span>
                    <button
                      type="button"
                      disabled={salesPage >= totalSalesPages}
                      onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Add Sale / Service Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] my-auto flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  modalSaleType === 'PRODUCT'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                }`}>
                  {modalSaleType === 'PRODUCT' ? (
                    <Package className="w-5 h-5 text-amber-700" />
                  ) : (
                    <Wrench className="w-5 h-5 text-cyan-700" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>
                      {editingSale
                        ? (modalSaleType === 'PRODUCT' ? `Edit Product Voucher #${editingSale.invoiceNo}` : `Edit Service Voucher #${editingSale.invoiceNo}`)
                        : (modalSaleType === 'PRODUCT' ? 'Product Sale Voucher Entry' : 'Repair & Service Voucher Entry')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingSale
                      ? 'Correct mistakes or update transaction details'
                      : (modalSaleType === 'PRODUCT' 
                          ? 'New Product Retail / Wholesale Voucher' 
                          : 'New Repair Job & Service Fee Voucher')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
                {/* Common Details: Branch, Date, Auto Invoice No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Branch *
                  </label>
                  <select
                    disabled={!canUserAccessAllBranchesPOS(currentUser)}
                    value={modalSaleType === 'PRODUCT' ? productForm.branchId : serviceForm.branchId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const targetBranch = branches.find(b => b.id === val);
                      if (modalSaleType === 'PRODUCT') {
                        const nextSalesStaff = getSalesStaffOptions(val);
                        const nextCashier = getDefaultCashierForBranch(employees, val);
                        const nextFinance = getDefaultFinanceForBranch(employees, val);
                        const newInv = generateDailySalesInvoiceNo(productForm.date, sales, val, targetBranch?.name);
                        setProductForm((prev) => ({ 
                          ...prev, 
                          branchId: val,
                          invoiceNo: newInv,
                          employeeName: nextSalesStaff.some(s => s.name === prev.employeeName) ? prev.employeeName : (nextSalesStaff[0]?.name || prev.employeeName),
                          cashierName: nextCashier,
                          financeName: nextFinance
                        }));
                      } else {
                        const nextTechs = getServiceTechniciansOptions(val);
                        const nextCashier = getDefaultCashierForBranch(employees, val);
                        const nextFinance = getDefaultFinanceForBranch(employees, val);
                        const newInv = generateDailySalesInvoiceNo(serviceForm.date, sales, val, targetBranch?.name);
                        setServiceForm((prev) => ({ 
                          ...prev, 
                          branchId: val,
                          invoiceNo: newInv,
                          technicianName: nextTechs.some(s => s.name === prev.technicianName) ? prev.technicianName : (nextTechs[0]?.name || prev.technicianName),
                          cashierName: nextCashier,
                          financeName: nextFinance
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} ({b.name})
                      </option>
                    ))}
                  </select>
                  {!hasGlobalBranchAccess(currentUser) && (
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      * Restricted to your assigned branch
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={modalSaleType === 'PRODUCT' ? productForm.date : serviceForm.date}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (modalSaleType === 'PRODUCT') {
                        const targetBranch = branches.find(b => b.id === productForm.branchId);
                        const newInv = generateDailySalesInvoiceNo(val, sales, productForm.branchId, targetBranch?.name);
                        setProductForm((prev) => ({ ...prev, date: val, invoiceNo: newInv }));
                      } else {
                        const targetBranch = branches.find(b => b.id === serviceForm.branchId);
                        const newInv = generateDailySalesInvoiceNo(val, sales, serviceForm.branchId, targetBranch?.name);
                        setServiceForm((prev) => ({ ...prev, date: val, invoiceNo: newInv }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Invoice No * (Auto)
                  </label>
                  <input
                    type="text"
                    required
                    value={modalSaleType === 'PRODUCT' ? productForm.invoiceNo : serviceForm.invoiceNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (modalSaleType === 'PRODUCT') {
                        setProductForm((prev) => ({ ...prev, invoiceNo: val }));
                      } else {
                        setServiceForm((prev) => ({ ...prev, invoiceNo: val }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-amber-50/70 border border-amber-300 rounded-lg text-amber-950 font-mono font-bold focus:bg-white focus:border-amber-500 focus:outline-hidden"
                    placeholder="e.g. SKTG1-INV20260925/001"
                  />
                </div>
              </div>

              {/* Customer Information (Top Prominent Section - Phone First, VIP Auto-detection, History) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                matchedCustomerInModal?.isVip 
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/30' 
                  : 'bg-amber-50/70 border-amber-200/90'
              } space-y-2.5`}>
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-amber-500 text-slate-950">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span>Customer Details</span>
                  </div>

                  {/* Customer Status & History button */}
                  {matchedCustomerInModal ? (
                    <div className="flex items-center gap-2">
                      {matchedCustomerInModal.isVip ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs border border-amber-500">
                          <Crown className="w-3.5 h-3.5 fill-slate-950" />
                          <span>VIP CUSTOMER ({matchedCustomerInModal.vipEligibleItems ?? matchedCustomerInModal.totalItemsPurchased} items)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                          Regular ({matchedCustomerInModal.totalPurchaseCount} orders)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForHistory(matchedCustomerInModal)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="View Customer Purchase History"
                      >
                        <History className="w-3.5 h-3.5 text-indigo-600" />
                        <span>View History</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-amber-800/70 font-medium">
                      Enter phone number to auto-fill customer name and VIP status
                    </span>
                  )}
                </div>

                {/* 3 Column Grid: Phone First (Col 1), Name Second (Col 2), Township Third (Col 3) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Column 1: Customer Phone - FIRST as explicitly requested */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-800 font-bold text-xs">
                        Customer Phone *
                      </label>
                      {matchedCustomerInModal && (
                        <span className="text-[10px] text-emerald-700 font-bold">
                          ✓ Auto-Matched
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={modalSaleType === 'PRODUCT' ? productForm.customerPhone : serviceForm.customerPhone}
                        onChange={(e) => handleModalPhoneChange(e.target.value)}
                        onFocus={() => setShowModalPhoneSuggestions(true)}
                        className={`w-full px-3 py-2 bg-white border rounded-lg text-slate-900 font-mono font-bold focus:outline-hidden text-xs shadow-2xs ${
                          matchedCustomerInModal?.isVip
                            ? 'border-amber-400 bg-amber-50/50 focus:ring-2 focus:ring-amber-500'
                            : 'border-slate-300 focus:border-amber-500'
                        }`}
                        placeholder="09xxxxxxxxx (Auto-fill Name)"
                      />
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>

                    {/* Auto-suggestions dropdown */}
                    {showModalPhoneSuggestions && modalPhoneSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {modalPhoneSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectModalCustomer(c)}
                            className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.isVip && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                                    VIP
                                  </span>
                                )}
                                {c.isContactPartner && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                    {c.partnerType || 'Contact'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600">
                              {c.totalPurchaseCount > 0 ? `${c.vipEligibleItems ?? c.totalItemsPurchased} items` : (c.township || 'Contact List')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 2: Customer Name - SECOND */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={modalSaleType === 'PRODUCT' ? productForm.customerName : serviceForm.customerName}
                      onChange={(e) => handleModalCustomerNameChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-amber-500 focus:outline-hidden text-xs shadow-2xs"
                      placeholder="e.g. U Kyaw Kyaw / General Customer"
                    />
                  </div>

                  {/* Column 3: Township - THIRD */}
                  <div>
                    <label className="block text-slate-800 font-bold text-xs mb-1">
                      Township
                    </label>
                    <input
                      type="text"
                      value={modalSaleType === 'PRODUCT' ? productForm.customerTownship : serviceForm.customerTownship}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (modalSaleType === 'PRODUCT') {
                          setProductForm((prev) => ({ ...prev, customerTownship: val }));
                        } else {
                          setServiceForm((prev) => ({ ...prev, customerTownship: val }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:border-amber-500 focus:outline-hidden text-xs shadow-2xs"
                      placeholder="e.g. Sanchaung / Kamayut"
                    />
                  </div>
                </div>
              </div>

              {/* ---------------- PRODUCT SALE FORM ---------------- */}
              {modalSaleType === 'PRODUCT' && (
                <>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 relative">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">
                          1
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          Item #1: {productForm.itemName || 'Primary Product'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                        Main Item
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-slate-700 font-bold mb-1">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={productForm.itemName}
                        onChange={(e) => {
                          setProductForm({ ...productForm, itemName: e.target.value });
                          setIsProductSuggestionsOpen(true);
                        }}
                        onFocus={() => setIsProductSuggestionsOpen(true)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:border-amber-500 focus:outline-hidden shadow-2xs"
                        placeholder="Type to search or enter product"
                      />

                      {/* Autocomplete Dropdown */}
                      {isProductSuggestionsOpen && matchingProducts.length > 0 && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {matchingProducts.map((item) => {
                            const bStock = getAvailableStockForBranch(item, productForm.branchId);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectProductItem(item)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50/50 border-b border-slate-100 last:border-b-0 flex items-center justify-between cursor-pointer transition-colors"
                              >
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    Code: {item.sku} • {item.category}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono font-bold text-slate-800 text-xs block">
                                    {formatMMK(item.sellingPrice)}
                                  </span>
                                  <span className={`text-[10px] font-semibold ${bStock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    Stock: {bStock}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold text-xs">
                          Product Code / SKU (Auto) *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newSku = generateAutoSKU(productForm.category, inventory, sales);
                            setProductForm(prev => ({ ...prev, sku: newSku }));
                          }}
                          className="text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                        >
                          ↻ Auto Code
                        </button>
                      </div>
                      <input
                        type="text"
                        value={productCode || productForm.sku}
                        onChange={(e) => {
                          setProductForm(prev => ({ ...prev, sku: e.target.value }));
                          handleProductCodeInput(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-purple-900 font-mono font-bold focus:bg-white focus:border-amber-500 focus:outline-hidden"
                        placeholder="e.g. 100001 / 200001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Category *</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          const newSku = generateAutoSKU(newCat, inventory, sales);
                          setProductForm({ ...productForm, category: newCat, sku: newSku });
                        }}
                        className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-lg text-slate-800 font-bold focus:border-purple-500 focus:outline-hidden cursor-pointer"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                        Smartphones • Laptops • Accessories
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold">
                          Quantity *
                        </label>
                        {quantity > 1 && (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                            {quantity} Units
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        required
                        min={1}
                        value={quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const q = Math.max(1, parseInt(e.target.value) || 1);
                          handleUpdateQuantity(q);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Unit Price (MMK) *
                      </label>
                      <FormattedNumberInput
                        value={productForm.unitSalePrice}
                        onChange={(val) => {
                          setProductForm((prev) => ({
                            ...prev,
                            unitSalePrice: val,
                          }));
                        }}
                        showLiveBadge={true}
                        min={0}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right focus:border-amber-500 focus:outline-hidden"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-emerald-800 font-bold mb-1 flex items-center justify-between">
                        <span>Cashback (MMK)</span>
                      </label>
                      <FormattedNumberInput
                        value={productForm.cashback || 0}
                        onChange={(val) => {
                          setProductForm((prev) => ({
                            ...prev,
                            cashback: val,
                          }));
                        }}
                        showLiveBadge={false}
                        min={0}
                        className="w-full px-3 py-2 bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 font-mono font-bold text-right focus:border-emerald-500 focus:bg-white focus:outline-hidden"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold">
                          Discount (MMK)
                        </label>
                        {!canApplyDiscount && (
                          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>MD & Yamin Only</span>
                          </span>
                        )}
                      </div>
                      <FormattedNumberInput
                        value={productForm.discount}
                        onChange={(val) => {
                          if (!canApplyDiscount) return;
                          setProductForm((prev) => ({
                            ...prev,
                            discount: val,
                          }));
                        }}
                        disabled={!canApplyDiscount}
                        showLiveBadge={false}
                        min={0}
                        className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-right focus:bg-white focus:outline-hidden ${
                          !canApplyDiscount 
                            ? 'bg-slate-100/90 border-slate-300 text-slate-400 cursor-not-allowed' 
                            : 'bg-rose-50/50 border-rose-200 text-rose-800 focus:border-rose-500'
                        }`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Warranty and Device Serial / IMEI Section */}
                  {quantity <= 1 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1 text-xs">
                          Warranty Term (e.g. 1 Year / No Warranty)
                        </label>
                        <select
                          value={productForm.warranty}
                          onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold cursor-pointer focus:border-amber-500 focus:outline-hidden text-xs"
                        >
                          <option value="1 Year">1 Year Warranty</option>
                          <option value="2 Years">2 Years Warranty</option>
                          <option value="6 Months">6 Months Warranty</option>
                          <option value="3 Months">3 Months Warranty</option>
                          <option value="1 Month">1 Month Warranty</option>
                          <option value="No Warranty">No Warranty</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-700 font-bold text-xs flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                            <span>Device IMEI / Serial</span>
                            {mainItemStockImeis.length > 0 ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                            )}
                          </label>
                        </div>
                        {(() => {
                          const currentVal = productSerials[0] ?? productForm.deviceSerial ?? '';
                          const isEntered = Boolean(currentVal.trim());
                          const isMatch = mainItemStockImeis.length > 0 && isEntered && mainItemStockImeis.some((im) => im.toLowerCase() === currentVal.trim().toLowerCase());
                          const isInvalid = mainItemStockImeis.length > 0 && isEntered && !isMatch;

                          return (
                            <div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => {
                                    handleSerialChange(0, e.target.value);
                                    setProductForm((prev) => ({ ...prev, deviceSerial: e.target.value }));
                                  }}
                                  className={`w-full px-3 py-2 rounded-lg font-mono text-xs pr-7 transition-colors focus:outline-hidden ${
                                    isInvalid
                                      ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                                      : isMatch
                                      ? 'bg-emerald-50/50 border-2 border-emerald-500 text-emerald-950 font-bold focus:border-emerald-600'
                                      : 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                                  }`}
                                  placeholder={mainItemStockImeis.length > 0 ? "Type or click available IMEI below..." : "e.g. 358920192847192"}
                                />
                                {currentVal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSerialChange(0, '');
                                      setProductForm((prev) => ({ ...prev, deviceSerial: '' }));
                                    }}
                                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Error or Success feedback message */}
                              {isInvalid && (
                                <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>⚠️ Invalid! This IMEI is not in stock ({currentVal})</span>
                                </p>
                              )}
                              {isMatch && (
                                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>✓ Valid In-Stock IMEI</span>
                                </p>
                              )}

                              {/* Available In-Stock IMEIs quick selector chips */}
                              {mainItemStockImeis.length > 0 && (
                                <div className="mt-2 p-2 bg-amber-50/80 rounded-lg border border-amber-200">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
                                    <span>📦 In-Stock IMEIs ({mainItemStockImeis.length}) - Click to select:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {mainItemStockImeis.map((im) => {
                                      const isSelected = currentVal.trim().toLowerCase() === im.toLowerCase();
                                      return (
                                        <button
                                          key={im}
                                          type="button"
                                          onClick={() => {
                                            handleSerialChange(0, im);
                                            setProductForm((prev) => ({ ...prev, deviceSerial: im }));
                                          }}
                                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 shadow-2xs hover:border-amber-500'
                                          }`}
                                        >
                                          {im} {isSelected && '✓'}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1 text-xs">
                            Warranty Term (Applies to all units)
                          </label>
                          <select
                            value={productForm.warranty}
                            onChange={(e) => setProductForm({ ...productForm, warranty: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold cursor-pointer focus:border-amber-500 focus:outline-hidden text-xs"
                          >
                            <option value="1 Year">1 Year Warranty</option>
                            <option value="2 Years">2 Years Warranty</option>
                            <option value="6 Months">6 Months Warranty</option>
                            <option value="3 Months">3 Months Warranty</option>
                            <option value="1 Month">1 Month Warranty</option>
                            <option value="No Warranty">No Warranty</option>
                          </select>
                        </div>

                        <div className="flex flex-col justify-end">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setShowBulkPasteModal(true)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                              title="Paste multiple IMEIs at once"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-600" />
                              <span>📋 Bulk Paste IMEIs</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Multi-Device IMEI Inputs Container */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-amber-950">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-amber-700" />
                            <span>Device IMEI / Serial Numbers ({quantity} Units)</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-900">
                              {productSerials.filter((s) => s && s.trim()).length} / {quantity} Filled
                            </span>
                          </div>
                        </div>

                        {/* Available Stock IMEIs Chips for Multi-Unit */}
                        {mainItemStockImeis.length > 0 && (
                          <div className="p-2 bg-white rounded-lg border border-amber-200 shadow-2xs">
                            <div className="text-[11px] font-bold text-amber-900 mb-1 flex items-center justify-between">
                              <span>📦 In-Stock IMEIs ({mainItemStockImeis.length}) - Click to fill:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {mainItemStockImeis.map((im) => {
                                const isSelected = productSerials.some((s) => s.trim().toLowerCase() === im.toLowerCase());
                                return (
                                  <button
                                    key={im}
                                    type="button"
                                    onClick={() => {
                                      // Put into first empty slot, or replace slot 0
                                      const emptyIdx = productSerials.findIndex((s) => !s || !s.trim());
                                      const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                                      handleSerialChange(targetIdx, im);
                                    }}
                                    disabled={isSelected}
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-70 cursor-not-allowed'
                                        : 'bg-white hover:bg-amber-100 text-slate-800 border border-amber-300 shadow-2xs hover:border-amber-500'
                                    }`}
                                  >
                                    {im} {isSelected && '✓'}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {Array.from({ length: quantity }).map((_, idx) => {
                            const val = (productSerials[idx] || '').trim();
                            const isEntered = Boolean(val);
                            const isDuplicate = isEntered && productSerials.some((s, sIdx) => sIdx !== idx && s.trim().toLowerCase() === val.toLowerCase());
                            const isMatch = mainItemStockImeis.length > 0 && isEntered && mainItemStockImeis.some((im) => im.toLowerCase() === val.toLowerCase());
                            const isInvalid = mainItemStockImeis.length > 0 && isEntered && !isMatch;

                            return (
                              <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 shadow-2xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                                      {idx + 1}
                                    </span>
                                    <span>Unit #{idx + 1} IMEI / Serial</span>
                                  </span>
                                  {quantity > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveProductUnit(idx)}
                                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                                      title={`Remove Unit #${idx + 1}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={productSerials[idx] || ''}
                                    onChange={(e) => handleSerialChange(idx, e.target.value)}
                                    className={`w-full px-2.5 py-1.5 rounded-md font-mono text-xs pr-6 focus:outline-hidden transition-colors ${
                                      isInvalid
                                        ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold focus:border-rose-600'
                                        : isDuplicate
                                        ? 'bg-amber-50 border-2 border-amber-500 text-amber-950 font-bold'
                                        : isMatch
                                        ? 'bg-emerald-50/50 border-2 border-emerald-500 text-emerald-950 font-bold'
                                        : 'bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-amber-500'
                                    }`}
                                    placeholder={`e.g. 35892019284719${idx + 1}`}
                                  />
                                  {productSerials[idx] && (
                                    <button
                                      type="button"
                                      onClick={() => handleSerialChange(idx, '')}
                                      className="absolute right-1.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {isInvalid && (
                                  <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>Not in stock ({val})</span>
                                  </p>
                                )}
                                {isDuplicate && (
                                  <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>Already used in another unit</span>
                                  </p>
                                )}
                                {isMatch && !isDuplicate && (
                                  <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    <span>✓ Valid In-Stock IMEI</span>
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Items / Products for this Voucher */}
                  {additionalProductLines.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Additional Items in this Voucher ({additionalProductLines.length})</span>
                        </span>
                      </div>

                      {additionalProductLines.map((line, lineIdx) => {
                        const lineMatchingProducts = inventory.filter((item) => {
                          if (!line.itemName || line.itemName.trim().length === 0) return false;
                          const q = line.itemName.toLowerCase().trim();
                          return (
                            item.name.toLowerCase().includes(q) ||
                            item.sku.toLowerCase().includes(q) ||
                            item.category.toLowerCase().includes(q) ||
                            (item.brand && item.brand.toLowerCase().includes(q))
                          );
                        }).slice(0, 6);

                        return (
                          <div key={line.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 relative">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">
                                  {lineIdx + 2}
                                </span>
                                <span className="font-bold text-xs text-slate-900">
                                  Item #{lineIdx + 2}: {line.itemName || 'New Item'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductLine(line.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Remove this item"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Remove</span>
                              </button>
                            </div>

                            {/* Row 1: Product Name & SKU */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="relative">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-slate-700 font-bold text-xs">
                                    Product Name *
                                  </label>
                                  {line.inventoryItemId && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      (() => {
                                        const inv = inventory.find(i => i.id === line.inventoryItemId);
                                        const bStock = getAvailableStockForBranch(inv, productForm.branchId);
                                        return bStock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800';
                                      })()
                                    }`}>
                                      {(() => {
                                        const inv = inventory.find(i => i.id === line.inventoryItemId);
                                        const bStock = getAvailableStockForBranch(inv, productForm.branchId);
                                        return `Stock: ${bStock}`;
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  required
                                  value={line.itemName}
                                  onChange={(e) => {
                                    handleUpdateProductLine(line.id, { itemName: e.target.value });
                                    setActiveLineSuggestionId(line.id);
                                  }}
                                  onFocus={() => setActiveLineSuggestionId(line.id)}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:border-amber-500 focus:outline-hidden shadow-2xs text-xs"
                                  placeholder="Type to search or enter product"
                                />

                                {/* Autocomplete Dropdown */}
                                {activeLineSuggestionId === line.id && lineMatchingProducts.length > 0 && (
                                  <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {lineMatchingProducts.map((item) => {
                                      const bStock = getAvailableStockForBranch(item, productForm.branchId);
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => {
                                            handleSelectLineInventoryItem(line.id, item);
                                            setActiveLineSuggestionId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 hover:bg-amber-50/50 border-b border-slate-100 last:border-b-0 flex items-center justify-between cursor-pointer transition-colors"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">
                                              Code: {item.sku} • {item.category}
                                            </p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="font-mono font-bold text-slate-800 text-xs block">
                                              {formatMMK(item.sellingPrice)}
                                            </span>
                                            <span className={`text-[10px] font-semibold ${bStock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                              Stock: {bStock}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Product Code / SKU (Auto) * */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-slate-700 font-bold text-xs">
                                    Product Code / SKU (Auto) *
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSku = generateAutoSKU(line.category, inventory, sales);
                                      handleUpdateProductLine(line.id, { sku: newSku });
                                    }}
                                    className="text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                                  >
                                    ↻ Auto Code
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={line.sku}
                                  onChange={(e) => handleUpdateProductLine(line.id, { sku: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-purple-900 font-mono font-bold focus:bg-white focus:border-amber-500 focus:outline-hidden text-xs"
                                  placeholder="e.g. 100001 / 200001"
                                />
                              </div>
                            </div>

                            {/* Row 2: Category, Quantity, Unit Price (MMK) *, Cashback (MMK), Discount (MMK) */}
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                              <div>
                                <label className="block text-slate-700 font-bold mb-1 text-xs">Category *</label>
                                <select
                                  value={line.category}
                                  onChange={(e) => {
                                    const newCat = e.target.value;
                                    const newSku = generateAutoSKU(newCat, inventory, sales);
                                    handleUpdateProductLine(line.id, { category: newCat, sku: newSku });
                                  }}
                                  className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-lg text-slate-800 font-bold focus:border-purple-500 focus:outline-hidden cursor-pointer text-xs"
                                >
                                  {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                                  Smartphones • Laptops • Accessories
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-slate-700 font-bold text-xs">
                                    Quantity *
                                  </label>
                                  {line.quantity > 1 && (
                                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                                      {line.quantity} Units
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  required
                                  min={1}
                                  value={line.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const q = Math.max(1, parseInt(e.target.value) || 1);
                                    const newSerials = [...line.serials];
                                    while (newSerials.length < q) newSerials.push('');
                                    handleUpdateProductLine(line.id, { quantity: q, serials: newSerials.slice(0, q) });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:border-amber-500 focus:outline-hidden text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-700 font-bold mb-1 text-xs">
                                  Unit Price (MMK) *
                                </label>
                                <FormattedNumberInput
                                  value={line.unitSalePrice}
                                  onChange={(val) => handleUpdateProductLine(line.id, { unitSalePrice: val })}
                                  showLiveBadge={true}
                                  min={0}
                                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right focus:border-amber-500 focus:outline-hidden text-xs"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <label className="block text-emerald-800 font-bold mb-1 text-xs flex items-center justify-between">
                                  <span>Cashback</span>
                                </label>
                                <FormattedNumberInput
                                  value={line.cashback || 0}
                                  onChange={(val) => handleUpdateProductLine(line.id, { cashback: val })}
                                  min={0}
                                  className="w-full px-3 py-2 bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 font-mono font-bold text-right focus:border-emerald-500 focus:bg-white focus:outline-hidden text-xs"
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-slate-700 font-bold text-xs">
                                    Discount (MMK)
                                  </label>
                                  {!canApplyDiscount && (
                                    <span className="text-[9px] text-amber-700 font-bold flex items-center gap-0.5 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                                      <span>MD & Yamin</span>
                                    </span>
                                  )}
                                </div>
                                <FormattedNumberInput
                                  value={line.discount}
                                  onChange={(val) => {
                                    if (!canApplyDiscount) return;
                                    handleUpdateProductLine(line.id, { discount: val });
                                  }}
                                  disabled={!canApplyDiscount}
                                  min={0}
                                  className={`w-full px-3 py-2 border rounded-lg font-mono font-bold text-right focus:bg-white focus:outline-hidden text-xs ${
                                    !canApplyDiscount 
                                      ? 'bg-slate-100/90 border-slate-300 text-slate-400 cursor-not-allowed' 
                                      : 'bg-rose-50/50 border-rose-200 text-rose-800 focus:border-rose-500'
                                  }`}
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            {/* Row 3: Warranty & Serials */}
                            {(() => {
                              const lInv = inventory.find((i) =>
                                (line.inventoryItemId && i.id === line.inventoryItemId) ||
                                (line.sku && i.sku.toLowerCase() === line.sku.toLowerCase()) ||
                                (line.itemName && i.name.toLowerCase().trim() === line.itemName.toLowerCase().trim())
                              );
                              const lStockImeis = getInStockImeisForBranch(lInv, productForm.branchId, {
                                purchases,
                                transfers: interBranchTransfers,
                                supplierReturns,
                                sales,
                                soldImeisSet,
                              });

                              return line.quantity <= 1 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                                      Warranty Term (e.g. 1 Year / No Warranty)
                                    </label>
                                    <select
                                      value={line.warranty}
                                      onChange={(e) => handleUpdateProductLine(line.id, { warranty: e.target.value })}
                                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold cursor-pointer focus:border-amber-500 focus:outline-hidden text-xs"
                                    >
                                      <option value="1 Year">1 Year Warranty</option>
                                      <option value="2 Years">2 Years Warranty</option>
                                      <option value="6 Months">6 Months Warranty</option>
                                      <option value="3 Months">3 Months Warranty</option>
                                      <option value="1 Month">1 Month Warranty</option>
                                      <option value="No Warranty">No Warranty</option>
                                    </select>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-slate-700 font-bold text-xs flex items-center gap-1">
                                        <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Device IMEI / Serial</span>
                                        {lStockImeis.length > 0 ? (
                                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                            Required
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                        )}
                                      </label>
                                    </div>
                                    {(() => {
                                      const lVal = (line.serials[0] || '').trim();
                                      const isEntered = Boolean(lVal);
                                      const isMatch = lStockImeis.length > 0 && isEntered && lStockImeis.some((im) => im.toLowerCase() === lVal.toLowerCase());
                                      const isInvalid = lStockImeis.length > 0 && isEntered && !isMatch;

                                      return (
                                        <div>
                                          <div className="relative">
                                            <input
                                              type="text"
                                              value={line.serials[0] || ''}
                                              onChange={(e) => handleLineSerialChange(line.id, 0, e.target.value)}
                                              className={`w-full px-3 py-2 rounded-lg font-mono text-xs pr-7 transition-colors focus:outline-hidden ${
                                                isInvalid
                                                  ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold focus:border-rose-600'
                                                  : isMatch
                                                  ? 'bg-emerald-50/50 border-2 border-emerald-500 text-emerald-950 font-bold'
                                                  : 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                                              }`}
                                              placeholder={lStockImeis.length > 0 ? "Type or click available IMEI below..." : "e.g. 358920192847192"}
                                            />
                                            {line.serials[0] && (
                                              <button
                                                type="button"
                                                onClick={() => handleLineSerialChange(line.id, 0, '')}
                                                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                          {isInvalid && (
                                            <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                              <span>⚠️ Invalid! This IMEI is not in stock ({lVal})</span>
                                            </p>
                                          )}
                                          {isMatch && (
                                            <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                              <span>✓ Valid In-Stock IMEI</span>
                                            </p>
                                          )}
                                          {lStockImeis.length > 0 && (
                                            <div className="mt-2 p-2 bg-amber-50/80 rounded-lg border border-amber-200">
                                              <div className="text-[11px] font-bold text-amber-900 mb-1">
                                                <span>📦 In-Stock IMEIs ({lStockImeis.length}):</span>
                                              </div>
                                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                                {lStockImeis.map((im) => {
                                                  const isSel = lVal.toLowerCase() === im.toLowerCase();
                                                  return (
                                                    <button
                                                      key={im}
                                                      type="button"
                                                      onClick={() => handleLineSerialChange(line.id, 0, im)}
                                                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer ${
                                                        isSel ? 'bg-emerald-600 text-white' : 'bg-white hover:bg-amber-100 text-slate-800 border border-amber-300'
                                                      }`}
                                                    >
                                                      {im} {isSel && '✓'}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-700 font-bold mb-1 text-xs">
                                        Warranty Term (Applies to all units)
                                      </label>
                                      <select
                                        value={line.warranty}
                                        onChange={(e) => handleUpdateProductLine(line.id, { warranty: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold cursor-pointer focus:border-amber-500 focus:outline-hidden text-xs"
                                      >
                                        <option value="1 Year">1 Year Warranty</option>
                                        <option value="2 Years">2 Years Warranty</option>
                                        <option value="6 Months">6 Months Warranty</option>
                                        <option value="3 Months">3 Months Warranty</option>
                                        <option value="1 Month">1 Month Warranty</option>
                                        <option value="No Warranty">No Warranty</option>
                                      </select>
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="block text-slate-700 font-bold text-xs flex items-center gap-1">
                                          <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Device Serial Numbers / IMEIs ({line.quantity} Units)</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const pasted = prompt(`Paste IMEI/Serial for Item #${lineIdx + 2} (${line.quantity} units, separated by comma/newline):`);
                                              if (pasted) {
                                                const extracted = pasted.split(/[,;\n\r\/|]+/).map(s => s.trim()).filter(Boolean);
                                                const newSerials = [...line.serials];
                                                extracted.forEach((sn, i) => {
                                                  if (i < line.quantity) newSerials[i] = sn;
                                                });
                                                handleUpdateProductLine(line.id, { serials: newSerials });
                                              }
                                            }}
                                            className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                                          >
                                            📋 Paste IMEIs
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-[10px] text-slate-500 mb-1.5">
                                        Enter IMEI / Serial Number for each of the {line.quantity} units sold.
                                      </p>
                                    </div>
                                  </div>

                                  {/* Stock IMEIs Chips for Line */}
                                  {lStockImeis.length > 0 && (
                                    <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200">
                                      <div className="text-[11px] font-bold text-amber-900 mb-1">
                                        <span>📦 In-Stock IMEIs ({lStockImeis.length}) - Click to fill:</span>
                                      </div>
                                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                        {lStockImeis.map((im) => {
                                          const isSel = line.serials.some((s) => s.trim().toLowerCase() === im.toLowerCase());
                                          return (
                                            <button
                                              key={im}
                                              type="button"
                                              onClick={() => {
                                                const emptyIdx = line.serials.findIndex((s) => !s || !s.trim());
                                                const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
                                                handleLineSerialChange(line.id, targetIdx, im);
                                              }}
                                              disabled={isSel}
                                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                                isSel ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-70 cursor-not-allowed' : 'bg-white hover:bg-amber-100 text-slate-800 border border-amber-300'
                                              }`}
                                            >
                                              {im} {isSel && '✓'}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                    {Array.from({ length: line.quantity }).map((_, uIdx) => {
                                      const uVal = (line.serials[uIdx] || '').trim();
                                      const isEnt = Boolean(uVal);
                                      const isMatch = lStockImeis.length > 0 && isEnt && lStockImeis.some((im) => im.toLowerCase() === uVal.toLowerCase());
                                      const isInv = lStockImeis.length > 0 && isEnt && !isMatch;
                                      const isDup = isEnt && line.serials.some((s, sIdx) => sIdx !== uIdx && s.trim().toLowerCase() === uVal.toLowerCase());

                                      return (
                                        <div key={uIdx} className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-slate-500 w-12 shrink-0">
                                              Unit #{uIdx + 1}:
                                            </span>
                                            <div className="relative flex-1">
                                              <input
                                                type="text"
                                                value={line.serials[uIdx] || ''}
                                                onChange={(e) => handleLineSerialChange(line.id, uIdx, e.target.value)}
                                                className={`w-full px-2.5 py-1.5 rounded-md font-mono text-xs focus:outline-hidden transition-colors ${
                                                  isInv
                                                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold focus:border-rose-600'
                                                    : isDup
                                                    ? 'bg-amber-50 border-2 border-amber-500 text-amber-950 font-bold'
                                                    : isMatch
                                                    ? 'bg-emerald-50/50 border-2 border-emerald-500 text-emerald-950 font-bold'
                                                    : 'bg-white border border-slate-300 text-slate-900 focus:border-amber-500'
                                                }`}
                                                placeholder={`IMEI / SN for unit ${uIdx + 1}`}
                                              />
                                              {line.serials[uIdx] && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleLineSerialChange(line.id, uIdx, '')}
                                                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          {isInv && (
                                            <p className="text-[10px] font-bold text-rose-600 pl-14">
                                              ❌ Not in stock ({uVal})
                                            </p>
                                          )}
                                          {isDup && (
                                            <p className="text-[10px] font-bold text-amber-600 pl-14">
                                              ⚠️ Already used in another unit
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Button to Add Item */}
                  <div className="pt-2 pb-1">
                    <button
                      type="button"
                      onClick={handleAddProductLine}
                      className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-dashed border-amber-300 hover:border-amber-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-amber-700" />
                      <span>+ Add Item</span>
                    </button>
                  </div>

                  {/* Branch Staff Selection: Sales Person Only */}
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <span>Sales Person *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const customName = prompt('Enter Sales Person Name (e.g. Mya Mya):');
                          if (customName && customName.trim()) {
                            setProductForm((prev) => ({ ...prev, employeeName: customName.trim() }));
                          }
                        }}
                        className="text-xs text-purple-700 hover:text-purple-900 font-bold cursor-pointer hover:underline"
                      >
                        + Custom Name
                      </button>
                    </div>
                    <select
                      value={productForm.employeeName}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          const customName = prompt('Enter Sales Person Name (e.g. Mya Mya):');
                          if (customName && customName.trim()) {
                            setProductForm((prev) => ({ ...prev, employeeName: customName.trim() }));
                          }
                        } else {
                          setProductForm((prev) => ({ ...prev, employeeName: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-800 font-bold text-xs cursor-pointer focus:border-purple-500 focus:outline-hidden"
                    >
                      {productForm.employeeName && !productSalesStaff.some(s => s.name === productForm.employeeName) && (
                        <option value={productForm.employeeName}>
                          {productForm.employeeName}
                        </option>
                      )}
                      {productSalesStaff.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter Custom Name...</option>
                    </select>
                    <p className="text-[11px] text-purple-700 font-medium mt-1">
                      * {branches.find(b => b.id === productForm.branchId)?.name || 'Branch'} • Assigned Sales Person for this voucher
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Payment Method *</label>
                        <select
                          value={productForm.paymentMethod}
                          onChange={(e) => {
                            const pm = e.target.value;
                            if (pm === 'Split (Cash + Bank)' || pm === 'Cash + Bank') {
                              setProductForm((prev) => ({
                                ...prev,
                                paymentMethod: pm,
                                cashAmount: 0,
                                bankAmount: 0,
                                paidAmount: 0,
                                paymentStatus: 'CREDIT',
                                bankType: prev.bankType && prev.bankType !== 'Cash' ? prev.bankType : 'KBZPay',
                              }));
                            } else {
                              setProductForm((prev) => ({ 
                                ...prev, 
                                paymentMethod: pm,
                                bankType: pm !== 'Cash' ? pm : 'Cash'
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                        >
                          {MYANMAR_PAYMENT_METHODS.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {productForm.paymentMethod !== 'Cash' && productForm.paymentMethod !== 'Split (Cash + Bank)' && productForm.paymentMethod !== 'Cash + Bank' && (
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Account / Bank Type</label>
                          <input
                            type="text"
                            value={productForm.bankType || ''}
                            onChange={(e) => setProductForm({ ...productForm, bankType: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                            placeholder="e.g. KBZPay, CB Pay, AYA Pay, WaveMoney"
                          />
                        </div>
                      )}
                    </div>

                    {/* Split Payment Controls Card */}
                    {(productForm.paymentMethod === 'Split (Cash + Bank)' || productForm.paymentMethod === 'Cash + Bank') && (
                      <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            Cash & Bank Payment Allocation
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-slate-700 font-bold text-xs mb-1">
                              Cash Amount (MMK) *
                            </label>
                            <FormattedNumberInput
                              value={productForm.cashAmount}
                              onChange={(val) => {
                                const autoBank = Math.max(0, combinedProductNetTotal - val);
                                const newTotalPaid = val + autoBank;
                                setProductForm(prev => ({
                                  ...prev,
                                  cashAmount: val,
                                  bankAmount: autoBank,
                                  paidAmount: newTotalPaid,
                                  paymentStatus: newTotalPaid >= combinedProductNetTotal ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'CREDIT'),
                                }));
                              }}
                              min={0}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-emerald-700 font-mono font-bold text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold text-xs mb-1">
                              Bank Amount (MMK) *
                            </label>
                            <FormattedNumberInput
                              value={productForm.bankAmount}
                              onChange={(val) => {
                                const currentCash = Number(productForm.cashAmount) || 0;
                                const newTotalPaid = currentCash + val;
                                setProductForm(prev => ({
                                  ...prev,
                                  bankAmount: val,
                                  paidAmount: newTotalPaid,
                                  paymentStatus: newTotalPaid >= combinedProductNetTotal ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'CREDIT'),
                                }));
                              }}
                              min={0}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-blue-700 font-mono font-bold text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold text-xs mb-1">
                              Bank / Wallet Type *
                            </label>
                            <select
                              value={productForm.bankType || 'KBZPay'}
                              onChange={(e) => setProductForm(prev => ({ ...prev, bankType: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-xs cursor-pointer"
                            >
                              <option value="KBZPay">KBZPay</option>
                              <option value="KBZ Bank">KBZ Bank</option>
                              <option value="CB Pay">CB Pay</option>
                              <option value="CB Bank">CB Bank</option>
                              <option value="AYA Pay">AYA Pay</option>
                              <option value="AYA Bank">AYA Bank</option>
                              <option value="WavePay">WavePay</option>
                              <option value="UAB Pay">UAB Pay</option>
                              <option value="Yoma Bank">Yoma Bank</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Billing Card with Multi-Model Support */}
                  {(() => {
                    const combinedSubtotal = combinedProductSubtotal;
                    const combinedDiscount = combinedProductDiscount;
                    const combinedNetTotal = combinedProductNetTotal;
                    const isSplit = productForm.paymentMethod === 'Split (Cash + Bank)';
                    const paid = isSplit 
                      ? ((Number(productForm.cashAmount) || 0) + (Number(productForm.bankAmount) || 0)) 
                      : (Number(productForm.paidAmount) || 0);
                    const balance = Math.max(0, combinedNetTotal - paid);
                    const totalUnits = quantity + additionalProductLines.reduce((s, l) => s + l.quantity, 0);
                    const totalModels = 1 + additionalProductLines.length;

                    return (
                      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-inner space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Sub Total {additionalProductLines.length > 0 ? `(${totalModels} Models, ${totalUnits} Units)` : ''}
                          </span>
                          <span className="text-sm font-mono font-bold text-slate-300">
                            {formatMMK(combinedSubtotal)}
                          </span>
                        </div>

                        {combinedProductCashback > 0 && (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                              Cashback
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-400">
                              - {formatMMK(combinedProductCashback)}
                            </span>
                          </div>
                        )}

                        {combinedDiscount > 0 && (
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs text-rose-400 font-bold uppercase tracking-wider">
                              Discount
                            </span>
                            <span className="text-sm font-mono font-bold text-rose-400">
                              - {formatMMK(combinedDiscount)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Net Total Amount
                          </span>
                          <span className="text-xl font-mono font-black text-amber-400">
                            {formatMMK(combinedNetTotal)}
                          </span>
                        </div>

                        {isSplit ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-400 font-bold">Paid via Cash:</span>
                              <span className="font-mono font-bold text-emerald-400">{formatMMK(productForm.cashAmount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-400 font-bold">Paid via {productForm.bankType || 'Bank'}:</span>
                              <span className="font-mono font-bold text-blue-400">{formatMMK(productForm.bankAmount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Total Paid</span>
                              <span className="text-base font-mono font-bold text-emerald-400">{formatMMK(paid)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                                Paid
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsProductPaidManual(false);
                                  setProductForm((prev) => ({
                                    ...prev,
                                    paidAmount: combinedNetTotal,
                                    paymentStatus: 'PAID',
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  !isProductPaidManual || paid >= combinedNetTotal
                                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                                }`}
                              >
                                Full Paid
                              </button>
                            </div>
                            <div className="w-44">
                              <FormattedNumberInput
                                value={productForm.paidAmount}
                                onChange={(newPaid) => {
                                  if (newPaid === 0 && !isProductPaidManual) {
                                    // keep
                                  }
                                  if (newPaid >= combinedNetTotal) {
                                    setIsProductPaidManual(false);
                                    setProductForm((prev) => ({
                                      ...prev,
                                      paidAmount: newPaid,
                                      paymentStatus: 'PAID',
                                    }));
                                  } else {
                                    setIsProductPaidManual(true);
                                    setProductForm((prev) => ({
                                      ...prev,
                                      paidAmount: newPaid,
                                      paymentStatus: newPaid > 0 ? 'PARTIAL' : 'CREDIT',
                                    }));
                                  }
                                }}
                                min={0}
                                placeholder="0"
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-base text-right focus:border-amber-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Balance / Credit
                          </span>
                          <span className={`text-base font-mono font-bold ${balance === 0 ? 'text-slate-400' : 'text-rose-400'}`}>
                            {formatMMK(balance)}
                          </span>
                        </div>

                        {balance > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                                <span>Installment Plan (Monthly Payment Duration):</span>
                              </label>
                              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                                {formatMMK(Math.ceil(balance / (creditInstallmentMonths || 1)))} / Month
                              </span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                              {[1, 2, 3, 4, 5, 6].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setCreditInstallmentMonths(m)}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                    creditInstallmentMonths === m
                                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {m === 1 ? '1 Month' : `${m} Months`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}

              {/* ---------------- SERVICE & REPAIR FORM ---------------- */}
              {modalSaleType === 'SERVICE' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold text-xs">
                          Service Charges Code (Auto) *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newCode = generateAutoSKU('Service Charges', inventory, sales);
                            setServiceForm((prev) => ({ ...prev, sku: newCode }));
                          }}
                          className="text-[10px] text-cyan-700 hover:text-cyan-900 font-bold cursor-pointer"
                        >
                          ↻ Code 400001+
                        </button>
                      </div>
                      <input
                        type="text"
                        value={serviceForm.sku}
                        onChange={(e) => setServiceForm({ ...serviceForm, sku: e.target.value })}
                        className="w-full px-3 py-2 bg-cyan-50/70 border border-cyan-300 rounded-lg text-cyan-950 font-mono font-bold focus:bg-white focus:border-cyan-500 focus:outline-hidden"
                        placeholder="e.g. 400001"
                      />
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                        Service Charges Code Range: 400001+
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Device Model *
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceForm.deviceModel}
                        onChange={(e) => setServiceForm({ ...serviceForm, deviceModel: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:border-cyan-500 focus:outline-hidden"
                        placeholder="e.g. Dell Latitude 5420 / iPhone 13"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Serial / IMEI / Tag
                      </label>
                      <input
                        type="text"
                        value={serviceForm.deviceSerial}
                        onChange={(e) => setServiceForm({ ...serviceForm, deviceSerial: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                        placeholder="SN / IMEI (Optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Service Description / Defect *
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceForm.issueDescription}
                        onChange={(e) => setServiceForm({ ...serviceForm, issueDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                        placeholder="e.g. Service Charges (1.0) / Screen & Battery Replacement"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Service Charges (MMK) *
                      </label>
                      <FormattedNumberInput
                        value={serviceForm.serviceLaborFee}
                        onChange={(val) => {
                          const parts = Number(serviceForm.sparePartsPrice) || 0;
                          setServiceForm({
                            ...serviceForm,
                            serviceLaborFee: val,
                            paidAmount: val + parts,
                          });
                        }}
                        showLiveBadge={true}
                        min={0}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-right focus:border-cyan-500 focus:outline-hidden"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Total Bill (Service + Parts)
                      </label>
                      <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-900 font-mono font-black text-right">
                        {formatMMK((Number(serviceForm.serviceLaborFee) || 0) + (Number(serviceForm.sparePartsPrice) || 0))}
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Spare Part Replacement Card with Code 500001+ */}
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="has-spare-part-toggle"
                          checked={serviceForm.hasSparePart || !!serviceForm.sparePartsUsed || (Number(serviceForm.sparePartsPrice) > 0)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (!checked) {
                              setSparePartInventoryId('');
                              setServiceForm((prev) => ({
                                ...prev,
                                hasSparePart: false,
                                sparePartsUsed: '',
                                sparePartsPrice: 0,
                                sparePartsCost: 0,
                                paidAmount: Number(prev.serviceLaborFee || 0),
                              }));
                            } else {
                              const autoCode = generateAutoSKU('Service Spare Part', inventory, sales);
                              setServiceForm((prev) => ({
                                ...prev,
                                hasSparePart: true,
                                sparePartSku: autoCode,
                              }));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                        <label htmlFor="has-spare-part-toggle" className="text-xs font-bold text-emerald-950 cursor-pointer flex items-center gap-1.5">
                          <span>Spare Part Replaced? (Check if spare part was used)</span>
                        </label>
                      </div>
                      
                      {(serviceForm.hasSparePart || !!serviceForm.sparePartsUsed || Number(serviceForm.sparePartsPrice) > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPartCode = generateAutoSKU('Service Spare Part', inventory, sales);
                            setServiceForm((prev) => ({ ...prev, sparePartSku: newPartCode }));
                          }}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                        >
                          ↻ Auto Code 500001+
                        </button>
                      )}
                    </div>

                    {(serviceForm.hasSparePart || !!serviceForm.sparePartsUsed || Number(serviceForm.sparePartsPrice) > 0) && (
                      <div className="space-y-2.5 pt-1 border-t border-emerald-200/80">
                        {/* Select from Inventory */}
                        <div>
                          <label className="block text-slate-700 font-bold text-[11px] mb-1">
                            Select from Spare Parts Inventory (or enter custom part below)
                          </label>
                          <select
                            value={sparePartInventoryId}
                            onChange={(e) => handleSelectSparePart(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-800 text-xs font-medium"
                          >
                            <option value="">-- Or enter custom part manually below --</option>
                            {inventory
                              .filter(
                                (i) =>
                                  i.category === 'Service Spare Part' ||
                                  i.category === 'Spare Parts & Hardware' ||
                                  (i.sku && i.sku.startsWith('500'))
                              )
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  [{item.sku}] {item.name} ({formatMMK(item.sellingPrice)})
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Spare Part Code & Name */}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <label className="block text-slate-700 font-bold text-[11px] mb-0.5">
                              Part Code (500001+) *
                            </label>
                            <input
                              type="text"
                              value={serviceForm.sparePartSku || '500001'}
                              onChange={(e) => setServiceForm({ ...serviceForm, sparePartSku: e.target.value, hasSparePart: true })}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-950 font-mono font-bold text-xs focus:outline-hidden"
                              placeholder="500001"
                            />
                          </div>

                          <div className="col-span-8">
                            <label className="block text-slate-700 font-bold text-[11px] mb-0.5">
                              Spare Part Name / Description *
                            </label>
                            <input
                              type="text"
                              value={serviceForm.sparePartsUsed}
                              onChange={(e) => setServiceForm({ ...serviceForm, sparePartsUsed: e.target.value, hasSparePart: true })}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-medium text-xs focus:outline-hidden"
                              placeholder="e.g. iPhone 11 Display Original / Battery"
                            />
                          </div>
                        </div>

                        {/* Spare Part Price & Cost */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-700 font-bold text-[11px] mb-0.5">
                              Part Selling Price (MMK) *
                            </label>
                            <FormattedNumberInput
                              value={serviceForm.sparePartsPrice}
                              onChange={(val) => {
                                const fee = Number(serviceForm.serviceLaborFee) || 0;
                                setServiceForm({
                                  ...serviceForm,
                                  sparePartsPrice: val,
                                  paidAmount: fee + val,
                                });
                              }}
                              min={0}
                              className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-slate-900 font-mono font-bold text-right text-xs focus:outline-hidden"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Service Staff Selection: Sales Person / Service Staff Only */}
                  <div className="p-3 bg-cyan-50/60 border border-cyan-200/80 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-cyan-700" />
                        <span>Sales Person / Staff *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const customName = prompt('Enter Staff / Technician Name (e.g. Mya Mya):');
                          if (customName && customName.trim()) {
                            setServiceForm((prev) => ({ ...prev, technicianName: customName.trim() }));
                          }
                        }}
                        className="text-xs text-cyan-700 hover:text-cyan-900 font-bold cursor-pointer hover:underline"
                      >
                        + Custom Name
                      </button>
                    </div>
                    <select
                      value={serviceForm.technicianName}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          const customName = prompt('Enter Staff / Technician Name (e.g. Mya Mya):');
                          if (customName && customName.trim()) {
                            setServiceForm((prev) => ({ ...prev, technicianName: customName.trim() }));
                          }
                        } else {
                          setServiceForm((prev) => ({ ...prev, technicianName: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-slate-800 font-bold text-xs cursor-pointer focus:border-cyan-500 focus:outline-hidden"
                    >
                      {serviceForm.technicianName && !serviceTechnicians.some(s => s.name === serviceForm.technicianName) && (
                        <option value={serviceForm.technicianName}>
                          {serviceForm.technicianName}
                        </option>
                      )}
                      {serviceTechnicians.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Enter Custom Name...</option>
                    </select>
                    <p className="text-[11px] text-cyan-800 font-medium mt-1">
                      * {branches.find(b => b.id === serviceForm.branchId)?.name || 'Branch'} • Assigned staff for this voucher
                    </p>
                  </div>

                  {/* Payment Method Details */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Payment Method *</label>
                        <select
                          value={serviceForm.paymentMethod}
                          onChange={(e) => {
                            const pm = e.target.value;
                            if (pm === 'Split (Cash + Bank)' || pm === 'Cash + Bank') {
                              setServiceForm((prev) => ({
                                ...prev,
                                paymentMethod: pm,
                                cashAmount: 0,
                                bankAmount: 0,
                                paidAmount: 0,
                                paymentStatus: 'CREDIT',
                                bankType: prev.bankType && prev.bankType !== 'Cash' ? prev.bankType : 'KBZPay',
                              }));
                            } else {
                              setServiceForm({ 
                                ...serviceForm, 
                                paymentMethod: pm,
                                bankType: pm !== 'Cash' ? pm : 'Cash'
                              });
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                        >
                          {MYANMAR_PAYMENT_METHODS.map((pm) => (
                            <option key={pm.id} value={pm.id}>
                              {pm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {serviceForm.paymentMethod !== 'Cash' && serviceForm.paymentMethod !== 'Split (Cash + Bank)' && serviceForm.paymentMethod !== 'Cash + Bank' && (
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Account / Bank Type</label>
                          <input
                            type="text"
                            value={serviceForm.bankType || ''}
                            onChange={(e) => setServiceForm({ ...serviceForm, bankType: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                            placeholder="e.g. KBZPay, CB Pay, AYA Pay, WaveMoney"
                          />
                        </div>
                      )}
                    </div>

                    {/* Split Payment Controls Card for Service */}
                    {(serviceForm.paymentMethod === 'Split (Cash + Bank)' || serviceForm.paymentMethod === 'Cash + Bank') && (() => {
                      const totalBill = Number(serviceForm.serviceLaborFee || 0) + Number(serviceForm.sparePartsPrice || 0);
                      return (
                        <div className="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                              Cash & Bank Payment Allocation
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-700 font-bold text-xs mb-1">
                                Cash Amount (MMK) *
                              </label>
                              <FormattedNumberInput
                                value={serviceForm.cashAmount}
                                onChange={(val) => {
                                  const autoBank = Math.max(0, totalBill - val);
                                  const newTotalPaid = val + autoBank;
                                  setServiceForm(prev => ({
                                    ...prev,
                                    cashAmount: val,
                                    bankAmount: autoBank,
                                    paidAmount: newTotalPaid,
                                    paymentStatus: newTotalPaid >= totalBill ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'CREDIT'),
                                  }));
                                }}
                                min={0}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-emerald-700 font-mono font-bold text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold text-xs mb-1">
                                Bank Amount (MMK) *
                              </label>
                              <FormattedNumberInput
                                value={serviceForm.bankAmount}
                                onChange={(val) => {
                                  const currentCash = Number(serviceForm.cashAmount) || 0;
                                  const newTotalPaid = currentCash + val;
                                  setServiceForm(prev => ({
                                    ...prev,
                                    bankAmount: val,
                                    paidAmount: newTotalPaid,
                                    paymentStatus: newTotalPaid >= totalBill ? 'PAID' : (newTotalPaid > 0 ? 'PARTIAL' : 'CREDIT'),
                                  }));
                                }}
                                min={0}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-blue-700 font-mono font-bold text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-700 font-bold text-xs mb-1">
                                Bank / Wallet Type *
                              </label>
                              <select
                                value={serviceForm.bankType || 'KBZPay'}
                                onChange={(e) => setServiceForm(prev => ({ ...prev, bankType: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-xs cursor-pointer"
                              >
                                <option value="KBZPay">KBZPay</option>
                                <option value="KBZ Bank">KBZ Bank</option>
                                <option value="CB Pay">CB Pay</option>
                                <option value="CB Bank">CB Bank</option>
                                <option value="AYA Pay">AYA Pay</option>
                                <option value="AYA Bank">AYA Bank</option>
                                <option value="WavePay">WavePay</option>
                                <option value="UAB Pay">UAB Pay</option>
                                <option value="Yoma Bank">Yoma Bank</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Billing Card */}
                  {(() => {
                    const totalBill = Number(serviceForm.serviceLaborFee || 0) + Number(serviceForm.sparePartsPrice || 0);
                    const isSplit = serviceForm.paymentMethod === 'Split (Cash + Bank)';
                    const paid = isSplit 
                      ? ((Number(serviceForm.cashAmount) || 0) + (Number(serviceForm.bankAmount) || 0)) 
                      : (Number(serviceForm.paidAmount) || 0);
                    const balance = Math.max(0, totalBill - paid);

                    return (
                      <div className="p-4 bg-slate-900 text-white rounded-xl shadow-inner space-y-3">
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Total Service Fee
                          </span>
                          <span className="text-xl font-mono font-black text-cyan-400">
                            {formatMMK(totalBill)}
                          </span>
                        </div>

                        {isSplit ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-400 font-bold">Paid via Cash:</span>
                              <span className="font-mono font-bold text-emerald-400">{formatMMK(serviceForm.cashAmount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-blue-400 font-bold">Paid via {serviceForm.bankType || 'Bank'}:</span>
                              <span className="font-mono font-bold text-blue-400">{formatMMK(serviceForm.bankAmount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Total Paid</span>
                              <span className="text-base font-mono font-bold text-emerald-400">{formatMMK(paid)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                                Paid
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setServiceForm((prev) => ({
                                    ...prev,
                                    paidAmount: totalBill,
                                    paymentStatus: 'PAID',
                                  }));
                                }}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold rounded cursor-pointer transition-colors"
                              >
                                Full Paid
                              </button>
                            </div>
                            <div className="w-44">
                              <FormattedNumberInput
                                value={serviceForm.paidAmount}
                                onChange={(newPaid) => {
                                  setServiceForm((prev) => ({
                                    ...prev,
                                    paidAmount: newPaid,
                                    paymentStatus: newPaid >= totalBill ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'CREDIT'),
                                  }));
                                }}
                                min={0}
                                placeholder="0"
                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold text-base text-right focus:border-cyan-500 focus:outline-hidden"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-800">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Balance / Credit
                          </span>
                          <span className={`text-base font-mono font-bold ${balance === 0 ? 'text-slate-400' : 'text-rose-400'}`}>
                            {formatMMK(balance)}
                          </span>
                        </div>

                        {balance > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                                <span>Installment Plan (Monthly Payment Duration):</span>
                              </label>
                              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                                {formatMMK(Math.ceil(balance / (creditInstallmentMonths || 1)))} / Month
                              </span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                              {[1, 2, 3, 4, 5, 6].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setCreditInstallmentMonths(m)}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                                    creditInstallmentMonths === m
                                      ? 'bg-cyan-400 text-slate-950 font-black shadow-xs'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  }`}
                                >
                                  {m === 1 ? '1 Month' : `${m} Months`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
              </div>

              {/* Sticky Modal Footer with Action Buttons */}
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
                  className={`px-5 py-2 rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                    modalSaleType === 'PRODUCT'
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {editingSale 
                    ? 'Save Voucher Changes' 
                    : (modalSaleType === 'PRODUCT' ? 'Issue Sales Voucher' : 'Issue Service Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Customer Voucher Modal with Dual Print Mode */}
      {selectedVoucherSale && (
        <POSCustomerVoucherModal
          sale={selectedVoucherSale}
          sales={sales}
          branches={branches}
          inventory={inventory}
          purchases={purchases}
          employees={employees}
          printType={voucherPrintType}
          onPrintTypeChange={(type) => setVoucherPrintType(type)}
          onClose={() => setSelectedVoucherSale(null)}
        />
      )}

      {/* Quick Bulk Paste IMEIs Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Quick Multi-Paste IMEIs / Serials</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Paste multiple IMEI / Serial numbers from scanner or sheet separated by commas (,) or new lines (Enter).
            </p>
            <textarea
              rows={5}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder={`358920192847191\n358920192847192\n358920192847193`}
              className="w-full p-2.5 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-amber-500 focus:outline-hidden"
            />
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                Detected: {bulkPasteText.split(/[\r\n,]+/).filter(s => s.trim()).length} IMEIs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPasteModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPaste}
                  className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Apply IMEIs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Cash Allocation Modal */}
      {isCashAllocationModalOpen && (
        <DailyCashAllocationModal
          isOpen={isCashAllocationModalOpen}
          onClose={() => setIsCashAllocationModalOpen(false)}
          sales={sales}
          branches={branches}
          currentUser={currentUser}
          allocations={dailyCashAllocations}
          onSaveAllocation={(alloc) => {
            if (onSaveDailyCashAllocation) {
              onSaveDailyCashAllocation(alloc);
            }
          }}
          onDeleteAllocation={(id) => {
            if (onDeleteDailyCashAllocation) {
              onDeleteDailyCashAllocation(id);
            }
          }}
        />
      )}

      {/* Manager Authorization Modal for Void / Delete operations */}
      {isManagerAuthOpen && (
        <ManagerAuthModal
          isOpen={isManagerAuthOpen}
          title="Manager Authorization Required"
          actionDescription={
            pendingVoidSale
              ? `Authorize VOID / DELETION of Sales Voucher #${pendingVoidSale.invoiceNo} (${pendingVoidSale.itemName} - ${formatMMK(pendingVoidSale.salePrice)})`
              : 'Authorize sensitive sales record action'
          }
          users={users}
          currentUser={currentUser}
          requireReason={true}
          onAuthorized={(authBy, reason) => handleConfirmVoid(authBy, reason)}
          onClose={() => {
            setIsManagerAuthOpen(false);
            setPendingVoidSale(null);
          }}
        />
      )}

      {/* Smart Retail POS High-Speed Checkout Modal */}
      {isSmartPOSOpen && (
        <SmartPOSModal
          isOpen={isSmartPOSOpen}
          onClose={() => setIsSmartPOSOpen(false)}
          inventory={inventory}
          branches={branches}
          employees={employees}
          currentUser={currentUser}
          activeBranchFilter={activeBranchFilter}
          existingSales={sales}
          contacts={contacts}
          activeShift={activeShift}
          heldBills={heldBills}
          onSaveHoldBill={onSaveHoldBill}
          onRemoveHoldBill={onRemoveHoldBill}
          onCompleteSale={(completedSale, cartItems) => {
            if (onCompleteSmartPOSSale) {
              onCompleteSmartPOSSale(completedSale, cartItems);
            } else {
              onAddSale(completedSale, cartItems[0]?.inventoryItemId, cartItems[0]?.quantity);
            }
            setSelectedVoucherSale(completedSale);
          }}
        />
      )}

      {/* Cashier Shift Handover & Z-Report Modal */}
      {isShiftModalOpen && (
        <CashierShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          currentUser={currentUser}
          branch={
            branches.find(
              (b) => b.id === (currentUser.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser.branchId)
            ) || branches[0]
          }
          activeShift={activeShift}
          sales={sales}
          onStartShift={(openingCash, notes) => {
            if (onStartShift) onStartShift(openingCash, notes);
          }}
          onCloseShift={(actualCash, expectedCash, notes) => {
            if (onCloseShift) onCloseShift(actualCash, expectedCash, notes);
          }}
        />
      )}

      {/* Customer CRM & Warranty Tracker Modal */}
      {isWarrantyTrackerOpen && (
        <CustomerWarrantyTrackerModal
          isOpen={isWarrantyTrackerOpen}
          onClose={() => setIsWarrantyTrackerOpen(false)}
          sales={sales}
          branches={branches}
          inventory={inventory}
          purchases={purchases}
          onSelectSaleVoucher={(sale) => setSelectedVoucherSale(sale)}
          onSelectVoucherToPrint={(sale) => setSelectedVoucherSale(sale)}
        />
      )}

      {/* Customer Detailed Purchase History Modal */}
      {selectedCustomerForHistory && (
        <CustomerHistoryModal
          isOpen={!!selectedCustomerForHistory}
          onClose={() => setSelectedCustomerForHistory(null)}
          customer={selectedCustomerForHistory}
          historySales={getCustomerPurchaseHistory(
            selectedCustomerForHistory.phone || selectedCustomerForHistory.name,
            sales
          )}
        />
      )}

      {/* Item-wise Sales Quantity & Performance Breakdown Modal */}
      {isItemBreakdownOpen && (
        <ItemSalesBreakdownModal
          isOpen={isItemBreakdownOpen}
          onClose={() => setIsItemBreakdownOpen(false)}
          sales={filteredSales}
          inventory={inventory}
          branches={branches}
          activeBranchFilter={activeBranchFilter}
          periodLabel={dateFilter.preset === 'ALL' ? 'All Transactions' : `${dateFilter.startDate} to ${dateFilter.endDate}`}
        />
      )}

      {/* Branch Target Editing Modal */}
      {editingBranchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Set Monthly Target • {editingBranchTarget.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Branch Code: {editingBranchTarget.code || editingBranchTarget.id} ({editingBranchTarget.city || 'Yangon'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingBranchTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-purple-700" />
                    <span>Monthly Mobile Sales Target (Units)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={targetFormMobile}
                    onChange={(e) => setTargetFormMobile(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-purple-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-purple-950"
                    placeholder="100"
                  />
                  <span className="text-[10px] text-purple-700 mt-1 block">
                    Target units of smartphones &amp; keypad phones to sell per month
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-indigo-700" />
                    <span>Monthly Laptop Sales Target (Units)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={targetFormLaptop}
                    onChange={(e) => setTargetFormLaptop(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-indigo-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-indigo-950"
                    placeholder="25"
                  />
                  <span className="text-[10px] text-indigo-700 mt-1 block">
                    Target units of laptops, MacBooks &amp; computers to sell per month
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBranchTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Target</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
