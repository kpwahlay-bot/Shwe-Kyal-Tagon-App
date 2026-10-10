import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Users, 
  Calendar,
  Calendar as CalendarIcon, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  FileSpreadsheet, 
  PieChart as PieChartIcon, 
  BarChart3, 
  CheckCircle2, 
  Minus, 
  Equal, 
  Plus, 
  Clock, 
  Layers,
  ChevronDown,
  CalendarDays,
  Printer,
  Award,
  FileText,
  RefreshCw,
  AlertCircle,
  Coins,
  CalendarCheck2
} from 'lucide-react';
import { DailySale, DailyExpense, SalaryRecord, Branch, Employee, UserAccount, BonusSlipData, SupplierBenefit } from '../types';
import { formatMMK, formatNumber, getMonthName, formatDateDMY } from '../utils/formatters';
import { printOrSaveBonusSlips } from '../utils/printHelpers';
import { CalendarMonthPicker } from './CalendarMonthPicker';
import { BonusSlipModal } from './BonusSlipModal';

export type TimeHorizon = 'DAILY' | 'WEEKLY' | 'MONTH' | '3M' | '6M' | 'YEAR' | 'ALL';

interface ProfitLossDashboardProps {
  sales: DailySale[];
  expenses: DailyExpense[];
  salaryRecords: SalaryRecord[];
  supplierBenefits?: SupplierBenefit[];
  branches: Branch[];
  employees?: Employee[];
  users?: UserAccount[];
  activeBranchFilter: string;
  setActiveBranchFilter?: (branchId: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onOpenPerformanceBonus?: () => void;
  onSyncBonusToPayroll?: (updatedSalaryRecords: SalaryRecord[]) => void;
}

export const ProfitLossDashboard: React.FC<ProfitLossDashboardProps> = ({
  sales,
  expenses,
  salaryRecords,
  supplierBenefits = [],
  branches,
  employees = [],
  users = [],
  activeBranchFilter,
  setActiveBranchFilter,
  selectedMonth,
  setSelectedMonth,
  onOpenPerformanceBonus,
  onSyncBonusToPayroll,
}) => {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('MONTH');
  const [activeView, setActiveView] = useState<'monthly' | 'daily' | 'comparison' | 'quarterly' | 'repayments'>('monthly');
  const [accountingMode, setAccountingMode] = useState<'cash' | 'accrual'>('cash'); // default to cash-basis: realized cash profit
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Bonus & Profit Share Period Settings State (Quarterly / Yearly)
  const [periodType, setPeriodType] = useState<'QUARTERLY' | 'YEARLY'>('QUARTERLY');
  const [quarterYear, setQuarterYear] = useState<string>('2026');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [profitSharePercent, setProfitSharePercent] = useState<number>(15);
  const [employeePointsOverrides, setEmployeePointsOverrides] = useState<Record<string, number>>({});
  const [autoCalcPointsFromSales, setAutoCalcPointsFromSales] = useState<boolean>(true);
  const [selectedBonusSlip, setSelectedBonusSlip] = useState<BonusSlipData | null>(null);
  const [isBonusSlipOpen, setIsBonusSlipOpen] = useState<boolean>(false);

  // Helper to normalize any date string to YYYY-MM-DD
  const normalizeISO = (dStr: string): string => {
    if (!dStr) return '';
    const clean = dStr.includes('T') ? dStr.split('T')[0] : dStr.trim();
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return clean;
  };

  // Helper to check if a record date falls within the selected time horizon
  const isDateInHorizon = (dateStr: string, horizon: TimeHorizon, refMonth: string, refDate: string): boolean => {
    if (horizon === 'ALL') return true;
    if (!dateStr) return false;

    const normalizedDate = normalizeISO(dateStr);
    const normalizedRefDate = normalizeISO(refDate);

    if (horizon === 'DAILY') {
      return normalizedDate === normalizedRefDate;
    }

    if (horizon === 'WEEKLY') {
      const target = new Date(normalizedRefDate);
      const itemDate = new Date(normalizedDate);
      const diffTime = target.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }

    if (horizon === 'MONTH') {
      if (!refMonth || refMonth === 'ALL') return true;
      return normalizedDate.startsWith(refMonth);
    }

    if (horizon === '3M') {
      const [year, month] = (refMonth || '2026-09').split('-').map(Number);
      const refDateObj = new Date(year, month - 1, 31);
      const minDateObj = new Date(year, month - 4, 1);
      const itemDate = new Date(normalizedDate);
      return itemDate >= minDateObj && itemDate <= refDateObj;
    }

    if (horizon === '6M') {
      const [year, month] = (refMonth || '2026-09').split('-').map(Number);
      const refDateObj = new Date(year, month - 1, 31);
      const minDateObj = new Date(year, month - 7, 1);
      const itemDate = new Date(normalizedDate);
      return itemDate >= minDateObj && itemDate <= refDateObj;
    }

    if (horizon === 'YEAR') {
      const yearStr = (refMonth || '2026-09').split('-')[0] || '2026';
      return normalizedDate.startsWith(yearStr);
    }

    return true;
  };

  const isSalaryInHorizon = (salMonth: string, horizon: TimeHorizon, refMonth: string): boolean => {
    if (horizon === 'ALL') return true;
    if (!salMonth) return false;
    const cleanSalMonth = salMonth.slice(0, 7);
    if (horizon === 'DAILY' || horizon === 'WEEKLY' || horizon === 'MONTH') {
      if (!refMonth || refMonth === 'ALL') return true;
      return cleanSalMonth === refMonth;
    }
    if (horizon === '3M' || horizon === '6M') {
      const [refY, refM] = (refMonth || '2026-09').split('-').map(Number);
      const [salY, salM] = cleanSalMonth.split('-').map(Number);
      const monthDiff = (refY - salY) * 12 + (refM - salM);
      const limit = horizon === '3M' ? 3 : 6;
      return monthDiff >= 0 && monthDiff < limit;
    }
    if (horizon === 'YEAR') {
      const yearStr = (refMonth || '2026-09').split('-')[0] || '2026';
      return cleanSalMonth.startsWith(yearStr);
    }
    return true;
  };

  // Filter helper for a specific month and branch
  const getFilteredDataForMonth = (monthStr: string, branchFilter: string) => {
    const fSales = sales.filter((s) => {
      const matchMonth = isDateInHorizon(s.date, timeHorizon, monthStr, selectedDate);
      const matchBranch = branchFilter === 'ALL' || s.branchId === branchFilter;
      return matchMonth && matchBranch;
    });

    const fExpenses = expenses.filter((e) => {
      const matchMonth = isDateInHorizon(e.date, timeHorizon, monthStr, selectedDate);
      const matchBranch = branchFilter === 'ALL' || e.branchId === branchFilter;
      return matchMonth && matchBranch;
    });

    const fSalaries = salaryRecords.filter((sal) => {
      const matchMonth = isSalaryInHorizon(sal.month, timeHorizon, monthStr);
      const matchBranch = branchFilter === 'ALL' || sal.branchId === branchFilter;
      return matchMonth && matchBranch;
    });

    // Supplier Benefits (Rental fees, Policy bonuses, Rebates, Subsidies)
    const fSupplierBenefits = (supplierBenefits || []).filter((b) => {
      const matchMonth = isDateInHorizon(b.date, timeHorizon, monthStr, selectedDate);
      return matchMonth && b.status === 'SETTLED';
    });

    // Pure Company Incentives (Counter Rental Fee, Policy Bonus / Target Rebates)
    // NOTE: Promotion Subsidy & Cashback, Price Down Compensation, and RMA Claims are for Customers / price drop protection.
    // They are pass-through costs that do NOT enter company profit/incentive income.
    const isCustomerPassThrough = (category: string) =>
      category === 'Promotion Subsidy' ||
      category === 'Cashback' ||
      category === 'Price Down Compensation' ||
      category === 'RMA / Defect Claim';

    // Pure company retained incentives
    const pureCompanyIncentives = fSupplierBenefits.filter((b) => !isCustomerPassThrough(b.category));
    const totalSupplierIncentives = pureCompanyIncentives.reduce((acc, b) => acc + (b.amount || 0), 0);

    const counterRentalAmount = fSupplierBenefits
      .filter((b) => b.category === 'Counter Rental Fee')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    const policyFeeAmount = fSupplierBenefits
      .filter((b) => b.category === 'Policy Bonus')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    // Customer pass-through items (Excluded from profit)
    const promotionSubsidyAmount = fSupplierBenefits
      .filter((b) => b.category === 'Promotion Subsidy' || b.category === 'Cashback')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    const priceDownAmount = fSupplierBenefits
      .filter((b) => b.category === 'Price Down Compensation')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    const rmaClaimsAmount = fSupplierBenefits
      .filter((b) => b.category === 'RMA / Defect Claim')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    const totalCustomerSubsidies = promotionSubsidyAmount + priceDownAmount + rmaClaimsAmount;

    const otherIncentivesAmount = pureCompanyIncentives
      .filter((b) => b.category !== 'Counter Rental Fee' && b.category !== 'Policy Bonus')
      .reduce((acc, b) => acc + (b.amount || 0), 0);

    // 1. Sales & Cash Inflow
    const totalBilledSales = fSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
    const totalCollectedSales = fSales.reduce(
      (acc, s) => acc + (s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0)),
      0
    );
    const totalCollectedCash = totalCollectedSales + totalSupplierIncentives;
    const totalReceivables = Math.max(0, totalBilledSales - totalCollectedSales);
    const totalCOGS = fSales.reduce((acc, s) => acc + (s.costPrice || 0), 0);

    // 2. Sales Realized Gross Profit (Trading Profit alone - SEPARATE)
    const salesRealizedGrossProfit = fSales.reduce((acc, s) => {
      const salePrice = s.salePrice || 0;
      const costPrice = s.costPrice || 0;
      const itemProfit = s.profit !== undefined ? s.profit : (salePrice - costPrice);
      const paid = s.paidAmount !== undefined ? s.paidAmount : salePrice;
      if (salePrice <= 0) return acc;
      const paymentRatio = Math.min(1, Math.max(0, paid / salePrice));
      return acc + (itemProfit * paymentRatio);
    }, 0);

    // Sales Accrual Gross Profit (Billed sales trading profit - SEPARATE)
    const salesAccrualGrossProfit = Math.max(0, totalBilledSales - totalCOGS);

    // Combined Gross Earnings (Sales Gross Profit + Supplier Incentives)
    const realizedGrossProfit = salesRealizedGrossProfit + totalSupplierIncentives;
    const accrualGrossProfit = salesAccrualGrossProfit + totalSupplierIncentives;

    const unrealizedProfit = Math.max(0, salesAccrualGrossProfit - salesRealizedGrossProfit);

    // 3. Operating Deductions (Expenses and Payroll)
    const totalExpenses = fExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalSalaries = fSalaries.reduce((acc, sal) => acc + (sal.netSalary || 0), 0);
    const totalDeductions = totalExpenses + totalSalaries;

    // 4. Combined Net Profits (Sales Trading Profit + Supplier Incentives - Expenses - Salaries)
    const realizedNetProfit = realizedGrossProfit - totalDeductions;
    const accrualNetProfit = accrualGrossProfit - totalDeductions;

    // Margins
    const realizedNetMargin = totalCollectedCash > 0 ? (realizedNetProfit / totalCollectedCash) * 100 : 0;
    const accrualNetMargin = totalBilledSales > 0 ? (accrualNetProfit / totalBilledSales) * 100 : 0;
    const salesGrossMargin = totalCollectedSales > 0 ? (salesRealizedGrossProfit / totalCollectedSales) * 100 : 0;
    const realizedGrossMargin = totalCollectedCash > 0 ? (realizedGrossProfit / totalCollectedCash) * 100 : 0;
    const accrualGrossMargin = totalBilledSales > 0 ? (accrualGrossProfit / totalBilledSales) * 100 : 0;
    const cashCollectionRate = totalBilledSales > 0 ? (totalCollectedSales / totalBilledSales) * 100 : 100;

    return {
      monthStr,
      sales: fSales,
      expenses: fExpenses,
      salaries: fSalaries,
      supplierBenefits: fSupplierBenefits,
      totalBilledSales,
      totalCollectedSales,
      totalCollectedCash,
      totalReceivables,
      totalCOGS,
      salesRealizedGrossProfit,
      salesAccrualGrossProfit,
      totalSupplierIncentives,
      counterRentalAmount,
      policyFeeAmount,
      promotionSubsidyAmount,
      priceDownAmount,
      rmaClaimsAmount,
      totalCustomerSubsidies,
      otherIncentivesAmount,
      realizedGrossProfit,
      accrualGrossProfit,
      unrealizedProfit,
      totalExpenses,
      totalSalaries,
      totalDeductions,
      realizedNetProfit,
      accrualNetProfit,
      realizedNetMargin,
      accrualNetMargin,
      salesGrossMargin,
      realizedGrossMargin,
      accrualGrossMargin,
      cashCollectionRate,
      // Compatibility aliases
      totalRevenue: totalBilledSales,
      grossProfit: realizedGrossProfit,
      netProfit: realizedNetProfit,
      grossMargin: realizedGrossMargin,
      netMargin: realizedNetMargin,
    };
  };

  // Current selected month / horizon data
  const currentMonthData = useMemo(() => {
    return getFilteredDataForMonth(selectedMonth, activeBranchFilter);
  }, [sales, expenses, salaryRecords, supplierBenefits, selectedMonth, activeBranchFilter, timeHorizon, selectedDate]);

  // Display text for the period indicator button
  const periodDisplayText = useMemo(() => {
    if (timeHorizon === 'DAILY') {
      const [y, m, d] = selectedDate.split('-');
      return `${d}/${m}/${y}`;
    }
    if (timeHorizon === 'WEEKLY') {
      return 'PAST 7 DAYS';
    }
    if (timeHorizon === 'MONTH') {
      if (!selectedMonth || selectedMonth === 'ALL') return 'ALL MONTHS';
      return getMonthName(selectedMonth).toUpperCase();
    }
    if (timeHorizon === '3M') {
      return 'PAST 3 MONTHS';
    }
    if (timeHorizon === '6M') {
      return 'PAST 6 MONTHS';
    }
    if (timeHorizon === 'YEAR') {
      return `YEAR ${selectedMonth.split('-')[0] || '2026'}`;
    }
    if (timeHorizon === 'ALL') {
      return 'ALL TIME';
    }
    return getMonthName(selectedMonth).toUpperCase();
  }, [timeHorizon, selectedDate, selectedMonth]);

  // Daily calculation for selected date (Separate Sales & Realized Profit)
  const dailyData = useMemo(() => {
    const daySales = sales.filter((s) => {
      const matchDate = s.date === selectedDate;
      const matchBranch = activeBranchFilter === 'ALL' || s.branchId === activeBranchFilter;
      return matchDate && matchBranch;
    });

    const dayExpenses = expenses.filter((e) => {
      const matchDate = e.date === selectedDate;
      const matchBranch = activeBranchFilter === 'ALL' || e.branchId === activeBranchFilter;
      return matchDate && matchBranch;
    });

    const dayBilledSales = daySales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
    const dayCollectedCash = daySales.reduce(
      (acc, s) => acc + (s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0)),
      0
    );
    const dayReceivables = Math.max(0, dayBilledSales - dayCollectedCash);
    const dayCOGS = daySales.reduce((acc, s) => acc + (s.costPrice || 0), 0);

    const dayRealizedGrossProfit = daySales.reduce((acc, s) => {
      const salePrice = s.salePrice || 0;
      const costPrice = s.costPrice || 0;
      const itemProfit = s.profit !== undefined ? s.profit : (salePrice - costPrice);
      const paid = s.paidAmount !== undefined ? s.paidAmount : salePrice;
      if (salePrice <= 0) return acc;
      const ratio = Math.min(1, Math.max(0, paid / salePrice));
      return acc + (itemProfit * ratio);
    }, 0);

    const dayAccrualGrossProfit = dayBilledSales - dayCOGS;
    const dayExpensesTotal = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const dayRealizedNetProfit = dayRealizedGrossProfit - dayExpensesTotal;
    const dayAccrualNetProfit = dayAccrualGrossProfit - dayExpensesTotal;

    return {
      date: selectedDate,
      sales: daySales,
      expenses: dayExpenses,
      dayBilledSales,
      dayCollectedCash,
      dayReceivables,
      dayCOGS,
      dayRealizedGrossProfit,
      dayAccrualGrossProfit,
      dayExpensesTotal,
      dayRealizedNetProfit,
      dayAccrualNetProfit,
      // Compatibility
      dayRevenue: dayBilledSales,
      dayGrossProfit: dayRealizedGrossProfit,
      dayNetProfit: dayRealizedNetProfit,
    };
  }, [sales, expenses, selectedDate, activeBranchFilter]);

  // Extract all distinct months that have actual transactions in the system
  const activeMonthsStats = useMemo(() => {
    const map = new Map<string, { salesCount: number; salesTotal: number; expensesCount: number; expensesTotal: number; salaryCount: number }>();
    
    const registerMonth = (m: string) => {
      if (!m || m.length < 7) return null;
      const cleanM = m.slice(0, 7);
      if (!map.has(cleanM)) {
        map.set(cleanM, { salesCount: 0, salesTotal: 0, expensesCount: 0, expensesTotal: 0, salaryCount: 0 });
      }
      return map.get(cleanM)!;
    };

    sales.forEach((s) => {
      if (!s.date) return;
      const iso = normalizeISO(s.date);
      const stat = registerMonth(iso);
      if (stat) {
        stat.salesCount++;
        stat.salesTotal += (s.salePrice || 0);
      }
    });

    expenses.forEach((e) => {
      if (!e.date) return;
      const iso = normalizeISO(e.date);
      const stat = registerMonth(iso);
      if (stat) {
        stat.expensesCount++;
        stat.expensesTotal += (e.amount || 0);
      }
    });

    salaryRecords.forEach((sal) => {
      if (!sal.month) return;
      const stat = registerMonth(sal.month);
      if (stat) {
        stat.salaryCount++;
      }
    });

    return map;
  }, [sales, expenses, salaryRecords]);

  // Determine latest active month with transaction records
  const latestActiveMonth = useMemo(() => {
    const monthsWithRecords = Array.from(activeMonthsStats.entries())
      .filter(([_, stats]) => stats.salesCount > 0 || stats.expensesCount > 0 || stats.salaryCount > 0)
      .map(([m]) => m)
      .sort()
      .reverse();

    return monthsWithRecords[0] || '2026-09';
  }, [activeMonthsStats]);

  // Auto-align to active month if current selection has no data or is empty/stale
  useEffect(() => {
    if (!latestActiveMonth) return;
    if (selectedMonth === 'ALL') return;

    const currentStats = activeMonthsStats.get(selectedMonth);
    const hasData = currentStats && (currentStats.salesCount > 0 || currentStats.expensesCount > 0 || currentStats.salaryCount > 0);

    // If selected month has no transactions, auto-align to latest active month with real data
    if (!hasData && latestActiveMonth && selectedMonth !== latestActiveMonth) {
      setSelectedMonth(latestActiveMonth);
    }
  }, [latestActiveMonth, selectedMonth, setSelectedMonth, activeMonthsStats]);

  // All distinct months in the system for comparison (dynamically computed)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    Array.from(activeMonthsStats.keys()).forEach((m: string) => monthsSet.add(m));
    if (selectedMonth && selectedMonth !== 'ALL') monthsSet.add(selectedMonth);
    monthsSet.add('2026-09');
    const curM = new Date().toISOString().slice(0, 7);
    monthsSet.add(curM);
    return Array.from(monthsSet).sort().reverse();
  }, [activeMonthsStats, selectedMonth]);

  const monthComparisons = useMemo(() => {
    return availableMonths.map((m) => getFilteredDataForMonth(m, activeBranchFilter));
  }, [availableMonths, sales, expenses, salaryRecords, supplierBenefits, activeBranchFilter, timeHorizon, selectedDate]);

  // Period calculation (Quarterly Q1-Q4 or Full Yearly 12 months)
  const periodMonths = useMemo(() => {
    if (periodType === 'YEARLY') {
      return Array.from({ length: 12 }, (_, i) => `${quarterYear}-${String(i + 1).padStart(2, '0')}`);
    }
    const qMap = {
      Q1: ['01', '02', '03'],
      Q2: ['04', '05', '06'],
      Q3: ['07', '08', '09'],
      Q4: ['10', '11', '12'],
    };
    return qMap[selectedQuarter].map((m) => `${quarterYear}-${m}`);
  }, [periodType, quarterYear, selectedQuarter]);

  const quarterlyData = useMemo(() => {
    // Collect all sales, expenses, and salaries in these months
    const qSales = sales.filter((s) => {
      const matchMonth = periodMonths.some((qm) => s.date.startsWith(qm));
      const matchBranch = activeBranchFilter === 'ALL' || s.branchId === activeBranchFilter;
      return matchMonth && matchBranch;
    });

    const qExpenses = expenses.filter((e) => {
      const matchMonth = periodMonths.some((qm) => e.date.startsWith(qm));
      const matchBranch = activeBranchFilter === 'ALL' || e.branchId === activeBranchFilter;
      return matchMonth && matchBranch;
    });

    const qSalaries = salaryRecords.filter((sal) => {
      const matchMonth = periodMonths.includes(sal.month);
      const matchBranch = activeBranchFilter === 'ALL' || sal.branchId === activeBranchFilter;
      return matchMonth && matchBranch;
    });

    const totalBilledSales = qSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
    const totalCollectedCash = qSales.reduce(
      (acc, s) => acc + (s.paidAmount !== undefined ? s.paidAmount : (s.salePrice || 0)),
      0
    );
    const totalReceivables = Math.max(0, totalBilledSales - totalCollectedCash);
    const totalCOGS = qSales.reduce((acc, s) => acc + (s.costPrice || 0), 0);

    const realizedGrossProfit = qSales.reduce((acc, s) => {
      const salePrice = s.salePrice || 0;
      const costPrice = s.costPrice || 0;
      const itemProfit = s.profit !== undefined ? s.profit : (salePrice - costPrice);
      const paid = s.paidAmount !== undefined ? s.paidAmount : salePrice;
      if (salePrice <= 0) return acc;
      const ratio = Math.min(1, Math.max(0, paid / salePrice));
      return acc + (itemProfit * ratio);
    }, 0);

    const accrualGrossProfit = totalBilledSales - totalCOGS;
    const totalExpenses = qExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const totalSalaries = qSalaries.reduce((acc, sal) => acc + (sal.netSalary || 0), 0);

    const realizedNetProfit = realizedGrossProfit - totalExpenses - totalSalaries;
    const accrualNetProfit = accrualGrossProfit - totalExpenses - totalSalaries;

    // Active base profit for bonus calculation
    const baseNetProfit = accountingMode === 'cash' ? realizedNetProfit : accrualNetProfit;
    const bonusPool = Math.max(0, Math.round(baseNetProfit * (profitSharePercent / 100)));

    // Unified employees and managers list
    const combinedStaffList = [...(employees || [])];
    (users || []).forEach((u) => {
      if (u.role === 'Sales Manager' || u.role === 'MD' || u.role === 'Admin') {
        const exists = combinedStaffList.some(
          (e) => e.id === u.id || e.name.trim().toLowerCase() === u.displayName.trim().toLowerCase()
        );
        if (!exists) {
          combinedStaffList.push({
            id: u.id || `emp-${u.username.replace(/[^a-zA-Z0-9]/g, '')}`,
            code: `MGR-${u.id.slice(-4)}`,
            name: u.displayName,
            position: u.title || (u.role === 'MD' ? 'Managing Director' : 'Branch Manager'),
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

    // Helper to identify Managing Director (MD is excluded from bonus)
    const isMD = (empItem: { name?: string; position?: string; role?: string }) => {
      const p = (empItem.position || '').toLowerCase();
      const n = (empItem.name || '').toLowerCase();
      const r = (empItem.role || '').toLowerCase();
      return (
        p.includes('managing director') ||
        p.includes('md') ||
        p.includes('director') ||
        r.includes('managing director') ||
        r === 'md' ||
        n.includes('su myat win') ||
        n.includes('managing director')
      );
    };

    // Active employees (Excluding MD as per business requirement)
    const activeEmployees = combinedStaffList.filter((emp) => {
      if (String(emp.status).toLowerCase() === 'resigned') return false;
      if (activeBranchFilter !== 'ALL' && emp.branchId !== activeBranchFilter) return false;
      if (isMD(emp)) return false;
      return true;
    });

    const monthsCount = periodType === 'YEARLY' ? 12 : 3;

    // First calculate sales achievement and points for each employee
    const initialDistributions = activeEmployees.map((emp) => {
      const empName = emp.name.trim().toLowerCase();
      const empCode = (emp.code || '').trim().toLowerCase();
      const empId = emp.id;

      // Find all sales made by this employee across all potential sales identifiers
      const empSales = qSales.filter((s) => {
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

      const actualSales = empSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);

      // Check if employee is in a Manager or Management/Executive position
      const isManager = Boolean(
        (emp.position && /(manager|manage|head|supervisor|admin|incharge|in-charge)/i.test(emp.position)) ||
        (emp.department && /(manager|manage|head|executive|management)/i.test(emp.department)) ||
        emp.isManager === true
      );

      // Target calculation: Managers run Operations and do NOT have a sales target
      const monthlyTarget = isManager ? 0 : (
        emp.salesTarget !== undefined && emp.salesTarget !== null ? Number(emp.salesTarget) : (
          emp.department?.toLowerCase().includes('sale') || emp.position?.toLowerCase().includes('sale') ? 3500000 :
          emp.position?.toLowerCase().includes('technician') || emp.position?.toLowerCase().includes('service') ? 2000000 :
          2500000
        )
      );
      const periodTarget = isManager ? 0 : monthlyTarget * monthsCount;
      const achievementRate = isManager ? 0 : (periodTarget > 0 ? (actualSales / periodTarget) * 100 : 0);

      // Points calculation:
      // - For Managers: Dedicated operational performance points (default 10 pts or from performancePoints)
      // - For Sales & Service Staff: Direct calculation from Target Met % (achievementRate)
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
        ? employeePointsOverrides[emp.id]
        : (autoCalcPointsFromSales ? autoPoints : (emp.performancePoints !== undefined ? emp.performancePoints : autoPoints));

      return {
        employee: emp,
        isManager,
        actualSales,
        periodTarget,
        achievementRate,
        autoPoints,
        points,
      };
    });

    const totalPoints = initialDistributions.reduce((acc, item) => acc + item.points, 0);

    const employeeDistributions = initialDistributions.map((item) => {
      const weight = totalPoints > 0 ? (item.points / totalPoints) : 0;
      const bonusAmount = Math.round(bonusPool * weight);
      return {
        ...item,
        weight,
        bonusAmount,
      };
    });

    return {
      quarterYear,
      selectedQuarter,
      periodType,
      periodMonths,
      totalBilledSales,
      totalCollectedCash,
      totalReceivables,
      totalCOGS,
      realizedGrossProfit,
      accrualGrossProfit,
      totalExpenses,
      totalSalaries,
      realizedNetProfit,
      accrualNetProfit,
      baseNetProfit,
      bonusPool,
      totalPoints,
      employeeDistributions,
    };
  }, [
    sales,
    expenses,
    salaryRecords,
    periodMonths,
    activeBranchFilter,
    accountingMode,
    profitSharePercent,
    employees,
    employeePointsOverrides,
    autoCalcPointsFromSales,
    periodType,
    quarterYear,
    selectedQuarter,
  ]);

  // Monthly Debt Recoveries & Repayment Collections Data
  const repaymentCollectionsData = useMemo(() => {
    const allRepayments: Array<{
      id: string;
      date: string;
      month: string;
      saleId: string;
      invoiceNo?: string;
      customerName: string;
      customerPhone?: string;
      branchId?: string;
      branchName?: string;
      amount: number;
      paymentMethod: string;
      accountId?: string;
      installmentNo?: number;
      notes?: string;
      recordedBy: string;
    }> = [];

    sales.forEach((s) => {
      const matchBranch = activeBranchFilter === 'ALL' || s.branchId === activeBranchFilter;
      if (!matchBranch) return;

      if (s.paymentHistory && s.paymentHistory.length > 0) {
        s.paymentHistory.forEach((ph) => {
          const monthStr = ph.date ? ph.date.substring(0, 7) : '2026-09';
          allRepayments.push({
            id: ph.id,
            date: ph.date,
            month: monthStr,
            saleId: s.id,
            invoiceNo: s.invoiceNo,
            customerName: s.customerName || 'Customer',
            customerPhone: s.customerPhone,
            branchId: s.branchId,
            branchName: s.branchName,
            amount: ph.amount,
            paymentMethod: ph.paymentMethod || 'Cash',
            accountId: ph.accountId,
            installmentNo: ph.installmentNo,
            notes: ph.notes,
            recordedBy: ph.recordedBy || 'Staff',
          });
        });
      }
    });

    // Repayments falling in the currently selected horizon / month
    const horizonRepayments = allRepayments.filter((r) => 
      isDateInHorizon(r.date, timeHorizon, selectedMonth, selectedDate)
    );

    const totalCollectedInHorizon = horizonRepayments.reduce((sum, r) => sum + r.amount, 0);

    // Group all repayments by month for historical comparison
    const monthlyMap = new Map<string, { totalAmount: number; count: number; list: typeof allRepayments }>();
    allRepayments.forEach((r) => {
      const cur = monthlyMap.get(r.month) || { totalAmount: 0, count: 0, list: [] };
      cur.totalAmount += r.amount;
      cur.count += 1;
      cur.list.push(r);
      monthlyMap.set(r.month, cur);
    });

    const monthlySummary = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return {
      allRepayments,
      horizonRepayments,
      totalCollectedInHorizon,
      monthlySummary,
    };
  }, [sales, activeBranchFilter, timeHorizon, selectedMonth, selectedDate]);

  // Export P&L statement
  const handleExportPL = () => {
    const rows = [
      ['Metric', 'Amount (MMK)'],
      ['Reporting Period', getMonthName(selectedMonth)],
      ['Branch Scope', activeBranchFilter === 'ALL' ? 'All Branches' : activeBranchFilter],
      ['Accounting Mode', accountingMode === 'cash' ? 'Cash-Basis (Realized Profit)' : 'Accrual-Basis (Billed Margin)'],
      ['Total Billed Sales', currentMonthData.totalBilledSales],
      ['Total Collected Cash', currentMonthData.totalCollectedCash],
      ['Customer Receivables / Debt', currentMonthData.totalReceivables],
      ['Cost of Goods Sold (COGS)', currentMonthData.totalCOGS],
      ['Realized Gross Profit', currentMonthData.realizedGrossProfit],
      ['Unrealized Profit in Receivables', currentMonthData.unrealizedProfit],
      ['Operating Expenses', currentMonthData.totalExpenses],
      ['Staff Salaries & Payroll', currentMonthData.totalSalaries],
      ['Realized Net Profit Remaining', currentMonthData.realizedNetProfit],
      ['Realized Net Margin %', `${currentMonthData.realizedNetMargin.toFixed(2)}%`],
    ];

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shwe_Kyal_Tagon_Profit_Loss_${selectedMonth}.csv`;
    link.click();
  };

  // Export Repayments statement
  const handleExportRepayments = () => {
    const rows = [
      ['Date', 'Customer Name', 'Phone', 'Voucher No', 'Installment #', 'Amount (MMK)', 'Payment Method', 'Staff'],
      ...repaymentCollectionsData.horizonRepayments.map((r) => [
        r.date,
        r.customerName,
        r.customerPhone || 'N/A',
        r.invoiceNo || r.saleId,
        r.installmentNo ? `Month ${r.installmentNo}` : (r.notes || '-'),
        r.amount,
        r.paymentMethod,
        r.recordedBy,
      ]),
    ];

    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Shwe_Kyal_Tagon_Credit_Repayments_${selectedMonth}.csv`;
    link.click();
  };

  // Direct Batch Print Bonus Slips to PDF for all staff
  const handleBatchPrintBonusDirect = () => {
    if (!quarterlyData.employeeDistributions || quarterlyData.employeeDistributions.length === 0) {
      return;
    }
    const periodLabel = periodType === 'YEARLY' 
      ? `Year ${quarterYear}` 
      : `${selectedQuarter} (${selectedQuarter === 'Q1' ? 'Jan-Mar' : selectedQuarter === 'Q2' ? 'Apr-Jun' : selectedQuarter === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'}) ${quarterYear}`;

    const slips: BonusSlipData[] = quarterlyData.employeeDistributions.map((row) => {
      const branch = (branches || []).find((b) => b.id === row.employee.branchId);
      return {
        id: `bonus-slip-${row.employee.id}-${quarterYear}-${periodType === 'YEARLY' ? 'year' : selectedQuarter}`,
        employee: row.employee,
        branchName: branch ? branch.name : (row.employee.branchName || 'Enterprise Branch'),
        periodType,
        periodLabel,
        year: Number(quarterYear) || 2026,
        quarter: periodType === 'QUARTERLY' ? selectedQuarter : undefined,
        isManager: row.isManager,
        salesTarget: row.periodTarget,
        actualSales: row.actualSales,
        achievementRate: row.achievementRate,
        points: row.points,
        totalTeamPoints: quarterlyData.totalPoints,
        bonusWeight: row.weight,
        companyNetProfit: quarterlyData.baseNetProfit,
        profitSharePercent,
        bonusPool: quarterlyData.bonusPool,
        bonusAmount: row.bonusAmount,
        date: new Date().toISOString().split('T')[0],
      };
    });

    printOrSaveBonusSlips(slips, periodLabel);
  };

  const handleOpenSingleBonusSlip = (row: any) => {
    const branch = (branches || []).find((b) => b.id === row.employee.branchId);
    const periodLabel = periodType === 'YEARLY' 
      ? `Year ${quarterYear}` 
      : `${selectedQuarter} (${selectedQuarter === 'Q1' ? 'Jan-Mar' : selectedQuarter === 'Q2' ? 'Apr-Jun' : selectedQuarter === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'}) ${quarterYear}`;

    const slip: BonusSlipData = {
      id: `bonus-slip-${row.employee.id}-${quarterYear}-${periodType === 'YEARLY' ? 'year' : selectedQuarter}`,
      employee: row.employee,
      branchName: branch ? branch.name : (row.employee.branchName || 'Enterprise Branch'),
      periodType,
      periodLabel,
      year: Number(quarterYear) || 2026,
      quarter: periodType === 'QUARTERLY' ? selectedQuarter : undefined,
      isManager: row.isManager,
      salesTarget: row.periodTarget,
      actualSales: row.actualSales,
      achievementRate: row.achievementRate,
      points: row.points,
      totalTeamPoints: quarterlyData.totalPoints,
      bonusWeight: row.weight,
      companyNetProfit: quarterlyData.baseNetProfit,
      profitSharePercent,
      bonusPool: quarterlyData.bonusPool,
      bonusAmount: row.bonusAmount,
      date: new Date().toISOString().split('T')[0],
    };

    setSelectedBonusSlip(slip);
    setIsBonusSlipOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Primary Analytics Dashboard Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/60 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Analytics Dashboard</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Business Intelligence & Operational Monitoring
          </p>
        </div>

        {/* Right Header Controls (Branch, Horizon Tabs, Date/Month Picker) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1. Branch Selector Pill */}
          <div className="relative flex items-center bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs transition-colors">
            <Building2 className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
            <select
              value={activeBranchFilter}
              onChange={(e) => setActiveBranchFilter && setActiveBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 uppercase tracking-tight focus:outline-hidden cursor-pointer pr-1"
              title="Filter by Branch"
            >
              <option value="ALL">🏢 ALL BRANCHES</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 {b.code} - {b.name.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none shrink-0" />
          </div>

          {/* 2. Horizon Segmented Toggle Pill: DAILY | WEEKLY | MONTH | 3M | 6M | YEAR | ALL */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-0.5 shadow-2xs">
            {(['DAILY', 'WEEKLY', 'MONTH', '3M', '6M', 'YEAR', 'ALL'] as TimeHorizon[]).map((horizon) => {
              const isActive = timeHorizon === horizon;
              return (
                <button
                  key={horizon}
                  onClick={() => setTimeHorizon(horizon)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-bold'
                  }`}
                >
                  {horizon}
                </button>
              );
            })}
          </div>

          {/* 3. Selected Date / Month Indicator Button Pill with custom Popover (Screenshot 1 & 2) */}
          <CalendarMonthPicker
            mode="HORIZON_AWARE"
            timeHorizon={timeHorizon}
            selectedMonth={selectedMonth}
            activeMonths={Array.from(activeMonthsStats.keys())}
            latestActiveMonth={latestActiveMonth}
            onSelectMonth={(m) => {
              setSelectedMonth(m);
              if (m && m !== 'ALL') {
                setSelectedDate(`${m}-01`);
              }
            }}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              if (d) {
                setSelectedMonth(d.slice(0, 7));
              }
            }}
          />
        </div>
      </div>

      {/* Sub-bar: Accounting Method & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Method:</span>
          {/* Accounting Mode Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setAccountingMode('cash')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                accountingMode === 'cash'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Calculates profit when actual cash is collected"
            >
              Cash-Basis (Realized Profit)
            </button>
            <button
              onClick={() => setAccountingMode('accrual')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                accountingMode === 'accrual'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Calculates profit based on total billed sales"
            >
              Accrual (Billed Total)
            </button>
          </div>
        </div>

        {/* View Switchers & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveView('monthly')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'monthly'
                  ? 'bg-white text-purple-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview & P&L
            </button>
            <button
              onClick={() => setActiveView('daily')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'daily'
                  ? 'bg-white text-purple-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Breakdown
            </button>
            <button
              onClick={() => setActiveView('comparison')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'comparison'
                  ? 'bg-white text-purple-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Comparison
            </button>
            <button
              onClick={() => setActiveView('quarterly')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'quarterly'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Quarterly profit and performance bonus distribution"
            >
              Quarterly & Profit Share
            </button>
            <button
              onClick={() => setActiveView('repayments')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeView === 'repayments'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-indigo-800 hover:text-indigo-950 hover:bg-indigo-50'
              }`}
              title="Monthly credit installment collections and debt recoveries"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Debt Recoveries</span>
              {repaymentCollectionsData.horizonRepayments.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 bg-indigo-200 text-indigo-950 rounded-full font-black">
                  {repaymentCollectionsData.horizonRepayments.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={activeView === 'repayments' ? handleExportRepayments : handleExportPL}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{activeView === 'repayments' ? 'Export Repayments CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MONTHLY P&L WATERFALL BREAKDOWN */}
      {activeView === 'monthly' && (
        <div className="space-y-5">
          {/* Smart Notice & 1-Click Switcher Banner when selected period has no recorded data */}
          {timeHorizon === 'MONTH' && currentMonthData.totalBilledSales === 0 && currentMonthData.totalExpenses === 0 && currentMonthData.totalSalaries === 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <span>No Financial Records Found for {getMonthName(selectedMonth)}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                      0 MMK
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {latestActiveMonth && latestActiveMonth !== selectedMonth ? (
                      <>
                        The latest active reporting period with recorded transactions is <strong className="font-bold text-amber-950">{getMonthName(latestActiveMonth)}</strong>.
                      </>
                    ) : (
                      <>No sales or expense transactions recorded in the selected period.</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                {latestActiveMonth && latestActiveMonth !== selectedMonth && (
                  <button
                    onClick={() => {
                      setSelectedMonth(latestActiveMonth);
                      setSelectedDate(`${latestActiveMonth}-01`);
                      setTimeHorizon('MONTH');
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>View {getMonthName(latestActiveMonth)} Ledger</span>
                  </button>
                )}
                <button
                  onClick={() => setTimeHorizon('ALL')}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-slate-100 active:scale-98 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                >
                  <span>All Time (Comprehensive)</span>
                </button>
              </div>
            </div>
          )}

          {/* Executive KPI Summary Cards (5-Card Grid: Sales, Sales Gross Profit, Supplier Incentives & Benefits, Expenses/Salaries, Combined Net Profit) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Sales Revenue (Billed vs Collected) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Sales
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                    Billed
                  </span>
                </div>
                <p className="text-xl font-black text-slate-900 mt-1.5 font-mono">
                  {formatMMK(currentMonthData.totalBilledSales)}
                </p>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 space-y-0.5 font-mono pt-2 border-t border-slate-100">
                <div className="text-emerald-700 font-semibold truncate">
                  ✓ Collected: {formatMMK(currentMonthData.totalCollectedSales)}
                </div>
                {currentMonthData.totalReceivables > 0 && (
                  <div className="text-amber-700 truncate font-semibold">
                    ⚠ Debt: {formatMMK(currentMonthData.totalReceivables)}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Sales Gross Profit (Trading Profit Only) */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Sales Gross Profit
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Trading Profit
                  </span>
                </div>
                <p className="text-xl font-black text-emerald-700 mt-1.5 font-mono">
                  {currentMonthData.salesRealizedGrossProfit >= 0 ? `+${formatMMK(currentMonthData.salesRealizedGrossProfit)}` : formatMMK(currentMonthData.salesRealizedGrossProfit)}
                </p>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-emerald-100/70">
                <span className="text-emerald-700 font-semibold block">
                  Margin: {currentMonthData.salesGrossMargin.toFixed(1)}% of Sales
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  (Collected Sales - COGS)
                </span>
              </div>
            </div>

            {/* 3. Supplier Incentives & Benefits (Counter Rental + Policy Bonus) */}
            <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                    Supplier Incentives
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    Net Incentives
                  </span>
                </div>
                <p className="text-xl font-black text-purple-700 mt-1.5 font-mono">
                  +{formatMMK(currentMonthData.totalSupplierIncentives)}
                </p>
              </div>
              <div className="mt-2 text-[10px] space-y-1 font-mono pt-2 border-t border-purple-100">
                <div className="text-purple-900 font-semibold flex items-center justify-between">
                  <span>🏢 Counter Rental:</span>
                  <span className="font-bold">+{formatMMK(currentMonthData.counterRentalAmount)}</span>
                </div>
                <div className="text-indigo-900 font-semibold flex items-center justify-between">
                  <span>📜 Policy Fee/Bonus:</span>
                  <span className="font-bold">+{formatMMK(currentMonthData.policyFeeAmount)}</span>
                </div>
                {currentMonthData.otherIncentivesAmount > 0 && (
                  <div className="text-purple-700 flex items-center justify-between">
                    <span>✨ Other Bonus:</span>
                    <span className="font-bold">+{formatMMK(currentMonthData.otherIncentivesAmount)}</span>
                  </div>
                )}
                {currentMonthData.totalCustomerSubsidies > 0 && (
                  <div className="text-slate-500 font-sans text-[9px] pt-1 mt-1 border-t border-dashed border-slate-200 flex items-center justify-between">
                    <span title="Promo Subsidy, Cashback, Price Down (Customer benefits - excluded from company profit)">🏷️ Customer Subsidies:</span>
                    <span className="font-mono text-slate-600 font-bold">{formatMMK(currentMonthData.totalCustomerSubsidies)} (Excluded)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Total Deductions (Expenses + Salaries) */}
            <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    Expenses + Salaries
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                    Deductions
                  </span>
                </div>
                <p className="text-xl font-black text-rose-700 mt-1.5 font-mono">
                  -{formatMMK(currentMonthData.totalDeductions)}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-rose-600 font-medium pt-2 border-t border-rose-100 truncate">
                Exp: {formatMMK(currentMonthData.totalExpenses)} • Sal: {formatMMK(currentMonthData.totalSalaries)}
              </p>
            </div>

            {/* 5. NET COMBINED REMAINING PROFIT */}
            <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-purple-950 p-4 rounded-xl text-white shadow-md shadow-purple-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
                    Combined Net Profit
                  </span>
                  <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-white tracking-wide">
                    {accountingMode === 'cash' ? 'Cash Basis' : 'Accrual'}
                  </span>
                </div>
                <p className={`text-2xl font-black mt-1.5 font-mono ${currentMonthData.realizedNetProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {formatMMK(
                    accountingMode === 'cash'
                      ? currentMonthData.realizedNetProfit
                      : currentMonthData.accrualNetProfit
                  )}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 space-y-0.5">
                <p className="text-[10px] text-emerald-200 font-bold truncate">
                  (Sales GP + Incentives - Expenses - Payroll)
                </p>
                <p className="text-[10px] text-purple-200/80 font-medium">
                  Net Margin: {currentMonthData.realizedNetMargin.toFixed(1)}% of Inflow
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Financial Calculation Formula & Waterfall */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Monthly Net Profit Calculation (Income Statement Waterfall)
                </h3>
                <p className="text-xs text-slate-500">
                  Collected Sales ➔ Less COGS ➔ Sales Gross Profit ➔ Add Supplier Incentives (Counter Rental &amp; Policy Fees) ➔ Less Expenses &amp; Payroll = Combined Net Profit
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                Period: {getMonthName(selectedMonth)}
              </div>
            </div>

            {/* Visual Formula Steps (6-Step Waterfall) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {/* Step 1: Collected Sales */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">1. Collected Sales</span>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  +{formatMMK(currentMonthData.totalCollectedSales)}
                </p>
                <span className="text-[10px] text-slate-400">
                  (Billed: {formatMMK(currentMonthData.totalBilledSales)})
                </span>
              </div>

              {/* Step 2: COGS */}
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 uppercase">2. Product Costs (COGS)</span>
                <p className="text-base font-black text-amber-900 font-mono mt-1">
                  -{formatMMK(currentMonthData.totalCOGS)}
                </p>
                <span className="text-[10px] text-amber-700 font-medium">Buying cost of stock</span>
              </div>

              {/* Step 3: Sales Gross Profit (Separate) */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-300">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">3. Sales Gross Profit</span>
                <p className="text-base font-black text-emerald-700 font-mono mt-1">
                  ={formatMMK(currentMonthData.salesRealizedGrossProfit)}
                </p>
                <span className="text-[10px] text-emerald-700 font-medium">
                  Trading Profit Alone
                </span>
              </div>

              {/* Step 4: Supplier Incentives (Separate) */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-300">
                <span className="text-[11px] font-bold text-purple-900 uppercase">4. Supplier Incentives</span>
                <p className="text-base font-black text-purple-700 font-mono mt-1">
                  +{formatMMK(currentMonthData.totalSupplierIncentives)}
                </p>
                <span className="text-[10px] text-purple-700 font-medium">
                  Counter Rental + Policy
                </span>
              </div>

              {/* Step 5: Store Expenses & Payroll */}
              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800 uppercase">5. Expenses + Payroll</span>
                <p className="text-base font-black text-rose-900 font-mono mt-1">
                  -{formatMMK(currentMonthData.totalDeductions)}
                </p>
                <span className="text-[10px] text-rose-700 font-medium">Store costs &amp; salaries</span>
              </div>

              {/* Step 6: Combined Net Profit */}
              <div className="p-3.5 rounded-xl bg-purple-700 text-white border border-purple-800 shadow-sm">
                <span className="text-[11px] font-bold text-purple-200 uppercase">6. Net Take-Home</span>
                <p className="text-base font-black text-white font-mono mt-1">
                  ={formatMMK(currentMonthData.realizedNetProfit)}
                </p>
                <span className="text-[10px] text-purple-200 font-semibold">
                  Combined Total Net
                </span>
              </div>
            </div>

            {/* Financial Ledger Breakdown Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Financial Line Item</th>
                    <th className="py-2.5 px-4">Category / Source</th>
                    <th className="py-2.5 px-4 text-right">Amount (MMK)</th>
                    <th className="py-2.5 px-4 text-right">% Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Billed Sales */}
                  <tr className="bg-slate-50/30">
                    <td className="py-2.5 px-4 font-bold text-slate-900">Total Billed Customer Sales</td>
                    <td className="py-2.5 px-4 text-slate-600">POS Sales Invoices Generated</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMMK(currentMonthData.totalBilledSales)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">100.0%</td>
                  </tr>

                  {/* Cash Collected from Sales */}
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-emerald-800 pl-8">✓ Cash Collected from Sales</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">Customer Cash / Digital Pay Received</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatMMK(currentMonthData.totalCollectedSales)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                      {currentMonthData.cashCollectionRate.toFixed(1)}%
                    </td>
                  </tr>

                  {/* Uncollected Debt */}
                  {currentMonthData.totalReceivables > 0 && (
                    <tr className="bg-amber-50/20">
                      <td className="py-2.5 px-4 text-amber-800 pl-8">⚠ Outstanding Customer Receivables / Debt</td>
                      <td className="py-2.5 px-4 text-amber-700">Customer Pending Credit Debt</td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-800">
                        {formatMMK(currentMonthData.totalReceivables)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-700">
                        {currentMonthData.totalBilledSales > 0
                          ? ((currentMonthData.totalReceivables / currentMonthData.totalBilledSales) * 100).toFixed(1)
                          : 0}%
                      </td>
                    </tr>
                  )}

                  {/* COGS */}
                  <tr>
                    <td className="py-2.5 px-4 text-amber-900 pl-8">(-) Cost of Goods Sold (Buying Cost)</td>
                    <td className="py-2.5 px-4 text-slate-500">Stock Inventory Procurement</td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-800">
                      -{formatMMK(currentMonthData.totalCOGS)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {currentMonthData.totalCollectedSales > 0
                        ? ((currentMonthData.totalCOGS / currentMonthData.totalCollectedSales) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>

                  {/* SEPARATE: Sales Trading Gross Profit Line */}
                  <tr className="bg-emerald-50/60 font-bold border-t border-b border-emerald-200">
                    <td className="py-2.5 px-4 text-emerald-950 font-black">
                      (=) Sales Gross Profit (Trading Profit)
                    </td>
                    <td className="py-2.5 px-4 text-emerald-800">
                      Cash-basis profit from sales alone (Collected Sales - COGS)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-900 text-sm">
                      {currentMonthData.salesRealizedGrossProfit >= 0 ? `+${formatMMK(currentMonthData.salesRealizedGrossProfit)}` : formatMMK(currentMonthData.salesRealizedGrossProfit)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-800 font-bold">
                      {currentMonthData.salesGrossMargin.toFixed(1)}%
                    </td>
                  </tr>

                  {/* SEPARATE: Supplier Incentives Header Row (Only Counter Rental & Policy Fee - Pure Profit) */}
                  <tr className="bg-purple-50/70 font-bold border-t border-purple-200">
                    <td className="py-2.5 px-4 text-purple-950 font-black">
                      (+) Supplier Incentives &amp; Benefits (Retained Income)
                    </td>
                    <td className="py-2.5 px-4 text-purple-800">
                      Counter Rental &amp; Policy Fee (Shop Retained Revenue)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-purple-900 text-sm">
                      +{formatMMK(currentMonthData.totalSupplierIncentives)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-800 font-bold">
                      Incentives
                    </td>
                  </tr>

                  {/* Sub-row: Counter Rental Fee */}
                  <tr className="bg-purple-50/30">
                    <td className="py-2 px-4 text-purple-900 pl-12 flex items-center gap-1.5 font-medium">
                      <span>🏢</span>
                      <span>Counter Rental Fee (Branch Space Rental)</span>
                    </td>
                    <td className="py-2 px-4 text-slate-500">Brand counter space rental income</td>
                    <td className="py-2 px-4 text-right font-mono font-semibold text-purple-800">
                      +{formatMMK(currentMonthData.counterRentalAmount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-400">
                      {currentMonthData.totalSupplierIncentives > 0
                        ? ((currentMonthData.counterRentalAmount / currentMonthData.totalSupplierIncentives) * 100).toFixed(0) + '%'
                        : '-'}
                    </td>
                  </tr>

                  {/* Sub-row: Policy Bonus & Rebate */}
                  <tr className="bg-purple-50/30">
                    <td className="py-2 px-4 text-purple-900 pl-12 flex items-center gap-1.5 font-medium">
                      <span>📜</span>
                      <span>Policy Bonus &amp; Target Rebate</span>
                    </td>
                    <td className="py-2 px-4 text-slate-500">Quarterly/monthly target achievement bonuses</td>
                    <td className="py-2 px-4 text-right font-mono font-semibold text-purple-800">
                      +{formatMMK(currentMonthData.policyFeeAmount)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-slate-400">
                      {currentMonthData.totalSupplierIncentives > 0
                        ? ((currentMonthData.policyFeeAmount / currentMonthData.totalSupplierIncentives) * 100).toFixed(0) + '%'
                        : '-'}
                    </td>
                  </tr>

                  {/* Sub-row: Other Retained Bonus */}
                  {currentMonthData.otherIncentivesAmount > 0 && (
                    <tr className="bg-purple-50/30">
                      <td className="py-2 px-4 text-purple-900 pl-12 flex items-center gap-1.5 font-medium">
                        <span>✨</span>
                        <span>Other Retained Store Bonus</span>
                      </td>
                      <td className="py-2 px-4 text-slate-500">Other company incentive income</td>
                      <td className="py-2 px-4 text-right font-mono font-semibold text-purple-800">
                        +{formatMMK(currentMonthData.otherIncentivesAmount)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">
                        {((currentMonthData.otherIncentivesAmount / currentMonthData.totalSupplierIncentives) * 100).toFixed(0)}%
                      </td>
                    </tr>
                  )}

                  {/* Customer Pass-Through & Price Down Row (EXCLUDED FROM PROFIT) */}
                  <tr className="bg-slate-100/80 border-t border-slate-200">
                    <td className="py-2.5 px-4 text-slate-700 font-bold flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>Customer Subsidies &amp; Price Down (Pass-Through)</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      Pass-through subsidies for customer incentives; excluded from company profit
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-600">
                      {formatMMK(currentMonthData.totalCustomerSubsidies)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        Excluded from Profit
                      </span>
                    </td>
                  </tr>

                  {/* Sub-details of Excluded Customer Subsidies */}
                  {currentMonthData.totalCustomerSubsidies > 0 && (
                    <tr className="bg-slate-50/50 text-[10.5px] text-slate-500">
                      <td colSpan={4} className="py-2 px-4 pl-12">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>• Promo Subsidy &amp; Cashback: <strong className="font-mono text-slate-700">+{formatMMK(currentMonthData.promotionSubsidyAmount)}</strong></span>
                          <span>• Price Down Compensation: <strong className="font-mono text-slate-700">+{formatMMK(currentMonthData.priceDownAmount)}</strong></span>
                          {currentMonthData.rmaClaimsAmount > 0 && (
                            <span>• RMA Defect Claims: <strong className="font-mono text-slate-700">+{formatMMK(currentMonthData.rmaClaimsAmount)}</strong></span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Combined Operational Profit (Sales Profit + Incentives) */}
                  <tr className="bg-indigo-50/60 font-bold border-t border-b border-indigo-200">
                    <td className="py-2.5 px-4 text-indigo-950 font-black">
                      (=) Total Combined Operational Profit
                    </td>
                    <td className="py-2.5 px-4 text-indigo-800">
                      Sales Gross Profit + Supplier Incentives Total
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-900 text-sm">
                      +{formatMMK(currentMonthData.realizedGrossProfit)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-indigo-800">
                      Combined
                    </td>
                  </tr>

                  {/* Operating Expenses */}
                  <tr>
                    <td className="py-2.5 px-4 text-rose-800 pl-8">(-) Total Store Operating Expenses</td>
                    <td className="py-2.5 px-4 text-slate-500">Rent, Fuel, Refreshments, Utilities, Shipping</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-700">
                      -{formatMMK(currentMonthData.totalExpenses)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {currentMonthData.totalCollectedCash > 0
                        ? ((currentMonthData.totalExpenses / currentMonthData.totalCollectedCash) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>

                  {/* Salaries */}
                  <tr>
                    <td className="py-2.5 px-4 text-violet-800 pl-8">(-) Total Staff Salaries &amp; Payroll</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      Staff Wages, OT &amp; Commissions ({currentMonthData.salaries.length} Staff)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-violet-700">
                      -{formatMMK(currentMonthData.totalSalaries)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                      {currentMonthData.totalCollectedCash > 0
                        ? ((currentMonthData.totalSalaries / currentMonthData.totalCollectedCash) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>

                  {/* Final Realized Net Profit Line */}
                  <tr className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-950 font-black text-sm border-t-2 border-emerald-400">
                    <td className="py-3 px-4">
                      (=) Final Combined Realized Net Profit
                    </td>
                    <td className="py-3 px-4 font-normal text-xs text-emerald-800">
                      Sales Gross Profit + Supplier Incentives - Operating Expenses - Salaries
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-black text-base ${currentMonthData.realizedNetProfit >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {formatMMK(currentMonthData.realizedNetProfit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800">
                      {currentMonthData.realizedNetMargin.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY PROFIT DRILLDOWN */}
      {activeView === 'daily' && (
        <div className="space-y-5">
          {/* Date Selector & Day summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Daily Realized Profit Analysis</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Select any working day to review sales billed, actual cash collected, realized profit, store costs, and daily net earnings
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Daily KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Daily Sales</span>
                <p className="text-lg font-black text-slate-900 font-mono mt-1">
                  {formatMMK(dailyData.dayBilledSales)}
                </p>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  Cash In: {formatMMK(dailyData.dayCollectedCash)}
                </span>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 uppercase">Daily Buying Cost (COGS)</span>
                <p className="text-lg font-black text-amber-900 font-mono mt-1">
                  -{formatMMK(dailyData.dayCOGS)}
                </p>
                <span className="text-[10px] text-amber-700">Cost of items sold</span>
              </div>

              <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800 uppercase">Daily Store Expenses</span>
                <p className="text-lg font-black text-rose-900 font-mono mt-1">
                  -{formatMMK(dailyData.dayExpensesTotal)}
                </p>
                <span className="text-[10px] text-rose-700">{dailyData.expenses.length} expense receipts</span>
              </div>

              <div className="p-3 bg-emerald-700 text-white rounded-lg shadow-xs">
                <span className="text-[11px] font-bold text-emerald-200 uppercase">Daily Realized Net Profit</span>
                <p className="text-lg font-black font-mono mt-1">
                  +{formatMMK(dailyData.dayRealizedNetProfit)}
                </p>
                <span className="text-[10px] text-emerald-200">
                  Gross Profit: +{formatMMK(dailyData.dayRealizedGrossProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Daily Sales Ledger for the Day */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sales Transactions on {formatDateDMY(selectedDate)}
              </h4>
              <span className="text-xs font-bold text-emerald-700">
                Total Realized Profit: +{formatMMK(dailyData.dayRealizedGrossProfit)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Branch</th>
                    <th className="py-2.5 px-4">Item Sold</th>
                    <th className="py-2.5 px-4 text-right">Cost Price</th>
                    <th className="py-2.5 px-4 text-right">Sale Price</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Paid In</th>
                    <th className="py-2.5 px-4 text-right text-amber-700">Debt</th>
                    <th className="py-2.5 px-4 text-right text-purple-700">Realized Profit</th>
                    <th className="py-2.5 px-4">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dailyData.sales.map((s) => {
                    const paid = s.paidAmount !== undefined ? s.paidAmount : s.salePrice;
                    const debt = Math.max(0, s.salePrice - paid);
                    const ratio = s.salePrice > 0 ? Math.min(1, Math.max(0, paid / s.salePrice)) : 0;
                    const realizedProfit = Math.round((s.profit || 0) * ratio);

                    return (
                      <tr key={s.id} className="hover:bg-purple-50/20">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{s.invoiceNo}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.branchName}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{s.itemName}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-800">{formatMMK(s.costPrice)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-900">{formatMMK(s.salePrice)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{formatMMK(paid)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-amber-700">
                          {debt > 0 ? formatMMK(debt) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700">+{formatMMK(realizedProfit)}</td>
                        <td className="py-2.5 px-4 text-slate-600">{s.employeeName}</td>
                      </tr>
                    );
                  })}

                  {dailyData.sales.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No sales recorded on this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: MONTH-BY-MONTH COMPARATIVE ANALYSIS */}
      {activeView === 'comparison' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Month-by-Month Financial Performance Comparison</span>
              </h3>
              <p className="text-xs text-slate-500">
                Comparative analysis of Sales Revenue, Cash Inflow, COGS, Operating Expenses, Salaries, and Realized Net Profit
              </p>
            </div>
          </div>

          {/* Month by month table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">MONTH</th>
                  <th className="py-3 px-4 text-right">BILLED SALES</th>
                  <th className="py-3 px-4 text-right text-emerald-700">COLLECTED SALES</th>
                  <th className="py-3 px-4 text-right">COGS (BUYING)</th>
                  <th className="py-3 px-4 text-right text-emerald-800">SALES PROFIT</th>
                  <th className="py-3 px-4 text-right text-purple-700">INCENTIVES (ADD)</th>
                  <th className="py-3 px-4 text-right text-rose-700">EXPENSES (LESS)</th>
                  <th className="py-3 px-4 text-right text-violet-700">SALARIES (LESS)</th>
                  <th className="py-3 px-4 text-right bg-emerald-50 text-emerald-950 font-bold">TOTAL NET</th>
                  <th className="py-3 px-4 text-center">MARGIN %</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthComparisons.map((m) => {
                  const isCurrent = m.monthStr === selectedMonth;
                  return (
                    <tr
                      key={m.monthStr}
                      className={`hover:bg-purple-50/20 transition-colors ${
                        isCurrent ? 'bg-purple-50/30 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {getMonthName(m.monthStr)}
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-1.5 py-0.2 rounded">
                            Active Period
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {formatMMK(m.totalBilledSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatMMK(m.totalCollectedSales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-800">
                        {formatMMK(m.totalCOGS)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        +{formatMMK(m.salesRealizedGrossProfit)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                        +{formatMMK(m.totalSupplierIncentives)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        -{formatMMK(m.totalExpenses)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-violet-700">
                        -{formatMMK(m.totalSalaries)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-950 bg-emerald-50/70 text-sm">
                        {formatMMK(m.realizedNetProfit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                        {m.realizedNetMargin.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Profitable</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual bar distribution comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {monthComparisons.map((m) => (
              <div
                key={m.monthStr}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs">{getMonthName(m.monthStr)}</h4>
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    Net: {formatMMK(m.realizedNetProfit)}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Collected Cash:</span>
                    <span className="font-mono font-semibold text-emerald-700">{formatMMK(m.totalCollectedCash)}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, (m.totalCollectedCash / 10000000) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Expenses + Salaries:</span>
                    <span className="font-mono font-semibold text-rose-700">
                      -{formatMMK(m.totalExpenses + m.totalSalaries)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, ((m.totalExpenses + m.totalSalaries) / 5000000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedMonth(m.monthStr);
                    setActiveView('monthly');
                  }}
                  className="w-full mt-2 py-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  View Detailed Statement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: QUARTERLY / YEARLY PROFIT & LOSS AND EMPLOYEE PROFIT SHARE */}
      {activeView === 'quarterly' && (
        <div className="space-y-6">
          {/* Top Period Selector (Yearly / Quarterly) & Profit Share Setting Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Period Type Toggle: Quarterly vs Yearly */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setPeriodType('QUARTERLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodType === 'QUARTERLY'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📅 Quarterly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('YEARLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodType === 'YEARLY'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📆 Yearly
                </button>
              </div>

              {/* Year Selector */}
              <select
                value={quarterYear}
                onChange={(e) => setQuarterYear(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              {/* Quarter Pill Toggle (when Quarterly mode is active) */}
              {periodType === 'QUARTERLY' && (
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 flex-wrap">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as Array<'Q1' | 'Q2' | 'Q3' | 'Q4'>).map((q) => {
                    const qLabels = {
                      Q1: 'Q1 (Jan - Mar)',
                      Q2: 'Q2 (Apr - Jun)',
                      Q3: 'Q3 (Jul - Sep)',
                      Q4: 'Q4 (Oct - Dec)',
                    };
                    const isActive = selectedQuarter === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuarter(q)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {qLabels[q]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Profit Share % Config & Auto-calc Toggle */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Auto Calc from Sales Target switch */}
              <label className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoCalcPointsFromSales}
                  onChange={(e) => setAutoCalcPointsFromSales(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Auto-calculate Points from Target</span>
              </label>

              {/* Bonus Share % Input */}
              <div className="flex items-center gap-2 p-1.5 bg-amber-50/90 border border-amber-200 rounded-xl">
                <div className="text-xs">
                  <span className="font-bold text-amber-950">Bonus Share %: </span>
                </div>
                <div className="flex items-center gap-1">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setProfitSharePercent(pct)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        profitSharePercent === pct
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={profitSharePercent}
                    onChange={(e) => setProfitSharePercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                    className="w-14 px-2 py-0.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-center font-mono focus:outline-none"
                  />
                  <span className="text-xs font-bold text-amber-950">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quarterly/Yearly Financial Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {periodType === 'YEARLY' ? 'Year Total Sales' : 'Quarter Total Sales'}
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {formatMMK(quarterlyData.totalBilledSales)}
              </div>
              <div className="text-xs text-emerald-700 mt-1 font-semibold">
                ✓ Collected Cash: {formatMMK(quarterlyData.totalCollectedCash)}
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {periodType === 'YEARLY' ? 'Year COGS & Expenses' : 'Quarter COGS & Expenses'}
                </span>
                <TrendingDown className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {formatMMK(quarterlyData.totalCOGS + quarterlyData.totalExpenses + quarterlyData.totalSalaries)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                COGS: {formatMMK(quarterlyData.totalCOGS)} | Exp: {formatMMK(quarterlyData.totalExpenses)} | Sal: {formatMMK(quarterlyData.totalSalaries)}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">
                  {periodType === 'YEARLY' ? 'Year Net Profit' : 'Quarter Net Profit'}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
                {formatMMK(quarterlyData.baseNetProfit)}
              </div>
              <div className="text-xs text-emerald-700 mt-1 font-semibold">
                {accountingMode === 'cash' ? 'Realized Net Profit (Cash Basis)' : 'Accrual Net Profit'}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950">Total Bonus Pool ({profitSharePercent}%)</span>
                <Users className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
                {formatMMK(quarterlyData.bonusPool)}
              </div>
              <div className="text-xs text-amber-800 mt-1 font-bold">
                Profit bonus pool to distribute among {quarterlyData.employeeDistributions.length} staff
              </div>
            </div>
          </div>

          {/* Employee Performance Points & Bonus Distribution Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <span>
                    Staff Performance & Bonus Distribution (
                    {periodType === 'YEARLY' ? `Year ${quarterYear}` : `${selectedQuarter} ${quarterYear}`}
                    )
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculates distributed bonus proportionally based on target achievement and performance points.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  Total Points: <strong className="text-purple-700 font-mono text-sm">{Number(quarterlyData.totalPoints.toFixed(2))}</strong> Pts
                </div>
                <button
                  type="button"
                  onClick={handleBatchPrintBonusDirect}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer shadow-xs"
                  title="Print all staff bonus slips to PDF (A5 2 slips per page)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print All Slips to PDF ({quarterlyData.employeeDistributions.length})</span>
                </button>
                {onOpenPerformanceBonus && (
                  <button
                    type="button"
                    onClick={onOpenPerformanceBonus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Manage Bonus Engine</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="px-4 py-3"># & Staff Name</th>
                    <th className="px-4 py-3">Branch & Position</th>
                    <th className="px-4 py-3 text-right">Period Target</th>
                    <th className="px-4 py-3 text-right">Actual Sales</th>
                    <th className="px-4 py-3 text-center">Target Met (%)</th>
                    <th className="px-4 py-3 text-center">Performance Points</th>
                    <th className="px-4 py-3 text-center">Share Ratio (%)</th>
                    <th className="px-4 py-3 text-right font-bold text-amber-950 bg-amber-50">Calculated Bonus (MMK)</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quarterlyData.employeeDistributions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No staff records found
                      </td>
                    </tr>
                  ) : (
                    quarterlyData.employeeDistributions.map((row, idx) => {
                      const emp = row.employee;
                      const branch = branches.find((b) => b.id === emp.branchId);
                      const isOverTarget = row.achievementRate >= 100;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-slate-400 text-center">{idx + 1}.</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{emp.name}</span>
                                  {row.isManager && (
                                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 font-bold text-[9px] rounded uppercase">
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">{emp.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{branch ? branch.name : emp.branchId}</div>
                            <div className="text-[11px] text-slate-500">{emp.position}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {row.isManager ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                Operations (Non-sales target)
                              </span>
                            ) : (
                              formatMMK(row.periodTarget)
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
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Operation Role
                              </span>
                            ) : (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                  isOverTarget
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : row.achievementRate >= 80
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {row.achievementRate.toFixed(1)}%
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
                                    [emp.id]: val,
                                  }));
                                }}
                                className="w-16 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-900 text-center font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                              />
                              <span className="text-[11px] font-semibold text-slate-500">pts</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                            {(row.weight * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-950 font-mono text-sm bg-amber-50/70">
                            {formatMMK(row.bonusAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenSingleBonusSlip(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-slate-700 hover:text-amber-950 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                              title="Print or view individual slip"
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              <span>Slip</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {quarterlyData.employeeDistributions.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900">
                      <td colSpan={5} className="px-4 py-3 text-right">
                        Summary Total:
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-purple-700">
                        {Number(quarterlyData.totalPoints.toFixed(2))} pts
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        100.0%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-950 bg-amber-100 text-base">
                        {formatMMK(quarterlyData.bonusPool)}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: MONTHLY CREDIT DEBT RECOVERIES & REPAYMENTS */}
      {activeView === 'repayments' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Executive Summary Cards for Debt Collections */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl text-white shadow-md border border-indigo-700/50 space-y-1">
              <div className="flex items-center justify-between text-indigo-300">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Debt Recovered ({periodDisplayText})</span>
                <Coins className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-mono font-black text-indigo-200 mt-1">
                {formatMMK(repaymentCollectionsData.totalCollectedInHorizon)}
              </div>
              <p className="text-[11px] text-slate-300">
                Total credit debt collected within selected timeframe
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Installments Settled</span>
                <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">
                {repaymentCollectionsData.horizonRepayments.length} <span className="text-xs font-normal text-slate-500">receipts</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Number of installment repayments received
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-bold uppercase tracking-wider">Historical Total Recovered</span>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-mono font-black text-emerald-700 mt-1">
                {formatMMK(repaymentCollectionsData.allRepayments.reduce((sum, r) => sum + r.amount, 0))}
              </div>
              <p className="text-[11px] text-slate-500">
                All-time cumulative debt recovery collected
              </p>
            </div>
          </div>

          {/* Month-by-Month Repayment Breakdown Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Month-by-Month Repayments Trend
                </h3>
                <p className="text-xs text-slate-500">
                  Customer installment repayments collected by month
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                {repaymentCollectionsData.monthlySummary.length} Active Repayment Months
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {repaymentCollectionsData.monthlySummary.map((mStat) => (
                <button
                  key={mStat.month}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(mStat.month);
                    setTimeHorizon('MONTH');
                  }}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                    selectedMonth === mStat.month && timeHorizon === 'MONTH'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50/80 hover:bg-indigo-50/50 border-slate-200 text-slate-900'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${
                    selectedMonth === mStat.month && timeHorizon === 'MONTH' ? 'text-indigo-100' : 'text-slate-600'
                  }`}>
                    {getMonthName(mStat.month)}
                  </span>
                  <div className={`font-mono font-black text-sm ${
                    selectedMonth === mStat.month && timeHorizon === 'MONTH' ? 'text-white' : 'text-indigo-950'
                  }`}>
                    {formatMMK(mStat.totalAmount)}
                  </div>
                  <span className={`text-[10px] ${
                    selectedMonth === mStat.month && timeHorizon === 'MONTH' ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    {mStat.count} collections
                  </span>
                </button>
              ))}

              {repaymentCollectionsData.monthlySummary.length === 0 && (
                <div className="col-span-full py-4 text-center text-xs text-slate-400">
                  No monthly repayment transactions recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Repayments Detailed Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Repayment Transactions Ledger ({periodDisplayText})
                </h3>
                <p className="text-xs text-slate-500">
                  Monthly installment repayment details and collections
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportRepayments}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-xs rounded-xl border border-indigo-200 transition cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Export Repayments CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase">
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Customer Name</th>
                    <th className="px-3.5 py-2.5">Phone Number</th>
                    <th className="px-3.5 py-2.5">Voucher #</th>
                    <th className="px-3.5 py-2.5">Branch</th>
                    <th className="px-3.5 py-2.5">Installment / Notes</th>
                    <th className="px-3.5 py-2.5">Method</th>
                    <th className="px-3.5 py-2.5 text-right">Collected (MMK)</th>
                    <th className="px-3.5 py-2.5">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repaymentCollectionsData.horizonRepayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        No credit debt repayments recorded in this period ({periodDisplayText}).
                      </td>
                    </tr>
                  ) : (
                    repaymentCollectionsData.horizonRepayments.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">{tx.date}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{tx.customerName}</td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-600">{tx.customerPhone || '-'}</td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-purple-700">#{tx.invoiceNo || tx.saleId}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{tx.branchName || 'Main'}</td>
                        <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                          {tx.installmentNo ? `Month ${tx.installmentNo} Installment` : (tx.notes || 'Repayment')}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[10.5px]">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-700 text-xs">
                          {formatMMK(tx.amount)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">{tx.recordedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Slip Modal */}
      <BonusSlipModal
        isOpen={isBonusSlipOpen}
        onClose={() => setIsBonusSlipOpen(false)}
        slipData={selectedBonusSlip}
      />
    </div>
  );
};
