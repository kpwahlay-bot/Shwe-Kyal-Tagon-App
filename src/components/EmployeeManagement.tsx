import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Edit3, 
  Trash2, 
  Search, 
  Calculator, 
  Check, 
  X,
  Building2,
  TrendingUp,
  Award,
  Clock,
  BriefcaseBusiness,
  Wrench,
  CircleDollarSign,
  Layers,
  Filter,
  Plus,
  Target,
  BarChart3,
  Flame,
  CheckCircle2,
  AlertCircle,
  Percent,
  Sparkles,
  Lock,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Coins,
  Hash,
  Smartphone,
  Laptop,
  Package
} from 'lucide-react';
import { 
  Employee, 
  Branch, 
  UserAccount, 
  UserRole,
  DailySale,
  COMPANY_DEPARTMENTS, 
  CompanyDepartment, 
  DepartmentPositionsMap,
  DEPARTMENT_POSITIONS,
  canUserDelete,
  normalizeDepartmentName,
  isYaminnwe,
  isMDUser
} from '../types';
import { PositionManagementModal } from './PositionManagementModal';
import { formatMMK, formatNumber } from '../utils/formatters';
import { calculateTenure, calculateEmployeeTenure, formatTenureBadge } from '../utils/tenureHelpers';

interface EmployeeManagementProps {
  employees: Employee[];
  branches: Branch[];
  sales?: DailySale[];
  users?: UserAccount[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  selectedMonth?: string;
  positionsMap?: DepartmentPositionsMap;
  onAddPosition?: (department: CompanyDepartment, positionTitle: string) => void;
  onRenamePosition?: (department: CompanyDepartment, oldTitle: string, newTitle: string, updateEmployees: boolean) => void;
  onDeletePosition?: (department: CompanyDepartment, positionTitle: string) => void;
  onResetPositions?: () => void;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onCalculateForEmployee: (employee: Employee) => void;
  onSwitchToPayroll?: () => void;
  onAddUser?: (user: UserAccount) => void;
  onUpdateUser?: (user: UserAccount) => void;
  onResequenceEmployees?: () => void;
}

export const calculateTenureString = (dateStr?: string, manualTenure?: string): string => {
  return calculateEmployeeTenure(dateStr, undefined, manualTenure).tenureString;
};

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  branches,
  sales = [],
  users = [],
  currentUser,
  activeBranchFilter,
  selectedMonth = 'ALL',
  positionsMap,
  onAddPosition,
  onRenamePosition,
  onDeletePosition,
  onResetPositions,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onCalculateForEmployee,
  onSwitchToPayroll,
  onAddUser,
  onUpdateUser,
  onResequenceEmployees,
}) => {
  const isMD = isMDUser(currentUser);
  const isManager = currentUser.role === 'Sales Manager';
  const isMDOrManager = isMD || isManager || currentUser.role === 'Admin' || isYaminnwe(currentUser);
  const canDeleteEmployee = canUserDelete(currentUser);

  const activePositionsMap = useMemo<DepartmentPositionsMap>(() => {
    return positionsMap || DEPARTMENT_POSITIONS;
  }, [positionsMap]);

  const [isPositionModalOpen, setIsPositionModalOpen] = useState<boolean>(false);
  const [isInlineAddPositionOpen, setIsInlineAddPositionOpen] = useState<boolean>(false);
  const [inlineNewPositionTitle, setInlineNewPositionTitle] = useState<string>('');

  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'performance'>('roster');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchFilter);
  const [performanceFilter, setPerformanceFilter] = useState<'ALL' | 'MET' | 'PROGRESS' | 'TOP'>('ALL');

  useEffect(() => {
    setSelectedBranchId(activeBranchFilter);
  }, [activeBranchFilter]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Quick Target Edit Modal
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetEditEmployee, setTargetEditEmployee] = useState<Employee | null>(null);
  const [quickTargetAmount, setQuickTargetAmount] = useState<number>(0);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsTargetModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [position, setPosition] = useState('');
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || 'branch-1');
  const [department, setDepartment] = useState<CompanyDepartment>('Sales Department');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [phone, setPhone] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tenure, setTenure] = useState('1y 2m');
  const [status, setStatus] = useState<Employee['status']>('active');
  const [phoneTargetUnits, setPhoneTargetUnits] = useState<number>(10);
  const [laptopTargetUnits, setLaptopTargetUnits] = useState<number>(5);
  const [salesTarget, setSalesTarget] = useState<number>(0);
  const [kpiScore, setKpiScore] = useState<number>(100);

  // Quick Target Modal State
  const [quickPhoneTarget, setQuickPhoneTarget] = useState<number>(10);
  const [quickLaptopTarget, setQuickLaptopTarget] = useState<number>(5);

  // Also create / edit system login account & role
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPin, setLoginPin] = useState('1234');
  const [loginPassword, setLoginPassword] = useState('');
  const [firebaseUid, setFirebaseUid] = useState('');
  const [loginRole, setLoginRole] = useState<UserRole>('Staff');
  const [loginStatus, setLoginStatus] = useState<'active' | 'inactive'>('active');
  const [isCustomPosition, setIsCustomPosition] = useState(false);
  const [ecodeError, setEcodeError] = useState<string>('');

  // Validate that Employee Code (Ecode) is unique across all staff
  const validateEmployeeCode = (inputCode: string, currentEmpId?: string) => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) {
      setEcodeError('Employee Code (EC) is required.');
      return false;
    }
    const isDuplicate = employees.some(
      (e) => e.code?.trim().toUpperCase() === trimmed && (!currentEmpId || e.id !== currentEmpId)
    );
    if (isDuplicate) {
      setEcodeError(`Employee Code "${trimmed}" is already assigned. Please use a unique code.`);
      return false;
    }
    setEcodeError('');
    return true;
  };

  // Helper to find linked user account for an employee
  const getLinkedUser = (emp: Employee): UserAccount | undefined => {
    return users.find(
      (u) =>
        u.employeeId === emp.id ||
        (emp.userAccountId && u.id === emp.userAccountId) ||
        (emp.code && u.employeeCode === emp.code) ||
        (emp.username && u.username.toLowerCase() === emp.username.toLowerCase()) ||
        (u.displayName && u.displayName.trim().toLowerCase() === emp.name.trim().toLowerCase())
    );
  };

  // Generate next unique Employee Code starting with EC001 without colliding with existing codes
  const generateNextEmployeeCode = () => {
    const existingCodes = new Set(employees.map((e) => (e.code || '').trim().toUpperCase()));
    const ecNumbers = employees
      .map((e) => {
        const match = (e.code || '').match(/EC[-_]?(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null && !isNaN(n));
    let nextNum = ecNumbers.length > 0 ? Math.max(...ecNumbers) + 1 : 1;
    while (existingCodes.has(`EC${String(nextNum).padStart(3, '0')}`)) {
      nextNum++;
    }
    return `EC${String(nextNum).padStart(3, '0')}`;
  };

  const handleDepartmentChange = (newDept: CompanyDepartment) => {
    setDepartment(newDept);
    const positionsList = activePositionsMap[newDept] || [];
    if (positionsList.length > 0) {
      handlePositionChange(positionsList[0]);
    }
  };

  const handlePositionChange = (pos: string) => {
    setPosition(pos);
    const pLower = pos.toLowerCase();
    if (pLower.includes('director') || pLower.includes('md') || pLower.includes('ceo')) {
      setLoginRole('MD');
    } else if (
      pLower.includes('manager') ||
      pLower.includes('supervisor') ||
      pLower.includes('leader') ||
      pLower.includes('hod') ||
      pLower.includes('dyhod')
    ) {
      setLoginRole('Sales Manager');
    } else if (pLower.includes('cashier')) {
      setLoginRole('Cashier');
    } else if (pLower.includes('finance') || pLower.includes('accountant')) {
      setLoginRole('Finance');
    } else {
      setLoginRole('Staff');
    }
  };

  const handleSaveInlinePosition = () => {
    const trimmed = inlineNewPositionTitle.trim();
    if (!trimmed) return;
    onAddPosition?.(department, trimmed);
    handlePositionChange(trimmed);
    setInlineNewPositionTitle('');
    setIsInlineAddPositionOpen(false);
  };

  const openAddModal = () => {
    setEditingEmployee(null);
    setEcodeError('');
    const nextCode = generateNextEmployeeCode();
    setCode(nextCode);
    setName('');
    const defaultDept: CompanyDepartment = 'Sales Department';
    setDepartment(defaultDept);
    const defaultPos = activePositionsMap[defaultDept]?.[0] || 'Junior Sales Executive';
    setPosition(defaultPos);
    setIsCustomPosition(false);
    setIsInlineAddPositionOpen(false);
    setInlineNewPositionTitle('');
    setBranchId(selectedBranchId !== 'ALL' ? selectedBranchId : (activeBranchFilter !== 'ALL' ? activeBranchFilter : (branches[0]?.id || 'branch-1')));
    setPhone('');
    setBaseSalary(0);
    const todayStr = new Date().toISOString().split('T')[0];
    setJoinedDate(todayStr);
    setTenure(calculateTenureString(todayStr));
    setStatus('active');
    setSalesTarget(0);
    setKpiScore(100);
    setCreateLoginAccount(true);
    setLoginUsername(`${nextCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@sktg.com`);
    setLoginPin('1234');
    setLoginPassword('');
    setFirebaseUid('');
    setLoginRole('Staff');
    setLoginStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEcodeError('');
    setCode(emp.code);
    setName(emp.name);
    const normDept = normalizeDepartmentName(emp.department);
    setDepartment(normDept);
    setPosition(emp.position || (activePositionsMap[normDept]?.[0] || 'Sales Executive'));
    const isCustom = !(activePositionsMap[normDept] || []).includes(emp.position);
    setIsCustomPosition(isCustom);
    setIsInlineAddPositionOpen(false);
    setInlineNewPositionTitle('');
    setBranchId(emp.branchId || branches[0]?.id || 'branch-1');
    setPhone(emp.phone);
    setBaseSalary(emp.baseSalary);
    const jDate = emp.joinedDate || new Date().toISOString().split('T')[0];
    setJoinedDate(jDate);
    setTenure(calculateTenureString(jDate) || emp.tenure || '3y 5m');
    setStatus(emp.status);
    setPhoneTargetUnits(emp.phoneTargetUnits !== undefined ? Number(emp.phoneTargetUnits) : (normDept === 'Sales Department' ? 10 : 0));
    setLaptopTargetUnits(emp.laptopTargetUnits !== undefined ? Number(emp.laptopTargetUnits) : (normDept === 'Sales Department' ? 5 : 0));
    setSalesTarget(emp.salesTarget !== undefined && emp.salesTarget !== null ? Number(emp.salesTarget) : 5000000);
    setKpiScore(emp.kpiScore || 100);
    
    const linkedUser = getLinkedUser(emp);
    setFirebaseUid(emp.firebaseUid || linkedUser?.firebaseUid || (linkedUser?.id && linkedUser.id.length > 20 ? linkedUser.id : ''));
    if (linkedUser) {
      setCreateLoginAccount(true);
      setLoginUsername(linkedUser.username);
      setLoginPin(linkedUser.pin);
      setLoginPassword(linkedUser.password || '');
      setLoginRole(linkedUser.role);
      setLoginStatus(linkedUser.status || 'active');
    } else {
      setCreateLoginAccount(false);
      setLoginUsername(`${(emp.name || emp.code).toLowerCase().replace(/[^a-z0-9]/g, '')}@sktg.com`);
      setLoginPin('1234');
      setLoginPassword('');
      const pLower = (emp.position || '').toLowerCase();
      if (pLower.includes('manager') || pLower.includes('supervisor') || pLower.includes('leader')) {
        setLoginRole('Sales Manager');
      } else {
        setLoginRole('Staff');
      }
      setLoginStatus('active');
    }
    setIsModalOpen(true);
  };

  const openQuickTargetModal = (emp: Employee) => {
    setTargetEditEmployee(emp);
    setQuickPhoneTarget(emp.phoneTargetUnits !== undefined ? Number(emp.phoneTargetUnits) : (emp.department === 'Sales Department' ? 10 : 0));
    setQuickLaptopTarget(emp.laptopTargetUnits !== undefined ? Number(emp.laptopTargetUnits) : (emp.department === 'Sales Department' ? 5 : 0));
    setIsTargetModalOpen(true);
  };

  const handleSaveQuickTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEditEmployee) return;
    const pUnits = Math.max(0, Number(quickPhoneTarget));
    const lUnits = Math.max(0, Number(quickLaptopTarget));
    onUpdateEmployee({
      ...targetEditEmployee,
      phoneTargetUnits: pUnits,
      laptopTargetUnits: lUnits,
      salesTargetUnits: pUnits + lUnits,
    });
    setIsTargetModalOpen(false);
    setTargetEditEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedCode = code.trim().toUpperCase();
    if (!validateEmployeeCode(trimmedCode, editingEmployee?.id)) {
      return;
    }

    const targetBranch = branches.find((b) => b.id === branchId);
    const branchName = targetBranch ? targetBranch.name : 'YGN-1 CS';

    if (editingEmployee) {
      const existingLinkedUser = getLinkedUser(editingEmployee);

      onUpdateEmployee({
        ...editingEmployee,
        code: code.trim(),
        name: name.trim(),
        position: position.trim(),
        department,
        branchId,
        branchName,
        phone: phone.trim(),
        baseSalary: Number(baseSalary),
        joinedDate,
        tenure,
        status,
        phoneTargetUnits: Number(phoneTargetUnits),
        laptopTargetUnits: Number(laptopTargetUnits),
        salesTargetUnits: Number(phoneTargetUnits) + Number(laptopTargetUnits),
        salesTarget: Number(salesTarget),
        kpiScore: Number(kpiScore),
        userAccountId: existingLinkedUser?.id || editingEmployee.userAccountId,
        username: existingLinkedUser?.username || editingEmployee.username,
      });
    } else {
      const newEmpId = `emp-${Date.now()}`;

      const newEmp: Employee = {
        id: newEmpId,
        code: code.trim(),
        name: name.trim(),
        position: position.trim(),
        department,
        branchId,
        branchName,
        phone: phone.trim(),
        baseSalary: Number(baseSalary),
        joinedDate,
        tenure,
        status,
        avatarBg: 'bg-purple-600',
        phoneTargetUnits: Number(phoneTargetUnits),
        laptopTargetUnits: Number(laptopTargetUnits),
        salesTargetUnits: Number(phoneTargetUnits) + Number(laptopTargetUnits),
        salesTarget: Number(salesTarget),
        kpiScore: Number(kpiScore),
      };
      onAddEmployee(newEmp);

      // Ensure filter doesn't hide newly created employee
      if (selectedBranchId !== 'ALL' && selectedBranchId !== branchId) {
        setSelectedBranchId('ALL');
      }
      if (selectedDepartmentFilter !== 'ALL' && selectedDepartmentFilter !== department) {
        setSelectedDepartmentFilter('ALL');
      }
    }

    setIsModalOpen(false);
  };

  // Helper to strictly match employee to branch by branchId (instant reactivity upon branch reassignment)
  const isEmpInBranch = (emp: Employee, targetBranchId: string) => {
    if (!targetBranchId || targetBranchId === 'ALL') return true;
    return emp.branchId === targetBranchId;
  };

  // Filter and sort employees by Ecode in ascending numerical order (EC001, EC002, EC003, ...)
  const filteredEmployees = useMemo(() => {
    const list = employees.filter((emp) => {
      const matchesBranch = isEmpInBranch(emp, selectedBranchId);

      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.branchName.toLowerCase().includes(searchTerm.toLowerCase());

      const empDeptNorm = normalizeDepartmentName(emp.department);
      const matchesDepartment =
        selectedDepartmentFilter === 'ALL' ||
        empDeptNorm === selectedDepartmentFilter;

      return matchesBranch && matchesSearch && matchesDepartment;
    });

    return list.sort((a, b) => {
      const matchA = (a.code || '').match(/(\d+)/);
      const matchB = (b.code || '').match(/(\d+)/);
      const numA = matchA ? parseInt(matchA[1], 10) : 99999;
      const numB = matchB ? parseInt(matchB[1], 10) : 99999;
      if (numA !== numB) return numA - numB;
      return (a.code || '').localeCompare(b.code || '');
    });
  }, [employees, selectedBranchId, searchTerm, selectedDepartmentFilter]);

  // Department Statistics for the 3 main departments filtered by selected branch
  const departmentStats = useMemo(() => {
    const branchEmps = employees.filter((emp) => isEmpInBranch(emp, selectedBranchId));
    const opStaff = branchEmps.filter(e => normalizeDepartmentName(e.department) === 'Sales Department');
    const serviceStaff = branchEmps.filter(e => normalizeDepartmentName(e.department) === 'Service Department');
    const financeStaff = branchEmps.filter(e => normalizeDepartmentName(e.department) === 'Finance Department');
    return {
      opCount: opStaff.length,
      serviceCount: serviceStaff.length,
      financeCount: financeStaff.length,
      total: branchEmps.length,
    };
  }, [employees, selectedBranchId]);

  // Individual Employee KPI metrics calculation (Sales value, Target Met %, Transaction count)
  const employeeKpis = useMemo(() => {
    return employees.map((emp) => {
      const empSales = (sales || []).filter((s) => {
        const empName = emp.name.trim().toLowerCase();
        const empCode = (emp.code || '').trim().toLowerCase();
        const empId = emp.id;

        const sEmpName = (s.employeeName || '').trim().toLowerCase();
        const sEmpId = s.employeeId || '';
        const sTechName = (s.technicianName || '').trim().toLowerCase();
        const sSalesName = (s.salespersonName || '').trim().toLowerCase();
        const sSalesId = s.salespersonId || '';

        const matchesEmp =
          (sEmpId && sEmpId === empId) ||
          (sSalesId && sSalesId === empId) ||
          (sEmpName && (sEmpName === empName || sEmpName.includes(empName) || empName.includes(sEmpName))) ||
          (sTechName && (sTechName === empName || sTechName.includes(empName) || empName.includes(sTechName))) ||
          (sSalesName && (sSalesName === empName || sSalesName.includes(empName) || empName.includes(sSalesName))) ||
          (empCode && (sEmpName.includes(empCode) || (s.invoiceNo && s.invoiceNo.toLowerCase().includes(empCode))));

        const matchesMonth =
          !selectedMonth || selectedMonth === 'ALL' || (s.date && s.date.startsWith(selectedMonth));
        return matchesEmp && matchesMonth;
      });

      const totalSalesValue = empSales.reduce((sum, s) => sum + (Number(s.salePrice) || 0), 0);
      const totalTransactions = empSales.length;

      let phoneUnitsSold = 0;
      let laptopUnitsSold = 0;

      empSales.forEach((s) => {
        const cat = (s.category || '').toLowerCase();
        const item = (s.itemName || '').toLowerCase();
        const qty = Number(s.quantity) || 1;

        const isPhone = cat.includes('phone') || cat.includes('mobile') || cat.includes('smartphone') || item.includes('iphone') || item.includes('samsung') || item.includes('redmi') || item.includes('xiaomi') || item.includes('oppo') || item.includes('vivo') || item.includes('realme') || item.includes('pixel') || item.includes('honor');
        const isLaptop = cat.includes('laptop') || cat.includes('computer') || item.includes('macbook') || item.includes('notebook') || item.includes('thinkpad') || item.includes('asus') || item.includes('dell') || item.includes('hp') || item.includes('lenovo') || item.includes('acer') || item.includes('msi');

        if (isPhone) {
          phoneUnitsSold += qty;
        } else if (isLaptop) {
          laptopUnitsSold += qty;
        } else if (s.saleType !== 'SERVICE') {
          phoneUnitsSold += qty;
        }
      });

      const totalUnitsSold = phoneUnitsSold + laptopUnitsSold;
      const phoneTarget = emp.phoneTargetUnits !== undefined ? Number(emp.phoneTargetUnits) : (emp.department === 'Sales Department' ? 10 : 0);
      const laptopTarget = emp.laptopTargetUnits !== undefined ? Number(emp.laptopTargetUnits) : (emp.department === 'Sales Department' ? 5 : 0);
      const totalUnitTarget = emp.salesTargetUnits || (phoneTarget + laptopTarget);

      const targetMetPct = totalUnitTarget > 0 ? Math.round((totalUnitsSold / totalUnitTarget) * 100) : (totalUnitsSold > 0 ? 100 : 0);
      const avgSaleValue = totalTransactions > 0 ? Math.round(totalSalesValue / totalTransactions) : 0;

      let statusTier: 'TOP' | 'MET' | 'PROGRESS' = 'PROGRESS';
      if (targetMetPct >= 120) {
        statusTier = 'TOP';
      } else if (targetMetPct >= 100) {
        statusTier = 'MET';
      } else {
        statusTier = 'PROGRESS';
      }

      return {
        emp,
        totalSalesValue,
        totalTransactions,
        phoneUnitsSold,
        laptopUnitsSold,
        totalUnitsSold,
        phoneTarget,
        laptopTarget,
        totalUnitTarget,
        targetAmount: emp.salesTarget || 0,
        targetMetPct,
        avgSaleValue,
        statusTier,
      };
    });
  }, [employees, sales, selectedMonth]);

  const branchEmployeeKpis = useMemo(() => {
    return employeeKpis.filter((k) => isEmpInBranch(k.emp, selectedBranchId));
  }, [employeeKpis, selectedBranchId]);

  const kpiStats = useMemo(() => {
    const totalTeamSales = branchEmployeeKpis.reduce((sum, k) => sum + k.totalSalesValue, 0);
    const totalTeamTarget = branchEmployeeKpis.reduce((sum, k) => sum + k.targetAmount, 0);
    const staffMetCount = branchEmployeeKpis.filter((k) => k.targetMetPct >= 100).length;
    const metRatePct = branchEmployeeKpis.length > 0 ? Math.round((staffMetCount / branchEmployeeKpis.length) * 100) : 0;
    const topPerformer = [...branchEmployeeKpis].sort((a, b) => b.totalSalesValue - a.totalSalesValue)[0];

    return {
      totalTeamSales,
      totalTeamTarget,
      staffMetCount,
      metRatePct,
      topPerformer,
    };
  }, [branchEmployeeKpis]);

  // Department Badge Helper
  const getDepartmentBadge = (dept: string) => {
    const norm = normalizeDepartmentName(dept);
    if (norm === 'Sales Department') {
      return {
        label: 'Sales Dept',
        bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: BriefcaseBusiness,
        iconClass: 'text-amber-600',
      };
    }
    if (norm === 'Service Department') {
      return {
        label: 'Service Dept',
        bgClass: 'bg-blue-50 text-blue-800 border-blue-200',
        icon: Wrench,
        iconClass: 'text-blue-600',
      };
    }
    return {
      label: 'Finance Dept',
      bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CircleDollarSign,
      iconClass: 'text-emerald-600',
    };
  };

  // Position pill badge color helper
  const getPositionBadge = (pos: string) => {
    const upper = (pos || '').toUpperCase();
    if (upper.includes('HOD') && !upper.includes('DY')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
    }
    if (upper.includes('DYHOD')) {
      return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
    }
    if (upper.includes('SENIOR')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
    }
    if (upper === 'MANAGER') {
      return 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
    }
    if (upper.includes('ASSISTANT')) {
      return 'bg-violet-50 text-violet-700 border-violet-200 font-bold';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 font-semibold';
  };

  const currentBranchLabel = useMemo(() => {
    if (selectedBranchId === 'ALL') return 'All Branches';
    const found = branches.find(b => b.id === selectedBranchId);
    return found ? `${found.code} - ${found.name}` : selectedBranchId;
  }, [selectedBranchId, branches]);

  return (
    <div className="space-y-5">
      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Team Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Staff roster and productivity tracking
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveSubTab('roster')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'roster'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Staff List</span>
            </button>
            <button
              onClick={() => setActiveSubTab('performance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeSubTab === 'performance'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span>Staff Performance</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onResequenceEmployees && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to renumber all Employee IDs starting from EC001?')) {
                    onResequenceEmployees();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Renumber all Employee IDs sequentially starting from EC001"
              >
                <Hash className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Renumber IDs (EC001...)</span>
                <span className="sm:hidden">Renumber (EC001)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsPositionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
              title="Add, Rename or Delete company positions"
            >
              <Briefcase className="w-4 h-4 text-purple-600" />
              <span>Manage Positions</span>
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-purple-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Branch Selection Pills / Tabs Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-800">
              Staff List by Branch:
            </span>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 self-start sm:self-auto">
            Viewing: <strong className="font-black text-purple-900">{currentBranchLabel}</strong> ({departmentStats.total} staff)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <button
            onClick={() => setSelectedBranchId('ALL')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedBranchId === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25 ring-2 ring-purple-600/20'
                : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All Branches</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              selectedBranchId === 'ALL' ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {employees.length}
            </span>
          </button>

          {branches.map((b) => {
            const count = employees.filter(emp => isEmpInBranch(emp, b.id)).length;
            const isSelected = selectedBranchId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25 ring-2 ring-purple-600/20'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{b.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Main Departments Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Sales Department */}
        <button
          onClick={() => setSelectedDepartmentFilter(prev => prev === 'Sales Department' ? 'ALL' : 'Sales Department')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedDepartmentFilter === 'Sales Department'
              ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/20 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <BriefcaseBusiness className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Sales Department
                </h3>
                <p className="text-[11px] text-amber-800 font-medium">
                  Sales &amp; Store Operations
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900">
                {departmentStats.opCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">Staff</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {selectedBranchId === 'ALL' ? 'Retail, Wholesales & Store Sales' : `${currentBranchLabel} • Sales`}
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
              selectedDepartmentFilter === 'Sales Department'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {selectedDepartmentFilter === 'Sales Department' ? 'Active Filter' : 'Filter By'}
            </span>
          </div>
        </button>

        {/* Card 2: Service Department */}
        <button
          onClick={() => setSelectedDepartmentFilter(prev => prev === 'Service Department' ? 'ALL' : 'Service Department')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedDepartmentFilter === 'Service Department'
              ? 'bg-blue-500/10 border-blue-400 ring-2 ring-blue-400/40 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/20 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Service Department
                </h3>
                <p className="text-[11px] text-blue-800 font-medium">
                  Technical Repairs &amp; Maintenance
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900">
                {departmentStats.serviceCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">Staff</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {selectedBranchId === 'ALL' ? 'Mobile, Laptop & Machine Repair' : `${currentBranchLabel} • Service`}
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
              selectedDepartmentFilter === 'Service Department'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {selectedDepartmentFilter === 'Service Department' ? 'Active Filter' : 'Filter By'}
            </span>
          </div>
        </button>

        {/* Card 3: Finance Department */}
        <button
          onClick={() => setSelectedDepartmentFilter(prev => prev === 'Finance Department' ? 'ALL' : 'Finance Department')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedDepartmentFilter === 'Finance Department'
              ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/40 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/20 shadow-2xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
                <CircleDollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Finance Department
                </h3>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Finance, Accounting &amp; Audit
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900">
                {departmentStats.financeCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">Staff</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {selectedBranchId === 'ALL' ? 'Payroll, Accounting & Ground Audit' : `${currentBranchLabel} • Finance`}
            </span>
            <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
              selectedDepartmentFilter === 'Finance Department'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {selectedDepartmentFilter === 'Finance Department' ? 'Active Filter' : 'Filter By'}
            </span>
          </div>
        </button>
      </div>

      {/* Roster View */}
      {activeSubTab === 'roster' ? (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Top Filter Bar matching screenshot */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-purple-600 mr-2 shrink-0" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter Dropdown */}
              <div className="relative flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-purple-600 mr-2 shrink-0" />
                <select
                  value={selectedDepartmentFilter}
                  onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  <option value="Sales Department">Sales Department</option>
                  <option value="Service Department">Service Department</option>
                  <option value="Finance Department">Finance Department</option>
                </select>
              </div>

              {/* Quick Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-500 shadow-2xs"
                />
              </div>

              {selectedDepartmentFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedDepartmentFilter('ALL')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200 transition-colors"
                  title="Clear Department Filter"
                >
                  <span>Reset Dept</span>
                  <span className="font-black text-sm">×</span>
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 self-end lg:self-auto">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>TOTAL: {filteredEmployees.length} PERSONNEL</span>
            </div>
          </div>

          {/* Table matching columns: NO. | ID | STAFF NAME | POSITION | DEPARTMENT | BRANCH | TENURE | (KPI METRICS if MD/Manager) | ACTIONS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">NO.</th>
                  <th className="py-3 px-4 w-24">ID</th>
                  <th className="py-3 px-4 min-w-[180px]">STAFF NAME</th>
                  <th className="py-3 px-4 min-w-[140px]">POSITION</th>
                  <th className="py-3 px-4 min-w-[160px]">DEPARTMENT</th>
                  <th className="py-3 px-4 w-28">BRANCH</th>
                  <th className="py-3 px-4 w-24">TENURE</th>
                  {isMDOrManager && (
                    <th className="py-3 px-4 min-w-[180px]">SALES & TARGET (KPI)</th>
                  )}
                  <th className="py-3 px-4 w-28 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.map((emp, index) => {
                  const dBadge = getDepartmentBadge(emp.department);
                  const IconComp = dBadge.icon;
                  const empKpi = employeeKpis.find((k) => k.emp.id === emp.id);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {emp.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{emp.name}</span>
                          {emp.status === 'resigned' && (
                            <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Resigned
                            </span>
                          )}
                        </div>
                        {(() => {
                          const linked = getLinkedUser(emp);
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {linked ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-semibold" title={`Linked User Account: ${linked.username} (Role: ${linked.role})`}>
                                  <KeyRound className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                  <span>{linked.username}</span>
                                  <span className="text-purple-500 font-bold">• PIN: {linked.pin}</span>
                                </span>
                              ) : (
                                emp.phone && (
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                    <span>{emp.phone}</span>
                                  </div>
                                )
                              )}
                              {linked && emp.phone && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  • {emp.phone}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] tracking-wide border ${getPositionBadge(
                            emp.position
                          )}`}
                        >
                          {emp.position.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${dBadge.bgClass}`}>
                          <IconComp className={`w-3.5 h-3.5 shrink-0 ${dBadge.iconClass}`} />
                          <span>{dBadge.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50/70 text-purple-900 border border-purple-200/80">
                          <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{emp.branchName || 'Shop 1'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[11px] font-semibold">
                          {calculateTenure(emp.joinedDate)}
                        </span>
                      </td>
                      {isMDOrManager && (
                        <td className="py-3.5 px-4">
                          {empKpi ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-black font-mono text-purple-900 flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>{empKpi.totalUnitsSold} Units</span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    ({empKpi.phoneUnitsSold}📱 / {empKpi.laptopUnitsSold}💻)
                                  </span>
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
                                    empKpi.targetMetPct >= 100
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : empKpi.targetMetPct >= 60
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {empKpi.targetMetPct}% Met
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    empKpi.targetMetPct >= 100
                                      ? 'bg-emerald-500'
                                      : empKpi.targetMetPct >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${Math.min(100, empKpi.targetMetPct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>Target: {empKpi.totalUnitTarget > 0 ? `${empKpi.totalUnitTarget} Units (${empKpi.phoneTarget}📱 / ${empKpi.laptopTarget}💻)` : 'No Quota'}</span>
                                <button
                                  type="button"
                                  onClick={() => openQuickTargetModal(emp)}
                                  className="text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                                  title="Adjust Sales Target"
                                >
                                  Edit Target
                                </button>
                              </div>
                              <div className="text-[9.5px] text-slate-400 font-mono">
                                Total Sales: {formatMMK(empKpi.totalSalesValue)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Edit Staff Information"
                          >
                            <Edit3 className="w-4 h-4 text-purple-600" />
                          </button>
                          {canDeleteEmployee && (
                            <button
                              onClick={() => onDeleteEmployee(emp.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Staff"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={isMDOrManager ? 9 : 8} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3">
                          <Users className="w-7 h-7" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-1">
                          No Staff Personnel Found
                        </h4>
                        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                          No employees match the current filter or search criteria.
                        </p>
                        <button
                          type="button"
                          onClick={openAddModal}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Add Employee</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Performance & KPI Subtab */
        <div className="space-y-6">
          {isMDOrManager ? (
            <>
              {/* KPI Header Metric Cards (Visible to MD & Manager) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Total Team Sales Value
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-bold font-mono text-purple-950 mt-2">
                    {formatMMK(kpiStats.totalTeamSales)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Across {filteredEmployees.length} staff members
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Target Met Rate
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-700 mt-2">
                    {kpiStats.metRatePct}%
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {kpiStats.staffMetCount} of {employeeKpis.length} achieved 100%+ target
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Top Performer
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-2 truncate">
                    {kpiStats.topPerformer?.emp.name || 'No Sales Yet'}
                  </p>
                  <p className="text-[11px] text-amber-700 font-bold font-mono mt-1">
                    {kpiStats.topPerformer ? `${formatMMK(kpiStats.topPerformer.totalSalesValue)} (${kpiStats.topPerformer.targetMetPct}% Met)` : '-'}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Invoices Processed
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-bold font-mono text-blue-900 mt-2">
                    {employeeKpis.reduce((sum, k) => sum + k.totalTransactions, 0)}
                  </p>
                  <p className="text-[11px] text-blue-600 mt-1 font-medium">
                    Sales transactions completed
                  </p>
                </div>
              </div>

              {/* Individual KPI Tracking Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span>Individual Employee KPI & Sales Performance Tracker</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track individual sales generation against monthly targets and achievements.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPerformanceFilter('ALL')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        performanceFilter === 'ALL'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All Staff
                    </button>
                    <button
                      onClick={() => setPerformanceFilter('MET')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        performanceFilter === 'MET'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Target Met (≥100%)</span>
                    </button>
                    <button
                      onClick={() => setPerformanceFilter('PROGRESS')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        performanceFilter === 'PROGRESS'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>In Progress (&lt;100%)</span>
                    </button>
                    <button
                      onClick={() => setPerformanceFilter('TOP')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                        performanceFilter === 'TOP'
                          ? 'bg-purple-900 text-white'
                          : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-50'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Top (≥120%)</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1080px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">NO.</th>
                        <th className="py-3 px-4 min-w-[200px]">EMPLOYEE & POSITION</th>
                        <th className="py-3 px-4 min-w-[130px]">BRANCH</th>
                        <th className="py-3 px-4 min-w-[160px]">TOTAL SALES VALUE</th>
                        <th className="py-3 px-4 min-w-[160px]">MONTHLY TARGET</th>
                        <th className="py-3 px-4 min-w-[180px]">TARGET MET %</th>
                        <th className="py-3 px-4 text-center w-28">INVOICES</th>
                        <th className="py-3 px-4 text-center w-32">AVG / SALE</th>
                        <th className="py-3 px-4 text-center w-24">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {branchEmployeeKpis
                        .filter((k) => {
                          const matchesSearch =
                            k.emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            k.emp.code.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesTier =
                            performanceFilter === 'ALL' ||
                            (performanceFilter === 'MET' && k.targetMetPct >= 100) ||
                            (performanceFilter === 'PROGRESS' && k.targetMetPct < 100) ||
                            (performanceFilter === 'TOP' && k.targetMetPct >= 120);

                          return matchesSearch && matchesTier;
                        })
                        .map((kpi, idx) => {
                          const dBadge = getDepartmentBadge(kpi.emp.department);
                          return (
                            <tr
                              key={kpi.emp.id}
                              className="hover:bg-purple-50/30 transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${kpi.emp.avatarBg || 'bg-purple-600'}`}>
                                    {kpi.emp.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <span>{kpi.emp.name}</span>
                                      {kpi.targetMetPct >= 120 && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                                          <Sparkles className="w-2.5 h-2.5" /> Top
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                      {kpi.emp.code} • {kpi.emp.position}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-700">
                                {kpi.emp.branchName}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-purple-950 text-sm">
                                  {formatMMK(kpi.totalSalesValue)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-slate-700">
                                    {kpi.targetAmount > 0 ? formatMMK(kpi.targetAmount) : '0 MMK (No Quota)'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openQuickTargetModal(kpi.emp)}
                                    className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                    title="Edit Target Amount"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span
                                      className={`font-bold ${
                                        kpi.targetMetPct >= 100
                                          ? 'text-emerald-700'
                                          : kpi.targetMetPct >= 70
                                          ? 'text-amber-700'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {kpi.targetMetPct}% Met
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {kpi.targetMetPct >= 100 ? 'Achieved' : 'In Progress'}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        kpi.targetMetPct >= 100
                                          ? 'bg-emerald-500'
                                          : kpi.targetMetPct >= 70
                                          ? 'bg-amber-500'
                                          : 'bg-purple-500'
                                      }`}
                                      style={{ width: `${Math.min(100, kpi.targetMetPct)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700">
                                {kpi.totalTransactions}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">
                                {kpi.avgSaleValue > 0 ? formatMMK(kpi.avgSaleValue) : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => openQuickTargetModal(kpi.emp)}
                                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  Set Target
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* Non-MD/Manager View: Restrict revenue metrics */
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                KPI Performance Access Restricted
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Key performance indicators (KPIs) and revenue target tracking are visible only to MD and Manager roles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick Target Edit Modal */}
      {isTargetModalOpen && targetEditEmployee && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTargetModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Set Monthly Sales Target
                  </h3>
                  <p className="text-xs text-slate-500">{targetEditEmployee.name} ({targetEditEmployee.code})</p>
                </div>
              </div>
              <button
                onClick={() => setIsTargetModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSaveQuickTarget} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Smartphones (Units)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quickPhoneTarget}
                    onChange={(e) => setQuickPhoneTarget(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 font-mono font-black text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Phone target count
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                    <Laptop className="w-3.5 h-3.5 text-purple-600" />
                    <span>Laptops / PCs (Units)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quickLaptopTarget}
                    onChange={(e) => setQuickLaptopTarget(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 font-mono font-black text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Laptop target count
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-purple-900 font-extrabold text-xs">
                <span>Total Unit Target:</span>
                <span className="font-mono text-sm">{quickPhoneTarget + quickLaptopTarget} Units / mo</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs transition-colors"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingEmployee ? 'Edit Staff Profile' : 'Add New Staff Member'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingEmployee ? `Employee Code: ${code}` : 'Code auto-starts with EC001'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
                {/* 1. Department & Position Dependent Dropdown (Prominent Box) */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      1. Department *
                    </label>
                    <select
                      value={department}
                      onChange={(e) => handleDepartmentChange(e.target.value as CompanyDepartment)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs cursor-pointer focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="Sales Department">
                        Sales Department
                      </option>
                      <option value="Finance Department">
                        Finance Department
                      </option>
                      <option value="Service Department">
                        Service Department
                      </option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-800 font-bold">
                        2. Position Title *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsInlineAddPositionOpen(!isInlineAddPositionOpen)}
                          className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold cursor-pointer bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors flex items-center gap-1"
                          title="Add a new position title to this department"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add Position</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPositionModalOpen(true)}
                          className="text-[11px] text-slate-600 hover:text-purple-700 font-semibold cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1 border border-slate-200"
                          title="Manage, Rename or Delete Positions"
                        >
                          <Briefcase className="w-3 h-3 text-purple-600" />
                          <span>Manage / Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomPosition(!isCustomPosition)}
                          className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer ml-1"
                        >
                          {isCustomPosition ? '← List' : 'Custom'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Quick Add Input */}
                    {isInlineAddPositionOpen && (
                      <div className="mb-2 p-2.5 bg-purple-100/70 rounded-xl border border-purple-300 space-y-1.5 animate-in fade-in duration-100">
                        <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                          <span>+ Add New Position to {department}:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsInlineAddPositionOpen(false);
                              setInlineNewPositionTitle('');
                            }}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={inlineNewPositionTitle}
                            onChange={(e) => setInlineNewPositionTitle(e.target.value)}
                            placeholder="e.g. Senior Sales Lead / Stock Controller..."
                            className="flex-1 px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveInlinePosition();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleSaveInlinePosition}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                          >
                            Save &amp; Select
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCustomPosition ? (
                      <div>
                        <select
                          value={position}
                          onChange={(e) => handlePositionChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs cursor-pointer focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          {(activePositionsMap[department] || []).map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                          {position && !(activePositionsMap[department] || []).includes(position) && (
                            <option value={position}>{position} (Current)</option>
                          )}
                        </select>

                        {position && !(activePositionsMap[department] || []).includes(position) && (
                          <div className="mt-1.5 flex items-center justify-between text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <span>This position is not yet in the {department} position list</span>
                            <button
                              type="button"
                              onClick={() => {
                                onAddPosition?.(department, position);
                              }}
                              className="font-bold underline hover:text-amber-950 cursor-pointer"
                            >
                              + Save to List
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        required
                        value={position}
                        onChange={(e) => handlePositionChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-slate-900 font-bold text-xs focus:ring-2 focus:ring-purple-500"
                        placeholder="e.g. Senior Specialist, Assistant Lead..."
                      />
                    )}
                  </div>
                </div>

                {/* 2. Employee Code & Full Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                      <span>Employee Code (EC) *</span>
                      {ecodeError && (
                        <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" /> Duplicate Code
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCode(val);
                        validateEmployeeCode(val, editingEmployee?.id);
                      }}
                      className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-sm ${
                        ecodeError
                          ? 'bg-red-50 border-2 border-red-500 text-red-900 focus:ring-red-500'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}
                      placeholder="e.g. EC001"
                    />
                    {ecodeError && (
                      <p className="mt-1 text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        {ecodeError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold"
                      placeholder="e.g. U Kyaw Kyaw"
                    />
                  </div>
                </div>

                {/* 3. Assigned Branch & Tenure */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Assigned Branch *
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Tenure
                    </label>
                    <input
                      type="text"
                      value={tenure}
                      onChange={(e) => setTenure(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
                      placeholder="e.g. 1y 2m"
                    />
                    {(() => {
                      const tCalc = calculateEmployeeTenure(joinedDate, undefined, tenure);
                      return (
                        <div className="text-[10px] text-amber-800 font-semibold mt-1 flex items-center justify-between">
                          <span>Service Allowance:</span>
                          <span className="font-mono font-bold text-amber-950">+{formatMMK(tCalc.serviceAllowance)}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 4. Phone & Joined Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Phone Contact
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                      placeholder="09-..."
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Joined Date
                    </label>
                    <input
                      type="date"
                      value={joinedDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJoinedDate(val);
                        const calc = calculateEmployeeTenure(val);
                        setTenure(calc.tenureString);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                  </div>
                </div>

                {/* Base Monthly Salary Edit Info for MD when editing */}
                {editingEmployee && isMD ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-700 font-semibold text-xs flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Base Monthly Salary (MMK)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Can also be managed in Staff Payroll
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold text-xs"
                      placeholder="0"
                    />
                  </div>
                ) : null}

                {/* 5. Employment Status */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Employment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="leave">On Leave</option>
                    <option value="resigned">Resigned</option>
                  </select>
                </div>

                {/* Employee Directory Security Policy Notice */}
                <div className="p-3.5 bg-gradient-to-br from-purple-50/90 to-indigo-50/70 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Employee Directory Security Policy (ဝန်ထမ်းသစ် စာရင်းသွင်းခြင်း)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Employee Directory ကဏ္ဍသည် ဝန်ထမ်းသစ်များ စာရင်းသွင်းခြင်းနှင့် ဝန်ထမ်းအချက်အလက်များကိုသာ စီမံခန့်ခွဲပါသည်။ စနစ်တွင်းသို့ User Login Account များကို Auto Create ပြုလုပ်ခွင့်မရှိဘဲ Managing Director (MD) ကသာ <strong>User Management</strong> ကဏ္ဍတွင် ဝန်ထမ်းအမည်နှင့် Firestore UID ကို တိုက်ရိုက်ချိတ်ဆက်၍ သတ်မှတ်ထားသော Role အတိုင်း အကောင့်ဖွင့်လှစ်ပေးမည် ဖြစ်ပါသည်။
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-purple-700 font-semibold pt-1 border-t border-purple-100">
                    <span>🔒 Authorized Roles: Staff, Cashier, Sales Manager, Admin, Finance, Operation, MD</span>
                  </div>
                </div>

                {/* Sales Target & KPI Configuration (Visible to MD & Manager) */}
                {isMDOrManager && (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-purple-900 font-extrabold text-xs">
                        <Target className="w-4 h-4 text-purple-600" />
                        <span>Monthly Unit Target & KPI Settings</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">
                        Total: {phoneTargetUnits + laptopTargetUnits} Units / mo
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1 text-[11px] flex items-center gap-1">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Smartphones (Units)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={phoneTargetUnits}
                          onChange={(e) => setPhoneTargetUnits(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-slate-900 font-mono font-black text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g. 10"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Set 0 if no phone quota
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1 text-[11px] flex items-center gap-1">
                          <Laptop className="w-3.5 h-3.5 text-purple-600" />
                          <span>Laptops / PCs (Units)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={laptopTargetUnits}
                          onChange={(e) => setLaptopTargetUnits(Math.max(0, Number(e.target.value)))}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-slate-900 font-mono font-black text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g. 5"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Set 0 if no laptop quota
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                          Target Met Score %
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={kpiScore}
                          onChange={(e) => setKpiScore(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                          KPI Benchmark %
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Security Policy Reminder */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-amber-900">
                      Employee Directory မူဝါဒ လမ်းညွှန်ချက်
                    </div>
                    <p className="text-amber-800/90 leading-relaxed text-[11px]">
                      ဤကဏ္ဍတွင် ဝန်ထမ်းသစ်များ စာရင်းသွင်းခြင်းနှင့် ဝန်ထမ်းအချက်အလက်များကိုသာ စီမံခန့်ခွဲပါသည်။ စနစ်သုံးစွဲခွင့် User Account နှင့် Firestore Auth UID ချိတ်ဆက်ခြင်းကို Auto-create မပြုလုပ်ဘဲ Managing Director (MD) ကသာလျှင် <strong className="font-semibold text-amber-950">User Management</strong> တွင် တိုက်ရိုက် စနစ်တကျ ချိတ်ဆက်ဖွင့်လှစ်ပေးနိုင်ပါသည်။
                    </p>
                  </div>
                </div>
              </div>

              {/* Sticky Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(ecodeError)}
                  className={`px-5 py-2 text-white rounded-lg font-bold shadow-xs transition-colors ${
                    ecodeError
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                  }`}
                >
                  {editingEmployee ? 'Save Changes' : 'Create Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Position Management Modal */}
      {isPositionModalOpen && (
        <PositionManagementModal
          isOpen={isPositionModalOpen}
          onClose={() => setIsPositionModalOpen(false)}
          positionsMap={activePositionsMap}
          employees={employees}
          onAddPosition={(dept, title) => onAddPosition?.(dept, title)}
          onRenamePosition={(dept, oldTitle, newTitle, updateEmps) =>
            onRenamePosition?.(dept, oldTitle, newTitle, updateEmps)
          }
          onDeletePosition={(dept, title) => onDeletePosition?.(dept, title)}
          onResetPositions={onResetPositions}
          initialDepartment={department}
        />
      )}
    </div>
  );
};
