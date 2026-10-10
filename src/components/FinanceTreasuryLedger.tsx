import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  Landmark, 
  Receipt, 
  CircleDollarSign, 
  Coins, 
  ArrowLeftRight, 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2, 
  History, 
  Clock, 
  ShoppingBag, 
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronRight,
  Sparkles,
  Calendar,
  X,
  Check,
  Percent,
  Shield,
  Eye,
  FileText,
  Printer,
  RotateCcw,
  Tag,
  PackageCheck,
  Copy,
  Zap
} from 'lucide-react';
import { 
  PurchaseRecord, 
  PurchaseItemLine,
  PurchaseInstallment,
  TreasuryAccount, 
  TreasuryTransaction, 
  ContactPartner, 
  InventoryItem, 
  Branch, 
  DailySale, 
  DailyExpense, 
  SalaryRecord, 
  UserAccount,
  InventoryCategory,
  InterBranchTransfer,
  SupplierReturn,
  canUserDelete,
  isMDUser
} from '../types';
import { SupplierReturnModal } from './SupplierReturnModal';
import { formatMMK, formatNumber, getMonthName, formatDateDMY } from '../utils/formatters';
import { generateAutoPOCode, generateAutoSKU, detectBrandFromName, DEFAULT_PRIMARY_SHOP_BRANDS, getBrandSKUPrefix } from '../utils/skuGenerator';
import { DateRangeFilter, DateFilterState, isDateWithinFilter } from './DateRangeFilter';
import { FormattedNumberInput } from './FormattedNumberInput';

interface FinanceTreasuryLedgerProps {
  purchases: PurchaseRecord[];
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  contacts: ContactPartner[];
  inventory: InventoryItem[];
  branches: Branch[];
  sales: DailySale[];
  expenses: DailyExpense[];
  salaryRecords: SalaryRecord[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onAddPurchase: (purchase: PurchaseRecord, accountId?: string) => void;
  onUpdatePurchase: (purchase: PurchaseRecord) => void;
  onDeletePurchase: (id: string) => void;
  onPaySupplierDebt: (
    purchaseId: string,
    paymentAmount: number,
    accountId: string,
    notes?: string
  ) => void;
  onTransferFunds: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    notes?: string
  ) => void;
  onAdjustAccountBalance: (
    accountId: string,
    newBalance: number,
    reason: string
  ) => void;
  interBranchTransfers?: InterBranchTransfer[];
  onAddBranchTransfer?: (
    transfer: Omit<InterBranchTransfer, 'id' | 'transferNo' | 'createdAt'>,
    settleNow: boolean
  ) => void;
  onSettleBranchPayment?: (
    transferId: string,
    paymentMethod: string,
    notes?: string,
    paidFromAccountId?: string,
    receivedInAccountId?: string
  ) => void;
  supplierReturns?: SupplierReturn[];
  onAddSupplierReturn?: (returnRecord: SupplierReturn) => void;
  onSyncPoToInventory?: (purchase: PurchaseRecord) => void;
  onNavigateToTab?: (tab: string, subTab?: string) => void;
  initialTab?: 'purchases' | 'suppliers' | 'accounts' | 'cashflow';
}

export const FinanceTreasuryLedger: React.FC<FinanceTreasuryLedgerProps> = ({
  purchases,
  treasuryAccounts,
  treasuryTransactions,
  contacts,
  inventory,
  branches,
  sales,
  expenses,
  salaryRecords,
  currentUser,
  activeBranchFilter,
  selectedMonth,
  setSelectedMonth,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onPaySupplierDebt,
  onTransferFunds,
  onAdjustAccountBalance,
  interBranchTransfers = [],
  onAddBranchTransfer = () => {},
  onSettleBranchPayment = () => {},
  supplierReturns = [],
  onAddSupplierReturn = (_returnRecord: SupplierReturn) => {},
  onSyncPoToInventory = (_purchase: PurchaseRecord) => {},
  onNavigateToTab,
  initialTab,
}) => {
  const isMD = isMDUser(currentUser);

  // Main sub-views inside Finance (Clean & Streamlined - Transfers, Returns and P&L routed to dedicated standalone modules)
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'suppliers' | 'accounts' | 'cashflow'>(initialTab || 'purchases');

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');
  const todayStr = new Date().toISOString().split('T')[0];
  const [purchaseDateFilter, setPurchaseDateFilter] = useState<DateFilterState>(() => {
    if (selectedMonth && selectedMonth !== 'ALL') {
      return {
        preset: 'MONTHLY',
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-31`,
      };
    }
    return {
      preset: 'ALL',
      startDate: todayStr,
      endDate: todayStr,
    };
  });

  // Sync purchaseDateFilter whenever selectedMonth prop changes from the global header
  useEffect(() => {
    if (selectedMonth && selectedMonth !== 'ALL') {
      setPurchaseDateFilter((prev) => {
        if (prev.startDate && prev.startDate.startsWith(selectedMonth) && prev.preset !== 'ALL') {
          return prev;
        }
        return {
          preset: 'MONTHLY',
          startDate: `${selectedMonth}-01`,
          endDate: `${selectedMonth}-31`,
        };
      });
    } else if (selectedMonth === 'ALL') {
      setPurchaseDateFilter({
        preset: 'ALL',
        startDate: todayStr,
        endDate: todayStr,
      });
    }
  }, [selectedMonth, todayStr]);

  const handlePurchaseDateFilterChange = (newFilter: DateFilterState) => {
    setPurchaseDateFilter(newFilter);
    if (newFilter.preset === 'MONTHLY' && newFilter.startDate) {
      const m = newFilter.startDate.slice(0, 7);
      if (setSelectedMonth && m !== selectedMonth) {
        setSelectedMonth(m);
      }
    } else if (newFilter.preset === 'ALL') {
      if (setSelectedMonth && selectedMonth !== 'ALL') {
        setSelectedMonth('ALL');
      }
    }
  };

  // Modals state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState<PurchaseRecord | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedAccountForAdjust, setSelectedAccountForAdjust] = useState<TreasuryAccount | null>(null);
  const [viewHistoryPurchase, setViewHistoryPurchase] = useState<PurchaseRecord | null>(null);
  const [selectedPODetail, setSelectedPODetail] = useState<PurchaseRecord | null>(null);

  // Global Escape key listener to close modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPurchaseModalOpen(false);
        setIsPayDebtModalOpen(false);
        setIsTransferModalOpen(false);
        setIsAdjustModalOpen(false);
        setViewHistoryPurchase(null);
        setSelectedPODetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // New Purchase Form State
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(() => generateAutoPOCode(purchases));
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [targetBranchId, setTargetBranchId] = useState(branches[0]?.id || 'ALL');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Smartphones & Tablets');
  const [warranty, setWarranty] = useState('1 Year Official');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentAccountId, setPaymentAccountId] = useState(treasuryAccounts[0]?.id || 'acc-cash-hq');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [autoStockIn, setAutoStockIn] = useState(true);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [brand, setBrand] = useState('Samsung');

  // PO IMEI / Serial Numbers State
  const [purchaseImeis, setPurchaseImeis] = useState<string[]>([]);
  const [currentImeiInput, setCurrentImeiInput] = useState('');
  const [isBulkImeiOpen, setIsBulkImeiOpen] = useState(false);
  const [bulkImeiInput, setBulkImeiInput] = useState('');
  const [imeiErrorMsg, setImeiErrorMsg] = useState<string | null>(null);

  // Supplier Return Modal State
  const [isSupplierReturnModalOpen, setIsSupplierReturnModalOpen] = useState(false);
  const [selectedReturnPurchase, setSelectedReturnPurchase] = useState<PurchaseRecord | null>(null);
  const [selectedReturnItem, setSelectedReturnItem] = useState<InventoryItem | null>(null);

  // Set of all existing IMEIs across inventory and past POs for duplicate prevention
  const existingImeiSet = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((item) => {
      if (item.imeiOrSerial) set.add(item.imeiOrSerial.trim().toLowerCase());
      if (item.serialNumbers) {
        item.serialNumbers.forEach((sn) => sn && set.add(sn.trim().toLowerCase()));
      }
      if (item.imeiList) {
        item.imeiList.forEach((im) => im && set.add(im.trim().toLowerCase()));
      }
      if (item.imeiNumbers) {
        item.imeiNumbers.forEach((im) => im && set.add(im.trim().toLowerCase()));
      }
    });
    purchases.forEach((po) => {
      if (po.imeiList) {
        po.imeiList.forEach((im) => im && set.add(im.trim().toLowerCase()));
      }
      if (po.serialNumbers) {
        po.serialNumbers.forEach((sn) => sn && set.add(sn.trim().toLowerCase()));
      }
    });
    return set;
  }, [inventory, purchases]);

  // Handle adding IMEI with duplicate check
  const handleAddImeiToPurchase = (imeiStr: string) => {
    const cleaned = imeiStr.trim();
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();

    if (purchaseImeis.some((im) => im.toLowerCase() === lower)) {
      setImeiErrorMsg(`⚠️ IMEI/SN "${cleaned}" is already added to this list (Duplicate in current list).`);
      return;
    }

    if (existingImeiSet.has(lower)) {
      setImeiErrorMsg(`⚠️ IMEI/SN "${cleaned}" already exists in stock! Duplicate IMEIs are not allowed.`);
      return;
    }

    setImeiErrorMsg(null);
    setPurchaseImeis((prev) => [...prev, cleaned]);
    setCurrentImeiInput('');
    if (quantity < purchaseImeis.length + 1) {
      setQuantity(purchaseImeis.length + 1);
    }
  };

  // Bulk Add IMEIs from scanner or paste
  const handleBulkAddImeis = (text: string) => {
    const lines = text.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newToAdd: string[] = [];
    const duplicates: string[] = [];

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (purchaseImeis.some((im) => im.toLowerCase() === lower) || newToAdd.some((im) => im.toLowerCase() === lower)) {
        duplicates.push(line);
      } else if (existingImeiSet.has(lower)) {
        duplicates.push(`${line} (Already in stock)`);
      } else {
        newToAdd.push(line);
      }
    });

    if (duplicates.length > 0 && newToAdd.length === 0) {
      setImeiErrorMsg(`⚠️ Duplicate IMEIs found: ${duplicates.slice(0, 3).join(', ')}...`);
      return;
    }

    if (newToAdd.length > 0) {
      setPurchaseImeis((prev) => [...prev, ...newToAdd]);
      if (quantity < purchaseImeis.length + newToAdd.length) {
        setQuantity(purchaseImeis.length + newToAdd.length);
      }
      setBulkImeiInput('');
      setIsBulkImeiOpen(false);
      setImeiErrorMsg(null);
    }
  };

  // Match existing product in inventory by selected item, or name/model/sku
  const matchedInventoryItem = useMemo(() => {
    if (selectedInventoryItem) return selectedInventoryItem;
    if (!itemName.trim()) return null;
    const q = itemName.trim().toLowerCase();
    return (
      inventory.find(
        (i) =>
          i.name.trim().toLowerCase() === q ||
          (i.model && i.model.trim().toLowerCase() === q) ||
          i.sku.trim().toLowerCase() === q
      ) || null
    );
  }, [selectedInventoryItem, itemName, inventory]);

  const isExistingModel = !!matchedInventoryItem;

  // Detected brand from item name
  const detectedBrand = useMemo(() => {
    if (matchedInventoryItem) return matchedInventoryItem.brand;
    return detectBrandFromName(itemName, category);
  }, [matchedInventoryItem, itemName, category]);

  // Keep selected brand in sync with detectedBrand when itemName changes
  useEffect(() => {
    if (detectedBrand) {
      setBrand(detectedBrand);
    }
  }, [detectedBrand]);

  // Generated preview Stock Code for brand (or existing SKU if existing model)
  const previewStockCode = useMemo(() => {
    if (matchedInventoryItem) {
      return matchedInventoryItem.sku;
    }
    const targetBrand = brand || detectedBrand || 'Samsung';
    return generateAutoSKU(category, inventory, sales, targetBrand, itemName);
  }, [matchedInventoryItem, category, inventory, sales, brand, detectedBrand, itemName]);

  // Filtered suppliers from contacts (STRICTLY Suppliers only, never Customers)
  const supplierSuggestions = useMemo(() => {
    const onlySuppliers = contacts.filter((c) => {
      const pType = (c.type || (c as any).partnerType || '').trim().toLowerCase();
      return pType === 'supplier' || pType.includes('supplier');
    });

    if (!supplierName.trim()) {
      return onlySuppliers.slice(0, 8);
    }
    const q = supplierName.toLowerCase();
    return onlySuppliers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.company && c.company.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [contacts, supplierName]);

  // Filtered items from inventory
  const inventoryItemSuggestions = useMemo(() => {
    if (!itemName.trim()) {
      return inventory.slice(0, 8);
    }
    const q = itemName.toLowerCase();
    return inventory.filter(
      (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || (i.brand && i.brand.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [inventory, itemName]);

  // Settle Debt Form State
  const [debtPayAmount, setDebtPayAmount] = useState<number>(0);
  const [debtPayAccountId, setDebtPayAccountId] = useState(treasuryAccounts[0]?.id || 'acc-cash-hq');
  const [debtPayNotes, setDebtPayNotes] = useState('');

  // Transfer Form State
  const [fromAccountId, setFromAccountId] = useState(treasuryAccounts[0]?.id || 'acc-cash-hq');
  const [toAccountId, setToAccountId] = useState(treasuryAccounts[1]?.id || 'acc-kbz-bank');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');

  // Adjust Balance Form State
  const [adjustNewBalance, setAdjustNewBalance] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Opening Balance Calibration');

  // Additional Product Models in Single PO
  const [additionalPoLines, setAdditionalPoLines] = useState<Array<{
    id: string;
    itemName: string;
    brand: string;
    category: InventoryCategory;
    warranty: string;
    unitCost: number;
    quantity: number;
    imeis: string[];
    currentImeiInput: string;
    isBulkOpen: boolean;
    bulkInput: string;
    imeiError: string | null;
    selectedInventoryItem: InventoryItem | null;
  }>>([]);

  // Installment Schedule State (Daily, Weekly, Monthly & Custom counts)
  const [isInstallmentPlanEnabled, setIsInstallmentPlanEnabled] = useState<boolean>(false);
  const [installmentFrequency, setInstallmentFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [installmentCount, setInstallmentCount] = useState<number>(3); // 2 to 10
  const [poInstallments, setPoInstallments] = useState<PurchaseInstallment[]>([]);

  // Add extra product model line
  const handleAddPoModelLine = () => {
    setAdditionalPoLines((prev) => [
      ...prev,
      {
        id: `po-line-${Date.now()}-${prev.length + 1}`,
        itemName: '',
        brand: 'Samsung',
        category: 'Smartphones & Tablets',
        warranty: '1 Year Official',
        unitCost: 0,
        quantity: 1,
        imeis: [],
        currentImeiInput: '',
        isBulkOpen: false,
        bulkInput: '',
        imeiError: null,
        selectedInventoryItem: null,
      }
    ]);
  };

  const handleRemovePoModelLine = (id: string) => {
    setAdditionalPoLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdatePoModelLine = (id: string, updates: Partial<typeof additionalPoLines[0]>) => {
    setAdditionalPoLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...updates } : line))
    );
  };

  // Add single IMEI to a specific model line with duplicate checks
  const handleAddImeiToPoLine = (lineId: string, imeiStr: string) => {
    const cleaned = imeiStr.trim();
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();

    const line = additionalPoLines.find((l) => l.id === lineId);
    if (!line) return;

    if (line.imeis.some((im) => im.toLowerCase() === lower)) {
      handleUpdatePoModelLine(lineId, { imeiError: `⚠️ IMEI/SN "${cleaned}" is already in this model's list.` });
      return;
    }

    if (purchaseImeis.some((im) => im.toLowerCase() === lower)) {
      handleUpdatePoModelLine(lineId, { imeiError: `⚠️ IMEI/SN "${cleaned}" is already added in Model #1.` });
      return;
    }

    const inOtherLine = additionalPoLines.some((l) => l.id !== lineId && l.imeis.some((im) => im.toLowerCase() === lower));
    if (inOtherLine) {
      handleUpdatePoModelLine(lineId, { imeiError: `⚠️ IMEI/SN "${cleaned}" is already added in another model line.` });
      return;
    }

    if (existingImeiSet.has(lower)) {
      handleUpdatePoModelLine(lineId, { imeiError: `⚠️ IMEI/SN "${cleaned}" already exists in stock!` });
      return;
    }

    const updatedImeis = [...line.imeis, cleaned];
    handleUpdatePoModelLine(lineId, {
      imeis: updatedImeis,
      currentImeiInput: '',
      imeiError: null,
      quantity: Math.max(line.quantity, updatedImeis.length),
    });
  };

  // Bulk add IMEIs to a specific model line
  const handleBulkAddImeisToPoLine = (lineId: string, text: string) => {
    const lines = text.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const line = additionalPoLines.find((l) => l.id === lineId);
    if (!line) return;

    const newToAdd: string[] = [];
    const duplicates: string[] = [];

    lines.forEach((lStr) => {
      const lower = lStr.toLowerCase();
      const inCurrent = line.imeis.some((im) => im.toLowerCase() === lower) || newToAdd.some((im) => im.toLowerCase() === lower);
      const inMain = purchaseImeis.some((im) => im.toLowerCase() === lower);
      const inOther = additionalPoLines.some((l) => l.id !== lineId && l.imeis.some((im) => im.toLowerCase() === lower));
      const inStock = existingImeiSet.has(lower);

      if (inCurrent || inMain || inOther) {
        duplicates.push(`${lStr} (Duplicate)`);
      } else if (inStock) {
        duplicates.push(`${lStr} (In Stock)`);
      } else {
        newToAdd.push(lStr);
      }
    });

    if (duplicates.length > 0 && newToAdd.length === 0) {
      handleUpdatePoModelLine(lineId, { imeiError: `⚠️ Duplicate IMEIs: ${duplicates.slice(0, 3).join(', ')}...` });
      return;
    }

    if (newToAdd.length > 0) {
      const updatedImeis = [...line.imeis, ...newToAdd];
      handleUpdatePoModelLine(lineId, {
        imeis: updatedImeis,
        bulkInput: '',
        isBulkOpen: false,
        imeiError: null,
        quantity: Math.max(line.quantity, updatedImeis.length),
      });
    }
  };

  // Total amount computed for all product models in PO
  const line1Total = Math.max(0, unitCost * quantity);
  const additionalLinesTotal = additionalPoLines.reduce(
    (sum, l) => sum + Math.max(0, (l.unitCost || 0) * (l.quantity || 0)),
    0
  );
  const computedTotalAmount = line1Total + additionalLinesTotal;
  const computedRemainingDebt = Math.max(0, computedTotalAmount - paidAmount);

  // Auto-calibrate installments with Daily, Weekly, Monthly intervals
  useEffect(() => {
    if (isInstallmentPlanEnabled && computedRemainingDebt > 0 && installmentCount >= 2 && installmentCount <= 10) {
      const baseAmount = Math.floor(computedRemainingDebt / installmentCount);
      const remainder = computedRemainingDebt - (baseAmount * installmentCount);
      const list: PurchaseInstallment[] = [];
      const baseDate = purchaseDate ? new Date(purchaseDate) : new Date();

      for (let i = 1; i <= installmentCount; i++) {
        const d = new Date(baseDate);
        if (installmentFrequency === 'DAILY') {
          d.setDate(d.getDate() + i); // 1 day step
        } else if (installmentFrequency === 'MONTHLY') {
          d.setMonth(d.getMonth() + i); // 1 month step
        } else {
          d.setDate(d.getDate() + (i * 7)); // 1 week step (default)
        }

        const amount = i === installmentCount ? baseAmount + remainder : baseAmount;
        list.push({
          id: `inst-${Date.now()}-${i}`,
          installmentNo: i,
          dueDate: d.toISOString().split('T')[0],
          amount,
          isPaid: false,
          notes: `${installmentFrequency} Installment #${i} of ${installmentCount}`,
        });
      }
      setPoInstallments(list);
    } else if (!isInstallmentPlanEnabled) {
      setPoInstallments([]);
    }
  }, [isInstallmentPlanEnabled, computedRemainingDebt, installmentCount, installmentFrequency, purchaseDate]);

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchBranch = activeBranchFilter === 'ALL' || p.branchId === activeBranchFilter || p.branchId === 'ALL';
      const matchDate = isDateWithinFilter(p.date, purchaseDateFilter);
      const matchStatus = statusFilter === 'ALL' || p.paymentStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (p.itemName && p.itemName.toLowerCase().includes(q)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.imeiList && p.imeiList.some((im) => im.toLowerCase().includes(q))) ||
        (p.serialNumbers && p.serialNumbers.some((sn) => sn.toLowerCase().includes(q)));

      return matchBranch && matchDate && matchStatus && matchSearch;
    });
  }, [purchases, activeBranchFilter, purchaseDateFilter, statusFilter, searchQuery]);

  // Treasury Totals
  const totalCashInHand = useMemo(() => {
    return treasuryAccounts
      .filter((a) => a.type === 'CASH')
      .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [treasuryAccounts]);

  const totalBankAndDigital = useMemo(() => {
    return treasuryAccounts
      .filter((a) => a.type === 'BANK' || a.type === 'DIGITAL')
      .reduce((sum, a) => sum + (Number(a.currentBalance) || 0), 0);
  }, [treasuryAccounts]);

  const totalLiquidFunds = totalCashInHand + totalBankAndDigital;

  // Accounts Payable (Total Outstanding Supplier Debt)
  const totalSupplierDebt = useMemo(() => {
    return purchases
      .filter((p) => activeBranchFilter === 'ALL' || p.branchId === activeBranchFilter || p.branchId === 'ALL')
      .reduce((sum, p) => sum + (Number(p.remainingDebt) || 0), 0);
  }, [purchases, activeBranchFilter]);

  const totalPurchasesAmount = useMemo(() => {
    return purchases
      .filter((p) => activeBranchFilter === 'ALL' || p.branchId === activeBranchFilter || p.branchId === 'ALL')
      .reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [purchases, activeBranchFilter]);

  const totalPaidAmount = useMemo(() => {
    return purchases
      .filter((p) => activeBranchFilter === 'ALL' || p.branchId === activeBranchFilter || p.branchId === 'ALL')
      .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0);
  }, [purchases, activeBranchFilter]);

  // Net Liquidity Margin (Available cash after paying debts)
  const netLiquidMargin = totalLiquidFunds - totalSupplierDebt;

  // Due Today & Overdue Debts (Only showing debts that must be paid on or before today)
  const dueAlertPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (p.paymentStatus === 'PAID' || p.remainingDebt <= 0) return false;
      const nextUnpaidInst = p.installments?.find((i) => !i.isPaid);
      const targetDueDate = nextUnpaidInst ? nextUnpaidInst.dueDate : (p.dueDate || p.date);
      if (!targetDueDate) return false;
      const diffDays = (new Date(targetDueDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 0;
    });
  }, [purchases, todayStr]);

  // Total amount strictly due today across dueAlertPurchases
  const totalTodayDueAmount = useMemo(() => {
    return dueAlertPurchases.reduce((sum, p) => {
      const nextUnpaidInst = p.installments?.find((i) => !i.isPaid);
      const targetDueAmount = nextUnpaidInst ? Math.min(nextUnpaidInst.amount, p.remainingDebt) : p.remainingDebt;
      return sum + (Number(targetDueAmount) || 0);
    }, 0);
  }, [dueAlertPurchases]);

  // Group by Suppliers for Supplier Creditors View
  const supplierSummary = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      invoicesCount: number;
      totalPurchased: number;
      totalPaid: number;
      totalRemainingDebt: number;
      lastPurchaseDate: string;
    }>();

    purchases.forEach((p) => {
      const key = p.supplierName.trim().toLowerCase();
      const existing = map.get(key) || {
        name: p.supplierName,
        phone: p.supplierPhone || '-',
        invoicesCount: 0,
        totalPurchased: 0,
        totalPaid: 0,
        totalRemainingDebt: 0,
        lastPurchaseDate: p.date,
      };

      existing.invoicesCount += 1;
      existing.totalPurchased += Number(p.totalAmount) || 0;
      existing.totalPaid += Number(p.paidAmount) || 0;
      existing.totalRemainingDebt += Number(p.remainingDebt) || 0;
      if (p.date > existing.lastPurchaseDate) {
        existing.lastPurchaseDate = p.date;
      }
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalRemainingDebt - a.totalRemainingDebt);
  }, [purchases]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPurchaseModalOpen(false);
        setIsPayDebtModalOpen(false);
        setIsTransferModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle open add purchase modal
  const handleOpenAddPurchase = () => {
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNo(generateAutoPOCode(purchases));
    setSupplierName('');
    setSupplierPhone('');
    const defaultBranch = activeBranchFilter !== 'ALL' ? activeBranchFilter : (currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || 'ALL'));
    setTargetBranchId(defaultBranch);
    setItemName('');
    setCategory('Smartphones & Tablets');
    setWarranty('1 Year Official');
    setUnitCost(0);
    setQuantity(0);
    setPaidAmount(0);
    setPaymentAccountId(treasuryAccounts[0]?.id || 'acc-cash-hq');
    setSelectedInventoryItem(null);
    setBrand('Samsung');
    setPurchaseImeis([]);
    setCurrentImeiInput('');
    setBulkImeiInput('');
    setIsBulkImeiOpen(false);
    setImeiErrorMsg(null);
    setAdditionalPoLines([]);
    setIsInstallmentPlanEnabled(false);
    setInstallmentCount(3);
    setPoInstallments([]);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
    setAutoStockIn(true);
    setPurchaseNotes('');
    setIsPurchaseModalOpen(true);
  };

  // Handle open transfer modal
  const handleOpenTransfer = () => {
    setTransferAmount(0);
    setTransferNotes('');
    setIsTransferModalOpen(true);
  };

  // Submit New Purchase (Supports multi-product models and installments)
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !supplierName.trim() || quantity <= 0 || unitCost <= 0) return;

    const line1Total = unitCost * quantity;
    const line1Imeis = purchaseImeis;
    const line1IsExisting = !!matchedInventoryItem;
    const line1Sku = previewStockCode;
    const line1Brand = isExistingModel && matchedInventoryItem ? matchedInventoryItem.brand : (brand || detectedBrand || 'Samsung');

    const allItems: PurchaseItemLine[] = [
      {
        id: `line-${Date.now()}-0`,
        itemName: itemName.trim(),
        brand: line1Brand,
        model: itemName.trim(),
        category,
        sku: line1Sku,
        inventoryItemId: matchedInventoryItem ? matchedInventoryItem.id : undefined,
        warranty: warranty.trim() || '1 Year Official',
        unitCost,
        quantity,
        totalCost: line1Total,
        imeiList: line1Imeis,
        isExistingModel: line1IsExisting,
      },
      ...additionalPoLines.map((line, idx) => {
        const matched = line.selectedInventoryItem || inventory.find(
          (i) => i.name.trim().toLowerCase() === line.itemName.trim().toLowerCase() ||
                 (i.model && i.model.trim().toLowerCase() === line.itemName.trim().toLowerCase()) ||
                 i.sku.trim().toLowerCase() === line.itemName.trim().toLowerCase()
        );
        const lineBrand = matched ? matched.brand : (line.brand || detectBrandFromName(line.itemName, line.category) || 'Other');
        const lineSku = matched ? matched.sku : generateAutoSKU(line.category, inventory, sales, lineBrand, line.itemName);
        const lineCost = (line.unitCost || 0) * (line.quantity || 1);
        return {
          id: `line-${Date.now()}-${idx + 1}`,
          itemName: line.itemName.trim(),
          brand: lineBrand,
          model: line.itemName.trim(),
          category: line.category,
          sku: lineSku,
          inventoryItemId: matched ? matched.id : undefined,
          warranty: line.warranty.trim() || '1 Year Official',
          unitCost: line.unitCost || 0,
          quantity: line.quantity || 1,
          totalCost: lineCost,
          imeiList: line.imeis,
          isExistingModel: !!matched,
        };
      })
    ];

    const totalPOAmount = allItems.reduce((sum, item) => sum + item.totalCost, 0);
    const paid = Math.min(totalPOAmount, Math.max(0, paidAmount));
    const debt = totalPOAmount - paid;
    const status: PurchaseRecord['paymentStatus'] = 
      debt === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    const selectedAcc = treasuryAccounts.find((a) => a.id === paymentAccountId);
    const selectedBranch = branches.find((b) => b.id === targetBranchId);

    const finalInstallments: PurchaseInstallment[] | undefined = (debt > 0 && isInstallmentPlanEnabled && poInstallments.length > 0)
      ? poInstallments.map((inst, idx) => ({
          ...inst,
          installmentNo: idx + 1,
          isPaid: false,
        }))
      : undefined;

    const allImeis = allItems.flatMap((it) => it.imeiList || []);

    const newPurchase: PurchaseRecord = {
      id: `po-${Date.now()}`,
      date: purchaseDate,
      invoiceNo: invoiceNo.trim() || `PO-${Date.now().toString().slice(-5)}`,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim(),
      branchId: targetBranchId,
      branchName: selectedBranch ? selectedBranch.name : 'Central Warehouse / All Branches',
      itemName: allItems.map((it) => `${it.itemName} (${it.quantity} pcs)`).join(', '),
      brand: allItems[0].brand,
      model: allItems[0].model,
      sku: allItems[0].sku,
      category: allItems[0].category,
      warranty: allItems[0].warranty,
      unitCost: allItems[0].unitCost,
      quantity: allItems.reduce((sum, it) => sum + it.quantity, 0),
      totalAmount: totalPOAmount,
      paidAmount: paid,
      remainingDebt: debt,
      paymentStatus: status,
      paymentMethod: selectedAcc ? selectedAcc.name : 'Cash in Hand',
      accountId: paid > 0 ? paymentAccountId : undefined,
      dueDate: debt > 0 ? (finalInstallments && finalInstallments[0] ? finalInstallments[0].dueDate : dueDate) : undefined,
      autoAddToInventory: autoStockIn,
      items: allItems,
      installments: finalInstallments,
      imeiList: allImeis.length > 0 ? allImeis : undefined,
      serialNumbers: allImeis.length > 0 ? allImeis : undefined,
      notes: purchaseNotes.trim(),
      paymentHistory: paid > 0 ? [
        {
          id: `pay-${Date.now()}`,
          date: purchaseDate,
          amount: paid,
          paymentMethod: selectedAcc ? selectedAcc.name : 'Cash in Hand',
          accountId: paymentAccountId,
          recordedBy: currentUser.displayName,
          notes: 'Initial Down Payment on Purchase',
          createdAt: new Date().toISOString(),
        }
      ] : [],
      recordedBy: currentUser.displayName,
      createdAt: new Date().toISOString(),
    };

    onAddPurchase(newPurchase, paid > 0 ? paymentAccountId : undefined);
    if (selectedMonth !== 'ALL' && !purchaseDate.startsWith(selectedMonth)) {
      setSelectedMonth('ALL');
    }
    setIsPurchaseModalOpen(false);
  };

  // Open Settle Debt Modal for a specific purchase
  const handleOpenPayDebt = (purchase: PurchaseRecord) => {
    setSelectedPurchaseForPayment(purchase);
    setDebtPayAmount(purchase.remainingDebt);
    setDebtPayAccountId(treasuryAccounts[0]?.id || 'acc-cash-hq');
    setDebtPayNotes('');
    setIsPayDebtModalOpen(true);
  };

  // Submit Settle Debt
  const handleSubmitPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment || debtPayAmount <= 0) return;

    onPaySupplierDebt(
      selectedPurchaseForPayment.id,
      debtPayAmount,
      debtPayAccountId,
      debtPayNotes.trim() || 'Debt settlement installment'
    );
    setIsPayDebtModalOpen(false);
    setSelectedPurchaseForPayment(null);
  };

  // Submit Transfer Funds
  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId || transferAmount <= 0) return;

    onTransferFunds(fromAccountId, toAccountId, transferAmount, transferNotes.trim());
    setIsTransferModalOpen(false);
  };

  // Open Adjust Balance Modal
  const handleOpenAdjust = (account: TreasuryAccount) => {
    setSelectedAccountForAdjust(account);
    setAdjustNewBalance(account.currentBalance);
    setAdjustReason('Opening Balance Calibration');
    setIsAdjustModalOpen(true);
  };

  // Submit Adjust Balance
  const handleSubmitAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForAdjust) return;

    onAdjustAccountBalance(selectedAccountForAdjust.id, adjustNewBalance, adjustReason.trim());
    setIsAdjustModalOpen(false);
    setSelectedAccountForAdjust(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Purchases &amp; Supplier Payables</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {getMonthName(selectedMonth)}
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Purchases, supplier invoices and outstanding payable debts
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Only + New Purchase Order */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddPurchase}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Purchase</span>
          </button>
        </div>
      </div>

      {/* Due Alert Banner if any upcoming or overdue debts */}
      {dueAlertPurchases.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-amber-950 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">PO Supplier Debts Due Today:</span>
            <span>{dueAlertPurchases.length} Vouchers due for payment ({formatMMK(totalTodayDueAmount)}).</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('suppliers')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
          >
            View Payables
          </button>
        </div>
      )}

      {/* Sleek Purchase & Payable Summary (No Cluttered Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Purchases ({purchases.length} Orders)</span>
          <div className="text-lg font-mono font-black text-slate-900 mt-1">
            {formatMMK(totalPurchasesAmount)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Purchases in selected period</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Settled / Paid</span>
          <div className="text-lg font-mono font-black text-emerald-700 mt-1">
            {formatMMK(totalPaidAmount)}
          </div>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">Paid to suppliers</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Remaining Debt (Payables - AP)</span>
          <div className="text-lg font-mono font-black text-rose-600 mt-1">
            {formatMMK(totalSupplierDebt)}
          </div>
          <span className="text-[10px] text-rose-500 block mt-0.5">Outstanding to suppliers</span>
        </div>
      </div>

      {/* Sub Navigation Tabs: Clean & Focused on Purchases & Payables */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
        <button
          onClick={() => setActiveSubTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'purchases'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Purchase Invoices</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-700 font-bold">
            {purchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Supplier Payables &amp; Debts</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
            {supplierSummary.filter((s) => s.totalRemainingDebt > 0).length} Due
          </span>
        </button>
      </div>

      {/* VIEW 1: PURCHASES & STOCK IN LIST */}
      {activeSubTab === 'purchases' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-1 items-center gap-2.5 w-full flex-wrap">
              {/* Date Filter */}
              <DateRangeFilter
                value={purchaseDateFilter}
                onChange={handlePurchaseDateFilterChange}
                totalCount={filteredPurchases.length}
                label="Purchase Date"
              />

              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search (Item name, Supplier, Voucher No)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['ALL', 'PARTIAL', 'UNPAID', 'PAID'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' && 'All'}
                    {st === 'PARTIAL' && 'Partial'}
                    {st === 'UNPAID' && 'Unpaid'}
                    {st === 'PAID' && 'Paid'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Purchases List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Date / Voucher</th>
                    <th className="px-4 py-3">Purchased Item</th>
                    <th className="px-4 py-3">Supplier & Branch</th>
                    <th className="px-4 py-3 text-right">Qty & Unit Cost</th>
                    <th className="px-4 py-3 text-right">Total Cost</th>
                    <th className="px-4 py-3 text-right">Paid Amount</th>
                    <th className="px-4 py-3 text-right">Remaining Debt & Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="font-bold text-slate-600">No stock purchase records yet</p>
                          <p className="text-[11px] text-slate-400">
                            Click &quot;+ New Purchase&quot; to record phone and accessory purchases from suppliers.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((purchase) => {
                      const isOverdue = purchase.remainingDebt > 0 && purchase.dueDate && purchase.dueDate < todayStr;
                      const isDueSoon = purchase.remainingDebt > 0 && purchase.dueDate && purchase.dueDate >= todayStr;
                      const linkedItem = inventory.find((i) => 
                        (purchase.inventoryItemId && i.id === purchase.inventoryItemId) ||
                        (purchase.sku && i.sku.toLowerCase() === purchase.sku.toLowerCase()) ||
                        (i.name.trim().toLowerCase() === purchase.itemName.trim().toLowerCase())
                      );
                      const isStocked = !!linkedItem && purchase.autoAddToInventory !== false;

                      return (
                        <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{formatDateDMY(purchase.date)}</div>
                            <button
                              type="button"
                              onClick={() => setSelectedPODetail(purchase)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer transition-colors group"
                              title="Click to view full PO Voucher Details"
                            >
                              <FileText className="w-3 h-3 text-purple-600 group-hover:scale-110 transition-transform" />
                              <span>{purchase.invoiceNo}</span>
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{purchase.itemName}</span>
                              {purchase.sku && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-mono font-black text-[10px] shadow-2xs" title={`Brand SKU: ${purchase.sku}`}>
                                  {purchase.sku}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                              <span>{purchase.category}</span>
                              {purchase.brand && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700">{purchase.brand}</span>
                                </>
                              )}
                              {purchase.warranty && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                                    🛡️ {purchase.warranty}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{purchase.supplierName}</div>
                            <div className="text-[11px] text-slate-500">{purchase.branchName}</div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="font-bold text-slate-900">{formatNumber(purchase.quantity)} pcs</div>
                            <div className="text-[11px] text-slate-500">@ {formatMMK(purchase.unitCost)}</div>
                            {purchase.imeiList && purchase.imeiList.length > 0 && (
                              <div className="mt-1 flex justify-end">
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[10px] font-mono font-bold cursor-help"
                                  title={`Registered IMEIs (${purchase.imeiList.length} units):\n${purchase.imeiList.join('\n')}`}
                                >
                                  <Tag className="w-3 h-3 text-purple-600" />
                                  <span>{purchase.imeiList.length} IMEIs</span>
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {formatMMK(purchase.totalAmount)}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            {formatMMK(purchase.paidAmount)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className={`font-black ${purchase.remainingDebt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {formatMMK(purchase.remainingDebt)}
                            </div>
                            {purchase.remainingDebt > 0 && purchase.dueDate && (
                              <div className={`text-[10px] font-bold flex items-center justify-end gap-1 ${isOverdue ? 'text-rose-700' : 'text-amber-700'}`}>
                                <CalendarClock className="w-3 h-3" />
                                <span>{formatDateDMY(purchase.dueDate)} {isOverdue ? '(Overdue)' : ''}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {purchase.paymentStatus === 'PAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Paid</span>
                              </span>
                            )}
                            {purchase.paymentStatus === 'PARTIAL' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Partial</span>
                              </span>
                            )}
                            {purchase.paymentStatus === 'UNPAID' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Unpaid</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Stock In Status / One-click Action */}
                              {isStocked ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold shadow-2xs"
                                  title={`In Stock: ${linkedItem?.totalStock || 0} pcs under SKU ${linkedItem?.sku || purchase.sku}`}
                                >
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Stocked</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onSyncPoToInventory(purchase)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="Stock this PO directly into Inventory under designated Brand SKU with all IMEIs (Direct Inventory Sync)"
                                >
                                  <PackageCheck className="w-3 h-3" />
                                  <span>📥 Add to Stock</span>
                                </button>
                              )}

                              {/* View Full PO Voucher Detail */}
                              <button
                                type="button"
                                onClick={() => setSelectedPODetail(purchase)}
                                className="p-1.5 text-purple-700 hover:text-purple-900 hover:bg-purple-100 bg-purple-50 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                                title="View Full PO Voucher & Item Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Return to Supplier (RMA) Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReturnPurchase(purchase);
                                  setSelectedReturnItem(null);
                                  setIsSupplierReturnModalOpen(true);
                                }}
                                className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100 bg-amber-50 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                title="Return to Supplier (RMA Defect / Stock Return)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              {purchase.remainingDebt > 0 && (
                                <button
                                  onClick={() => handleOpenPayDebt(purchase)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                                  title="Pay Remaining Supplier Debt"
                                >
                                  Pay Debt
                                </button>
                              )}

                              {purchase.paymentHistory && purchase.paymentHistory.length > 0 && (
                                <button
                                  onClick={() => setViewHistoryPurchase(purchase)}
                                  className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                  title="View Payment Installment History"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              )}

                              {canUserDelete(currentUser) && (
                                <button
                                  onClick={() => onDeletePurchase(purchase.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Purchase Record"
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
        </div>
      )}

      {/* VIEW 2: SUPPLIER DEBT CREDITORS (AP SUMMARY) */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Accounts Payable Summary by Creditors
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Outstanding balance statement by supplier for phones and accessories purchased
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supplierSummary.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600">No supplier records yet</p>
                <p className="text-xs">Supplier balances will be automatically aggregated when purchase records are added.</p>
              </div>
            ) : (
              supplierSummary.map((supp, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-200 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{supp.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">Phone: {supp.phone}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-extrabold border border-purple-200">
                      {supp.invoicesCount} Invoices
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Purchases:</span>
                      <span className="font-bold text-slate-900">{formatMMK(supp.totalPurchased)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Paid Amount:</span>
                      <span>{formatMMK(supp.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 font-black text-sm pt-1 border-t border-slate-100">
                      <span>Remaining Debt:</span>
                      <span>{formatMMK(supp.totalRemainingDebt)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      disabled={supp.totalRemainingDebt <= 0}
                      onClick={() => {
                        const relatedPurchase = purchases.find(
                          (p) => p.supplierName.trim().toLowerCase() === supp.name.trim().toLowerCase() && p.remainingDebt > 0
                        );
                        if (relatedPurchase) {
                          handleOpenPayDebt(relatedPurchase);
                        }
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        supp.totalRemainingDebt > 0
                          ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-xs shadow-purple-600/20'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {supp.totalRemainingDebt > 0 ? 'Settle Debt' : 'Fully Settled'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}









      {/* MODAL 1: ADD NEW PURCHASE */}
      {isPurchaseModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPurchaseModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  + New Stock Purchase
                </h3>
                <p className="text-xs text-slate-500">
                  Record inventory purchases, upfront payments, and supplier debts
                </p>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      PO Code / Voucher No *
                    </label>
                    <button
                      type="button"
                      onClick={() => setInvoiceNo(generateAutoPOCode(purchases))}
                      className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                      title="Generate next sequential PO code (6000001+)"
                    >
                      <span>↻ Auto Code</span>
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-mono text-[9px]">6000001+</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. 6000001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center justify-between">
                    <span>PO Series: 6000001+</span>
                    <span className="text-emerald-700 font-semibold">Auto Generated</span>
                  </div>
                </div>
              </div>

              {/* Seamless Stock & Supplier Connection Banner */}
              <div className="p-3 bg-purple-50/90 rounded-xl border border-purple-200/80 text-xs text-purple-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-purple-950">
                    Direct Stock &amp; Inventory Integration
                  </div>
                  <div className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                    Select an existing product from inventory or enter a new one. When you save this PO, stock quantity will automatically increase in the destination branch without needing to re-enter it in Stock Inventory.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier Name with auto-suggest dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Supplier Name *
                    </label>
                    {contacts.length > 0 && (
                      <span className="text-[10px] text-purple-700 font-semibold">
                        Contacts list connected
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    placeholder="Type or select supplier / distributor..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  {showSupplierDropdown && supplierSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Select from Saved Contacts / Suppliers
                      </div>
                      {supplierSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSupplierName(c.name);
                            if (c.phone) setSupplierPhone(c.phone);
                            setShowSupplierDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                          </div>
                          {(c.type || (c as any).partnerType) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              {c.type || (c as any).partnerType}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier Phone
                  </label>
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Item Name with Inventory Auto-suggest */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Item / Product Name *
                    </label>
                    {selectedInventoryItem && (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Linked to SKU: {selectedInventoryItem.sku}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => {
                      setItemName(e.target.value);
                      setShowItemDropdown(true);
                      const matched = inventory.find(
                        (i) => i.name.toLowerCase().trim() === e.target.value.toLowerCase().trim()
                      );
                      setSelectedInventoryItem(matched || null);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    placeholder="Type name or select existing item from Inventory..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                  {showItemDropdown && inventoryItemSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Select from Current Inventory Catalog
                      </div>
                      {inventoryItemSuggestions.map((item) => {
                        const branchQty = targetBranchId === 'ALL' 
                          ? item.totalStock 
                          : (item.branchStock[targetBranchId] || 0);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setItemName(item.name);
                              setCategory(item.category);
                              if (item.warranty) setWarranty(item.warranty);
                              if (item.costPrice > 0) {
                                setUnitCost(item.costPrice);
                              }
                              setSelectedInventoryItem(item);
                              setShowItemDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{item.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {item.category} • SKU: {item.sku}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-purple-700">
                                Cost: {formatMMK(item.costPrice)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                In Stock: {branchQty} pcs
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="Smartphones & Tablets">Smartphones & Tablets</option>
                    <option value="Laptops & Computers">Laptops & Computers</option>
                    <option value="Accessories & Gadgets">Accessories & Gadgets</option>
                    <option value="Service Spare Part">Service Spare Part</option>
                  </select>
                </div>
              </div>

              {/* Stock Code & Brand Status Preview (Existing Model vs New Model) */}
              {itemName.trim() && (
                <div className={`p-3.5 rounded-xl border text-xs transition-all ${
                  isExistingModel && matchedInventoryItem
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-blue-50/90 border-blue-300 text-blue-950'
                }`}>
                  {isExistingModel && matchedInventoryItem ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-900">
                            Existing Model Found in Stock
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-[11px] text-emerald-800 font-bold">Stock Code:</span>
                          <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-lg font-black shadow-2xs">
                            {matchedInventoryItem.sku}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex items-center gap-2 flex-wrap">
                        <span>• Model: <b>{matchedInventoryItem.name}</b></span>
                        <span>• Brand: <b>{matchedInventoryItem.brand}</b></span>
                        <span>• Current Stock: <b>{matchedInventoryItem.totalStock} pcs</b></span>
                        <span>→ After Receiving: <b className="text-emerald-950 font-bold">{matchedInventoryItem.totalStock + quantity} pcs</b></span>
                      </div>
                      <p className="text-[10px] text-emerald-700 italic">
                        ✓ Quantity will be added to existing Stock Code ({matchedInventoryItem.sku}) and entered IMEIs will be automatically registered into stock inventory.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-bold text-blue-950">
                            New Model - Auto Code Generation
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-600 font-bold">Brand:</span>
                            <select
                              value={brand}
                              onChange={(e) => setBrand(e.target.value)}
                              className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-950 focus:outline-none shadow-2xs"
                            >
                              {DEFAULT_PRIMARY_SHOP_BRANDS.filter(
                                (b) => b.category === category || category === 'Smartphones & Tablets'
                              ).map((b) => (
                                <option key={b.brand} value={b.brand}>
                                  {b.brand} ({b.prefix})
                                </option>
                              ))}
                              <option value="Other">Other Brand</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-[11px] text-blue-900 font-bold">Stock Code:</span>
                            <span className="px-2.5 py-0.5 bg-blue-700 text-white rounded-lg font-black shadow-2xs">
                              {previewStockCode}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        ★ System will generate stock code (<b className="font-mono">{previewStockCode}</b>) for <b>{brand}</b>, and entered IMEIs ({purchaseImeis.length} units) will be automatically registered into stock inventory.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Warranty Field */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    <span>Product Warranty *</span>
                  </label>
                  <span className="text-[10px] text-purple-700 font-medium">Auto-assigned to stock catalog</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 1 Year Official / 6 Months Shop / No Warranty"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-2xs"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {[
                      '1 Year Official',
                      '6 Months Shop',
                      '3 Months Shop',
                      '1 Month Testing',
                      'No Warranty'
                    ].map((wPreset) => (
                      <button
                        key={wPreset}
                        type="button"
                        onClick={() => setWarranty(wPreset)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          warranty === wPreset
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-100/70'
                        }`}
                      >
                        {wPreset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit Cost (MMK) *
                  </label>
                  <FormattedNumberInput
                    value={unitCost}
                    onChange={(val) => {
                      setUnitCost(val);
                    }}
                    showLiveBadge={true}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-right"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity to Stock In *
                  </label>
                  <FormattedNumberInput
                    value={quantity}
                    onChange={(val) => {
                      setQuantity(val);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-center"
                    placeholder="0"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Destination Branch
                  </label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="ALL">Central Warehouse / All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* IMEI / Serial Numbers Section for Hardware & Phones */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>IMEI / Serial Numbers (Optional - Quick Search &amp; Duplicate Check)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {purchaseImeis.length} entered {quantity > 0 ? `/ ${quantity} pcs` : ''}
                  </span>
                </div>

                {imeiErrorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{imeiErrorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentImeiInput}
                    onChange={(e) => {
                      setCurrentImeiInput(e.target.value);
                      if (imeiErrorMsg) setImeiErrorMsg(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImeiToPurchase(currentImeiInput);
                      }
                    }}
                    placeholder="Type / Scan single IMEI or SN & press Enter..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddImeiToPurchase(currentImeiInput)}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkImeiOpen(!isBulkImeiOpen)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border ${
                      isBulkImeiOpen
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    📋 Bulk Paste
                  </button>
                </div>

                {isBulkImeiOpen && (
                  <div className="p-3 bg-white rounded-xl border border-purple-200 shadow-inner space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Paste multiple IMEIs (separated by newline or comma):
                    </label>
                    <textarea
                      rows={3}
                      value={bulkImeiInput}
                      onChange={(e) => setBulkImeiInput(e.target.value)}
                      placeholder="Paste IMEIs here e.g.&#10;34567890987654&#10;34567890987659&#10;345665432345"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBulkImeiOpen(false)}
                        className="px-2.5 py-1 text-xs text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkAddImeis(bulkImeiInput)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Apply All IMEIs
                      </button>
                    </div>
                  </div>
                )}

                {purchaseImeis.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-lg">
                    {purchaseImeis.map((im, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-mono font-bold"
                      >
                        <span>{im}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPurchaseImeis((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5 font-sans"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Product Models Section */}
              {additionalPoLines.map((line, lineIdx) => {
                const lineMatched = line.selectedInventoryItem || inventory.find(
                  (i) => i.name.trim().toLowerCase() === line.itemName.trim().toLowerCase() ||
                         (i.model && i.model.trim().toLowerCase() === line.itemName.trim().toLowerCase()) ||
                         i.sku.trim().toLowerCase() === line.itemName.trim().toLowerCase()
                );
                const isLineExisting = !!lineMatched;
                const lineBrand = lineMatched ? lineMatched.brand : (line.brand || detectBrandFromName(line.itemName, line.category) || 'Samsung');
                const linePreviewSku = lineMatched ? lineMatched.sku : generateAutoSKU(line.category, inventory, sales, lineBrand, line.itemName);

                return (
                  <div key={line.id} className="p-4 bg-slate-100/90 rounded-2xl border border-slate-300 space-y-3 relative animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                          {lineIdx + 2}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800">
                          Product Model #{lineIdx + 2}
                        </h4>
                        {isLineExisting && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            Existing Code: {linePreviewSku}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePoModelLine(line.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Model</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Product Model Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.itemName}
                          onChange={(e) => handleUpdatePoModelLine(line.id, { itemName: e.target.value })}
                          placeholder="e.g. iPhone 15 Pro Max 256GB / Galaxy S24"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                          <select
                            value={line.category}
                            onChange={(e) => handleUpdatePoModelLine(line.id, { category: e.target.value as InventoryCategory })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                          >
                            <option value="Smartphones & Tablets">Smartphones & Tablets</option>
                            <option value="Laptops & Computers">Laptops & Computers</option>
                            <option value="Accessories & Gadgets">Accessories & Gadgets</option>
                            <option value="Service Spare Part">Service Spare Part</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Brand</label>
                          <select
                            value={line.brand}
                            onChange={(e) => handleUpdatePoModelLine(line.id, { brand: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium font-bold text-slate-800"
                          >
                            {DEFAULT_PRIMARY_SHOP_BRANDS.filter((b) => b.category === line.category || line.category === 'Smartphones & Tablets').map((b) => (
                              <option key={b.brand} value={b.brand}>{b.brand}</option>
                            ))}
                            <option value="Other">Other Brand</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Unit Cost (MMK) *</label>
                        <FormattedNumberInput
                          value={line.unitCost}
                          onChange={(val) => handleUpdatePoModelLine(line.id, { unitCost: val })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-right"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Quantity *</label>
                        <FormattedNumberInput
                          value={line.quantity}
                          onChange={(val) => handleUpdatePoModelLine(line.id, { quantity: val })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
                          placeholder="1"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Subtotal</label>
                        <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-950 text-right">
                          {formatMMK((line.unitCost || 0) * (line.quantity || 1))}
                        </div>
                      </div>
                    </div>

                    {/* IMEI / Serial Numbers Section for this Additional Model */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          <span>Model #{lineIdx + 2} IMEI / Serial Numbers ({line.itemName || 'Model'})</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          {line.imeis.length} entered {line.quantity > 0 ? `/ ${line.quantity} pcs` : ''}
                        </span>
                      </div>

                      {line.imeiError && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{line.imeiError}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={line.currentImeiInput || ''}
                          onChange={(e) => {
                            handleUpdatePoModelLine(line.id, { currentImeiInput: e.target.value, imeiError: null });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddImeiToPoLine(line.id, line.currentImeiInput || '');
                            }
                          }}
                          placeholder={`Type / Scan IMEI for ${line.itemName || `Model #${lineIdx + 2}`} & press Enter...`}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddImeiToPoLine(line.id, line.currentImeiInput || '')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          + Add
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePoModelLine(line.id, { isBulkOpen: !line.isBulkOpen })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border ${
                            line.isBulkOpen
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          📋 Bulk
                        </button>
                      </div>

                      {line.isBulkOpen && (
                        <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
                          <label className="text-[10.5px] font-bold text-slate-700 block">
                            Paste IMEIs for {line.itemName || `Model #${lineIdx + 2}`} (separated by newline/comma):
                          </label>
                          <textarea
                            rows={2}
                            value={line.bulkInput || ''}
                            onChange={(e) => handleUpdatePoModelLine(line.id, { bulkInput: e.target.value })}
                            placeholder="Paste IMEIs here..."
                            className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdatePoModelLine(line.id, { isBulkOpen: false })}
                              className="px-2.5 py-1 text-xs text-slate-500 font-bold hover:text-slate-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkAddImeisToPoLine(line.id, line.bulkInput || '')}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Apply IMEIs
                            </button>
                          </div>
                        </div>
                      )}

                      {line.imeis && line.imeis.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                          {line.imeis.map((im, iIdx) => (
                            <span
                              key={iIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-mono font-bold"
                            >
                              <span>{im}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdatePoModelLine(line.id, {
                                    imeis: line.imeis.filter((_, i) => i !== iIdx),
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5 font-sans"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stock Code & Model Status Indicator */}
                    <div className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                      isLineExisting ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-blue-50 border-blue-200 text-blue-950'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>
                          {isLineExisting ? `✓ Reusing Existing Stock Code: ` : `★ Auto New Stock Code: `}
                          <b className="font-mono">{linePreviewSku}</b>
                        </span>
                      </div>
                      <span className="font-bold">
                        Line Total: {formatMMK((line.unitCost || 0) * (line.quantity || 1))}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add Another Model Button */}
              <button
                type="button"
                onClick={handleAddPoModelLine}
                className="w-full py-2.5 bg-purple-50 hover:bg-purple-100/80 border-2 border-dashed border-purple-300 rounded-xl text-purple-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Product Model to this PO (Add Product Model)</span>
              </button>

              {/* Total Calculation Display */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900">Total PO Cost:</span>
                  <div className="text-xl font-black text-purple-950">{formatMMK(computedTotalAmount)}</div>
                </div>
                <div className="text-right text-xs text-purple-800 font-medium">
                  <span>Models: {1 + additionalPoLines.length} Models • Total Quantity: {quantity + additionalPoLines.reduce((s, l) => s + (l.quantity || 1), 0)} pcs</span>
                </div>
              </div>

              {/* Payment Split Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Amount Paid Now (Down Payment MMK) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(computedTotalAmount)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      Full (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(Math.round(computedTotalAmount / 2))}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer text-purple-700"
                    >
                      Half (50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(0)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer text-rose-700"
                    >
                      Credit (0%)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FormattedNumberInput
                      value={paidAmount}
                      onChange={(val) => setPaidAmount(val)}
                      max={computedTotalAmount}
                      showLiveBadge={true}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-right"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <select
                      value={paymentAccountId}
                      onChange={(e) => setPaymentAccountId(e.target.value)}
                      disabled={paidAmount === 0}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50"
                    >
                      {treasuryAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (Balance: {formatMMK(acc.currentBalance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remaining Debt & Split Installment Section */}
                {computedRemainingDebt > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-700">Remaining Debt:</span>
                        <span className="text-sm font-black text-rose-700">{formatMMK(computedRemainingDebt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">Final Due Date:</span>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Split into Installments Option with Daily, Weekly, Monthly Frequencies */}
                    <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isInstallmentPlanEnabled}
                            onChange={(e) => setIsInstallmentPlanEnabled(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-amber-950">
                            Split Debt into Installments (Installment Schedule)
                          </span>
                        </label>

                        {isInstallmentPlanEnabled && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Frequency Selector: Daily, Weekly, Monthly */}
                            <div className="flex items-center bg-white border border-amber-200 rounded-lg p-0.5">
                              {[
                                { key: 'DAILY' as const, label: 'Daily'  },
                                { key: 'WEEKLY' as const, label: 'Weekly'  },
                                { key: 'MONTHLY' as const, label: 'Monthly'  },
                              ].map((freq) => (
                                <button
                                  key={freq.key}
                                  type="button"
                                  onClick={() => setInstallmentFrequency(freq.key)}
                                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer ${
                                    installmentFrequency === freq.key
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'text-amber-900 hover:bg-amber-100'
                                  }`}
                                >
                                  {freq.label}
                                </button>
                              ))}
                            </div>

                            {/* Split Count Selector */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-amber-900 font-bold">Times:</span>
                              {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setInstallmentCount(num)}
                                  className={`w-5 h-5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    installmentCount === num
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'bg-white text-amber-900 hover:bg-amber-200/60 border border-amber-200'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {isInstallmentPlanEnabled && poInstallments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10px] font-bold text-amber-900 flex items-center justify-between">
                            <span>
                              {installmentFrequency} Installment Schedule ({installmentCount} installments):
                            </span>
                            <span>Total: {formatMMK(poInstallments.reduce((s, i) => s + (i.amount || 0), 0))}</span>
                          </div>
                          <div className="divide-y divide-amber-200 border border-amber-200 rounded-xl bg-white overflow-hidden max-h-48 overflow-y-auto">
                            {poInstallments.map((inst, idx) => (
                              <div key={inst.id || idx} className="p-2 flex items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-amber-950 w-28 shrink-0">
                                  #{idx + 1} ({installmentFrequency}):
                                </span>
                                <input
                                  type="date"
                                  value={inst.dueDate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setPoInstallments((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, dueDate: val } : it))
                                    );
                                  }}
                                  className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-medium"
                                />
                                <div className="flex items-center gap-1">
                                  <FormattedNumberInput
                                    value={inst.amount}
                                    onChange={(val) => {
                                      setPoInstallments((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, amount: val } : it))
                                      );
                                    }}
                                    className="w-28 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-right text-purple-700"
                                    placeholder="0"
                                  />
                                  <span className="text-[10px] text-slate-500 font-bold">Ks</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Auto Stock In to Inventory Card */}
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoStockIn"
                    checked={autoStockIn}
                    onChange={(e) => setAutoStockIn(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer mt-0.5"
                  />
                  <label htmlFor="autoStockIn" className="text-xs cursor-pointer select-none space-y-1 block flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-emerald-950">
                        ✓ Automatically add Brand SKU &amp; IMEIs directly into Inventory Stock
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-black shadow-2xs">
                        Direct Inventory Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Product name, Brand SKU (<span className="font-mono font-bold text-emerald-950">{previewStockCode}</span>), quantity ({quantity} pcs), and IMEIs/SNs ({purchaseImeis.length} units) entered in this PO will automatically be added to the destination branch stock inventory.
                    </p>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Save Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTLE DEBT MODAL (Supplier Debt Settlement) */}
      {isPayDebtModalOpen && selectedPurchaseForPayment && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPayDebtModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Settle Supplier Debt
                </h3>
                <p className="text-xs text-slate-500">
                  Voucher: {selectedPurchaseForPayment.invoiceNo} • {selectedPurchaseForPayment.supplierName}
                </p>
              </div>
              <button
                onClick={() => setIsPayDebtModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitPayDebt} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-800">Current Remaining Debt:</span>
                  <div className="text-lg font-black text-rose-900">
                    {formatMMK(selectedPurchaseForPayment.remainingDebt)}
                  </div>
                </div>
                <div className="text-right text-xs text-rose-700 font-medium">
                  {selectedPurchaseForPayment.itemName}
                </div>
              </div>

              {/* Installment Plan Preview if available */}
              {selectedPurchaseForPayment.installments && selectedPurchaseForPayment.installments.length > 0 && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-950">Installment Schedule (Installment Schedule):</span>
                    <span className="text-[10px] text-purple-700 font-semibold">Click row to auto-select amount</span>
                  </div>
                  <div className="divide-y divide-purple-100 border border-purple-200 rounded-lg bg-white overflow-hidden text-xs max-h-40 overflow-y-auto">
                    {selectedPurchaseForPayment.installments.map((inst, idx) => (
                      <div
                        key={inst.id || idx}
                        onClick={() => {
                          if (!inst.isPaid) {
                            setDebtPayAmount(Math.min(inst.amount, selectedPurchaseForPayment.remainingDebt));
                            setDebtPayNotes(`Installment #${inst.installmentNo} Payment`);
                          }
                        }}
                        className={`p-2 flex items-center justify-between transition-colors ${
                          inst.isPaid
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : 'hover:bg-purple-50 cursor-pointer text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-900">#{inst.installmentNo}</span>
                          <span className="font-mono text-[11px] text-slate-600">Due: {formatDateDMY(inst.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-purple-800">{formatMMK(inst.amount)}</span>
                          {inst.isPaid ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Paid ✓</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">Select</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount (MMK) *
                </label>
                <FormattedNumberInput
                  value={debtPayAmount}
                  onChange={(val) => setDebtPayAmount(val)}
                  max={selectedPurchaseForPayment.remainingDebt}
                  min={1}
                  showLiveBadge={true}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pay From Account *
                </label>
                <select
                  value={debtPayAccountId}
                  onChange={(e) => setDebtPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  {treasuryAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Balance: {formatMMK(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Notes
                </label>
                <input
                  type="text"
                  value={debtPayNotes}
                  onChange={(e) => setDebtPayNotes(e.target.value)}
                  placeholder="e.g. Second installment / partial payment"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayDebtModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TRANSFER FUNDS MODAL */}
      {isTransferModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTransferModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Fund Transfer
                </h3>
                <p className="text-xs text-slate-500">
                  Transfer funds between cash registers and bank accounts
                </p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer From *
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  {treasuryAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMMK(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer To *
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  {treasuryAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMMK(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Amount (MMK) *
                </label>
                <FormattedNumberInput
                  value={transferAmount}
                  onChange={(val) => setTransferAmount(val)}
                  min={1}
                  showLiveBadge={true}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Notes
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Deposit daily cash proceeds to bank account"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST BALANCE MODAL */}
      {isAdjustModalOpen && selectedAccountForAdjust && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAdjustModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Adjust Account Balance
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedAccountForAdjust.name}
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                Current Recorded Balance:{' '}
                <span className="font-bold text-slate-900">{formatMMK(selectedAccountForAdjust.currentBalance)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual New Balance (MMK) *
                </label>
                <FormattedNumberInput
                  value={adjustNewBalance}
                  onChange={(val) => setAdjustNewBalance(val)}
                  min={0}
                  showLiveBadge={true}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adjustment Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Opening balance reconciliation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PAYMENT HISTORY DETAILS */}
      {viewHistoryPurchase && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewHistoryPurchase(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Payment Installments History
                </h3>
                <p className="text-xs text-slate-500">
                  Voucher: {viewHistoryPurchase.invoiceNo} • {viewHistoryPurchase.supplierName}
                </p>
              </div>
              <button
                onClick={() => setViewHistoryPurchase(null)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <span className="text-slate-500">Total Cost:</span>
                  <div className="font-bold text-slate-900">{formatMMK(viewHistoryPurchase.totalAmount)}</div>
                </div>
                <div>
                  <span className="text-emerald-600">Paid Amount:</span>
                  <div className="font-bold text-emerald-700">{formatMMK(viewHistoryPurchase.paidAmount)}</div>
                </div>
                <div>
                  <span className="text-rose-600">Remaining Debt:</span>
                  <div className="font-bold text-rose-700">{formatMMK(viewHistoryPurchase.remainingDebt)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Payment Transactions:</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {viewHistoryPurchase.paymentHistory?.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{formatDateDMY(item.date)}</div>
                        <div className="text-[11px] text-slate-500">{item.paymentMethod} • {item.notes}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-600">+{formatMMK(item.amount)}</div>
                        <div className="text-[10px] text-slate-400">By {item.recordedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewHistoryPurchase(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: OFFICIAL PO VOUCHER & ITEM DETAIL */}
      {selectedPODetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPODetail(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">
                      Purchase Order Voucher
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-black bg-purple-100 text-purple-800 border border-purple-200">
                      PO-{selectedPODetail.invoiceNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Shwe Kyal Takhun Mobile & Electronics • Official PO Voucher & Debt Detail
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                  title="Print PO Voucher"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPODetail(null)}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Top Meta Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Voucher Date:</span>
                  <span className="font-bold text-slate-800 text-sm">{formatDateDMY(selectedPODetail.date)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Destination Branch:</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedPODetail.branchName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Recorded By:</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedPODetail.recordedBy || 'Admin'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Payment Status:</span>
                  <div className="mt-0.5">
                    {selectedPODetail.paymentStatus === 'PAID' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Fully Paid</span>
                      </span>
                    )}
                    {selectedPODetail.paymentStatus === 'PARTIAL' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>Partial Paid</span>
                      </span>
                    )}
                    {selectedPODetail.paymentStatus === 'UNPAID' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Unpaid Debt</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Creditor & Supplier Information */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Supplier / Creditor Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Supplier / Company Name:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedPODetail.supplierName}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Supplier Phone / Contact:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedPODetail.supplierPhone || 'No Phone Specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchased Product Specifications Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />
                  <span>Purchased Product Specifications</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Item Description & Category</th>
                        <th className="px-3 py-2.5">Warranty</th>
                        <th className="px-3 py-2.5 text-right">Quantity</th>
                        <th className="px-3 py-2.5 text-right">Unit Cost</th>
                        <th className="px-4 py-2.5 text-right">Total Line Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{selectedPODetail.itemName}</span>
                            {selectedPODetail.sku && (
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-lg font-mono font-black text-xs shadow-2xs">
                                SKU: {selectedPODetail.sku}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium border border-slate-200">
                              {selectedPODetail.category}
                            </span>
                            {selectedPODetail.brand && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-bold border border-purple-200">
                                Brand: {selectedPODetail.brand}
                              </span>
                            )}
                            <span className="text-slate-600 font-medium">
                              Destination: <b>{selectedPODetail.branchName}</b>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-medium">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span>{selectedPODetail.warranty || 'No Warranty'}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-black text-slate-900">
                          {formatNumber(selectedPODetail.quantity)} pcs
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-700">
                          {formatMMK(selectedPODetail.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                          {formatMMK(selectedPODetail.totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Registered IMEIs / Serial Numbers Section */}
                {((selectedPODetail.imeiList && selectedPODetail.imeiList.length > 0) || (selectedPODetail.serialNumbers && selectedPODetail.serialNumbers.length > 0)) && (() => {
                  const imeis = (selectedPODetail.imeiList || selectedPODetail.serialNumbers || []);
                  return (
                    <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950">
                          <Tag className="w-3.5 h-3.5 text-purple-700" />
                          <span>Registered IMEIs / Serial Numbers ({imeis.length} units):</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(imeis.join('\n'));
                            alert(`Copied ${imeis.length} IMEIs to clipboard!`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          <Copy className="w-3 h-3 text-purple-700" />
                          <span>Copy All IMEIs</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-purple-100">
                        {imeis.map((im, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100/70 text-purple-950 border border-purple-200 text-[10px] font-mono font-bold"
                          >
                            {im}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Stock In Status Card */}
                {(() => {
                  const linkedItem = inventory.find((i) => 
                    (selectedPODetail.inventoryItemId && i.id === selectedPODetail.inventoryItemId) ||
                    (selectedPODetail.sku && i.sku.toLowerCase() === selectedPODetail.sku.toLowerCase()) ||
                    (i.name.trim().toLowerCase() === selectedPODetail.itemName.trim().toLowerCase())
                  );
                  const isStocked = !!linkedItem && selectedPODetail.autoAddToInventory !== false;

                  return (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isStocked 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex items-center gap-2 text-xs">
                        {isStocked ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-bold">Added to Stock Catalog:</span>
                              <span className="ml-1 text-[11px] text-emerald-800">
                                Brand SKU [<b className="font-mono">{linkedItem?.sku || selectedPODetail.sku}</b>] • Total Stock: <b>{linkedItem?.totalStock || 0} pcs</b>
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="font-bold">Not yet added to Stock Catalog:</span>
                              <span className="ml-1 text-[11px] text-amber-800">
                                You can directly sync this PO into Stock Inventory without manual re-entry.
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {!isStocked && (
                        <button
                          type="button"
                          onClick={() => {
                            onSyncPoToInventory(selectedPODetail);
                            setSelectedPODetail({
                              ...selectedPODetail,
                              autoAddToInventory: true,
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>📥 Add to Stock</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Financial Breakdown & Debt Settlement Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-purple-600" />
                  <span>Financial Statement & Debt Status</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs text-slate-500 block font-medium">Total Purchase Cost</span>
                    <div className="font-black text-slate-900 text-base mt-0.5">
                      {formatMMK(selectedPODetail.totalAmount)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-xs text-emerald-600 block font-medium">Total Amount Paid</span>
                    <div className="font-black text-emerald-700 text-base mt-0.5">
                      {formatMMK(selectedPODetail.paidAmount)}
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border shadow-2xs ${selectedPODetail.remainingDebt > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <span className={`text-xs block font-medium ${selectedPODetail.remainingDebt > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      Outstanding Due Debt
                    </span>
                    <div className={`font-black text-base mt-0.5 ${selectedPODetail.remainingDebt > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                      {formatMMK(selectedPODetail.remainingDebt)}
                    </div>
                  </div>
                </div>

                {selectedPODetail.remainingDebt > 0 && selectedPODetail.dueDate && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CalendarClock className="w-4 h-4 text-amber-600" />
                      <span>Debt Settlement Due Date:</span>
                      <span className="underline">{formatDateDMY(selectedPODetail.dueDate)}</span>
                    </div>
                    {selectedPODetail.dueDate < todayStr ? (
                      <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-[10px]">
                        Overdue Warning
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">Payment on schedule</span>
                    )}
                  </div>
                )}
              </div>

              {/* Notes / Special Instructions if any */}
              {selectedPODetail.notes && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
                  <span className="font-bold text-purple-900 block mb-1">Voucher Notes & Terms:</span>
                  <p className="text-slate-700">{selectedPODetail.notes}</p>
                </div>
              )}

              {/* Payment Installment History (if payments exist) */}
              {selectedPODetail.paymentHistory && selectedPODetail.paymentHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    <span>Payment Clearing Transactions ({selectedPODetail.paymentHistory.length})</span>
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {selectedPODetail.paymentHistory.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{formatDateDMY(item.date)}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.paymentMethod} {item.notes ? `• ${item.notes}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-emerald-600">+{formatMMK(item.amount)}</div>
                          <div className="text-[10px] text-slate-400">By {item.recordedBy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {selectedPODetail.remainingDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = selectedPODetail;
                      setSelectedPODetail(null);
                      handleOpenPayDebt(p);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Pay Remaining Debt ({formatMMK(selectedPODetail.remainingDebt)})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const p = selectedPODetail;
                    setSelectedPODetail(null);
                    setSelectedReturnPurchase(p);
                    setSelectedReturnItem(null);
                    setIsSupplierReturnModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Return defective/wrong items from this PO to supplier"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Return (RMA)</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPODetail(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: SUPPLIER RETURN (RMA) MODAL */}
      {isSupplierReturnModalOpen && (
        <SupplierReturnModal
          isOpen={isSupplierReturnModalOpen}
          onClose={() => {
            setIsSupplierReturnModalOpen(false);
            setSelectedReturnPurchase(null);
            setSelectedReturnItem(null);
          }}
          purchases={purchases}
          inventory={inventory}
          treasuryAccounts={treasuryAccounts}
          branches={branches}
          currentUser={currentUser}
          initialPurchase={selectedReturnPurchase}
          initialItem={selectedReturnItem}
          onSubmitReturn={(returnData) => {
            if (onAddSupplierReturn) {
              onAddSupplierReturn(returnData);
            }
            setIsSupplierReturnModalOpen(false);
            setSelectedReturnPurchase(null);
            setSelectedReturnItem(null);
          }}
        />
      )}
    </div>
  );
};
