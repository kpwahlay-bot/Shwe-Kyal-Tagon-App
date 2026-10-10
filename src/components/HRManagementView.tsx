import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Phone, 
  Briefcase, 
  Calendar, 
  Edit3, 
  Trash2, 
  Search, 
  Calculator, 
  X,
  Building2, 
  Award, 
  Plus, 
  Target, 
  CheckCircle2, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { 
  Employee, 
  Branch, 
  SalaryRecord, 
  UserAccount, 
  DailySale, 
  COMPANY_DEPARTMENTS, 
  CompanyDepartment, 
  DepartmentPositionsMap, 
  DEPARTMENT_POSITIONS, 
  canUserDelete, 
  canUserManagePayroll, 
  normalizeDepartmentName 
} from '../types';
import { getMonthName, formatMMK } from '../utils/formatters';
import { calculateTenure, calculateEmployeeTenure } from '../utils/tenureHelpers';
import { PayrollTable } from './PayrollTable';
import { StaffAccountsPanel } from './StaffAccountsPanel';

export type HRSubTab = 'directory' | 'payroll' | 'performance';

interface HRManagementViewProps {
  initialSubTab?: HRSubTab;
  employees: Employee[];
  branches: Branch[];
  sales?: DailySale[];
  salaryRecords: SalaryRecord[];
  users?: UserAccount[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  onBranchFilterChange: (branchId: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  positionsMap?: DepartmentPositionsMap;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onCalculateForEmployee: (employee: Employee) => void;
  onOpenPayslip: (record: SalaryRecord) => void;
  onOpenBatchPayslips?: () => void;
  onOpenBatchBonusSlips?: () => void;
  onOpenPerformanceBonus?: () => void;
  onOpenBasicPayMaster?: () => void;
  onEditSalaryRecord: (record: SalaryRecord) => void;
  onDeleteSalaryRecord: (id: string) => void;
  onTogglePaymentStatus: (id: string) => void;
  onOpenCalculator: () => void;
  onBatchCalculateStandard?: (employeeIds: string[], month: string) => void;
}

export const HRManagementView: React.FC<HRManagementViewProps> = ({
  initialSubTab = 'directory',
  employees,
  branches,
  sales = [],
  salaryRecords,
  currentUser,
  activeBranchFilter,
  onBranchFilterChange,
  selectedMonth,
  onMonthChange,
  positionsMap = DEPARTMENT_POSITIONS,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onCalculateForEmployee,
  onOpenPayslip,
  onOpenBatchPayslips,
  onOpenBatchBonusSlips,
  onOpenPerformanceBonus,
  onOpenBasicPayMaster,
  onEditSalaryRecord,
  onDeleteSalaryRecord,
  onTogglePaymentStatus,
  onOpenCalculator,
  onBatchCalculateStandard,
}) => {
  const canAccessPayroll = canUserManagePayroll(currentUser);
  const [activeSubTab, setActiveSubTab] = useState<HRSubTab>(
    initialSubTab === 'payroll' && !canAccessPayroll ? 'directory' : initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'payroll' && !canAccessPayroll) {
        setActiveSubTab('directory');
      } else {
        setActiveSubTab(initialSubTab);
      }
    } else if (!canAccessPayroll && activeSubTab === 'payroll') {
      setActiveSubTab('directory');
    }
  }, [initialSubTab, canAccessPayroll]);

  // Filters for Directory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('active');

  // Employee Add/Edit Modal
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Quick Target Modal
  const [targetEmp, setTargetEmp] = useState<Employee | null>(null);
  const [quickPhoneTarget, setQuickPhoneTarget] = useState<number>(0);
  const [quickLaptopTarget, setQuickLaptopTarget] = useState<number>(0);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Predefined default positions per department
  const getPredefinedPositions = (dept: CompanyDepartment): string[] => {
    return positionsMap[dept] || DEPARTMENT_POSITIONS[dept] || [];
  };

  // Form State (STRICT: NO Salary field, NO Role field)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    department: 'Sales Department' as CompanyDepartment,
    position: 'Senior Sale',
    branchId: branches[0]?.id || 'branch-1',
    status: 'active' as 'active' | 'leave' | 'resigned',
    joinedDate: new Date().toISOString().split('T')[0],
  });

  const canDelete = canUserDelete(currentUser);

  const handleOpenAdd = () => {
    setEditingEmp(null);
    const nextNum = employees.length + 1;
    const formattedCode = `E${nextNum.toString().padStart(4, '0')}`;
    const defaultDept: CompanyDepartment = 'Sales Department';
    const deptPositions = getPredefinedPositions(defaultDept);

    setFormData({
      code: formattedCode,
      name: '',
      phone: '',
      department: defaultDept,
      position: deptPositions[0] || 'Junior Sales Assistant',
      branchId: activeBranchFilter !== 'ALL' ? activeBranchFilter : (branches[0]?.id || 'branch-1'),
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
    });
    setIsEmpModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    const normalizedDept = normalizeDepartmentName(emp.department);
    const availablePositions = getPredefinedPositions(normalizedDept);
    const initialPos = availablePositions.includes(emp.position) ? emp.position : (availablePositions[0] || emp.position);

    setFormData({
      code: emp.code,
      name: emp.name,
      phone: emp.phone || '',
      department: normalizedDept,
      position: initialPos,
      branchId: emp.branchId || branches[0]?.id || 'branch-1',
      status: emp.status || 'active',
      joinedDate: emp.joinedDate || new Date().toISOString().split('T')[0],
    });
    setIsEmpModalOpen(true);
  };

  const handleDepartmentChange = (newDept: CompanyDepartment) => {
    const availablePositions = getPredefinedPositions(newDept);
    setFormData({
      ...formData,
      department: newDept,
      position: availablePositions[0] || 'Staff',
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    const targetBranch = branches.find((b) => b.id === formData.branchId);
    const branchName = targetBranch ? targetBranch.name : (branches[0]?.name || 'Shwe Kyal Tagon (Shop 1)');

    if (editingEmp) {
      const updated: Employee = {
        ...editingEmp,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        position: formData.position,
        branchId: formData.branchId,
        branchName,
        status: formData.status,
        joinedDate: formData.joinedDate,
        // Salary remains unchanged; it is strictly managed under Salary/Payroll
      };
      onUpdateEmployee(updated);
      showToast(`Employee "${updated.name}" updated successfully.`);
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        position: formData.position,
        branchId: formData.branchId,
        branchName,
        baseSalary: 0, // Configured strictly under Salary / Basic Pay Master!
        status: formData.status,
        joinedDate: formData.joinedDate,
        phoneTargetUnits: 10,
        laptopTargetUnits: 5,
        salesTargetUnits: 15,
      };
      onAddEmployee(newEmp);
      showToast(`Employee "${newEmp.name}" added successfully.`);
    }
    setIsEmpModalOpen(false);
  };

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Branch filter
      if (activeBranchFilter !== 'ALL' && emp.branchId !== activeBranchFilter) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter !== 'ALL' && emp.status !== selectedStatusFilter) {
        return false;
      }
      // Department filter
      if (selectedDeptFilter !== 'ALL' && emp.department !== selectedDeptFilter) {
        return false;
      }
      // Position filter
      if (selectedPositionFilter !== 'ALL' && emp.position !== selectedPositionFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (emp.code || '').toLowerCase().includes(q);
        const nameMatch = (emp.name || '').toLowerCase().includes(q);
        const phoneMatch = (emp.phone || '').toLowerCase().includes(q);
        const posMatch = (emp.position || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !phoneMatch && !posMatch) {
          return false;
        }
      }
      return true;
    });
  }, [
    employees,
    activeBranchFilter,
    selectedStatusFilter,
    selectedDeptFilter,
    selectedPositionFilter,
    searchQuery,
  ]);

  // Positions available for filter dropdown
  const filterPositionsList = useMemo(() => {
    if (selectedDeptFilter !== 'ALL') {
      return getPredefinedPositions(selectedDeptFilter as CompanyDepartment);
    }
    // All unique positions across departments
    return Array.from(
      new Set([
        ...getPredefinedPositions('Sales Department'),
        ...getPredefinedPositions('Service Department'),
        ...getPredefinedPositions('Finance Department'),
      ])
    );
  }, [selectedDeptFilter, positionsMap]);

  // Performance Target metrics
  const performanceRows = useMemo(() => {
    return filteredEmployees.map((emp) => {
      const empSales = sales.filter((s) => 
        (s.employeeId === emp.id || s.employeeName === emp.name || s.technicianName === emp.name) &&
        (!selectedMonth || selectedMonth === 'ALL' || (s.date && s.date.startsWith(selectedMonth)))
      );
      const unitsSold = empSales.length;
      const targetUnits = (emp.phoneTargetUnits || 0) + (emp.laptopTargetUnits || 0) || emp.salesTargetUnits || 15;
      const achievementRate = targetUnits > 0 ? (unitsSold / targetUnits) * 100 : 0;
      const kpiScore = emp.kpiScore || (achievementRate >= 100 ? 95 : Math.round(achievementRate * 0.9));
      const performancePoints = emp.performancePoints || (achievementRate >= 100 ? 5.0 : Math.round(achievementRate * 0.05 * 10) / 10);

      return {
        emp,
        unitsSold,
        targetUnits,
        achievementRate,
        kpiScore,
        performancePoints,
      };
    });
  }, [filteredEmployees, sales, selectedMonth]);

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MD only: link a Firebase login account to a staff profile */}
      <StaffAccountsPanel branches={branches} currentUser={currentUser} />

      {/* Main Consolidated HR Header & Navigation Sub-Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500">
                HR Management • Clean Modular Architecture
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>HR Management</span>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {employees.length} Total Staff
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee Directory • Monthly Payroll Calculation • Performance Target Tracking
            </p>
          </div>

          {/* Sub-Category Navigation Tabs (Strictly Consolidated) */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('directory')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'directory'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>1. Employee Directory</span>
            </button>

            {canAccessPayroll && (
              <button
                onClick={() => setActiveSubTab('payroll')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'payroll'
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Payroll Calculation</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('performance')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'performance'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>{canAccessPayroll ? '3. Performance Tracking' : '2. Performance Tracking'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-CATEGORY 1: EMPLOYEE DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search code, name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              {/* Branch Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={activeBranchFilter}
                  onChange={(e) => onBranchFilterChange(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="ALL">All Branches ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter (From Predefined List) */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => {
                  setSelectedDeptFilter(e.target.value);
                  setSelectedPositionFilter('ALL');
                }}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {COMPANY_DEPARTMENTS.map((dept) => (
                  <option key={dept.key} value={dept.key}>
                    {dept.label}
                  </option>
                ))}
              </select>

              {/* Position Filter (From Predefined List) */}
              <select
                value={selectedPositionFilter}
                onChange={(e) => setSelectedPositionFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[200px]"
              >
                <option value="ALL">All Positions</option>
                {filterPositionsList.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="active">Active Staff</option>
                <option value="leave">On Leave</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>

            {/* Add Employee Button */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Employee</span>
            </button>
          </div>

          {/* Directory Paginated Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Emp ID</th>
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Predefined Position</th>
                    <th className="py-3 px-4">Contact Phone</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4">Tenure</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const tenureInfo = calculateEmployeeTenure(emp.joinedDate, undefined, emp.tenure);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-purple-700">
                            {emp.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">{emp.name}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {branches.find((b) => b.id === emp.branchId)?.name || 'Shwe Kyal Tagon (Shop 1)'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {emp.department}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-semibold text-[11px]">
                              {emp.position}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {emp.phone || <span className="text-slate-400 italic">N/A</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {emp.joinedDate || '2024-01-01'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-semibold">
                              {calculateTenure(emp.joinedDate)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              emp.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-purple-200"
                                title="Edit Employee Profile"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete employee ${emp.name} (${emp.code})?`)) {
                                      onDeleteEmployee(emp.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
              <span className="font-semibold text-slate-600">
                💡 Salary details are strictly managed under <strong>2. Payroll Calculation</strong> • Roles are under <strong>User Management</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-CATEGORY 2: PAYROLL CALCULATION (WHERE ALL SALARY IS MANAGED) */}
      {activeSubTab === 'payroll' && (
        canAccessPayroll ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Salary Management Center:</strong> All employee basic pay, attendance bonus, overtime, sales commissions, meal allowance, SSB, and deductions are calculated and maintained here.
                </span>
              </div>
              {onOpenBasicPayMaster && (
                <button
                  onClick={onOpenBasicPayMaster}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  + Manage Basic Pay Master
                </button>
              )}
            </div>

            <PayrollTable
              records={salaryRecords}
              employees={employees}
              branches={branches}
              currentUser={currentUser}
              activeBranchFilter={activeBranchFilter}
              onBranchFilterChange={onBranchFilterChange}
              onOpenPayslip={onOpenPayslip}
              onOpenBatchPayslips={onOpenBatchPayslips}
              onOpenBatchBonusSlips={onOpenBatchBonusSlips}
              onOpenPerformanceBonus={onOpenPerformanceBonus}
              onOpenBasicPayMaster={onOpenBasicPayMaster}
              onEditRecord={onEditSalaryRecord}
              onDeleteRecord={onDeleteSalaryRecord}
              onTogglePaymentStatus={onTogglePaymentStatus}
              onOpenCalculator={onOpenCalculator}
              onOpenCalculatorForEmp={(empId) => {
                const emp = employees.find((e) => e.id === empId);
                if (emp) onCalculateForEmployee(emp);
              }}
              onBatchCalculateStandard={onBatchCalculateStandard}
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />
          </div>
        ) : (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
              🛡️
            </div>
            <h3 className="font-bold text-base text-rose-900">
              Access Restricted: HR Payroll Calculation
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              လစာတွက်ချက်မှု (Payroll Calculation) ကဏ္ဍကို Managing Director (MD) နှင့် Operation (Yamin Nwe) သာလျှင် ဝင်ရောက်ကြည့်ရှုတွက်ချက်ခွင့်ရှိပါသည်။ Sales Manager, Admin, Finance, Cashier နှင့် Staff များ ကြည့်ရှုခွင့် လုံးဝ မရှိပါ။
            </p>
          </div>
        )
      )}

      {/* SUB-CATEGORY 3: PERFORMANCE TRACKING */}
      {activeSubTab === 'performance' && (
        <div className="space-y-4">
          {/* Performance Top Control */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Staff Target &amp; KPI Performance Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Mobile &amp; Electronics Unit Sales Targets vs Actual Achieved Units ({getMonthName(selectedMonth)})
              </p>
            </div>
            {onOpenPerformanceBonus && (
              <button
                onClick={onOpenPerformanceBonus}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>+ Calculate Profit Sharing Bonus</span>
              </button>
            )}
          </div>

          {/* Performance Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Emp ID</th>
                    <th className="py-2.5 px-3">Staff Name</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3 text-center">Smartphone Target</th>
                    <th className="py-2.5 px-3 text-center">Laptop Target</th>
                    <th className="py-2.5 px-3 text-center">Total Target</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-center">Achievement %</th>
                    <th className="py-2.5 px-3 text-center">KPI Rating</th>
                    <th className="py-2.5 px-3 text-center">Bonus Points</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {performanceRows.map(({ emp, unitsSold, targetUnits, achievementRate, kpiScore, performancePoints }) => {
                    const isMet = achievementRate >= 100;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                          {emp.code}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{emp.name}</div>
                          <div className="text-[10px] text-slate-400">{emp.position}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {emp.branchName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                          {emp.phoneTargetUnits || 10} Units
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                          {emp.laptopTargetUnits || 5} Units
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {targetUnits} Units
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                          {unitsSold} Units
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            isMet 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {achievementRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {kpiScore} / 100
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                          {performancePoints} pts
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setTargetEmp(emp);
                              setQuickPhoneTarget(emp.phoneTargetUnits || 10);
                              setQuickLaptopTarget(emp.laptopTargetUnits || 5);
                            }}
                            className="px-2.5 py-1 text-purple-700 hover:bg-purple-50 rounded border border-purple-200 text-xs font-semibold cursor-pointer"
                          >
                            Set Targets
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE PROFILE (STRICT: NO SALARY, PREDEFINED DEPT & POSITION ONLY) */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {editingEmp ? `Edit Employee • ${editingEmp.name}` : 'Create Employee Profile'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Staff demographic profile (Branch, Predefined Department &amp; Position)
                </p>
              </div>
              <button
                onClick={() => setIsEmpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="E0042"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="U Thant Zin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="09-..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Joined Date
                  </label>
                  <input
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Categorization: Branch, Predefined Department, Predefined Position */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                  Store &amp; Organizational Position
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Branch Location *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-semibold text-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value as CompanyDepartment)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-semibold text-slate-800"
                  >
                    {COMPANY_DEPARTMENTS.map((dept) => (
                      <option key={dept.key} value={dept.key}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Position *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-bold text-purple-900"
                  >
                    {getPredefinedPositions(formData.department).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Employment Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="active">Active Staff</option>
                    <option value="leave">On Leave</option>
                    <option value="resigned">Resigned</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                💡 <strong>System Notice:</strong> Salary details are maintained under <strong>2. Payroll Calculation</strong>. System Login Accounts and Roles are configured under <strong>User Management</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingEmp ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK TARGET MODAL */}
      {targetEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Set Sales Target Units
                </h3>
                <p className="text-[11px] text-slate-500">{targetEmp.name} ({targetEmp.code})</p>
              </div>
              <button
                onClick={() => setTargetEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Smartphone Target (Units)
                </label>
                <input
                  type="number"
                  value={quickPhoneTarget}
                  onChange={(e) => setQuickPhoneTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Laptop / PC Target (Units)
                </label>
                <input
                  type="number"
                  value={quickLaptopTarget}
                  onChange={(e) => setQuickLaptopTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetEmp(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateEmployee({
                      ...targetEmp,
                      phoneTargetUnits: quickPhoneTarget,
                      laptopTargetUnits: quickLaptopTarget,
                      salesTargetUnits: quickPhoneTarget + quickLaptopTarget,
                    });
                    setTargetEmp(null);
                    showToast('Target units saved.');
                  }}
                  className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Targets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
