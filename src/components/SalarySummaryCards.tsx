import React from 'react';
import { 
  Banknote, 
  Users, 
  TrendingUp, 
  MinusCircle, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { SalaryRecord } from '../types';
import { formatMMK, formatNumber } from '../utils/formatters';

interface SalarySummaryCardsProps {
  records: SalaryRecord[];
  totalEmployeesCount: number;
}

export const SalarySummaryCards: React.FC<SalarySummaryCardsProps> = ({
  records,
  totalEmployeesCount,
}) => {
  const totalNet = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  const totalGross = records.reduce((sum, r) => sum + (r.totalEarnings || 0), 0);
  const totalOTandBonus = records.reduce(
    (sum, r) => sum + (r.otTotal || 0) + (r.attendanceBonus || 0) + (r.salesCommission || 0) + (r.performanceBonus || 0),
    0
  );
  const totalDeductions = records.reduce((sum, r) => sum + (r.totalDeductions || 0), 0);
  
  const paidRecords = records.filter(r => r.paymentStatus === 'Paid');
  const paidAmount = paidRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  const pendingRecords = records.filter(r => r.paymentStatus === 'Pending');
  const pendingAmount = pendingRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
      {/* Total Net Payroll */}
      <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-2xs">
        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
          Net Monthly Payroll
        </span>
        <div className="text-xl font-black text-purple-900 mt-1 font-mono">
          {formatMMK(totalNet)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>Gross Earnings:</span>
          <span className="font-semibold text-slate-700 font-mono">{formatMMK(totalGross)}</span>
        </div>
      </div>

      {/* Incentives, OT & Commission */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          OT, Incentives & Commission
        </span>
        <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
          +{formatMMK(totalOTandBonus)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>Processed Staff:</span>
          <span className="font-semibold text-slate-700">{records.length} Employees</span>
        </div>
      </div>

      {/* Deductions */}
      <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-2xs">
        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
          Total Deductions (Absent/Late/Leave)
        </span>
        <div className="text-xl font-black text-rose-700 mt-1 font-mono">
          -{formatMMK(totalDeductions)}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>Average per Staff:</span>
          <span className="font-semibold text-slate-700 font-mono">
            {formatMMK(records.length > 0 ? Math.round(totalDeductions / records.length) : 0)}
          </span>
        </div>
      </div>

      {/* Disbursement Status */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Disbursement Status
        </span>
        <div className="text-xl font-black text-slate-900 mt-1">
          <span className="text-purple-700">{paidRecords.length} Paid</span>
          <span className="text-slate-300 mx-1.5 font-normal">/</span>
          <span className="text-slate-600">{pendingRecords.length} Unpaid</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
          <span>Unpaid Balance:</span>
          <span className="font-semibold text-slate-700 font-mono">{formatMMK(pendingAmount)}</span>
        </div>
      </div>
    </div>
  );
};
