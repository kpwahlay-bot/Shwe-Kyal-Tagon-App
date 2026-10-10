import React, { useState, useMemo } from 'react';
import {
  X,
  Wallet,
  Coins,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  AlertTriangle,
  Receipt,
  Printer,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  FileText
} from 'lucide-react';
import { DailySale, SaleInstallment, TreasuryAccount, ContactPartner } from '../types';
import { formatMMK, formatDateDMY, formatNumber } from '../utils/formatters';
import { FormattedNumberInput } from './FormattedNumberInput';
import { getOrGenerateSaleInstallments } from './ContactPartners';

interface CustomerDebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  partnerId?: string;
  totalDebt: number;
  unpaidSales?: DailySale[];
  targetSale?: DailySale;
  treasuryAccounts: TreasuryAccount[];
  onConfirmPayment: (
    partnerId: string | undefined,
    customerName: string,
    customerPhone: string | undefined,
    paymentAmount: number,
    accountId: string,
    notes?: string,
    voucherId?: string,
    paymentMethod?: string
  ) => void;
}

export const CustomerDebtPaymentModal: React.FC<CustomerDebtPaymentModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  partnerId,
  totalDebt,
  unpaidSales = [],
  targetSale,
  treasuryAccounts,
  onConfirmPayment,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Selected payment target mode: 'FULL' | 'INSTALLMENT' | 'CUSTOM' | 'VOUCHER'
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'INSTALLMENT' | 'CUSTOM'>('FULL');
  
  // Selected voucher ID if paying a specific voucher
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>(targetSale?.id || (unpaidSales[0]?.id || ''));
  
  // Custom amount state
  const [customAmount, setCustomAmount] = useState<number>(Math.min(50000, totalDebt));
  
  // Selected installment number if paying by installment
  const [selectedInstallmentNo, setSelectedInstallmentNo] = useState<number>(1);

  // Payment channel and treasury account
  const defaultAccId = treasuryAccounts[0]?.id || '';
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccId);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);

  // Currently focused sale (for installment calculation)
  const activeSale = useMemo(() => {
    if (targetSale) return targetSale;
    if (selectedVoucherId) {
      return unpaidSales.find((s) => s.id === selectedVoucherId) || unpaidSales[0];
    }
    return unpaidSales[0];
  }, [targetSale, selectedVoucherId, unpaidSales]);

  // Installment schedule for active sale
  const installmentSchedule = useMemo(() => {
    if (!activeSale) return [];
    return getOrGenerateSaleInstallments(activeSale);
  }, [activeSale]);

  // Calculate the actual payment amount based on paymentMode
  const calculatedPayAmount = useMemo(() => {
    if (paymentMode === 'FULL') {
      return totalDebt;
    }
    if (paymentMode === 'INSTALLMENT') {
      const inst = installmentSchedule.find((i) => i.installmentNo === selectedInstallmentNo);
      if (inst) {
        return Math.min(inst.amount, totalDebt);
      }
      return Math.min(installmentSchedule[0]?.amount || 50000, totalDebt);
    }
    if (paymentMode === 'CUSTOM') {
      return Math.min(customAmount, totalDebt);
    }
    return 0;
  }, [paymentMode, totalDebt, installmentSchedule, selectedInstallmentNo, customAmount]);

  // Remaining debt after this payment
  const remainingAfterPay = Math.max(0, totalDebt - calculatedPayAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedPayAmount <= 0) return;

    const chosenVoucherId = (paymentMode === 'INSTALLMENT' || targetSale) ? activeSale?.id : undefined;
    
    let noteText = notes.trim();
    if (!noteText) {
      if (paymentMode === 'FULL') {
        noteText = 'Full Debt Clearance';
      } else if (paymentMode === 'INSTALLMENT') {
        const inst = installmentSchedule.find((i) => i.installmentNo === selectedInstallmentNo);
        noteText = `Month ${selectedInstallmentNo} (${inst?.monthName || ''}) Installment Payment`;
      } else {
        noteText = 'Partial Debt Payment';
      }
    }

    onConfirmPayment(
      partnerId,
      customerName,
      customerPhone,
      calculatedPayAmount,
      selectedAccountId,
      noteText,
      chosenVoucherId,
      paymentMethod
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Pay Customer Debt</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Direct Payment
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Customer debt settlement, monthly installments & balance payoff
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
          {/* Debtor Profile Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900">{customerName}</span>
                {customerPhone && (
                  <span className="text-[11px] font-mono text-slate-600 font-semibold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customerPhone}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{unpaidSales.length} Unpaid Voucher{unpaidSales.length > 1 ? 's' : ''}</span>
                {activeSale?.invoiceNo && (
                  <span>• Latest PO #{activeSale.invoiceNo}</span>
                )}
              </div>
            </div>

            <div className="sm:text-right bg-rose-50 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-rose-100 sm:border-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Total Balance Due</span>
              <span className="text-lg font-black text-rose-700">{formatMMK(totalDebt)}</span>
            </div>
          </div>

          {/* Step 1: Choose Settlement Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              1. Select Settlement Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('FULL')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMode === 'FULL'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Coins className={`w-4 h-4 ${paymentMode === 'FULL' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="font-extrabold text-[11px]">Pay Full Debt</span>
                <span className="text-[9.5px] text-slate-500 font-medium">Clear entire balance</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('INSTALLMENT')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMode === 'INSTALLMENT'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className={`w-4 h-4 ${paymentMode === 'INSTALLMENT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="font-extrabold text-[11px]">Pay by Month</span>
                <span className="text-[9.5px] text-slate-500 font-medium">Installment plan</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('CUSTOM')}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  paymentMode === 'CUSTOM'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-2 ring-purple-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className={`w-4 h-4 ${paymentMode === 'CUSTOM' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="font-extrabold text-[11px]">Custom Amount</span>
                <span className="text-[9.5px] text-slate-500 font-medium">Partial payment</span>
              </button>
            </div>
          </div>

          {/* Mode-Specific Controls */}
          {paymentMode === 'INSTALLMENT' && (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950">
                  Monthly Installment Plan ({installmentSchedule.length} Months)
                </span>
                {activeSale && (
                  <span className="font-mono text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md font-bold">
                    Voucher #{activeSale.invoiceNo || activeSale.id}
                  </span>
                )}
              </div>

              {/* Installment Selector Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {installmentSchedule.map((inst) => {
                  const isSelected = selectedInstallmentNo === inst.installmentNo;
                  const isPaid = inst.status === 'PAID';
                  return (
                    <button
                      key={inst.installmentNo}
                      type="button"
                      disabled={isPaid}
                      onClick={() => setSelectedInstallmentNo(inst.installmentNo)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isPaid
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-100/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Month {inst.installmentNo}</span>
                        {isPaid ? (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">PAID</span>
                        ) : (
                          <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>{inst.dueDate}</span>
                        )}
                      </div>
                      <div className={`text-xs font-black mt-1 ${isSelected ? 'text-white' : 'text-indigo-950'}`}>
                        {formatMMK(inst.amount)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {paymentMode === 'CUSTOM' && (
            <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-bold text-purple-950">
                Enter Repayment Amount (MMK)
              </label>
              <FormattedNumberInput
                value={customAmount}
                onChange={(val) => setCustomAmount(Math.min(val, totalDebt))}
                className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl text-sm font-black text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0"
              />
              
              {/* Quick Amount Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-purple-700 mr-1">Quick:</span>
                {[10000, 50000, 100000, 200000, 500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomAmount(Math.min(amt, totalDebt))}
                    className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    +{formatNumber(amt / 1000)}k
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomAmount(totalDebt)}
                  className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  Max ({formatMMK(totalDebt)})
                </button>
              </div>
            </div>
          )}

          {/* Payment Account & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receive Account *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  const acc = treasuryAccounts.find((a) => a.id === e.target.value);
                  if (acc) {
                    if (acc.type === 'CASH') setPaymentMethod('Cash');
                    else if (acc.name.toLowerCase().includes('kbz') || acc.name.toLowerCase().includes('kpay')) setPaymentMethod('KBZPay');
                    else if (acc.name.toLowerCase().includes('wave')) setPaymentMethod('WavePay');
                    else setPaymentMethod('Bank Transfer');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {treasuryAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) — Bal: {formatMMK(acc.currentBalance)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Cash">Cash</option>
                <option value="KBZPay">KBZPay</option>
                <option value="CB Pay">CB Pay</option>
                <option value="AYA Pay">AYA Pay</option>
                <option value="UAB Pay">UAB Pay</option>
                <option value="WavePay">WavePay</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Payment Date & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notes / Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Month 1 installment, KBZPay slip #1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Summary Calculation Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Total Current Debt:</span>
              <span className="font-bold">{formatMMK(totalDebt)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-400 font-bold border-t border-slate-800 pt-2">
              <span>Paying Now:</span>
              <span className="text-sm font-black text-emerald-300">+{formatMMK(calculatedPayAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2">
              <span className="text-slate-300">New Balance Remaining:</span>
              <span className={`text-sm font-black ${remainingAfterPay === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {remainingAfterPay === 0 ? '0 MMK (FULLY SETTLED! 🎉)' : formatMMK(remainingAfterPay)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={calculatedPayAmount <= 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                calculatedPayAmount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Settle {formatMMK(calculatedPayAmount)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
