import React from 'react';
import { X, Printer, Download, Trash2 } from 'lucide-react';
import { SalaryRecord, UserAccount, Employee, canUserDeletePayrollSlip } from '../types';
import { formatMMK, getMonthName } from '../utils/formatters';
import { printOrSavePayslips, generateBatchPayslipsHTML } from '../utils/printHelpers';
import { formatTenureDisplay } from '../utils/tenureHelpers';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SalaryRecord | null;
  currentUser?: UserAccount;
  onDeleteRecord?: (id: string) => void;
  employees?: Employee[];
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  record,
  currentUser,
  onDeleteRecord,
  employees = [],
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-print-modal');
      return () => {
        document.body.classList.remove('has-print-modal');
      };
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  // Safe fallback normalization
  const validMonth = (record.month && record.month !== 'ALL') ? String(record.month) : '2026-09';
  const cleanRecord: SalaryRecord = {
    ...record,
    id: String(record.id || `sal-${Date.now()}`),
    employeeName: String(record.employeeName || 'Staff Member'),
    position: String(record.position || 'Staff'),
    department: String(record.department || 'General'),
    branchName: String(record.branchName || 'Main Branch'),
    actualDaysWorked: Number(record.actualDaysWorked ?? 26),
    workingDaysStandard: Number(record.workingDaysStandard ?? 26),
    basicSalary: Number(record.basicSalary || 0),
    netSalary: Number(record.netSalary ?? (record as any)?.netPayable ?? record.basicSalary ?? 0),
    month: validMonth,
  };

  const safeId = String(cleanRecord.id || '');
  const voucherCode = `SKTG-PS-${safeId.replace('sal-', '').slice(-6) || '000000'}`;

  const canDeleteVoucher = currentUser ? canUserDeletePayrollSlip(currentUser) : false;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete the payslip voucher for ${cleanRecord.employeeName}?`)) {
      if (onDeleteRecord) {
        onDeleteRecord(cleanRecord.id);
      }
      onClose();
    }
  };

  const handlePrint = () => {
    try {
      printOrSavePayslips([cleanRecord], validMonth, employees);
    } catch {
      window.print();
    }
  };

  const handleDownload = () => {
    try {
      const html = generateBatchPayslipsHTML([cleanRecord], validMonth, employees);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${cleanRecord.employeeName.replace(/\s+/g, '_')}_${validMonth}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Payslip download error:', err);
    }
  };

  // Safe tenure calculation
  const safeTenure = (() => {
    try {
      return formatTenureDisplay(cleanRecord, cleanRecord.joinedDate, cleanRecord.month, employees);
    } catch {
      return '1y';
    }
  })();

  const serviceAllowance = Number(cleanRecord.serviceAllowance ?? 0);
  const dutyAllowance = Number(cleanRecord.dutyAllowance ?? 0);
  const attendanceBonus = Number(cleanRecord.attendanceBonus ?? 0);
  const salesCommission = Number(cleanRecord.salesCommission ?? 0);
  const mealAllowance = Number(cleanRecord.mealAllowance ?? 0);
  const otTotal = Number(cleanRecord.otTotal ?? 0);
  const extraDaysPay = Number(cleanRecord.extraDaysPay ?? 0);
  const performanceBonus = Number(cleanRecord.performanceBonus ?? 0);
  const bonus = Number((cleanRecord as any).bonus ?? cleanRecord.performanceBonus ?? 0);

  const lateDeduct = Number(cleanRecord.lateDeduct ?? cleanRecord.deductionPenalty ?? 0);
  const absentDeduct = Number(cleanRecord.absentDeduct ?? 0);
  const unpaidLeave = Number(cleanRecord.unpaidLeave ?? 0);
  const deductionSSB = Number(cleanRecord.deductionSSB ?? 0);

  return (
    <div 
      className="printable-modal fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 flex items-center justify-center p-3 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden break-inside-avoid print:break-inside-avoid print:shadow-none print:border-slate-800">
        {/* Top Action Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
            <span className="text-xs sm:text-sm font-bold text-amber-300 truncate">
              {cleanRecord.employeeName} — Salary Slip ({getMonthName(cleanRecord.month)})
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canDeleteVoucher && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-xs cursor-pointer"
                title="Delete Voucher (MD Full Permission)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-xs cursor-pointer"
              title="Print / Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Clean Simple Payslip Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-slate-900 font-sans print:overflow-visible print:p-2" id="payslip-document">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-2 mb-3 text-center">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase">
              SHWE KYAL TAGON
            </h1>
            <h2 className="text-xs font-bold text-amber-900 mt-0.5 tracking-wider uppercase">
              SALARY VOUCHER — {getMonthName(cleanRecord.month)}
            </h2>
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
              <span>Voucher: {voucherCode}</span>
              <span>•</span>
              <span>Branch: {cleanRecord.branchName}</span>
            </div>
          </div>

          {/* Top Details Box (Crisp Spacing & Alignment) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 border border-slate-200 bg-slate-50/80 rounded-xl p-3 text-xs mb-3 shadow-xs">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Employee Name</span>
              <span className="font-black text-slate-950 text-xs sm:text-[13px] mt-1 leading-tight">{cleanRecord.employeeName}</span>
              {cleanRecord.employeeCode && (
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">{cleanRecord.employeeCode}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Position</span>
              <span className="font-bold text-slate-800 text-xs sm:text-[12px] mt-1 leading-tight">{cleanRecord.position}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Department</span>
              <span className="font-semibold text-slate-700 text-xs sm:text-[12px] mt-1 leading-tight">{cleanRecord.department}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Tenure</span>
              <div className="mt-1">
                <span className="font-extrabold text-purple-900 bg-purple-100 px-2 py-0.5 rounded text-[10px] inline-block">
                  {safeTenure}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Worked Days</span>
              <span className="font-bold text-slate-900 text-xs sm:text-[12px] mt-1 leading-tight">
                {cleanRecord.actualDaysWorked} / {cleanRecord.workingDaysStandard} Days
              </span>
              {(cleanRecord.extraDaysWorked ?? 0) > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{cleanRecord.extraDaysWorked} extra days</span>
              )}
            </div>
          </div>

          {/* Sequential Accounting Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-xs">
            {/* Earnings Items */}
            <div className="divide-y divide-slate-100 bg-white">
              <div className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-800 font-bold">Basic Pay</span>
                <span className="font-mono font-bold text-slate-950 text-sm">{formatMMK(cleanRecord.basicSalary)}</span>
              </div>
              <div className={`px-3.5 py-2 flex justify-between items-center ${serviceAllowance > 0 ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                <span className={serviceAllowance > 0 ? 'text-amber-950 font-bold' : 'text-slate-700 font-medium'}>Service Allowance</span>
                <span className={`font-mono font-semibold ${serviceAllowance > 0 ? 'text-amber-800 font-bold text-sm' : 'text-slate-400'}`}>
                  {serviceAllowance > 0 ? `+${formatMMK(serviceAllowance)}` : '0 MMK'}
                </span>
              </div>
              <div className={`px-3.5 py-2 flex justify-between items-center ${dutyAllowance > 0 ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}>
                <span className={dutyAllowance > 0 ? 'text-indigo-950 font-bold' : 'text-slate-700 font-medium'}>Duty Allowance</span>
                <span className={`font-mono font-semibold ${dutyAllowance > 0 ? 'text-indigo-800 font-bold text-sm' : 'text-slate-400'}`}>
                  {dutyAllowance > 0 ? `+${formatMMK(dutyAllowance)}` : '0 MMK'}
                </span>
              </div>
              <div className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-700 font-medium">Attendance Bonus</span>
                <span className={`font-mono font-semibold ${attendanceBonus > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  {attendanceBonus > 0 ? `+${formatMMK(attendanceBonus)}` : '0 MMK'}
                </span>
              </div>
              <div className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-700 font-medium">Bonus</span>
                <span className={`font-mono font-semibold ${bonus > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  {bonus > 0 ? `+${formatMMK(bonus)}` : '0 MMK'}
                </span>
              </div>
              <div className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-700 font-medium">Sales Commission</span>
                <span className={`font-mono font-semibold ${salesCommission > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  {salesCommission > 0 ? `+${formatMMK(salesCommission)}` : '0 MMK'}
                </span>
              </div>
              <div className="px-3.5 py-2 flex justify-between items-center hover:bg-slate-50/50">
                <span className="text-slate-700 font-medium">Meal Allowance</span>
                <span className={`font-mono font-semibold ${mealAllowance > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                  {mealAllowance > 0 ? `+${formatMMK(mealAllowance)}` : '0 MMK'}
                </span>
              </div>
              {otTotal > 0 && (
                <div className="px-3.5 py-2 flex justify-between items-center bg-emerald-50/40">
                  <span className="text-emerald-950 font-semibold">Overtime ({cleanRecord.otHours} hrs)</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">+{formatMMK(otTotal)}</span>
                </div>
              )}
              {extraDaysPay > 0 && (
                <div className="px-3.5 py-2 flex justify-between items-center bg-emerald-50/40">
                  <span className="text-emerald-950 font-semibold">Extra Days Pay ({cleanRecord.extraDaysWorked} days)</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">+{formatMMK(extraDaysPay)}</span>
                </div>
              )}
              {performanceBonus > 0 && (
                <div className="px-3.5 py-2 flex justify-between items-center bg-purple-50/40">
                  <span className="text-purple-950 font-semibold">Performance Bonus ({cleanRecord.bonusPeriodLabel || 'Target Bonus'})</span>
                  <span className="font-mono font-bold text-purple-800 text-sm">+{formatMMK(performanceBonus)}</span>
                </div>
              )}
            </div>

            {/* Deductions Header */}
            <div className="bg-slate-100 px-3.5 py-1.5 font-bold text-slate-800 border-t border-b border-slate-200 flex justify-between items-center text-[11px] uppercase tracking-wider">
              <span>Deductions</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {/* Late Deduct */}
              <div className="px-3.5 py-2 flex justify-between items-center">
                <div>
                  <span className="text-slate-700 font-medium">Late Deduct</span>
                  {cleanRecord.lateCount !== undefined && cleanRecord.lateCount > 0 && (
                    <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({cleanRecord.lateCount} times)</span>
                  )}
                </div>
                <span className={`font-mono font-semibold ${lateDeduct > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {lateDeduct > 0 ? `-${formatMMK(lateDeduct)}` : '0 MMK'}
                </span>
              </div>

              {/* Absent Deduct */}
              <div className="px-3.5 py-2 flex justify-between items-center">
                <div>
                  <span className="text-slate-700 font-medium">Absent Deduct</span>
                  {cleanRecord.absentDays !== undefined && cleanRecord.absentDays > 0 && (
                    <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({cleanRecord.absentDays} days)</span>
                  )}
                </div>
                <span className={`font-mono font-semibold ${absentDeduct > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {absentDeduct > 0 ? `-${formatMMK(absentDeduct)}` : '0 MMK'}
                </span>
              </div>

              {unpaidLeave > 0 && (
                <div className="px-3.5 py-2 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Unpaid Leave ({cleanRecord.unpaidLeaveDays || 0} days)</span>
                  <span className="font-mono font-semibold text-rose-700">-{formatMMK(unpaidLeave)}</span>
                </div>
              )}

              {deductionSSB > 0 && (
                <div className="px-3.5 py-2 flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Social Security (SSB)</span>
                  <span className="font-mono font-semibold text-rose-700">-{formatMMK(deductionSSB)}</span>
                </div>
              )}
            </div>

            {/* Total Salary Row */}
            <div className="bg-amber-50 px-3.5 py-3 border-t-2 border-slate-900 flex justify-between items-center">
              <div>
                <span className="font-black text-amber-950 text-xs sm:text-sm tracking-wider block uppercase">
                  NET PAYABLE
                </span>
              </div>
              <div className="text-base sm:text-xl font-black font-mono text-amber-950">
                {formatMMK(cleanRecord.netSalary)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
