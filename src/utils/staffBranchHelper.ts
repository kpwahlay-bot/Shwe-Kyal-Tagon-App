import { Employee, normalizeDepartmentName } from '../types';

export interface StaffOption {
  id: string;
  name: string;
  title: string;
  position: string;
  role: string;
  branchId: string;
  branchName: string;
  dept: string;
}

/**
 * Filter out dummy, test, or invalid placeholder staff names
 */
export const isInvalidStaff = (name?: string): boolean => {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return (
    lower === 'demo' ||
    lower === 'test' ||
    lower === '-' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower.includes('test user') ||
    lower.includes('sample')
  );
};

/**
 * Matches employee to a specific branch, considering explicit branchId and branchName.
 */
export const isStaffInBranch = (emp: Employee, branchId?: string): boolean => {
  if (!branchId || branchId === 'ALL') return true;
  if (emp.branchId === branchId) return true;
  if ((branchId === 'SKTG1' || branchId === 'branch-1') && (emp.branchName?.includes('Shop 1') || emp.branchName?.includes('နဝဒေး') || emp.branchId === 'SKTG1' || emp.branchId === 'branch-1')) return true;
  if ((branchId === 'SKTG2' || branchId === 'branch-2') && (emp.branchName?.includes('Shop 2') || emp.branchName?.includes('အနော်ရထာ') || emp.branchId === 'SKTG2' || emp.branchId === 'branch-2')) return true;
  if ((branchId === 'SKTG3' || branchId === 'branch-3') && (emp.branchName?.includes('Shop 3') || emp.branchName?.includes('၅၀၆') || emp.branchId === 'SKTG3' || emp.branchId === 'branch-3')) return true;
  if ((branchId === 'SII' || branchId === 'branch-sys2') && (emp.branchName?.includes('System II') || emp.branchName?.includes('SYS-02') || emp.branchName?.includes('SII') || emp.branchId === 'SII' || emp.branchId === 'branch-sys2')) return true;
  return false;
};

/**
 * Get Cashier staff for a branch.
 * Looks for staff with position containing 'Cashier', 'ငွေကိုင်', or Finance Department members in that branch.
 */
export const getBranchCashierStaff = (employees: Employee[], branchId?: string): StaffOption[] => {
  const result: StaffOption[] = [];
  const seen = new Set<string>();

  // 1. First find dedicated Cashiers for this branch
  employees.forEach((emp) => {
    if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
    if (!isStaffInBranch(emp, branchId)) return;

    const posLower = (emp.position || '').toLowerCase();
    const deptNorm = normalizeDepartmentName(emp.department);
    const isExplicitCashier = posLower.includes('cashier') || posLower.includes('ငွေကိုင်');
    const isFinance = deptNorm === 'Finance Department';

    if ((isExplicitCashier || isFinance) && !seen.has(emp.name)) {
      seen.add(emp.name);
      result.push({
        id: emp.id,
        name: emp.name,
        title: emp.position || 'Cashier',
        position: emp.position || 'Cashier',
        role: emp.isManager ? 'Manager' : 'Staff',
        branchId: emp.branchId,
        branchName: emp.branchName,
        dept: deptNorm,
      });
    }
  });

  // 2. If no dedicated cashiers found for this branch, include branch managers or staff
  if (result.length === 0 && branchId && branchId !== 'ALL') {
    employees.forEach((emp) => {
      if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
      if (!isStaffInBranch(emp, branchId)) return;
      if (!seen.has(emp.name)) {
        seen.add(emp.name);
        result.push({
          id: emp.id,
          name: emp.name,
          title: emp.position || 'Staff',
          position: emp.position || 'Staff',
          role: emp.isManager ? 'Manager' : 'Staff',
          branchId: emp.branchId,
          branchName: emp.branchName,
          dept: normalizeDepartmentName(emp.department),
        });
      }
    });
  }

  // Fallback defaults by branch if still empty
  if (result.length === 0) {
    if (branchId === 'branch-1') {
      result.push({ id: 'def-c1', name: 'Su Myat Mon', title: 'Cashier', position: 'Cashier', role: 'Staff', branchId: 'branch-1', branchName: 'Shwe Kyal Tagon (Shop 1)', dept: 'Finance Department' });
    } else if (branchId === 'branch-2') {
      result.push({ id: 'def-c2', name: 'Hnin Hnin Aye', title: 'Cashier', position: 'Cashier', role: 'Staff', branchId: 'branch-2', branchName: 'Shwe Kyal Tagon (Shop 2)', dept: 'Finance Department' });
    } else if (branchId === 'branch-3') {
      result.push({ id: 'def-c3', name: 'Aye Thandar', title: 'Cashier', position: 'Cashier', role: 'Staff', branchId: 'branch-3', branchName: 'Shwe Kyal Tagon (Shop 3)', dept: 'Finance Department' });
    } else if (branchId === 'branch-sys2') {
      result.push({ id: 'def-cs2', name: 'Ei Nge Win', title: 'Cashier', position: 'Cashier', role: 'Staff', branchId: 'branch-sys2', branchName: 'System II', dept: 'Finance Department' });
    }
  }

  return result;
};

/**
 * Get Finance / Accounting staff for a branch.
 */
export const getBranchFinanceStaff = (employees: Employee[], branchId?: string): StaffOption[] => {
  const result: StaffOption[] = [];
  const seen = new Set<string>();

  // 1. Find Finance Department members in this branch
  employees.forEach((emp) => {
    if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
    if (!isStaffInBranch(emp, branchId) && emp.branchId !== 'ALL') return;

    const deptNorm = normalizeDepartmentName(emp.department);
    const posLower = (emp.position || '').toLowerCase();
    const isFinanceDept = deptNorm === 'Finance Department';
    const isFinancePos = 
      posLower.includes('finance') || 
      posLower.includes('account') || 
      posLower.includes('payment') || 
      posLower.includes('audit') ||
      posLower.includes('policy');

    if ((isFinanceDept || isFinancePos) && !seen.has(emp.name)) {
      seen.add(emp.name);
      result.push({
        id: emp.id,
        name: emp.name,
        title: emp.position || 'Finance',
        position: emp.position || 'Finance',
        role: emp.isManager ? 'Manager' : 'Staff',
        branchId: emp.branchId,
        branchName: emp.branchName,
        dept: 'Finance Department',
      });
    }
  });

  // 2. Also include store managers of this branch if finance is needed
  if (branchId && branchId !== 'ALL') {
    employees.forEach((emp) => {
      if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
      if (!isStaffInBranch(emp, branchId)) return;
      const posLower = (emp.position || '').toLowerCase();
      if ((posLower.includes('manager') || posLower.includes('supervisor')) && !seen.has(emp.name)) {
        seen.add(emp.name);
        result.push({
          id: emp.id,
          name: emp.name,
          title: `${emp.position} (Branch Lead)`,
          position: emp.position,
          role: 'Manager',
          branchId: emp.branchId,
          branchName: emp.branchName,
          dept: normalizeDepartmentName(emp.department),
        });
      }
    });
  }

  // Fallback defaults by branch
  if (result.length === 0) {
    if (branchId === 'branch-1') {
      result.push({ id: 'def-f1', name: 'Ei Ei Thein', title: 'Finance', position: 'Finance', role: 'Staff', branchId: 'branch-1', branchName: 'Shwe Kyal Tagon (Shop 1)', dept: 'Finance Department' });
    } else if (branchId === 'branch-2') {
      result.push({ id: 'def-f2', name: 'Nu Nu Win', title: 'Manager', position: 'Manager', role: 'Manager', branchId: 'branch-2', branchName: 'Shwe Kyal Tagon (Shop 2)', dept: 'Sales Department' });
    } else if (branchId === 'branch-3') {
      result.push({ id: 'def-f3', name: 'Hnin Ou Ngwe', title: 'Assistant Manager', position: 'Assistant Manager', role: 'Manager', branchId: 'branch-3', branchName: 'Shwe Kyal Tagon (Shop 3)', dept: 'Sales Department' });
    } else if (branchId === 'branch-sys2') {
      result.push({ id: 'def-fs2', name: 'Ei Nge Win', title: 'Finance', position: 'Finance', role: 'Staff', branchId: 'branch-sys2', branchName: 'System II', dept: 'Finance Department' });
    }
  }

  return result;
};

/**
 * Get Service Technicians for a branch.
 */
export const getBranchServiceStaff = (employees: Employee[], branchId?: string): StaffOption[] => {
  const result: StaffOption[] = [];
  const seen = new Set<string>();

  // 1. Strictly Service Department in this branch
  employees.forEach((emp) => {
    if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
    if (!isStaffInBranch(emp, branchId)) return;

    const deptNorm = normalizeDepartmentName(emp.department);
    const posLower = (emp.position || '').toLowerCase();
    const isService = deptNorm === 'Service Department' || posLower.includes('service') || posLower.includes('technician');

    if (isService && !seen.has(emp.name)) {
      seen.add(emp.name);
      result.push({
        id: emp.id,
        name: emp.name,
        title: emp.position || 'Technician',
        position: emp.position || 'Technician',
        role: emp.isManager ? 'Manager' : 'Staff',
        branchId: emp.branchId,
        branchName: emp.branchName,
        dept: 'Service Department',
      });
    }
  });

  // 2. If this branch has no local technician (e.g. Shop 2 or Shop 3), fallback to Service Department staff
  if (result.length === 0) {
    employees.forEach((emp) => {
      if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
      const deptNorm = normalizeDepartmentName(emp.department);
      const posLower = (emp.position || '').toLowerCase();
      const isService = deptNorm === 'Service Department' || posLower.includes('service') || posLower.includes('technician');
      if (isService && !seen.has(emp.name)) {
        seen.add(emp.name);
        result.push({
          id: emp.id,
          name: emp.name,
          title: `${emp.position || 'Technician'} (${emp.branchName?.replace('Shwe Kyal Tagon (', '').replace(')', '') || 'HQ'})`,
          position: emp.position || 'Technician',
          role: emp.isManager ? 'Manager' : 'Staff',
          branchId: emp.branchId,
          branchName: emp.branchName,
          dept: 'Service Department',
        });
      }
    });
  }

  return result;
};

/**
 * Get Sales Department staff for a branch.
 */
export const getBranchSalesStaff = (employees: Employee[], branchId?: string): StaffOption[] => {
  const result: StaffOption[] = [];
  const seen = new Set<string>();

  employees.forEach((emp) => {
    if (emp.status === 'resigned' || isInvalidStaff(emp.name)) return;
    if (!isStaffInBranch(emp, branchId)) return;

    const deptNorm = normalizeDepartmentName(emp.department);
    const isSales = deptNorm === 'Sales Department';

    if (isSales && !seen.has(emp.name)) {
      seen.add(emp.name);
      result.push({
        id: emp.id,
        name: emp.name,
        title: emp.position || 'Sales Staff',
        position: emp.position || 'Sales Staff',
        role: emp.isManager ? 'Manager' : 'Staff',
        branchId: emp.branchId,
        branchName: emp.branchName,
        dept: 'Sales Department',
      });
    }
  });

  return result;
};

/**
 * Default Cashier name for a branch
 */
export const getDefaultCashierForBranch = (employees: Employee[], branchId?: string): string => {
  const cashiers = getBranchCashierStaff(employees, branchId);
  if (cashiers.length > 0) {
    // Prefer explicit cashier position
    const explicit = cashiers.find(c => c.position.toLowerCase().includes('cashier'));
    return (explicit || cashiers[0]).name;
  }
  if (branchId === 'branch-1') return 'Su Myat Mon';
  if (branchId === 'branch-2') return 'Hnin Hnin Aye';
  if (branchId === 'branch-3') return 'Aye Thandar';
  if (branchId === 'branch-sys2') return 'Ei Nge Win';
  return 'Cashier';
};

/**
 * Default Finance staff name for a branch
 */
export const getDefaultFinanceForBranch = (employees: Employee[], branchId?: string): string => {
  const finance = getBranchFinanceStaff(employees, branchId);
  if (finance.length > 0) {
    return finance[0].name;
  }
  if (branchId === 'branch-1') return 'Ei Ei Thein';
  if (branchId === 'branch-2') return 'Nu Nu Win';
  if (branchId === 'branch-3') return 'Hnin Ou Ngwe';
  if (branchId === 'branch-sys2') return 'Ei Nge Win';
  return 'Finance';
};
