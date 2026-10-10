import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Wrench,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Smartphone,
  CreditCard,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  SupplierReturn,
  PurchaseRecord,
  TreasuryAccount,
  UserAccount,
  InventoryItem
} from '../types';
import { formatMMK, formatDateDMY, formatNumber } from '../utils/formatters';
import { FormattedNumberInput } from './FormattedNumberInput';

interface RmaSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  rmaRecord: SupplierReturn;
  purchases: PurchaseRecord[];
  treasuryAccounts: TreasuryAccount[];
  currentUser: UserAccount;
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
}

export const RmaSettlementModal: React.FC<RmaSettlementModalProps> = ({
  isOpen,
  onClose,
  rmaRecord,
  purchases,
  treasuryAccounts,
  currentUser,
  onSettleRma,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Resolution type: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED'
  const [resolutionType, setResolutionType] = useState<'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED'>('REPLACED');

  const [settlementDate, setSettlementDate] = useState<string>(todayStr);

  // For Replacement: New Serial / IMEI numbers
  const [replacementImeisInput, setReplacementImeisInput] = useState<string>('');
  const [replacementItemName, setReplacementItemName] = useState<string>(rmaRecord.itemName);

  // For Refund or Debt Offset
  const [refundAmount, setRefundAmount] = useState<number>(rmaRecord.totalAmount);
  const [settledAccountId, setSettledAccountId] = useState<string>(treasuryAccounts[0]?.id || 'acc-cash-hq');
  
  useEffect(() => {
    if (!settledAccountId && treasuryAccounts && treasuryAccounts.length > 0) {
      setSettledAccountId(treasuryAccounts[0].id);
    }
  }, [treasuryAccounts, settledAccountId]);

  // For Supplier PO Debt Offset: pick open PO for this supplier
  const supplierOpenPOs = useMemo(() => {
    return purchases.filter((p) => {
      const isSupplierMatch = (p.supplierName || '').toLowerCase().trim() === (rmaRecord.supplierName || '').toLowerCase().trim();
      const hasDebt = (p.remainingDebt || 0) > 0 || p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL' || (p.paymentStatus as any) === 'CREDIT';
      return isSupplierMatch && hasDebt;
    });
  }, [purchases, rmaRecord.supplierName]);

  const [selectedPoId, setSelectedPoId] = useState<string>(supplierOpenPOs[0]?.id || '');

  useEffect(() => {
    if (!selectedPoId && supplierOpenPOs.length > 0) {
      setSelectedPoId(supplierOpenPOs[0].id);
    }
  }, [supplierOpenPOs, selectedPoId]);

  // Notes
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const selectedPo = useMemo(() => {
    return supplierOpenPOs.find((p) => p.id === selectedPoId);
  }, [supplierOpenPOs, selectedPoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const imeisArray = replacementImeisInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const finalRefundAmount = Number(refundAmount) || rmaRecord.totalAmount || 0;
    const finalAccountId = settledAccountId || treasuryAccounts[0]?.id || 'acc-cash-hq';

    onSettleRma(rmaRecord.id, resolutionType, {
      settlementDate,
      replacementImeis: resolutionType === 'REPLACED' ? imeisArray : undefined,
      replacementItemName: resolutionType === 'REPLACED' ? replacementItemName : undefined,
      refundAmount: (resolutionType === 'REFUNDED' || resolutionType === 'DEBT_DEDUCTED') ? finalRefundAmount : undefined,
      settledAccountId: resolutionType === 'REFUNDED' ? finalAccountId : undefined,
      settledPoId: resolutionType === 'DEBT_DEDUCTED' ? (selectedPo?.id || supplierOpenPOs[0]?.id) : undefined,
      settledPoInvoiceNo: resolutionType === 'DEBT_DEDUCTED' ? (selectedPo?.invoiceNo || supplierOpenPOs[0]?.invoiceNo) : undefined,
      resolutionNotes: resolutionNotes.trim() || undefined,
      performedBy: currentUser.displayName || 'Manager',
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-2xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Settle RMA Record</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-400/30">
                  {rmaRecord.returnCode || rmaRecord.returnNo}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Resolution for defective goods: Repair, Unit Swap Replacement, or Refund/Debt Offset
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700 text-xs">
          {/* Defective Item Info Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{rmaRecord.itemName}</span>
                <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                  SKU: {rmaRecord.sku || 'N/A'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700">Supplier: {rmaRecord.supplierName}</span>
                <span>•</span>
                <span>Qty: {rmaRecord.quantity} pcs</span>
                <span>•</span>
                <span className="text-rose-600 font-semibold">Defect: {rmaRecord.defectReason || rmaRecord.reason}</span>
              </div>
              {rmaRecord.imeiList && rmaRecord.imeiList.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">Defective IMEIs:</span>
                  {rmaRecord.imeiList.map((im, idx) => (
                    <span key={idx} className="font-mono text-[9.5px] bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                      {im}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:text-right bg-purple-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border border-purple-100 sm:border-0 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">Claim Value</span>
              <span className="text-lg font-black text-purple-900">{formatMMK(rmaRecord.totalAmount)}</span>
            </div>
          </div>

          {/* Resolution Path Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Select RMA Resolution Outcome *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Replaced with New Unit */}
              <button
                type="button"
                onClick={() => setResolutionType('REPLACED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  resolutionType === 'REPLACED'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <RefreshCw className={`w-4 h-4 ${resolutionType === 'REPLACED' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">New Unit</span>
                </div>
                <div>
                  <div className="font-extrabold text-xs">Unit Replacement</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Receive new replacement unit and restock into inventory</div>
                </div>
              </button>

              {/* 2. Repaired & Restocked */}
              <button
                type="button"
                onClick={() => setResolutionType('REPAIRED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  resolutionType === 'REPAIRED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Wrench className={`w-4 h-4 ${resolutionType === 'REPAIRED' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Fixed</span>
                </div>
                <div>
                  <div className="font-extrabold text-xs">Repaired & Restocked</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Item repaired by supplier/service center and restored to active stock</div>
                </div>
              </button>

              {/* 3. Refund / Debt Deduction */}
              <button
                type="button"
                onClick={() => setResolutionType('REFUNDED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  resolutionType === 'REFUNDED' || resolutionType === 'DEBT_DEDUCTED'
                    ? 'bg-purple-50 border-purple-500 text-purple-950 shadow-xs ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <DollarSign className={`w-4 h-4 ${resolutionType === 'REFUNDED' || resolutionType === 'DEBT_DEDUCTED' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">Money / Debt</span>
                </div>
                <div>
                  <div className="font-extrabold text-xs">Refund / Debt Offset</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">Receive monetary refund or deduct from open PO debt</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional Workflow 1: Unit Replacement Details */}
          {resolutionType === 'REPLACED' && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <div className="font-bold text-xs text-blue-950 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Replacement Unit Information</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Model Name
                </label>
                <input
                  type="text"
                  value={replacementItemName}
                  onChange={(e) => setReplacementItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Replacement IMEI / Serial Numbers (separated by comma or newline) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={replacementImeisInput}
                  onChange={(e) => setReplacementImeisInput(e.target.value)}
                  placeholder="e.g. 352849102948291, 352849102948292"
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10.5px] text-blue-700 mt-1">
                  ✓ This new unit will automatically be added into Active Inventory Stock with {formatMMK(rmaRecord.unitCost)} unit cost.
                </p>
              </div>
            </div>
          )}

          {/* Conditional Workflow 2: Repaired Details */}
          {resolutionType === 'REPAIRED' && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
              <div className="font-bold text-xs text-emerald-950 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Repaired Unit Confirmation</span>
              </div>
              <p className="text-xs text-emerald-900">
                The defective unit has been successfully serviced and repaired by supplier/service center. Upon settlement, this item ({rmaRecord.quantity} pcs) will be restored to your active sellable stock.
              </p>
            </div>
          )}

          {/* Conditional Workflow 3: Refund or PO Debt Offset */}
          {(resolutionType === 'REFUNDED' || resolutionType === 'DEBT_DEDUCTED') && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950">Financial Settlement Channel</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setResolutionType('REFUNDED')}
                    className={`px-3 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                      resolutionType === 'REFUNDED'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                  >
                    💵 Cash/Bank Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionType('DEBT_DEDUCTED')}
                    className={`px-3 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors ${
                      resolutionType === 'DEBT_DEDUCTED'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                  >
                    💳 Offset Supplier PO Debt
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Settlement Amount (MMK) *
                </label>
                <FormattedNumberInput
                  value={refundAmount}
                  onChange={(val) => setRefundAmount(val)}
                  className="w-full px-3.5 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {resolutionType === 'REFUNDED' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deposit Into Treasury Account *
                  </label>
                  <select
                    value={settledAccountId || (treasuryAccounts[0]?.id || 'acc-cash-hq')}
                    onChange={(e) => setSettledAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {treasuryAccounts.length === 0 ? (
                      <option value="acc-cash-hq">Cash In Hand (HQ / Main Register)</option>
                    ) : (
                      treasuryAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) — Bal: {formatMMK(acc.currentBalance)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {resolutionType === 'DEBT_DEDUCTED' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Open PO to Deduct Debt *
                  </label>
                  {supplierOpenPOs.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>No outstanding unpaid PO debts found for supplier &quot;{rmaRecord.supplierName}&quot;. Please choose Cash/Bank Refund instead.</span>
                    </div>
                  ) : (
                    <select
                      value={selectedPoId}
                      onChange={(e) => setSelectedPoId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {supplierOpenPOs.map((p) => (
                        <option key={p.id} value={p.id}>
                          PO #{p.invoiceNo} ({p.date}) — Remaining Debt: {formatMMK(p.remainingDebt || 0)} ({p.itemName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Settlement Date *
              </label>
              <input
                type="date"
                required
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolution Notes
              </label>
              <input
                type="text"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Service Center Ticket #8921, New unit received"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm RMA Resolution</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
