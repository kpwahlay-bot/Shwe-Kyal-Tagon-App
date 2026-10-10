import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Building, 
  Briefcase,
  Star,
  Trash2
} from 'lucide-react';
import { BonusSlipData, UserAccount, canUserDelete, canUserDeletePayrollSlip } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';
import { printOrSaveBonusSlips, generateBatchBonusSlipsHTML } from '../utils/printHelpers';

interface BonusSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slipData: BonusSlipData | null;
  currentUser?: UserAccount;
  onDeleteBonus?: (slip: BonusSlipData) => void;
}

export const BonusSlipModal: React.FC<BonusSlipModalProps> = ({
  isOpen,
  onClose,
  slipData,
  currentUser,
  onDeleteBonus,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !slipData) return null;

  const {
    employee = { id: '', name: 'Staff Member', position: 'Staff', department: 'General', code: 'EMP' },
    branchName = 'Branch',
    periodLabel = 'Performance Bonus',
    isManager = false,
    achievementRate = 0,
    bonusAmount = 0,
    date = new Date().toISOString().split('T')[0],
  } = slipData;

  const canDeleteVoucher = currentUser ? canUserDeletePayrollSlip(currentUser) : false;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete the incentive voucher for ${employee?.name || 'Staff'}?`)) {
      if (onDeleteBonus) {
        onDeleteBonus(slipData);
      }
      onClose();
    }
  };

  const handlePrint = () => {
    printOrSaveBonusSlips([slipData], periodLabel);
  };

  const handleDownload = () => {
    const html = generateBatchBonusSlipsHTML([slipData], periodLabel);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bonus_Slip_${employee?.name || 'Staff'}_${periodLabel}.html`;
    a.click();
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-lg max-w-xl w-full overflow-hidden border border-slate-300 my-auto flex flex-col max-h-[92vh]">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between no-print shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="text-xs sm:text-sm font-bold text-amber-300 truncate">
              {employee?.name || 'Staff'} - Bonus Slip ({periodLabel})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canDeleteVoucher && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                title="Delete Incentive Voucher (MD Full Permission)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Voucher</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Printable Bonus Slip Area */}
        <div className="p-4 space-y-2 bg-white text-slate-900 text-xs overflow-y-auto max-w-lg mx-auto w-full border border-slate-200 rounded-xl shadow-sm" id="bonus-slip-document">
          {/* Simple Clean Header */}
          <div className="text-center border-b-2 border-slate-900 pb-1.5 mb-2">
            <h1 className="text-sm font-black text-slate-950 uppercase tracking-tight">
              SHWE KYAL TAGON
            </h1>
            <p className="text-[10px] font-bold text-amber-900 tracking-wider uppercase">
              PERFORMANCE BONUS SLIP
            </p>
          </div>

          {/* Employee & Branch Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Name:</span>
              <span className="font-bold text-slate-950 text-xs block">{employee?.name}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Position:</span>
              <span className="font-semibold text-slate-800 text-[11px] block">{employee?.position}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Branch:</span>
              <span className="font-semibold text-purple-700 text-[11px] block">{branchName}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Department:</span>
              <span className="font-medium text-slate-700">{employee?.department}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Period:</span>
              <span className="font-bold text-slate-900">{periodLabel}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[9px] block font-semibold">Date:</span>
              <span className="font-medium text-slate-800 font-mono">{formatDateDMY(date)}</span>
            </div>
          </div>

          {/* Performance & Target Breakdown Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-1 font-bold text-slate-800 border-b border-slate-200 text-[10px] uppercase tracking-wider flex items-center justify-between">
              <span>Evaluation Metrics</span>
              {isManager && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-900 rounded border border-purple-200">
                  Operation Scope
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              <div className="px-3 py-2 flex justify-between items-center bg-slate-50/50">
                <span className="text-slate-700 font-semibold text-[11px]">Target Met Rate (%)</span>
                <span className="font-mono font-bold text-slate-900 text-[11px]">
                  {isManager ? '100.0% (Operation Scope)' : `${(achievementRate || 0).toFixed(1)}%`}
                </span>
              </div>
            </div>

            {/* Net Bonus Row */}
            <div className="bg-amber-50 px-3 py-2 border-t-2 border-slate-900 flex justify-between items-center">
              <div>
                <span className="font-black text-amber-950 text-[11px] uppercase tracking-wider block">
                  BONUS AMOUNT
                </span>
              </div>
              <div className="text-base font-black font-mono text-amber-950">
                {formatMMK(bonusAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


