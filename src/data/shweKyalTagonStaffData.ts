import { Branch, Employee, UserAccount, UserRole, SalaryRecord, normalizeUserRole } from '../types';

export const SKTG_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    code: 'CS-01',
    name: 'Shwe Kyal Tagon (Shop 1)',
    city: 'Yangon',
    address: 'Building (84), Room (1+2), Nawade Shopping Mall, Kyansittha Road, Hlaing Tharyar (East) Township.',
    phone: '09 263027177',
    mobileTarget: 100,
    laptopTarget: 25,
  },
  {
    id: 'branch-2',
    code: 'CS-02',
    name: 'Shwe Kyal Tagon (Shop 2)',
    city: 'Yangon',
    address: 'No. (17/2005), (20) Ward, Anawrahta Main Road, Hlaing Tharyar (West) Township.',
    phone: '09 250009722, 09 250009710',
    mobileTarget: 80,
    laptopTarget: 20,
  },
  {
    id: 'branch-3',
    code: 'CS-03',
    name: 'Shwe Kyal Tagon (Shop 3)',
    city: 'Yangon',
    address: 'No. (506/A+B), (20) Ward, Anawrahta Main Road, Hlaing Tharyar (West) Township.',
    phone: '09 262522332, 09 262500075, 09 2625000253',
    mobileTarget: 70,
    laptopTarget: 15,
  },
  {
    id: 'branch-sys2',
    code: 'System II',
    name: 'System II',
    city: 'Yangon',
    address: 'B/84B, Room (3+4+5+6), Nawade Shop House, Kyansittha Road, Hlaing Tharyar (East) Township (Near Pagoda Road Traffic Light)',
    phone: '09 453077667, 09 457063667',
    mobileTarget: 90,
    laptopTarget: 30,
  },
];

/**
 * Normalizes old default branch names to the exact standardized format requested by the user,
 * while preserving custom edits made in Branch Network.
 */
export const normalizeBranch = (branch: Branch): Branch => {
  const lowerName = (branch.name || '').toLowerCase();
  const lowerId = (branch.id || '').toLowerCase();
  if (
    lowerId === 'branch-1' ||
    lowerId === 'branch-main' ||
    lowerName.includes('shop 1') ||
    lowerName.includes('main store') ||
    lowerName === 'main' ||
    lowerName.includes('head office') ||
    lowerName.includes('နဝဒေး')
  ) {
    return { ...branch, id: 'branch-1', name: 'Shwe Kyal Tagon (Shop 1)', code: branch.code && branch.code !== 'MAIN' ? branch.code : 'CS-01' };
  }
  if (lowerId === 'branch-2' || lowerName.includes('shop 2') || lowerName.includes('အနော်ရထာ')) {
    return { ...branch, id: 'branch-2', name: 'Shwe Kyal Tagon (Shop 2)', code: branch.code || 'CS-02' };
  }
  if (lowerId === 'branch-3' || lowerName.includes('shop 3') || lowerName.includes('၅၀၆')) {
    return { ...branch, id: 'branch-3', name: 'Shwe Kyal Tagon (Shop 3)', code: branch.code || 'CS-03' };
  }
  if (
    lowerId === 'branch-sys2' ||
    lowerName.includes('system ii') ||
    branch.code?.toLowerCase() === 'sys-02' ||
    branch.code === 'Shwe Kyal Tagon' ||
    branch.code?.toLowerCase() === 'system ii'
  ) {
    const isOldAddress = !branch.address || branch.address.includes('လှိုင်သာယာ');
    const isOldPhone = !branch.phone || branch.phone === '09 263027177';
    return {
      ...branch,
      id: 'branch-sys2',
      code: 'System II',
      name: 'System II',
      address: isOldAddress ? 'B/84B, Room (3+4+5+6), Nawade Shop House, Kyansittha Road, Hlaing Tharyar (East) Township.' : branch.address,
      phone: isOldPhone ? '09 453077667, 09 457063667' : branch.phone,
    };
  }
  return branch;
};

/**
 * Deduplicates and guarantees the 4 canonical Shwe Kyal Tagon branches in order.
 * Eradicates any phantom 'Main Store', 'Main', or 'branch-main'.
 */
export const cleanAndNormalizeBranches = (rawBranches: Branch[]): Branch[] => {
  const map = new Map<string, Branch>();
  // Pre-seed with the 4 canonical branches
  for (const b of SKTG_BRANCHES) {
    map.set(b.id, { ...b });
  }
  if (Array.isArray(rawBranches)) {
    for (const b of rawBranches) {
      if (!b) continue;
      const normalized = normalizeBranch(b);
      if (normalized.id === 'branch-main') continue;
      map.set(normalized.id, normalized);
    }
  }
  const canonicalIds = ['branch-1', 'branch-2', 'branch-3', 'branch-sys2'];
  const result: Branch[] = [];
  for (const id of canonicalIds) {
    const found = map.get(id) || SKTG_BRANCHES.find((b) => b.id === id);
    if (found) result.push(normalizeBranch(found));
    map.delete(id);
  }
  for (const extra of map.values()) {
    result.push(extra);
  }
  return result;
};

/**
 * Strictly normalizes employee branch assignments to the 4 official Shwe Kyal Tagon branches.
 * Eradicates any phantom 'Main Store', 'Main', or 'branch-main'.
 * Specifically: Yamin Nwe (EC010) is strictly staff of Shop 1 ('branch-1').
 */
export function normalizeEmployeeBranch(
  branchId?: string,
  branchName?: string,
  empCode?: string
): { branchId: string; branchName: string } {
  const code = (empCode || '').trim().toUpperCase();

  // Yamin Nwe (EC010) & Han Thazin Nway (EC013) are strictly Shop 1 staff!
  if (code === 'EC010' || code === 'EC-010' || code === 'EC013' || code === 'EC-013') {
    return { branchId: 'branch-1', branchName: 'Shwe Kyal Tagon (Shop 1)' };
  }

  // Eradicate any reference to "Main Store", "Main", or "branch-main"
  const rawName = (branchName || '').trim();
  const rawId = (branchId || '').trim();

  if (
    !rawId ||
    rawId === 'branch-main' ||
    rawId === 'ALL' ||
    rawName === 'Main Store' ||
    rawName === 'Main' ||
    rawName === 'Main Store / Head Office'
  ) {
    if (code) {
      const canonical = RAW_STAFF_LIST.find((s) => s.code.toUpperCase() === code);
      if (canonical) {
        return { branchId: canonical.branchId, branchName: canonical.branchName };
      }
    }
    return { branchId: 'branch-1', branchName: 'Shwe Kyal Tagon (Shop 1)' };
  }

  if (rawId === 'branch-1' || rawName.includes('Shop 1')) {
    return { branchId: 'branch-1', branchName: 'Shwe Kyal Tagon (Shop 1)' };
  }
  if (rawId === 'branch-2' || rawName.includes('Shop 2')) {
    return { branchId: 'branch-2', branchName: 'Shwe Kyal Tagon (Shop 2)' };
  }
  if (rawId === 'branch-3' || rawName.includes('Shop 3')) {
    return { branchId: 'branch-3', branchName: 'Shwe Kyal Tagon (Shop 3)' };
  }
  if (rawId === 'branch-sys2' || rawName.includes('System II')) {
    return { branchId: 'branch-sys2', branchName: 'System II' };
  }

  return {
    branchId: rawId || 'branch-1',
    branchName: rawName || 'Shwe Kyal Tagon (Shop 1)',
  };
}

interface RawStaffMember {
  name: string;
  position: string;
  dept: 'Sales Department' | 'Service Department' | 'Finance Department' | 'Inventory & Purchase Department';
  branchId: string;
  branchName: string;
  role: UserRole;
  code: string;
  phone: string;
  baseSalary: number;
  joinedDate: string;
  tenure: string;
}

const RAW_STAFF_LIST: RawStaffMember[] = [
  // ===================== SHOP 1 (13 Staff) =====================
  {
    name: 'Kyaw Thi Ha',
    position: 'Service Manager',
    dept: 'Service Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Sales Manager',
    code: 'EC001',
    phone: '09 263027177',
    baseSalary: 0,
    joinedDate: '2023-01-15',
    tenure: '3y 8m',
  },
  {
    name: 'Bo Hein Tun',
    position: 'Senior Service',
    dept: 'Service Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC002',
    phone: '09 420011001',
    baseSalary: 0,
    joinedDate: '2024-03-01',
    tenure: '2y 6m',
  },
  {
    name: 'Htet Zin Aung',
    position: 'Installment',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC003',
    phone: '09 420011002',
    baseSalary: 0,
    joinedDate: '2025-02-01',
    tenure: '1y 7m',
  },
  {
    name: 'Thukha Hein',
    position: 'Senior Sale',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC004',
    phone: '09 420011003',
    baseSalary: 0,
    joinedDate: '2024-05-15',
    tenure: '2y 4m',
  },
  {
    name: 'Su Po Po Htun',
    position: 'Supervisor',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Sales Manager',
    code: 'EC005',
    phone: '09 420011004',
    baseSalary: 0,
    joinedDate: '2023-06-01',
    tenure: '3y 3m',
  },
  {
    name: 'Cherry Win',
    position: 'Page Admin',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC006',
    phone: '09 420011005',
    baseSalary: 0,
    joinedDate: '2025-01-10',
    tenure: '1y 8m',
  },
  {
    name: 'Su Myat Mon',
    position: 'Cashier',
    dept: 'Finance Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Cashier',
    code: 'EC007',
    phone: '09 420011006',
    baseSalary: 0,
    joinedDate: '2025-04-01',
    tenure: '1y 5m',
  },
  {
    name: 'Thawtar Win',
    position: 'Junior Sale',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC008',
    phone: '09 420011007',
    baseSalary: 0,
    joinedDate: '2026-02-01',
    tenure: '7m',
  },
  {
    name: 'Cho Cho Aung',
    position: 'Training',
    dept: 'Sales Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC009',
    phone: '09 420011008',
    baseSalary: 0,
    joinedDate: '2026-05-01',
    tenure: '4m',
  },
  {
    name: 'Yamin Nwe',
    position: 'Finance & Policy',
    dept: 'Finance Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Operation',
    code: 'EC010',
    phone: '09 420011009',
    baseSalary: 0,
    joinedDate: '2022-09-01',
    tenure: '4y',
  },
  {
    name: 'Ei Ei Thein',
    position: 'Finance',
    dept: 'Finance Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Finance',
    code: 'EC011',
    phone: '09 420011010',
    baseSalary: 0,
    joinedDate: '2024-01-10',
    tenure: '2y 8m',
  },
  {
    name: 'Pyae Phyo Thwe',
    position: 'Payment',
    dept: 'Finance Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC012',
    phone: '09 420011011',
    baseSalary: 0,
    joinedDate: '2025-03-15',
    tenure: '1y 6m',
  },
  {
    name: 'Han Thazin Nway',
    position: 'I Stock & Purchase',
    dept: 'Inventory & Purchase Department',
    branchId: 'branch-1',
    branchName: 'Shwe Kyal Tagon (Shop 1)',
    role: 'Staff',
    code: 'EC013',
    phone: '09 420011012',
    baseSalary: 0,
    joinedDate: '2023-11-01',
    tenure: '2y 10m',
  },

  // ===================== SHOP 2 (5 Staff) =====================
  {
    name: 'Nu Nu Win',
    position: 'Manager',
    dept: 'Sales Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Sales Manager',
    code: 'EC014',
    phone: '09 250009722',
    baseSalary: 0,
    joinedDate: '2023-04-01',
    tenure: '3y 5m',
  },
  {
    name: 'Yadanar Moe',
    position: 'Senior Sale',
    dept: 'Sales Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Staff',
    code: 'EC015',
    phone: '09 250009710',
    baseSalary: 0,
    joinedDate: '2024-07-01',
    tenure: '2y 2m',
  },
  {
    name: 'Hnin Hnin Aye',
    position: 'Cashier',
    dept: 'Finance Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Cashier',
    code: 'EC016',
    phone: '09 420022001',
    baseSalary: 0,
    joinedDate: '2025-02-15',
    tenure: '1y 7m',
  },
  {
    name: 'Arkar Phyo',
    position: 'Senior Sale',
    dept: 'Sales Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Staff',
    code: 'EC017',
    phone: '09 420022002',
    baseSalary: 0,
    joinedDate: '2024-08-01',
    tenure: '2y 1m',
  },
  {
    name: 'Min Khant Kyaw',
    position: 'Installment',
    dept: 'Sales Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Staff',
    code: 'EC018',
    phone: '09 420022003',
    baseSalary: 0,
    joinedDate: '2025-06-01',
    tenure: '1y 3m',
  },

  // ===================== SHOP 3 (5 Staff) =====================
  {
    name: 'Paing Zay Oo',
    position: 'Supervisor',
    dept: 'Sales Department',
    branchId: 'branch-3',
    branchName: 'Shwe Kyal Tagon (Shop 3)',
    role: 'Sales Manager',
    code: 'EC019',
    phone: '09 262522332',
    baseSalary: 0,
    joinedDate: '2023-08-01',
    tenure: '3y 1m',
  },
  {
    name: 'Hnin Ou Ngwe',
    position: 'Assistant Manager',
    dept: 'Sales Department',
    branchId: 'branch-3',
    branchName: 'Shwe Kyal Tagon (Shop 3)',
    role: 'Sales Manager',
    code: 'EC020',
    phone: '09 262500075',
    baseSalary: 0,
    joinedDate: '2024-01-15',
    tenure: '2y 8m',
  },
  {
    name: 'Aye Thandar',
    position: 'Cashier',
    dept: 'Finance Department',
    branchId: 'branch-3',
    branchName: 'Shwe Kyal Tagon (Shop 3)',
    role: 'Cashier',
    code: 'EC021',
    phone: '09 2625000253',
    baseSalary: 0,
    joinedDate: '2025-01-20',
    tenure: '1y 8m',
  },
  {
    name: 'Su Myat Moe',
    position: 'Junior Cashier',
    dept: 'Finance Department',
    branchId: 'branch-3',
    branchName: 'Shwe Kyal Tagon (Shop 3)',
    role: 'Cashier',
    code: 'EC022',
    phone: '09 420033001',
    baseSalary: 0,
    joinedDate: '2026-03-01',
    tenure: '6m',
  },
  {
    name: 'Khant Loon Naing',
    position: 'Installment',
    dept: 'Sales Department',
    branchId: 'branch-3',
    branchName: 'Shwe Kyal Tagon (Shop 3)',
    role: 'Staff',
    code: 'EC023',
    phone: '09 420033002',
    baseSalary: 0,
    joinedDate: '2025-05-01',
    tenure: '1y 4m',
  },

  // ===================== SYSTEM II (7 Staff) =====================
  {
    name: 'Moe Kyaw Kyaw',
    position: 'Supervisor',
    dept: 'Service Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Sales Manager',
    code: 'EC024',
    phone: '09 420044001',
    baseSalary: 0,
    joinedDate: '2023-05-01',
    tenure: '3y 4m',
  },
  {
    name: 'Zin Hnin Thet',
    position: 'Senior Service',
    dept: 'Service Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Staff',
    code: 'EC025',
    phone: '09 420044002',
    baseSalary: 0,
    joinedDate: '2024-04-01',
    tenure: '2y 5m',
  },
  {
    name: 'Ei Nge Win',
    position: 'Cashier',
    dept: 'Finance Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Cashier',
    code: 'EC026',
    phone: '09 420044003',
    baseSalary: 0,
    joinedDate: '2025-02-01',
    tenure: '1y 7m',
  },
  {
    name: 'Phyu Phyu Win',
    position: 'Junior Cashier',
    dept: 'Finance Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Cashier',
    code: 'EC027',
    phone: '09 420044004',
    baseSalary: 0,
    joinedDate: '2026-04-01',
    tenure: '5m',
  },
  {
    name: 'Pyae Phyo Kyaw',
    position: 'Installment',
    dept: 'Sales Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Staff',
    code: 'EC028',
    phone: '09 420044005',
    baseSalary: 0,
    joinedDate: '2025-07-01',
    tenure: '1y 2m',
  },
  {
    name: 'Thant Zin Tun',
    position: 'Service Technician',
    dept: 'Service Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Staff',
    code: 'EC029',
    phone: '09 420044006',
    baseSalary: 0,
    joinedDate: '2025-03-01',
    tenure: '1y 6m',
  },
  {
    name: 'Kaythi Hlaing',
    position: 'Senior Sale',
    dept: 'Sales Department',
    branchId: 'branch-sys2',
    branchName: 'System II',
    role: 'Staff',
    code: 'EC030',
    phone: '09 420044007',
    baseSalary: 0,
    joinedDate: '2024-06-01',
    tenure: '2y 3m',
  },
  {
    name: 'Thet Paing Oo',
    position: 'Junior Sales Executive',
    dept: 'Sales Department',
    branchId: 'branch-2',
    branchName: 'Shwe Kyal Tagon (Shop 2)',
    role: 'Staff',
    code: 'EC031',
    phone: '09 420022004',
    baseSalary: 0,
    joinedDate: '2026-09-29',
    tenure: '1m',
  },
];

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-blue-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-fuchsia-600',
];

export const SKTG_EMPLOYEES: Employee[] = RAW_STAFF_LIST.map((s, idx) => {
  const empId = `emp-${s.code.toLowerCase()}`;
  const userId = `usr-${s.code.toLowerCase()}`;
  const cleanUsername = s.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sktg.com';
  return {
    id: empId,
    code: s.code,
    name: s.name,
    position: s.position,
    department: s.dept,
    branchId: s.branchId,
    branchName: s.branchName,
    phone: s.phone,
    baseSalary: s.baseSalary,
    joinedDate: s.joinedDate,
    tenure: s.tenure,
    status: 'active',
    avatarBg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    isManager: s.role === 'Sales Manager' || s.role === 'MD',
    userAccountId: userId,
    username: cleanUsername,
    phoneTargetUnits: s.dept === 'Sales Department' ? 10 : 0,
    laptopTargetUnits: s.dept === 'Sales Department' ? 5 : 0,
    salesTargetUnits: s.dept === 'Sales Department' ? 15 : 0,
    salesTarget: s.dept === 'Sales Department' ? 5000000 : 0,
    kpiScore: 100,
    performancePoints: 10,
  };
});

export const SKTG_USER_ACCOUNTS: UserAccount[] = RAW_STAFF_LIST.map((s, idx) => {
  const empId = `emp-${s.code.toLowerCase()}`;
  const userId = `usr-${s.code.toLowerCase()}`;
  const cleanUsername = s.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sktg.com';
  const isYamin = s.code === 'EC010' || cleanUsername.includes('yaminnwe');
  const isCashier = s.position.toLowerCase().includes('cashier');
  const isManager = s.position.toLowerCase().includes('manager');
  
  let exactRole: UserRole = 'Staff';
  if (isYamin) {
    exactRole = 'Operation';
  } else if (isManager) {
    exactRole = 'Sales Manager';
  } else if (isCashier) {
    exactRole = 'Cashier';
  } else {
    exactRole = normalizeUserRole(s.role);
  }

  return {
    id: userId,
    username: cleanUsername,
    displayName: `${s.name} (${s.position})`,
    role: exactRole,
    title: isYamin ? 'Finance & Policy' : `${s.position} - ${s.branchName.split('(')[1]?.replace(')', '') || s.branchName}`,
    branchId: isYamin ? 'branch-1' : s.branchId,
    branchName: isYamin ? 'Shwe Kyal Tagon (Shop 1)' : s.branchName,
    pin: '1234',
    password: '',
    avatarBg: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    status: 'active',
    employeeId: empId,
    employeeCode: s.code,
  };
});

/**
 * Branch sequential ordering for Employee ID assignments:
 * 1. Shop 1 (branch-1) -> EC001 ...
 * 2. Shop 2 (branch-2) -> sequential continue
 * 3. Shop 3 (branch-3) -> sequential continue
 * 4. System II (branch-sys2) -> sequential continue
 * 5. Any other branch -> sequential continue
 */
const BRANCH_ORDER_WEIGHT: Record<string, number> = {
  'branch-1': 1,
  'branch-2': 2,
  'branch-3': 3,
  'branch-sys2': 4,
};

// Map of canonical staff index from RAW_STAFF_LIST (30 staff)
const CANONICAL_STAFF_ORDER: Map<string, number> = new Map(
  RAW_STAFF_LIST.map((s, index) => [s.name.trim().toLowerCase(), index])
);

/**
 * Checks if a name or username corresponds to a legacy mock/dummy persona (e.g. Mya Mya, Ei Ei, Aye Aye, Thu Thu)
 * while preserving legitimate employees (Ei Ei Thein, Ei Nge Win, Hnin Hnin Aye, Aye Thandar).
 */
export function isDummyOrInvalidStaff(nameOrUsername?: string): boolean {
  if (!nameOrUsername) return false;
  const raw = nameOrUsername.trim();
  const lower = raw.toLowerCase();

  // Exact dummy mock names to purge
  if (
    lower === 'mya mya' ||
    lower === 'ei ei' ||
    lower === 'aye aye' ||
    lower === 'thu thu' ||
    lower === 'demo' ||
    lower === 'test user' ||
    lower === 'test'
  ) {
    return true;
  }

  // Prefix matching dummy mock names
  if (lower.startsWith('mya mya ') || lower.startsWith('mya mya(') || lower.startsWith('mya mya -')) {
    return true;
  }
  if (
    (lower.startsWith('ei ei ') || lower.startsWith('ei ei(') || lower.startsWith('ei ei -')) &&
    !lower.includes('ei ei thein')
  ) {
    return true;
  }
  if (
    (lower.startsWith('aye aye ') || lower.startsWith('aye aye(') || lower.startsWith('aye aye -')) &&
    !lower.includes('hnin hnin aye') &&
    !lower.includes('aye thandar')
  ) {
    return true;
  }
  if (lower.startsWith('thu thu ') || lower.startsWith('thu thu(') || lower.startsWith('thu thu -')) {
    return true;
  }

  return false;
}

/**
 * Rigorously sanitizes and deduplicates user accounts:
 * 1. Only 'sumyatwin.sktg@gmail.com' is allowed to have an @gmail.com address.
 * 2. All other sktg@gmail.com, @gmail.com, and @sktg.com.mm accounts are completely purged.
 * 3. All legitimate staff user accounts MUST follow the exact 'username@sktg.com' format.
 * 4. Deduplicates and unifies so each of the 30 canonical staff members has exactly 1 account.
 * 5. Guarantees exactly the 30 canonical staff accounts + 1 Managing Director account with no duplicates.
 */
export function sanitizeUserAccounts(rawUsers: UserAccount[]): UserAccount[] {
  const ownerAcc: UserAccount = {
    id: 'usr-owner',
    username: 'sumyatwin.sktg@gmail.com',
    displayName: 'Daw Su Myat Win',
    role: 'MD',
    title: 'Managing Director (MD)',
    branchId: 'ALL',
    branchName: 'All Branches (Enterprise)',
    pin: '2026',
    password: '',
    avatarBg: 'bg-amber-600',
    status: 'active',
  };

  const pool = Array.isArray(rawUsers) && rawUsers.length > 0 ? rawUsers : [ownerAcc];

  let mdAccount: UserAccount | null = null;
  const accountsMap = new Map<string, UserAccount>();

  for (const u of pool) {
    if (!u) continue;
    const lowerUser = (u.username || '').toLowerCase().trim();
    const rawName = (u.displayName || (u as any).name || '').trim();
    const cleanName = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawName;

    // Skip blank, mock demo, or test accounts
    if (!lowerUser && !rawName) continue;
    if (isDummyOrInvalidStaff(rawName) || isDummyOrInvalidStaff(lowerUser)) continue;
    if (lowerUser === 'test' || lowerUser === 'test user' || rawName === 'Test User') continue;

    // Check Managing Director account
    if (
      lowerUser === 'sumyatwin.sktg@gmail.com' ||
      lowerUser === 'wahwahlwin.1990@gmail.com' ||
      (u.role as string) === 'Managing Director' ||
      u.role === 'MD' ||
      u.id === 'usr-owner'
    ) {
      mdAccount = {
        ...u,
        id: 'usr-owner',
        username: 'sumyatwin.sktg@gmail.com',
        displayName: 'Daw Su Myat Win',
        role: 'MD',
        title: 'Managing Director (MD)',
        branchId: 'ALL',
        branchName: 'All Branches (Enterprise)',
        pin: u.pin ? String(u.pin) : '2026',
        password: u.password ? String(u.password) : '',
        avatarBg: u.avatarBg || 'bg-amber-600',
        status: u.status === 'inactive' ? 'inactive' : 'active',
      };
      continue;
    }

    const trimmedCode = (u.employeeCode || '').trim().toUpperCase();
    const userSlug = lowerUser.split('@')[0].replace(/[^a-z0-9]/g, '');
    const nameSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseNameSlug = cleanName.replace(/^(ko|maung|ma|daw|mg)\s+/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');

    // Match against canonical staff list (31 staff members)
    const canonicalStaff = RAW_STAFF_LIST.find((s) => {
      const sCode = s.code.toUpperCase();
      const sNameSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sBaseSlug = s.name.replace(/^(ko|maung|ma|daw|mg)\s+/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sUserSlug = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        (trimmedCode && sCode === trimmedCode) ||
        (userSlug && (sUserSlug === userSlug || userSlug === sCode.toLowerCase())) ||
        (nameSlug && (sNameSlug === nameSlug || sBaseSlug === baseNameSlug)) ||
        u.id === `usr-${sCode.toLowerCase()}` ||
        u.id === `emp-${sCode.toLowerCase()}`
      );
    });

    // Skip raw placeholder/timestamp IDs
    if (!canonicalStaff && (userSlug.startsWith('usr') || userSlug.startsWith('emp') || /^usr\d+/i.test(userSlug))) {
      continue;
    }

    // Determine unique identity key per individual
    let key: string;
    if (canonicalStaff) {
      key = `person-${canonicalStaff.code.toUpperCase()}`;
    } else if (trimmedCode && /^EC\d+$/i.test(trimmedCode)) {
      key = `person-${trimmedCode}`;
    } else if (userSlug) {
      key = `user-${userSlug}`;
    } else if (u.id) {
      key = `id-${u.id}`;
    } else {
      key = `name-${nameSlug}`;
    }

    const existing = accountsMap.get(key);

    const isYamin = (canonicalStaff && canonicalStaff.code === 'EC010') || lowerUser.includes('yaminnwe') || cleanName.toLowerCase().includes('yamin');

    // Preserve the user's authentic displayName
    const resolvedDisplayName =
      (cleanName && !cleanName.toLowerCase().startsWith('usr-17') && cleanName !== u.id && cleanName !== 'Staff' && cleanName !== 'Staff User')
        ? cleanName
        : canonicalStaff?.name
        ? canonicalStaff.name
        : existing?.displayName || 'Staff User';

    const resolvedCode = canonicalStaff?.code || trimmedCode || existing?.employeeCode;
    const resolvedId = canonicalStaff
      ? `usr-${canonicalStaff.code.toLowerCase()}`
      : u.id || existing?.id || `usr-${Date.now()}`;
    const resolvedEmpId = canonicalStaff
      ? `emp-${canonicalStaff.code.toLowerCase()}`
      : u.employeeId || existing?.employeeId;

    // Respect each account's actual username/email
    const resolvedUsername =
      (u.username && u.username.trim() && u.username.trim() !== 'usr' && !u.username.trim().startsWith('usr-17'))
        ? u.username.trim()
        : (existing?.username && existing.username.trim())
        ? existing.username.trim()
        : canonicalStaff
        ? `${canonicalStaff.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sktg.com`
        : `${userSlug || nameSlug || 'staff'}@sktg.com`;

    const finalRole: UserRole = isYamin
      ? 'Operation'
      : normalizeUserRole(u.role || existing?.role || canonicalStaff?.role || 'Staff');

    const mergedAccount: UserAccount = {
      ...(existing || {}),
      ...u,
      id: resolvedId,
      displayName: isYamin
        ? (cleanName && cleanName.toLowerCase().includes('yamin') ? cleanName : 'Yamin Nwe (Finance & Policy)')
        : resolvedDisplayName,
      username: isYamin
        ? (u.username && u.username.trim() ? u.username.trim() : 'yaminnwe@sktg.com')
        : resolvedUsername,
      employeeCode: resolvedCode ? resolvedCode.toUpperCase() : undefined,
      employeeId: resolvedEmpId,
      role: finalRole,
      title: isYamin
        ? 'Finance & Policy'
        : (u.title || existing?.title || canonicalStaff?.position || finalRole),
      branchId: (finalRole === 'MD')
        ? 'ALL'
        : (isYamin ? 'branch-1' : (u.branchId || existing?.branchId || canonicalStaff?.branchId || 'branch-1')),
      branchName: (finalRole === 'MD')
        ? 'All Branches (Enterprise)'
        : (isYamin ? 'Shwe Kyal Tagon (Shop 1)' : (u.branchName || existing?.branchName || canonicalStaff?.branchName || 'Shwe Kyal Tagon (Shop 1)')),
      status: u.status === 'inactive' ? 'inactive' : 'active',
      pin: u.pin ? String(u.pin) : (existing?.pin ? String(existing.pin) : '1234'),
      password: u.password ? String(u.password) : (existing?.password ? String(existing.password) : ''),
      avatarBg: u.avatarBg || existing?.avatarBg || (isYamin ? 'bg-cyan-600' : 'bg-purple-600'),
    };

    accountsMap.set(key, mergedAccount);
  }

  if (!mdAccount) {
    mdAccount = ownerAcc;
  }

  // Sort staff accounts by employeeCode numerically (EC001, EC002, ...)
  const sortedStaff = Array.from(accountsMap.values())
    .filter((a) => a.username !== mdAccount!.username)
    .sort((a, b) => {
      const matchA = (a.employeeCode || '').match(/(\d+)/);
      const matchB = (b.employeeCode || '').match(/(\d+)/);
      const numA = matchA ? parseInt(matchA[1], 10) : 99999;
      const numB = matchB ? parseInt(matchB[1], 10) : 99999;
      if (numA !== numB) return numA - numB;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

  return [mdAccount, ...sortedStaff];
}

/**
 * Deduplicates employees so that:
 * 1. Legacy mock/dummy staff are permanently removed.
 * 2. Duplicate employees with the same Ecode or name are cleanly merged into 1.
 * 3. All 31 canonical employees (EC001 - EC031) are guaranteed to be present and never disappear.
 * 4. Preserves legitimate custom edits to name, position, salary, phone, tenure, sales target, etc.
 * 5. Orders all employees by Employee Code in ascending numerical order (EC001, EC002, EC003, ...).
 */
export function deduplicateEmployees(rawEmployees: Employee[]): Employee[] {
  // 1. Initialize map pre-populated with all 31 canonical staff members
  const canonMap = new Map<string, Employee>();
  for (const defEmp of SKTG_EMPLOYEES) {
    canonMap.set(`canon-${defEmp.code.toUpperCase()}`, { ...defEmp });
  }

  const customMap = new Map<string, Employee>();

  if (Array.isArray(rawEmployees) && rawEmployees.length > 0) {
    for (const emp of rawEmployees) {
      if (!emp || !emp.name) continue;
      if (isDummyOrInvalidStaff(emp.name)) continue;

      const trimmedCode = (emp.code || '').trim().toUpperCase();
      const rawName = emp.name.trim();
      const cleanName = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim() || rawName;
      const nameKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const baseNameKey = cleanName.replace(/^(ko|maung|ma|daw|mg)\s+/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Match against RAW_STAFF_LIST (31 canonical staff)
      const canonicalStaff = RAW_STAFF_LIST.find((s) => {
        const sCode = s.code.toUpperCase();
        const sNameKey = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const sBaseKey = s.name.replace(/^(ko|maung|ma|daw|mg)\s+/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          (nameKey && (sNameKey === nameKey || sBaseKey === baseNameKey)) ||
          emp.id === `emp-${sCode.toLowerCase()}` ||
          emp.id === `usr-${sCode.toLowerCase()}` ||
          (trimmedCode && sCode === trimmedCode && (sNameKey === nameKey || sBaseKey === baseNameKey || !nameKey))
        );
      });

      if (canonicalStaff) {
        const key = `canon-${canonicalStaff.code.toUpperCase()}`;
        const existing = canonMap.get(key)!;
        const branchRes = normalizeEmployeeBranch(
          emp.branchId,
          emp.branchName,
          canonicalStaff.code
        );

        canonMap.set(key, {
          ...existing,
          id: existing.id || `emp-${canonicalStaff.code.toLowerCase()}`,
          code: canonicalStaff.code,
          name: canonicalStaff.name,
          position: emp.position || existing.position || canonicalStaff.position,
          department: emp.department || existing.department || canonicalStaff.dept,
          branchId: branchRes.branchId,
          branchName: branchRes.branchName,
          phone: emp.phone || existing.phone || canonicalStaff.phone,
          joinedDate: emp.joinedDate || existing.joinedDate || canonicalStaff.joinedDate,
          tenure: (emp.tenure && emp.tenure !== '1 year') ? emp.tenure : existing.tenure || canonicalStaff.tenure,
          baseSalary: Number(emp.baseSalary) > 0 ? Number(emp.baseSalary) : (Number(existing.baseSalary) || 0),
          phoneTargetUnits: emp.phoneTargetUnits !== undefined ? Number(emp.phoneTargetUnits) : existing.phoneTargetUnits,
          laptopTargetUnits: emp.laptopTargetUnits !== undefined ? Number(emp.laptopTargetUnits) : existing.laptopTargetUnits,
          salesTargetUnits: emp.salesTargetUnits !== undefined ? Number(emp.salesTargetUnits) : existing.salesTargetUnits,
          salesTarget: Number(emp.salesTarget) > 0 ? Number(emp.salesTarget) : (Number(existing.salesTarget) || 0),
          kpiScore: emp.kpiScore !== undefined ? Number(emp.kpiScore) : (existing.kpiScore || 100),
          performancePoints: emp.performancePoints !== undefined ? Number(emp.performancePoints) : (existing.performancePoints || 10),
          status: emp.status === 'leave' || emp.status === 'resigned' ? emp.status : 'active',
          userAccountId: emp.userAccountId || existing.userAccountId,
          username: emp.username || existing.username,
        });
      } else {
        // Additional custom staff member
        const customKey = emp.id || (trimmedCode ? `code-${trimmedCode}` : `custom-${nameKey}`);
        if (!customMap.has(customKey)) {
          const customBranch = normalizeEmployeeBranch(emp.branchId, emp.branchName, trimmedCode);
          customMap.set(customKey, {
            ...emp,
            branchId: customBranch.branchId,
            branchName: customBranch.branchName,
            baseSalary: Number(emp.baseSalary) || 0,
            status: emp.status || 'active',
          });
        }
      }
    }
  }

  const allEmployees = [...Array.from(canonMap.values()), ...Array.from(customMap.values())];

  // Sort by Employee Code in ascending numerical order (EC001, EC002, EC003, ..., EC031)
  return allEmployees.sort((a, b) => {
    const matchA = (a.code || '').match(/(\d+)/);
    const matchB = (b.code || '').match(/(\d+)/);
    const numA = matchA ? parseInt(matchA[1], 10) : 99999;
    const numB = matchB ? parseInt(matchB[1], 10) : 99999;
    if (numA !== numB) return numA - numB;
    return (a.code || '').localeCompare(b.code || '');
  });
}

/**
 * Resequences employees while strictly keeping canonical staff (EC001 to EC031)
 * mapped to their canonical sequence and assigning subsequent codes to custom staff.
 */
export function resequenceAllEmployees(currentEmployees: Employee[]): {
  employees: Employee[];
  idMap: Record<string, string>;
  codeMap: Record<string, string>;
} {
  const idMap: Record<string, string> = {};
  const codeMap: Record<string, string> = {};

  const deduped = deduplicateEmployees(currentEmployees);

  return {
    employees: deduped,
    idMap,
    codeMap,
  };
}

/**
 * Normalizes staff name by removing honorifics (Ko, Ma, Daw, U), parentheses, and whitespace.
 */
export function normalizeStaffNameKey(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/^(ko|ma|daw|u)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Robust matcher checking if a SalaryRecord belongs to an Employee.
 */
export function matchSalaryRecordWithEmployee(
  record: SalaryRecord | null | undefined,
  employee: Employee | null | undefined
): boolean {
  if (!record || !employee) return false;

  // 1. Direct ID match
  if (record.employeeId && (record.employeeId === employee.id || record.employeeId === employee.userAccountId)) {
    return true;
  }

  // 2. Employee Code match (e.g. EC001, EC031)
  const empCode = (employee.code || '').trim().toUpperCase();
  const recCode = (record.employeeCode || '').trim().toUpperCase();
  if (empCode && recCode && empCode === recCode) {
    return true;
  }

  // 3. Normalized ID patterns (emp-ec031, usr-ec031, ec031)
  if (empCode && record.employeeId) {
    const recIdLower = record.employeeId.toLowerCase().trim();
    const codeLower = empCode.toLowerCase();
    if (
      recIdLower === codeLower ||
      recIdLower === `emp-${codeLower}` ||
      recIdLower === `usr-${codeLower}` ||
      recIdLower.replace(/[^a-z0-9]/g, '') === codeLower
    ) {
      return true;
    }
  }

  // 4. Normalized Name match (handling 'Thet Paing Oo' vs 'Ko Thet Paing Oo')
  const cleanEmpName = normalizeStaffNameKey(employee.name);
  const cleanRecName = normalizeStaffNameKey(record.employeeName);
  if (cleanEmpName && cleanRecName && cleanEmpName === cleanRecName) {
    return true;
  }

  return false;
}

/**
 * Finds the salary record for an employee for a specific month (or any month if month is 'ALL').
 */
export function findSalaryRecordForEmployee(
  records: SalaryRecord[],
  employee: Employee,
  targetMonth?: string
): SalaryRecord | undefined {
  if (!Array.isArray(records) || records.length === 0 || !employee) return undefined;

  return records.find((r) => {
    if (!r) return false;
    const matchesMonth = !targetMonth || targetMonth === 'ALL' || r.month === targetMonth;
    if (!matchesMonth) return false;
    return matchSalaryRecordWithEmployee(r, employee);
  });
}

/**
 * Sanitizes and deduplicates salary records against active employees:
 * 1. Synchronizes employeeId, employeeCode, employeeName, branchId, branchName, department.
 * 2. Purges orphan/ghost records that don't match any real employee.
 * 3. Enforces strictly at most 1 record per employee per month (no duplicates).
 */
export function sanitizeSalaryRecords(
  rawRecords: SalaryRecord[],
  activeEmployees: Employee[]
): SalaryRecord[] {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];
  const empPool = Array.isArray(activeEmployees) && activeEmployees.length > 0 ? activeEmployees : SKTG_EMPLOYEES;

  const dedupedMap = new Map<string, SalaryRecord>();

  for (const rec of rawRecords) {
    if (!rec) continue;

    // Find matching employee
    const matchedEmp = empPool.find((emp) => matchSalaryRecordWithEmployee(rec, emp));
    if (!matchedEmp) {
      // Discard records that do not match any active employee (e.g. ghost/test entries)
      continue;
    }

    const validMonth = (!rec.month || rec.month === 'ALL') ? '2026-09' : rec.month;
    const uniqueKey = `${matchedEmp.id}_${validMonth}`;

    const normalizedRecord: SalaryRecord = {
      ...rec,
      id: rec.id || `sal-${matchedEmp.code.toLowerCase()}-${validMonth}`,
      employeeId: matchedEmp.id,
      employeeCode: matchedEmp.code,
      employeeName: matchedEmp.name,
      position: matchedEmp.position,
      department: matchedEmp.department,
      branchId: matchedEmp.branchId,
      branchName: matchedEmp.branchName,
      month: validMonth,
      basicSalary: Number(rec.basicSalary ?? matchedEmp.baseSalary ?? 0),
      tenure: rec.tenure || matchedEmp.tenure || '1 Year',
    };

    if (dedupedMap.has(uniqueKey)) {
      const existing = dedupedMap.get(uniqueKey)!;
      // If duplicate exists, keep the one with higher netSalary or more recent edit
      if ((normalizedRecord.netSalary ?? 0) >= (existing.netSalary ?? 0)) {
        dedupedMap.set(uniqueKey, normalizedRecord);
      }
    } else {
      dedupedMap.set(uniqueKey, normalizedRecord);
    }
  }

  return Array.from(dedupedMap.values());
}

