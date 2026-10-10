import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download,
  Award, 
  TrendingUp, 
  Calendar, 
  Building2, 
  User, 
  Search, 
  FileText, 
  CheckCircle2, 
  Scissors,
  DollarSign,
  Briefcase,
  Layers,
  Star,
  RefreshCw,
  Percent,
  Sparkles,
  ArrowRightCircle,
  Check,
  Trash2
} from 'lucide-react';
import { Employee, Branch, DailySale, DailyExpense, SalaryRecord, BonusSlipData, UserAccount, canUserDelete, canUserDeletePayrollSlip } from '../types';
import { formatMMK, formatNumber, formatDateDMY, getStandardWorkingDaysForMonth } from '../utils/formatters';
import { BonusSlipModal } from './BonusSlipModal';
import { printOrSaveBonusSlips, generateBatchBonusSlipsHTML } from '../utils/printHelpers';
import { matchSalaryRecordWithEmployee } from '../data/shweKyalTagonStaffData';

interface PerformanceBonusManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  branches: Branch[];
  sales: DailySale[];
  expenses?: DailyExpense[];
  salaryRecords?: SalaryRecord[];
  users?: UserAccount[];
  currentUser?: UserAccount;
  onSyncBonusToPayroll?: (updatedSalaryRecords: SalaryRecord[]) => void;
  onDeleteSalaryRecord?: (id: string) => void;
  selectedMonth?: string;
  initialBatchPrint?: boolean;
}

export const PerformanceBonusManagerModal: React.FC<PerformanceBonusManagerModalProps> = ({
  isOpen,
  onClose,
  employees = [],
  branches = [],
  sales = [],
  expenses = [],
  salaryRecords = [],
  users = [],
  currentUser,
  onSyncBonusToPayroll,
  onDeleteSalaryRecord,
  selectedMonth = 'ALL',
  initialBatchPrint = false,
}) => {
  const [periodType, setPeriodType] = useState<'QUARTERLY' | 'YEARLY'>('QUARTERLY');
  const [year, setYear] = useState<string>('2026');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [profitSharePercent, setProfitSharePercent] = useState<number>(15);
  const [isAutoSyncPnl, setIsAutoSyncPnl] = useState<boolean>(true);
  const [bonusPoolAmount, setBonusPoolAmount] = useState<number>(0);
  const [employeePointsOverrides, setEmployeePointsOverrides] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

  // Modal for Single Slip view
  const [selectedSingleSlip, setSelectedSingleSlip] = useState<BonusSlipData | null>(null);
  const [isSingleSlipOpen, setIsSingleSlipOpen] = useState<boolean>(false);

  // Modal for Batch Slip Printing
  const [isBatchPrintView, setIsBatchPrintView] = useState<boolean>(initialBatchPrint);

  useEffect(() => {
    if (isOpen && initialBatchPrint) {
      setIsBatchPrintView(true);
    }
  }, [isOpen, initialBatchPrint]);

  // Helper to detect Managing Director (MD) who is strictly excluded from bonus distribution as requested:
  // Exclude MD from bonus calculation
  const isMD = (name?: string, pos?: string, role?: string) => {
    const n = (name || '').toLowerCase();
    const p = (pos || '').toLowerCase();
    const r = (role || '').toLowerCase();
    return (
      r === 'managing director' ||
      p.includes('managing director') ||
      /\bmd\b/i.test(p) ||
      p.includes('(md)') ||
      n.includes('su myat win')
    );
  };

  // Unified Employees List including all staff and managers (EXCLUDING MD)
  const allStaffAndManagers: Employee[] = useMemo(() => {
    // Exclude resigned and MD
    const list = [...(employees || [])].filter((e) => e && e.status !== 'resigned' && !isMD(e.name, e.position));
    
    // Check if any manager user accounts exist that are not yet in employees (strictly excluding MD)
    (users || []).forEach((u) => {
      if ((u.role === 'Sales Manager' || u.role === 'Admin') && !isMD(u.displayName, u.title, u.role)) {
        const alreadyInList = list.some(
          (e) => e.id === u.id || e.name.trim().toLowerCase() === u.displayName.trim().toLowerCase()
        );
        if (!alreadyInList) {
          list.push({
            id: u.id || `emp-${u.username.replace(/[^a-zA-Z0-9]/g, '')}`,
            code: `MGR-${u.id.slice(-4)}`,
            name: u.displayName,
            position: u.title || 'Branch Manager',
            department: 'Sales Department',
            branchId: u.branchId || 'ALL',
            branchName: u.branchName || 'Enterprise',
            phone: '',
            baseSalary: 1000000,
            joinedDate: '2024-01-01',
            status: 'active',
            performancePoints: 10,
          });
        }
      }
    });

    return list.filter((e) => e && e.status !== 'resigned' && !isMD(e.name, e.position));
  }, [employees, users]);

  // Filter months for the selected quarter / year
  const quarterlyMonths = useMemo(() => {
    if (periodType === 'YEARLY') {
      return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    }
    const qMap: Record<string, string[]> = {
      Q1: [`${year}-01`, `${year}-02`, `${year}-03`],
      Q2: [`${year}-04`, `${year}-05`, `${year}-06`],
      Q3: [`${year}-07`, `${year}-08`, `${year}-09`],
      Q4: [`${year}-10`, `${year}-11`, `${year}-12`],
    };
    return qMap[quarter] || [];
  }, [periodType, year, quarter]);

  const periodLabel = useMemo(() => {
    if (periodType === 'YEARLY') {
      return `Year ${year} Annual Bonus`;
    }
    const qText = {
      Q1: 'Q1 (Jan - Mar)',
      Q2: 'Q2 (Apr - Jun)',
      Q3: 'Q3 (Jul - Sep)',
      Q4: 'Q4 (Oct - Dec)',
    }[quarter] || 'Q3';
    return `${qText} ${year}`;
  }, [periodType, year, quarter]);

  // P&L Auto-Calculation for the chosen period matching ProfitLossDashboard 100%
  const pnlSummary = useMemo(() => {
    let totalBilledSales = 0;
    let totalCOGS = 0;
    let realizedGrossProfit = 0;
    let totalExpenses = 0;
    let totalSalaries = 0;

    const periodSales = (sales || []).filter((s) => {
      if (!s || !s.date) return false;
      const m = s.date.slice(0, 7);
      const matchMonth = quarterlyMonths.includes(m);
      const matchBranch = selectedBranchId === 'ALL' || s.branchId === selectedBranchId;
      return matchMonth && matchBranch;
    });

    const periodExpenses = (expenses || []).filter((e) => {
      if (!e || !e.date) return false;
      const m = e.date.slice(0, 7);
      const matchMonth = quarterlyMonths.includes(m);
      const matchBranch = selectedBranchId === 'ALL' || e.branchId === selectedBranchId;
      return matchMonth && matchBranch;
    });

    const periodSalaries = (salaryRecords || []).filter((r) => {
      if (!r || !r.month) return false;
      const matchMonth = quarterlyMonths.includes(r.month);
      const matchBranch = selectedBranchId === 'ALL' || r.branchId === selectedBranchId;
      return matchMonth && matchBranch;
    });

    periodSales.forEach((s) => {
      const salePrice = Number(s.salePrice || 0);
      const costPrice = Number(s.costPrice || 0);
      const itemProfit = s.profit !== undefined ? Number(s.profit) : (salePrice - costPrice);
      const paid = s.paidAmount !== undefined ? Number(s.paidAmount) : salePrice;

      totalBilledSales += salePrice;
      totalCOGS += costPrice;

      if (salePrice > 0) {
        const ratio = Math.min(1, Math.max(0, paid / salePrice));
        realizedGrossProfit += (itemProfit * ratio);
      } else {
        realizedGrossProfit += itemProfit;
      }
    });

    periodExpenses.forEach((e) => {
      totalExpenses += Number(e.amount || 0);
    });

    periodSalaries.forEach((r) => {
      totalSalaries += Number(r.totalEarnings || r.netSalary || 0);
    });

    const totalOperationalCost = totalExpenses + totalSalaries;
    const accrualNetProfit = Math.max(0, totalBilledSales - totalCOGS - totalOperationalCost);
    const realizedNetProfit = Math.max(0, realizedGrossProfit - totalOperationalCost);
    
    // P&L Base Net Profit
    const baseNetProfit = realizedNetProfit > 0 ? realizedNetProfit : accrualNetProfit;
    const suggestedPool = Math.round(baseNetProfit * (profitSharePercent / 100));

    return {
      totalBilledSales,
      totalCOGS,
      realizedGrossProfit,
      totalExpenses,
      totalSalaries,
      totalOperationalCost,
      netProfit: baseNetProfit,
      suggestedPool,
    };
  }, [sales, expenses, salaryRecords, quarterlyMonths, selectedBranchId, profitSharePercent]);

  // Auto-sync bonus pool with P&L when enabled
  useEffect(() => {
    if (isAutoSyncPnl) {
      if (pnlSummary.suggestedPool > 0) {
        setBonusPoolAmount(pnlSummary.suggestedPool);
      } else {
        setBonusPoolAmount(0);
      }
    }
  }, [isAutoSyncPnl, pnlSummary.suggestedPool]);

  // Compute actual sales per employee in this period using thorough identifier matching
  const empSalesMap = useMemo(() => {
    const map: Record<string, number> = {};
    const periodSales = (sales || []).filter((s) => {
      if (!s || !s.date) return false;
      const m = s.date.slice(0, 7);
      return quarterlyMonths.includes(m);
    });

    allStaffAndManagers.forEach((emp) => {
      const empName = emp.name.trim().toLowerCase();
      const empCode = (emp.code || '').trim().toLowerCase();
      const empId = emp.id;

      const empSales = periodSales.filter((s) => {
        const sEmpName = (s.employeeName || '').trim().toLowerCase();
        const sEmpId = s.employeeId || '';
        const sTechName = (s.technicianName || '').trim().toLowerCase();
        const sSalesName = (s.salespersonName || '').trim().toLowerCase();
        const sSalesId = s.salespersonId || '';
        const sSoldByName = (s.soldByName || '').trim().toLowerCase();
        const sSoldById = s.soldByEmployeeId || '';

        return (
          (sEmpId && sEmpId === empId) ||
          (sSalesId && sSalesId === empId) ||
          (sSoldById && sSoldById === empId) ||
          (sEmpName && (sEmpName === empName || sEmpName.includes(empName) || empName.includes(sEmpName))) ||
          (sTechName && (sTechName === empName || sTechName.includes(empName) || empName.includes(sTechName))) ||
          (sSalesName && (sSalesName === empName || sSalesName.includes(empName) || empName.includes(sSalesName))) ||
          (sSoldByName && (sSoldByName === empName || sSoldByName.includes(empName) || empName.includes(sSoldByName))) ||
          (empCode && (sEmpName.includes(empCode) || sSalesName.includes(empCode) || (s.invoiceNo && s.invoiceNo.toLowerCase().includes(empCode))))
        );
      });

      const actual = empSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
      map[emp.id] = actual;
    });

    return map;
  }, [sales, quarterlyMonths, allStaffAndManagers]);

  // Calculate distributions for ALL employees and managers
  const employeeBonusList: BonusSlipData[] = useMemo(() => {
    const monthsCount = periodType === 'YEARLY' ? 12 : 3;

    const rows = allStaffAndManagers.map((emp) => {
      const branch = (branches || []).find((b) => b && b.id === emp.branchId);

      // Check if employee is in a Manager or Management/Executive position
      const isManager = Boolean(
        (emp.position && /(manager|manage|director|head|supervisor|admin|incharge|in-charge)/i.test(emp.position)) ||
        (emp.department && /(manager|manage|director|head|executive|management)/i.test(emp.department)) ||
        emp.isManager === true
      );

      // Monthly target: Managers run Operations and do NOT have an individual sales target
      const monthlyTarget = isManager ? 0 : (
        emp.salesTarget !== undefined && emp.salesTarget !== null ? Number(emp.salesTarget) : (
          emp.department?.toLowerCase().includes('sale') || emp.position?.toLowerCase().includes('sale') ? 3500000 :
          emp.position?.toLowerCase().includes('technician') || emp.position?.toLowerCase().includes('service') ? 2000000 :
          2500000
        )
      );

      const salesTarget = isManager ? 0 : monthlyTarget * monthsCount;
      const actualSales = isManager ? 0 : (empSalesMap[emp.id] || 0);
      const achievementRate = isManager ? 0 : (salesTarget > 0 ? (actualSales / salesTarget) * 100 : 0);

      // Points calculation:
      // - Managers: Dedicated operational performance points (default 10 pts or from performancePoints)
      // - Staff: Direct calculation from Target Met % (achievementRate)
      let autoPoints = 0;
      if (isManager) {
        autoPoints = emp.performancePoints !== undefined ? emp.performancePoints : 10;
      } else if (achievementRate > 0) {
        autoPoints = Number(achievementRate.toFixed(2));
      } else if (actualSales > 0) {
        autoPoints = 0.01;
      } else {
        autoPoints = 0;
      }

      const points = employeePointsOverrides[emp.id] !== undefined
        ? Number(employeePointsOverrides[emp.id])
        : autoPoints;

      return {
        id: `bslip-${emp.id}-${year}-${periodType === 'YEARLY' ? 'ANNUAL' : quarter}`,
        employee: emp,
        branchName: branch ? branch.name : (emp.branchName || 'Shwe Kyal Tagon Branch'),
        periodType,
        periodLabel,
        year: Number(year) || 2026,
        quarter: periodType === 'QUARTERLY' ? quarter : undefined,
        isManager,
        salesTarget,
        actualSales,
        achievementRate: isNaN(achievementRate) ? 0 : achievementRate,
        points: isNaN(points) ? 0 : points,
        totalTeamPoints: 0,
        bonusWeight: 0,
        companyNetProfit: pnlSummary.netProfit,
        profitSharePercent,
        bonusPool: bonusPoolAmount,
        bonusAmount: 0,
        date: new Date().toISOString().split('T')[0],
      };
    });

    const totalPoints = rows.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

    return rows.map((r) => {
      const bonusWeight = totalPoints > 0 ? (r.points / totalPoints) : 0;
      const calculatedBonus = Math.round(Number(bonusPoolAmount || 0) * bonusWeight);
      const bonusAmount = isNaN(calculatedBonus) ? 0 : calculatedBonus;
      return {
        ...r,
        totalTeamPoints: totalPoints,
        bonusWeight,
        bonusAmount,
      };
    });
  }, [allStaffAndManagers, branches, empSalesMap, periodType, year, quarter, bonusPoolAmount, periodLabel, employeePointsOverrides, pnlSummary.netProfit, profitSharePercent]);

  // Filtered rows for table
  const filteredList = useMemo(() => {
    return employeeBonusList.filter((row) => {
      if (!row || !row.employee) return false;
      if (selectedBranchId !== 'ALL' && row.employee.branchId !== selectedBranchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (row.employee.name || '').toLowerCase().includes(q);
        const matchCode = (row.employee.code || '').toLowerCase().includes(q);
        const matchPos = (row.employee.position || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPos) return false;
      }
      return true;
    });
  }, [employeeBonusList, selectedBranchId, searchQuery]);

  const totalCalculatedPoints = useMemo(() => {
    return employeeBonusList.reduce((sum, r) => sum + (Number(r.points) || 0), 0);
  }, [employeeBonusList]);

  const totalDistributedBonus = useMemo(() => {
    return employeeBonusList.reduce((sum, r) => sum + (Number(r.bonusAmount) || 0), 0);
  }, [employeeBonusList]);

  if (!isOpen) return null;

  const handleOpenSingleSlip = (slip: BonusSlipData) => {
    setSelectedSingleSlip(slip);
    setIsSingleSlipOpen(true);
  };

  const handlePrintBatch = () => {
    printOrSaveBonusSlips(filteredList, periodLabel);
  };

  const handleDownloadBonusBatchFile = () => {
    const html = generateBatchBonusSlipsHTML(filteredList, periodLabel);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staff_Bonus_Slips_${periodLabel}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync bonus to HR Payroll Salary Records
  const handleSyncToPayroll = () => {
    if (!onSyncBonusToPayroll) return;

    // Target month for payroll (use the last month of the quarter or selected month)
    const targetMonth = periodType === 'YEARLY' 
      ? `${year}-12` 
      : quarterlyMonths[quarterlyMonths.length - 1] || `${year}-03`;

    const updatedRecords = [...(salaryRecords || [])];

    employeeBonusList.forEach((bRow) => {
      const emp = bRow.employee;
      const existingIdx = updatedRecords.findIndex(
        (r) => matchSalaryRecordWithEmployee(r, emp) && (r.month === targetMonth || r.month === selectedMonth)
      );

      if (existingIdx >= 0) {
        const existing = updatedRecords[existingIdx];
        const prevBonus = existing.performanceBonus || 0;
        const netDifference = bRow.bonusAmount - prevBonus;
        
        updatedRecords[existingIdx] = {
          ...existing,
          performanceBonus: bRow.bonusAmount,
          performancePoints: bRow.points,
          salesTarget: bRow.salesTarget,
          actualSales: bRow.actualSales,
          targetMetPercent: bRow.achievementRate,
          bonusPeriodType: periodType,
          bonusPeriodLabel: periodLabel,
          totalEarnings: (existing.totalEarnings || existing.basicSalary) + netDifference,
          netSalary: (existing.netSalary || existing.basicSalary) + netDifference,
        };
      } else {
        // Create new salary record with bonus included
        const basicSalary = emp.baseSalary || 0;
        const totalEarnings = basicSalary + bRow.bonusAmount + 30000;
        const totalDeductions = 0;
        const netSalary = totalEarnings - totalDeductions;

        updatedRecords.push({
          id: `sal-bonus-${emp.id}-${targetMonth}`,
          employeeId: emp.id,
          employeeName: emp.name,
          position: emp.position,
          department: emp.department,
          branchId: emp.branchId || 'branch-1',
          branchName: bRow.branchName,
          month: targetMonth,
          workingDaysStandard: getStandardWorkingDaysForMonth(targetMonth),
          actualDaysWorked: getStandardWorkingDaysForMonth(targetMonth),
          absentDays: 0,
          basicSalary,
          attendanceBonus: 30000,
          otHours: 0,
          otRatePerHour: 2500,
          otTotal: 0,
          salesCommission: 0,
          mealAllowance: 0,
          performanceBonus: bRow.bonusAmount,
          performancePoints: bRow.points,
          salesTarget: bRow.salesTarget,
          actualSales: bRow.actualSales,
          targetMetPercent: bRow.achievementRate,
          bonusPeriodType: periodType,
          bonusPeriodLabel: periodLabel,
          totalEarnings,
          deductionAdvance: 0,
          deductionPenalty: 0,
          deductionSSB: 0,
          totalDeductions,
          lateDeduct: 0,
          absentDeduct: 0,
          unpaidLeave: 0,
          netSalary,
          paymentStatus: 'Pending',
          paymentMethod: 'KBZPay',
          createdAt: new Date().toISOString(),
        });
      }
    });

    onSyncBonusToPayroll(updatedRecords);
    setSyncSuccessMsg(`Successfully synced bonus records for ${employeeBonusList.length} staff to Payroll!`);
    setTimeout(() => {
      setSyncSuccessMsg('');
    }, 4500);
  };

  const canDeleteBonus = currentUser ? canUserDeletePayrollSlip(currentUser) : false;

  const handleDeleteBonusForEmp = (row: BonusSlipData) => {
    if (window.confirm(`Are you sure you want to delete the incentive bonus voucher for ${row.employee?.name}? This will remove the bonus allocation from payroll.`)) {
      if (onSyncBonusToPayroll && salaryRecords) {
        const targetMonth = periodType === 'YEARLY' 
          ? `${year}-12` 
          : quarterlyMonths[quarterlyMonths.length - 1] || `${year}-03`;
        
        const updated = salaryRecords.map((r) => {
          if (r.employeeId === row.employee.id && (r.month === targetMonth || r.month === selectedMonth)) {
            const prevBonus = r.performanceBonus || 0;
            return {
              ...r,
              performanceBonus: 0,
              performancePoints: 0,
              totalEarnings: Math.max(0, (r.totalEarnings || r.basicSalary) - prevBonus),
              netSalary: Math.max(0, (r.netSalary || r.basicSalary) - prevBonus),
            };
          }
          return r;
        });
        onSyncBonusToPayroll(updated);
        setSyncSuccessMsg(`Deleted incentive voucher for ${row.employee?.name}`);
        setTimeout(() => setSyncSuccessMsg(''), 3000);
      }
    }
  };

  const handleResetAllIncentivesAction = () => {
    if (window.confirm('🚨 Are you sure you want to reset/delete ALL incentive bonus amounts for all staff for this period?')) {
      if (onSyncBonusToPayroll && salaryRecords) {
        const updated = salaryRecords.map((r) => {
          const prevBonus = r.performanceBonus || 0;
          return {
            ...r,
            performanceBonus: 0,
            performancePoints: 0,
            totalEarnings: Math.max(0, (r.totalEarnings || r.basicSalary) - prevBonus),
            netSalary: Math.max(0, (r.netSalary || r.basicSalary) - prevBonus),
          };
        });
        onSyncBonusToPayroll(updated);
        setSyncSuccessMsg('Reset all incentive bonus vouchers to 0 across payroll.');
        setTimeout(() => setSyncSuccessMsg(''), 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/75 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-300 max-w-5xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-amber-500/30 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Star className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                <span>Performance Bonus Engine</span>
              </h2>
              <p className="text-xs text-slate-300">
                Connected with P&L Data • Bonus distribution for staff & branch managers (Excluding MD)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintBatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-xs"
              title="Print all staff bonus slips to PDF (A5 2 slips per page)"
            >
              <Printer className="w-4 h-4" />
              <span>Print All PDF ({filteredList.length})</span>
            </button>
            <button
              type="button"
              onClick={handleSyncToPayroll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-xs"
              title="Sync calculated bonus into HR Payroll salary records"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync to Payroll</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBatchPrintView(!isBatchPrintView)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
            >
              <Scissors className="w-4 h-4" />
              <span>{isBatchPrintView ? 'Table View' : 'Preview Cards'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Success Alert Toast */}
        {syncSuccessMsg && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 flex items-center justify-between text-xs font-bold shrink-0 no-print animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{syncSuccessMsg}</span>
            </div>
            <button 
              onClick={() => setSyncSuccessMsg('')}
              className="text-emerald-200 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Configuration & P&L Auto-Sync Bar (Hidden on print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0 no-print">
          {/* Top Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Period Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Period Type</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-200/80 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPeriodType('QUARTERLY')}
                  className={`py-1 text-center font-bold rounded text-xs transition cursor-pointer ${
                    periodType === 'QUARTERLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Quarterly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('YEARLY')}
                  className={`py-1 text-center font-bold rounded text-xs transition cursor-pointer ${
                    periodType === 'YEARLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Quarter / Year */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
              {periodType === 'QUARTERLY' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Bonus Pool Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Bonus Pool (MMK)</label>
              </div>
              <input
                type="number"
                step={100000}
                value={bonusPoolAmount}
                onChange={(e) => {
                  setIsAutoSyncPnl(false);
                  setBonusPoolAmount(Math.max(0, Number(e.target.value)));
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-950 focus:outline-none"
              />
            </div>

            {/* Total Points summary */}
            <div className="flex flex-col justify-center bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-purple-700 font-bold uppercase">Total Team Points</span>
              <span className="text-base font-black font-mono text-purple-950">
                {Number(totalCalculatedPoints.toFixed(2))} pts ({allStaffAndManagers.length} staff & managers)
              </span>
            </div>
          </div>

          {/* P&L Auto-Sync Live Integration Box */}
          <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-950">P&L Data Auto-Sync ({periodLabel})</span>
                  <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${
                    isAutoSyncPnl ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {isAutoSyncPnl ? '● Live P&L Synced' : 'Manual Pool'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Period Sales: <strong className="font-mono text-slate-900">{formatMMK(pnlSummary.totalBilledSales)}</strong></span>
                  <span>•</span>
                  <span>COGS: <strong className="font-mono text-slate-900">{formatMMK(pnlSummary.totalCOGS)}</strong></span>
                  <span>•</span>
                  <span>P&L Net Profit: <strong className="font-mono text-emerald-800">{formatMMK(pnlSummary.netProfit)}</strong></span>
                  <span>•</span>
                  <span>Profit Share: <strong className="font-mono text-amber-900">{profitSharePercent}%</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-1">
                <span className="text-[11px] font-semibold text-slate-600">Share %:</span>
                <select
                  value={profitSharePercent}
                  onChange={(e) => {
                    setProfitSharePercent(Number(e.target.value));
                    setIsAutoSyncPnl(true);
                  }}
                  className="font-bold text-amber-950 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={20}>20%</option>
                  <option value={25}>25%</option>
                  <option value={30}>30%</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsAutoSyncPnl(true);
                  if (pnlSummary.suggestedPool > 0) {
                    setBonusPoolAmount(pnlSummary.suggestedPool);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition shadow-2xs cursor-pointer text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Auto-Sync from P&L</span>
              </button>
            </div>
          </div>

          {/* Search & Branch Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search (Name, Position, Code)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="ALL">All Branches</option>
                {(branches || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              * Bonus slips display performance points and bonus amounts only. Company profit totals are omitted.
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {isBatchPrintView ? (
            /* Batch Print 6 per A4 Cuttable Mode */
            <div className="space-y-4">
              <div className="no-print bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-amber-950">
                    A4 6-Per-Page Cuttable Bonus Slips ({filteredList.length} Slips)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintBatch}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print All Slips to PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBonusBatchFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
                {filteredList.map((slip, idx) => (
                  <div
                    key={slip.id}
                    className={`bg-white rounded-lg border border-slate-300 p-3 flex flex-col justify-between text-slate-900 shadow-xs print:shadow-none print:break-inside-avoid print:page-break-inside-avoid ${
                      (idx + 1) % 6 === 0 ? 'print:break-after-page' : ''
                    }`}
                    style={{
                      minHeight: '250px',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Header */}
                    <div className="border-b border-slate-800 pb-1 mb-1.5 flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-xs text-slate-950 uppercase tracking-tight">
                          SHWE KYAL TAGON
                        </h3>
                        <p className="text-[10px] text-amber-900 font-bold">
                          PERFORMANCE BONUS SLIP
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                          {slip.periodLabel}
                        </span>
                      </div>
                    </div>

                    {/* Employee info */}
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-1.5 text-[10px] grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-[9px] text-slate-500 block font-semibold">Employee Name:</span>
                        <span className="font-black text-slate-950 text-xs block">{slip.employee?.name || 'Staff'}</span>
                        <span className="text-[9px] text-slate-500 font-mono">ID: {slip.employee?.code || `EMP-${idx + 1}`}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block font-semibold">Position / Branch:</span>
                        <span className="font-bold text-slate-800 text-[10px] truncate block">{slip.employee?.position || 'Staff'}</span>
                        <span className="text-[9px] text-purple-700 truncate block font-medium">{slip.branchName}</span>
                      </div>
                    </div>

                    {/* Metrics Table */}
                    <div className="border border-slate-200 rounded p-1.5 mb-1.5 bg-white text-[10px]">
                      {slip.isManager ? (
                        <div className="flex items-center justify-between">
                          <span className="text-purple-900 font-bold text-[10px]">Target Achievement Rate (Met %):</span>
                          <span className="font-mono font-bold text-purple-900 text-xs">100.0% (Operation Scope)</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-amber-900 text-[10px]">Target Achievement Rate (Met %):</span>
                          <span className="font-mono text-amber-900 text-xs">{(slip.achievementRate || 0).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Net Bonus Amount */}
                    <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded px-2.5 py-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-wider block text-amber-900">
                          NET BONUS AMOUNT
                        </span>
                        <span className="text-[8px] text-slate-500">
                          {formatDateDMY(slip.date)}
                        </span>
                      </div>
                      <div className="text-sm font-black font-mono text-amber-950">
                        {formatMMK(slip.bonusAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="px-4 py-3"># & Staff Name</th>
                      <th className="px-4 py-3">Branch & Position</th>
                      <th className="px-4 py-3 text-right">Period Target</th>
                      <th className="px-4 py-3 text-right">Actual Sales</th>
                      <th className="px-4 py-3 text-center">Target Met (%)</th>
                      <th className="px-4 py-3 text-center">Performance Points</th>
                      <th className="px-4 py-3 text-right font-bold text-amber-950 bg-amber-50">Bonus Amount (MMK)</th>
                      <th className="px-4 py-3 text-center">Bonus Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No staff records found
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-slate-400 text-center">{idx + 1}.</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{row.employee?.name}</span>
                                  {row.isManager && (
                                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 font-bold text-[9px] rounded uppercase">
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{row.employee?.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{row.branchName}</div>
                            <div className="text-[11px] text-slate-500">{row.employee?.position}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {row.isManager ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                Operation (No Target)
                              </span>
                            ) : (
                              formatMMK(row.salesTarget)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {row.isManager ? (
                              <span className="text-slate-400 font-normal text-[11px]">-</span>
                            ) : (
                              formatMMK(row.actualSales)
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.isManager ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                Operation Role
                              </span>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                  (row.achievementRate || 0) >= 100
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : (row.achievementRate || 0) >= 80
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {(row.achievementRate || 0).toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                step="any"
                                min={0}
                                max={1000}
                                value={row.points}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  setEmployeePointsOverrides((prev) => ({
                                    ...prev,
                                    [row.employee.id]: val,
                                  }));
                                }}
                                className="w-16 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-900 text-center font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                              />
                              <span className="text-[11px] font-semibold text-slate-500">pts</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-950 font-mono text-sm bg-amber-50/70">
                            {formatMMK(row.bonusAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleSlip(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-2xs"
                                title="Print / View Bonus Slip"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Slip</span>
                              </button>

                              {canDeleteBonus && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBonusForEmp(row)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded-lg transition cursor-pointer"
                                  title="Delete Incentive Voucher for this staff member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredList.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900">
                        <td colSpan={5} className="px-4 py-3 text-right">
                          Total Summary:
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-purple-700">
                          {Number(totalCalculatedPoints.toFixed(2))} pts
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-950 bg-amber-100/50">
                          {formatMMK(totalDistributedBonus)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center no-print">
          <div className="text-xs text-slate-500">
            * Bonus slips show individual performance points and bonus amounts only. Company profit totals are omitted for privacy.
          </div>
          <div className="flex items-center gap-2">
            {canDeleteBonus && (
              <button
                type="button"
                onClick={handleResetAllIncentivesAction}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Reset or delete all incentive bonuses for this period"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset All Incentives</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSyncToPayroll}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sync to Payroll</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Single Bonus Slip Modal */}
      <BonusSlipModal
        isOpen={isSingleSlipOpen}
        onClose={() => setIsSingleSlipOpen(false)}
        slipData={selectedSingleSlip}
      />
    </div>
  );
};
