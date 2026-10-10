import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  AlertTriangle, 
  DollarSign, 
  Smartphone, 
  Building2, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Printer, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  InventoryItem, 
  Branch, 
  ContactPartner, 
  UserAccount, 
  TreasuryAccount, 
  SupplierReturn,
  PurchaseRecord,
  InventoryCategory
} from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';
import { getInStockImeisForBranch, getAvailableStockForBranch } from '../utils/inventoryHelper';

interface SupplierReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReturn: (returnRecord: SupplierReturn) => void;
  inventory: InventoryItem[];
  branches: Branch[];
  contacts?: ContactPartner[];
  currentUser: UserAccount;
  treasuryAccounts: TreasuryAccount[];
  initialItem?: InventoryItem | null;
  initialPurchase?: PurchaseRecord | null;
  purchases?: PurchaseRecord[];
  existingReturns?: SupplierReturn[];
}

const DEFECT_REASONS = [
  'Screen Error / Display Defect',
  'Motherboard / Power Failure',
  'Dead on Arrival (DOA)',
  'Audio / Camera / Mic Defect',
  'Battery / Charging Error',
  'Factory Defect / Quality Issue',
  'Wrong Model / Spec Delivered',
  'Other Defect / Error',
];

export const SupplierReturnModal: React.FC<SupplierReturnModalProps> = ({
  isOpen,
  onClose,
  onSubmitReturn,
  inventory,
  branches,
  contacts = [],
  currentUser,
  treasuryAccounts,
  initialItem,
  initialPurchase,
  purchases = [],
  existingReturns = [],
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultBranchId = currentUser.branchId !== 'ALL' 
    ? currentUser.branchId 
    : (branches[0]?.id || 'branch-1');

  const [date, setDate] = useState<string>(todayStr);
  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [category, setCategory] = useState<InventoryCategory>('Smartphones & Tablets');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [selectedImeis, setSelectedImeis] = useState<string[]>([]);
  const [customImeiInput, setCustomImeiInput] = useState<string>('');
  const [reason, setReason] = useState<string>(DEFECT_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string>('');

  // Auto-generate Return Voucher Number
  const returnNo = `RET-SUP-${date.replace(/-/g, '').slice(2, 6)}-${String(existingReturns.length + 1).padStart(3, '0')}`;

  // Populate from initial item or purchase
  useEffect(() => {
    if (initialPurchase && isOpen) {
      setPurchaseInvoiceNo(initialPurchase.invoiceNo);
      setSupplierName(initialPurchase.supplierName);
      setSupplierPhone(initialPurchase.supplierPhone || '');
      setBranchId(initialPurchase.branchId || defaultBranchId);
      setCustomItemName(initialPurchase.itemName);
      setCategory(initialPurchase.category);
      setUnitCost(initialPurchase.unitCost || 0);
      setQuantity(1);
      
      const poImeis = initialPurchase.imeiList || initialPurchase.serialNumbers || [];
      if (poImeis.length > 0) {
        setSelectedImeis([poImeis[0]]);
      } else {
        setSelectedImeis([]);
      }

      // Check if item exists in inventory
      const matchedInv = inventory.find(
        (i) => i.id === initialPurchase.inventoryItemId || i.name.toLowerCase() === initialPurchase.itemName.toLowerCase()
      );
      if (matchedInv) {
        setSelectedItemId(matchedInv.id);
      }
    } else if (initialItem && isOpen) {
      setSelectedItemId(initialItem.id);
      setCustomItemName(initialItem.name);
      setCategory(initialItem.category);
      setUnitCost(initialItem.costPrice || 0);
      if (initialItem.supplier) {
        setSupplierName(initialItem.supplier);
        const matchedContact = contacts.find(c => c.name.toLowerCase() === initialItem.supplier?.toLowerCase());
        if (matchedContact) setSupplierPhone(matchedContact.phone);
      }
      if (initialItem.imeiList && initialItem.imeiList.length > 0) {
        setSelectedImeis([initialItem.imeiList[0]]);
      }
    } else if (isOpen) {
      // Reset if opened fresh
      setDate(todayStr);
      setBranchId(defaultBranchId);
      setErrorBanner('');
      setPurchaseInvoiceNo('');
    }
  }, [initialItem, initialPurchase, isOpen]);

  if (!isOpen) return null;

  // Selected item object
  const selectedItem = inventory.find(i => i.id === selectedItemId);
  const availableStockInBranch = selectedItem ? getAvailableStockForBranch(selectedItem, branchId) : 999;
  const availableImeis = selectedItem
    ? getInStockImeisForBranch(selectedItem, branchId, { purchases, supplierReturns: existingReturns })
    : [];

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      setCustomItemName(item.name);
      setCategory(item.category);
      setUnitCost(item.costPrice || 0);
      if (item.supplier) {
        setSupplierName(item.supplier);
        const contact = contacts.find(c => c.name.toLowerCase() === item.supplier?.toLowerCase());
        if (contact) setSupplierPhone(contact.phone);
      }
      setSelectedImeis([]);
    }
  };

  const handleToggleImei = (imei: string) => {
    setSelectedImeis(prev => {
      if (prev.includes(imei)) {
        return prev.filter(i => i !== imei);
      } else {
        return [...prev, imei];
      }
    });
  };

  const handleAddCustomImei = () => {
    const trimmed = customImeiInput.trim();
    if (!trimmed) return;
    if (selectedImeis.includes(trimmed)) {
      setErrorBanner(`IMEI / SN [${trimmed}] has already been added`);
      return;
    }
    setSelectedImeis(prev => [...prev, trimmed]);
    setCustomImeiInput('');
    setErrorBanner('');
  };

  const totalAmount = unitCost * quantity;
  const effectiveReason = reason.startsWith('Other') && customReason.trim() ? customReason.trim() : reason;
  const activeBranch = branches.find(b => b.id === branchId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner('');

    const finalItemName = selectedItem ? selectedItem.name : customItemName.trim();
    if (!finalItemName) {
      setErrorBanner('Please select or enter an Item Name');
      return;
    }
    if (!supplierName.trim()) {
      setErrorBanner('Please select or enter a Supplier Name');
      return;
    }
    if (quantity <= 0) {
      setErrorBanner('Return quantity must be at least 1');
      return;
    }
    if (selectedItem && quantity > availableStockInBranch) {
      setErrorBanner(`Cannot return more than the available branch stock (${availableStockInBranch} pcs)`);
      return;
    }
    if (unitCost <= 0) {
      setErrorBanner('Please enter a valid Unit Cost');
      return;
    }

    const returnRecord: SupplierReturn = {
      id: `ret-${Date.now()}`,
      returnNo,
      returnCode: returnNo,
      date,
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim(),
      branchId,
      branchName: activeBranch ? activeBranch.name : 'Branch',
      itemId: selectedItem ? selectedItem.id : undefined,
      inventoryItemId: selectedItem ? selectedItem.id : undefined,
      itemName: finalItemName,
      sku: selectedItem?.sku || `RMA-${returnNo}`,
      category,
      imeiList: selectedImeis.length > 0 ? selectedImeis : undefined,
      serialNumbers: selectedImeis.length > 0 ? selectedImeis : undefined,
      quantity,
      unitCost,
      totalAmount,
      reason: effectiveReason,
      defectReason: effectiveReason,
      defectDescription: notes.trim(),
      actionTaken: 'PENDING_REPLACEMENT',
      resolutionMethod: 'REPLACEMENT',
      purchaseInvoiceNo: purchaseInvoiceNo || undefined,
      status: 'PENDING',
      notes: notes.trim(),
      performedBy: currentUser.displayName,
      recordedBy: currentUser.displayName,
      createdAt: new Date().toISOString(),
    };

    onSubmitReturn(returnRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <RotateCcw className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Supplier Return / RMA</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 font-mono font-bold border border-rose-700/50">
                  {returnNo}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Process defective or damaged items return to supplier for credit, refund or replacement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Top Row: Date, Branch, Return No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Return Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Branch *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-hidden focus:border-rose-500 cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Item Selection */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-rose-600" />
                Defective Item Selection *
              </span>
              {selectedItem && (
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Stock in {activeBranch?.name.split(' ')[0]}: <strong className="text-rose-700">{availableStockInBranch} pcs</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Select Item from Inventory
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:border-rose-500"
                >
                  <option value="">-- Choose Stock Item --</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.brand}) - SKU: {item.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Item Name / Model Code *
                </label>
                <input
                  type="text"
                  value={selectedItem ? selectedItem.name : customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max 256GB"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>
            </div>

            {/* Quantity & Unit Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Return Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem ? Math.max(1, availableStockInBranch) : 999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Unit Cost (MMK) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-hidden focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Total Refund Amount
                </label>
                <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-mono font-black text-sm">
                  {formatMMK(totalAmount)}
                </div>
              </div>
            </div>

            {/* IMEI / Serial Numbers Selection */}
            <div className="pt-2 border-t border-slate-200/80">
              <label className="block text-slate-700 font-bold mb-1.5 flex items-center justify-between">
                <span>Defective IMEI / Serial Numbers</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional for parts / accessories</span>
              </label>

              {/* If item has registered IMEIs */}
              {availableImeis.length > 0 && (
                <div className="mb-2">
                  <span className="text-[10px] text-slate-500 block mb-1">Registered IMEIs in Stock:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                    {availableImeis.map(imei => {
                      const isChecked = selectedImeis.includes(imei);
                      return (
                        <button
                          key={imei}
                          type="button"
                          onClick={() => handleToggleImei(imei)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-rose-600 text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isChecked ? '✓ ' : ''}{imei}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom IMEI input / manual barcode scanner */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Scan or type defective IMEI / SN..."
                  value={customImeiInput}
                  onChange={(e) => setCustomImeiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomImei();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomImei}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  + Add
                </button>
              </div>

              {selectedImeis.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedImeis.map(imei => (
                    <span 
                      key={imei} 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-mono font-bold text-[11px] border border-rose-200"
                    >
                      <span>{imei}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleImei(imei)}
                        className="text-rose-500 hover:text-rose-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Supplier Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Supplier Name *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Win Mobile Distribution"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:border-rose-500"
                  required
                />
                {contacts.filter(c => c.type === 'Supplier').length > 0 && (
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const c = contacts.find(contact => contact.name === e.target.value);
                      if (c) {
                        setSupplierName(c.name);
                        setSupplierPhone(c.phone);
                      }
                    }}
                    className="px-2 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
                  >
                    <option value="">Contacts</option>
                    {contacts.filter(c => c.type === 'Supplier').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Supplier Phone
              </label>
              <input
                type="text"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="09..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          {/* Defect Reason */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Defect / Error Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-rose-500 mb-2"
            >
              {DEFECT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {reason.startsWith('Other') && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify defect reason details..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-rose-500"
                required
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Return Notes / Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Return handled via Win Express, awaiting supplier review & resolution..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-rose-500 resize-none"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm Supplier Return ({formatMMK(totalAmount)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
