import { SKTG_EMPLOYEES } from '../data/shweKyalTagonStaffData';

/**
 * Tenure & Service Allowance calculation helpers for Shwe Kyal Tagon POS & HR System.
 *
 * Rules:
 * - Service Allowance (လုပ်သက်ဆုကြေး) is 20,000 MMK per completed full year of service (တနှစ်ပြည့်မှ စပေးသည်).
 * - Tenure < 1 year (e.g. 5 months, 11 months): Service allowance = 0 MMK (မရရှိပါ).
 * - Partial months/years are not calculated (တနှစ်မပြည့်ပဲ month နဲ့ပေါ်နေတာတွေ တွက်ပေးစရာမလိုပါ).
 *   E.g. 1 year 7 months -> 1 full year = 20,000 MMK.
 *   E.g. 3 years 11 months -> 3 full years = 60,000 MMK.
 */

export interface TenureDetails {
  completedYears: number; // e.g. 0, 1, 2, 15
  remainingMonths: number; // e.g. 0 to 11
  totalMonths: number;
  tenureString: string; // e.g. "2y 4m", "1y", "8m", "0y 1m"
  tenureMyanmar: string; // e.g. "၂ နှစ် ၄ လ", "၁ နှစ်", "၈ လ"
  serviceAllowance: number; // completedYears >= 1 ? completedYears * 20000 : 0
  isEligible: boolean; // completedYears >= 1
  serviceAllowanceFormatted: string; // e.g. "40,000 Ks" or "မရရှိသေးပါ"
}

/**
 * Dynamic Tenure calculation.
 * Computes exact elapsed time between joinDate and today (or referenceDate).
 * E.g., "1 Year, 2 Months", "2 Years", "5 Months", "< 1 Month".
 * Returns string computed strictly on the fly (never static text).
 */
export function calculateTenure(joinDate?: string | Date, referenceDate?: string | Date): string {
  try {
    if (!joinDate) return '0 Months';
    
    const start = typeof joinDate === 'string' ? new Date(joinDate.trim()) : joinDate;
    if (isNaN(start.getTime())) return '0 Months';

    let ref = new Date();
    if (referenceDate) {
      if (typeof referenceDate === 'string') {
        if (/^\d{4}-\d{2}$/.test(referenceDate.trim())) {
          const [y, m] = referenceDate.trim().split('-').map(Number);
          ref = new Date(y, m, 0, 23, 59, 59);
        } else {
          const parsed = new Date(referenceDate);
          if (!isNaN(parsed.getTime())) ref = parsed;
        }
      } else if (referenceDate instanceof Date && !isNaN(referenceDate.getTime())) {
        ref = referenceDate;
      }
    }

    let years = ref.getFullYear() - start.getFullYear();
    let months = ref.getMonth() - start.getMonth();

    if (months < 0 || (months === 0 && ref.getDate() < start.getDate())) {
      years--;
      months += 12;
    }

    if (years < 0) {
      years = 0;
      months = 0;
    }

    if (years >= 1 && months > 0) {
      return `${years} Year${years > 1 ? 's' : ''}, ${months} Month${months > 1 ? 's' : ''}`;
    } else if (years >= 1) {
      return `${years} Year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} Month${months > 1 ? 's' : ''}`;
    } else {
      return '< 1 Month';
    }
  } catch {
    return '0 Months';
  }
}

/**
 * Parse any tenure representation (joinedDate string or manual tenure string)
 * and calculate completed years, remaining months, and exact service allowance.
 *
 * CANONICAL RULE:
 * `joinedDate` is the primary source of truth.
 * If `joinedDate` is present and valid, tenure & service allowance are strictly calculated from `joinedDate`.
 * `manualTenure` is only used as a fallback if `joinedDate` is missing or invalid.
 */
export function calculateEmployeeTenure(
  joinedDate?: string,
  referenceDate?: string | Date,
  manualTenure?: string
): TenureDetails {
  try {
    let years = 0;
    let months = 0;
    let parsedFromDate = false;

    // 1. PRIMARY SOURCE OF TRUTH: Calculate from joinedDate if present and valid
  if (joinedDate && joinedDate.trim()) {
    let start: Date | null = null;
    const trimmedDate = joinedDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      const [y, m, d] = trimmedDate.split('-').map(Number);
      start = new Date(y, m - 1, d);
    } else if (/^\d{4}-\d{2}$/.test(trimmedDate)) {
      const [y, m] = trimmedDate.split('-').map(Number);
      start = new Date(y, m - 1, 1);
    } else {
      const parsed = new Date(trimmedDate);
      if (!isNaN(parsed.getTime())) start = parsed;
    }

    if (start && !isNaN(start.getTime())) {
      let ref = new Date();
      if (referenceDate) {
        if (typeof referenceDate === 'string') {
          const trimmedRef = referenceDate.trim();
          if (/^\d{4}-\d{2}$/.test(trimmedRef)) {
            const [y, m] = trimmedRef.split('-').map(Number);
            ref = new Date(y, m, 0, 23, 59, 59); // Last day of month
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedRef)) {
            const [y, m, d] = trimmedRef.split('-').map(Number);
            ref = new Date(y, m - 1, d, 23, 59, 59);
          } else {
            const parsedRef = new Date(trimmedRef);
            if (!isNaN(parsedRef.getTime())) {
              ref = parsedRef;
            }
          }
        } else if (referenceDate instanceof Date && !isNaN(referenceDate.getTime())) {
          ref = referenceDate;
        }
      }

      years = ref.getFullYear() - start.getFullYear();
      months = ref.getMonth() - start.getMonth();

      if (ref.getDate() < start.getDate()) {
        months--;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      if (years < 0) {
        years = 0;
        months = 0;
      }

      parsedFromDate = true;
    }
  }

  // 2. FALLBACK ONLY: Parse manual tenure string if joinedDate is missing or unparseable
  if (!parsedFromDate && manualTenure && manualTenure.trim() && manualTenure.trim() !== '0m' && manualTenure.trim() !== '-') {
    const raw = manualTenure.toLowerCase().trim();
    const yMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:y|yr|yrs|year|years|နှစ်)/i);
    const mMatch = raw.match(/(\d+)\s*(?:m|mo|mos|month|months|လ)/i);

    if (yMatch && mMatch) {
      years = Math.floor(parseFloat(yMatch[1]));
      months = parseInt(mMatch[1], 10);
      parsedFromDate = true;
    } else if (yMatch) {
      years = Math.floor(parseFloat(yMatch[1]));
      months = 0;
      parsedFromDate = true;
    } else if (mMatch) {
      years = 0;
      months = parseInt(mMatch[1], 10);
      if (months >= 12) {
        years = Math.floor(months / 12);
        months = months % 12;
      }
      parsedFromDate = true;
    } else {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        years = Math.floor(num);
        months = Math.round((num - years) * 12);
        parsedFromDate = true;
      }
    }
  }

  const completedYears = Math.max(0, Math.floor(years));
  const remainingMonths = Math.max(0, Math.min(11, Math.floor(months)));
  const totalMonths = completedYears * 12 + remainingMonths;

  // Formatting strings
  let tenureString = '';
  if (completedYears > 0 && remainingMonths > 0) {
    tenureString = `${completedYears}y ${remainingMonths}m`;
  } else if (completedYears > 0) {
    tenureString = `${completedYears}y`;
  } else if (remainingMonths > 0) {
    tenureString = `${remainingMonths}m`;
  } else {
    tenureString = '0m';
  }

  let tenureMyanmar = '';
  if (completedYears > 0 && remainingMonths > 0) {
    tenureMyanmar = `${completedYears} နှစ် ${remainingMonths} လ`;
  } else if (completedYears > 0) {
    tenureMyanmar = `${completedYears} နှစ်`;
  } else if (remainingMonths > 0) {
    tenureMyanmar = `${remainingMonths} လ`;
  } else {
    tenureMyanmar = '၁ လအောက်';
  }

  // Service Allowance: ONLY 1+ completed full years qualify (20,000 MMK per completed full year)
  // Under 1 year (< 1 year) = 0 MMK
  const isEligible = completedYears >= 1;
  const serviceAllowance = isEligible ? completedYears * 20000 : 0;
  const serviceAllowanceFormatted = isEligible
    ? `${serviceAllowance.toLocaleString()} Ks`
    : 'မရရှိသေးပါ (<1 yr)';

  return {
    completedYears,
    remainingMonths,
    totalMonths,
    tenureString,
    tenureMyanmar,
    serviceAllowance,
    isEligible,
    serviceAllowanceFormatted,
  };
} catch (err) {
  console.warn('calculateEmployeeTenure error caught gracefully:', err);
  return {
    completedYears: 0,
    remainingMonths: 0,
    totalMonths: 0,
    tenureString: '0m',
    tenureMyanmar: '၁ လအောက်',
    serviceAllowance: 0,
    isEligible: false,
    serviceAllowanceFormatted: 'မရရှိသေးပါ (<1 yr)',
  };
}
}

/**
 * Quick helper returning only the Service Allowance amount in MMK (20,000 MMK / completed year)
 */
export function getServiceAllowanceAmount(
  joinedDate?: string,
  referenceDate?: string | Date,
  manualTenure?: string
): number {
  return calculateEmployeeTenure(joinedDate, referenceDate, manualTenure).serviceAllowance;
}

/**
 * Returns formatted tenure string for badges and table cells (e.g. "1y 8m" or "2y")
 */
export function formatTenureBadge(
  joinedDate?: string,
  referenceDate?: string | Date,
  manualTenure?: string
): string {
  const t = calculateEmployeeTenure(joinedDate, referenceDate, manualTenure);
  return t.tenureString;
}

/**
 * Safely formats and displays employee tenure (both Years and Months e.g. "2y 11m", "4y 8m", "6m")
 * based on the employee's join date, master profile tenure, or salary record data.
 */
export function formatTenureDisplay(
  recordOrTenure: any,
  joinedDate?: string,
  targetMonthOrDate?: string | Date,
  employees?: any[]
): string {
  let recordTenure: any = recordOrTenure;
  let empJoinedDate = joinedDate;
  let refDate = targetMonthOrDate;

  // Use passed employees list if available, or fallback to the canonical staff list
  const staffPool = (Array.isArray(employees) && employees.length > 0)
    ? employees
    : SKTG_EMPLOYEES;

  try {
    if (recordOrTenure && typeof recordOrTenure === 'object' && !('completedYears' in recordOrTenure)) {
      const rec = recordOrTenure;
      recordTenure = rec.tenure;
      empJoinedDate = empJoinedDate || rec.joinedDate;
      refDate = refDate || rec.month;

      // Look up from employee roster
      if (staffPool && Array.isArray(staffPool)) {
        const emp = staffPool.find((e: any) => {
          if (!e) return false;
          if (rec.employeeId && e.id === rec.employeeId) return true;
          const recCodeStr = String(rec.employeeCode || '').trim();
          const empCodeStr = String(e.code || '').trim();
          if (recCodeStr && (empCodeStr === recCodeStr || e.id === `emp-${recCodeStr.toLowerCase()}`)) return true;

          const recNameStr = typeof rec.employeeName === 'string' ? rec.employeeName : String(rec.employeeName || '');
          const empNameStr = typeof e.name === 'string' ? e.name : String(e.name || '');
          if (recNameStr && empNameStr) {
            const normRec = recNameStr.replace(/^(ko|maung|ma|daw|mg|u)\s+/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
            const normEmp = empNameStr.replace(/^(ko|maung|ma|daw|mg|u)\s+/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
            if (normRec && normEmp && (normRec === normEmp || normRec.includes(normEmp) || normEmp.includes(normRec))) {
              return true;
            }
          }
          return false;
        });

        if (emp) {
          empJoinedDate = empJoinedDate || emp.joinedDate;
          if (!recordTenure || recordTenure === '1m' || recordTenure === '0m' || recordTenure === '-' || typeof recordTenure !== 'string') {
            recordTenure = emp.tenure || recordTenure;
          }
        }
      }
    }

  // 1. If joinedDate is available, calculate accurately with both years and months
  if (empJoinedDate && typeof empJoinedDate === 'string' && empJoinedDate.trim()) {
    const calc = calculateEmployeeTenure(empJoinedDate, refDate, recordTenure);
    if (calc && calc.tenureString && calc.tenureString !== '0m') {
      return calc.tenureString;
    }
    const calcNow = calculateEmployeeTenure(empJoinedDate);
    if (calcNow && calcNow.tenureString && calcNow.tenureString !== '0m') {
      return calcNow.tenureString;
    }
  }

  // 2. Infer years from serviceAllowance if present on record (20,000 MMK per completed year)
  if (recordOrTenure && typeof recordOrTenure === 'object' && (recordOrTenure.serviceAllowance || 0) >= 20000) {
    const allowanceYears = Math.floor(recordOrTenure.serviceAllowance / 20000);
    const rawStr = typeof recordTenure === 'string' ? recordTenure : '';
    const mMatch = rawStr.match(/(\d+)\s*(?:m|mo|mos|month|months|လ)/i);
    const months = mMatch ? parseInt(mMatch[1], 10) : 0;
    const yMatch = rawStr.match(/(\d+(?:\.\d+)?)\s*(?:y|yr|yrs|year|years|နှစ်)/i);
    const existingYears = yMatch ? parseInt(yMatch[1], 10) : 0;
    if (existingYears < allowanceYears) {
      return months > 0 ? `${allowanceYears}y ${months}m` : `${allowanceYears}y`;
    }
  }

  // 3. If it's already a computed TenureDetails object
  if (recordTenure && typeof recordTenure === 'object') {
    return recordTenure.tenureString || recordTenure.tenureMyanmar || `${recordTenure.completedYears || 1}y`;
  }

  // 4. If it's a string, parse both years and months cleanly
  if (typeof recordTenure === 'string' && recordTenure.trim()) {
    const trimmed = recordTenure.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const calc = calculateEmployeeTenure(trimmed, refDate);
      if (calc && calc.tenureString) return calc.tenureString;
    }

    const yMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:y|yr|yrs|year|years|နှစ်)/i);
    const mMatch = trimmed.match(/(\d+)\s*(?:m|mo|mos|month|months|လ)/i);

    if (yMatch && mMatch) {
      return `${parseInt(yMatch[1], 10)}y ${parseInt(mMatch[1], 10)}m`;
    }
    if (yMatch) {
      return `${parseInt(yMatch[1], 10)}y`;
    }
    if (mMatch) {
      const mVal = parseInt(mMatch[1], 10);
      if (mVal >= 12) {
        const yVal = Math.floor(mVal / 12);
        const remM = mVal % 12;
        return remM > 0 ? `${yVal}y ${remM}m` : `${yVal}y`;
      }
      return `${mVal}m`;
    }
    return trimmed;
  }

    return '1y';
  } catch (err) {
    console.warn('formatTenureDisplay error caught gracefully:', err);
    return '1y';
  }
}
