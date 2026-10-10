import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { UserAccount, isMDUser, isYaminnwe } from '../types';

export interface ManagerAuthModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  actionDescription?: string;
  actionType?: 'VOID_SALE' | 'PRICE_OVERRIDE' | 'SPECIAL_DISCOUNT' | 'STOCK_ADJUST';
  users: UserAccount[];
  currentUser: UserAccount;
  requireReason?: boolean;
  onConfirm?: (authorizedBy: string, reason: string) => void;
  onAuthorized?: (authorizedBy: string, reason: string) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const VOID_REASONS = [
  'Customer Cancelled Transaction',
  'Cashier Wrong Entry / Incorrect Bill',
  'Defective Product Return / Exchange',
  'Payment / Digital Transfer Failed',
  'Customer Return / Refund Approved',
  'Duplicate Voucher Entry',
  'Other Special Authorization',
];

export const ManagerAuthModal: React.FC<ManagerAuthModalProps> = ({
  isOpen,
  title = 'Manager Authorization Required',
  description,
  actionDescription,
  actionType = 'VOID_SALE',
  users,
  currentUser,
  requireReason = true,
  onConfirm,
  onAuthorized,
  onCancel,
  onClose,
}) => {
  // Find all authorized managers: MD, Sales Manager, Admin, or Operation
  const authorizedManagers = users.filter(
    (u) => isMDUser(u) || u.role === 'Sales Manager' || u.role === 'Admin' || isYaminnwe(u)
  );

  // If somehow empty, guarantee MD is available
  if (authorizedManagers.length === 0) {
    const mdFallback = users.find((u) => isMDUser(u)) || currentUser;
    authorizedManagers.push(mdFallback);
  }

  const [selectedManagerId, setSelectedManagerId] = useState<string>(
    authorizedManagers[0]?.id || ''
  );
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const displayDesc = actionDescription || description || 'Authorize sensitive action';

  const handleDismiss = () => {
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  const handleVerifyAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetManager =
      authorizedManagers.find((m) => m.id === selectedManagerId) || authorizedManagers[0];

    if (!targetManager) {
      setErrorMsg('Please select an authorizing Manager or Admin.');
      return;
    }

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMsg('ကျေးဇူးပြု၍ Manager Security PIN သို့မဟုတ် စကားဝှက် ထည့်သွင်းပေးပါ။');
      return;
    }

        // The PIN must match the one saved on the authorizing manager's profile. No built-in master PINs.
    const isPinMatch = Boolean(targetManager.pin && targetManager.pin === cleanPin);

    if (!isPinMatch) {
      setErrorMsg('လုံခြုံရေး PIN သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။ ');
      return;
    }

    const finalReason = reason.includes('Other') && customReason.trim()
      ? customReason.trim()
      : reason;

    // Trigger both callback signatures to guarantee execution
    if (onAuthorized) {
      onAuthorized(targetManager.displayName, finalReason);
    }
    if (onConfirm) {
      onConfirm(targetManager.displayName, finalReason);
    }

    setPin('');
    setErrorMsg('');
    handleDismiss();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {title}
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Elevated privileges required for this action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleVerifyAndSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-950">{title}</div>
              <div className="text-amber-800/90 mt-0.5 leading-relaxed">{displayDesc}</div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selecting Authorizing Manager */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Authorizing Manager / Admin
            </label>
            <select
              value={selectedManagerId}
              onChange={(e) => {
                setSelectedManagerId(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-hidden transition-all font-medium text-slate-800"
            >
              {authorizedManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role} - {m.branchName || 'All Branches'})
                </option>
              ))}
            </select>
          </div>

          {/* Reason Selection */}
          {requireReason && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Authorization Reason (Mandatory)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-hidden transition-all text-slate-800"
              >
                {VOID_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {reason.includes('Other') && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific reason details..."
                  className="mt-2 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-hidden transition-all"
                  required
                />
              )}
            </div>
          )}

          {/* PIN Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Manager Security PIN / Password</span>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Default MD PIN: 2026
              </span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="PIN (2026) သို့မဟုတ် Password ရိုက်ထည့်ပါ"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 text-base tracking-widest font-mono bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-hidden transition-all"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>MD PIN သို့မဟုတ် စကားဝှက် ရိုက်ထည့်နိုင်ပါသည်။</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Authorize & Confirm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
