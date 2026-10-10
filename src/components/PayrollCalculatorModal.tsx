import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calculator, 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Zap,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Employee, SalaryRecord, DailySale, DailyExpense, Branch, LateEntry, normalizeDepartmentName, UserAccount, canUserDelete, canUserDeletePayrollSlip } from '../types';
import { formatMMK, getStandardWorkingDaysForMonth, getTotalDaysInMonth, getBranchName, getBranchShortName } from '../utils/formatters';
import { calculateEmployeeTenure, getServiceAllowanceAmount } from '../utils/tenureHelpers';
import { findSalaryRecordForEmployee } from '../data/shweKyalTagonStaffData';
import { FormattedNumberInput } from './FormattedNumberInput';

interface PayrollCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  existingRecord?: SalaryRecord | null;
  onSaveRecord: (record: SalaryRecord) => void;
  onDeleteRecord?: (id: string) => void;
  currentUser?: UserAccount;
  selectedMonth: string;
  sales?: DailySale[];
  expenses?: DailyExpense[];
  branches?: Branch[];
  salaryRecords?: SalaryRecord[];
  initialEmployeeId?: string;
  onUpdateEmployeeBaseSalary?: (empId: string, baseSalary: number) => void;
}

// Helper to extract tenure in years
export const getTenureYears = (tenure?: string, startDate?: string, joinedDate?: string, refDate?: string): number => {
  const details = calculateEmployeeTenure(startDate || joinedDate, refDate, tenure);
  return details.completedYears + (details.remainingMonths / 12);
};

export const calculateServiceAllowance = (joinedDate?: string, refDate?: string, tenure?: string): number => {
  return calculateEmployeeTenure(joinedDate, refDate, tenure).serviceAllowance;
};

export const getDefaultDutyAllowance = (position?: string): number => {
  if (!position) return 10000;
  const p = position.toLowerCase();
  if (p.includes('managing director') || p.includes('director')) return 100000;
  if (p.includes('sales manager') || p.includes('branch manager') || p.includes('manager')) return 50000;
  if (p.includes('finance & policy') || p.includes('finance head') || p.includes('editor')) return 35000;
  if (p.includes('supervisor') || p.includes('senior') || p.includes('leader') || p.includes('training')) return 25000;
  if (p.includes('finance') || p.includes('accountant') || p.includes('payment') || p.includes('i stock')) return 20000;
  if (p.includes('technician') || p.includes('hardware')) return 20000;
  return 15000;
};

export const PayrollCalculatorModal: React.FC<PayrollCalculatorModalProps> = ({
  isOpen,
  onClose,
  employees,
  existingRecord,
  onSaveRecord,
  onDeleteRecord,
  currentUser,
  selectedMonth,
  branches = [],
  salaryRecords = [],
  initialEmployeeId,
  onUpdateEmployeeBaseSalary,
}) => {
  // Selected Employee
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    existingRecord?.employeeId || initialEmployeeId || (employees[0]?.id ?? '')
  );

  // Shop/Branch filter in modal
  const [modalBranchFilter, setModalBranchFilter] = useState<string>('ALL');
  // Filter uncalculated only
  const [filterPendingOnly, setFilterPendingOnly] = useState<boolean>(false);

  const activeEmployee = employees.find((e) => e.id === selectedEmpId) || employees[0];

  // Month
  const initialMonth = (existingRecord?.month && existingRecord.month !== 'ALL')
    ? existingRecord.month
    : (selectedMonth && selectedMonth !== 'ALL')
      ? selectedMonth
      : '2026-09';
  const [month, setMonth] = useState<string>(initialMonth);

  // Attendance & Days: Defaults to Month total days - 3 off days (တလမှာ နားရက် ၃ ရက်)
  const defaultStdDays = getStandardWorkingDaysForMonth(initialMonth);
  const [workingDaysStandard, setWorkingDaysStandard] = useState<number>(
    existingRecord?.workingDaysStandard ?? defaultStdDays
  );
  const [actualDaysWorked, setActualDaysWorked] = useState<number>(
    existingRecord?.actualDaysWorked ?? defaultStdDays
  );
  const [absentDays, setAbsentDays] = useState<number>(() => {
    if (existingRecord?.absentDays !== undefined) return existingRecord.absentDays;
    const std = existingRecord?.workingDaysStandard ?? defaultStdDays;
    const act = existingRecord?.actualDaysWorked ?? defaultStdDays;
    return Math.max(0, std - act);
  });

  // Base Pay & Allowances
  const [basicSalary, setBasicSalary] = useState<number>(
    existingRecord?.basicSalary ?? (activeEmployee ? (activeEmployee.baseSalary || 0) : 0)
  );

  // Option to sync/update Employee Master profile basic pay
  const [syncWithMaster, setSyncWithMaster] = useState<boolean>(true);

  // Service Allowance: 20,000 MMK per completed full year of service (လုပ်သက် ၁ နှစ်လျှင် ၂၀,၀၀၀ ကျပ် • ၁ နှစ်ပြည့်မှ စပေးပါသည်)
  const tenureDetails = useMemo(() => {
    return calculateEmployeeTenure(activeEmployee?.joinedDate, month, activeEmployee?.tenure);
  }, [activeEmployee, month]);

  const [serviceAllowance, setServiceAllowance] = useState<number>(() => {
    if (existingRecord?.serviceAllowance !== undefined && existingRecord.serviceAllowance !== 120000) {
      return existingRecord.serviceAllowance;
    }
    return tenureDetails.serviceAllowance;
  });

  // Synchronize modal state on open or employee/record prop change
  useEffect(() => {
    if (!isOpen) return;

    const targetEmpId = existingRecord?.employeeId || initialEmployeeId || selectedEmpId;
    setSelectedEmpId(targetEmpId);

    const emp = employees.find((e) => e.id === targetEmpId) || employees[0];
    if (emp?.branchId) {
      setModalBranchFilter(emp.branchId);
    }

    const currentMonth = (existingRecord?.month && existingRecord.month !== 'ALL')
      ? existingRecord.month
      : (selectedMonth && selectedMonth !== 'ALL')
        ? selectedMonth
        : '2026-09';
    setMonth(currentMonth);

    const std = existingRecord?.workingDaysStandard ?? getStandardWorkingDaysForMonth(currentMonth);
    const act = existingRecord?.actualDaysWorked ?? std;
    const abs = existingRecord?.absentDays ?? Math.max(0, std - act);

    setWorkingDaysStandard(std);
    setActualDaysWorked(act);
    setAbsentDays(abs);

    const base = existingRecord?.basicSalary ?? (emp ? (emp.baseSalary || 0) : 0);
    setBasicSalary(base);

    // Auto calculate Service Allowance according to employee's latest joinedDate (20,000 MMK per completed full year)
    const tInfo = calculateEmployeeTenure(emp?.joinedDate, currentMonth);
    const effectiveAllowance = tInfo.serviceAllowance;
    setServiceAllowance(effectiveAllowance);

    setDutyAllowance(existingRecord?.dutyAllowance ?? getDefaultDutyAllowance(emp?.position));
    setAttendanceBonus(existingRecord?.attendanceBonus ?? (abs > 0 ? 0 : 30000));
    setBonus((existingRecord as any)?.bonus ?? existingRecord?.performanceBonus ?? 0);
    setSalesCommission(existingRecord?.salesCommission ?? 0);
    setMealAllowance(existingRecord?.mealAllowance ?? 0);

    const calcAbsent = existingRecord?.absentDeduct ?? (abs > 0 && std > 0 ? (base / std) * abs : 0);
    setAbsentDeduct(calcAbsent);

    setLateEntries(existingRecord?.lateEntries || []);
    setLateCount(existingRecord?.lateCount ?? (existingRecord?.lateEntries?.length || 0));
    setLateDeduct(existingRecord?.lateDeduct ?? (existingRecord?.deductionPenalty ?? 0));
    setDeductionSSB(existingRecord?.deductionSSB ?? 0);
    setPaymentStatus(existingRecord?.paymentStatus ?? 'Pending');
    setPaymentMethod(existingRecord?.paymentMethod ?? 'Cash');
    setNotes(existingRecord?.notes ?? '');
  }, [isOpen, existingRecord, initialEmployeeId, selectedMonth, employees]);

  // Duty / Position Allowance (ရာထူးအလိုက် တာဝန်ခံကြေး)
  const [dutyAllowance, setDutyAllowance] = useState<number>(() => {
    if (existingRecord?.dutyAllowance !== undefined) return existingRecord.dutyAllowance;
    return getDefaultDutyAllowance(activeEmployee?.position);
  });

  const [attendanceBonus, setAttendanceBonus] = useState<number>(
    existingRecord?.attendanceBonus ?? ((existingRecord?.absentDays ?? 0) > 0 ? 0 : 30000)
  );

  const [bonus, setBonus] = useState<number>(
    (existingRecord as any)?.bonus ?? existingRecord?.performanceBonus ?? 0
  );

  const [salesCommission, setSalesCommission] = useState<number>(
    existingRecord?.salesCommission ?? 0
  );
  const [mealAllowance, setMealAllowance] = useState<number>(
    existingRecord?.mealAllowance ?? 0
  );

  // Daily rate for absent / unpaid leave calculations (exact calculation, no rounding)
  const dailyRate = workingDaysStandard > 0 ? (basicSalary / workingDaysStandard) : 0;

  // Single unified Absent & Unpaid Leave Deduct (ခွင့်မဲ့/ပျက်ကွက် နုတ်ငွေ)
  const [absentDeduct, setAbsentDeduct] = useState<number>(() => {
    if (existingRecord?.absentDeduct !== undefined) return existingRecord.absentDeduct;
    const abs = existingRecord?.absentDays ?? 0;
    const std = existingRecord?.workingDaysStandard ?? defaultStdDays;
    const bs = existingRecord?.basicSalary ?? (activeEmployee ? (activeEmployee.baseSalary || 0) : 0);
    return abs > 0 && std > 0 ? (bs / std) * abs : 0;
  });

  // 2. Late Deduct & Itemized Late entries
  const [lateEntries, setLateEntries] = useState<LateEntry[]>(
    existingRecord?.lateEntries || []
  );
  const [lateCount, setLateCount] = useState<number>(
    existingRecord?.lateCount ?? (existingRecord?.lateEntries ? existingRecord.lateEntries.length : 0)
  );
  const [lateDeduct, setLateDeduct] = useState<number>(
    existingRecord?.lateDeduct ?? (existingRecord?.deductionPenalty ?? 0)
  );

  // 3. Social Security (SSB)
  const [deductionSSB, setDeductionSSB] = useState<number>(
    existingRecord?.deductionSSB ?? 0
  );

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid'>(
    existingRecord?.paymentStatus ?? 'Pending'
  );
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'KBZPay' | 'WavePay' | 'Bank Transfer'>(
    existingRecord?.paymentMethod ?? 'Cash'
  );
  const [notes, setNotes] = useState<string>(existingRecord?.notes ?? '');

  // When selected employee changes
  const handleEmployeeChange = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      const base = emp.baseSalary || 0;
      const std = getStandardWorkingDaysForMonth(month);
      const newTenure = calculateEmployeeTenure(emp.joinedDate, month, emp.tenure);
      setWorkingDaysStandard(std);
      setBasicSalary(base);
      setAttendanceBonus(30000);
      setServiceAllowance(newTenure.serviceAllowance);
      setDutyAllowance(getDefaultDutyAllowance(emp.position));
      setActualDaysWorked(std);
      setAbsentDays(0);
      setAbsentDeduct(0);
      setLateEntries([]);
      setLateCount(0);
      setLateDeduct(0);
      setDeductionSSB(0);
    }
  };

  // Month change: recalculates standard working days (days in month - 3) and auto tenure
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    const std = getStandardWorkingDaysForMonth(newMonth);
    setWorkingDaysStandard(std);
    setActualDaysWorked(std);
    setAbsentDays(0);
    setAbsentDeduct(0);
    if (activeEmployee) {
      const newTenure = calculateEmployeeTenure(activeEmployee.joinedDate, newMonth, activeEmployee.tenure);
      setServiceAllowance(newTenure.serviceAllowance);
    }
  };

  // Synchronize actual worked days and absent days (Exact calculation)
  const handleActualDaysWorkedChange = (worked: number) => {
    setActualDaysWorked(worked);
    const exactRate = workingDaysStandard > 0 ? (basicSalary / workingDaysStandard) : 0;
    const newAbsent = Math.max(0, workingDaysStandard - worked);
    setAbsentDays(newAbsent);
    const calcAbsentDeduct = newAbsent > 0 ? exactRate * newAbsent : 0;
    setAbsentDeduct(calcAbsentDeduct);
    if (newAbsent > 0) {
      setAttendanceBonus(0);
    }
  };

  const handleAbsentDaysChange = (absent: number) => {
    setAbsentDays(absent);
    const newWorked = Math.max(0, workingDaysStandard - absent);
    setActualDaysWorked(newWorked);
    const exactRate = workingDaysStandard > 0 ? (basicSalary / workingDaysStandard) : 0;
    const calcAbsentDeduct = absent > 0 ? exactRate * absent : 0;
    setAbsentDeduct(calcAbsentDeduct);
    if (absent > 0) {
      setAttendanceBonus(0);
    }
  };

  const handleStandardDaysChange = (std: number) => {
    setWorkingDaysStandard(std);
    const exactRate = std > 0 ? (basicSalary / std) : 0;
    const newAbsent = Math.max(0, std - actualDaysWorked);
    setAbsentDays(newAbsent);
    if (newAbsent > 0) {
      setAbsentDeduct(exactRate * newAbsent);
      setAttendanceBonus(0);
    } else {
      setAbsentDeduct(0);
    }
  };

  // Auto Recalculate Absent Deduct
  const autoCalculateAbsentDeduct = () => {
    const calc = dailyRate * absentDays;
    setAbsentDeduct(calc);
    if (absentDays > 0) {
      setAttendanceBonus(0);
    }
  };

  // Auto Recalculate Service Allowance based on connected employee tenure
  const autoCalculateServiceAllowance = () => {
    const t = calculateEmployeeTenure(activeEmployee?.joinedDate, month, activeEmployee?.tenure);
    setServiceAllowance(t.serviceAllowance);
  };

  // Auto Recalculate Duty Allowance
  const autoCalculateDutyAllowance = () => {
    setDutyAllowance(getDefaultDutyAllowance(activeEmployee?.position));
  };

  // Add Itemized Late Entry
  const handleAddLateEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: LateEntry = {
      id: `late-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: today,
      minutes: 15,
      fine: 2000,
      reason: 'Late arrival',
    };
    const updated = [...lateEntries, newEntry];
    setLateEntries(updated);
    setLateCount(updated.length);
    const totalFine = updated.reduce((acc, curr) => acc + (Number(curr.fine) || 0), 0);
    setLateDeduct(totalFine);
  };

  // Remove Itemized Late Entry
  const handleRemoveLateEntry = (id: string) => {
    const updated = lateEntries.filter((e) => e.id !== id);
    setLateEntries(updated);
    setLateCount(updated.length);
    const totalFine = updated.reduce((acc, curr) => acc + (Number(curr.fine) || 0), 0);
    setLateDeduct(totalFine);
  };

  // Update Individual Late Entry Field
  const handleUpdateLateEntry = (id: string, field: keyof LateEntry, value: any) => {
    const updated = lateEntries.map((entry) => {
      if (entry.id === id) {
        return { ...entry, [field]: value };
      }
      return entry;
    });
    setLateEntries(updated);
    if (field === 'fine') {
      const totalFine = updated.reduce((acc, curr) => acc + (Number(curr.fine) || 0), 0);
      setLateDeduct(totalFine);
    }
  };

  // Filtered employees for modal selection
  const filteredEmployeesForModal = useMemo(() => {
    return employees.filter((emp) => {
      if (modalBranchFilter !== 'ALL' && emp.branchId !== modalBranchFilter) {
        return false;
      }
      if (filterPendingOnly) {
        const isCalc = Boolean(findSalaryRecordForEmployee(salaryRecords, emp, month));
        if (isCalc && emp.id !== selectedEmpId) {
          return false;
        }
      }
      return true;
    });
  }, [employees, modalBranchFilter, filterPendingOnly, salaryRecords, month, selectedEmpId]);

  // Calculated Earnings (Basic + Service Allowance + Duty Allowance + Attendance Bonus + Bonus + Commission + Meal)
  const totalEarnings =
    Number(basicSalary) +
    Number(serviceAllowance) +
    Number(dutyAllowance) +
    Number(attendanceBonus) +
    Number(bonus) +
    Number(salesCommission) +
    Number(mealAllowance);

  // Calculated Deductions (Late Deduct + Unified Absent/Unpaid Deduct)
  const totalDeductions =
    Number(lateDeduct) +
    Number(absentDeduct);

  // Net Take-Home Salary
  const netSalary = Math.max(0, totalEarnings - totalDeductions);

  const buildCurrentRecord = (): SalaryRecord | null => {
    if (!activeEmployee) return null;
    const validMonth = (month && month !== 'ALL')
      ? month
      : (selectedMonth && selectedMonth !== 'ALL')
        ? selectedMonth
        : '2026-09';

    const cleanTenure = tenureDetails.tenureString || activeEmployee.tenure || '0m';

    const newRecord: SalaryRecord = {
      id: existingRecord?.id || `sal-${activeEmployee.id}-${validMonth}`,
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      branchId: activeEmployee.branchId || 'branch-1',
      branchName: getBranchName(activeEmployee.branchId, branches, activeEmployee.branchName),
      position: activeEmployee.position,
      department: normalizeDepartmentName(activeEmployee.department),
      month: validMonth,
      workingDaysStandard,
      actualDaysWorked,
      absentDays,
      basicSalary: Number(basicSalary),
      serviceAllowance: Number(serviceAllowance) || 0,
      dutyAllowance: Number(dutyAllowance) || 0,
      tenure: cleanTenure,
      attendanceBonus: Number(attendanceBonus),
      bonus: Number(bonus),
      otHours: 0,
      otRatePerHour: 0,
      otTotal: 0,
      salesCommission: Number(salesCommission),
      mealAllowance: Number(mealAllowance),
      performanceBonus: Number(bonus) || existingRecord?.performanceBonus || 0,
      bonusPeriodLabel: existingRecord?.bonusPeriodLabel,
      performancePoints: existingRecord?.performancePoints,
      totalEarnings,
      lateEntries,
      lateCount: lateEntries.length > 0 ? lateEntries.length : (lateCount || 0),
      lateDeduct: Number(lateDeduct) || 0,
      absentDeduct: Number(absentDeduct) || 0,
      unpaidLeaveDays: 0,
      unpaidLeave: 0,
      deductionPenalty: Number(lateDeduct) || 0,
      deductionSSB: Number(deductionSSB) || 0,
      totalDeductions,
      netSalary,
      netPayable: netSalary,
      paymentStatus,
      paymentDate: paymentStatus === 'Paid' ? (existingRecord?.paymentDate || new Date().toISOString().split('T')[0]) : undefined,
      paymentMethod,
      notes: notes.trim(),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
    };
    return newRecord;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = buildCurrentRecord();
    if (!newRecord) {
      alert('Please select an employee');
      return;
    }

    onSaveRecord(newRecord);

    // Sync back to Employee Master Profile if opted-in
    if (syncWithMaster && onUpdateEmployeeBaseSalary && activeEmployee && Number(basicSalary) !== (activeEmployee.baseSalary || 0)) {
      onUpdateEmployeeBaseSalary(activeEmployee.id, Number(basicSalary));
    }

    onClose();
  };

  const handleSaveAndNext = (e: React.MouseEvent) => {
    e.preventDefault();
    const newRecord = buildCurrentRecord();
    if (!newRecord) {
      alert('Please select an employee');
      return;
    }

    onSaveRecord(newRecord);

    // Sync back to Employee Master Profile if opted-in
    if (syncWithMaster && onUpdateEmployeeBaseSalary && activeEmployee && Number(basicSalary) !== (activeEmployee.baseSalary || 0)) {
      onUpdateEmployeeBaseSalary(activeEmployee.id, Number(basicSalary));
    }

    // Find next uncalculated employee in the current branch
    const pool = modalBranchFilter === 'ALL' ? employees : employees.filter((emp) => emp.branchId === modalBranchFilter);
    const nextPending = pool.find((emp) => emp.id !== newRecord.employeeId && !findSalaryRecordForEmployee(salaryRecords, emp, month));

    if (nextPending) {
      handleEmployeeChange(nextPending.id);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {existingRecord ? 'Edit Payroll Record' : 'Staff Salary Calculator'}
              </h2>
              <p className="text-xs text-slate-300">
                Shwe Kyal Tagon Payroll • Late Deduct, Absent Deduct & Unpaid Leave
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-700"
            title="Close"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Staff Selection & Month & Working Days */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            {/* Row 1: Branch and Staff selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Branch / Shop</span>
                  </span>
                  <span className="text-[10px] text-purple-700 font-bold">
                    {modalBranchFilter === 'ALL' ? `${employees.length} staff` : `${employees.filter(e => e.branchId === modalBranchFilter).length} staff`}
                  </span>
                </label>
                <select
                  value={modalBranchFilter}
                  onChange={(e) => {
                    const newBranch = e.target.value;
                    setModalBranchFilter(newBranch);
                    if (newBranch !== 'ALL') {
                      const firstInBranch = employees.find((emp) => emp.branchId === newBranch);
                      if (firstInBranch && activeEmployee?.branchId !== newBranch) {
                        handleEmployeeChange(firstInBranch.id);
                      }
                    }
                  }}
                  disabled={Boolean(existingRecord)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-purple-500 disabled:bg-slate-100 cursor-pointer"
                >
                  <option value="ALL">🏢 All Branches</option>
                  {branches && branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="branch-1">Shwe Kyal Tagon (Shop 1)</option>
                      <option value="branch-2">Shwe Kyal Tagon (Shop 2)</option>
                      <option value="branch-3">Shwe Kyal Tagon (Shop 3)</option>
                      <option value="branch-sys2">System II</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Staff Member *</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterPendingOnly}
                      onChange={(e) => setFilterPendingOnly(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Show Pending Only</span>
                  </label>
                </div>
                <select
                  value={selectedEmpId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  disabled={Boolean(existingRecord)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-purple-500 disabled:bg-slate-100 cursor-pointer"
                >
                  {filteredEmployeesForModal.map((emp) => {
                    const isCalc = Boolean(findSalaryRecordForEmployee(salaryRecords, emp, month));
                    return (
                      <option key={emp.id} value={emp.id}>
                        {isCalc ? '✓ [Complete] ' : '⏳ [Pending] '}
                        {emp.code || emp.id} • {emp.name} ({emp.position})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Row 2: Month and Working Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salary Month *</span>
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:outline-hidden focus:border-purple-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-center">Standard Days</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={workingDaysStandard}
                    onChange={(e) => handleStandardDaysChange(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-center"
                  />
                  <span className="text-[10px] text-slate-500 font-medium block mt-1 text-center">
                    {getTotalDaysInMonth(month)}d - 3 off = {getStandardWorkingDaysForMonth(month)}d
                  </span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-center">Days Worked</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={actualDaysWorked}
                    onChange={(e) => handleActualDaysWorkedChange(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-white border border-purple-300 rounded-lg text-purple-700 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-rose-700 font-semibold mb-1 text-center">Absent Days</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={absentDays}
                    onChange={(e) => handleAbsentDaysChange(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Daily Rate Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px]">
              <span>
                Daily Rate = {formatMMK(basicSalary)} ÷ {workingDaysStandard} days = <strong className="font-mono text-blue-950 font-bold">{formatMMK(dailyRate)} / day</strong>
              </span>
              <span className="text-purple-800 font-bold bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-300">
                Tenure: {tenureDetails.tenureString} ({tenureDetails.tenureMyanmar})
              </span>
              {absentDays > 0 && (
                <span className="text-rose-700 font-semibold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                  (Absent: {absentDays} day(s) - Attendance bonus set to 0 MMK)
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Earnings & Allowances */}
          <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-200">
            <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-700" />
              <span>Base Pay, Service & Duty Allowances</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Basic Salary (MMK) *</label>
                  {activeEmployee?.baseSalary ? (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                      ✓ Profile: {formatMMK(activeEmployee.baseSalary)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                      ⚠️ No Profile Basic Pay
                    </span>
                  )}
                </div>
                <FormattedNumberInput
                  value={basicSalary}
                  onChange={(newBasic) => {
                    setBasicSalary(newBasic);
                    const newRate = workingDaysStandard > 0 ? (newBasic / workingDaysStandard) : 0;
                    if (absentDays > 0) {
                      setAbsentDeduct(newRate * absentDays);
                    }
                  }}
                  showLiveBadge={true}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-right"
                  placeholder="0"
                />
                {onUpdateEmployeeBaseSalary && (
                  <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncWithMaster}
                      onChange={(e) => setSyncWithMaster(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span>Sync & update staff profile Basic Pay</span>
                  </label>
                )}
              </div>

              {/* Service Allowance */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-amber-950 font-bold text-xs">
                      Service Allowance
                    </label>
                    <div className="text-[10px] text-amber-800 font-medium">
                      Tenure: <span className="font-bold font-mono text-amber-950">{tenureDetails.tenureString}</span> (20,000 Ks / yr)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={autoCalculateServiceAllowance}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer"
                    title={`Recalculate service allowance from tenure (${tenureDetails.tenureString})`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-200" />
                    <span>Auto ({formatMMK(tenureDetails.serviceAllowance)})</span>
                  </button>
                </div>
                <FormattedNumberInput
                  value={serviceAllowance}
                  onChange={(val) => setServiceAllowance(val)}
                  min={0}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-xs text-amber-950 text-right focus:border-amber-500"
                  placeholder="0"
                />
              </div>

              {/* Duty / Position Allowance */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1">
                <label className="block text-indigo-950 font-bold text-xs">
                  Duty Allowance
                </label>
                <FormattedNumberInput
                  value={dutyAllowance}
                  onChange={(val) => setDutyAllowance(val)}
                  min={0}
                  className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg font-mono font-bold text-xs text-indigo-950 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Attendance Bonus</label>
                <FormattedNumberInput
                  value={attendanceBonus}
                  onChange={(val) => setAttendanceBonus(val)}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bonus</label>
                <FormattedNumberInput
                  value={bonus}
                  onChange={(val) => setBonus(val)}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-emerald-700 font-bold text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Meal Allowance</label>
                <FormattedNumberInput
                  value={mealAllowance}
                  onChange={(val) => setMealAllowance(val)}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-right"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sales Commission</label>
                <FormattedNumberInput
                  value={salesCommission}
                  onChange={(val) => setSalesCommission(val)}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-emerald-700 font-bold text-right"
                  placeholder="0"
                />
              </div>

              <div className="flex flex-col justify-end md:col-span-3">
                <div className="p-3 bg-purple-100/60 border border-purple-300 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-purple-900 font-bold uppercase tracking-wider">Subtotal Gross Earnings</span>
                  <span className="text-lg font-black text-purple-950 font-mono">
                    {formatMMK(totalEarnings)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Deductions (Late Deduct, Unified Absent Deduct) */}
          <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-200 pb-2">
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Salary Deductions (Late & Absent Deduct)</span>
              </h3>
            </div>

            {/* Single Unified Absent & Unpaid Leave Deduct */}
            <div className="bg-white p-3.5 rounded-lg border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 block text-xs">
                  Absent / Unpaid Leave Deduct
                </label>
                {absentDays > 0 && (
                  <button
                    type="button"
                    onClick={autoCalculateAbsentDeduct}
                    className="text-[10px] text-rose-700 hover:text-rose-900 underline font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Auto ({absentDays} days)
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <FormattedNumberInput
                  value={absentDeduct}
                  onChange={(val) => setAbsentDeduct(val)}
                  min={0}
                  className="w-full px-3 py-2 bg-rose-50 border border-rose-300 rounded-lg font-mono text-rose-800 font-bold text-right"
                  placeholder="0"
                />
                <span className="text-slate-500 font-semibold shrink-0">MMK</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Absent {absentDays} days × {formatMMK(dailyRate)} MMK/day = {formatMMK(dailyRate * absentDays)} MMK
              </span>
            </div>

            {/* Itemized Late Deduct Section */}
            <div className="bg-white p-3.5 rounded-lg border border-rose-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Late Deduct (Itemized Entries)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Record date, minutes late, and fine amount per instance
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddLateEntry}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-amber-700" />
                    <span>+ Add Late Entry</span>
                  </button>
                </div>
              </div>

              {/* Late Entries Table */}
              {lateEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-semibold">
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2">Minutes</th>
                        <th className="py-1.5 px-2">Fine (MMK)</th>
                        <th className="py-1.5 px-2">Reason / Notes</th>
                        <th className="py-1.5 px-1 text-center w-10">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lateEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/60">
                          <td className="py-1.5 px-2 w-36">
                            <input
                              type="date"
                              value={entry.date || ''}
                              onChange={(e) => handleUpdateLateEntry(entry.id, 'date', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-24">
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={entry.minutes || 0}
                              onChange={(e) => handleUpdateLateEntry(entry.id, 'minutes', Number(e.target.value))}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 text-center font-mono"
                              placeholder="Min"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-32">
                            <input
                              type="number"
                              step="any"
                              value={entry.fine || 0}
                              onChange={(e) => handleUpdateLateEntry(entry.id, 'fine', Number(e.target.value))}
                              className="w-full px-2 py-1 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-bold font-mono text-right"
                              placeholder="Fine"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={entry.reason || ''}
                              onChange={(e) => handleUpdateLateEntry(entry.id, 'reason', e.target.value)}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                              placeholder="e.g. Traffic delay"
                            />
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLateEntry(entry.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-2.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-[11px] flex items-center justify-between">
                  <span>No late entries (defaults to 0 MMK if none)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">Direct Fine Entry:</span>
                    <input
                      type="number"
                      step={500}
                      value={lateDeduct}
                      onChange={(e) => setLateDeduct(Number(e.target.value))}
                      className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-rose-700 text-right"
                      placeholder="0"
                    />
                    <span className="text-slate-500 font-semibold">MMK</span>
                  </div>
                </div>
              )}

              {/* Late Deduct Total Badge */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-600 font-medium">
                  Total Late Deductions ({lateEntries.length > 0 ? `${lateEntries.length} items` : `${lateCount} times`}):
                </span>
                <span className="font-mono font-black text-rose-700 text-sm">
                  {lateDeduct > 0 ? `-${formatMMK(lateDeduct)} MMK` : '0 MMK'}
                </span>
              </div>
            </div>

            {/* Total Deductions Footer */}
            <div className="flex items-center justify-between p-3 bg-rose-100/70 border border-rose-300 rounded-xl">
              <div>
                <span className="text-xs font-bold text-rose-950 uppercase tracking-wider block">
                  Total Deductions
                </span>
                <span className="text-[11px] text-rose-800">
                  Late Deduct + Absent/Unpaid Deduct
                </span>
              </div>
              <div className="text-xl font-black font-mono text-rose-800">
                {totalDeductions > 0 ? `-${formatMMK(totalDeductions)} MMK` : '0 MMK'}
              </div>
            </div>
          </div>

          {/* Section 4: Final Net Take-Home & Payment Method */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                Final Net Take-Home Salary
              </span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {formatMMK(netSalary)}
              </div>
              <span className="text-[11px] text-slate-400">
                Gross ({formatMMK(totalEarnings)}) - Deductions ({formatMMK(totalDeductions)})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white cursor-pointer"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 -mx-6 -mb-6 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 z-10 shrink-0">
            <div className="text-[11px] text-slate-500 font-medium">
              {modalBranchFilter !== 'ALL' && (
                <span>
                  {getBranchName(modalBranchFilter, branches)}
                  : {filteredEmployeesForModal.length} Staff
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {existingRecord && onDeleteRecord && (!currentUser || canUserDeletePayrollSlip(currentUser)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this calculated payroll record?')) {
                      onDeleteRecord(existingRecord.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition cursor-pointer mr-auto"
                  title="Delete this calculated payroll record"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Record</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              {!existingRecord && (
                <button
                  type="button"
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold shadow-xs transition cursor-pointer"
                  title="Save current staff salary and immediately load the next uncalculated staff member"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  <span>Save & Next Pending</span>
                </button>
              )}

              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
              >
                Save Payroll Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
