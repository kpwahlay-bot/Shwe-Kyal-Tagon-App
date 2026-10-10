import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  RotateCcw,
  Sparkles,
  Gift,
  Award,
  Store,
  Megaphone,
  TrendingDown,
  Wrench,
  DollarSign,
  Wallet,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Edit3,
  X,
  CreditCard,
  Layers,
  Coins,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import {
  ContactPartner,
  SupplierBenefit,
  SupplierBenefitCategory,
  SupplierReturn,
  PurchaseRecord,
  TreasuryAccount,
  UserAccount,
  Branch,
  InventoryItem,
  canUserDelete
} from '../types';
import { formatMMK, formatDateDMY, formatNumber } from '../utils/formatters';
import { FormattedNumberInput } from './FormattedNumberInput';
import { RmaSettlementModal } from './RmaSettlementModal';
import { CalendarMonthPicker } from './CalendarMonthPicker';
import { SupplierReturnModal } from './SupplierReturnModal';

interface SupplierClaimsAndBenefitsLedgerProps {
  suppliers: ContactPartner[];
  supplierBenefits: SupplierBenefit[];
  supplierReturns: SupplierReturn[];
  purchases: PurchaseRecord[];
  treasuryAccounts: TreasuryAccount[];
  branches: Branch[];
  inventory: InventoryItem[];
  currentUser: UserAccount;
  onAddSupplier: (supplier: ContactPartner) => void;
  onUpdateSupplier: (supplier: ContactPartner) => void;
  onDeleteSupplier: (id: string) => void;
  onAddSupplierBenefit: (benefit: SupplierBenefit) => void;
  onUpdateSupplierBenefit?: (benefit: SupplierBenefit) => void;
  onDeleteSupplierBenefit: (id: string) => void;
  onSettleSupplierBenefit?: (
    benefitId: string,
    optionsOrAccountId?: {
      settleAction?: 'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT';
      accountId?: string;
      targetPoId?: string;
      settleDate?: string;
      notes?: string;
    } | string,
    settleDate?: string,
    notes?: string
  ) => void;
  onAddSupplierReturn: (ret: SupplierReturn) => void;
  onDeleteSupplierReturn?: (id: string, restoreStock?: boolean) => void;
  onClearAllSupplierReturns?: () => void;
  onSettleRma: (
    rmaId: string,
    resolutionType: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED',
    resolutionDetails: {
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
  ) => void;
  onPayPurchaseDebt?: (
    purchaseId: string,
    paymentAmount: number,
    accountId: string,
    notes?: string
  ) => void;
  initialSubTab?: 'po_payables' | 'claims' | 'rma' | 'directory';
  mode?: 'full' | 'rma_only';
}

const BENEFIT_CATEGORIES: Array<{
  id: SupplierBenefitCategory;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
  border: string;
}> = [
  {
    id: 'Cashback',
    name: 'Cashback',
    description: 'Product Cashback Refund & Rebate',
    icon: Gift,
    color: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    id: 'Policy Bonus',
    name: 'Policy Bonus / Rebate',
    description: 'Target Achievement Bonus & Policy Incentive',
    icon: Award,
    color: 'text-amber-700',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    id: 'Counter Rental Fee',
    name: 'Counter Rental Fee',
    description: 'Display Counter / Shelf Rental Allowance',
    icon: Store,
    color: 'text-blue-700',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'Promotion Subsidy',
    name: 'Promotion Subsidy',
    description: 'Marketing & Promotional Allowance',
    icon: Megaphone,
    color: 'text-purple-700',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    id: 'Price Down Compensation',
    name: 'Price Down (Price Protection)',
    description: 'Price Protection Compensation',
    icon: TrendingDown,
    color: 'text-rose-700',
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
  },
  {
    id: 'RMA / Defect Claim',
    name: 'RMA / Defect Claim',
    description: 'Defective Stock Claim & Credit Note',
    icon: Wrench,
    color: 'text-indigo-700',
    bgLight: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
];

export const getPoRemainingDebt = (p: PurchaseRecord): number => {
  if (p.paymentStatus === 'PAID') return 0;
  if (typeof p.remainingDebt === 'number' && !isNaN(p.remainingDebt)) {
    return Math.max(0, p.remainingDebt);
  }
  const total = Number(p.totalAmount) || 0;
  const paid = Number(p.paidAmount) || 0;
  return Math.max(0, total - paid);
};

export const SupplierClaimsAndBenefitsLedger: React.FC<SupplierClaimsAndBenefitsLedgerProps> = ({
  suppliers,
  supplierBenefits,
  supplierReturns,
  purchases,
  treasuryAccounts,
  branches,
  inventory,
  currentUser,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddSupplierBenefit,
  onUpdateSupplierBenefit,
  onDeleteSupplierBenefit,
  onSettleSupplierBenefit,
  onAddSupplierReturn,
  onDeleteSupplierReturn,
  onClearAllSupplierReturns,
  onSettleRma,
  onPayPurchaseDebt,
  initialSubTab,
  mode = 'full',
}) => {
  const isRmaOnly = mode === 'rma_only';
  // Main sub-tabs: 'po_payables' | 'claims' | 'rma' | 'directory'
  const [activeSubTab, setActiveSubTab] = useState<'po_payables' | 'claims' | 'rma' | 'directory'>(isRmaOnly ? 'rma' : (initialSubTab || 'po_payables'));

  React.useEffect(() => {
    if (isRmaOnly) {
      setActiveSubTab('rma');
    } else if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, isRmaOnly]);

  // Filter for PO status in PO Payables view: 'ALL' (Default) | 'UNPAID' | 'SETTLED'
  const [poFilterStatus, setPoFilterStatus] = useState<'ALL' | 'UNPAID' | 'SETTLED'>('ALL');

  // Filter for Claims status: 'PENDING' (Default) | 'SETTLED' | 'ALL'
  const [claimsFilterStatus, setClaimsFilterStatus] = useState<'PENDING' | 'SETTLED' | 'ALL'>('PENDING');

  // Filter for RMA status: 'PENDING' (Default) | 'SETTLED' | 'ALL'
  const [rmaFilterStatus, setRmaFilterStatus] = useState<'PENDING' | 'SETTLED' | 'ALL'>('PENDING');

  // Modal for settling PO debt
  const [payingPoModal, setPayingPoModal] = useState<PurchaseRecord | null>(null);
  const [payingPoAmount, setPayingPoAmount] = useState<number>(0);
  const [payingPoAccountId, setPayingPoAccountId] = useState<string>(treasuryAccounts[0]?.id || '');
  const [payingPoDate, setPayingPoDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [payingPoNotes, setPayingPoNotes] = useState<string>('');

  // Supplier & Month Filters: 'ALL' or specific
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');

  // Available transaction months
  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    supplierBenefits.forEach(b => { if (b.date) s.add(b.date.slice(0, 7)); });
    supplierReturns.forEach(r => { if (r.date) s.add(r.date.slice(0, 7)); });
    purchases.forEach(p => { if (p.date) s.add(p.date.slice(0, 7)); });
    return Array.from(s).filter(Boolean).sort().reverse();
  }, [supplierBenefits, supplierReturns, purchases]);

  // Category Filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddBenefitModalOpen, setIsAddBenefitModalOpen] = useState<boolean>(false);
  const [editingBenefit, setEditingBenefit] = useState<SupplierBenefit | null>(null);
  const [settlingBenefit, setSettlingBenefit] = useState<SupplierBenefit | null>(null);
  const [settleActionType, setSettleActionType] = useState<'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT'>('DEPOSIT_TREASURY');
  const [settleTargetPoId, setSettleTargetPoId] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [settleAccountId, setSettleAccountId] = useState<string>(treasuryAccounts[0]?.id || '');
  const [settleNotes, setSettleNotes] = useState<string>('');

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<ContactPartner | null>(null);
  const [isRmaReturnModalOpen, setIsRmaReturnModalOpen] = useState<boolean>(false);
  const [selectedRmaForSettlement, setSelectedRmaForSettlement] = useState<SupplierReturn | null>(null);

  // Form State for Add Benefit / Claim
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formSupplierName, setFormSupplierName] = useState<string>('');
  const [formSupplierPhone, setFormSupplierPhone] = useState<string>('');
  const [formCategory, setFormCategory] = useState<SupplierBenefitCategory>('Cashback');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formInitialStatus, setFormInitialStatus] = useState<'PENDING' | 'SETTLED'>('PENDING');
  const [formSettleAction, setFormSettleAction] = useState<'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT'>('DEPOSIT_TREASURY');
  const [formAccountId, setFormAccountId] = useState<string>(treasuryAccounts[0]?.id || '');
  const [formTargetPoId, setFormTargetPoId] = useState<string>('');
  const [formReferenceNo, setFormReferenceNo] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Supplier Product Category Filter State (matching screenshot categories)
  const [selectedProductCategoryFilter, setSelectedProductCategoryFilter] = useState<string>('ALL');

  // Form State for Supplier Contact
  const [supName, setSupName] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supEmail, setSupEmail] = useState<string>('');
  const [supCompany, setSupCompany] = useState<string>('');
  const [supCity, setSupCity] = useState<string>('Yangon');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supProductCategory, setSupProductCategory] = useState<string>('Smartphones & Tablets');
  const [supNotes, setSupNotes] = useState<string>('');

  // Helper function to match if a supplier belongs to a product category
  const isSupplierInProductCategory = React.useCallback((supNameStr: string, catId: string) => {
    if (catId === 'ALL') return true;
    const norm = supNameStr.trim().toLowerCase();

    // 1. Check if supplier partner record has productCategory set
    const partner = suppliers.find(s => s.name.trim().toLowerCase() === norm);
    if (partner && partner.productCategory) {
      const pCat = partner.productCategory.toLowerCase();
      const targetCat = catId.toLowerCase();
      if (pCat.includes(targetCat) || targetCat.includes(pCat)) return true;
      if (targetCat.includes('smartphones') && (pCat.includes('phone') || pCat.includes('mobile') || pCat.includes('tablet'))) return true;
      if (targetCat.includes('laptops') && (pCat.includes('laptop') || pCat.includes('computer') || pCat.includes('pc'))) return true;
      if (targetCat.includes('accessories') && (pCat.includes('accessor') || pCat.includes('gadget') || pCat.includes('retail'))) return true;
      if (targetCat.includes('spare') && (pCat.includes('spare') || pCat.includes('part') || pCat.includes('hardware'))) return true;
      return false;
    }

    // 2. Check Purchases PO items category/itemName
    const supPOs = purchases.filter(p => (p.supplierName || '').trim().toLowerCase() === norm);
    const poMatches = supPOs.some(p => {
      const c = (p.category || '').toLowerCase();
      const n = (p.itemName || '').toLowerCase();
      if (catId === 'Smartphones & Tablets') {
        return c.includes('phone') || c.includes('tablet') || c.includes('mobile') || n.includes('iphone') || n.includes('samsung') || n.includes('redmi') || n.includes('xiaomi') || n.includes('oppo') || n.includes('vivo');
      }
      if (catId === 'Laptops & Computers') {
        return c.includes('laptop') || c.includes('computer') || n.includes('macbook') || n.includes('notebook') || n.includes('thinkpad') || n.includes('asus') || n.includes('dell') || n.includes('hp');
      }
      if (catId === 'Accessories & Gadgets') {
        return c.includes('accessori') || c.includes('gadget') || c.includes('charger') || c.includes('audio') || n.includes('case') || n.includes('headphone') || n.includes('cable') || n.includes('powerbank');
      }
      if (catId === 'Spare Parts & Hardware') {
        return c.includes('spare') || c.includes('hardware') || c.includes('part') || c.includes('service') || n.includes('screen') || n.includes('battery') || n.includes('display') || n.includes('ic');
      }
      return false;
    });

    if (poMatches) return true;

    // 3. Fallback check name or company keywords
    const comp = ((partner && partner.company) || '').toLowerCase();
    if (catId === 'Smartphones & Tablets' && (norm.includes('mobile') || norm.includes('phone') || norm.includes('apple') || norm.includes('samsung') || comp.includes('mobile'))) return true;
    if (catId === 'Laptops & Computers' && (norm.includes('laptop') || norm.includes('computer') || norm.includes('dell') || norm.includes('asus') || comp.includes('computer'))) return true;
    if (catId === 'Accessories & Gadgets' && (norm.includes('accessory') || norm.includes('gadget') || norm.includes('remax') || comp.includes('accessory'))) return true;

    // Default fallback: if no category explicitly set and no POs, show in all categories
    if (!partner?.productCategory && supPOs.length === 0) return true;

    return false;
  }, [suppliers, purchases]);

  // Unique list of suppliers from both partners and POs (filtered by Product Category if selected)
  const allSupplierNames = useMemo(() => {
    const set = new Set<string>();
    suppliers.filter(s => s.type === 'Supplier').forEach(s => set.add(s.name.trim()));
    purchases.forEach(p => {
      if (p.supplierName) set.add(p.supplierName.trim());
    });
    const fullList = Array.from(set).sort();
    if (selectedProductCategoryFilter === 'ALL') return fullList;
    return fullList.filter(sName => isSupplierInProductCategory(sName, selectedProductCategoryFilter));
  }, [suppliers, purchases, selectedProductCategoryFilter, isSupplierInProductCategory]);

  // Unified suppliers list for directory (partners + suppliers auto-discovered from POs)
  const unifiedDirectorySuppliers = useMemo(() => {
    const list: Array<ContactPartner> = [];
    const seen = new Set<string>();

    // 1. First add saved suppliers from contacts
    suppliers.filter(s => s.type === 'Supplier').forEach(s => {
      const norm = s.name.trim().toLowerCase();
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(s);
      }
    });

    // 2. Add suppliers discovered from purchases who might not have a ContactPartner entry yet
    purchases.forEach(p => {
      if (p.supplierName && p.supplierName.trim()) {
        const norm = p.supplierName.trim().toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          list.push({
            id: `supp-auto-${norm.replace(/[^a-z0-9]/g, '-')}`,
            name: p.supplierName.trim(),
            type: 'Supplier',
            company: p.supplierName.trim(),
            phone: p.supplierPhone || '-',
            email: '',
            city: 'Yangon',
            address: '',
            balanceDue: getPoRemainingDebt(p),
            productCategory: p.category || 'Smartphones & Tablets',
            notes: `Auto-linked from PO #${p.invoiceNo}`,
          });
        }
      }
    });

    return list;
  }, [suppliers, purchases]);

  // Open POs for selected supplier in Add Benefit modal
  const openPOsForModalSupplier = useMemo(() => {
    if (!formSupplierName) return [];
    return purchases.filter((p) => {
      const match = (p.supplierName || '').trim().toLowerCase() === formSupplierName.trim().toLowerCase();
      const debt = getPoRemainingDebt(p);
      return match && debt > 0 && p.paymentStatus !== 'PAID';
    });
  }, [purchases, formSupplierName]);

  // Auto-populate initial PO when modal opens or supplier changes
  React.useEffect(() => {
    if (openPOsForModalSupplier.length > 0 && !formTargetPoId) {
      setFormTargetPoId(openPOsForModalSupplier[0].id);
    }
  }, [openPOsForModalSupplier, formTargetPoId]);

  // Open POs for settling supplier in Settle modal
  const openPOsForSettleSupplier = useMemo(() => {
    if (!settlingBenefit?.supplierName) return [];
    return purchases.filter((p) => {
      const match = (p.supplierName || '').trim().toLowerCase() === settlingBenefit.supplierName.trim().toLowerCase();
      const debt = getPoRemainingDebt(p);
      return match && debt > 0 && p.paymentStatus !== 'PAID';
    });
  }, [purchases, settlingBenefit]);

  React.useEffect(() => {
    if (openPOsForSettleSupplier.length > 0 && !settleTargetPoId) {
      setSettleTargetPoId(openPOsForSettleSupplier[0].id);
    }
  }, [openPOsForSettleSupplier, settleTargetPoId]);

  // Filtered Benefits / Claims
  const filteredBenefits = useMemo(() => {
    return supplierBenefits.filter((b) => {
      if (selectedMonthFilter !== 'ALL' && b.date && !b.date.startsWith(selectedMonthFilter)) return false;
      if (selectedProductCategoryFilter !== 'ALL' && !isSupplierInProductCategory(b.supplierName, selectedProductCategoryFilter)) {
        return false;
      }
      if (selectedSupplierFilter !== 'ALL' && b.supplierName !== selectedSupplierFilter) {
        return false;
      }
      if (selectedCategoryFilter !== 'ALL' && b.category !== selectedCategoryFilter) {
        return false;
      }
      if (claimsFilterStatus === 'PENDING' && b.status === 'SETTLED') {
        return false;
      }
      if (claimsFilterStatus === 'SETTLED' && b.status !== 'SETTLED') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.supplierName.toLowerCase().includes(q);
        const matchRef = (b.referenceNo || '').toLowerCase().includes(q);
        const matchNotes = (b.notes || '').toLowerCase().includes(q);
        const matchCat = b.category.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchNotes && !matchCat) return false;
      }
      return true;
    });
  }, [supplierBenefits, selectedProductCategoryFilter, selectedSupplierFilter, selectedCategoryFilter, claimsFilterStatus, searchQuery, isSupplierInProductCategory, selectedMonthFilter]);

  // Filtered RMA Returns
  const filteredReturns = useMemo(() => {
    return supplierReturns.filter((r) => {
      if (selectedMonthFilter !== 'ALL' && r.date && !r.date.startsWith(selectedMonthFilter)) return false;
      if (selectedProductCategoryFilter !== 'ALL' && !isSupplierInProductCategory(r.supplierName, selectedProductCategoryFilter)) {
        return false;
      }
      if (selectedSupplierFilter !== 'ALL' && r.supplierName !== selectedSupplierFilter) {
        return false;
      }
      const isPendingRma = r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT';
      if (rmaFilterStatus === 'PENDING' && !isPendingRma) {
        return false;
      }
      if (rmaFilterStatus === 'SETTLED' && isPendingRma) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.supplierName.toLowerCase().includes(q);
        const matchItem = r.itemName.toLowerCase().includes(q);
        const matchSku = (r.sku || '').toLowerCase().includes(q);
        const matchCode = (r.returnCode || r.returnNo || '').toLowerCase().includes(q);
        if (!matchName && !matchItem && !matchSku && !matchCode) return false;
      }
      return true;
    });
  }, [supplierReturns, selectedProductCategoryFilter, selectedSupplierFilter, rmaFilterStatus, searchQuery, isSupplierInProductCategory, selectedMonthFilter]);

  // List of unpaid/open POs matching filters
  const openPOList = useMemo(() => {
    return purchases.filter((p) => {
      if (selectedMonthFilter !== 'ALL' && p.date && !p.date.startsWith(selectedMonthFilter)) return false;
      const debt = getPoRemainingDebt(p);
      const isPaid = p.paymentStatus === 'PAID' || debt <= 0;

      if (poFilterStatus === 'UNPAID' && isPaid) return false;
      if (poFilterStatus === 'SETTLED' && !isPaid) return false;

      if (selectedSupplierFilter !== 'ALL') {
        const pSup = (p.supplierName || '').trim().toLowerCase();
        const fSup = selectedSupplierFilter.trim().toLowerCase();
        if (pSup !== fSup && !pSup.includes(fSup) && !fSup.includes(pSup)) return false;
      }

      if (selectedProductCategoryFilter !== 'ALL') {
        if (!isSupplierInProductCategory(p.supplierName || '', selectedProductCategoryFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInv = (p.invoiceNo || '').toLowerCase().includes(q);
        const matchSup = (p.supplierName || '').toLowerCase().includes(q);
        const matchItem = (p.itemName || '').toLowerCase().includes(q);
        if (!matchInv && !matchSup && !matchItem) return false;
      }

      return true;
    });
  }, [purchases, poFilterStatus, selectedSupplierFilter, selectedProductCategoryFilter, searchQuery, isSupplierInProductCategory, selectedMonthFilter]);

  const handleOpenPayPoModal = (po: PurchaseRecord) => {
    const debt = getPoRemainingDebt(po);
    setPayingPoModal(po);
    setPayingPoAmount(debt);
    setPayingPoAccountId(treasuryAccounts[0]?.id || '');
    setPayingPoDate(new Date().toISOString().split('T')[0]);
    setPayingPoNotes(`PO Debt Settlement: ${po.invoiceNo}`);
  };

  const handleConfirmPayPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPoModal || payingPoAmount <= 0) return;
    if (onPayPurchaseDebt) {
      onPayPurchaseDebt(payingPoModal.id, payingPoAmount, payingPoAccountId, payingPoNotes);
    }
    setPayingPoModal(null);
  };

  // Category Metrics for the selected supplier (Pending amount to receive + History Count)
  const categoryMetrics = useMemo(() => {
    let list = selectedSupplierFilter === 'ALL'
      ? supplierBenefits
      : supplierBenefits.filter(b => b.supplierName === selectedSupplierFilter);
    if (selectedMonthFilter !== 'ALL') {
      list = list.filter(b => b.date && b.date.startsWith(selectedMonthFilter));
    }

    const map: Record<string, { totalAmount: number; count: number; pendingCount: number }> = {};
    BENEFIT_CATEGORIES.forEach(cat => {
      map[cat.id] = { totalAmount: 0, count: 0, pendingCount: 0 };
    });

    list.forEach(b => {
      if (map[b.category]) {
        map[b.category].count += 1;
        if (b.status === 'PENDING') {
          map[b.category].totalAmount += b.amount;
          map[b.category].pendingCount += 1;
        }
      }
    });

    const totalAllAmount = list.reduce((s, b) => s + b.amount, 0);
    const settledTreasuryBenefits = list.filter(b => b.settleAction === 'DEPOSIT_TREASURY' && b.status === 'SETTLED').reduce((s, b) => s + b.amount, 0);
    const deductedDebtBenefits = list.filter(b => b.settleAction === 'DEDUCT_SUPPLIER_DEBT' && b.status === 'SETTLED').reduce((s, b) => s + b.amount, 0);

    // Include RMA returns into 'RMA / Defect Claim' category card
    let relevantReturns = selectedSupplierFilter === 'ALL'
      ? supplierReturns
      : supplierReturns.filter(r => (r.supplierName || '').trim().toLowerCase() === selectedSupplierFilter.trim().toLowerCase());
    if (selectedMonthFilter !== 'ALL') {
      relevantReturns = relevantReturns.filter(r => r.date && r.date.startsWith(selectedMonthFilter));
    }
    
    // Only pending monetary RMA claims show as outstanding amount; settled ones show in count history
    const pendingRmaReturns = relevantReturns.filter(r => (r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT') && (r.actionTaken === 'CASH_OR_BANK_REFUND' || r.actionTaken === 'DEDUCT_SUPPLIER_DEBT'));
    const pendingRmaAmount = pendingRmaReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    if (map['RMA / Defect Claim']) {
      map['RMA / Defect Claim'] = {
        totalAmount: pendingRmaAmount,
        count: relevantReturns.length,
        pendingCount: relevantReturns.filter(r => r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT').length,
      };
    }

    return {
      map,
      totalAllAmount,
      settledTreasury: settledTreasuryBenefits,
      deductedDebt: deductedDebtBenefits,
      totalCount: list.length,
    };
  }, [supplierBenefits, supplierReturns, selectedSupplierFilter, selectedMonthFilter]);

  // RMA Metrics
  const rmaMetrics = useMemo(() => {
    let list = selectedSupplierFilter === 'ALL'
      ? supplierReturns
      : supplierReturns.filter(r => (r.supplierName || '').trim().toLowerCase() === selectedSupplierFilter.trim().toLowerCase());
    if (selectedMonthFilter !== 'ALL') {
      list = list.filter(r => r.date && r.date.startsWith(selectedMonthFilter));
    }

    const pending = list.filter(r => r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT');
    const completed = list.filter(r => r.status === 'COMPLETED');
    const replaced = list.filter(r => r.status === 'COMPLETED' && r.resolutionType === 'REPLACED');
    const refunded = list.filter(r => r.status === 'COMPLETED' && r.resolutionType === 'REFUNDED');
    const debtDeducted = list.filter(r => r.status === 'COMPLETED' && r.resolutionType === 'DEBT_DEDUCTED');
    
    const monetaryRefundValue = list
      .filter(r => r.status === 'COMPLETED' && (r.resolutionType === 'REFUNDED' || r.resolutionType === 'DEBT_DEDUCTED'))
      .reduce((s, r) => s + (r.refundAmount || r.totalAmount || 0), 0);

    return {
      totalCount: list.length,
      pendingCount: pending.length,
      completedCount: completed.length,
      replacedCount: replaced.length,
      refundedCount: refunded.length,
      debtDeductedCount: debtDeducted.length,
      totalValue: monetaryRefundValue,
    };
  }, [supplierReturns, selectedSupplierFilter, selectedMonthFilter]);

  // Financial metrics for selected supplier (or ALL): PO Payable & Receivable
  const supplierFinancialMetrics = useMemo(() => {
    const isAll = selectedSupplierFilter === 'ALL';
    
    // Purchases / PO Payables
    let relevantPurchases = isAll
      ? purchases
      : purchases.filter((p) => (p.supplierName || '').trim().toLowerCase() === selectedSupplierFilter.trim().toLowerCase());
    if (selectedMonthFilter !== 'ALL') {
      relevantPurchases = relevantPurchases.filter(p => p.date && p.date.startsWith(selectedMonthFilter));
    }
    
    const totalPOPayable = relevantPurchases.reduce((sum, p) => {
      return sum + getPoRemainingDebt(p);
    }, 0);

    const openPOCount = relevantPurchases.filter((p) => {
      return getPoRemainingDebt(p) > 0 && p.paymentStatus !== 'PAID';
    }).length;

    // Benefits & Claims Receivable
    let relevantBenefits = isAll
      ? supplierBenefits
      : supplierBenefits.filter((b) => (b.supplierName || '').trim().toLowerCase() === selectedSupplierFilter.trim().toLowerCase());
    if (selectedMonthFilter !== 'ALL') {
      relevantBenefits = relevantBenefits.filter(b => b.date && b.date.startsWith(selectedMonthFilter));
    }
    const totalBenefitsReceivable = relevantBenefits.reduce((sum, b) => sum + (b.amount || 0), 0);

    // RMA Returns Receivable (Only financial claims: Cash/Bank Refund or PO Debt Offset)
    let relevantReturns = isAll
      ? supplierReturns
      : supplierReturns.filter((r) => (r.supplierName || '').trim().toLowerCase() === selectedSupplierFilter.trim().toLowerCase());
    if (selectedMonthFilter !== 'ALL') {
      relevantReturns = relevantReturns.filter(r => r.date && r.date.startsWith(selectedMonthFilter));
    }

    // Settled vs Outstanding
    // 1. Inflow deposited into Treasury: Settled Benefits (DEPOSIT_TREASURY) + Completed RMA Cash/Bank Refunds (REFUNDED)
    const settledBenefitsTreasury = relevantBenefits
      .filter((b) => b.settleAction === 'DEPOSIT_TREASURY' && b.status === 'SETTLED')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const settledRmaTreasury = relevantReturns
      .filter((r) => r.status === 'COMPLETED' && r.resolutionType === 'REFUNDED')
      .reduce((sum, r) => sum + (r.refundAmount || r.totalAmount || 0), 0);
    const settledTreasury = settledBenefitsTreasury + settledRmaTreasury;

    // 2. Offset PO Debt: Settled Benefits (DEDUCT_SUPPLIER_DEBT) + Completed RMA PO Debt Deductions (DEBT_DEDUCTED)
    const deductedBenefitsDebt = relevantBenefits
      .filter((b) => b.settleAction === 'DEDUCT_SUPPLIER_DEBT' && b.status === 'SETTLED')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const deductedRmaDebt = relevantReturns
      .filter((r) => r.status === 'COMPLETED' && r.resolutionType === 'DEBT_DEDUCTED')
      .reduce((sum, r) => sum + (r.refundAmount || r.totalAmount || 0), 0);
    const deductedDebt = deductedBenefitsDebt + deductedRmaDebt;

    // Total Monetary RMA Return Value received (Refunds + Debt Offset)
    const totalRmaReceivable = settledRmaTreasury + deductedRmaDebt;

    // Total Financial Claims Logged = Benefits + RMA monetary refunds
    const totalReceivable = totalBenefitsReceivable + totalRmaReceivable;

    // Pending Monetary Claims (Pending Claims expecting payment)
    const pendingBenefitsReceivable = relevantBenefits
      .filter((b) => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const pendingRmaReceivable = relevantReturns
      .filter((r) => (r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT') && (r.actionTaken === 'CASH_OR_BANK_REFUND' || r.actionTaken === 'DEDUCT_SUPPLIER_DEBT'))
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    const totalPendingReceivable = pendingBenefitsReceivable + pendingRmaReceivable;

    // Unit Replacements count (Hardware swap, 0 monetary claim)
    const completedUnitReplacementsCount = relevantReturns.filter(
      (r) => r.status === 'COMPLETED' && r.resolutionType === 'REPLACED'
    ).length;

    // Net balance: Current Open PO Payable minus Monetary Receivable
    const netPayableBalance = totalPOPayable - (totalPendingReceivable > 0 ? totalPendingReceivable : 0);

    return {
      totalPOPayable,
      openPOCount,
      totalReceivable,
      totalPendingReceivable,
      pendingBenefitsReceivable,
      pendingRmaReceivable,
      totalBenefitsReceivable,
      totalRmaReceivable,
      completedUnitReplacementsCount,
      settledTreasury,
      deductedDebt,
      netPayableBalance,
    };
  }, [purchases, supplierBenefits, supplierReturns, selectedSupplierFilter, selectedMonthFilter]);

  // Per-supplier metrics breakdown for quick filter selector
  const perSupplierStats = useMemo(() => {
    const map = new Map<string, { poPayable: number; openPOCount: number; receivable: number; benefitsCount: number; rmaCount: number }>();
    
    allSupplierNames.forEach((sName) => {
      const norm = sName.trim().toLowerCase();
      let supPOs = purchases.filter((p) => (p.supplierName || '').trim().toLowerCase() === norm);
      if (selectedMonthFilter !== 'ALL') {
        supPOs = supPOs.filter((p) => p.date && p.date.startsWith(selectedMonthFilter));
      }
      const poPayable = supPOs.reduce((sum, p) => sum + getPoRemainingDebt(p), 0);
      const openPOCount = supPOs.filter((p) => {
        return getPoRemainingDebt(p) > 0 && p.paymentStatus !== 'PAID';
      }).length;

      let supBen = supplierBenefits.filter((b) => (b.supplierName || '').trim().toLowerCase() === norm);
      if (selectedMonthFilter !== 'ALL') {
        supBen = supBen.filter((b) => b.date && b.date.startsWith(selectedMonthFilter));
      }
      const benAmt = supBen.reduce((sum, b) => sum + (b.amount || 0), 0);

      let supRet = supplierReturns.filter((r) => (r.supplierName || '').trim().toLowerCase() === norm);
      if (selectedMonthFilter !== 'ALL') {
        supRet = supRet.filter((r) => r.date && r.date.startsWith(selectedMonthFilter));
      }
      // Only monetary RMA settlements (Refund or PO offset) count toward financial receivable
      const rmaMonetaryAmt = supRet
        .filter(r => r.status === 'COMPLETED' && (r.resolutionType === 'REFUNDED' || r.resolutionType === 'DEBT_DEDUCTED'))
        .reduce((sum, r) => sum + (r.refundAmount || r.totalAmount || 0), 0);

      map.set(sName, {
        poPayable,
        openPOCount,
        receivable: benAmt + rmaMonetaryAmt,
        benefitsCount: supBen.length,
        rmaCount: supRet.length,
      });
    });

    return map;
  }, [allSupplierNames, purchases, supplierBenefits, supplierReturns, selectedMonthFilter]);

  // Open Add Benefit Modal
  const openAddBenefitModal = (presetCategory?: SupplierBenefitCategory) => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSupplierName(selectedSupplierFilter !== 'ALL' ? selectedSupplierFilter : (allSupplierNames[0] || ''));
    setFormCategory(presetCategory || 'Cashback');
    setFormAmount(0);
    setFormInitialStatus('PENDING');
    setFormSettleAction('DEPOSIT_TREASURY');
    setFormAccountId(treasuryAccounts[0]?.id || '');
    setFormReferenceNo(`DOC-${Date.now().toString().slice(-4)}`);
    setFormNotes('');
    setIsAddBenefitModalOpen(true);
  };

  // Submit Add Benefit
  const handleSaveBenefit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierName.trim() || formAmount <= 0) return;

    const accObj = treasuryAccounts.find(a => a.id === formAccountId);
    const targetPo = purchases.find(p => p.id === formTargetPoId);
    const isSettled = formInitialStatus === 'SETTLED';

    const newBenefit: SupplierBenefit = {
      id: `supben-${Date.now()}`,
      claimNo: `CLM-${formDate.replace(/-/g, '').slice(2, 6)}-${Date.now().toString().slice(-3)}`,
      date: formDate,
      settlementDate: isSettled ? formDate : undefined,
      supplierName: formSupplierName.trim(),
      supplierPhone: formSupplierPhone.trim() || undefined,
      category: formCategory,
      amount: formAmount,
      settleAction: formSettleAction,
      accountId: formSettleAction === 'DEPOSIT_TREASURY' ? formAccountId : undefined,
      accountName: formSettleAction === 'DEPOSIT_TREASURY' ? accObj?.name : undefined,
      targetPurchaseId: formSettleAction === 'DEDUCT_SUPPLIER_DEBT' ? formTargetPoId : undefined,
      targetPurchaseInvoiceNo: formSettleAction === 'DEDUCT_SUPPLIER_DEBT' ? targetPo?.invoiceNo : undefined,
      status: formInitialStatus,
      referenceNo: formReferenceNo.trim() || undefined,
      notes: formNotes.trim() || undefined,
      recordedBy: currentUser.displayName || 'Admin',
      createdAt: new Date().toISOString(),
    };

    onAddSupplierBenefit(newBenefit);
    if (formInitialStatus === 'PENDING' && claimsFilterStatus === 'SETTLED') {
      setClaimsFilterStatus('PENDING');
    }
    setIsAddBenefitModalOpen(false);
  };

  // Open Supplier Form Modal
  const openSupplierModal = (sup?: ContactPartner) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupName(sup.name);
      setSupPhone(sup.phone);
      setSupEmail(sup.email || '');
      setSupCompany(sup.company || '');
      setSupCity(sup.city || 'Yangon');
      setSupAddress(sup.address || '');
      setSupProductCategory(sup.productCategory || 'Smartphones & Tablets');
      setSupNotes(sup.notes || '');
    } else {
      setEditingSupplier(null);
      setSupName('');
      setSupPhone('');
      setSupEmail('');
      setSupCompany('');
      setSupCity('Yangon');
      setSupAddress('');
      setSupProductCategory('Smartphones & Tablets');
      setSupNotes('');
    }
    setIsAddSupplierModalOpen(true);
  };

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) return;

    if (editingSupplier) {
      onUpdateSupplier({
        ...editingSupplier,
        name: supName.trim(),
        type: 'Supplier',
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        company: supCompany.trim() || undefined,
        city: supCity,
        address: supAddress.trim() || undefined,
        productCategory: supProductCategory,
        notes: supNotes.trim() || undefined,
      });
    } else {
      const newSup: ContactPartner = {
        id: `sup-${Date.now()}`,
        name: supName.trim(),
        type: 'Supplier',
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        company: supCompany.trim() || undefined,
        city: supCity,
        address: supAddress.trim() || undefined,
        productCategory: supProductCategory,
        notes: supNotes.trim() || undefined,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddSupplier(newSup);
    }
    setIsAddSupplierModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-purple-700" />
            <span>Suppliers &amp; Benefits Ledger</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              {allSupplierNames.length} Suppliers
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Supplier directory, Cashback, Policy Bonuses, Counter Rentals, Promotion Subsidies, Price Down &amp; RMA Settlements
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add RMA Return Button */}
          <button
            type="button"
            onClick={() => setIsRmaReturnModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Return Defect (RMA)</span>
          </button>

          {/* Record Claim / Benefit Button */}
          {!isRmaOnly && (
            <button
              type="button"
              onClick={() => openAddBenefitModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-purple-600/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Record Supplier Benefit</span>
            </button>
          )}

          {/* Add Supplier Contact */}
          {!isRmaOnly && (
            <button
              type="button"
              onClick={() => openSupplierModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ New Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Supplier Category, Supplier & Month Filter Strip (Clean Dropdown Layout) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Category:
              </span>
              <select
                value={selectedProductCategoryFilter}
                onChange={(e) => {
                  setSelectedProductCategoryFilter(e.target.value);
                  setSelectedSupplierFilter('ALL');
                }}
                className="px-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Smartphones & Tablets">Smartphones &amp; Tablets</option>
                <option value="Laptops & Computers">Laptops &amp; Computers</option>
                <option value="Accessories & Gadgets">Accessories &amp; Gadgets</option>
                <option value="Spare Parts & Hardware">Spare Parts &amp; Hardware</option>
              </select>
            </div>

            {/* Supplier Dropdown Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                Supplier:
              </span>
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-purple-500 shadow-2xs cursor-pointer max-w-xs"
              >
                <option value="ALL">All Suppliers ({allSupplierNames.length})</option>
                {allSupplierNames.map((sName) => (
                  <option key={sName} value={sName}>
                    {sName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Month:
            </span>
            <CalendarMonthPicker
              align="left"
              selectedMonth={selectedMonthFilter}
              onSelectMonth={(m) => setSelectedMonthFilter(m)}
              activeMonths={availableMonths}
              buttonClassName="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 rounded-xl text-xs font-black text-purple-900 shadow-2xs"
            />
            {selectedMonthFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedMonthFilter('ALL')}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Reset to view All Months"
              >
                All Time
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Executive Financial Summary for Selected Supplier (Hidden in Stock Management RMA mode) */}
      {!isRmaOnly && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: PO Payable */}
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('po_payables');
                setPoFilterStatus('UNPAID');
              }}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer space-y-1.5 ${
                activeSubTab === 'po_payables'
                  ? 'bg-rose-50/80 border-2 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                  : 'bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs'
              }`}
              title="Click to view payables vouchers"
            >
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">PO Payable (Outflow Debt)</span>
                <ShoppingBag className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-xl font-black text-rose-700 font-mono">
                {formatMMK(supplierFinancialMetrics.totalPOPayable)}
              </div>
              <div className="text-[10.5px] text-slate-500">
                {supplierFinancialMetrics.openPOCount} Open POs ({selectedSupplierFilter === 'ALL' ? 'All Suppliers' : selectedSupplierFilter})
              </div>
              <div className="pt-1 border-t border-rose-100 flex items-center gap-1 text-[10px] font-bold text-rose-700">
                <span>➔ View Payables Voucher List</span>
              </div>
            </button>

            {/* Card 2: Receivable */}
            <button
              type="button"
              onClick={() => {
                if (filteredBenefits.length === 0 && filteredReturns.length > 0) {
                  setActiveSubTab('rma');
                  setRmaFilterStatus('PENDING');
                } else {
                  setActiveSubTab('claims');
                  setClaimsFilterStatus('PENDING');
                }
              }}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer space-y-1.5 ${
                activeSubTab === 'claims' || activeSubTab === 'rma'
                  ? 'bg-emerald-50/80 border-2 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs'
              }`}
              title="Click to view receivables list"
            >
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  Receivable (Outstanding Inflow)
                </span>
                <Gift className="w-4 h-4 text-emerald-600" />
              </div>
              <div className={`text-xl font-black font-mono ${supplierFinancialMetrics.totalPendingReceivable > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {formatMMK(supplierFinancialMetrics.totalPendingReceivable)}
              </div>
              <div className="text-[10.5px] text-slate-500">
                Pending: {formatMMK(supplierFinancialMetrics.totalPendingReceivable)} • Settled History: {formatMMK(supplierFinancialMetrics.settledTreasury + supplierFinancialMetrics.deductedDebt)}
                {supplierFinancialMetrics.completedUnitReplacementsCount > 0 && (
                  <span className="text-slate-400"> ({supplierFinancialMetrics.completedUnitReplacementsCount} Unit Swaps)</span>
                )}
              </div>
              <div className="pt-1 border-t border-emerald-100 flex items-center justify-between text-[10px] font-bold text-emerald-700">
                <span>➔ View Active Receivables List</span>
                {supplierFinancialMetrics.totalPendingReceivable === 0 ? (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-mono text-[9.5px]">
                    ✓ All Cleared
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-[9.5px]">
                    Pending: {formatMMK(supplierFinancialMetrics.totalPendingReceivable)}
                  </span>
                )}
              </div>
            </button>

            {/* Card 3: Net Settlement Position */}
            <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-md border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-purple-300">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">
                  {supplierFinancialMetrics.netPayableBalance >= 0 ? 'Net Payable Balance' : 'Net Advance Surplus'}
                </span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-black text-purple-200 font-mono">
                {formatMMK(Math.abs(supplierFinancialMetrics.netPayableBalance))}
              </div>
              <div className="text-[10.5px] text-slate-400">
                {supplierFinancialMetrics.netPayableBalance >= 0 ? 'Payable minus Receivable' : 'Receivable exceeds Payable'}
              </div>
            </div>

            {/* Card 4: Deposited into Treasury */}
            <div className="p-4 bg-white border border-indigo-200 rounded-2xl shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-indigo-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Treasury Inflow (Direct Cash/Bank)</span>
                <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-black text-indigo-700 font-mono">
                {formatMMK(supplierFinancialMetrics.settledTreasury)}
              </div>
              <div className="text-[10.5px] text-slate-500">
                Directly deposited into Bank / Cash Drawer
              </div>
            </div>

            {/* Card 5: Offset PO Debt */}
            <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Offset PO Debt</span>
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-700 font-mono">
                {formatMMK(supplierFinancialMetrics.deductedDebt)}
              </div>
              <div className="text-[10.5px] text-slate-500">
                Deducted from open Purchase Order balances
              </div>
            </div>
          </div>

          {/* 6 Category Summary Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Benefit &amp; Incentive Categories
              </h2>
              <span className="text-[11px] text-slate-400">Click card to filter table below</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {BENEFIT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const stat = categoryMetrics.map[cat.id] || { totalAmount: 0, count: 0 };
                const isSelected = selectedCategoryFilter === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (cat.id === 'RMA / Defect Claim') {
                        setActiveSubTab('rma');
                        setRmaFilterStatus('PENDING');
                      } else {
                        setActiveSubTab('claims');
                        setClaimsFilterStatus('PENDING');
                        setSelectedCategoryFilter(isSelected ? 'ALL' : cat.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${cat.bgLight} ${cat.border} ring-2 ring-purple-500 shadow-sm`
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded-lg ${cat.bgLight} ${cat.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{stat.count} claims</span>
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 leading-snug">{cat.name}</div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <div className={`text-xs font-black ${cat.color}`}>
                        {formatMMK(stat.totalAmount)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main View Tabs (Claims Ledger / RMA Returns / Suppliers Directory) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-slate-50/70">
          <div className="flex items-center gap-2">
            {!isRmaOnly && (
              <button
                type="button"
                onClick={() => setActiveSubTab('po_payables')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'po_payables'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
                <span>PO Payables &amp; Debts ({openPOList.length})</span>
                {supplierFinancialMetrics.totalPOPayable > 0 && (
                  <span className="px-2 py-0.2 bg-rose-900 text-white rounded-full text-[10px] font-mono font-black">
                    {formatMMK(supplierFinancialMetrics.totalPOPayable)}
                  </span>
                )}
              </button>
            )}

            {!isRmaOnly && (
              <button
                type="button"
                onClick={() => setActiveSubTab('claims')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'claims'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Claims &amp; Benefits Ledger ({filteredBenefits.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubTab('rma')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'rma'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RMA Defect Returns &amp; Tracking ({filteredReturns.length})</span>
              {rmaMetrics.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                  {rmaMetrics.pendingCount}
                </span>
              )}
            </button>

            {!isRmaOnly && (
              <button
                type="button"
                onClick={() => setActiveSubTab('directory')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'directory'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Supplier Directory</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supplier, ref #, item..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* SUB-VIEW 0: PO PAYABLES & OPEN DEBTS */}
        {activeSubTab === 'po_payables' && (
          <div>
            {/* Filter and stats bar for PO Payables */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filter POs:</span>
                {/* 1. Unpaid PO Debts */}
                <button
                  type="button"
                  onClick={() => setPoFilterStatus('UNPAID')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    poFilterStatus === 'UNPAID'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show only unpaid vouchers that need payment"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unpaid PO Debts</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${poFilterStatus === 'UNPAID' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'}`}>
                    {purchases.filter(p => getPoRemainingDebt(p) > 0 && p.paymentStatus !== 'PAID').length}
                  </span>
                </button>

                {/* 2. Paid / Settled */}
                <button
                  type="button"
                  onClick={() => setPoFilterStatus('SETTLED')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    poFilterStatus === 'SETTLED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show cleared / paid vouchers"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Paid / Settled POs</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${poFilterStatus === 'SETTLED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {purchases.filter(p => getPoRemainingDebt(p) === 0 || p.paymentStatus === 'PAID').length}
                  </span>
                </button>

                {/* 3. All POs */}
                <button
                  type="button"
                  onClick={() => setPoFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    poFilterStatus === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show all purchase vouchers"
                >
                  <span>All PO Vouchers</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${poFilterStatus === 'ALL' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {purchases.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                <span>Showing {openPOList.length} PO records</span>
                {supplierFinancialMetrics.totalPOPayable > 0 && (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-mono font-black">
                    Total Debt: {formatMMK(supplierFinancialMetrics.totalPOPayable)}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">PO Date &amp; Invoice #</th>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3">Purchased Item / Model</th>
                    <th className="px-4 py-3 text-right">Total PO (MMK)</th>
                    <th className="px-4 py-3 text-right">Paid Amount (MMK)</th>
                    <th className="px-4 py-3 text-right">Remaining Debt (MMK)</th>
                    <th className="px-4 py-3">Status &amp; Due Date</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openPOList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="font-bold text-slate-600">
                            {poFilterStatus === 'UNPAID' ? 'No Open PO Debts' : poFilterStatus === 'SETTLED' ? 'No Settled POs' : 'No Purchase Orders Found'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {poFilterStatus === 'UNPAID'
                              ? 'All Purchase Orders for the selected supplier/category have been fully settled.'
                              : 'No purchase records match the selected status and filters.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    openPOList.map((po) => {
                      const debt = getPoRemainingDebt(po);
                      const isFullyPaid = debt <= 0 || po.paymentStatus === 'PAID';
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-900">{po.invoiceNo}</div>
                            <div className="text-[11px] text-slate-500">{formatDateDMY(po.date)}</div>
                            <div className="text-[10px] text-purple-700 font-bold">{po.branchName}</div>
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-900">
                            {po.supplierName}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{po.itemName}</div>
                            <div className="text-[10px] text-slate-400">
                              {po.brand ? `${po.brand} • ` : ''}Qty: {po.quantity || 1}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                            {formatMMK(po.totalAmount)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {formatMMK(po.paidAmount || 0)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono font-black text-sm">
                            <span className={debt > 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {formatMMK(debt)}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {debt > 0 ? (
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  (po.paidAmount || 0) > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <Clock className="w-3 h-3" />
                                  <span>{(po.paidAmount || 0) > 0 ? 'Partial Debt' : 'Unpaid Debt'}</span>
                                </span>
                                {po.dueDate && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                    Due: {formatDateDMY(po.dueDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Fully Paid</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {debt > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayPoModal(po)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay PO Debt</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>✓ Paid</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-VIEW 1: CLAIMS & BENEFITS TABLE */}
        {activeSubTab === 'claims' && (
          <div>
            {/* Filter and stats bar for Claims & Benefits */}
            <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filter Claims:</span>
                {/* 1. Pending Receivables */}
                <button
                  type="button"
                  onClick={() => setClaimsFilterStatus('PENDING')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    claimsFilterStatus === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show only pending claim vouchers awaiting payment / settlement"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Claims</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${claimsFilterStatus === 'PENDING' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {supplierBenefits.filter(b => b.status === 'PENDING').length}
                  </span>
                </button>

                {/* 2. Paid / Settled */}
                <button
                  type="button"
                  onClick={() => setClaimsFilterStatus('SETTLED')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    claimsFilterStatus === 'SETTLED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show cleared / paid claim vouchers"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Settled / Paid</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${claimsFilterStatus === 'SETTLED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    {supplierBenefits.filter(b => b.status === 'SETTLED').length}
                  </span>
                </button>

                {/* 3. All Claims */}
                <button
                  type="button"
                  onClick={() => setClaimsFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    claimsFilterStatus === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show all claim vouchers"
                >
                  <span>All Claims</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${claimsFilterStatus === 'ALL' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {supplierBenefits.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                <span>Showing {filteredBenefits.length} claim vouchers</span>
                {supplierFinancialMetrics.totalPendingReceivable > 0 && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg font-mono font-black">
                    Pending Receivable: {formatMMK(supplierFinancialMetrics.totalPendingReceivable)}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Claim Date &amp; Ref #</th>
                    <th className="px-4 py-3">Supplier Name</th>
                    <th className="px-4 py-3">Benefit Category</th>
                    <th className="px-4 py-3 text-right">Amount (MMK)</th>
                    <th className="px-4 py-3">Settlement Action</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes &amp; Recorded By</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBenefits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        <div className="max-w-md mx-auto space-y-3">
                          {filteredReturns.length > 0 ? (
                            <div className="p-4 bg-purple-50/90 border border-purple-200 rounded-2xl text-left space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                                  <RotateCcw className="w-4 h-4 text-purple-700" />
                                  <span>RMA Defect Returns Awaiting Settlement ({filteredReturns.length})</span>
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 font-mono font-black text-xs">
                                  {formatMMK(supplierFinancialMetrics.totalRmaReceivable)}
                                </span>
                              </div>
                              <p className="text-xs text-purple-800 leading-relaxed">
                                Receivable includes <strong>{formatMMK(supplierFinancialMetrics.totalRmaReceivable)}</strong> from returned defective products. You can settle via Unit Replacement, Cash/Bank Refund, or PO Debt Deduction.
                              </p>
                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubTab('rma');
                                    setRmaFilterStatus('PENDING');
                                  }}
                                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                                >
                                  <span>View &amp; Settle RMA Defect Returns ({formatMMK(supplierFinancialMetrics.totalRmaReceivable)})</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-xs mx-auto space-y-2">
                              <Gift className="w-8 h-8 mx-auto text-slate-300" />
                              <p className="font-bold text-slate-600">
                                {claimsFilterStatus === 'PENDING' ? 'No Pending Claims' : claimsFilterStatus === 'SETTLED' ? 'No Settled Claims' : 'No Supplier Benefits Recorded'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {claimsFilterStatus === 'PENDING'
                                  ? 'All supplier benefit vouchers have been cleared and settled.'
                                  : 'Click "+ Record Supplier Benefit" to log Cashback, Policy Bonus, Counter Rental, Promotion, or Price Down compensations.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBenefits.map((b) => {
                      const catMeta = BENEFIT_CATEGORIES.find(c => c.id === b.category);
                      const CatIcon = catMeta?.icon || Gift;
                      const isPending = b.status !== 'SETTLED';
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-purple-800">{b.claimNo}</div>
                            <div className="text-[11px] text-slate-500">{formatDateDMY(b.date)}</div>
                            {b.referenceNo && (
                              <span className="text-[10px] text-slate-400 font-mono">Ref: {b.referenceNo}</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-900">
                            {b.supplierName}
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${catMeta?.bgLight || 'bg-slate-100'} ${catMeta?.color || 'text-slate-800'} border ${catMeta?.border || 'border-slate-200'}`}>
                              <CatIcon className="w-3.5 h-3.5" />
                              <span>{b.category}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right font-black text-purple-900 text-sm">
                            {formatMMK(b.amount)}
                          </td>

                          <td className="px-4 py-3">
                            {b.settleAction === 'DEPOSIT_TREASURY' ? (
                              <div className="flex items-center gap-1.5 text-emerald-700">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                <div>
                                  <div className="font-bold text-[11px]">Treasury Inflow</div>
                                  <div className="text-[10px] text-slate-500">{b.accountName || 'Cash/Bank'}</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-blue-700">
                                <CreditCard className="w-3.5 h-3.5" />
                                <div>
                                  <div className="font-bold text-[11px]">Offset PO Debt</div>
                                  <div className="text-[10px] text-slate-500">PO #{b.targetPurchaseInvoiceNo || 'Supplier PO'}</div>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {b.status === 'SETTLED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Settled / Paid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending Payment</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-slate-600">
                            <div className="line-clamp-1">{b.notes || '—'}</div>
                            <div className="text-[10px] text-slate-400">By {b.recordedBy}</div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isPending ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSettlingBenefit(b);
                                    setSettleActionType(b.settleAction || 'DEPOSIT_TREASURY');
                                    setSettleDate(new Date().toISOString().split('T')[0]);
                                    setSettleAccountId(b.accountId || treasuryAccounts[0]?.id || '');
                                    setSettleTargetPoId(b.targetPurchaseId || '');
                                    setSettleNotes('');
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                  title="Clear / Settle this voucher and deposit to treasury or offset PO debt"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>Settle Voucher</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                                  ✓ Cleared
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setEditingBenefit(b)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Claim Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {canUserDelete(currentUser) && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteSupplierBenefit(b.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Claim Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* SUB-VIEW 2: RMA DEFECT RETURNS & SETTLEMENT */}
        {activeSubTab === 'rma' && (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <span>RMA Defect Returns &amp; Settlement History</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Defective stock returned to supplier and resolution settlement records
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onClearAllSupplierReturns && supplierReturns.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllSupplierReturns}
                    className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Clear all RMA records to test freshly from scratch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All RMA ({supplierReturns.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsRmaReturnModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Return Defect (RMA)</span>
                </button>
              </div>
            </div>

            {/* Filter bar for RMA status */}
            <div className="px-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Filter RMA:</span>
                <button
                  type="button"
                  onClick={() => setRmaFilterStatus('PENDING')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rmaFilterStatus === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show only pending RMA awaiting resolution"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending RMA ({supplierReturns.filter(r => r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRmaFilterStatus('SETTLED')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rmaFilterStatus === 'SETTLED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show resolved / completed RMA records"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Resolved RMA ({supplierReturns.filter(r => r.status === 'COMPLETED').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRmaFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    rmaFilterStatus === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Show all RMA records"
                >
                  <span>All RMA ({supplierReturns.length})</span>
                </button>
              </div>

              <div className="text-[11px] font-bold text-slate-500">
                Showing {filteredReturns.length} RMA records
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">RMA Code / Date</th>
                  <th className="px-4 py-3">Item &amp; Defective Serial</th>
                  <th className="px-4 py-3">Supplier &amp; PO</th>
                  <th className="px-4 py-3 text-right">Qty &amp; Unit Cost</th>
                  <th className="px-4 py-3 text-right">Claim Value</th>
                  <th className="px-4 py-3">Defect Reason</th>
                  <th className="px-4 py-3">Status / Resolution</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <RotateCcw className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-600">No RMA Returns recorded</p>
                        <p className="text-[11px] text-slate-400">
                          Click &quot;+ Return Defect (RMA)&quot; to register defective products returned to suppliers for repair, unit replacement, or refund.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => {
                    const isPending = ret.status === 'PENDING' || ret.status === 'PENDING_REPLACEMENT';
                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-purple-700">{ret.returnCode || ret.returnNo}</div>
                          <div className="text-[11px] text-slate-500">{formatDateDMY(ret.date)}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{ret.itemName}</div>
                          <div className="text-[10.5px] text-slate-500 font-mono">SKU: {ret.sku || 'N/A'}</div>
                          {ret.imeiList && ret.imeiList.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {ret.imeiList.map((im, i) => (
                                <span key={i} className="px-1.5 py-0.2 bg-rose-50 text-rose-800 border border-rose-200 rounded font-mono text-[9px] font-bold">
                                  {im}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{ret.supplierName}</div>
                          {ret.purchaseInvoiceNo && (
                            <div className="text-[10px] text-slate-500 font-mono">PO: #{ret.purchaseInvoiceNo}</div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-slate-900">{formatNumber(ret.quantity)} pcs</div>
                          <div className="text-[10.5px] text-slate-500">@ {formatMMK(ret.unitCost)}</div>
                        </td>

                        <td className="px-4 py-3 text-right font-black text-purple-900">
                          {formatMMK(ret.totalAmount)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-rose-700">⚠️ {ret.defectReason || ret.reason}</div>
                          {ret.defectDescription && (
                            <div className="text-[10.5px] text-slate-500 line-clamp-1">{ret.defectDescription}</div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pending RMA Resolution</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  Completed ({
                                    ret.resolutionType === 'REFUNDED'
                                      ? 'Cash/Bank Refund'
                                      : ret.resolutionType === 'DEBT_DEDUCTED'
                                      ? 'PO Debt Offset'
                                      : ret.resolutionType === 'REPLACED'
                                      ? 'Unit Replaced'
                                      : ret.resolutionType === 'REPAIRED'
                                      ? 'Repaired'
                                      : 'Settled'
                                  })
                                </span>
                              </span>
                              {ret.settlementDate && (
                                <div className="text-[9.5px] text-slate-400">On {formatDateDMY(ret.settlementDate)}</div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => setSelectedRmaForSettlement(ret)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Settle RMA</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">✓ Resolved</span>
                            )}

                            {onDeleteSupplierReturn && canUserDelete(currentUser) && (
                              <button
                                type="button"
                                onClick={() => onDeleteSupplierReturn(ret.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete RMA Record"
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
      )}

        {/* SUB-VIEW 3: SUPPLIER DIRECTORY */}
        {activeSubTab === 'directory' && (
          <div className="p-4 space-y-4">
            {/* Directory Category Filter Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Filter Supplier Directory by Category:
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  {selectedProductCategoryFilter === 'ALL' ? 'All Categories' : selectedProductCategoryFilter}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {unifiedDirectorySuppliers
                .filter(s => {
                  if (selectedProductCategoryFilter === 'ALL') return true;
                  return isSupplierInProductCategory(s.name, selectedProductCategoryFilter);
                })
                .map((sup) => (
                  <div
                    key={sup.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-purple-300 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs text-slate-900">{sup.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{sup.company || 'Official Supplier'}</span>
                            <span className="text-[9.5px] font-bold px-2 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                              {sup.productCategory || 'Smartphones & Tablets'}
                            </span>
                          </div>
                        </div>
                      </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openSupplierModal(sup)}
                      className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {canUserDelete(currentUser) && (
                      <button
                        type="button"
                        onClick={() => onDeleteSupplier(sup.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                  {sup.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{sup.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.city} {sup.address ? `• ${sup.address}` : ''}</span>
                  </div>
                </div>

                {(() => {
                  const supPOs = purchases.filter(p => (p.supplierName || '').trim().toLowerCase() === sup.name.trim().toLowerCase());
                  const supPayable = supPOs.reduce((sum, p) => sum + getPoRemainingDebt(p), 0);
                  const openCount = supPOs.filter(p => getPoRemainingDebt(p) > 0 && p.paymentStatus !== 'PAID').length;
                  const firstOpenPO = supPOs.find(p => getPoRemainingDebt(p) > 0 && p.paymentStatus !== 'PAID');

                  const supBenefits = supplierBenefits.filter(b => (b.supplierName || '').trim().toLowerCase() === sup.name.trim().toLowerCase());
                  const supReturns = supplierReturns.filter(r => (r.supplierName || '').trim().toLowerCase() === sup.name.trim().toLowerCase());
                  const supReceivable = supBenefits.reduce((sum, b) => sum + (b.amount || 0), 0) +
                    supReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

                  return (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">PO Payable</span>
                          <span className="font-mono font-black text-rose-600 text-sm">{formatMMK(supPayable)}</span>
                          {openCount > 0 && (
                            <span className="text-[9.5px] text-rose-600 font-bold block">{openCount} Unpaid POs</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Receivable</span>
                          <span className="font-mono font-black text-emerald-700 text-sm">{formatMMK(supReceivable)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-100/70 rounded-lg text-[11px]">
                        <span className="text-slate-500 font-bold">Net Balance:</span>
                        <span className={`font-mono font-black ${supPayable - supReceivable >= 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {supPayable - supReceivable >= 0 ? `Payable: ${formatMMK(supPayable - supReceivable)}` : `Surplus: ${formatMMK(Math.abs(supPayable - supReceivable))}`}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplierFilter(sup.name);
                              setActiveSubTab('po_payables');
                            }}
                            className="text-[10.5px] font-bold px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer flex items-center gap-1"
                            title="View PO Debts for this supplier"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>PO Debts ({openCount})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplierFilter(sup.name);
                              setActiveSubTab('claims');
                            }}
                            className="text-[10.5px] font-bold px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Gift className="w-3 h-3" />
                            <span>Claims</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {firstOpenPO && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayPoModal(firstOpenPO)}
                              className="text-[10.5px] font-bold px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Pay oldest open PO debt"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay Debt</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSupplierFilter(sup.name);
                              openAddBenefitModal();
                            }}
                            className="text-[10.5px] font-extrabold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Benefit</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: RECORD SUPPLIER BENEFIT / CLAIM */}
      {isAddBenefitModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddBenefitModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-2xl">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Record Supplier Benefit / Claim</h2>
                  <p className="text-xs text-slate-300">
                    Log Cashback, Policy Bonus, Counter Rental, Promo Subsidy, or Price Down
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddBenefitModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBenefit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    list="supplier-options"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    placeholder="e.g. Apple Distributor, Samsung Myanmar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <datalist id="supplier-options">
                    {allSupplierNames.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Claim Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Benefit Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as SupplierBenefitCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {BENEFIT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Claim / Benefit Amount (MMK) *
                </label>
                <FormattedNumberInput
                  value={formAmount}
                  onChange={(val) => setFormAmount(val)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-purple-300 rounded-xl text-sm font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0"
                />
              </div>

              {/* Initial Voucher Status (Pending Receivable vs Already Settled) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voucher Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormInitialStatus('PENDING')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      formInitialStatus === 'PENDING'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>⏳ Pending Receivable</div>
                    <div className="text-[10px] font-medium opacity-90">Pending စာရင်းထဲသိမ်းမည် (နောက်မှရှင်းမည်)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormInitialStatus('SETTLED')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      formInitialStatus === 'SETTLED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>✓ Already Settled</div>
                    <div className="text-[10px] font-medium opacity-90">ချက်ချင်းရှင်းပြီး ငွေစာရင်းသွင်းမည်</div>
                  </button>
                </div>
              </div>

              {/* Settlement Action (Treasury Inflow vs Offset PO Debt) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    {formInitialStatus === 'SETTLED' ? 'Settlement Method (Immediate) *' : 'Planned Settlement Method (When Settled Later) *'}
                  </label>
                  {formInitialStatus === 'PENDING' && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Pending Claims ထဲရောက်မည်
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSettleAction('DEPOSIT_TREASURY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formSettleAction === 'DEPOSIT_TREASURY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-extrabold text-xs">💵 Direct Cash/Bank Inflow</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Deposit directly into Treasury Cash / Bank account</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSettleAction('DEDUCT_SUPPLIER_DEBT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formSettleAction === 'DEDUCT_SUPPLIER_DEBT'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-extrabold text-xs">💳 Offset Supplier PO Debt</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Deduct & offset from open PO debt</div>
                  </button>
                </div>
              </div>

              {formSettleAction === 'DEPOSIT_TREASURY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Into Account *
                  </label>
                  <select
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {treasuryAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Bal: {formatMMK(acc.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formSettleAction === 'DEDUCT_SUPPLIER_DEBT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Target PO to Deduct Debt *
                  </label>
                  {openPOsForModalSupplier.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
                      No unpaid PO debts found for supplier &quot;{formSupplierName}&quot;.
                    </div>
                  ) : (
                    <select
                      value={formTargetPoId}
                      onChange={(e) => setFormTargetPoId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {openPOsForModalSupplier.map((p) => (
                        <option key={p.id} value={p.id}>
                          PO #{p.invoiceNo} ({p.date}) — Remaining Debt: {formatMMK(p.remainingDebt || 0)} ({p.itemName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Policy / Reference No.
                  </label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="e.g. POL-2026-Q3, CR-SEP-01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. 100 units cashback rebate"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBenefitModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formAmount <= 0}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Benefit Claim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT SUPPLIER */}
      {isAddSupplierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddSupplierModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {editingSupplier ? 'Edit Supplier' : '+ Add New Supplier'}
                  </h2>
                  <p className="text-xs text-slate-400">Supplier contact and business directory</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 overflow-y-auto text-slate-700 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Apple Distributor Myanmar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="supplier@brand.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Company / Brand
                  </label>
                  <input
                    type="text"
                    value={supCompany}
                    onChange={(e) => setSupCompany(e.target.value)}
                    placeholder="e.g. Xiaomi Myanmar Co."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={supCity}
                    onChange={(e) => setSupCity(e.target.value)}
                    placeholder="Yangon / Mandalay"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Street, Township..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Category (Product Line)
                </label>
                <select
                  value={supProductCategory}
                  onChange={(e) => setSupProductCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Smartphones & Tablets">Smartphones &amp; Tablets</option>
                  <option value="Laptops & Computers">Laptops &amp; Computers</option>
                  <option value="Accessories & Gadgets">Accessories &amp; Gadgets</option>
                  <option value="Spare Parts & Hardware">Spare Parts &amp; Hardware</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingSupplier ? 'Update Supplier' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RMA DEFECT RETURN REGISTRATION */}
      {isRmaReturnModalOpen && (
        <SupplierReturnModal
          isOpen={isRmaReturnModalOpen}
          onClose={() => setIsRmaReturnModalOpen(false)}
          onSubmitReturn={(ret) => {
            onAddSupplierReturn(ret);
            setIsRmaReturnModalOpen(false);
          }}
          inventory={inventory}
          branches={branches}
          contacts={suppliers}
          currentUser={currentUser}
          treasuryAccounts={treasuryAccounts}
          purchases={purchases}
          existingReturns={supplierReturns}
        />
      )}

      {/* MODAL 4: RMA DEFECT RESOLUTION & SETTLEMENT */}
      {selectedRmaForSettlement && (
        <RmaSettlementModal
          isOpen={!!selectedRmaForSettlement}
          onClose={() => setSelectedRmaForSettlement(null)}
          rmaRecord={selectedRmaForSettlement}
          purchases={purchases}
          treasuryAccounts={treasuryAccounts}
          currentUser={currentUser}
          onSettleRma={onSettleRma}
        />
      )}

      {/* MODAL 5: EDIT SUPPLIER CLAIM / BENEFIT */}
      {editingBenefit && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingBenefit(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Edit Supplier Receivable / Claim ({editingBenefit.claimNo})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingBenefit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateSupplierBenefit) {
                  onUpdateSupplierBenefit(editingBenefit);
                }
                setEditingBenefit(null);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Claim Date *</label>
                  <input
                    type="date"
                    required
                    value={editingBenefit.date}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={editingBenefit.supplierName}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, supplierName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Benefit Category *</label>
                  <select
                    value={editingBenefit.category}
                    onChange={(e) => setEditingBenefit({ ...editingBenefit, category: e.target.value as SupplierBenefitCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {BENEFIT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Claim Amount (MMK) *</label>
                  <FormattedNumberInput
                    value={editingBenefit.amount}
                    onChange={(val) => setEditingBenefit({ ...editingBenefit, amount: val })}
                    min={0}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-right font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBenefit({ ...editingBenefit, status: 'PENDING' })}
                    className={`p-2 rounded-xl border font-bold text-center cursor-pointer ${
                      editingBenefit.status === 'PENDING'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBenefit({ ...editingBenefit, status: 'SETTLED' })}
                    className={`p-2 rounded-xl border font-bold text-center cursor-pointer ${
                      editingBenefit.status === 'SETTLED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    Settled / Paid
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ref / Voucher #</label>
                <input
                  type="text"
                  value={editingBenefit.referenceNo || ''}
                  onChange={(e) => setEditingBenefit({ ...editingBenefit, referenceNo: e.target.value })}
                  placeholder="e.g. Voucher or Credit Note #"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={editingBenefit.notes || ''}
                  onChange={(e) => setEditingBenefit({ ...editingBenefit, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {canUserDelete(currentUser) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingBenefit.id;
                      setEditingBenefit(null);
                      onDeleteSupplierBenefit(idToDelete);
                    }}
                    className="px-3.5 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Delete this Claim Voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Voucher</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBenefit(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SETTLE SUPPLIER CLAIM / MARK AS PAID */}
      {settlingBenefit && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSettlingBenefit(null);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-400">
                    Settle Supplier Voucher / Clear Receivable
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {settlingBenefit.claimNo} • {settlingBenefit.supplierName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettlingBenefit(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onSettleSupplierBenefit) {
                  onSettleSupplierBenefit(
                    settlingBenefit.id,
                    {
                      settleAction: settleActionType,
                      accountId: settleActionType === 'DEPOSIT_TREASURY' ? settleAccountId : undefined,
                      targetPoId: settleActionType === 'DEDUCT_SUPPLIER_DEBT' ? settleTargetPoId : undefined,
                      settleDate,
                      notes: settleNotes
                    }
                  );
                }
                setSettlingBenefit(null);
              }}
              className="p-6 space-y-4 text-xs text-slate-700"
            >
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-1 text-emerald-950">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{settlingBenefit.supplierName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                    {settlingBenefit.category}
                  </span>
                </div>
                <div className="text-xl font-black font-mono text-emerald-800">
                  {formatMMK(settlingBenefit.amount)}
                </div>
                <div className="text-[10px] text-emerald-700">Claim Code: {settlingBenefit.claimNo}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  How was this claim settled? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleActionType('DEPOSIT_TREASURY')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settleActionType === 'DEPOSIT_TREASURY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">💵 Direct Cash / Bank</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Deposit to Treasury Account</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleActionType('DEDUCT_SUPPLIER_DEBT')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settleActionType === 'DEDUCT_SUPPLIER_DEBT'
                        ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">💳 Offset PO Debt</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Deduct from Supplier PO Debt</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment / Settlement Date *</label>
                <input
                  type="date"
                  required
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {settleActionType === 'DEPOSIT_TREASURY' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deposit To Treasury Account *</label>
                  <select
                    value={settleAccountId}
                    onChange={(e) => setSettleAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {treasuryAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type} - Balance: {formatMMK(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {settleActionType === 'DEDUCT_SUPPLIER_DEBT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target PO to Deduct Debt *</label>
                  {openPOsForSettleSupplier.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
                      No unpaid PO debts found for supplier &quot;{settlingBenefit.supplierName}&quot;. Direct treasury deposit will be used instead.
                    </div>
                  ) : (
                    <select
                      value={settleTargetPoId}
                      onChange={(e) => setSettleTargetPoId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {openPOsForSettleSupplier.map((p) => (
                        <option key={p.id} value={p.id}>
                          PO #{p.invoiceNo} ({p.date}) — Remaining Debt: {formatMMK(getPoRemainingDebt(p))} ({p.itemName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Notes / Ref</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Payment received via KBZPay / Cheque / Bank Ref #"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettlingBenefit(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY PO DEBT SETTLEMENT */}
      {payingPoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayingPoModal(null);
          }}
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Pay Purchase Order Debt</h2>
                  <p className="text-xs text-rose-200">
                    Voucher: #{payingPoModal.invoiceNo} • {payingPoModal.supplierName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingPoModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmPayPo} className="p-6 space-y-4 text-xs text-slate-700">
              {/* PO Info Card */}
              {(() => {
                const totalDebt = getPoRemainingDebt(payingPoModal);
                return (
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Purchased Item:</span>
                      <span className="font-extrabold text-slate-900">{payingPoModal.itemName} ({payingPoModal.quantity} pcs)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-200/60 text-center">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Total PO</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{formatMMK(payingPoModal.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Paid So Far</span>
                        <span className="font-mono font-bold text-emerald-700 text-xs">{formatMMK(payingPoModal.paidAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-600 block">Remaining Debt</span>
                        <span className="font-mono font-black text-rose-700 text-sm">{formatMMK(totalDebt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Amount Input */}
              {(() => {
                const totalDebt = getPoRemainingDebt(payingPoModal);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800">
                        Payment Amount (MMK) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPayingPoAmount(totalDebt)}
                          className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-bold text-[10px] cursor-pointer"
                        >
                          Pay Full ({formatMMK(totalDebt)})
                        </button>
                        {totalDebt > 1000 && (
                          <button
                            type="button"
                            onClick={() => setPayingPoAmount(Math.round(totalDebt / 2))}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                          >
                            50%
                          </button>
                        )}
                      </div>
                    </div>
                    <FormattedNumberInput
                      value={payingPoAmount}
                      onChange={(val) => setPayingPoAmount(Math.min(totalDebt, Math.max(0, val)))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      placeholder="0"
                      min={1}
                      max={totalDebt}
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>Remaining after payment:</span>
                      <span className="font-mono font-bold text-slate-700">
                        {formatMMK(Math.max(0, totalDebt - payingPoAmount))}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Treasury Account Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pay From Treasury Account (Cash Drawer / Bank) *
                </label>
                <select
                  required
                  value={payingPoAccountId}
                  onChange={(e) => setPayingPoAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {treasuryAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: {formatMMK(acc.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payingPoDate}
                    onChange={(e) => setPayingPoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Payment Reference / Notes
                  </label>
                  <input
                    type="text"
                    value={payingPoNotes}
                    onChange={(e) => setPayingPoNotes(e.target.value)}
                    placeholder="e.g. KBZ Bank Transfer Ref # / Cash Paid"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Summary note */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Confirming this payment will immediately deduct cash from the selected account, reduce the PO&apos;s remaining debt, and update the supplier&apos;s ledger.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingPoModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingPoAmount <= 0}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Confirm PO Payment ({formatMMK(payingPoAmount)})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
