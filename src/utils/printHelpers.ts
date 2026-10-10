import { SalaryRecord } from '../types';
import { formatMMK, getMonthName, formatDateDMY } from './formatters';
import { formatTenureDisplay } from './tenureHelpers';

export function generateBatchPayslipsHTML(
  records: SalaryRecord[] | SalaryRecord | any,
  selectedMonth: string,
  employees?: any[]
): string {
  // Strict normalization: safely handle single object, array, or null/undefined
  const safeRecords: SalaryRecord[] = (() => {
    if (!records) return [];
    if (Array.isArray(records)) return records.filter(Boolean);
    if (typeof records === 'object') return [records as SalaryRecord];
    return [];
  })();

  if (safeRecords.length === 0) {
    return '';
  }

  const cards = safeRecords.map((record) => {
    const earningsRows: string[] = [];
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 700; color: #1e293b; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Basic Pay</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; color: #020617; font-size: 10px; vertical-align: middle; height: 0.6cm;">${formatMMK(record.basicSalary)}</td>
      </tr>
    `);

    const serviceAllowanceVal = record.serviceAllowance ?? 0;
    const serviceAllowanceColor = serviceAllowanceVal > 0 ? '#854d0e' : '#94a3b8';
    const serviceAllowanceBg = serviceAllowanceVal > 0 ? 'background-color: #fefce8;' : '';
    const serviceAllowanceText = serviceAllowanceVal > 0 ? `+${formatMMK(serviceAllowanceVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; ${serviceAllowanceBg} box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Service Allowance</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${serviceAllowanceColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${serviceAllowanceText}</td>
      </tr>
    `);

    const dutyAllowanceVal = record.dutyAllowance ?? 0;
    const dutyAllowanceColor = dutyAllowanceVal > 0 ? '#1e40af' : '#94a3b8';
    const dutyAllowanceBg = dutyAllowanceVal > 0 ? 'background-color: #eff6ff;' : '';
    const dutyAllowanceText = dutyAllowanceVal > 0 ? `+${formatMMK(dutyAllowanceVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; ${dutyAllowanceBg} box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Duty Allowance</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${dutyAllowanceColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${dutyAllowanceText}</td>
      </tr>
    `);

    const attendanceBonusVal = record.attendanceBonus ?? 0;
    const attendanceBonusColor = attendanceBonusVal > 0 ? '#047857' : '#94a3b8';
    const attendanceBonusText = attendanceBonusVal > 0 ? `+${formatMMK(attendanceBonusVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Attendance Bonus</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${attendanceBonusColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${attendanceBonusText}</td>
      </tr>
    `);

    const bonusVal = (record as any).bonus ?? record.performanceBonus ?? 0;
    const bonusColor = bonusVal > 0 ? '#047857' : '#94a3b8';
    const bonusText = bonusVal > 0 ? `+${formatMMK(bonusVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Bonus</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${bonusColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${bonusText}</td>
      </tr>
    `);

    const commissionVal = record.salesCommission ?? 0;
    const commissionColor = commissionVal > 0 ? '#047857' : '#94a3b8';
    const commissionText = commissionVal > 0 ? `+${formatMMK(commissionVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Sales Commission</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${commissionColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${commissionText}</td>
      </tr>
    `);

    const mealVal = record.mealAllowance ?? 0;
    const mealColor = mealVal > 0 ? '#047857' : '#94a3b8';
    const mealText = mealVal > 0 ? `+${formatMMK(mealVal)}` : '0 MMK';
    earningsRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Meal Allowance</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${mealColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${mealText}</td>
      </tr>
    `);

    // Deductions Section
    const deductionRows: string[] = [];

    // 1. Late Deduct
    const lateVal = record.lateDeduct ?? (record.deductionPenalty ?? 0);
    const lateText = lateVal > 0 ? `-${formatMMK(lateVal)}` : '0 MMK';
    const lateColor = lateVal > 0 ? '#be123c' : '#94a3b8';
    const lateCountLabel = (record.lateCount && record.lateCount > 0) ? ` <span style="font-size: 8px; color: #64748b;">(${record.lateCount} times)</span>` : '';
    deductionRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Late Deduct${lateCountLabel}</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${lateColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${lateText}</td>
      </tr>
    `);

    // 2. Absent Deduct (Unified Absent & Unpaid Leave)
    const absentVal = record.absentDeduct ?? 0;
    const absentText = absentVal > 0 ? `-${formatMMK(absentVal)}` : '0 MMK';
    const absentColor = absentVal > 0 ? '#be123c' : '#94a3b8';
    const absentDaysLabel = (record.absentDays && record.absentDays > 0) ? ` <span style="font-size: 8px; color: #64748b;">(${record.absentDays} days)</span>` : '';
    deductionRows.push(`
      <tr style="height: 0.6cm; max-height: 0.6cm; border-bottom: 1px solid #f1f5f9; box-sizing: border-box;">
        <td style="padding: 0 10px; font-weight: 600; color: #334155; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">Absent Deduct${absentDaysLabel}</td>
        <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; color: ${absentColor}; font-size: 9.5px; vertical-align: middle; height: 0.6cm;">${absentText}</td>
      </tr>
    `);

    return `
      <div class="payslip-card">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 2px;">
          <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.05em; color: #020617; text-transform: uppercase; line-height: 1.1;">
            SHWE KYAL TAGON
          </h1>
          <h2 style="margin: 1px 0 0 0; font-size: 9px; font-weight: 800; color: #78350f; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.1;">
            SALARY SLIP (${getMonthName(record.month)})
          </h2>
        </div>

        <div style="border-bottom: 1.5px solid #0f172a; margin-bottom: 3px;"></div>

        <!-- Employee Info Box -->
        <div style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; margin-bottom: 5px; display: grid; grid-template-columns: 1.5fr 1.5fr 2fr 1fr 1.5fr; column-gap: 12px; align-items: start; box-sizing: border-box;">
          <div style="display: flex; flex-direction: column; justify-content: flex-start;">
            <span style="display: block; font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; line-height: 1; letter-spacing: 0.04em;">Name:</span>
            <span style="font-size: 9.5px; font-weight: 800; color: #020617; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.2; margin-top: 2px;">${record.employeeName}</span>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: flex-start;">
            <span style="display: block; font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; line-height: 1; letter-spacing: 0.04em;">Position:</span>
            <span style="font-size: 8.5px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.2; margin-top: 2px;">${record.position}</span>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: flex-start;">
            <span style="display: block; font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; line-height: 1; letter-spacing: 0.04em;">Department:</span>
            <span style="font-size: 8.5px; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; line-height: 1.2; margin-top: 2px;">${record.department}</span>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: flex-start;">
            <span style="display: block; font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; line-height: 1; letter-spacing: 0.04em;">Tenure:</span>
            <div style="display: flex; align-items: center; margin-top: 2px;">
              <span style="display: inline-block; background-color: #f3e8ff; color: #581c87; font-size: 7.5px; font-weight: 800; padding: 1px 4px; border-radius: 3px; line-height: 1;">${formatTenureDisplay(record, record.joinedDate, record.month, employees)}</span>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: flex-start;">
            <span style="display: block; font-size: 7px; color: #64748b; font-weight: 700; text-transform: uppercase; line-height: 1; letter-spacing: 0.04em;">Worked Days:</span>
            <span style="font-size: 8.5px; font-weight: 700; color: #1e293b; display: block; line-height: 1.2; white-space: nowrap; margin-top: 2px;">${record.actualDaysWorked} / ${record.workingDaysStandard} Days</span>
          </div>
        </div>

        <!-- Contiguous Standard Accounting Table (Total Attached Directly Below Deductions) -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 5px; overflow: hidden; box-sizing: border-box;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed;">
            <tbody>
              ${earningsRows.join('')}
              <tr style="height: 0.6cm; max-height: 0.6cm; background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; box-sizing: border-box;">
                <td colspan="2" style="padding: 0 10px; font-weight: 800; color: #1e293b; font-size: 8px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; height: 0.6cm;">
                  DEDUCTIONS
                </td>
              </tr>
              ${deductionRows.join('')}
              <tr style="height: 0.65cm; max-height: 0.65cm; background-color: #fefce8; border-top: 1.5px solid #0f172a; box-sizing: border-box;">
                <td style="padding: 0 10px; font-weight: 900; color: #451a03; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; height: 0.65cm;">
                  TOTAL SALARY
                </td>
                <td style="padding: 0 10px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 900; color: #451a03; vertical-align: middle; height: 0.65cm;">
                  ${formatMMK(record.netSalary)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  // Group cards into pairs of 2 per A5 sheet (handles single payslip safely)
  const sheets: string[] = [];
  if (cards.length === 1) {
    sheets.push(`
      <div class="a5-sheet single-slip">
        ${cards[0]}
      </div>
    `);
  } else {
    for (let i = 0; i < cards.length; i += 2) {
      const card1 = cards[i];
      const card2 = cards[i + 1];

      if (card2) {
        sheets.push(`
          <div class="a5-sheet">
            ${card1}
            <div class="cut-line">
              <span class="cut-badge">✂ Cut Here</span>
            </div>
            ${card2}
          </div>
        `);
      } else {
        sheets.push(`
          <div class="a5-sheet single-slip">
            ${card1}
          </div>
        `);
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff_Payslips_${selectedMonth}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A5 portrait;
      margin: 3.5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      color: #0f172a;
    }
    body {
      margin: 0;
      padding: 3.5mm;
    }
    .a5-sheet {
      width: 100%;
      max-width: 141mm;
      max-height: 202mm;
      margin: 0 auto 10px auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      page-break-after: always;
      break-after: page;
      padding: 0;
      overflow: hidden;
    }
    .a5-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    .payslip-card {
      width: 100%;
      height: auto;
      background: #ffffff;
      border: 1.5px solid #1e293b;
      border-radius: 5px;
      padding: 4px 8px 5px 8px;
      box-sizing: border-box;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .cut-line {
      width: 100%;
      border-top: 1px dashed #94a3b8;
      margin: 4px 0;
      text-align: center;
      box-sizing: border-box;
    }
    .cut-badge {
      position: relative;
      top: -7px;
      background: #ffffff;
      padding: 0 6px;
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
    }
    @media print {
      html, body {
        background: transparent !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .a5-sheet {
        margin: 0 auto !important;
        max-width: 100% !important;
        max-height: 202mm !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .payslip-card {
        box-shadow: none !important;
        border: 1.5px solid #1e293b !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar" style="background: #0f172a; color: #ffffff; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; max-width: 138mm; margin-left: auto; margin-right: auto;">
    <div>
      <h3 style="margin: 0; font-size: 13px; color: #f59e0b;">Staff Salary Slips (${records.length})</h3>
      <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">A5 Portrait (2 Slips per Sheet) • ${getMonthName(selectedMonth)}</p>
    </div>
    <button onclick="window.print()" style="background: #f59e0b; color: #020617; font-weight: 800; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="slips-container">
    ${sheets.join('')}
  </div>

  <script>
    function triggerPrint() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() {
            window.print();
          }, 350);
        });
      } else {
        setTimeout(function() {
          window.print();
        }, 800);
      }
    }
    if (document.readyState === 'complete') {
      triggerPrint();
    } else {
      window.addEventListener('load', triggerPrint);
    }
  </script>
</body>
</html>`;
}

/**
 * Direct Iframe Print Engine:
 * Renders print HTML into an offscreen iframe and triggers the native browser print dialog,
 * avoiding popup blockers, new blank tabs, or annoying unwanted file downloads in all environments.
 */
export function printHtmlDirectly(htmlContent: string): void {
  try {
    const existing = document.getElementById('sktg-direct-print-iframe');
    if (existing) {
      existing.remove();
    }
    const iframe = document.createElement('iframe');
    iframe.id = 'sktg-direct-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      const trigger = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      };

      if (iframe.contentWindow && 'fonts' in doc && (doc as any).fonts?.ready) {
        (doc as any).fonts.ready.then(() => {
          setTimeout(trigger, 300);
        });
      } else {
        setTimeout(trigger, 450);
      }
      return;
    }
  } catch (err) {
    console.warn('Direct iframe print encountered exception:', err);
  }
  // Fallback to top window print
  window.print();
}

/**
 * Robust Trigger to Print or Download Payslips PDF/HTML
 */
export function printOrSavePayslips(
  records: SalaryRecord[] | SalaryRecord | any,
  selectedMonth: string,
  employees?: any[]
) {
  const safeRecords = Array.isArray(records)
    ? records.filter(Boolean)
    : (records && typeof records === 'object' ? [records] : []);
  if (safeRecords.length === 0) return;

  const html = generateBatchPayslipsHTML(safeRecords, selectedMonth, employees);
  printHtmlDirectly(html);
}

export function generateBatchBonusSlipsHTML(
  slips: any,
  periodLabel: string
): string {
  const safeSlips = Array.isArray(slips)
    ? slips.filter(Boolean)
    : (slips && typeof slips === 'object' ? [slips] : []);
  if (safeSlips.length === 0) return '';
  const cards = safeSlips.map((slip) => {
    return `
      <div class="bonus-card">
        <!-- Header -->
        <div style="border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 4px; text-align: center;">
          <h1 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 0.05em; color: #020617; text-transform: uppercase;">
            SHWE KYAL TAGON
          </h1>
          <h2 style="margin: 1px 0 0 0; font-size: 9.5px; font-weight: 700; color: #78350f; text-transform: uppercase; letter-spacing: 0.04em;">
            PERFORMANCE BONUS SLIP
          </h2>
        </div>

        <!-- Info Grid -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; margin-bottom: 4px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; font-size: 8.5px;">
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Name:</span>
            <span style="font-size: 10px; font-weight: 700; color: #020617;">${slip.employee?.name || 'Staff'}</span>
          </div>
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Position:</span>
            <span style="font-weight: 600; color: #1e293b;">${slip.employee?.position || 'Staff'}</span>
          </div>
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Branch:</span>
            <span style="font-weight: 600; color: #7e22ce;">${slip.branchName}</span>
          </div>
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Department:</span>
            <span style="font-weight: 500; color: #334155;">${slip.employee?.department || 'General'}</span>
          </div>
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Period:</span>
            <span style="font-weight: 700; color: #0f172a;">${slip.periodLabel || periodLabel}</span>
          </div>
          <div>
            <span style="display: block; font-size: 7.5px; color: #64748b; font-weight: 600;">Date:</span>
            <span style="font-weight: 500; color: #1e293b; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${formatDateDMY(slip.date || new Date().toISOString().split('T')[0])}</span>
          </div>
        </div>

        <!-- Metrics Table -->
        <div style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; font-size: 9px; margin-bottom: 0;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tbody>
              <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                <td colspan="2" style="padding: 3px 8px; font-weight: 700; color: #1e293b; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.05em;">
                  EVALUATION METRICS
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                <td style="padding: 4px 8px; font-weight: 600; color: #334155;">Target Met Rate (%)</td>
                <td style="padding: 4px 8px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; color: #78350f;">${slip.isManager ? '100.0% (Operation Scope)' : ((slip.achievementRate || 0).toFixed(1) + '%')}</td>
              </tr>
              <tr style="background-color: #fffbeb; border-top: 1.5px solid #0f172a;">
                <td style="padding: 5px 8px; font-weight: 900; color: #451a03; font-size: 10px; text-transform: uppercase;">
                  BONUS AMOUNT
                </td>
                <td style="padding: 5px 8px; text-align: right; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 900; color: #451a03;">
                  ${formatMMK(slip.bonusAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  // Group bonus cards into sets of 4 per A5 sheet (2x2 grid)
  const sheets: string[] = [];
  for (let i = 0; i < cards.length; i += 4) {
    const chunk = cards.slice(i, i + 4);
    sheets.push(`
      <div class="a5-sheet">
        ${chunk.map((card, idx) => `
          <div class="bonus-card-cell">
            ${card}
          </div>
          ${(idx % 2 === 0 && idx === chunk.length - 2) ? '<div class="grid-divider-h"></div>' : ''}
        `).join('')}
      </div>
    `);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff_Bonus_Slips_${periodLabel}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A5 portrait;
      margin: 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #0f172a;
    }
    body {
      padding: 2mm;
    }
    .a5-sheet {
      width: 100%;
      max-width: 142mm;
      min-height: 204mm;
      max-height: 208mm;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 3mm;
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
      padding: 2mm;
      align-content: space-between;
    }
    .a5-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .bonus-card-cell {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .bonus-card {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border: 1px solid #1e293b;
      border-radius: 4px;
      padding: 4px 6px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .cut-line {
      border-top: 1px dashed #94a3b8;
      margin: 2mm 0;
      position: relative;
      text-align: center;
      height: 0;
    }
    .cut-badge {
      position: absolute;
      top: -7px;
      right: 12px;
      background: #ffffff;
      padding: 0 5px;
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .no-print-bar {
        display: none !important;
      }
      .a5-sheet {
        margin: 0 auto;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar" style="background: #0f172a; color: #ffffff; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; max-width: 138mm; margin-left: auto; margin-right: auto;">
    <div>
      <h3 style="margin: 0; font-size: 13px; color: #f59e0b;">Staff Bonus Slips (${slips.length})</h3>
      <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">A5 Portrait (2 Slips per Sheet) • ${periodLabel}</p>
    </div>
    <button onclick="window.print()" style="background: #f59e0b; color: #020617; font-weight: 800; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="slips-container">
    ${sheets.join('')}
  </div>

  <script>
    function triggerPrint() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() {
            window.print();
          }, 350);
        });
      } else {
        setTimeout(function() {
          window.print();
        }, 800);
      }
    }
    if (document.readyState === 'complete') {
      triggerPrint();
    } else {
      window.addEventListener('load', triggerPrint);
    }
  </script>
</body>
</html>`;
}

export function printOrSaveBonusSlips(slips: any[], periodLabel: string) {
  const html = generateBatchBonusSlipsHTML(slips, periodLabel);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Staff_Bonus_Slips_${periodLabel}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}



