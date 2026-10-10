import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Edit, 
  Trash2, 
  Plus, 
  Sparkles, 
  FileSpreadsheet, 
  Banknote, 
  Printer, 
  Coins,
  Building2,
  Users,
  Zap,
  Check,
  ArrowRight
} from 'lucide-react';
import { SalaryRecord, Employee, Branch, UserAccount, canUserDelete, canUserDeletePayrollSlip } from '../types';
import { formatMMK, exportPayrollToCSV, getStandardWorkingDaysForMonth, getBranchName, getBranchShortName } from '../utils/formatters';
import { calculateTenure } from '../utils/tenureHelpers';
import { findSalaryRecordForEmployee, matchSalaryRecordWithEmployee } from '../data/shweKyalTagonStaffData';

interface PayrollTableProps {
  records: SalaryRecord[];
  employees: Employee[];
  branches?: Branch[];
  currentUser?: UserAccount;
  activeBranchFilter?: string;
  onBranchFilterChange?: (branchId: string) => void;
  onOpenPayslip: (record: SalaryRecord) => void;
  onOpenBatchPayslips?: () => void;
  onOpenBatchBonusSlips?: () => void;
  onOpenPerformanceBonus?: () => void;
  onOpenBasicPayMaster?: () => void;
  onEditRecord: (record: SalaryRecord) => void;
  onDeleteRecord: (id: string) => void;
  onTogglePaymentStatus: (id: string) => void;
  onOpenCalculator: () => void;
  onOpenCalculatorForEmp?: (employeeId: string) => void;
  onNavigateToBonus?: () => void;
  onBatchCalculateStandard?: (employeeIds: string[], month: string) => void;
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
}

export const PayrollTable: React.FC<PayrollTableProps> = ({
  records,
  employees,
  branches = [],
  currentUser,
  activeBranchFilter = 'ALL',
  onBranchFilterChange,
  onOpenPayslip,
  onOpenBatchPayslips,
  onOpenPerformanceBonus,
  onOpenBasicPayMaster,
  onEditRecord,
  onDeleteRecord,
  onTogglePaymentStatus,
  onOpenCalculator,
  onOpenCalculatorForEmp,
  onNavigateToBonus,
  selectedMonth,
  onMonthChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Local branch selection synced with activeBranchFilter
  const [localBranch, setLocalBranch] = useState<string>(activeBranchFilter || 'ALL');

  useEffect(() => {
    if (activeBranchFilter) {
      setLocalBranch(activeBranchFilter);
    }
  }, [activeBranchFilter]);

  const handleBranchSelect = (branchId: string) => {
    setLocalBranch(branchId);
    if (onBranchFilterChange) {
      onBranchFilterChange(branchId);
    }
  };

  // 3 View Modes: Pending, Complete/Calculated, All Staff
  const [viewTab, setViewTab] = useState<'pending' | 'calculated' | 'all'>('pending');

  // Canonical branch list dynamically synchronized with Branch Network
  const branchList = useMemo(() => {
    const fallbackBranches = [
      { id: 'branch-1', name: 'Shwe Kyal Tagon (Shop 1)' },
      { id: 'branch-2', name: 'Shwe Kyal Tagon (Shop 2)' },
      { id: 'branch-3', name: 'Shwe Kyal Tagon (Shop 3)' },
      { id: 'branch-sys2', name: 'System II' },
    ];
    const sourceBranches = branches && branches.length > 0 ? branches : fallbackBranches;
    return [
      { id: 'ALL', name: '🏢 All Branches', shortName: 'All Branches' },
      ...sourceBranches.map((b) => ({
        id: b.id,
        name: b.name,
        shortName: getBranchShortName(b.id, branches, b.name),
      })),
    ];
  }, [branches]);

  // Filter employees by branch
  const branchEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (localBranch === 'ALL') return true;
      return emp.branchId === localBranch;
    });
  }, [employees, localBranch]);

  // Check which employees have a salary record for selectedMonth
  const employeeStatusList = useMemo(() => {
    const stdDays = getStandardWorkingDaysForMonth(selectedMonth);
    return branchEmployees.map((emp) => {
      const existingRecord = findSalaryRecordForEmployee(records, emp, selectedMonth);
      const isCalculated = Boolean(existingRecord);
      const baseSalary = Number(emp.baseSalary) || 0;

      return {
        employee: emp,
        isCalculated,
        salaryRecord: existingRecord ? {
          ...existingRecord,
          employeeId: emp.id,
          employeeCode: emp.code,
          employeeName: emp.name,
          joinedDate: emp.joinedDate || existingRecord.joinedDate,
          branchId: emp.branchId,
          branchName: emp.branchName,
          department: emp.department,
          position: emp.position,
        } : undefined,
        standardWorkingDays: stdDays,
        baseSalary,
      };
    });
  }, [branchEmployees, records, selectedMonth]);

  // Counts for tabs
  const pendingEmployees = useMemo(() => {
    return employeeStatusList.filter((item) => !item.isCalculated);
  }, [employeeStatusList]);

  // Complete calculated records strictly aligned with branch employees
  const calculatedRecords = useMemo(() => {
    return employeeStatusList
      .filter((item) => item.isCalculated && item.salaryRecord)
      .map((item) => item.salaryRecord!);
  }, [employeeStatusList]);

  // Filtered Calculated Records based on search, dept, and payment status
  const filteredCalculatedRecords = useMemo(() => {
    return calculatedRecords.filter((r) => {
      const matchesSearch =
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.position.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        departmentFilter === 'ALL' || r.department === departmentFilter;

      const matchesStatus =
        statusFilter === 'ALL' || r.paymentStatus === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [calculatedRecords, searchTerm, departmentFilter, statusFilter]);

  // Filtered Pending Employees based on search and dept
  const filteredPendingEmployees = useMemo(() => {
    return pendingEmployees.filter(({ employee }) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.code && employee.code.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept =
        departmentFilter === 'ALL' || employee.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [pendingEmployees, searchTerm, departmentFilter]);

  // Filtered All Employees view
  const filteredAllEmployees = useMemo(() => {
    return employeeStatusList.filter(({ employee }) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.code && employee.code.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept =
        departmentFilter === 'ALL' || employee.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [employeeStatusList, searchTerm, departmentFilter]);

  const departments = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'Sales Department', label: 'Sales Department' },
    { key: 'Service Department', label: 'Service Department' },
    { key: 'Finance Department', label: 'Finance Department' },
  ];

  // Helper to trigger calculation for specific employee
  const handleCalculateForEmployee = (empId: string) => {
    if (onOpenCalculatorForEmp) {
      onOpenCalculatorForEmp(empId);
    } else {
      onOpenCalculator();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden mb-6">
      {/* 1. Branch Selector Header Tabs */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            SELECT BRANCH:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {branchList.map((branch) => {
            const countForBranch = employees.filter((e) => branch.id === 'ALL' || e.branchId === branch.id).length;
            const isSelected = localBranch === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                onClick={() => handleBranchSelect(branch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <span>{branch.shortName}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
                }`}>
                  {countForBranch}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Status Segregation Tabs: Pending vs Complete vs All */}
      <div className="bg-slate-100/90 p-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Tab 1: Pending */}
          <button
            type="button"
            onClick={() => setViewTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black ring-2 ring-amber-400/50'
                : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${viewTab === 'pending' ? 'text-slate-950' : 'text-amber-600'}`} />
            <span>Pending</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
              viewTab === 'pending' ? 'bg-slate-950 text-amber-300' : 'bg-amber-100 text-amber-900'
            }`}>
              {pendingEmployees.length}
            </span>
          </button>

          {/* Tab 2: Complete */}
          <button
            type="button"
            onClick={() => setViewTab('calculated')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'calculated'
                ? 'bg-purple-700 text-white shadow-xs font-black ring-2 ring-purple-500/50'
                : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${viewTab === 'calculated' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Complete</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
              viewTab === 'calculated' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-900'
            }`}>
              {calculatedRecords.length}
            </span>
          </button>

          {/* Tab 3: All Staff */}
          <button
            type="button"
            onClick={() => setViewTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewTab === 'all'
                ? 'bg-slate-800 text-white shadow-xs font-black'
                : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${viewTab === 'all' ? 'text-white' : 'text-slate-500'}`} />
            <span>All Staff</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
              viewTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {branchEmployees.length}
            </span>
          </button>
        </div>

        {/* Action button in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Calculate Salary</span>
          </button>
        </div>
      </div>

      {/* 3. Search and Secondary Filters */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, code or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 shadow-2xs"
            />
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Selector */}
            {onMonthChange && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
                  title="Select month for payroll"
                />
              </div>
            )}

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden cursor-pointer"
            >
              {departments.map((dept) => (
                <option key={dept.key} value={dept.key}>
                  {dept.label}
                </option>
              ))}
            </select>

            {/* Payment Status Filter (only shown on calculated view) */}
            {viewTab === 'calculated' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Payment Status</option>
                <option value="Paid">Paid Only</option>
                <option value="Pending">Unpaid Only</option>
              </select>
            )}

            {/* Manage Basic Pay Button */}
            {onOpenBasicPayMaster && (
              <button
                type="button"
                onClick={onOpenBasicPayMaster}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Manage Staff Basic Monthly Pay"
              >
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Basic Pay</span>
              </button>
            )}

            {/* Export CSV (on calculated tab) */}
            {viewTab === 'calculated' && (
              <button
                onClick={() => exportPayrollToCSV(filteredCalculatedRecords, `Shwe_Kyal_Tagon_Payroll_${selectedMonth}.csv`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}

            {/* Batch Print All Payslips */}
            {viewTab === 'calculated' && onOpenBatchPayslips && (
              <button
                type="button"
                onClick={onOpenBatchPayslips}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                title="Print or export all staff payslips as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>📄 All Payslips</span>
              </button>
            )}

            {/* Bonus Engine Button */}
            {(onOpenPerformanceBonus || onNavigateToBonus) && (
              <button
                type="button"
                onClick={onOpenPerformanceBonus || onNavigateToBonus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Performance Bonus"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Bonus</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standard Table Header format strictly adhering to:
          EMP ID | EMP Name | Position | Branch | Basic Pay | Status | Net Salary | Actions */}

      {/* 4. TAB CONTENT 1: PENDING */}
      {viewTab === 'pending' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-amber-50/50 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">EMP ID</th>
                <th className="py-3 px-4 min-w-[160px]">EMP Name</th>
                <th className="py-3 px-4 min-w-[140px]">Position</th>
                <th className="py-3 px-4 w-32">Branch</th>
                <th className="py-3 px-4 w-28">Tenure</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPendingEmployees.map(({ employee, baseSalary }) => {
                const branchNameDisplay = getBranchName(employee.branchId, branches, employee.branchName);

                return (
                  <tr key={employee.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {employee.code || employee.id.slice(-4)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{employee.name}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {employee.position}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-semibold">
                        {branchNameDisplay}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-semibold">
                        {calculateTenure(employee.joinedDate, selectedMonth)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMMK(baseSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 font-medium">
                      -
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleCalculateForEmployee(employee.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title={`Calculate salary for ${employee.name}`}
                      >
                        <Zap className="w-3 h-3 text-amber-300" />
                        <span>Calculate</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredPendingEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        All Staff Calculated (Complete)
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        All employees in this branch have their payroll calculated for this month.
                      </p>
                      <button
                        onClick={() => setViewTab('calculated')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <span>View Complete Records</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. TAB CONTENT 2: COMPLETE / CALCULATED */}
      {viewTab === 'calculated' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">EMP ID</th>
                <th className="py-3 px-4 min-w-[160px]">EMP Name</th>
                <th className="py-3 px-4 min-w-[140px]">Position</th>
                <th className="py-3 px-4 w-32">Branch</th>
                <th className="py-3 px-4 w-28">Tenure</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right bg-purple-50/40 text-purple-900 font-bold">Net Salary</th>
                <th className="py-3 px-4 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalculatedRecords.map((r) => {
                const empObj = employees.find(e => e.id === r.employeeId);
                const empIdDisplay = empObj?.code || (r.employeeId ? r.employeeId.slice(-4) : r.id.slice(-4));

                return (
                  <tr key={r.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {empIdDisplay}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.employeeName}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {r.position}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {getBranchName(r.branchId, branches, r.branchName)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-semibold">
                        {calculateTenure(empObj?.joinedDate, r.month || selectedMonth)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatMMK(r.basicSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Complete</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => onTogglePaymentStatus(r.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                            r.paymentStatus === 'Paid'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                          title="Payment payout status (click to toggle Paid / Unpaid)"
                        >
                          {r.paymentStatus === 'Paid' ? (
                            <>
                              <Check className="w-2.5 h-2.5" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <span>Unpaid</span>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-purple-950 bg-purple-50/20 text-sm">
                      {formatMMK(r.netSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenPayslip(r)}
                          className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                          title="Print Payslip Voucher"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditRecord(r)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {(!currentUser || canUserDeletePayrollSlip(currentUser)) && (
                          <button
                            onClick={() => onDeleteRecord(r.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                            title="Delete Payroll Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCalculatedRecords.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">
                        No Calculated Records Found
                      </h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        No payroll records have been calculated for this branch and month yet.
                      </p>
                      <button
                        onClick={() => setViewTab('pending')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-950" />
                        <span>Go to Pending List</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. TAB CONTENT 3: ALL STAFF */}
      {viewTab === 'all' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">EMP ID</th>
                <th className="py-3 px-4 min-w-[160px]">EMP Name</th>
                <th className="py-3 px-4 min-w-[140px]">Position</th>
                <th className="py-3 px-4 w-32">Branch</th>
                <th className="py-3 px-4 w-28">Tenure</th>
                <th className="py-3 px-4 text-right">Basic Pay</th>
                <th className="py-3 px-4 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllEmployees.map(({ employee, isCalculated, salaryRecord, baseSalary }) => {
                return (
                  <tr key={employee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">
                      {employee.code || employee.id.slice(-4)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{employee.name}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {employee.position}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {getBranchName(employee.branchId, branches, employee.branchName)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-semibold">
                        {calculateTenure(employee.joinedDate, selectedMonth)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatMMK(baseSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isCalculated ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Complete</span>
                          </span>
                          {salaryRecord && (
                            <button
                              type="button"
                              onClick={() => onTogglePaymentStatus(salaryRecord.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                                salaryRecord.paymentStatus === 'Paid'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                              }`}
                              title="Payment payout status (click to toggle Paid / Unpaid)"
                            >
                              {salaryRecord.paymentStatus === 'Paid' ? (
                                <>
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Paid</span>
                                </>
                              ) : (
                                <span>Unpaid</span>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {isCalculated && salaryRecord ? (
                        <span className="text-purple-950 font-black font-mono">
                          {formatMMK(salaryRecord.netSalary)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isCalculated && salaryRecord ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenPayslip(salaryRecord)}
                            className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                            title="Print Payslip Voucher"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditRecord(salaryRecord)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {(!currentUser || canUserDeletePayrollSlip(currentUser)) && (
                            <button
                              onClick={() => onDeleteRecord(salaryRecord.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="Delete Payroll Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCalculateForEmployee(employee.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-amber-300" />
                          <span>Calculate</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
