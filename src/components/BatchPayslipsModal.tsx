import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Scissors, 
  CheckSquare, 
  Square, 
  Building2, 
  Users,
  Star
} from 'lucide-react';
import { SalaryRecord, Branch, Employee } from '../types';
import { formatMMK, formatNumber, getMonthName } from '../utils/formatters';
import { printOrSavePayslips, generateBatchPayslipsHTML } from '../utils/printHelpers';
import { formatTenureDisplay } from '../utils/tenureHelpers';

interface BatchPayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salaryRecords?: SalaryRecord[] | SalaryRecord | any;
  branches?: Branch[];
  selectedMonth?: string;
  employees?: Employee[];
}

export const BatchPayslipsModal: React.FC<BatchPayslipsModalProps> = ({
  isOpen,
  onClose,
  salaryRecords = [],
  branches = [],
  selectedMonth: initialSelectedMonth = '2026-09',
  employees = [],
}) => {
  // Normalize salaryRecords safely (handles single object, array, or null)
  const safeRecords: SalaryRecord[] = (() => {
    if (!salaryRecords) return [];
    if (Array.isArray(salaryRecords)) return salaryRecords.filter(Boolean);
    if (typeof salaryRecords === 'object') return [salaryRecords as SalaryRecord];
    return [];
  })();

  const safeBranches = Array.isArray(branches) ? branches.filter(Boolean) : [];

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (initialSelectedMonth && initialSelectedMonth !== 'ALL') return initialSelectedMonth;
    if (safeRecords.length > 0 && safeRecords[0]?.month && safeRecords[0]?.month !== 'ALL') return safeRecords[0].month;
    return new Date().toISOString().slice(0, 7);
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Sync when initialSelectedMonth prop changes
  React.useEffect(() => {
    if (initialSelectedMonth && initialSelectedMonth !== 'ALL') {
      setSelectedMonth(initialSelectedMonth);
    }
  }, [initialSelectedMonth]);

  // Month filtered records (or all records if selectedMonth is ALL)
  const monthRecords = safeRecords.filter(
    (r) => r && (!selectedMonth || selectedMonth === 'ALL' || r.month === selectedMonth)
  );

  // Filtered by branch & dept
  const filteredRecords = monthRecords.filter((rec) => {
    if (!rec) return false;
    if (selectedBranchId !== 'ALL' && rec.branchId !== selectedBranchId) return false;
    if (selectedDept !== 'ALL' && rec.department !== selectedDept) return false;
    return true;
  });

  // Initialize selected IDs when modal opens or month/filters change
  React.useEffect(() => {
    if (isOpen) {
      setSelectedRecordIds(filteredRecords.map((r) => r?.id).filter(Boolean));
    }
  }, [isOpen, selectedMonth, selectedBranchId, selectedDept, monthRecords.length]);

  React.useEffect(() => {
    if (isOpen && typeof document !== 'undefined' && document.body) {
      document.body.classList.add('has-print-modal');
      return () => {
        document.body.classList.remove('has-print-modal');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rawPrintList = filteredRecords.filter((r) => r && r.id && selectedRecordIds.includes(r.id));
  const recordsToPrint: SalaryRecord[] = Array.isArray(rawPrintList) ? rawPrintList.filter(Boolean) : [];

  // Group payslips into pairs of 2 per physical A5 page (handles single payslip safely)
  const payslipPairs: SalaryRecord[][] = [];
  if (recordsToPrint.length === 1) {
    payslipPairs.push([recordsToPrint[0]]);
  } else {
    for (let i = 0; i < recordsToPrint.length; i += 2) {
      const chunk = recordsToPrint.slice(i, i + 2);
      if (chunk.length > 0) {
        payslipPairs.push(chunk);
      }
    }
  }

  const handleToggleSelectAll = () => {
    if (selectedRecordIds.length === filteredRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map((r) => r.id).filter(Boolean));
    }
  };

  const handleToggleRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadFile = () => {
    const html = generateBatchPayslipsHTML(recordsToPrint, selectedMonth, employees);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staff_Payslips_${selectedMonth}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Unique departments for filter
  const departments = Array.from(
    new Set(
      monthRecords
        .map((r) => (typeof r?.department === 'string' ? r.department : ''))
        .filter(Boolean)
    )
  );

  return (
    <div className="printable-modal fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible">
      {/* Control Bar (Hidden when Printing) */}
      <div className="no-print bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 max-w-4xl w-full p-4 mb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <span>All Payslips Print & PDF</span>
              </h2>
              <p className="text-xs text-slate-300">
                Period: {getMonthName(selectedMonth)} • Selected ({recordsToPrint.length} slips)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  printOrSavePayslips(recordsToPrint, selectedMonth, employees);
                } catch {
                  window.print();
                }
              }}
              disabled={recordsToPrint.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadFile}
              disabled={recordsToPrint.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 border border-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              title="Download HTML file for print"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Selection Bar */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition cursor-pointer border border-slate-700"
            >
              {selectedRecordIds.length === filteredRecords.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All ({filteredRecords.length})</span>
                </>
              )}
            </button>

            {/* Month Filter */}
            <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-amber-400 font-bold text-[10px] uppercase">Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  const newFiltered = monthRecords.filter((rec) => {
                    if (e.target.value !== 'ALL' && rec.branchId !== e.target.value) return false;
                    if (selectedDept !== 'ALL' && rec.department !== selectedDept) return false;
                    return true;
                  });
                  setSelectedRecordIds(newFiltered.map((r) => r.id).filter(Boolean));
                }}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Branches</option>
                {safeBranches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    const newFiltered = monthRecords.filter((rec) => {
                      if (selectedBranchId !== 'ALL' && rec.branchId !== selectedBranchId) return false;
                      if (e.target.value !== 'ALL' && rec.department !== e.target.value) return false;
                      return true;
                    });
                    setSelectedRecordIds(newFiltered.map((r) => r.id).filter(Boolean));
                  }}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">All Departments</option>
                  {departments.map((dept) => (
                    <option key={String(dept)} value={String(dept)} className="bg-slate-900 text-white">
                      {String(dept)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-slate-400 text-[11px] font-mono">
            {recordsToPrint.length} of {monthRecords.length} payslips ready
          </div>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="w-full max-w-4xl bg-slate-200/90 p-3 sm:p-5 rounded-2xl overflow-y-auto max-h-[85vh] print:p-0 print:m-0 print:bg-white print:max-h-none print:overflow-visible">
        {recordsToPrint.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500 font-semibold shadow-sm">
            No salary slips selected
          </div>
        ) : (
          /* Grouped Pairs: Strictly 2 Payslips per A5 Page in Flex Column with Cut Line */
          <div className="space-y-6 print:space-y-0">
            {payslipPairs.map((pair, pageIndex) => {
              const isLastPage = pageIndex === payslipPairs.length - 1;

              return (
                <div
                  key={`page-${pageIndex}`}
                  className={`flex flex-col justify-start print:break-after-page ${!isLastPage ? 'break-after-page' : ''} mb-6 print:mb-0 print:h-auto print:max-h-[20.2cm] print:overflow-hidden`}
                  style={{
                    breakAfter: !isLastPage ? 'page' : 'auto',
                    pageBreakAfter: !isLastPage ? 'always' : 'auto',
                  }}
                >
                  {pair.map((record, indexInPair) => {
                    if (!record) return null;
                    const overallIndex = pageIndex * 2 + indexInPair;
                    const isSelected = selectedRecordIds.includes(record.id);

                    return (
                      <React.Fragment key={record.id || overallIndex}>
                        <div
                          className="box-border bg-white rounded-xl border border-slate-300 p-2 sm:p-2.5 pb-2 shadow-sm break-inside-avoid print:break-inside-avoid print:shadow-none print:w-full print:border-slate-800 print:p-1.5 print:px-2.5 print:rounded-md"
                          style={{
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* Selection Checkbox for Interactive View (Hidden on Print, non-absolute) */}
                          <div className="no-print flex justify-end mb-1">
                            <button
                              type="button"
                              onClick={() => handleToggleRecord(record.id)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 hover:text-amber-600 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title={isSelected ? 'Deselect' : 'Select'}
                            >
                              {isSelected ? (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                  <span className="text-slate-700">Selected #{overallIndex + 1}</span>
                                </>
                              ) : (
                                <>
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-slate-400">Unselected</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Company Header (Clear, static block at top) */}
                          <div className="border-b-2 border-slate-900 pb-1 mb-1 text-center static print:pb-0.5 print:mb-1">
                            <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-950 uppercase leading-none print:text-xs">
                              SHWE KYAL TAGON
                            </h1>
                            <h2 className="text-[10px] sm:text-[10.5px] font-bold text-amber-900 mt-0.5 tracking-wider leading-none print:text-[9.5px]">
                              SALARY SLIP ({getMonthName(record.month)})
                            </h2>
                          </div>

                          {/* Top Details Box */}
                          <div className="grid grid-cols-[1.5fr_1.5fr_2fr_1fr_1.5fr] gap-x-3 items-start border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs mb-1.5 print:mb-1 box-border">
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[8px] font-bold uppercase tracking-wider leading-none">NAME:</span>
                              <div className="flex flex-col mt-0.5">
                                <span className="font-extrabold text-slate-950 text-xs truncate leading-tight">{record.employeeName || 'Staff'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[8px] font-bold uppercase tracking-wider leading-none">POSITION:</span>
                              <div className="flex flex-col mt-0.5">
                                <span className="font-bold text-slate-800 text-[11px] truncate leading-tight">{record.position || 'Staff'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[8px] block font-bold uppercase tracking-wider leading-none">DEPARTMENT:</span>
                              <div className="flex flex-col mt-0.5">
                                <span className="font-semibold text-slate-700 text-[11px] truncate leading-tight">{typeof record.department === 'string' ? record.department : 'General'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[8px] block font-bold uppercase tracking-wider leading-none">TENURE:</span>
                              <div className="flex flex-col mt-0.5">
                                <span className="font-bold text-purple-900 bg-purple-100 px-1.5 py-0.5 rounded text-[10px] inline-block leading-none w-fit">
                                  {formatTenureDisplay(record, record.joinedDate, record.month, employees)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[8px] block font-bold uppercase tracking-wider leading-none">WORKED DAYS:</span>
                              <div className="flex flex-col mt-0.5">
                                <span className="font-bold text-slate-900 text-[11px] leading-tight truncate">{(record.actualDaysWorked ?? 0)} / {(record.workingDaysStandard ?? 26)} Days</span>
                              </div>
                            </div>
                          </div>

                          {/* Sequential Vertical Table */}
                          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs box-border">
                            {/* Earnings Items with exact 0.6cm height */}
                            <div className="divide-y divide-slate-100 bg-white">
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <span className="text-slate-800 font-bold">Basic Pay</span>
                                <span className="font-mono font-bold text-slate-950 text-sm">{formatMMK(record.basicSalary)}</span>
                              </div>
                              <div className={`flex justify-between h-[0.6cm] items-center px-3 ${(record.serviceAllowance ?? 0) > 0 ? 'bg-amber-50/60' : ''}`}>
                                <span className={`${(record.serviceAllowance ?? 0) > 0 ? 'text-amber-950 font-bold' : 'text-slate-700 font-medium'}`}>Service Allowance</span>
                                <span className={`font-mono font-semibold ${(record.serviceAllowance ?? 0) > 0 ? 'text-amber-800 font-bold' : 'text-slate-400'}`}>
                                  {(record.serviceAllowance ?? 0) > 0 ? `+${formatMMK(record.serviceAllowance || 0)}` : '0 MMK'}
                                </span>
                              </div>
                              <div className={`flex justify-between h-[0.6cm] items-center px-3 ${(record.dutyAllowance ?? 0) > 0 ? 'bg-indigo-50/50' : ''}`}>
                                <span className={`${(record.dutyAllowance ?? 0) > 0 ? 'text-indigo-950 font-bold' : 'text-slate-700 font-medium'}`}>Duty Allowance</span>
                                <span className={`font-mono font-semibold ${(record.dutyAllowance ?? 0) > 0 ? 'text-indigo-800 font-bold' : 'text-slate-400'}`}>
                                  {(record.dutyAllowance ?? 0) > 0 ? `+${formatMMK(record.dutyAllowance || 0)}` : '0 MMK'}
                                </span>
                              </div>
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <span className="text-slate-700 font-medium">Attendance Bonus</span>
                                <span className={`font-mono font-semibold ${(record.attendanceBonus ?? 0) > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                  {(record.attendanceBonus ?? 0) > 0 ? `+${formatMMK(record.attendanceBonus ?? 0)}` : '0 MMK'}
                                </span>
                              </div>
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <span className="text-slate-700 font-medium">Bonus</span>
                                <span className={`font-mono font-semibold ${((record.bonus ?? record.performanceBonus ?? 0) > 0) ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                  {((record.bonus ?? record.performanceBonus ?? 0) > 0) ? `+${formatMMK(record.bonus ?? record.performanceBonus ?? 0)}` : '0 MMK'}
                                </span>
                              </div>
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <span className="text-slate-700 font-medium">Sales Commission</span>
                                <span className={`font-mono font-semibold ${(record.salesCommission ?? 0) > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                  {(record.salesCommission ?? 0) > 0 ? `+${formatMMK(record.salesCommission ?? 0)}` : '0 MMK'}
                                </span>
                              </div>
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <span className="text-slate-700 font-medium">Meal Allowance</span>
                                <span className={`font-mono font-semibold ${(record.mealAllowance ?? 0) > 0 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                  {(record.mealAllowance ?? 0) > 0 ? `+${formatMMK(record.mealAllowance ?? 0)}` : '0 MMK'}
                                </span>
                              </div>
                            </div>

                            {/* 2. Deductions Section with exact 0.6cm height */}
                            <div className="flex justify-between h-[0.6cm] items-center px-3 bg-slate-100 font-bold text-slate-800 border-t border-b border-slate-200 text-[11px] uppercase tracking-wider">
                              <span>Deductions</span>
                            </div>
                            <div className="divide-y divide-slate-100 bg-white">
                              {/* Late Deduct */}
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <div>
                                  <span className="text-slate-700 font-medium">Late Deduct</span>
                                  {record.lateCount !== undefined && record.lateCount > 0 && (
                                    <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({record.lateCount} times)</span>
                                  )}
                                </div>
                                <span className={`font-mono font-semibold ${((record.lateDeduct ?? record.deductionPenalty ?? 0) > 0) ? 'text-rose-700' : 'text-slate-400'}`}>
                                  {((record.lateDeduct ?? record.deductionPenalty ?? 0) > 0) 
                                    ? `-${formatMMK(record.lateDeduct ?? record.deductionPenalty ?? 0)}` 
                                    : '0 MMK'}
                                </span>
                              </div>

                              {/* Absent Deduct */}
                              <div className="flex justify-between h-[0.6cm] items-center px-3">
                                <div>
                                  <span className="text-slate-700 font-medium">Absent Deduct</span>
                                  {record.absentDays !== undefined && record.absentDays > 0 && (
                                    <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({record.absentDays} days)</span>
                                  )}
                                </div>
                                <span className={`font-mono font-semibold ${((record.absentDeduct || 0) > 0) ? 'text-rose-700' : 'text-slate-400'}`}>
                                  {((record.absentDeduct || 0) > 0) ? `-${formatMMK(record.absentDeduct)}` : '0 MMK'}
                                </span>
                              </div>
                            </div>

                            {/* 3. Total Salary Row (Directly Below Deductions) */}
                            <div className="flex justify-between h-[0.65cm] items-center px-3 bg-amber-50 border-t-2 border-slate-900">
                              <span className="font-black text-amber-950 text-xs tracking-wider uppercase">
                                TOTAL SALARY
                              </span>
                              <span className="text-base sm:text-lg font-black font-mono text-amber-950">
                                {formatMMK(record.netSalary)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dashed Cut Line ONLY between the first and second payslip inside each pair */}
                        {indexInPair === 0 && pair.length > 1 && (
                          <div className="w-full border-t border-dashed border-gray-400 my-1.5 print:my-1 text-center box-border shrink-0">
                            <span className="bg-white px-2 text-[9px] text-gray-500 relative -top-2">✂ Cut Here</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
