import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Building2, 
  Package, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  X, 
  Wallet,
  Landmark,
  ArrowRight,
  Receipt,
  FileText,
  Banknote,
  Smartphone,
  ShieldCheck,
  Check,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Tag,
  Trash2,
  TrendingUp,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { 
  InterBranchTransfer, 
  Branch, 
  InventoryItem, 
  TreasuryAccount, 
  UserAccount,
  hasGlobalBranchAccess
} from '../types';
import { formatMMK, formatNumber, formatDateDMY, getBranchName } from '../utils/formatters';
import { getAvailableStockForBranch } from '../utils/inventoryHelper';

interface BranchTransferViewProps {
  transfers: InterBranchTransfer[];
  branches: Branch[];
  inventory: InventoryItem[];
  treasuryAccounts?: TreasuryAccount[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  onAddTransfer: (
    transfer: Omit<InterBranchTransfer, 'id' | 'transferNo' | 'createdAt'>,
    settleNow: boolean
  ) => void;
  onSettlePayment: (
    transferId: string,
    paymentMethod: string,
    notes?: string,
    accountId?: string,
    extra?: string
  ) => void;
  onUpdateStatus?: (transferId: string, status: 'COMPLETED' | 'IN_TRANSIT' | 'CANCELLED') => void;
}

const BANK_OPTIONS = [
  'KBZPay (KPay)',
  'WavePay',
  'KBZ Bank',
  'CB Bank',
  'CB Pay',
  'AYA Bank',
  'AYA Pay',
  'Yoma Bank / Next',
  'UAB Pay',
  'Other Bank Transfer',
];

interface TransferItemEntry {
  id: string;
  itemId?: string;
  itemName: string;
  category: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  imeiNumbers?: string[];
  imei?: string;
}

export const BranchTransferView: React.FC<BranchTransferViewProps> = ({
  transfers,
  branches,
  inventory,
  currentUser,
  activeBranchFilter,
  onAddTransfer,
  onSettlePayment,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'SETTLED' | 'PENDING' | 'RECEIVABLES_ONLY' | 'PAYABLES_ONLY' | 'WAIVED'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [specialPairFilter, setSpecialPairFilter] = useState<'ALL' | 'NAWADAY_RECEIVABLE' | 'ANAWRAHTA_PAYABLE'>('ALL');

  // Modals
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedTransferForSettle, setSelectedTransferForSettle] = useState<InterBranchTransfer | null>(null);

  // New Transfer Form State
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromBranchId, setFromBranchId] = useState(branches[0]?.id || '');
  const [toBranchId, setToBranchId] = useState(branches[1]?.id || branches[0]?.id || '');
  
  // Multi-item list for transfer
  const [transferItemList, setTransferItemList] = useState<TransferItemEntry[]>([]);

  // Fast Stock Item Picker State for CURRENT item being added
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [category, setCategory] = useState('Smartphones & Tablets');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitValue, setUnitValue] = useState<number>(0);
  const [selectedImeiList, setSelectedImeiList] = useState<string[]>([]);
  const [customImeiText, setCustomImeiText] = useState<string>('');
  const [transferFee, setTransferFee] = useState<number>(0);
  const [settleImmediately, setSettleImmediately] = useState(true);
  
  // Payment selection for new transfer (Cash vs Bank only)
  const [newTransferPayType, setNewTransferPayType] = useState<'CASH' | 'BANK'>('CASH');
  const [newTransferBankType, setNewTransferBankType] = useState<string>('KBZPay (KPay)');
  const [transferNotes, setTransferNotes] = useState('');

  // Settle Modal State (Cash vs Bank only)
  const [settlePayType, setSettlePayType] = useState<'CASH' | 'BANK'>('CASH');
  const [settleBankType, setSettleBankType] = useState<string>('KBZPay (KPay)');
  const [settleNotes, setSettleNotes] = useState('');

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewTransferModalOpen(false);
        setIsSettleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter items in quick picker
  const filteredInventoryForPicker = useMemo(() => {
    if (!itemSearchQuery.trim()) {
      return inventory.slice(0, 15);
    }
    const q = itemSearchQuery.toLowerCase().trim();
    return inventory.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }, [inventory, itemSearchQuery]);

  // Handle selecting an item from the picker
  const handleSelectItemFromPicker = (item: InventoryItem) => {
    setSelectedItem(item);
    setSelectedItemId(item.id);
    setCustomItemName(item.name);
    setCategory(item.category);
    setUnitValue(item.costPrice || item.sellingPrice || 0);
    setQuantity(1);
    const availableImeis = item.imeiList || (item.imeiOrSerial ? [item.imeiOrSerial] : []);
    setSelectedImeiList(availableImeis);
    setCustomImeiText(availableImeis.join(', '));
    setItemSearchQuery('');
  };

  const handleClearSelectedItem = () => {
    setSelectedItem(null);
    setSelectedItemId('');
    setCustomItemName('');
    setUnitValue(0);
    setQuantity(1);
    setSelectedImeiList([]);
    setCustomImeiText('');
  };

  const handleAddItemToTransferList = () => {
    const name = customItemName.trim();
    if (!name) {
      alert('Please select an item or enter an item name');
      return;
    }
    if (quantity <= 0) {
      alert('Please enter a quantity of 1 or more');
      return;
    }

    // Collect IMEIs from selectedImeiList + customImeiText
    let parsedImeis: string[] = [...selectedImeiList];
    if (customImeiText.trim()) {
      const typed = customImeiText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
      typed.forEach(t => {
        if (!parsedImeis.includes(t)) parsedImeis.push(t);
      });
    }

    const newItem: TransferItemEntry = {
      id: `ti-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      itemId: selectedItemId || undefined,
      itemName: name,
      category: category || 'General',
      quantity,
      unitValue,
      totalValue: quantity * unitValue,
      imeiNumbers: parsedImeis.length > 0 ? parsedImeis : undefined,
      imei: parsedImeis.length > 0 ? parsedImeis.join(', ') : undefined,
    };

    setTransferItemList((prev) => [...prev, newItem]);
    handleClearSelectedItem();
  };

  const handleRemoveItemFromTransferList = (id: string) => {
    setTransferItemList((prev) => prev.filter((i) => i.id !== id));
  };

  const fromBranchObj = branches.find((b) => b.id === fromBranchId);
  const toBranchObj = branches.find((b) => b.id === toBranchId);

  // Available stock of selected item at From Branch
  const availableStockAtFromBranch = useMemo(() => {
    if (!selectedItem || !fromBranchId) return 0;
    return getAvailableStockForBranch(selectedItem, fromBranchId);
  }, [selectedItem, fromBranchId]);

  // Total items value in the modal
  const currentPendingItemValue = customItemName.trim() ? (quantity * unitValue) : 0;
  const listItemsValue = transferItemList.reduce((sum, item) => sum + item.totalValue, 0);
  const computedTotalValue = listItemsValue + currentPendingItemValue;
  const computedTotalSettlement = computedTotalValue + transferFee;

  // Dedicated Shop 1 (Receivables) & Shop 2/3 (Payables) pairwise calculations
  const isShop1Branch = (id?: string, name?: string) => {
    return id === 'branch-1' || (name || '').includes('Shop 1') || (name || '').toLowerCase().includes('nawaday');
  };

  const isShop2Or3Branch = (id?: string, name?: string) => {
    return id === 'branch-2' || id === 'branch-3' || (name || '').includes('Shop 2') || (name || '').includes('Shop 3') || (name || '').toLowerCase().includes('anawrahta');
  };

  const nawadayReceivables = useMemo(() => {
    return transfers.filter((t) => {
      const fromIsShop1 = isShop1Branch(t.fromBranchId, t.fromBranchName);
      const toIsShop23 = isShop2Or3Branch(t.toBranchId, t.toBranchName);
      return fromIsShop1 && toIsShop23 && t.paymentStatus === 'PENDING';
    });
  }, [transfers]);

  const nawadayReceivableTotal = nawadayReceivables.reduce((acc, t) => acc + t.totalSettlementAmount, 0);

  const anawrahtaPayables = useMemo(() => {
    return transfers.filter((t) => {
      const toIsShop23 = isShop2Or3Branch(t.toBranchId, t.toBranchName);
      const fromIsShop1 = isShop1Branch(t.fromBranchId, t.fromBranchName);
      return toIsShop23 && fromIsShop1 && t.paymentStatus === 'PENDING';
    });
  }, [transfers]);

  const anawrahtaPayableTotal = anawrahtaPayables.reduce((acc, t) => acc + t.totalSettlementAmount, 0);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Special pairwise filter
      if (specialPairFilter === 'NAWADAY_RECEIVABLE') {
        const fromIsShop1 = isShop1Branch(t.fromBranchId, t.fromBranchName);
        const toIsShop23 = isShop2Or3Branch(t.toBranchId, t.toBranchName);
        if (!(fromIsShop1 && toIsShop23 && t.paymentStatus === 'PENDING')) return false;
      } else if (specialPairFilter === 'ANAWRAHTA_PAYABLE') {
        const toIsShop23 = isShop2Or3Branch(t.toBranchId, t.toBranchName);
        const fromIsShop1 = isShop1Branch(t.fromBranchId, t.fromBranchName);
        if (!(toIsShop23 && fromIsShop1 && t.paymentStatus === 'PENDING')) return false;
      }

      // Branch filter
      if (activeBranchFilter !== 'ALL') {
        const matchesFrom = t.fromBranchId === activeBranchFilter;
        const matchesTo = t.toBranchId === activeBranchFilter;
        if (!matchesFrom && !matchesTo) return false;

        if (directionFilter === 'IN' && !matchesTo) return false;
        if (directionFilter === 'OUT' && !matchesFrom) return false;
      }

      // Payment Status & Receivables/Payables filters
      if (paymentStatusFilter === 'PENDING' && t.paymentStatus !== 'PENDING') {
        return false;
      }
      if (paymentStatusFilter === 'SETTLED' && t.paymentStatus !== 'SETTLED') {
        return false;
      }
      if (paymentStatusFilter === 'WAIVED' && t.paymentStatus !== 'WAIVED') {
        return false;
      }
      if (paymentStatusFilter === 'RECEIVABLES_ONLY') {
        // Must be pending and either active branch is fromBranch or viewing all receivables
        if (t.paymentStatus !== 'PENDING') return false;
        if (activeBranchFilter !== 'ALL' && t.fromBranchId !== activeBranchFilter) return false;
      }
      if (paymentStatusFilter === 'PAYABLES_ONLY') {
        // Must be pending and either active branch is toBranch or viewing all payables
        if (t.paymentStatus !== 'PENDING') return false;
        if (activeBranchFilter !== 'ALL' && t.toBranchId !== activeBranchFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = t.transferNo.toLowerCase().includes(q);
        const matchItem = t.itemName.toLowerCase().includes(q);
        const matchFrom = t.fromBranchName.toLowerCase().includes(q);
        const matchTo = t.toBranchName.toLowerCase().includes(q);
        const matchMethod = (t.paymentMethod || '').toLowerCase().includes(q);
        const matchSubItems = t.items?.some((it) => it.itemName.toLowerCase().includes(q)) || false;
        return matchNo || matchItem || matchFrom || matchTo || matchMethod || matchSubItems;
      }

      return true;
    });
  }, [transfers, activeBranchFilter, directionFilter, paymentStatusFilter, searchQuery, specialPairFilter]);

  // Metrics
  const summary = useMemo(() => {
    let totalCount = filteredTransfers.length;
    let totalSettled = 0;
    let totalPending = 0;
    let pendingCount = 0;
    let settledCount = 0;

    filteredTransfers.forEach((t) => {
      if (t.paymentStatus === 'SETTLED') {
        totalSettled += t.totalSettlementAmount;
        settledCount++;
      } else if (t.paymentStatus === 'PENDING') {
        totalPending += t.totalSettlementAmount;
        pendingCount++;
      }
    });

    return {
      totalCount,
      totalSettled,
      totalPending,
      pendingCount,
      settledCount,
    };
  }, [filteredTransfers]);

  // Open New Transfer Modal
  const openNewTransferModal = () => {
    setTransferDate(new Date().toISOString().split('T')[0]);
    const defaultFrom = !hasGlobalBranchAccess(currentUser)
      ? (currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || ''))
      : (activeBranchFilter !== 'ALL' ? activeBranchFilter : (branches[0]?.id || ''));

    setFromBranchId(defaultFrom);
    const other = branches.find((b) => b.id !== defaultFrom);
    setToBranchId(other?.id || branches[1]?.id || branches[0]?.id || '');
    setTransferItemList([]);
    handleClearSelectedItem();
    setTransferFee(0);
    setSettleImmediately(true);
    setNewTransferPayType('CASH');
    setNewTransferBankType('KBZPay (KPay)');
    setTransferNotes('');
    setIsNewTransferModalOpen(true);
  };

  // Submit New Transfer
  const handleSubmitNewTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromBranchId || !toBranchId) {
      alert('Please select both dispatch and destination branches');
      return;
    }

    if (fromBranchId === toBranchId) {
      alert('Dispatch branch and destination branch cannot be the same');
      return;
    }

    // Consolidate items: transferItemList + current form item if typed
    let finalItems: TransferItemEntry[] = [...transferItemList];
    if (customItemName.trim()) {
      let parsedImeis: string[] = [...selectedImeiList];
      if (customImeiText.trim()) {
        const typed = customImeiText.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
        typed.forEach(t => {
          if (!parsedImeis.includes(t)) parsedImeis.push(t);
        });
      }
      finalItems.push({
        id: `ti-${Date.now()}`,
        itemId: selectedItemId || undefined,
        itemName: customItemName.trim(),
        category: category || 'General',
        quantity,
        unitValue,
        totalValue: quantity * unitValue,
        imeiNumbers: parsedImeis.length > 0 ? parsedImeis : undefined,
        imei: parsedImeis.length > 0 ? parsedImeis.join(', ') : undefined,
      });
    }

    if (finalItems.length === 0) {
      alert('Please add at least 1 item');
      return;
    }

    const fromBranch = branches.find((b) => b.id === fromBranchId);
    const toBranch = branches.find((b) => b.id === toBranchId);

    const chosenPaymentMethod = settleImmediately
      ? (newTransferPayType === 'CASH' ? 'Cash' : newTransferBankType)
      : undefined;

    const totalQty = finalItems.reduce((acc, i) => acc + i.quantity, 0);
    const totalItemsVal = finalItems.reduce((acc, i) => acc + i.totalValue, 0);
    const summaryItemName = finalItems.length === 1 
      ? finalItems[0].itemName 
      : `${finalItems[0].itemName} + ${finalItems.length - 1} other items`;

    const allImeis = finalItems.flatMap(fi => fi.imeiNumbers || []).filter(Boolean);

    onAddTransfer(
      {
        date: transferDate,
        fromBranchId,
        fromBranchName: fromBranch?.name || fromBranchId,
        toBranchId,
        toBranchName: toBranch?.name || toBranchId,
        itemId: finalItems[0].itemId || undefined,
        itemName: summaryItemName,
        category: finalItems[0].category || 'General',
        quantity: totalQty,
        unitValue: finalItems.length === 1 ? finalItems[0].unitValue : (totalItemsVal / (totalQty || 1)),
        totalValue: totalItemsVal,
        transferFee,
        totalSettlementAmount: totalItemsVal + transferFee,
        paymentStatus: settleImmediately ? 'SETTLED' : 'PENDING',
        paymentMethod: chosenPaymentMethod,
        paymentType: settleImmediately ? newTransferPayType : undefined,
        bankType: settleImmediately && newTransferPayType === 'BANK' ? newTransferBankType : undefined,
        imeiNumbers: allImeis.length > 0 ? allImeis : undefined,
        items: finalItems.map((fi) => ({
          itemId: fi.itemId,
          itemName: fi.itemName,
          category: fi.category,
          quantity: fi.quantity,
          unitValue: fi.unitValue,
          totalValue: fi.totalValue,
          imeiNumbers: fi.imeiNumbers,
          imei: fi.imei,
        })),
        notes: transferNotes.trim() || undefined,
        status: 'COMPLETED',
        recordedBy: currentUser.displayName,
      },
      settleImmediately
    );

    setIsNewTransferModalOpen(false);
    handleClearSelectedItem();
    setTransferItemList([]);
  };

  // Submit Settlement
  const handleSubmitSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferForSettle) return;

    const chosenMethod = settlePayType === 'CASH' ? 'Cash' : settleBankType;

    onSettlePayment(
      selectedTransferForSettle.id,
      chosenMethod,
      settleNotes.trim()
    );

    setIsSettleModalOpen(false);
    setSelectedTransferForSettle(null);
    setSettleNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Branch Transfers & Settlements</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Multi-item inter-branch transfers, receivables/payables tracking, and payment settlements
          </p>
        </div>

        <button
          onClick={openNewTransferModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Transfer / Settlement</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Transfers</span>
            <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatNumber(summary.totalCount)} <span className="text-xs font-medium text-slate-500">times</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Settled: {summary.settledCount} | Pending: {summary.pendingCount}
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Total Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
            {formatMMK(summary.totalSettled)}
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">
            Completed payment transfers
          </div>
        </div>

        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Total Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
            {formatMMK(summary.totalPending)}
          </div>
          <div className="text-xs text-amber-700 mt-1 font-medium">
            Pending amount owed by receiving branches
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transfer vouchers, items, branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setPaymentStatusFilter('ALL');
                setSpecialPairFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                paymentStatusFilter === 'ALL' && specialPairFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({transfers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentStatusFilter('PENDING');
                setSpecialPairFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                paymentStatusFilter === 'PENDING' && specialPairFilter === 'ALL'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentStatusFilter('RECEIVABLES_ONLY');
                setSpecialPairFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                paymentStatusFilter === 'RECEIVABLES_ONLY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              📥 Receivables
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentStatusFilter('PAYABLES_ONLY');
                setSpecialPairFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                paymentStatusFilter === 'PAYABLES_ONLY'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              📤 Payables
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentStatusFilter('SETTLED');
                setSpecialPairFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                paymentStatusFilter === 'SETTLED' && specialPairFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="px-4 py-3.5 whitespace-nowrap">Date & Transfer #</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Branch Flow & Payment</th>
                <th className="px-4 py-3.5">Items List</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">Quantity</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Items Value</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Delivery Fee</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Total Amount</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">Status (Due / Paid)</th>
                <th className="px-4 py-3.5 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <span>No branch transfer records found</span>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((item) => {
                  const isSpecificBranch = activeBranchFilter !== 'ALL';
                  const isFromCurrent = activeBranchFilter === item.fromBranchId;
                  const isToCurrent = activeBranchFilter === item.toBranchId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-indigo-700 font-mono">{item.transferNo}</div>
                        <div className="text-[11px] text-slate-400">{formatDateDMY(item.date)}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              From: {getBranchName(item.fromBranchId, branches, item.fromBranchName)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              To: {getBranchName(item.toBranchId, branches, item.toBranchName)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 flex items-center gap-1 font-medium">
                            <span className="text-indigo-700 font-bold">💳 Payer: {getBranchName(item.toBranchId, branches, item.toBranchName)}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="text-emerald-700 font-bold">Receiver: {getBranchName(item.fromBranchId, branches, item.fromBranchName)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        {item.items && item.items.length > 0 && (
                          <div className="space-y-0.5 mt-1">
                            {item.items.map((sub, idx) => (
                              <div key={idx} className="text-[11px] text-slate-600 flex items-center gap-1">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span className="font-medium">{sub.itemName}</span>
                                <span className="text-slate-400">({sub.quantity} pcs @ {formatMMK(sub.unitValue)})</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5">
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-700 font-mono">
                        {formatMMK(item.totalValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-500 font-mono">
                        {item.transferFee > 0 ? formatMMK(item.transferFee) : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-black text-indigo-700 text-sm font-mono">
                          {formatMMK(item.totalSettlementAmount)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {item.paymentStatus === 'SETTLED' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {isSpecificBranch ? (
                                isFromCurrent ? 'Received' : 'Paid'
                              ) : (
                                'Settled'
                              )}
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {item.paymentMethod || 'Cash / Bank'}
                            </div>
                          </div>
                        ) : item.paymentStatus === 'PENDING' ? (
                          <div className="space-y-1">
                            {isSpecificBranch ? (
                              isFromCurrent ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                                    <span>📥 Receivable</span>
                                  </span>
                                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                    from {item.toBranchName}
                                  </div>
                                </div>
                              ) : isToCurrent ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-xs">
                                    <span>📤 Payable</span>
                                  </span>
                                  <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                    to {item.fromBranchName}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                                <div className="text-[10px] space-y-0.5">
                                  <div className="text-emerald-700 font-bold">
                                    📥 {item.fromBranchName}: Receivable
                                  </div>
                                  <div className="text-rose-700 font-bold">
                                    📤 {item.toBranchName}: Payable
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            <span>Exempt</span>
                          </span>
                        )}
                      </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {item.paymentStatus === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedTransferForSettle(item);
                            setSettlePayType('CASH');
                            setSettleBankType('KBZPay (KPay)');
                            setSettleNotes('');
                            setIsSettleModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Settle Now</span>
                        </button>
                      ) : (
                        <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.paymentMethod || 'Cash / Bank'}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NEW INTER-BRANCH TRANSFER WITH MULTI-ITEM SUPPORT (ADD ITEM) */}
      {/* ========================================================================= */}
      {isNewTransferModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewTransferModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
            {/* Sticky Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-amber-400 text-base flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>Inter-Branch Transfer & Settlement (Multi-Item)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select items from inventory and click Add Item to transfer multiple products at once
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTransferModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitNewTransfer} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transfer Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Branches Selection */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                        <span>📤 From Branch *</span>
                      </label>
                      <select
                        required
                        value={fromBranchId}
                        onChange={(e) => setFromBranchId(e.target.value)}
                        disabled={!hasGlobalBranchAccess(currentUser)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                      {!hasGlobalBranchAccess(currentUser) && (
                        <p className="text-[10px] text-slate-500 mt-1 font-medium">
                          * Dispatching from your assigned branch
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                        <span>📥 To Branch *</span>
                      </label>
                      <select
                        required
                        value={toBranchId}
                        onChange={(e) => setToBranchId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      >
                        <option value="">Select Branch</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Payment Role Explanation Banner */}
                  {fromBranchObj && toBranchObj && fromBranchId !== toBranchId && (
                    <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-200/80 text-[11px] text-indigo-950 flex items-start gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-indigo-800">Settlement Direction: </span>
                        Receiving branch <span className="font-bold text-emerald-800">[{toBranchObj.name}]</span> owes and will pay to dispatching branch <span className="font-bold text-rose-800">[{fromBranchObj.name}]</span>.
                      </div>
                    </div>
                  )}
                </div>

                {/* ADDED ITEMS LIST TABLE (IF ANY) */}
                {transferItemList.length > 0 && (
                  <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-indigo-950">
                      <span>Added Items ({transferItemList.length} items)</span>
                      <span className="font-mono text-indigo-800">{formatMMK(listItemsValue)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {transferItemList.map((it, idx) => (
                        <div key={it.id} className="p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900">{idx + 1}. {it.itemName}</span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              {it.quantity} pcs × {formatMMK(it.unitValue)} = <strong className="text-slate-800 font-mono">{formatMMK(it.totalValue)}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromTransferList(it.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FAST ITEM PICKER & ADD ITEM SECTION */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <span>Select Item from Inventory / Add Manually</span>
                    </label>
                    {selectedItem && (
                      <button
                        type="button"
                        onClick={handleClearSelectedItem}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Change Item
                      </button>
                    )}
                  </div>

                  {/* If item is selected, show preview */}
                  {selectedItem ? (
                    <div className="p-3 bg-emerald-50/80 border-2 border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{selectedItem.name}</div>
                        <div className="text-[10px] text-slate-500">{selectedItem.category} • Cost / Value: {formatMMK(unitValue)}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-bold text-[10px]">
                        Available at Dispatch Branch: {formatNumber(availableStockAtFromBranch)} pcs
                      </span>
                    </div>
                  ) : (
                    /* Searchable item picker list */
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={itemSearchQuery}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                          placeholder="Search product from inventory (e.g., iPhone, Laptop, Case...)"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      {filteredInventoryForPicker.length > 0 && (
                        <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                          {filteredInventoryForPicker.map((inv) => {
                            const stockInFromBranch = getAvailableStockForBranch(inv, fromBranchId);
                            return (
                              <button
                                key={inv.id}
                                type="button"
                                onClick={() => handleSelectItemFromPicker(inv)}
                                className="w-full p-2 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 truncate">
                                    {inv.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {inv.category} • {formatMMK(inv.costPrice || inv.sellingPrice || 0)}
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  stockInFromBranch > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  Stock: {stockInFromBranch}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Item Name & Price inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                        placeholder="Select or enter item name"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Accessories"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Quantity and Unit Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quantity (Qty) *
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 border-r-0 rounded-l-xl font-bold text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-2 bg-white border-y border-slate-200 text-center text-xs font-bold text-slate-900 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 border-l-0 rounded-r-xl font-bold text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Unit Value (MMK) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={unitValue}
                        onChange={(e) => setUnitValue(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                      />
                    </div>
                  </div>

                  {/* IMEI / SERIAL NUMBER SELECTION FOR MODELS */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                    <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>IMEI / Serial Number (Model Tracking)</span>
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100 px-1.5 py-0.5 rounded">
                        Optional / Model with IMEI
                      </span>
                    </label>

                    {/* Stock IMEIs list if selectedItem has IMEI numbers */}
                    {(() => {
                      const itemImeis = selectedItem ? (selectedItem.imeiNumbers || selectedItem.imeiList || selectedItem.serialNumbers || []) : [];
                      if (!selectedItem || itemImeis.length === 0) return null;
                      return (
                        <div className="p-2 bg-white rounded-lg border border-indigo-200 space-y-1">
                          <div className="text-[10px] font-bold text-slate-600">
                            Select from Stock IMEIs ({itemImeis.length} available):
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5">
                            {itemImeis.map((im) => {
                            const isSelected = selectedImeiList.includes(im);
                            return (
                              <button
                                key={im}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedImeiList((prev) => prev.filter((x) => x !== im));
                                  } else {
                                    setSelectedImeiList((prev) => [...prev, im]);
                                    if (selectedImeiList.length + 1 > quantity) {
                                      setQuantity(selectedImeiList.length + 1);
                                    }
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                {isSelected ? '✓ ' : ''}{im}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ); })()}

                    <input
                      type="text"
                      value={customImeiText}
                      onChange={(e) => setCustomImeiText(e.target.value)}
                      placeholder="Type or scan IMEI number(s) e.g., 354892019283011, 354892019283022"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  {/* ADD ITEM BUTTON */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddItemToTransferList}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Item to List</span>
                    </button>
                  </div>
                </div>

                {/* Delivery fee & Grand Total Settlement */}
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total Items Value ({transferItemList.length + (customItemName.trim() ? 1 : 0)} items):</span>
                    <span className="font-bold text-slate-900 font-mono">{formatMMK(computedTotalValue)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <label htmlFor="deliveryFeeInput" className="font-medium">Delivery / Transport Fee (MMK):</label>
                    <input
                      id="deliveryFeeInput"
                      type="number"
                      min={0}
                      value={transferFee}
                      onChange={(e) => setTransferFee(Math.max(0, Number(e.target.value)))}
                      className="w-32 px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-right font-mono focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-indigo-200/80 pt-2 flex items-center justify-between text-sm">
                    <span className="font-black text-indigo-950">Total Settlement Amount:</span>
                    <span className="font-black text-indigo-700 text-base font-mono">{formatMMK(computedTotalSettlement)}</span>
                  </div>
                </div>

                {/* Payment Settlement Section (Simple Cash / Bank Only) */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="settleImmediately"
                      checked={settleImmediately}
                      onChange={(e) => setSettleImmediately(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <label htmlFor="settleImmediately" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Settle payment immediately (Settle Now)
                    </label>
                  </div>

                  {settleImmediately && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Payment Method (Cash or Bank) *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewTransferPayType('CASH')}
                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                              newTransferPayType === 'CASH'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Banknote className="w-4 h-4" />
                            <span>Cash</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewTransferPayType('BANK')}
                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                              newTransferPayType === 'BANK'
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Landmark className="w-4 h-4" />
                            <span>Bank / KPay</span>
                          </button>
                        </div>
                      </div>

                      {newTransferPayType === 'BANK' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Select Bank / Digital Wallet *
                          </label>
                          <select
                            value={newTransferBankType}
                            onChange={(e) => setNewTransferBankType(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          >
                            {BANK_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g. Sent via highway bus line, transfer receipt paid"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewTransferModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Save Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SETTLE PAYMENT MODAL (SIMPLE CASH OR BANK) */}
      {/* ========================================================================= */}
      {isSettleModalOpen && selectedTransferForSettle && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSettleModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-auto flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div>
                <h3 className="font-black text-amber-400 text-base">
                  Settle Inter-Branch Payment
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedTransferForSettle.transferNo}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSettle} className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payer Branch:</span>
                  <span className="font-bold text-emerald-800">{selectedTransferForSettle.toBranchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Receiver Branch:</span>
                  <span className="font-bold text-rose-800">{selectedTransferForSettle.fromBranchName}</span>
                </div>
                <div className="border-t border-indigo-200 pt-1.5 flex justify-between text-sm">
                  <span className="font-black text-indigo-950">Total Settlement Due:</span>
                  <span className="font-black text-indigo-700 font-mono">{formatMMK(selectedTransferForSettle.totalSettlementAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlePayType('CASH')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                      settlePayType === 'CASH'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlePayType('BANK')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                      settlePayType === 'BANK'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Bank / KPay</span>
                  </button>
                </div>
              </div>

              {settlePayType === 'BANK' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Bank / Digital Wallet *
                  </label>
                  <select
                    value={settleBankType}
                    onChange={(e) => setSettleBankType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {BANK_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Notes / Receipt Ref
                </label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. Paid via KPay transaction #..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
