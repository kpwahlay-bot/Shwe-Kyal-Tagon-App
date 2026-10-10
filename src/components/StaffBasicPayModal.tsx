import React, { useState, useMemo } from 'react';
import {
  X,
  Coins,
  Search,
  Check,
  Calculator,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Employee, Branch, normalizeDepartmentName } from '../types';
import { formatMMK, getBranchName } from '../utils/formatters';
import { calculateEmployeeTenure } from '../utils/tenureHelpers';
import { FormattedNumberInput } from './FormattedNumberInput';

interface StaffBasicPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  branches: Branch[];
  onUpdateEmployee: (emp: Employee) => void;
  onOpenCalculatorForEmp?: (emp: Employee) => void;
  activeBranchFilter?: string;
}

export const StaffBasicPayModal: React.FC<StaffBasicPayModalProps> = ({
  isOpen,
  onClose,
  employees,
  branches,
  onUpdateEmployee,
  onOpenCalculatorForEmp,
  activeBranchFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchFilter || 'ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SET' | 'UNSET'>('ALL');

  // Local state for modified salaries: employeeId -> amount
  const [editedSalaries, setEditedSalaries] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    employees.forEach((emp) => {
      init[emp.id] = emp.baseSalary || 0;
    });
    return init;
  });

  // Track recently saved IDs for instant visual feedback
  const [savedEmpIds, setSavedEmpIds] = useState<Record<string, boolean>>({});
  const [isBulkSavedNotice, setIsBulkSavedNotice] = useState(false);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(normalizeDepartmentName(e.department));
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.toLowerCase().includes(q));

      const matchesBranch =
        selectedBranchId === 'ALL' || emp.branchId === selectedBranchId;

      const normDept = normalizeDepartmentName(emp.department);
      const matchesDept =
        selectedDepartment === 'ALL' || normDept === selectedDepartment;

      const currentVal = editedSalaries[emp.id] ?? (emp.baseSalary || 0);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SET' && currentVal > 0) ||
        (statusFilter === 'UNSET' && currentVal === 0);

      return matchesSearch && matchesBranch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, selectedBranchId, selectedDepartment, statusFilter, editedSalaries]);

  // Overall Statistics
  const totalEmployeesCount = employees.length;
  const configuredCount = employees.filter((e) => (editedSalaries[e.id] ?? e.baseSalary) > 0).length;
  const pendingCount = totalEmployeesCount - configuredCount;
  const totalPayrollSum = employees.reduce((sum, e) => {
    return sum + (editedSalaries[e.id] ?? (e.baseSalary || 0));
  }, 0);

  // Check if any salary was changed compared to original
  const hasUnsavedChanges = useMemo(() => {
    return employees.some((emp) => {
      const current = editedSalaries[emp.id] ?? 0;
      const original = emp.baseSalary ?? 0;
      return current !== original;
    });
  }, [employees, editedSalaries]);

  const handleSalaryChange = (empId: string, amount: number) => {
    setEditedSalaries((prev) => ({
      ...prev,
      [empId]: amount,
    }));
    // Clear saved badge when modified
    if (savedEmpIds[empId]) {
      setSavedEmpIds((prev) => ({ ...prev, [empId]: false }));
    }
  };

  const handleSaveIndividual = (emp: Employee) => {
    const newAmount = editedSalaries[emp.id] ?? (emp.baseSalary || 0);
    const updatedEmp: Employee = {
      ...emp,
      baseSalary: newAmount,
    };
    onUpdateEmployee(updatedEmp);

    // Show temporary checkmark
    setSavedEmpIds((prev) => ({ ...prev, [emp.id]: true }));
    setTimeout(() => {
      setSavedEmpIds((prev) => ({ ...prev, [emp.id]: false }));
    }, 2500);
  };

  const handleSaveAll = () => {
    employees.forEach((emp) => {
      const current = editedSalaries[emp.id];
      if (current !== undefined && current !== emp.baseSalary) {
        onUpdateEmployee({
          ...emp,
          baseSalary: current,
        });
      }
    });

    setIsBulkSavedNotice(true);
    setTimeout(() => setIsBulkSavedNotice(false), 3000);
  };

  const handleResetToCurrent = () => {
    const init: Record<string, number> = {};
    employees.forEach((emp) => {
      init[emp.id] = emp.baseSalary || 0;
    });
    setEditedSalaries(init);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-purple-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Staff Basic Pay Master
                </h2>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  HR &amp; Payroll Setup
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-0.5">
                Set base monthly salary (Basic Pay) for each employee. Once configured, it will automatically load in Staff Salary Calculator.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border border-white/10"
            title="Close"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Staff
            </div>
            <div className="text-lg font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Users className="w-4 h-4 text-purple-600" />
              <span>{totalEmployeesCount}</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Basic Pay Set</span>
            </div>
            <div className="text-lg font-black text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span>{configuredCount}</span>
              <span className="text-xs font-medium text-slate-400">/ {totalEmployeesCount}</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Pending Setup</span>
            </div>
            <div className="text-lg font-black text-amber-700 flex items-center gap-1.5 mt-0.5">
              <span>{pendingCount}</span>
              <span className="text-xs font-medium text-slate-400">(0 MMK)</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Est. Base Payroll</span>
            </div>
            <div className="text-sm font-black font-mono text-purple-950 truncate mt-0.5" title={`${formatMMK(totalPayrollSum)}`}>
              {formatMMK(totalPayrollSum)}
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff name, code, position..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            {/* Branch Filter */}
            <div className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SET')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  statusFilter === 'SET' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Set ({configuredCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNSET')}
                className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  statusFilter === 'UNSET' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleResetToCurrent}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                title="Discard unsaved edits and reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black shadow-xs transition-all cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save All Changes</span>
            </button>
          </div>
        </div>

        {/* Bulk Saved Notification */}
        {isBulkSavedNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs text-emerald-800 font-bold animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All staff basic salary records saved successfully.</span>
            </div>
          </div>
        )}

        {/* Staff Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[220px]">STAFF MEMBER</th>
                  <th className="py-3 px-4 min-w-[150px]">POSITION &amp; DEPT</th>
                  <th className="py-3 px-4 min-w-[120px]">BRANCH</th>
                  <th className="py-3 px-4 min-w-[240px]">BASIC MONTHLY PAY (MMK)</th>
                  <th className="py-3 px-4 w-36 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.map((emp, index) => {
                  const currentSalary = editedSalaries[emp.id] ?? (emp.baseSalary || 0);
                  const isModified = currentSalary !== (emp.baseSalary || 0);
                  const isRecentlySaved = savedEmpIds[emp.id];

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-purple-50/30 transition-colors ${
                        isModified ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Number */}
                      <td className="py-3 px-4 text-center font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* Staff Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${emp.avatarBg || 'bg-purple-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {emp.name}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span className="font-semibold text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">
                                {emp.code}
                              </span>
                              {emp.phone && <span>{emp.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Position & Department */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {emp.position}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{emp.department}</span>
                          {(() => {
                            const t = calculateEmployeeTenure(emp.joinedDate, undefined, emp.tenure);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
                                  t.isEligible
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                                title={`Tenure: ${t.tenureString} (${t.tenureMyanmar}) • Service Allowance: ${t.serviceAllowanceFormatted}`}
                              >
                                <span>⏱️ {t.tenureString}</span>
                                {t.isEligible && <span>• 🎖️ +{formatMMK(t.serviceAllowance)}</span>}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200">
                          {getBranchName(emp.branchId, branches, emp.branchName)}
                        </span>
                      </td>

                      {/* Basic Monthly Pay (MMK) Input */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-48">
                            <FormattedNumberInput
                              value={currentSalary}
                              onChange={(val) => handleSalaryChange(emp.id, val)}
                              showLiveBadge={false}
                              placeholder="0"
                              min={0}
                              className={`w-full px-3 py-1.5 rounded-lg font-mono font-bold text-xs text-right border transition-all ${
                                isModified
                                  ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300/40 text-amber-900'
                                  : currentSalary > 0
                                  ? 'bg-emerald-50/40 border-emerald-300 text-slate-900'
                                  : 'bg-slate-50 border-slate-300 text-slate-500'
                              }`}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">
                            MMK
                          </span>

                          {isModified && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              Modified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Save button */}
                          <button
                            type="button"
                            onClick={() => handleSaveIndividual(emp)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isRecentlySaved
                                ? 'bg-emerald-600 text-white'
                                : isModified
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                            title={isModified ? 'Save modified Basic Pay' : 'Confirm Basic Pay'}
                          >
                            {isRecentlySaved ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span className="text-[10px]">Saved!</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Save</span>
                              </>
                            )}
                          </button>

                          {/* Calculate Payroll button */}
                          {onOpenCalculatorForEmp && (
                            <button
                              type="button"
                              onClick={() => {
                                // Save first if modified
                                if (isModified) {
                                  handleSaveIndividual(emp);
                                }
                                onOpenCalculatorForEmp(emp);
                                onClose();
                              }}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-purple-200 flex items-center gap-1"
                              title="Calculate Monthly Salary for this staff"
                            >
                              <Calculator className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-[10px]">Calculate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <Users className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="font-bold text-slate-700 text-sm">No Employees Found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try changing the search keyword, branch or department filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Configured basic salary will automatically load into <strong>Staff Salary Calculator</strong> when selecting an employee.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
