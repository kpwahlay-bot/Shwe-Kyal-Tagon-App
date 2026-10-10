import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowLeftRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRight,
  ClipboardCheck, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Tag, 
  Layers, 
  X,
  History,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Check,
  Upload,
  Smartphone,
  FileText,
  RotateCcw,
  Download,
  FileJson
} from 'lucide-react';
import { 
  InventoryItem, 
  InventoryCategory, 
  Branch, 
  StockMovement, 
  UserAccount, 
  StockCheckRecord, 
  ActivityLogEntry, 
  PurchaseRecord, 
  InterBranchTransfer, 
  TreasuryAccount, 
  SupplierReturn, 
  SupplierBenefit, 
  ContactPartner, 
  hasGlobalBranchAccess, 
  canUserDelete, 
  canUserManageInventory,
  isMDUser
} from '../types';
import { formatMMK, formatNumber, exportInventoryToCSV, formatDateDMY } from '../utils/formatters';
import { 
  generateAutoSKU, 
  generateBrandAutoSKU,
  getBrandSKUPrefix,
  PRIMARY_SHOP_BRANDS,
  getAllBrandSKUConfigs,
  getBrandSKUConfigsByCategory,
  BrandSKUConfig,
  CATEGORY_SKU_CONFIGS, 
  getCategorySKUConfig, 
  PRIMARY_INVENTORY_CATEGORIES, 
  findDuplicateProductGroups, 
  consolidateDuplicateProducts, 
  findMatchingProductByDescriptionOrName, 
  detectBrandFromName 
} from '../utils/skuGenerator';
import { GroundStockAudit } from './GroundStockAudit';
import { BranchTransferView } from './BranchTransferView';
import { SupplierClaimsAndBenefitsLedger } from './SupplierClaimsAndBenefitsLedger';
import { StockItemTimelineModal } from './StockItemTimelineModal';
import { FormattedNumberInput } from './FormattedNumberInput';
import { CsvInventoryImportModal } from './CsvInventoryImportModal';
import { SkuStandardManagerModal } from './SkuStandardManagerModal';
import { 
  getAvailableStockForBranch, 
  isSharedStockPool, 
  isSystem2Branch, 
  isShop1Branch, 
  syncBranchStocks, 
  calculateTotalPhysicalStock, 
  normalizeInventoryItem,
  isNoWarrantyItem,
  resolveItemWarranty,
  SHOP_1_BRANCH_ID,
  SYSTEM_2_BRANCH_ID
} from '../utils/inventoryHelper';
import { SKTG_BRANCHES } from '../data/shweKyalTagonStaffData';

interface DuplicateChoiceData {
  matchedItem: InventoryItem;
  pendingItem: {
    sku: string;
    name: string;
    category: InventoryCategory;
    brand: string;
    model: string;
    imeiOrSerial?: string;
    imeiList?: string[];
    costPrice: number;
    sellingPrice: number;
    minStockAlert: number;
    warranty: string;
    supplier: string;
    branchStock: { [branchId: string]: number };
    totalStock: number;
    notes?: string;
  };
  isFromMovement?: boolean;
  movementDetails?: {
    toBranchId: string;
    quantity: number;
    unitCost: number;
    sellingPrice: number;
    supplier: string;
    notes: string;
  };
}

interface InventoryManagementProps {
  inventory?: InventoryItem[];
  branches?: Branch[];
  movements?: StockMovement[];
  purchases?: PurchaseRecord[];
  transfers?: InterBranchTransfer[];
  treasuryAccounts?: TreasuryAccount[];
  suppliers?: ContactPartner[];
  supplierBenefits?: SupplierBenefit[];
  supplierReturns?: SupplierReturn[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  initialTab?: 'catalog' | 'branch_transfer' | 'ground_audit' | 'movements' | 'low_stock_fifo' | 'rma';
  onNavigateToPurchases?: () => void;
  onNavigateToBranchTransfer?: () => void;
  onBulkReplaceInventory?: (items: InventoryItem[]) => void;
  onClearAllStock?: () => void;
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onRecordMovement?: (movement: StockMovement) => void;
  onLogActivity?: (log: Partial<ActivityLogEntry>) => void;
  onAddTransfer?: (transfer: Omit<InterBranchTransfer, 'id' | 'transferNo' | 'createdAt'>, settleNow: boolean) => void;
  onSettlePayment?: (transferId: string, paymentMethod: string, notes?: string, accountId?: string) => void;
  onAddSupplierReturn?: (ret: SupplierReturn) => void;
  onDeleteSupplierReturn?: (id: string, restoreStock?: boolean) => void;
  onClearAllSupplierReturns?: () => void;
  onSettleRma?: (
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
  onAddSupplier?: (supplier: ContactPartner) => void;
  onUpdateSupplier?: (supplier: ContactPartner) => void;
  onDeleteSupplier?: (id: string) => void;
  onAddSupplierBenefit?: (benefit: SupplierBenefit) => void;
  onUpdateSupplierBenefit?: (benefit: SupplierBenefit) => void;
  onDeleteSupplierBenefit?: (id: string) => void;
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
  onPayPurchaseDebt?: (
    purchaseId: string,
    paymentAmount: number,
    accountId: string,
    notes?: string
  ) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory = [],
  branches = [],
  movements = [],
  purchases = [],
  transfers = [],
  treasuryAccounts = [],
  suppliers = [],
  supplierBenefits = [],
  supplierReturns = [],
  currentUser,
  activeBranchFilter,
  initialTab,
  onNavigateToPurchases,
  onNavigateToBranchTransfer,
  onBulkReplaceInventory,
  onClearAllStock,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onRecordMovement,
  onLogActivity,
  onAddTransfer,
  onSettlePayment,
  onAddSupplierReturn,
  onDeleteSupplierReturn,
  onClearAllSupplierReturns,
  onSettleRma,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddSupplierBenefit,
  onUpdateSupplierBenefit,
  onDeleteSupplierBenefit,
  onSettleSupplierBenefit,
  onPayPurchaseDebt,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'branch_transfer' | 'ground_audit' | 'movements' | 'low_stock_fifo' | 'rma'>(initialTab || 'catalog');
  const [selectedItemForTimeline, setSelectedItemForTimeline] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchFilter);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'OLD_STOCK' | 'LOW_STOCK' | 'IN_STOCK'>('ALL');
  const [agingThresholdDays, setAgingThresholdDays] = useState<number>(60);
  const [isDeduplicationModalOpen, setIsDeduplicationModalOpen] = useState(false);
  const [dedupSuccessMsg, setDedupSuccessMsg] = useState<string | null>(null);

  // Duplicate Resolution Prompt Modal State
  const [duplicateChoiceData, setDuplicateChoiceData] = useState<DuplicateChoiceData | null>(null);
  const [isDuplicateChoiceModalOpen, setIsDuplicateChoiceModalOpen] = useState(false);
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState(false);

  // PO Item Lookup to link Supplier and Warranty seamlessly from POs
  const poItemLookup = useMemo(() => {
    const map = new Map<string, { supplierName?: string; warranty?: string }>();
    if (purchases && purchases.length > 0) {
      purchases.forEach((p) => {
        if (p.itemName) {
          map.set(p.itemName.trim().toLowerCase(), {
            supplierName: p.supplierName,
            warranty: p.warranty,
          });
        }
        if (p.sku) {
          map.set(p.sku.trim().toLowerCase(), {
            supplierName: p.supplierName,
            warranty: p.warranty,
          });
        }
      });
    }
    return map;
  }, [purchases]);

  const isMDOrAdmin = isMDUser(currentUser) || currentUser.role === 'Admin';
  const isManager = currentUser.role === 'Sales Manager';
  // RBAC: Stock In/Out, Adjust, Edit & Catalog updates restricted strictly to Managers/MD/Admin
  const canManageStock = canUserManageInventory(currentUser);
  const canDeleteProduct = canUserDelete(currentUser);

  const handleWipeAllStockAction = () => {
    if (onClearAllStock) {
      onClearAllStock();
      return;
    }
    if (window.confirm('🚨 Delete All Stock Items?\n\nAre you sure you want to permanently delete ALL current inventory stock items?\n\n• Current stock quantities, IMEIs, and serial numbers will be cleared so you can re-enter new stock.\n• Stock ID prefix rules (Samsung = SS0001, iPhone = IP0001, etc.) remain intact for new stock.\n• Action cannot be undone!')) {
      if (onBulkReplaceInventory) {
        onBulkReplaceInventory([]);
      }
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setSelectedBranchId(activeBranchFilter);
  }, [activeBranchFilter]);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'STOCK_IN' | 'STOCK_OUT'>('STOCK_IN');
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsItemModalOpen(false);
        setIsMovementModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Effective branches fallback to ensure stock allocation and quantity inputs are always available
  const effectiveBranches: Branch[] = useMemo(() => {
    if (branches && branches.length > 0) return branches;
    return SKTG_BRANCHES;
  }, [branches]);

  // Item Form state
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('Smartphones & Tablets');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState(3);
  const [warranty, setWarranty] = useState('1 Year Official Warranty');
  const [supplier, setSupplier] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(1);
  const [targetStockBranchId, setTargetStockBranchId] = useState<string>(
    selectedBranchId !== 'ALL' ? selectedBranchId : (branches[0]?.id || 'branch-1')
  );
  const [notes, setNotes] = useState('');
  const [isSkuStandardModalOpen, setIsSkuStandardModalOpen] = useState(false);
  const [skuCategoryFilter, setSkuCategoryFilter] = useState<string>('Smartphones & Tablets');
  const [allBrandConfigs, setAllBrandConfigs] = useState<BrandSKUConfig[]>(() => getAllBrandSKUConfigs());

  useEffect(() => {
    const handleUpdate = () => {
      setAllBrandConfigs(getAllBrandSKUConfigs());
    };
    window.addEventListener('sktg_sku_standards_updated', handleUpdate);
    return () => window.removeEventListener('sktg_sku_standards_updated', handleUpdate);
  }, []);

  // Live detection of existing matching item in modal
  const liveMatchInModal = useMemo(() => {
    if (!name.trim() || editingItem) return null;
    return findMatchingProductByDescriptionOrName(name, model, brand, inventory, editingItem?.id);
  }, [name, model, brand, inventory, editingItem]);

  // Movement Form state (Stock In, Stock Out, Transfer)
  const [movQty, setMovQty] = useState(1);
  const [movImeis, setMovImeis] = useState<string[]>(['']);
  const [itemImeis, setItemImeis] = useState<string[]>([]);
  const [movFromBranch, setMovFromBranch] = useState(branches[0]?.id || 'branch-1');
  const [movToBranch, setMovToBranch] = useState(branches[1]?.id || 'branch-2');
  const [movNotes, setMovNotes] = useState('');
  const [movParty, setMovParty] = useState('');
  const [movUnitCost, setMovUnitCost] = useState(0);
  const [movSellingPrice, setMovSellingPrice] = useState(0);
  const [movSku, setMovSku] = useState('');
  const [movItemName, setMovItemName] = useState('');
  const [movCategory, setMovCategory] = useState<InventoryCategory>('Accessories & Gadgets');
  const [movBrand, setMovBrand] = useState('');
  const [movModel, setMovModel] = useState('');
  const [movOutReason, setMovOutReason] = useState('Damaged / Defective');

  // Bulk Paste IMEI / Serial Modal state
  const [bulkPasteModal, setBulkPasteModal] = useState<{
    isOpen: boolean;
    target: 'movement' | 'item';
    text: string;
  }>({ isOpen: false, target: 'movement', text: '' });

  // Handle Dynamic Movement Quantity change and adjust IMEI slots accordingly
  const handleMovQtyChange = (newQty: number) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setMovQty(qty);
    setMovImeis((prev) => {
      const next = [...prev];
      if (next.length < qty) {
        while (next.length < qty) next.push('');
      } else if (next.length > qty) {
        return next.slice(0, qty);
      }
      return next;
    });
  };

  const handleMovImeiChange = (index: number, val: string) => {
    setMovImeis((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleApplyBulkPaste = () => {
    const rawLines = bulkPasteModal.text
      .split(/[\r\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (bulkPasteModal.target === 'movement') {
      if (rawLines.length > 0) {
        const targetCount = Math.max(movQty, rawLines.length);
        setMovQty(targetCount);
        setMovImeis(() => {
          const next: string[] = [];
          for (let i = 0; i < targetCount; i++) {
            next.push(rawLines[i] || '');
          }
          return next;
        });
      }
    } else {
      if (bulkPasteModal.target === 'item') {
        setItemImeis(rawLines);
        setImeiOrSerial(rawLines.join(', '));
        if (initialQuantity < rawLines.length) {
          setInitialQuantity(rawLines.length);
        }
      }
    }
    setBulkPasteModal({ isOpen: false, target: 'movement', text: '' });
  };

  // Helper to open Movement modal
  const openMovementModal = (type: 'STOCK_IN' | 'STOCK_OUT', item?: InventoryItem) => {
    const targetItem = item || (inventory.length > 0 ? inventory[0] : null);
    setMovementType(type);
    setSelectedItemForMovement(targetItem);
    setMovQty(1);
    setMovImeis(['']);
    setMovNotes('');
    setMovParty(targetItem?.supplier || '');
    setMovUnitCost(targetItem?.costPrice || 0);
    setMovSellingPrice(targetItem?.sellingPrice || 0);
    setMovSku(targetItem?.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`);
    setMovItemName(targetItem?.name || '');
    setMovCategory(targetItem?.category || 'Accessories & Gadgets');
    setMovBrand(targetItem?.brand || '');
    setMovModel(targetItem?.model || '');

    if (selectedBranchId !== 'ALL') {
      if (type === 'STOCK_IN') {
        setMovToBranch(selectedBranchId);
        setMovFromBranch(branches[0]?.id || 'branch-1');
      } else {
        setMovFromBranch(selectedBranchId);
        setMovToBranch(branches[0]?.id || 'branch-1');
      }
    } else {
      setMovFromBranch(branches[0]?.id || 'branch-1');
      setMovToBranch(branches[0]?.id || 'branch-1');
    }

    setIsMovementModalOpen(true);
  };

  // Quick Stock Adjustment & Replenish State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustBranchQtys, setAdjustBranchQtys] = useState<{ [branchId: string]: number }>({});
  const [adjustReason, setAdjustReason] = useState('Routine Stock Audit & Restock');

  // Open Quick Stock Adjust Modal
  const openAdjustStockModal = (item?: InventoryItem) => {
    const targetItem = item || (inventory.length > 0 ? inventory[0] : null);
    if (!targetItem) return;
    setSelectedItemForAdjust(targetItem);
    const qtys: { [bId: string]: number } = {};
    branches.forEach((b) => {
      qtys[b.id] = targetItem.branchStock ? (targetItem.branchStock[b.id] || 0) : 0;
    });
    setAdjustBranchQtys(qtys);
    setAdjustReason('Routine Stock Audit & Restock');
    setIsAdjustModalOpen(true);
  };

  // Submit Quick Stock Adjustment
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    let total = 0;
    const finalBranchStock: { [branchId: string]: number } = {};
    const today = new Date().toISOString().split('T')[0];

    branches.forEach((b) => {
      const newQ = Math.max(0, Number(adjustBranchQtys[b.id]) || 0);
      const prevQ = selectedItemForAdjust.branchStock ? (selectedItemForAdjust.branchStock[b.id] || 0) : 0;
      finalBranchStock[b.id] = newQ;
      total += newQ;

      // If quantity changed, automatically record a movement for audit history
      const diff = newQ - prevQ;
      if (diff !== 0 && onRecordMovement) {
        onRecordMovement({
          id: `mov-adj-${Date.now()}-${b.id}`,
          date: today,
          itemId: selectedItemForAdjust.id,
          itemName: selectedItemForAdjust.name,
          itemCategory: selectedItemForAdjust.category,
          type: diff > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: Math.abs(diff),
          fromBranchId: diff < 0 ? b.id : undefined,
          fromBranchName: diff < 0 ? b.name : undefined,
          toBranchId: diff > 0 ? b.id : undefined,
          toBranchName: diff > 0 ? b.name : undefined,
          performedBy: currentUser.displayName,
          notes: `${adjustReason} [${b.code}]: ${diff > 0 ? '+' : ''}${diff} Units`,
          unitCost: selectedItemForAdjust.costPrice,
          sku: selectedItemForAdjust.sku,
          createdAt: new Date().toISOString(),
        });
      }
    });

    onUpdateItem({
      ...selectedItemForAdjust,
      branchStock: finalBranchStock,
      totalStock: total,
      lastRestockedDate: today,
    });

    setIsAdjustModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsItemModalOpen(false);
        setIsMovementModalOpen(false);
        setIsAdjustModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Add Modal
  const openAddItemModal = (presetBrand?: string | any) => {
    const validPreset = typeof presetBrand === 'string' ? presetBrand : undefined;
    const defaultCat: InventoryCategory = (selectedCategory !== 'ALL' ? selectedCategory : 'Smartphones & Tablets') as InventoryCategory;
    const catConfigs = getBrandSKUConfigsByCategory(defaultCat);
    const defaultBrand = validPreset || (catConfigs[0]?.brand || (defaultCat === 'Accessories & Gadgets' ? 'Accessories' : defaultCat === 'Laptops & Computers' ? 'Laptops' : defaultCat === 'Service Spare Part' ? 'Spare Part' : defaultCat === 'Service Charges' ? 'Service' : 'Samsung'));
    const autoSku = generateAutoSKU(defaultCat, inventory, [], defaultBrand);
    setEditingItem(null);
    setSku(autoSku);
    setName('');
    setCategory(defaultCat);
    setSkuCategoryFilter(defaultCat);
    setBrand(defaultBrand);
    setModel('');
    setImeiOrSerial('');
    setItemImeis([]);
    setCostPrice(0);
    setSellingPrice(0);
    setMinStockAlert(3);
    const initialWarranty = resolveItemWarranty(autoSku, defaultBrand, defaultCat, '', '', '1 Year Official Warranty');
    setWarranty(initialWarranty);
    setSupplier('');
    setInitialQuantity(1);
    const targetBranch = selectedBranchId !== 'ALL' ? selectedBranchId : (branches[0]?.id || 'branch-1');
    setTargetStockBranchId(targetBranch);
    setNotes('');
    setIsItemModalOpen(true);
  };

  // Open Edit Modal
  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setSku(item.sku);
    setName(item.name);
    setCategory(item.category);
    setSkuCategoryFilter(item.category);
    setBrand(item.brand);
    setModel(item.model || '');
    setImeiOrSerial(item.imeiOrSerial || '');
    const currentImeis = item.imeiList && item.imeiList.length > 0 
      ? [...item.imeiList] 
      : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean) : []);
    setItemImeis(currentImeis);
    setCostPrice(item.costPrice);
    setSellingPrice(item.sellingPrice);
    setMinStockAlert(item.minStockAlert);
    setWarranty(resolveItemWarranty(item.sku, item.brand, item.category, item.name, item.warranty));
    setSupplier(item.supplier || '');
    const targetBranch = selectedBranchId !== 'ALL' ? selectedBranchId : (branches[0]?.id || 'branch-1');
    setTargetStockBranchId(targetBranch);
    const bStock = item.branchStock || {};
    const branchQty = bStock[targetBranch] !== undefined ? bStock[targetBranch] : (item.totalStock || 0);
    setInitialQuantity(branchQty);
    setNotes(item.notes || '');
    setIsItemModalOpen(true);
  };

  // Resolution Handler: Save with Existing Code (Merge Stock)
  const handleResolveWithExistingCode = () => {
    if (!duplicateChoiceData) return;
    const master = duplicateChoiceData.matchedItem;
    const today = new Date().toISOString().split('T')[0];

    if (duplicateChoiceData.isFromMovement && duplicateChoiceData.movementDetails) {
      const m = duplicateChoiceData.movementDetails;
      const curBranchStock = { ...(master.branchStock || {}) };
      curBranchStock[m.toBranchId] = (curBranchStock[m.toBranchId] || 0) + Number(m.quantity);
      const newTotal = branches.reduce((acc, b) => acc + (Number(curBranchStock[b.id]) || 0), 0);

      onUpdateItem({
        ...master,
        costPrice: m.unitCost > 0 ? m.unitCost : master.costPrice,
        sellingPrice: m.sellingPrice > 0 ? m.sellingPrice : master.sellingPrice,
        supplier: m.supplier || master.supplier,
        branchStock: curBranchStock,
        totalStock: newTotal,
        lastRestockedDate: today,
      });

      if (onRecordMovement) {
        onRecordMovement({
          id: `mov-${Date.now()}`,
          date: today,
          itemId: master.id,
          itemName: master.name,
          itemCategory: master.category,
          type: 'STOCK_IN',
          quantity: Number(m.quantity),
          toBranchId: m.toBranchId,
          toBranchName: branches.find((b) => b.id === m.toBranchId)?.name,
          performedBy: currentUser.displayName,
          notes: m.notes || `Stock In merged to existing Code ${master.sku}`,
          supplierOrCustomer: m.supplier,
          unitCost: m.unitCost > 0 ? m.unitCost : master.costPrice,
          sku: master.sku,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      const existingBranchStock = master.branchStock || {};
      const addBranchStock = duplicateChoiceData.pendingItem.branchStock || {};
      const combinedBranchStock: { [branchId: string]: number } = { ...existingBranchStock };
      
      branches.forEach((b) => {
        combinedBranchStock[b.id] = (combinedBranchStock[b.id] || 0) + (addBranchStock[b.id] || 0);
      });
      
      const newTotal = Object.values(combinedBranchStock).reduce((sum, q) => sum + (Number(q) || 0), 0);

      onUpdateItem({
        ...master,
        branchStock: combinedBranchStock,
        totalStock: newTotal,
        costPrice: duplicateChoiceData.pendingItem.costPrice > 0 ? duplicateChoiceData.pendingItem.costPrice : master.costPrice,
        sellingPrice: duplicateChoiceData.pendingItem.sellingPrice > 0 ? duplicateChoiceData.pendingItem.sellingPrice : master.sellingPrice,
        supplier: duplicateChoiceData.pendingItem.supplier || master.supplier,
        lastRestockedDate: today,
      });

      if (onLogActivity) {
        onLogActivity({
          module: 'INVENTORY',
          action: 'UPDATE',
          title: 'Product Stock Merged to Existing Code',
          description: `Merged stock of "${duplicateChoiceData.pendingItem.name}" into existing Code ${master.sku} (+${duplicateChoiceData.pendingItem.totalStock} Units, New Total: ${newTotal})`,
          details: { sku: master.sku, addedQty: duplicateChoiceData.pendingItem.totalStock, newTotal }
        });
      }
    }

    setIsDuplicateChoiceModalOpen(false);
    setIsItemModalOpen(false);
    setIsMovementModalOpen(false);
    setDedupSuccessMsg(`Successfully merged stock into existing SKU (${master.sku}).`);
    setTimeout(() => setDedupSuccessMsg(null), 4000);
  };

  // Resolution Handler: Save with New Code (Separate SKU)
  const handleResolveWithNewCode = () => {
    if (!duplicateChoiceData) return;
    const today = new Date().toISOString().split('T')[0];

    if (duplicateChoiceData.isFromMovement && duplicateChoiceData.movementDetails) {
      const m = duplicateChoiceData.movementDetails;
      const p = duplicateChoiceData.pendingItem;
      const initBranchStock: { [branchId: string]: number } = {};
      branches.forEach((b) => {
        initBranchStock[b.id] = b.id === m.toBranchId ? Number(m.quantity) : 0;
      });

      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand || 'General',
        model: p.model || '',
        costPrice: Number(m.unitCost || 0),
        sellingPrice: Number(m.sellingPrice || 0),
        minStockAlert: 3,
        warranty: '1 Year Official Warranty',
        supplier: m.supplier,
        branchStock: initBranchStock,
        totalStock: Number(m.quantity),
        lastRestockedDate: today,
        notes: m.notes,
      };
      onAddItem(newItem);

      if (onRecordMovement) {
        onRecordMovement({
          id: `mov-${Date.now()}`,
          date: today,
          itemId: newItem.id,
          itemName: newItem.name,
          itemCategory: newItem.category,
          type: 'STOCK_IN',
          quantity: Number(m.quantity),
          toBranchId: m.toBranchId,
          toBranchName: branches.find((b) => b.id === m.toBranchId)?.name,
          performedBy: currentUser.displayName,
          notes: m.notes || `Created separate SKU ${newItem.sku}`,
          supplierOrCustomer: m.supplier,
          unitCost: Number(m.unitCost || 0),
          sku: newItem.sku,
          createdAt: new Date().toISOString(),
        });
      }
    } else {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        ...duplicateChoiceData.pendingItem,
        lastRestockedDate: today,
      };
      onAddItem(newItem);

      if (onLogActivity) {
        onLogActivity({
          module: 'INVENTORY',
          action: 'CREATE',
          title: 'New SKU Created Separately',
          description: `Created new distinct SKU ${newItem.sku} for "${newItem.name}"`,
          details: { sku: newItem.sku, totalStock: newItem.totalStock }
        });
      }
    }

    setIsDuplicateChoiceModalOpen(false);
    setIsItemModalOpen(false);
    setIsMovementModalOpen(false);
    setDedupSuccessMsg(`Successfully saved as separate new SKU (${duplicateChoiceData.pendingItem.sku}).`);
    setTimeout(() => setDedupSuccessMsg(null), 4000);
  };

  // Submit Item
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    let total = 0;
    const finalBranchStock: { [branchId: string]: number } = {};
    const targetBId = targetStockBranchId || (effectiveBranches[0]?.id || 'branch-1');
    const targetQty = Number(initialQuantity) || 0;

    if (editingItem && editingItem.branchStock) {
      effectiveBranches.forEach((b) => {
        if (b.id === targetBId) {
          finalBranchStock[b.id] = targetQty;
        } else {
          finalBranchStock[b.id] = editingItem.branchStock ? (editingItem.branchStock[b.id] || 0) : 0;
        }
      });
    } else {
      effectiveBranches.forEach((b) => {
        finalBranchStock[b.id] = b.id === targetBId ? targetQty : 0;
      });
    }
    total = Object.values(finalBranchStock).reduce((sum, q) => sum + (Number(q) || 0), 0);

    const validItemImeis = itemImeis.map((s) => s.trim()).filter(Boolean);
    const finalSerialStr = validItemImeis.length > 0 ? validItemImeis.join(', ') : imeiOrSerial.trim();
    const finalWarranty = resolveItemWarranty(sku, brand, category, name, warranty);

    // Duplicate IMEI validation against other existing items in stock
    if (validItemImeis.length > 0) {
      const duplicateImeiInStock = validItemImeis.find((im) => {
        const lower = im.toLowerCase();
        return inventory.some((existing) => {
          if (editingItem && existing.id === editingItem.id) return false;
          if (existing.imeiOrSerial && existing.imeiOrSerial.toLowerCase().includes(lower)) return true;
          if (existing.imeiList && existing.imeiList.some((existingIm) => existingIm.toLowerCase() === lower)) return true;
          if (existing.imeiNumbers && existing.imeiNumbers.some((existingIm) => existingIm.toLowerCase() === lower)) return true;
          if (existing.serialNumbers && existing.serialNumbers.some((existingIm) => existingIm.toLowerCase() === lower)) return true;
          return false;
        });
      });

      if (duplicateImeiInStock) {
        alert(`⚠️ သတိပြုရန်: IMEI/Serial "${duplicateImeiInStock}" သည် အခြားပစ္စည်းစာရင်းတွင် ရှိပြီးသားဖြစ်နေပါသည်။ (Duplicate IMEI not allowed in stock)`);
        return;
      }
    }

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        sku,
        name,
        category,
        brand,
        model,
        imeiOrSerial: validItemImeis.length > 0 ? validItemImeis.join(', ') : (imeiOrSerial.trim() || undefined),
        imeiList: validItemImeis.length > 0 ? validItemImeis : undefined,
        serialNumbers: validItemImeis.length > 0 ? validItemImeis : undefined,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        minStockAlert: Number(minStockAlert),
        warranty: finalWarranty,
        supplier,
        branchStock: finalBranchStock,
        totalStock: total,
        notes,
      });
      setIsItemModalOpen(false);
    } else {
      // Check for duplicate matching product by name / model / description
      const duplicateMatch = findMatchingProductByDescriptionOrName(name, model, brand, inventory);

      if (duplicateMatch && duplicateMatch.matchedItem.sku !== sku.trim()) {
        // Open the choice confirmation box as requested by user
        setDuplicateChoiceData({
          matchedItem: duplicateMatch.matchedItem,
          pendingItem: {
            sku: sku.trim(),
            name: name.trim(),
            category,
            brand: brand.trim(),
            model: model.trim(),
            imeiOrSerial: finalSerialStr,
            imeiList: validItemImeis.length > 0 ? validItemImeis : undefined,
            costPrice: Number(costPrice),
            sellingPrice: Number(sellingPrice),
            minStockAlert: Number(minStockAlert),
            warranty: finalWarranty,
            supplier,
            branchStock: finalBranchStock,
            totalStock: total,
            notes,
          },
          isFromMovement: false,
        });
        setIsDuplicateChoiceModalOpen(true);
        return;
      }

      // If SKU matches existing product exactly, merge into that existing product directly
      const exactSkuItem = inventory.find((i) => i.sku.trim().toLowerCase() === sku.trim().toLowerCase());
      if (exactSkuItem) {
        const combinedStock: { [branchId: string]: number } = { ...(exactSkuItem.branchStock || {}) };
        branches.forEach((b) => {
          combinedStock[b.id] = (combinedStock[b.id] || 0) + (finalBranchStock[b.id] || 0);
        });
        const newTotal = Object.values(combinedStock).reduce((sum, q) => sum + (Number(q) || 0), 0);
        const mergedImeis = Array.from(new Set([...(exactSkuItem.imeiList || []), ...validItemImeis]));

        onUpdateItem({
          ...exactSkuItem,
          branchStock: combinedStock,
          totalStock: newTotal,
          imeiList: mergedImeis.length > 0 ? mergedImeis : undefined,
          imeiOrSerial: mergedImeis.length > 0 ? mergedImeis.join(', ') : exactSkuItem.imeiOrSerial,
          costPrice: Number(costPrice) > 0 ? Number(costPrice) : exactSkuItem.costPrice,
          sellingPrice: Number(sellingPrice) > 0 ? Number(sellingPrice) : exactSkuItem.sellingPrice,
          lastRestockedDate: new Date().toISOString().split('T')[0],
        });

        if (onLogActivity) {
          onLogActivity({
            module: 'INVENTORY',
            action: 'UPDATE',
            title: 'Product Stock Merged to Existing Code',
            description: `Merged stock of "${name}" into existing Code ${exactSkuItem.sku} (+${total} Units, New Total: ${newTotal})`,
            details: { sku: exactSkuItem.sku, addedQty: total, newTotal },
          });
        }
        setIsItemModalOpen(false);
        setDedupSuccessMsg(`Successfully merged stock into existing SKU (${exactSkuItem.sku}).`);
        setTimeout(() => setDedupSuccessMsg(null), 4000);
        return;
      }

      const newItem: InventoryItem = {
        id: `inv-${Date.now()}`,
        sku: sku.trim(),
        name: name.trim(),
        category,
        brand: brand.trim(),
        model: model.trim(),
        imeiOrSerial: finalSerialStr,
        imeiList: validItemImeis.length > 0 ? validItemImeis : undefined,
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        minStockAlert: Number(minStockAlert),
        warranty: finalWarranty,
        supplier,
        branchStock: finalBranchStock,
        totalStock: total,
        lastRestockedDate: new Date().toISOString().split('T')[0],
        notes,
      };
      onAddItem(newItem);
      setIsItemModalOpen(false);
    }
  };

  // Submit Movement (Stock In, Stock Out, Transfer)
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (movQty <= 0) return;

    const fromB = branches.find((b) => b.id === movFromBranch);
    const toB = branches.find((b) => b.id === movToBranch);
    const today = new Date().toISOString().split('T')[0];
    const validMovImeis = movImeis.map((s) => s.trim()).filter(Boolean);

    if (movementType === 'STOCK_IN') {
      // Find matching item by selection or entered SKU
      const existing = inventory.find(
        (i) => (selectedItemForMovement && i.id === selectedItemForMovement.id) || 
               (movSku && i.sku.trim().toLowerCase() === movSku.trim().toLowerCase())
      );

      // If no exact match by ID or SKU, check if custom entered name/model matches an existing item with different SKU
      if (!existing && movItemName) {
        const nameMatch = findMatchingProductByDescriptionOrName(movItemName, movModel, movBrand, inventory);
        if (nameMatch && nameMatch.matchedItem.sku !== movSku) {
          // Open duplicate choice dialog for stock-in
          setDuplicateChoiceData({
            matchedItem: nameMatch.matchedItem,
            pendingItem: {
              sku: movSku || generateAutoSKU(movCategory, inventory),
              name: movItemName,
              category: movCategory,
              brand: movBrand || 'General',
              model: movModel || '',
              costPrice: Number(movUnitCost || 0),
              sellingPrice: Number(movSellingPrice || 0),
              minStockAlert: 3,
              warranty: '1 Year Official Warranty',
              supplier: movParty,
              branchStock: { [movToBranch]: Number(movQty) },
              totalStock: Number(movQty),
              imeiList: validMovImeis.length > 0 ? validMovImeis : undefined,
              imeiOrSerial: validMovImeis.length > 0 ? validMovImeis.join(', ') : undefined,
              notes: movNotes,
            },
            isFromMovement: true,
            movementDetails: {
              toBranchId: movToBranch,
              quantity: Number(movQty),
              unitCost: Number(movUnitCost || 0),
              sellingPrice: Number(movSellingPrice || 0),
              supplier: movParty,
              notes: movNotes,
            }
          });
          setIsDuplicateChoiceModalOpen(true);
          return;
        }
      }

      let targetItemId = existing ? existing.id : `inv-${Date.now()}`;
      let targetItemName = existing ? existing.name : (movItemName || `Product (${movSku})`);
      let targetItemCategory = existing ? existing.category : movCategory;
      let targetSku = existing ? existing.sku : (movSku || `SKU-${Date.now()}`);

      if (existing) {
        const curBranchStock = { ...(existing.branchStock || {}) };
        const newBranchQty = (curBranchStock[movToBranch] || 0) + Number(movQty);
        curBranchStock[movToBranch] = newBranchQty;
        
        let newTotal = 0;
        branches.forEach((b) => {
          newTotal += Number(curBranchStock[b.id] || 0);
        });

        const mergedImeis = Array.from(new Set([...(existing.imeiList || []), ...validMovImeis]));
        const combinedSerial = mergedImeis.length > 0 ? mergedImeis.join(', ') : existing.imeiOrSerial;

        onUpdateItem({
          ...existing,
          costPrice: movUnitCost > 0 ? movUnitCost : existing.costPrice,
          sellingPrice: movSellingPrice > 0 ? movSellingPrice : existing.sellingPrice,
          supplier: movParty || existing.supplier,
          branchStock: curBranchStock,
          totalStock: newTotal,
          imeiList: mergedImeis.length > 0 ? mergedImeis : undefined,
          imeiOrSerial: combinedSerial,
          lastRestockedDate: today,
        });
      } else {
        const initBranchStock: { [branchId: string]: number } = {};
        branches.forEach((b) => {
          initBranchStock[b.id] = b.id === movToBranch ? Number(movQty) : 0;
        });

        const newItem: InventoryItem = {
          id: targetItemId,
          sku: targetSku,
          name: targetItemName,
          category: movCategory,
          brand: movBrand || 'General',
          model: movModel || '',
          costPrice: Number(movUnitCost || 0),
          sellingPrice: Number(movSellingPrice || 0),
          minStockAlert: 3,
          warranty: '1 Year Official Warranty',
          supplier: movParty,
          branchStock: initBranchStock,
          totalStock: Number(movQty),
          imeiList: validMovImeis.length > 0 ? validMovImeis : undefined,
          imeiOrSerial: validMovImeis.length > 0 ? validMovImeis.join(', ') : undefined,
          lastRestockedDate: today,
          notes: movNotes,
        };
        onAddItem(newItem);
      }

      // Record Movement
      if (onRecordMovement) {
        onRecordMovement({
          id: `mov-${Date.now()}`,
          date: today,
          itemId: targetItemId,
          itemName: targetItemName,
          itemCategory: targetItemCategory,
          type: 'STOCK_IN',
          quantity: Number(movQty),
          toBranchId: movToBranch,
          toBranchName: toB?.name,
          performedBy: currentUser.displayName,
          notes: movNotes || `Inbound Purchase / Restock from ${movParty || 'Supplier'}`,
          supplierOrCustomer: movParty,
          unitCost: movUnitCost > 0 ? movUnitCost : (existing?.costPrice || 0),
          sku: targetSku,
          createdAt: new Date().toISOString(),
        });
      }

      setIsMovementModalOpen(false);
      return;
    }

    if (!selectedItemForMovement) return;

    // Validate Stock Out limit
    if (movementType === 'STOCK_OUT') {
      const available = selectedItemForMovement.branchStock ? (selectedItemForMovement.branchStock[movFromBranch] || 0) : 0;
      if (movQty > available) {
        alert(`Selected branch (${fromB?.name || 'Branch'}) has only ${available} units available in stock. Cannot withdraw ${movQty} units.`);
        return;
      }

      const updatedBranchStock = { ...(selectedItemForMovement.branchStock || {}) };
      updatedBranchStock[movFromBranch] = Math.max(0, (updatedBranchStock[movFromBranch] || 0) - Number(movQty));
      
      let updatedTotal = 0;
      branches.forEach((b) => {
        updatedTotal += Number(updatedBranchStock[b.id] || 0);
      });

      onUpdateItem({
        ...selectedItemForMovement,
        branchStock: updatedBranchStock,
        totalStock: updatedTotal,
      });
    }

    const fullNotes = movementType === 'STOCK_OUT' 
      ? `[${movOutReason}] ${movNotes}`.trim()
      : movNotes;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      date: today,
      itemId: selectedItemForMovement.id,
      itemName: selectedItemForMovement.name,
      itemCategory: selectedItemForMovement.category,
      type: movementType,
      quantity: Number(movQty),
      fromBranchId: movFromBranch,
      fromBranchName: fromB?.name,
      performedBy: currentUser.displayName,
      notes: fullNotes,
      supplierOrCustomer: movParty,
      unitCost: movUnitCost > 0 ? movUnitCost : selectedItemForMovement.costPrice,
      sku: selectedItemForMovement.sku,
      createdAt: new Date().toISOString(),
    };

    if (onRecordMovement) {
      onRecordMovement(movement);
    }
    setIsMovementModalOpen(false);
  };

  // Helper to compute aging days for inventory item
  const getItemAgingDays = (item: InventoryItem): number => {
    const dateStr = item.lastRestockedDate || (item.batches && item.batches[0]?.purchaseDate) || '2025-12-01';
    const itemTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((now - itemTime) / (1000 * 60 * 60 * 24)));
  };

  const selectedBranchObj = branches.find(b => b.id === selectedBranchId);

  // Aggregate stats based on active branch selection
  const isSingleBranch = selectedBranchId !== 'ALL' && !!selectedBranchObj;

  // Category-specific inventory subset for stats, KPI cards and brand filters
  const categoryInventory = useMemo(() => {
    if (selectedCategory === 'ALL') return inventory;
    return inventory.filter((i) => i.category === selectedCategory);
  }, [inventory, selectedCategory]);

  // Scoped inventory subset (filtered by selectedCategory and selectedBrand) for dynamic KPIs & stats
  const scopedInventory = useMemo(() => {
    let list = inventory;
    if (selectedCategory !== 'ALL') {
      list = list.filter((i) => i.category === selectedCategory);
    }
    if (selectedBrand !== 'ALL') {
      const targetBrand = selectedBrand.trim().toLowerCase();
      list = list.filter((i) => (i.brand || '').trim().toLowerCase() === targetBrand);
    }
    return list;
  }, [inventory, selectedCategory, selectedBrand]);

  // Brand stock breakdown for the active category (or all)
  const brandStockSummary = useMemo(() => {
    const map = new Map<string, { brand: string; units: number; skus: number }>();
    categoryInventory.forEach((item) => {
      const b = (item.brand || 'Unbranded').trim();
      const current = map.get(b) || { brand: b, units: 0, skus: 0 };
      const qty = isSingleBranch
        ? (item.branchStock ? (item.branchStock[selectedBranchId] || 0) : 0)
        : (item.totalStock || 0);
      current.units += qty;
      current.skus += 1;
      map.set(b, current);
    });
    return Array.from(map.values()).sort((a, b) => b.units - a.units || a.brand.localeCompare(b.brand));
  }, [categoryInventory, isSingleBranch, selectedBranchId]);

  // Filter Inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL' || item.category === selectedCategory;

    const matchesBrand =
      selectedBrand === 'ALL' || (item.brand && item.brand.toLowerCase() === selectedBrand.toLowerCase());

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.imeiOrSerial && item.imeiOrSerial.toLowerCase().includes(searchQuery.toLowerCase()));

    const qty = isSingleBranch
      ? getAvailableStockForBranch(item, selectedBranchId)
      : (item.totalStock || 0);

    const agingDays = getItemAgingDays(item);
    const isOld = qty > 0 && agingDays >= agingThresholdDays;
    const isLow = qty <= item.minStockAlert;

    let matchesStockFilter = true;
    if (stockFilter === 'OLD_STOCK') {
      matchesStockFilter = isOld;
    } else if (stockFilter === 'LOW_STOCK') {
      matchesStockFilter = isLow;
    } else if (stockFilter === 'IN_STOCK') {
      matchesStockFilter = qty > 0;
    }

    return matchesCategory && matchesBrand && matchesSearch && matchesStockFilter;
  });

  const oldStockItems = useMemo(() => {
    return scopedInventory.filter((i) => {
      const qty = isSingleBranch
        ? getAvailableStockForBranch(i, selectedBranchId)
        : (i.totalStock || 0);
      return qty > 0 && getItemAgingDays(i) >= agingThresholdDays;
    });
  }, [scopedInventory, isSingleBranch, selectedBranchId, agingThresholdDays]);

  const totalStockUnits = useMemo(() => {
    return scopedInventory.reduce((acc, i) => {
      if (isSingleBranch) {
        return acc + getAvailableStockForBranch(i, selectedBranchId);
      }
      return acc + (i.totalStock || 0);
    }, 0);
  }, [scopedInventory, isSingleBranch, selectedBranchId]);

  const totalCostValuation = useMemo(() => {
    return scopedInventory.reduce((acc, i) => {
      const qty = isSingleBranch
        ? getAvailableStockForBranch(i, selectedBranchId)
        : (i.totalStock || 0);
      return acc + (qty * (i.costPrice || 0));
    }, 0);
  }, [scopedInventory, isSingleBranch, selectedBranchId]);
  
  const lowStockItems = useMemo(() => {
    return scopedInventory.filter((i) => {
      const qty = isSingleBranch
        ? getAvailableStockForBranch(i, selectedBranchId)
        : (i.totalStock || 0);
      return qty <= i.minStockAlert;
    });
  }, [scopedInventory, isSingleBranch, selectedBranchId]);

  const categoriesList: InventoryCategory[] = [
    'Smartphones & Tablets',
    'Laptops & Computers',
    'Accessories & Gadgets',
    'Service Spare Part',
    'Service Charges',
  ];

  const brandsList = useMemo(() => {
    const set = new Set<string>();
    categoryInventory.forEach((i) => {
      if (i.brand && i.brand.trim()) {
        set.add(i.brand.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categoryInventory]);

  // Duplicate Product Detection
  const duplicateGroups = findDuplicateProductGroups(inventory);

  const handleConsolidateDuplicates = () => {
    if (duplicateGroups.length === 0) {
      alert('No duplicate product names found in the inventory.');
      return;
    }
    const consolidated = consolidateDuplicateProducts(inventory);
    if (onBulkReplaceInventory) {
      onBulkReplaceInventory(consolidated);
    } else {
      consolidated.forEach((it) => onUpdateItem(it));
    }
    setDedupSuccessMsg(`Successfully unified ${duplicateGroups.length} product groups into canonical Master SKUs & combined branch stocks.`);
    setIsDeduplicationModalOpen(false);
    setTimeout(() => setDedupSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Inventory & Stock Management</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              {isSingleBranch ? `${selectedBranchObj?.code}: ${totalStockUnits} Units` : `${totalStockUnits} Total Units`}
              {selectedCategory !== 'ALL' && ` (${selectedCategory}${selectedBrand !== 'ALL' ? ` - ${selectedBrand}` : ''})`}
              {selectedCategory === 'ALL' && selectedBrand !== 'ALL' && ` (${selectedBrand})`}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage branch-specific stock, purchasing costs, retail pricing, margins, FIFO replenishment & unified product codes
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canManageStock && duplicateGroups.length > 0 && (
            <button
              onClick={() => setIsDeduplicationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer animate-pulse"
              title="Unify same-name products into single Master Code / SKU"
            >
              <Tag className="w-4 h-4" />
              <span>Unify {duplicateGroups.length} Duplicate SKUs</span>
            </button>
          )}

          <button
            onClick={() =>
              exportInventoryToCSV(
                filteredInventory,
                isSingleBranch
                  ? `Shwe_Kyal_Tagon_Inventory_${selectedBranchObj?.code}.csv`
                  : 'Shwe_Kyal_Tagon_Inventory_All_Branches.csv',
                isSingleBranch ? selectedBranchObj : undefined
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* iStock & Excel CSV Import Button */}
          {canManageStock && (
            <button
              onClick={() => setIsCsvImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Import product catalog & opening stock from iStock or Excel (.csv)"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Import CSV</span>
            </button>
          )}

          {canManageStock ? (
            <>

              {/* Stock In Button */}
              <button
                onClick={() => openMovementModal('STOCK_IN')}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Stock Inbound from Supplier (FIFO In)"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>+ Stock In</span>
              </button>

              {/* Stock Out Button */}
              <button
                onClick={() => openMovementModal('STOCK_OUT')}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Stock Outbound / Damage / Display"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                <span>- Stock Out</span>
              </button>

              {/* Quick Stock Replenish / Adjustment Button */}
              <button
                onClick={() => openAdjustStockModal()}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Direct Stock Audit & Level Adjust"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Stock Restock</span>
              </button>

              {/* Code Standards Management Button */}
              <button
                onClick={() => setIsSkuStandardModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Configure Brand & SKU Code Standards by Category"
              >
                <Tag className="w-4 h-4 text-purple-600" />
                <span>Code Standards</span>
              </button>

              {/* Delete All Stock Button (MD/Admin Full Permission) */}
              {canDeleteProduct && (
                <button
                  type="button"
                  onClick={handleWipeAllStockAction}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Wipe all inventory stock products while preserving Stock ID rules for new entries"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete All Stock</span>
                </button>
              )}

              {/* Add Product Button */}
              <button
                onClick={openAddItemModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Product</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Staff View (Stock Modifications Restricted to Manager)</span>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Banner for Deduplication */}
      {dedupSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dedupSuccessMsg}</span>
          </div>
          <button onClick={() => setDedupSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Duplicate Product Warning Banner */}
      {duplicateGroups.length > 0 && activeTab === 'catalog' && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start gap-2.5 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Duplicate Product Names Detected in Catalog</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Found {duplicateGroups.length} product name group(s) with conflicting codes. You can unify them into single Master SKUs with combined branch stock.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDeduplicationModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer shadow-xs transition"
          >
            Review & Auto-Unify SKUs
          </button>
        </div>
      )}



      {/* Sub navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab('branch_transfer')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'branch_transfer'
              ? 'border-purple-600 text-purple-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-purple-600" />
          <span>Inter-Branch Stock Transfer</span>
          {transfers && transfers.filter((t) => t.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {transfers.filter((t) => t.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('low_stock_fifo')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'low_stock_fifo'
              ? 'border-rose-600 text-rose-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          <span>Low Stock & FIFO Restock</span>
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black">
              {lowStockItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ground_audit')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'ground_audit'
              ? 'border-purple-600 text-purple-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-purple-600" />
          <span>Ground Stock Audit & Discrepancies</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Movement Logs ({movements.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('rma')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
            activeTab === 'rma'
              ? 'border-purple-600 text-purple-700 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-purple-600" />
          <span>Supplier Defect Return / RMA</span>
          {supplierReturns && supplierReturns.filter((r) => r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {supplierReturns.filter((r) => r.status === 'PENDING' || r.status === 'PENDING_REPLACEMENT').length}
            </span>
          )}
        </button>
      </div>

      {/* Supplier Defect Return / RMA Tab */}
      {activeTab === 'rma' && (
        <div className="space-y-4">
          <SupplierClaimsAndBenefitsLedger
            mode="rma_only"
            initialSubTab="rma"
            suppliers={suppliers}
            supplierBenefits={supplierBenefits}
            supplierReturns={supplierReturns}
            purchases={purchases}
            treasuryAccounts={treasuryAccounts}
            branches={branches}
            inventory={inventory}
            currentUser={currentUser}
            onAddSupplier={onAddSupplier || (() => {})}
            onUpdateSupplier={onUpdateSupplier || (() => {})}
            onDeleteSupplier={onDeleteSupplier || (() => {})}
            onAddSupplierBenefit={onAddSupplierBenefit || (() => {})}
            onUpdateSupplierBenefit={onUpdateSupplierBenefit}
            onDeleteSupplierBenefit={onDeleteSupplierBenefit || (() => {})}
            onSettleSupplierBenefit={onSettleSupplierBenefit}
            onAddSupplierReturn={onAddSupplierReturn || (() => {})}
            onDeleteSupplierReturn={onDeleteSupplierReturn}
            onClearAllSupplierReturns={onClearAllSupplierReturns}
            onSettleRma={onSettleRma || (() => {})}
            onPayPurchaseDebt={onPayPurchaseDebt}
          />
        </div>
      )}

      {/* Inter-Branch Stock Transfer Tab */}
      {activeTab === 'branch_transfer' && (
        <div className="space-y-4">
          <BranchTransferView
            transfers={transfers}
            branches={branches}
            inventory={inventory}
            treasuryAccounts={treasuryAccounts}
            currentUser={currentUser}
            activeBranchFilter={activeBranchFilter}
            onAddTransfer={onAddTransfer || (() => {})}
            onSettlePayment={onSettlePayment || (() => {})}
          />
        </div>
      )}

      {/* Product Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, SKU, brand, model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 shadow-2xs"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedBrand('ALL');
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Brand Filter */}
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
                title="Filter by Brand"
              >
                <option value="ALL">All Brands</option>
                {brandStockSummary.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brand}
                  </option>
                ))}
              </select>

              {/* Stock Status & Old Stock Filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className={`px-3 py-1.5 border rounded-lg text-xs font-bold focus:outline-hidden shadow-2xs cursor-pointer transition-colors ${
                  stockFilter === 'OLD_STOCK'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : stockFilter === 'LOW_STOCK'
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
                title="Filter by Stock Lifecycle: Normal, Old Stock (>60 Days), or Low Stock"
              >
                <option value="ALL">All Stock Status</option>
                <option value="OLD_STOCK">⏳ Old Stock (60+ Days - {oldStockItems.length})</option>
                <option value="LOW_STOCK">⚠️ Low Stock (&lt; Buffer - {lowStockItems.length})</option>
                <option value="IN_STOCK">✅ In Stock Available</option>
              </select>

              {/* Branch Filter: Enterprise Access for all employees */}
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
                title="Enterprise Branch Selector"
              >
                <option value="ALL">All Branches (Global Stock)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
              <span>Showing {filteredInventory.length} of {inventory.length} items</span>
              {isSingleBranch && (
                <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Filtering: {selectedBranchObj?.name}
                </span>
              )}
            </div>
          </div>

          {/* Brand Quick Filter Pills Bar */}
          {brandStockSummary.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <span className="text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                <span>Brand:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedBrand('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedBrand === 'ALL'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Brands
              </button>
              {brandStockSummary.map((b) => {
                const isSelected = selectedBrand.toLowerCase() === b.brand.toLowerCase();
                return (
                  <button
                    key={b.brand}
                    type="button"
                    onClick={() => setSelectedBrand(isSelected ? 'ALL' : b.brand)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    {b.brand}
                  </button>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1250px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4 w-12 text-center">NO.</th>
                  <th className="py-3 px-4 min-w-[200px]">ITEM / SKU</th>
                  <th className="py-3 px-4 min-w-[130px]">CATEGORY</th>
                  {isMDOrAdmin && (
                    <th className="py-3 px-4 min-w-[110px] text-right bg-amber-50/40 text-amber-900">
                      BUYING COST
                    </th>
                  )}
                  <th className="py-3 px-4 min-w-[110px] text-right bg-blue-50/40 text-blue-900">
                    SELLING PRICE
                  </th>
                  <th className="py-3 px-4 min-w-[120px] text-center bg-purple-50/40 text-purple-900 font-black">
                    {isSingleBranch ? `${selectedBranchObj?.code} IN-STOCK` : 'TOTAL COMBINED STOCK'}
                  </th>
                  <th className="py-3 px-4 min-w-[160px]">
                    {isSingleBranch ? 'BRANCH / LOCATION' : 'BRANCH BREAKDOWN (ALL 4 STORES)'}
                  </th>
                  <th className="py-3 px-4 min-w-[160px] text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item, index) => {
                  const unitProfit = item.sellingPrice - item.costPrice;
                  const markupPercent =
                    item.costPrice > 0 ? ((unitProfit / item.costPrice) * 100).toFixed(1) : 0;
                  
                  const branchStockQty = isSingleBranch
                    ? getAvailableStockForBranch(item, selectedBranchId)
                    : item.totalStock;

                  const isLow = branchStockQty <= item.minStockAlert;

                  const poInfo = poItemLookup.get(item.name.trim().toLowerCase()) || (item.sku ? poItemLookup.get(item.sku.trim().toLowerCase()) : undefined);
                  const displaySupplier = item.supplier || poInfo?.supplierName;
                  const isAccessories = item.category === 'Accessories & Gadgets';
                  const isNoWarranty = isNoWarrantyItem(item.sku, item.brand, item.category, item.name);
                  const rawWarranty = (item.warranty || poInfo?.warranty || '').trim();
                  let displayWarranty = '';
                  if (isNoWarranty) {
                    if (rawWarranty && !rawWarranty.toLowerCase().includes('1 year') && rawWarranty.toLowerCase() !== 'no warranty' && rawWarranty !== '-') {
                      displayWarranty = rawWarranty;
                    } else {
                      displayWarranty = isAccessories ? '' : 'No Warranty';
                    }
                  } else {
                    displayWarranty = rawWarranty || '1 Year Official';
                  }

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* Item & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-semibold">
                            {item.sku}
                          </span>
                          <span>•</span>
                          <span>{item.brand}</span>
                          {item.model && (
                            <>
                              <span>•</span>
                              <span>{item.model}</span>
                            </>
                          )}
                          {displaySupplier && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-800 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 text-[10px]" title="Supplier Name (From PO / Inventory)">
                                🏢 {displaySupplier}
                              </span>
                            </>
                          )}
                          {displayWarranty && (
                            <>
                              <span>•</span>
                              <span
                                className={`font-semibold px-1.5 py-0.2 rounded border text-[10px] ${
                                  displayWarranty === 'No Warranty'
                                    ? 'text-slate-600 bg-slate-100 border-slate-300'
                                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                }`}
                                title="Warranty Term (From PO / Inventory)"
                              >
                                🛡️ {displayWarranty}
                              </span>
                            </>
                          )}
                          {((item.imeiList && item.imeiList.length > 0) || item.imeiOrSerial) && (
                            <>
                              <span>•</span>
                              <span 
                                className="text-purple-800 font-mono font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 text-[10px] inline-flex items-center gap-1 cursor-help"
                                title={`Registered IMEI/SN (${(item.imeiList && item.imeiList.length > 0) ? item.imeiList.length : 1} units):\n${(item.imeiList && item.imeiList.length > 0) ? item.imeiList.join('\n') : item.imeiOrSerial}`}
                              >
                                <Tag className="w-3 h-3 text-purple-600" />
                                {(item.imeiList && item.imeiList.length > 0) ? `${item.imeiList.length} IMEIs` : 'IMEI Tracked'}
                              </span>
                            </>
                          )}
                          {getItemAgingDays(item) >= agingThresholdDays && (item.totalStock > 0 || branchStockQty > 0) && (
                            <>
                              <span>•</span>
                              <span className="text-amber-900 font-bold bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 text-[10px] inline-flex items-center gap-1" title="Old Stock: In warehouse for over 60 days. Consider discounting or clearance sale.">
                                ⏳ {getItemAgingDays(item)}d Old Stock (Clearance)
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {item.category}
                        </span>
                      </td>

                      {/* Buying Cost (MD Only) */}
                      {isMDOrAdmin && (
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                          {formatMMK(item.costPrice)}
                        </td>
                      )}

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 bg-blue-50/20">
                        {formatMMK(item.sellingPrice)}
                      </td>

                      {/* Branch-Specific Stock vs Total */}
                      <td className="py-3 px-4 text-center bg-purple-50/20">
                        {isSingleBranch ? (
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                              branchStockQty < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                                : branchStockQty === 0
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : isLow
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}
                          >
                            {branchStockQty} Units {branchStockQty < 0 ? '(Negative/Shortage)' : ''}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                              item.totalStock < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                                : 'bg-purple-100 text-purple-900 border border-purple-200'
                            }`}
                          >
                            {item.totalStock} Units {item.totalStock < 0 ? '(Oversold)' : '(Combined)'}
                          </span>
                        )}
                      </td>

                      {/* Branch Breakdown (Shows Stock Quantity in Every Branch) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {branches.map((b) => {
                            const count = item.branchStock ? item.branchStock[b.id] || 0 : 0;
                            const isSelectedBranch = isSingleBranch && b.id === selectedBranchId;
                            return (
                              <span
                                key={b.id}
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  isSelectedBranch
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title={`${b.name}: ${count} units`}
                              >
                                <strong>{b.code}:</strong> {count}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canManageStock ? (
                            <>
                              {/* Stock In */}
                              <button
                                onClick={() => openMovementModal('STOCK_IN', item)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                title="Stock Inbound (Pre-filled Code & Model)"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Adjust */}
                              <button
                                onClick={() => openAdjustStockModal(item)}
                                className="p-1.5 text-blue-700 hover:bg-blue-100 bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                title="Quick Stock Restock & Level Adjust"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Item */}
                              <button
                                onClick={() => openEditItemModal(item)}
                                className="p-1.5 text-purple-700 hover:bg-purple-100 bg-purple-50 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                                title="Edit Product & Prices"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Inspect Item Timeline */}
                              <button
                                onClick={() => setSelectedItemForTimeline(item)}
                                className="p-1.5 text-amber-700 hover:bg-amber-100 bg-amber-50 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                title="Inspect Stock Lifecycle & Audit Timeline"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Item (Admin & Manager Only) */}
                              {canDeleteProduct && (
                                <button
                                  onClick={() => onDeleteItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            /* Staff Read Only */
                            <button
                              onClick={() => setSelectedItemForTimeline(item)}
                              className="px-2.5 py-1 text-purple-700 hover:bg-purple-50 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Inspect Stock Lifecycle & Audit Timeline"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>View History</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No stock items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ground Stock Audit & Discrepancies Tab */}
      {activeTab === 'ground_audit' && (
        <GroundStockAudit
          inventory={inventory}
          branches={branches}
          movements={movements}
          currentUser={currentUser}
          onUpdateItem={onUpdateItem}
          onRecordMovement={onRecordMovement}
          onLogActivity={onLogActivity}
          onInspectItemTimeline={(item) => setSelectedItemForTimeline(item)}
        />
      )}



      {/* Movement Logs Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>Audited Stock Movement History</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              Total {movements.length} logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">ITEM NAME</th>
                  <th className="py-3 px-4 text-center">QTY</th>
                  <th className="py-3 px-4">ROUTE / LOCATION</th>
                  <th className="py-3 px-4">PERFORMED BY</th>
                  <th className="py-3 px-4">NOTES / REFERENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((mov) => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (mov.type === 'STOCK_IN') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                  } else if (mov.type === 'STOCK_OUT') {
                    badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
                  } else if (mov.type === 'TRANSFER') {
                    badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                  }

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {formatDateDMY(mov.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}`}>
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {mov.itemName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-purple-700">
                        {mov.quantity}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {mov.type === 'TRANSFER' && (
                          <span>
                            {mov.fromBranchName} ➔ {mov.toBranchName}
                          </span>
                        )}
                        {mov.type === 'STOCK_IN' && (
                          <span>Inbound to {mov.toBranchName}</span>
                        )}
                        {mov.type === 'STOCK_OUT' && (
                          <span>Outbound from {mov.fromBranchName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {mov.performedBy}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {mov.notes || mov.supplierOrCustomer || '-'}
                      </td>
                    </tr>
                  );
                })}

                {movements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock & FIFO Replenishment Model Tab */}
      {activeTab === 'low_stock_fifo' && (
        <div className="space-y-6">
          {/* Top Banner & Strategy */}
          <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-rose-800/40 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30 uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>First-In First-Out (FIFO) Replenishment Intelligence</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Stock Replenishment & FIFO Batch Queue
                </h2>
                <p className="text-xs text-rose-200/80 max-w-2xl">
                  Automatically prioritizes selling oldest purchased batches first (FIFO) to prevent obsolescence and calculates exact safety reorder quantities before stockouts occur.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => openMovementModal('STOCK_IN')}
                  className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4 text-slate-950" />
                  <span>+ Inbound Stock Restock</span>
                </button>
                {onNavigateToPurchases && (
                  <button
                    onClick={onNavigateToPurchases}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Go to Supplier POs ➔</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-rose-800/40 text-xs">
              <div>
                <span className="text-[10px] text-rose-300/80 uppercase font-semibold">SKUs Below Min Safety Level</span>
                <p className="text-lg font-black text-rose-400 font-mono mt-0.5">{lowStockItems.length} Products</p>
              </div>
              <div>
                <span className="text-[10px] text-rose-300/80 uppercase font-semibold">Suggested Reorder Units</span>
                <p className="text-lg font-black text-white font-mono mt-0.5">
                  {lowStockItems.reduce((sum, item) => sum + Math.max(1, (item.minStockAlert * 2) - item.totalStock), 0)} Units
                </p>
              </div>
              {isMDOrAdmin ? (
                <div>
                  <span className="text-[10px] text-rose-300/80 uppercase font-semibold">Est. Restock Capital Required</span>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    {formatMMK(
                      lowStockItems.reduce(
                        (sum, item) => sum + Math.max(1, (item.minStockAlert * 2) - item.totalStock) * (item.costPrice || 0),
                        0
                      )
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-rose-300/80 uppercase font-semibold">Stock Reorder Status</span>
                  <p className="text-lg font-black text-amber-300 font-mono mt-0.5">
                    {lowStockItems.length > 0 ? 'Replenish Needed' : 'Normal'}
                  </p>
                </div>
              )}
              <div>
                <span className="text-[10px] text-rose-300/80 uppercase font-semibold">Total Tracked Catalog SKUs</span>
                <p className="text-lg font-black text-emerald-300 font-mono mt-0.5">{inventory.length} Items</p>
              </div>
            </div>
          </div>

          {/* Section 1: Low Stock Replenishment Recommender Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Restock Priority Recommender Table ({lowStockItems.length} Low Stock Items)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Reorder Formula: Target = (Safety Threshold × 2) - Current Balance
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">ITEM & MODEL CODE</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4 text-center">SAFETY BUFFER</th>
                    <th className="py-3 px-4 text-center">CURRENT STOCK</th>
                    <th className="py-3 px-4 text-center">DEFICIT / SHORTAGE</th>
                    <th className="py-3 px-4 text-center bg-rose-50/60 text-rose-800">SUGGESTED REORDER</th>
                    {isMDOrAdmin && (
                      <>
                        <th className="py-3 px-4 text-right">UNIT COST</th>
                        <th className="py-3 px-4 text-right">EST. CAPITAL</th>
                      </>
                    )}
                    <th className="py-3 px-4">SUPPLIER</th>
                    <th className="py-3 px-4 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map((item) => {
                    const currentQty = isSingleBranch
                      ? (item.branchStock ? (item.branchStock[selectedBranchId] || 0) : 0)
                      : item.totalStock;
                    const deficit = Math.max(0, item.minStockAlert - currentQty);
                    const suggestedQty = Math.max(1, (item.minStockAlert * 2) - currentQty);
                    const estCost = suggestedQty * (item.costPrice || 0);

                    return (
                      <tr key={item.id} className="hover:bg-rose-50/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="font-mono text-[11px] text-purple-700 font-bold mt-0.5">
                            SKU: {item.sku} {item.brand ? `• ${item.brand}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                          {item.minStockAlert} Units
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                              currentQty === 0
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {currentQty} Units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                          {deficit > 0 ? `-${deficit} Units` : 'Buffer Low'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-rose-800 bg-rose-50/80">
                          +{suggestedQty} Units
                        </td>
                        {isMDOrAdmin && (
                          <>
                            <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">
                              {formatMMK(item.costPrice)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-900 bg-amber-50/20">
                              {formatMMK(estCost)}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-slate-600 font-medium truncate max-w-[130px]">
                          {item.supplier || 'Primary Supplier'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openMovementModal('STOCK_IN', item)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Direct Inbound Stock In"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>Restock</span>
                            </button>
                            <button
                              onClick={() => openAdjustStockModal(item)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition cursor-pointer"
                              title="Audit Stock"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-slate-800">All Inventory Healthy!</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          No items are currently below their minimum safety buffer thresholds.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: FIFO Batch Traceability & Ageing Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    First-In First-Out (FIFO) Batch Order & Ageing Lifecycle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Track which batches arrived first and must be dispatched / sold first to customers
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Rule: Oldest Batch = Priority Dispense (#1 Next Out)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">ITEM NAME & SKU</th>
                    <th className="py-3 px-4">FIFO BATCH NO</th>
                    <th className="py-3 px-4">DATE RECEIVED</th>
                    <th className="py-3 px-4 text-center">FIFO SEQUENCE</th>
                    {isMDOrAdmin && (
                      <th className="py-3 px-4 text-right">PURCHASE COST</th>
                    )}
                    <th className="py-3 px-4 text-center">INITIAL QTY</th>
                    <th className="py-3 px-4 text-center">REMAINING QTY</th>
                    <th className="py-3 px-4">SUPPLIER / SOURCE</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((item) => {
                    // If batches are explicitly present, use them; otherwise generate synthetic FIFO batch from last restock
                    const batches = item.batches && item.batches.length > 0 ? item.batches : [
                      {
                        id: `batch-syn-${item.id}`,
                        batchNo: `BATCH-${(item.lastRestockedDate || '20260308').replace(/-/g,'')}-${item.sku.slice(-3) || '101'}`,
                        purchaseDate: item.lastRestockedDate || '2026-03-08',
                        costPrice: item.costPrice,
                        initialQty: Math.max(item.totalStock, item.minStockAlert * 2),
                        remainingQty: item.totalStock,
                        supplier: item.supplier || 'Main Distributor',
                      }
                    ];

                    return batches.map((b, bIdx) => {
                      const isNextOut = bIdx === 0 && b.remainingQty > 0;
                      const isDepleted = b.remainingQty === 0;

                      return (
                        <tr key={`${item.id}-${b.id || bIdx}`} className={isNextOut ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'}>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="font-mono text-[10px] text-purple-700 font-bold">{item.sku}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {b.batchNo}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {formatDateDMY(b.purchaseDate)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isNextOut && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                                <span>#1 First-Out Next</span>
                              </span>
                            )}
                            {!isNextOut && !isDepleted && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[10px]">
                                #{bIdx + 1} Queue
                              </span>
                            )}
                            {isDepleted && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium text-[10px]">
                                Depleted (Sold)
                              </span>
                            )}
                          </td>
                          {isMDOrAdmin && (
                            <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">
                              {formatMMK(b.costPrice)}
                            </td>
                          )}
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {b.initialQty}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-purple-800">
                            {b.remainingQty}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {b.supplier || item.supplier || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {b.remainingQty > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Active In Stock
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">
                                Consumed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}

                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No product batches available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Deduplication & Code Unification Modal */}
      {isDeduplicationModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeduplicationModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] my-auto flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-lg text-slate-900">
                  Unify Duplicate Product Codes (SKUs)
                </h3>
              </div>
              <button
                onClick={() => setIsDeduplicationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
                <p className="font-bold">Automated SKU & Stock Consolidation Rule:</p>
                <p className="text-[11px] text-amber-800 mt-1">
                  Products sharing identical names (e.g. "iPhone 15 Pro Max 256GB") will be consolidated under a single master product code / SKU. Their branch-level inventory quantities and purchase cost batches will be accurately merged.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Detected Duplicate Groups ({duplicateGroups.length})
                </h4>
                {duplicateGroups.map((group, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{group.items[0]?.name}</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {group.items.length} duplicate entries
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {group.items.map((it: any, itIdx: number) => (
                        <div key={itIdx} className="p-2 bg-white rounded-lg border border-slate-200 font-mono">
                          <div className="text-slate-800 font-bold">Code: {it.sku}</div>
                          <div className="text-slate-500">Stock: {it.totalStock} Units{isMDOrAdmin ? ` • Cost: ${formatMMK(it.costPrice)}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsDeduplicationModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConsolidateDuplicates}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Tag className="w-4 h-4" />
                <span>Confirm & Unify All Codes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isItemModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsItemModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] my-auto flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-lg text-slate-900">
                {editingItem ? 'Edit Product Details' : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Brand Quick Selector Pills with Category Tabs & Add Standard Button */}
              <div className="space-y-2 bg-purple-50/40 p-2.5 rounded-xl border border-purple-200/80">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <label className="block text-slate-900 font-bold text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-700" />
                    <span>Brand & SKU Code Standard *</span>
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200">
                      Brand Prefixes by Category
                    </span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 font-medium">
                      Prefix: <strong className="text-purple-900 font-mono font-bold">{getBrandSKUPrefix(brand || name, category, name) || 'Auto'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSkuStandardModalOpen(true)}
                      className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Add or Manage Category SKU Code Standards"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Code Standard</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Tabs for Brand Selector */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {[
                    { id: 'Smartphones & Tablets', label: '📱 Mobile', cat: 'Smartphones & Tablets' as InventoryCategory },
                    { id: 'Laptops & Computers', label: '💻 Laptop', cat: 'Laptops & Computers' as InventoryCategory },
                    { id: 'Accessories & Gadgets', label: '🎧 Accessories', cat: 'Accessories & Gadgets' as InventoryCategory },
                    { id: 'Service Spare Part', label: '🔧 Spare Part', cat: 'Service Spare Part' as InventoryCategory },
                    { id: 'Service Charges', label: '⚡ Service', cat: 'Service Charges' as InventoryCategory },
                    { id: 'All', label: '🌐 All Brands', cat: undefined },
                  ].map((tab) => {
                    const isActive = skuCategoryFilter === tab.id || (tab.id === 'All' && skuCategoryFilter === 'All');
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setSkuCategoryFilter(tab.id);
                          if (tab.cat) {
                            const newCat = tab.cat;
                            setCategory(newCat);
                            const catConfigs = getBrandSKUConfigsByCategory(newCat);
                            const newBrand = catConfigs[0]?.brand || (newCat === 'Accessories & Gadgets' ? 'Borofone' : newCat === 'Laptops & Computers' ? 'Laptops' : newCat === 'Service Spare Part' ? 'Spare Part' : newCat === 'Service Charges' ? 'Service' : 'Samsung');
                            setBrand(newBrand);
                            if (newCat === 'Accessories & Gadgets') {
                              if (warranty.toLowerCase().includes('1 year')) setWarranty('');
                            } else if (!warranty) {
                              setWarranty('1 Year Official Warranty');
                            }
                            if (!editingItem) {
                              setSku(generateAutoSKU(newCat, inventory, [], newBrand, name));
                            }
                          }
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-purple-900 text-white shadow-2xs ring-1 ring-purple-400'
                            : 'bg-white text-slate-600 hover:bg-purple-100/60 hover:text-purple-900 border border-purple-200/60'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Filtered Brand selection pills */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-purple-200/90 rounded-lg max-h-32 overflow-y-auto">
                  {getBrandSKUConfigsByCategory(skuCategoryFilter).length === 0 ? (
                    <div className="w-full py-2 text-center text-slate-400 text-[11px] flex items-center justify-center gap-2">
                      <span>No code standards configured for this category yet</span>
                      <button
                        type="button"
                        onClick={() => setIsSkuStandardModalOpen(true)}
                        className="text-purple-700 font-bold underline cursor-pointer"
                      >
                        + Add New
                      </button>
                    </div>
                  ) : (
                    getBrandSKUConfigsByCategory(skuCategoryFilter).map((b) => {
                      const isSelected = brand?.toLowerCase() === b.brand.toLowerCase();
                      return (
                        <button
                          key={`${b.category}_${b.prefix}_${b.brand}`}
                          type="button"
                          onClick={() => {
                            setBrand(b.brand);
                            if (b.category && b.category !== category) {
                              setCategory(b.category);
                              setSkuCategoryFilter(b.category);
                            }
                            if (!editingItem) {
                              const newSku = generateAutoSKU(b.category || category, inventory, [], b.brand, name);
                              setSku(newSku);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-purple-700 text-white shadow-xs font-bold ring-2 ring-purple-300'
                              : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-800 border border-slate-200'
                          }`}
                        >
                          <span>{b.brand}</span>
                          <span className={`font-mono text-[10px] px-1 py-0.2 rounded font-bold ${isSelected ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'}`}>
                            {b.prefix}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value as InventoryCategory;
                      setCategory(newCat);
                      setSkuCategoryFilter(newCat);
                      const catConfigs = getBrandSKUConfigsByCategory(newCat);
                      const newBrand = catConfigs[0]?.brand || (newCat === 'Accessories & Gadgets' ? 'Borofone' : newCat === 'Laptops & Computers' ? 'Laptops' : newCat === 'Service Spare Part' ? 'Spare Part' : newCat === 'Service Charges' ? 'Service' : 'Samsung');
                      setBrand(newBrand);
                      if (newCat === 'Accessories & Gadgets') {
                        if (warranty.toLowerCase().includes('1 year')) setWarranty('');
                      } else if (!warranty) {
                        setWarranty('1 Year Official Warranty');
                      }
                      if (!editingItem) {
                        setSku(generateAutoSKU(newCat, inventory, [], newBrand, name));
                      }
                    }}
                    className="w-full px-3 py-2 bg-purple-50/50 border border-purple-200 rounded-lg text-slate-800 font-bold focus:border-purple-500 focus:outline-hidden cursor-pointer"
                  >
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold text-xs">Product Code / SKU *</label>
                    <button
                      type="button"
                      onClick={() => setSku(generateAutoSKU(category, inventory, [], brand, name))}
                      className="text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                      title="Regenerate next Brand Code or Category SKU"
                    >
                      ↻ Auto Code ({getBrandSKUPrefix(brand || name, category, name) || 'Auto'})
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-purple-900 font-mono font-bold focus:bg-white focus:border-purple-500 focus:outline-hidden"
                    placeholder="e.g. SS0001, HN0001, IP0001"
                  />
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                    Brand Codes: SS0001, HN0001, HW0001, IN0001, IP0001, DL0001, MB0001, AK0001, SP0001, SRV0001...
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setName(newName);
                    // Auto-detect brand from name if brand is empty
                    const detected = detectBrandFromName(newName, category);
                    if (detected && (!brand || brand === 'Samsung' || brand === 'Standard' || brand === 'Mobile' || brand === 'Laptop')) {
                      setBrand(detected);
                      if (!editingItem) {
                        setSku(generateAutoSKU(category, inventory, [], detected, newName));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                  placeholder="e.g. Samsung Galaxy S24 Ultra (256GB), Honor 90, iPhone 15 Pro"
                />
              </div>

              {/* Live Duplicate Product Match Alert Box with 1-click Link */}
              {liveMatchInModal && liveMatchInModal.matchedItem.sku !== sku && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 bg-amber-200 text-amber-900 rounded-lg shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
                        <span>Matching Product Found in System</span>
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono font-bold text-[11px]">
                          Code: {liveMatchInModal.matchedItem.sku}
                        </span>
                      </div>
                      <p className="text-amber-800 text-[11px] truncate mt-0.5">
                        {liveMatchInModal.matchedItem.name} • {liveMatchInModal.matchedItem.category} • Current Stock: {liveMatchInModal.matchedItem.totalStock} Units
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const m = liveMatchInModal.matchedItem;
                      setSku(m.sku);
                      setCategory(m.category);
                      if (m.brand && !brand) setBrand(m.brand);
                      if (m.model && !model) setModel(m.model);
                      if (m.costPrice && costPrice === 0) setCostPrice(m.costPrice);
                      if (m.sellingPrice && sellingPrice === 0) setSellingPrice(m.sellingPrice);
                      if (m.supplier && !supplier) setSupplier(m.supplier);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    Use Matching SKU
                  </button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Custom Brand Name</label>
                    <button
                      type="button"
                      onClick={() => {
                        const det = detectBrandFromName(name, category);
                        if (det) {
                          setBrand(det);
                          if (!editingItem) {
                            setSku(generateAutoSKU(category, inventory, [], det, name));
                          }
                        }
                      }}
                      className="text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                      title="Auto-detect brand from product name"
                    >
                      ↻ Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBrand(val);
                      if (!editingItem && val.trim()) {
                        setSku(generateAutoSKU(category, inventory, [], val, name));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    placeholder="e.g. Samsung, Honor, Vivo"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Model / Spec</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    placeholder="e.g. 8GB/256GB, A3106"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Serial / IMEI</label>
                  <input
                    type="text"
                    value={imeiOrSerial}
                    onChange={(e) => setImeiOrSerial(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                    placeholder="SN or IMEI (Optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Buying Cost (MMK) *</label>
                  <FormattedNumberInput
                    value={costPrice}
                    onChange={(val) => setCostPrice(val)}
                    showLiveBadge={true}
                    min={0}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-amber-950 font-mono font-bold text-right"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Selling Price (MMK) *</label>
                  <FormattedNumberInput
                    value={sellingPrice}
                    onChange={(val) => setSellingPrice(val)}
                    showLiveBadge={true}
                    min={0}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-blue-950 font-mono font-bold text-right"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    min={1}
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Stock Quantity / Branch Isolation Input */}
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
                <label className="block text-slate-900 font-bold text-xs flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-700" />
                  <span>Shop Stock Quantity *</span>
                </label>

                {/* Single Branch Isolated Stock Input */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        Target Shop Branch
                      </label>
                      {hasGlobalBranchAccess(currentUser) ? (
                        <select
                          value={targetStockBranchId}
                          onChange={(e) => {
                            const newBId = e.target.value;
                            setTargetStockBranchId(newBId);
                            if (editingItem && editingItem.branchStock) {
                              setInitialQuantity(editingItem.branchStock[newBId] || 0);
                            }
                          }}
                          className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-purple-950 font-bold cursor-pointer"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.code} - {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 bg-purple-100/70 border border-purple-300 rounded-lg text-purple-950 font-bold text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-700" />
                          <span>{branches.find(b => b.id === targetStockBranchId)?.name || 'Current Branch'}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        Stock Quantity (Units)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInitialQuantity(initialQuantity - 1)}
                          className="w-10 h-9 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 font-black text-purple-900 text-lg flex items-center justify-center cursor-pointer transition"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          required
                          value={initialQuantity}
                          onChange={(e) => setInitialQuantity(Number(e.target.value))}
                          className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-purple-950 font-mono font-black text-base text-center focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => setInitialQuantity(initialQuantity + 1)}
                          className="w-10 h-9 rounded-lg bg-white border border-purple-200 hover:bg-purple-100 font-black text-purple-900 text-lg flex items-center justify-center cursor-pointer transition"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 bg-white/80 rounded-lg border border-purple-200 text-[11px] text-purple-900 flex items-center gap-2">
                    <span className="font-bold">✓ Branch Allocation:</span>
                    <span>Stock quantity allocated to <strong className="font-bold">{branches.find(b => b.id === targetStockBranchId)?.name}</strong> branch.</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Unit IMEI / Serial Numbers Manager */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span>Unit IMEI / Serial Numbers ({Math.max(Number(initialQuantity) || 0, itemImeis.length)} Units)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkPasteModal({
                          isOpen: true,
                          target: 'item',
                          text: itemImeis.join('\n')
                        });
                      }}
                      className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <FileText className="w-3 h-3" />
                      <span>📋 Bulk Paste IMEIs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItemImeis((prev) => [...prev, '']);
                      }}
                      className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Slot</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  Enter or manage individual unit IMEI / Serial numbers for current stock quantity.
                </p>

                {/* Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {Array.from({ length: Math.max(1, Math.max(Number(initialQuantity) || 0, itemImeis.length)) }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={itemImeis[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemImeis((prev) => {
                            const next = [...prev];
                            next[idx] = val;
                            return next;
                          });
                          const valid = [...itemImeis];
                          valid[idx] = val;
                          setImeiOrSerial(valid.filter(Boolean).join(', '));
                        }}
                        placeholder={`Unit #${idx + 1} IMEI / SN`}
                        className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                      />
                      {itemImeis[idx] && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemImeis((prev) => {
                              const next = [...prev];
                              next[idx] = '';
                              const valid = next.map(s => s.trim()).filter(Boolean);
                              setImeiOrSerial(valid.join(', '));
                              return next;
                            });
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Warranty Term</label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    placeholder={category === 'Accessories & Gadgets' ? 'No Warranty (Accessories)' : '1 Year Official Warranty'}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier Name</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    placeholder="Distributor / Supplier"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {editingItem ? 'Save Product Details' : 'Add Item to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal (Stock In / Stock Out / Transfer) */}
      {isMovementModalOpen && selectedItemForMovement && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMovementModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] my-auto flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    movementType === 'STOCK_IN'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {movementType === 'STOCK_IN' && <ArrowDownToLine className="w-4 h-4" />}
                  {movementType === 'STOCK_OUT' && <ArrowUpFromLine className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {movementType === 'STOCK_IN' && 'Stock Inbound (Supplier Restock)'}
                    {movementType === 'STOCK_OUT' && 'Stock Outbound (Damage / Display)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {movementType === 'STOCK_IN' && 'Record new inventory receipts from suppliers into a branch'}
                    {movementType === 'STOCK_OUT' && 'Deduct units for damages, showroom display or audit write-offs'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Movement Type Switcher Tabs (Stock In & Stock Out) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mt-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMovementType('STOCK_IN')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  movementType === 'STOCK_IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Stock In</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('STOCK_OUT')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  movementType === 'STOCK_OUT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                <span>Stock Out</span>
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* If STOCK_IN: Comprehensive Inbound Purchase & Restock Form */}
              {movementType === 'STOCK_IN' ? (
                <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  {/* PO Integration Note */}
                  {onNavigateToPurchases && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-purple-900 leading-relaxed">
                        <span className="font-bold">💡 Connected to Purchase Orders (PO):</span> Recording a PO in Finance automatically adds to your stock and tracks supplier debt in one step.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMovementModalOpen(false);
                          onNavigateToPurchases();
                        }}
                        className="shrink-0 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[10px] shadow-xs cursor-pointer"
                      >
                        + Create Supplier PO
                      </button>
                    </div>
                  )}

                  {/* When an item is selected: Show Verified Product Banner (Auto-filled) */}
                  {selectedItemForMovement ? (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-purple-50 border border-emerald-300 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            ✓ Auto-Filled Product
                          </span>
                          <span className="text-xs font-mono font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-300">
                            Code: {selectedItemForMovement.sku}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedItemForMovement(null)}
                          className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                        >
                          ↻ Switch Product / New Code
                        </button>
                      </div>

                      <div className="text-sm font-black text-slate-900">
                        {selectedItemForMovement.name}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-2 items-center">
                        <span><strong>Brand:</strong> {selectedItemForMovement.brand || 'General'}</span>
                        <span>•</span>
                        <span><strong>Model:</strong> {selectedItemForMovement.model || 'Standard'}</span>
                        <span>•</span>
                        <span><strong>Category:</strong> {selectedItemForMovement.category}</span>
                        <span>•</span>
                        <span className="text-emerald-800 font-bold bg-white/80 px-2 py-0.5 rounded border border-emerald-200">
                          Current Stock ({branches.find(b => b.id === movToBranch)?.code || 'Store'}): {selectedItemForMovement.branchStock?.[movToBranch] || 0} Units (Total: {selectedItemForMovement.totalStock})
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* If no item selected: Choose from list or enter new product */
                    <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Select Existing Item or Type Model Code *
                        </label>
                        <select
                          value={selectedItemForMovement?.id || ''}
                          onChange={(e) => {
                            const found = inventory.find((i) => i.id === e.target.value);
                            if (found) {
                              setSelectedItemForMovement(found);
                              setMovSku(found.sku);
                              setMovItemName(found.name);
                              setMovCategory(found.category);
                              setMovBrand(found.brand);
                              setMovModel(found.model || '');
                              setMovUnitCost(found.costPrice);
                              setMovSellingPrice(found.sellingPrice);
                              setMovParty(found.supplier || '');
                            } else {
                              setSelectedItemForMovement(null);
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
                        >
                          <option value="">-- Select from Existing Products Catalog --</option>
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              [{inv.sku}] {inv.name} • (Current Stock: {inv.totalStock} Units)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Item Model Code (SKU) and Item Name */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            Item Model Code / SKU *
                          </label>
                          <input
                            type="text"
                            required
                            value={movSku}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMovSku(val);
                              const matching = inventory.find(i => i.sku.toLowerCase() === val.trim().toLowerCase());
                              if (matching) {
                                setSelectedItemForMovement(matching);
                                setMovItemName(matching.name);
                                setMovCategory(matching.category);
                                setMovBrand(matching.brand);
                                setMovModel(matching.model || '');
                                setMovUnitCost(matching.costPrice);
                                setMovSellingPrice(matching.sellingPrice);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold"
                            placeholder="e.g. 607645, 800600, DELL-WDX0R"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            Item / Model Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={movItemName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setMovItemName(v);
                              const det = detectBrandFromName(v, movCategory);
                              if (det && (!movBrand || movBrand === 'Dell' || movBrand === 'Apple' || movBrand === 'Samsung' || movBrand === 'Mobile' || movBrand === 'Laptop')) {
                                setMovBrand(det);
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                            placeholder="e.g. Mi 11 Pro, iPhone 15 Pro, Dell Inspiron"
                          />
                        </div>
                      </div>

                      {/* Category, Brand, Model Spec */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            Category *
                          </label>
                          <select
                            value={movCategory}
                            onChange={(e) => {
                              const newCat = e.target.value as InventoryCategory;
                              setMovCategory(newCat);
                              if (!selectedItemForMovement) {
                                setMovSku(generateAutoSKU(newCat, inventory));
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                          >
                            <option value="Smartphones & Tablets">Smartphones & Tablets (100001+)</option>
                            <option value="Laptops & Computers">Laptops & Computers (200001+)</option>
                            <option value="Accessories & Gadgets">Accessories & Gadgets (300001+)</option>
                            <option value="Service Spare Part">Service Spare Part (500001+)</option>
                          </select>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-700 font-bold">Brand</label>
                            <button
                              type="button"
                              onClick={() => setMovBrand(detectBrandFromName(movItemName, movCategory))}
                              className="text-[10px] text-purple-700 hover:text-purple-900 font-bold cursor-pointer"
                            >
                              ↻ Auto Brand
                            </button>
                          </div>
                          <input
                            type="text"
                            value={movBrand}
                            onChange={(e) => setMovBrand(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                            placeholder="e.g. Mi, Dell, Apple, Samsung"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">
                            Model Spec / Detail
                          </label>
                          <input
                            type="text"
                            value={movModel}
                            onChange={(e) => setMovModel(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                            placeholder="e.g. 15-inch 42Wh, 256GB"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Destination Branch & Quantity In */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Destination Branch (Receiving Store) *
                      </label>
                      <select
                        value={movToBranch}
                        onChange={(e) => setMovToBranch(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold cursor-pointer"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} - {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Quantity In (Units) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMovQtyChange(movQty - 1)}
                          disabled={movQty <= 1}
                          className="w-10 h-9 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 disabled:opacity-40 font-black text-emerald-900 text-lg flex items-center justify-center cursor-pointer transition shadow-2xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          required
                          value={movQty}
                          onChange={(e) => handleMovQtyChange(Number(e.target.value))}
                          className="flex-1 px-3 py-2 bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 font-mono font-black text-base text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleMovQtyChange(movQty + 1)}
                          className="w-10 h-9 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 font-black text-emerald-900 text-lg flex items-center justify-center cursor-pointer transition shadow-2xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unit Purchase Cost (MD Only) & Selling Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {isMDOrAdmin && (
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Unit Purchase Cost (MMK)
                        </label>
                        <FormattedNumberInput
                          value={movUnitCost}
                          onChange={(val) => setMovUnitCost(val)}
                          showLiveBadge={true}
                          min={0}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-amber-950 font-mono font-bold text-right"
                          placeholder="0"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Unit Retail Price (MMK)
                      </label>
                      <FormattedNumberInput
                        value={movSellingPrice}
                        onChange={(val) => setMovSellingPrice(val)}
                        showLiveBadge={true}
                        min={0}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-emerald-950 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Dynamic Quantity-based IMEI / Serial Number Input Fields */}
                  <div className="p-3.5 bg-white border border-emerald-300 rounded-xl space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-700" />
                        <label className="text-xs font-bold text-slate-900">
                          Unit IMEI / Serial Numbers ({movQty} Units)
                        </label>
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.2 rounded-full">
                          {movImeis.filter(s => s.trim().length > 0).length} / {movQty} Filled
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setBulkPasteModal({
                            isOpen: true,
                            target: 'movement',
                            text: movImeis.filter(Boolean).join('\n')
                          });
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>📋 Quick Bulk Paste IMEIs</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Enter or scan individual IMEI / Serial number for each unit, or use a Barcode Scanner.
                    </p>

                    {/* Dynamic IMEI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {Array.from({ length: movQty }).map((_, idx) => {
                        const isDuplicate = movImeis[idx]?.trim() && movImeis.filter((s, i) => i !== idx && s.trim() === movImeis[idx].trim()).length > 0;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition ${
                              isDuplicate
                                ? 'bg-rose-50 border-rose-400'
                                : movImeis[idx]?.trim()
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={movImeis[idx] || ''}
                              onChange={(e) => handleMovImeiChange(idx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  // Focus next input
                                  const nextInput = document.getElementById(`mov-imei-input-${idx + 1}`);
                                  if (nextInput) nextInput.focus();
                                }
                              }}
                              id={`mov-imei-input-${idx}`}
                              placeholder={`Unit #${idx + 1} IMEI / SN`}
                              className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                            />
                            {movImeis[idx] && (
                              <button
                                type="button"
                                onClick={() => handleMovImeiChange(idx, '')}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                title="Clear"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Supplier Name & PO / Invoice Voucher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Supplier / Vendor Name
                      </label>
                      <input
                        type="text"
                        value={movParty}
                        onChange={(e) => setMovParty(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        placeholder="e.g. Official Distributor, Central Warehouse"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        PO / Voucher No.
                      </label>
                      <input
                        type="text"
                        value={movNotes}
                        onChange={(e) => setMovNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                        placeholder="e.g. PO-2026-9812 / Invoice #88"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Non Stock-In (Outbound / Transfer) */
                <>
                  {/* Select Product Item */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Select Product Item *
                    </label>
                    <select
                      value={selectedItemForMovement?.id || ''}
                      onChange={(e) => {
                        const found = inventory.find((i) => i.id === e.target.value);
                        if (found) {
                          setSelectedItemForMovement(found);
                          setMovUnitCost(found.costPrice);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium cursor-pointer"
                    >
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          [{inv.sku}] {inv.name} • (Total Units: {inv.totalStock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Product Info Card */}
                  {selectedItemForMovement && (
                    <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-purple-700 font-bold">
                          {selectedItemForMovement.sku} • {selectedItemForMovement.category}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700">
                          Total All Branches: <strong className="font-mono text-purple-900 text-xs">{selectedItemForMovement.totalStock} Units</strong>
                        </span>
                      </div>
                      {/* Branch availability chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {branches.map((b) => {
                          const bCount = selectedItemForMovement.branchStock
                            ? selectedItemForMovement.branchStock[b.id] || 0
                            : 0;
                          return (
                            <span
                              key={b.id}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                bCount === 0
                                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                                  : 'bg-white text-slate-800 border-purple-200 font-bold'
                              }`}
                            >
                              {b.code}: {bCount} Units
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {movementType === 'STOCK_OUT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Source Branch *
                    </label>
                    <select
                      value={movFromBranch}
                      onChange={(e) => setMovFromBranch(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                    >
                      {branches.map((b) => {
                        const curQty = selectedItemForMovement.branchStock
                          ? selectedItemForMovement.branchStock[b.id] || 0
                          : 0;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.code} - {b.name} (Stock: {curQty})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Quantity Out *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={
                        selectedItemForMovement.branchStock
                          ? selectedItemForMovement.branchStock[movFromBranch] || 1
                          : 1
                      }
                      required
                      value={movQty}
                      onChange={(e) => setMovQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-rose-50/50 border border-rose-300 rounded-lg text-rose-950 font-mono font-bold text-base text-center"
                    />
                  </div>
                </div>
              )}

              {/* ADDITIONAL FIELDS BASED ON TYPE */}
              {movementType === 'STOCK_IN' && (
                <div className={`grid ${isMDOrAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                  {isMDOrAdmin && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Unit Cost (MMK)
                      </label>
                      <FormattedNumberInput
                        value={movUnitCost || selectedItemForMovement.costPrice}
                        onChange={(val) => setMovUnitCost(val)}
                        showLiveBadge={true}
                        min={0}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-amber-950 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Supplier / Invoice PO #
                    </label>
                    <input
                      type="text"
                      value={movParty}
                      onChange={(e) => setMovParty(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                      placeholder="e.g. Official Supplier / PO-2026-88"
                    />
                  </div>
                </div>
              )}

              {movementType === 'STOCK_OUT' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Outbound Reason *
                  </label>
                  <select
                    value={movOutReason}
                    onChange={(e) => setMovOutReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="Damaged / Defective Unit">Damaged / Defective Unit</option>
                    <option value="Return to Supplier / RMA">Return to Supplier / RMA</option>
                    <option value="Showroom Display / Demo Unit">Showroom Display / Demo Unit</option>
                    <option value="Internal Testing / Shop Use">Internal Testing / Shop Use</option>
                    <option value="Promotional Giveaway / Gift">Promotional Giveaway / Gift</option>
                    <option value="Physical Audit Write-off">Physical Audit Write-off</option>
                    <option value="Direct B2B Sale / Manual Out">Direct B2B Sale / Manual Out</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Notes & Reference
                </label>
                <input
                  type="text"
                  value={movNotes}
                  onChange={(e) => setMovNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                  placeholder="Optional reference notes or code"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg font-bold shadow-xs cursor-pointer ${
                    movementType === 'STOCK_IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {movementType === 'STOCK_IN' ? 'Confirm Stock In' : 'Confirm Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED QUICK STOCK AUDIT & REPLENISH MODAL */}
      {isAdjustModalOpen && selectedItemForAdjust && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAdjustModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] my-auto flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Stock Audit & Branch Level Adjustment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Directly audit and update on-hand inventory levels for each of the 4 branch stores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Product Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Product Item
                </label>
                <select
                  value={selectedItemForAdjust.id}
                  onChange={(e) => {
                    const found = inventory.find((i) => i.id === e.target.value);
                    if (found) {
                      setSelectedItemForAdjust(found);
                      const qtys: { [bId: string]: number } = {};
                      branches.forEach((b) => {
                        qtys[b.id] = found.branchStock ? found.branchStock[b.id] || 0 : 0;
                      });
                      setAdjustBranchQtys(qtys);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold cursor-pointer"
                >
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.sku}] {inv.name} • (Current Total: {inv.totalStock} Units)
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Info Bar */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Category</span>
                  <span className="font-bold text-slate-800 text-[11px] truncate block">
                    {selectedItemForAdjust.category}
                  </span>
                </div>
                {isMDOrAdmin ? (
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Unit Cost</span>
                    <span className="font-bold text-amber-900 font-mono text-[11px] block">
                      {formatMMK(selectedItemForAdjust.costPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Brand</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">
                      {selectedItemForAdjust.brand || 'Original'}
                    </span>
                  </div>
                )}
                <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Retail Price</span>
                  <span className="font-bold text-blue-900 font-mono text-[11px] block">
                    {formatMMK(selectedItemForAdjust.sellingPrice)}
                  </span>
                </div>
                <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Current Total</span>
                  <span className="font-black text-purple-900 font-mono text-xs block">
                    {selectedItemForAdjust.totalStock} Units
                  </span>
                </div>
              </div>

              {/* Branch Replenishment Cards */}
              <div>
                <label className="block text-slate-800 font-bold mb-2">
                  Branch On-Hand Inventory Levels
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {branches.map((b) => {
                    const currentStock = selectedItemForAdjust.branchStock
                      ? selectedItemForAdjust.branchStock[b.id] || 0
                      : 0;
                    const newStock = adjustBranchQtys[b.id] ?? currentStock;
                    const diff = newStock - currentStock;

                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          diff !== 0
                            ? 'border-blue-400 bg-blue-50/20 shadow-xs'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              {b.code}
                            </span>
                            <span className="ml-1.5 font-bold text-slate-900 text-xs">
                              {b.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Current: <strong className="font-mono text-slate-800">{currentStock} Units</strong>
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-slate-600">
                              Adjusted Stock:
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={newStock}
                              onChange={(e) =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-28 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-black text-sm text-center text-slate-900 focus:border-blue-500 focus:outline-hidden"
                            />
                            {diff !== 0 ? (
                              <span
                                className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md ${
                                  diff > 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                No Change
                              </span>
                            )}
                          </div>

                          {/* Quick Add/Subtract Steppers */}
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: Math.max(0, newStock - 5),
                                })
                              }
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: Math.max(0, newStock - 1),
                                })
                              }
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: newStock + 1,
                                })
                              }
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: newStock + 5,
                                })
                              }
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setAdjustBranchQtys({
                                  ...adjustBranchQtys,
                                  [b.id]: newStock + 10,
                                })
                              }
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded cursor-pointer"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Adjustment Reason & Audit Remark */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Audit Notes & Adjustment Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
                  placeholder="e.g. Physical stock count verification / Inbound restock"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Save Stock Levels
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Item Movement Lifecycle & Audit Timeline Modal */}
      {selectedItemForTimeline && (
        <StockItemTimelineModal
          item={selectedItemForTimeline}
          onClose={() => setSelectedItemForTimeline(null)}
          movements={movements}
          branches={branches}
          currentUser={currentUser}
        />
      )}

      {/* DUPLICATE CODE / PRODUCT RESOLUTION CONFIRMATION MODAL */}
      {isDuplicateChoiceModalOpen && duplicateChoiceData && (
        <div 
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto min-h-screen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDuplicateChoiceModalOpen(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-amber-200 my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Matching Product Detected
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Duplicate Description or Model Match Found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDuplicateChoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt explanation */}
            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed font-medium bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl">
                The product name or model you entered matches an existing item in the catalog. You can merge the incoming stock into the existing <strong className="text-amber-950 font-bold">SKU ({duplicateChoiceData.matchedItem.sku})</strong> or generate a separate <strong className="text-purple-950 font-bold">New SKU ({duplicateChoiceData.pendingItem.sku})</strong>.
              </p>

              {/* Product Comparison Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Existing item card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Existing Catalog Item</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-mono font-bold text-[10px]">
                      EXISTING
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{duplicateChoiceData.matchedItem.name}</div>
                  <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Product Code:</span>
                      <strong className="font-mono text-purple-700 font-bold">{duplicateChoiceData.matchedItem.sku}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span>{duplicateChoiceData.matchedItem.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Total Stock:</span>
                      <strong className="font-mono text-slate-900 font-bold">{duplicateChoiceData.matchedItem.totalStock} Units</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selling Price:</span>
                      <span className="font-mono font-bold text-blue-700">{formatMMK(duplicateChoiceData.matchedItem.sellingPrice)}</span>
                    </div>
                  </div>
                </div>

                {/* New input pending card */}
                <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Incoming New Entry</span>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-mono font-bold text-[10px]">
                      NEW INPUT
                    </span>
                  </div>
                  <div className="font-bold text-purple-950 text-sm">{duplicateChoiceData.pendingItem.name}</div>
                  <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                    <div className="flex justify-between">
                      <span>Product Code:</span>
                      <strong className="font-mono text-purple-900 font-bold">{duplicateChoiceData.pendingItem.sku}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span>{duplicateChoiceData.pendingItem.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stock to Add:</span>
                      <strong className="font-mono text-emerald-700 font-bold">
                        +{duplicateChoiceData.isFromMovement ? duplicateChoiceData.movementDetails?.quantity : duplicateChoiceData.pendingItem.totalStock} Units
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Selling Price:</span>
                      <span className="font-mono font-bold text-blue-700">{formatMMK(duplicateChoiceData.pendingItem.sellingPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Options */}
              <div className="space-y-2.5 pt-2">
                {/* Option A: Merge into Existing Code */}
                <button
                  type="button"
                  onClick={handleResolveWithExistingCode}
                  className="w-full text-left p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-500 rounded-2xl transition-all cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <span>Merge into Existing SKU ({duplicateChoiceData.matchedItem.sku})</span>
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-900 mt-0.5">
                          Adds incoming stock directly to existing code: <strong>{duplicateChoiceData.matchedItem.sku}</strong> (maintains unified inventory tracking)
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-700 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option B: Create New Separate Code */}
                <button
                  type="button"
                  onClick={handleResolveWithNewCode}
                  className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black shrink-0">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          Create Separate Entry with New SKU ({duplicateChoiceData.pendingItem.sku})
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Keep this product as a completely distinct catalog item with its own unique SKU
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setIsDuplicateChoiceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Cancel & Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Paste IMEI Modal */}
      {bulkPasteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Quick Bulk Paste IMEIs / Serial Numbers</h3>
                  <p className="text-[11px] text-slate-500">Paste multiple lines from Excel or barcode scanner</p>
                </div>
              </div>
              <button
                onClick={() => setBulkPasteModal({ isOpen: false, target: 'movement', text: '' })}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Paste IMEI / Serial Numbers (One per line or separated by commas):
              </label>
              <textarea
                rows={6}
                value={bulkPasteModal.text}
                onChange={(e) => setBulkPasteModal((prev) => ({ ...prev, text: e.target.value }))}
                placeholder="860123456789012&#10;860123456789013&#10;860123456789014"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-hidden"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Detected Count: <strong>{bulkPasteModal.text.split(/[\r\n,;|]+/).map(s => s.trim()).filter(Boolean).length}</strong> IMEIs
                </span>
                <span>Auto-expands quantity slots</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkPasteModal({ isOpen: false, target: 'movement', text: '' })}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs"
              >
                Apply IMEIs ({bulkPasteModal.text.split(/[\r\n,;|]+/).map(s => s.trim()).filter(Boolean).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iStock & Excel CSV Inventory Import Modal */}
      <CsvInventoryImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        inventory={inventory}
        branches={branches}
        currentUser={currentUser}
        activeBranchId={selectedBranchId}
        onBulkReplaceInventory={onBulkReplaceInventory}
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
        onLogActivity={onLogActivity}
      />
      {/* Sku Standard Manager Modal */}
      <SkuStandardManagerModal
        isOpen={isSkuStandardModalOpen}
        onClose={() => setIsSkuStandardModalOpen(false)}
        defaultCategory={category}
        onSelectStandard={(cfg) => {
          setBrand(cfg.brand);
          setCategory(cfg.category);
          setSkuCategoryFilter(cfg.category);
          if (!editingItem) {
            setSku(generateAutoSKU(cfg.category, inventory, [], cfg.brand, name));
          }
        }}
      />
    </div>
  );
};
