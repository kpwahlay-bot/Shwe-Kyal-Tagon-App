import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAvailableStockForBranch } from './inventoryHelper';

export const formatMMK = (amount?: number | string | null): string => {
  if (amount === undefined || amount === null || amount === '') return '0 MMK';
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, ''));
  if (isNaN(num)) return '0 MMK';
  return `${num.toLocaleString('en-US', { maximumFractionDigits: 2 })} MMK`;
};

export const formatCurrency = (amount?: number | string | null): string => {
  return formatMMK(amount);
};

export const cleanSerialDisplay = (str?: string): string => {
  if (!str) return '';
  return str
    .replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '')
    .trim();
};

export const formatNumber = (val?: number | string | null): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const formatWithCommas = (val?: number | string | null): string => {
  return formatNumber(val);
};

/**
 * Formats date string into Day/Month/Year (DD/MM/YYYY)
 */
export const formatDateDMY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD/MM/YYYY
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (parts[2].length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  }
  return dateStr;
};

export const formatDateDDMMYYYY = formatDateDMY;

export const getMonthName = (monthStr?: any): string => {
  if (!monthStr || monthStr === 'ALL') return 'All Months';
  try {
    const str = typeof monthStr === 'string' ? monthStr.trim() : String(monthStr || '').trim();
    if (!str || str === 'ALL') return 'All Months';
    if (!str.includes('-')) return str;
    const [year, month] = str.split('-');
    const monthNames: Record<string, string> = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    };
    if (month && monthNames[month]) {
      return `${monthNames[month]} ${year}`;
    }
    return str;
  } catch {
    return 'All Months';
  }
};

export const getMonthNameMyanmar = (monthStr: string): string => {
  if (!monthStr || monthStr === 'ALL') return 'All Time';
  return getMonthName(monthStr);
};

export const exportSalaryRecordsToCSV = (records: any[], fileName = 'Shwe_Kyal_Tagon_Payroll_Records.csv') => {
  if (!records || records.length === 0) {
    alert('No payroll records available to export.');
    return;
  }

  const headers = [
    'No.',
    'Branch',
    'Month',
    'Staff Name',
    'Position',
    'Department',
    'Days Worked',
    'Absent Days',
    'Base Salary (MMK)',
    'Service Allowance (MMK)',
    'Duty Allowance (MMK)',
    'Attendance Bonus (MMK)',
    'Bonus (MMK)',
    'OT Hours',
    'OT Total (MMK)',
    'Sales Commission (MMK)',
    'Meal Allowance (MMK)',
    'Gross Earnings (MMK)',
    'Late Deduct (MMK)',
    'Absent Deduct (MMK)',
    'Unpaid Leave (MMK)',
    'Total Deductions (MMK)',
    'Net Take-Home Salary (MMK)',
    'Payment Status',
    'Payment Method',
    'Notes'
  ];

  const rows = records.map((r, index) => [
    index + 1,
    `"${r.branchName || ''}"`,
    r.month,
    `"${r.employeeName}"`,
    `"${r.position}"`,
    `"${r.department}"`,
    r.actualDaysWorked,
    r.absentDays ?? 0,
    r.basicSalary,
    r.serviceAllowance ?? 0,
    r.dutyAllowance ?? 0,
    r.attendanceBonus,
    (r as any).bonus ?? r.performanceBonus ?? 0,
    r.otHours,
    r.otTotal,
    r.salesCommission,
    r.mealAllowance,
    r.totalEarnings,
    r.lateDeduct ?? (r.deductionPenalty ?? 0),
    r.absentDeduct ?? 0,
    r.unpaidLeave ?? 0,
    r.totalDeductions,
    r.netSalary,
    r.paymentStatus,
    r.paymentMethod,
    `"${r.notes || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportPayrollToCSV = exportSalaryRecordsToCSV;

export interface SalesStatementExportMetadata {
  branchName?: string;
  periodText?: string;
  dateStr?: string;
  totalCashInflow?: number;
  totalBankInflow?: number;
  totalSalesRevenue?: number;
}

export const exportSalesStatementReportToCSV = (
  sections: Array<{
    id: string;
    title: string;
    categoryKey: string;
    subtitle: string;
    isService: boolean;
    items: any[];
  }>,
  metadata: SalesStatementExportMetadata = {},
  fileName?: string
) => {
  const hasItems = sections.some((s) => s.items && s.items.length > 0);
  if (!hasItems) {
    alert('No sales statement records to export for this selection.');
    return;
  }

  const cleanBranch = (metadata.branchName || 'All_Branches').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = (metadata.dateStr || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportFileName = fileName || `Shwe_Kyal_Tagon_Sales_Statement_Report_${cleanBranch}_${cleanDate}.csv`;

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines: string[] = [];

  // Official Company & Report Title
  lines.push(`${escapeCSV('SHWE KYAL TAGON')},,,,`);
  lines.push(`${escapeCSV('IT & Mobile Center')},,,,`);
  lines.push(`${escapeCSV('Sales Statement Report')},,,,`);
  if (metadata.branchName) {
    lines.push(`${escapeCSV('Branch: ' + metadata.branchName)},,,,`);
  }
  if (metadata.periodText) {
    const pText = metadata.periodText.startsWith('Date:') || metadata.periodText.startsWith('Period:')
      ? metadata.periodText
      : `Period: ${metadata.periodText}`;
    lines.push(`${escapeCSV(pText)},,,,`);
  }
  lines.push(''); // Blank separator

  // Iterate categorized sections
  sections.forEach((sec) => {
    const secQty = sec.items.reduce((acc, s) => acc + (s.quantity || 1), 0);
    const secCash = sec.items.reduce((acc, s) => {
      if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
      if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
      return acc;
    }, 0);
    const secBank = sec.items.reduce((acc, s) => {
      if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
      if (s.paymentMethod !== 'Cash' && !s.paymentMethod?.toLowerCase().includes('split')) return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
      return acc;
    }, 0);
    const secTax = sec.items.reduce((acc, s) => acc + (s.taxAmount || 0), 0);
    const secTotal = sec.items.reduce((acc, s) => acc + (s.salePrice || 0), 0);

    // Distinct invoices in this section
    const distinctInvoices = new Set(sec.items.map((s: any) => (s.parentSale ? s.parentSale.id : s.id) || s.invoiceNo)).size;

    // Section Title Banner
    lines.push(`${escapeCSV(sec.title)},${escapeCSV('(' + sec.subtitle + ')')},,,${escapeCSV(secQty + (sec.isService ? ' Services' : ' Units') + ' (' + distinctInvoices + ' Invoices)')}`);

    // Column Headers
    const headers = [
      'Invoice No',
      'Description',
      'SKU',
      'Qty',
      sec.isService ? 'Technician' : 'Salesperson',
      'Cash (MMK)',
      'Bank (MMK)',
      'Bank Type',
      'Tax (MMK)',
      'Total Amount (MMK)'
    ];
    lines.push(headers.map(escapeCSV).join(','));

    // Item Rows
    if (sec.items.length === 0) {
      lines.push(`${escapeCSV('- No transactions recorded for ' + sec.title + ' on this date -')},,,,,,,,,`);
    } else {
      sec.items.forEach((s) => {
        const total = s.salePrice || 0;
        const paid = s.paidAmount !== undefined ? s.paidAmount : total;
        const isSplit = s.paymentMethod === 'Split (Cash + Bank)' || s.paymentMethod?.toLowerCase().includes('split') || ((s.cashAmount || 0) > 0 && (s.bankAmount || 0) > 0);
        const isCash = s.paymentMethod === 'Cash';
        const cashVal = s.cashAmount !== undefined && s.cashAmount > 0 ? s.cashAmount : (isCash ? paid : 0);
        const bankVal = s.bankAmount !== undefined && s.bankAmount > 0 ? s.bankAmount : (!isCash && !isSplit ? paid : 0);
        const bankTypeStr = s.bankType && s.bankType !== '-' ? s.bankType : (!isCash && !isSplit ? s.paymentMethod : (bankVal > 0 ? 'Bank Transfer' : '-'));
        const staffStr = sec.isService ? (s.technicianName || s.employeeName || '-') : (s.employeeName || '-');

        const cleanName = (s.itemName || '').replace(/\s*\([^)]*\)/g, '').trim();
        let description = s.saleType === 'SERVICE'
          ? (s.itemName.startsWith('Service') ? cleanName : `Service Charges / ${s.deviceModel || cleanName}`)
          : cleanName;
        if (s.deviceSerial) {
          const cleanSer = cleanSerialDisplay(s.deviceSerial);
          if (cleanSer) {
            description += ` [${cleanSer}]`;
          }
        }

        const row = [
          s.invoiceNo || '',
          description,
          s.sku || (sec.isService ? '800600' : '-'),
          s.quantity || 1,
          staffStr,
          cashVal > 0 ? cashVal : 0,
          bankVal > 0 ? bankVal : 0,
          bankTypeStr,
          s.taxAmount || 0,
          total
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    }

    // Subtotal Row
    const subtotalRow = [
      `${sec.title} TOTAL (${secQty} ${sec.isService ? 'Services' : 'Units'} / ${distinctInvoices} Invoices)`,
      '',
      '',
      secQty,
      '',
      secCash,
      secBank,
      '',
      secTax,
      secTotal
    ];
    lines.push(subtotalRow.map(escapeCSV).join(','));
    lines.push(''); // Blank separator row
  });

  // Daily Revenue & Cash Settlement Summary
  lines.push(`${escapeCSV('=============================================')},,,,,,,,,`);
  lines.push(`${escapeCSV('DAILY REVENUE & CASH SETTLEMENT SUMMARY')},,,,,,,,,`);
  lines.push(`${escapeCSV('=============================================')},,,,,,,,,`);

  const grandCash = metadata.totalCashInflow !== undefined
    ? metadata.totalCashInflow
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => {
        if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
        if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0), 0);

  const grandBank = metadata.totalBankInflow !== undefined
    ? metadata.totalBankInflow
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => {
        if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
        if (s.paymentMethod !== 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0), 0);

  const grandTotal = metadata.totalSalesRevenue !== undefined
    ? metadata.totalSalesRevenue
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => acc + (s.salePrice || 0), 0), 0);

  const totalInvoices = sections.reduce((sum, sec) => sum + sec.items.length, 0);
  const totalQty = sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => acc + (s.quantity || 1), 0), 0);

  lines.push([
    'Cash In Drawer (MMK)',
    grandCash,
    'Bank Transfer / Pay (MMK)',
    grandBank,
    'Total Invoices',
    totalInvoices,
    'Total Qty',
    totalQty,
    'GRAND TOTAL REVENUE (MMK)',
    grandTotal
  ].map(escapeCSV).join(','));

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', exportFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSalesStatementReportToPDF = (
  sections: Array<{
    id: string;
    title: string;
    categoryKey: string;
    subtitle: string;
    isService: boolean;
    items: any[];
  }>,
  metadata: SalesStatementExportMetadata = {},
  fileName?: string
) => {
  const hasItems = sections.some((s) => s.items && s.items.length > 0);
  if (!hasItems) {
    alert('No sales statement records to export for this selection.');
    return;
  }

  const cleanBranch = (metadata.branchName || 'All_Branches').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = (metadata.dateStr || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9_-]/g, '_');
  const exportFileName = fileName || `Shwe_Kyal_Tagon_Sales_Statement_${cleanBranch}_${cleanDate}.pdf`;

  // Create PDF document (Portrait A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SHWE KYAL TAGON', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('IT & Mobile Center', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Sales Statement Report', pageWidth / 2, currentY, { align: 'center' });
  
  // Underline under title
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  const titleWidth = doc.getTextWidth('Sales Statement Report');
  doc.line(pageWidth / 2 - titleWidth / 2, currentY + 1, pageWidth / 2 + titleWidth / 2, currentY + 1);
  currentY += 6;

  // Metadata row (Branch, Period, Generated Time)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const branchText = `Branch: ${metadata.branchName || 'All Branches'}`;
  const periodText = metadata.periodText
    ? (metadata.periodText.startsWith('Date:') || metadata.periodText.startsWith('Period:')
        ? metadata.periodText
        : `Period: ${metadata.periodText}`)
    : 'Period: All Historical Records';
  const generatedText = `Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  doc.text(branchText, 14, currentY);
  doc.text(periodText, pageWidth / 2, currentY, { align: 'center' });
  doc.text(generatedText, pageWidth - 14, currentY, { align: 'right' });
  currentY += 4;

  // Separator line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 4;

  // Iterate categorized sections and render autoTable
  sections.forEach((sec) => {
    const secQty = sec.items.reduce((acc, s) => acc + (s.quantity || 1), 0);
    const secCash = sec.items.reduce((acc, s) => {
      if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
      if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
      return acc;
    }, 0);
    const secBank = sec.items.reduce((acc, s) => {
      if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
      if (s.paymentMethod !== 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
      return acc;
    }, 0);
    const secTotal = sec.items.reduce((acc, s) => acc + (s.salePrice || 0), 0);

    // Distinct invoices in this section
    const distinctInvoices = new Set(sec.items.map((s: any) => (s.parentSale ? s.parentSale.id : s.id) || s.invoiceNo)).size;

    // Section Header banner
    const secHeaderTitle = `${sec.title} (${sec.subtitle})  -  ${secQty} ${sec.isService ? 'Services' : 'Units'} (${distinctInvoices} Invoices)`;

    const tableHead = [[
      'INV NO',
      'DESCRIPTION',
      'SKU',
      'QTY',
      sec.isService ? 'TECHNICIAN' : 'SALESPERSON',
      'CASH (MMK)',
      'BANK (MMK)',
      'BANK TYPE',
      'TOTAL (MMK)'
    ]];

    const tableBody: any[] = [];

    if (sec.items.length === 0) {
      tableBody.push([
        { content: `- No transactions recorded for ${sec.title} -`, colSpan: 9, styles: { halign: 'center', textColor: [148, 163, 184], fontStyle: 'italic' } }
      ]);
    } else {
      sec.items.forEach((s) => {
        const total = s.salePrice || 0;
        const paid = s.paidAmount !== undefined ? s.paidAmount : total;
        const isSplit = s.paymentMethod === 'Split (Cash + Bank)' || s.paymentMethod === 'Cash + Bank' || s.paymentMethod?.toLowerCase().includes('split') || ((s.cashAmount || 0) > 0 && (s.bankAmount || 0) > 0);
        const isCash = s.paymentMethod === 'Cash';
        const cashVal = s.cashAmount !== undefined && s.cashAmount > 0 ? s.cashAmount : (isCash ? paid : 0);
        const bankVal = s.bankAmount !== undefined && s.bankAmount > 0 ? s.bankAmount : (!isCash && !isSplit ? paid : 0);
        const bankTypeStr = s.bankType && s.bankType !== '-' ? s.bankType : (!isCash && !isSplit ? s.paymentMethod : (bankVal > 0 ? 'Bank Transfer' : '-'));
        const staffStr = sec.isService ? (s.technicianName || s.employeeName || '-') : (s.employeeName || '-');

        const cleanName = (s.itemName || '').replace(/\s*\([^)]*\)/g, '').trim();
        let description = s.saleType === 'SERVICE'
          ? (s.itemName.startsWith('Service') ? cleanName : `Service Charges / ${s.deviceModel || cleanName}`)
          : cleanName;
        if (s.deviceSerial) {
          const cleanSer = cleanSerialDisplay(s.deviceSerial);
          if (cleanSer) {
            description += `\n${cleanSer}`;
          }
        }

        tableBody.push([
          s.invoiceNo || '-',
          description,
          s.sku || (sec.isService ? '800600' : '-'),
          s.quantity || 1,
          staffStr,
          cashVal > 0 ? formatNumber(cashVal) : '-',
          bankVal > 0 ? formatNumber(bankVal) : '-',
          bankTypeStr,
          formatNumber(total)
        ]);
      });
    }

    // Subtotal row
    tableBody.push([
      { content: `${sec.title} TOTAL (${secQty} ${sec.isService ? 'Services' : 'Units'})`, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: String(secQty), styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: '', styles: { fillColor: [241, 245, 249] } },
      { content: secCash > 0 ? formatNumber(secCash) : '-', styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: secBank > 0 ? formatNumber(secBank) : '-', styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: '', styles: { fillColor: [241, 245, 249] } },
      { content: formatNumber(secTotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [226, 232, 240], textColor: [15, 23, 42] } }
    ]);

    // Render Table using autoTable
    autoTable(doc, {
      startY: currentY,
      head: [
        [{ content: secHeaderTitle, colSpan: 9, styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 } }],
        tableHead[0]
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { cellWidth: 26 }, // Invoice
        1: { cellWidth: 'auto' }, // Description
        2: { cellWidth: 16, halign: 'center' }, // SKU
        3: { cellWidth: 10, halign: 'center' }, // Qty
        4: { cellWidth: 22 }, // Staff
        5: { cellWidth: 22, halign: 'right' }, // Cash
        6: { cellWidth: 22, halign: 'right' }, // Bank
        7: { cellWidth: 16, halign: 'center' }, // Bank Type
        8: { cellWidth: 24, halign: 'right' }, // Total
      },
      margin: { left: 14, right: 14 },
      pageBreak: 'auto',
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  });

  // Check if we have room for summary box; if not, add a new page
  if (currentY > doc.internal.pageSize.getHeight() - 45) {
    doc.addPage();
    currentY = 16;
  }

  // Grand Summary Settlement Table
  const grandCash = metadata.totalCashInflow !== undefined
    ? metadata.totalCashInflow
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => {
        if (s.cashAmount !== undefined && s.cashAmount > 0) return acc + s.cashAmount;
        if (s.paymentMethod === 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0), 0);

  const grandBank = metadata.totalBankInflow !== undefined
    ? metadata.totalBankInflow
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => {
        if (s.bankAmount !== undefined && s.bankAmount > 0) return acc + s.bankAmount;
        if (s.paymentMethod !== 'Cash') return acc + (s.paidAmount !== undefined ? s.paidAmount : s.salePrice);
        return acc;
      }, 0), 0);

  const grandTotal = metadata.totalSalesRevenue !== undefined
    ? metadata.totalSalesRevenue
    : sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => acc + (s.salePrice || 0), 0), 0);

  const totalInvoices = sections.reduce((sum, sec) => sum + sec.items.length, 0);
  const totalQty = sections.reduce((sum, sec) => sum + sec.items.reduce((acc, s) => acc + (s.quantity || 1), 0), 0);

  autoTable(doc, {
    startY: currentY,
    head: [[
      { content: 'DAILY REVENUE & CASH SETTLEMENT SUMMARY', colSpan: 4, styles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' } }
    ]],
    body: [
      [
        { content: 'Cash In Drawer (Physical Register):', styles: { fontStyle: 'bold' } },
        { content: `${formatNumber(grandCash)} MMK`, styles: { halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] } },
        { content: 'Total Invoices Count:', styles: { fontStyle: 'bold' } },
        { content: `${totalInvoices} Invoices`, styles: { halign: 'right', fontStyle: 'bold' } }
      ],
      [
        { content: 'Bank Transfer / Digital Pay:', styles: { fontStyle: 'bold' } },
        { content: `${formatNumber(grandBank)} MMK`, styles: { halign: 'right', fontStyle: 'bold', textColor: [37, 99, 235] } },
        { content: 'Total Quantity Sold:', styles: { fontStyle: 'bold' } },
        { content: `${totalQty} Units/Items`, styles: { halign: 'right', fontStyle: 'bold' } }
      ],
      [
        { content: 'GRAND TOTAL SALES REVENUE:', colSpan: 2, styles: { fillColor: [248, 250, 252], fontStyle: 'bold', fontSize: 9 } },
        { content: `${formatNumber(grandTotal)} MMK`, colSpan: 2, styles: { fillColor: [226, 232, 240], fontStyle: 'bold', fontSize: 10, halign: 'right', textColor: [15, 23, 42] } }
      ]
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures Section (if room allows, else on bottom)
  if (currentY > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const sigCol1 = 30;
  const sigCol2 = pageWidth / 2;
  const sigCol3 = pageWidth - 30;

  doc.text('Prepared By: ___________________', sigCol1, currentY, { align: 'center' });
  doc.text('Checked By: ___________________', sigCol2, currentY, { align: 'center' });
  doc.text('Approved By: ___________________', sigCol3, currentY, { align: 'center' });

  // Add page numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Shwe Kyal Tagon IT & Mobile Center  |  Sales Statement Report  |  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 7,
      { align: 'center' }
    );
  }

  doc.save(exportFileName);
};

export const exportSalesToCSV = (sales: any[], fileName = 'Shwe_Kyal_Tagon_Sales_Ledger.csv') => {
  if (!sales || sales.length === 0) {
    alert('No sales data available to export.');
    return;
  }

  const headers = [
    'No.',
    'Date',
    'Invoice No.',
    'Branch',
    'Category',
    'Item / Service Name',
    'SKU',
    'Qty',
    'Buying Cost (MMK)',
    'Total Sale Price (MMK)',
    'Paid Amount / Collected (MMK)',
    'Payment Status',
    'Gross Profit (MMK)',
    'Payment Method',
    'Sales Personnel',
    'Customer Name',
    'Phone',
    'Notes'
  ];

  const rows = sales.map((s, index) => [
    index + 1,
    formatDateDMY(s.date),
    `"${s.invoiceNo}"`,
    `"${s.branchName}"`,
    `"${s.category}"`,
    `"${s.itemName}"`,
    `"${s.sku || ''}"`,
    s.quantity || 1,
    s.costPrice,
    s.salePrice,
    s.paidAmount !== undefined ? s.paidAmount : s.salePrice,
    `"${s.paymentStatus || 'PAID'}"`,
    s.profit,
    `"${s.paymentMethod}"`,
    `"${s.employeeName}"`,
    `"${s.customerName || ''}"`,
    `"${s.customerPhone || ''}"`,
    `"${s.notes || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportInventoryToCSV = (
  items: any[],
  fileName = 'Shwe_Kyal_Tagon_Stock_Inventory.csv',
  branchInfo?: { id: string; name: string; code: string }
) => {
  if (!items || items.length === 0) {
    alert('No inventory data available to export.');
    return;
  }

  const isSingle = !!branchInfo && branchInfo.id !== 'ALL';

  const headers = [
    'No.',
    'SKU / Barcode',
    'Item Name',
    'Category',
    'Brand',
    'Model',
    'Buying Cost (MMK)',
    'Selling Price (MMK)',
    'Unit Profit (MMK)',
    'Markup %',
    isSingle ? `${branchInfo.code} In-Stock Qty` : 'Total Combined Stock Qty',
    isSingle ? `${branchInfo.code} Cost Value (MMK)` : 'Total Cost Value (MMK)',
    isSingle ? `${branchInfo.code} Retail Value (MMK)` : 'Total Retail Value (MMK)',
    'Potential Profit (MMK)',
    'Warranty',
    'Supplier'
  ];

  const rows = items.map((item, index) => {
    const profit = (item.sellingPrice || 0) - (item.costPrice || 0);
    const markup = item.costPrice > 0 ? ((profit / item.costPrice) * 100).toFixed(1) : '0';
    const qty = isSingle ? getAvailableStockForBranch(item, branchInfo.id) : (item.totalStock || 0);
    const costVal = qty * (item.costPrice || 0);
    const retailVal = qty * (item.sellingPrice || 0);
    const potentialProfit = retailVal - costVal;

    return [
      index + 1,
      `"${item.sku || ''}"`,
      `"${item.name || ''}"`,
      `"${item.category || ''}"`,
      `"${item.brand || ''}"`,
      `"${item.model || ''}"`,
      item.costPrice,
      item.sellingPrice,
      profit,
      `${markup}%`,
      qty,
      costVal,
      retailVal,
      potentialProfit,
      `"${item.warranty || ''}"`,
      `"${item.supplier || ''}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportServicesToCSV = (services: any[], fileName = 'Shwe_Kyal_Tagon_Machine_Repairs_Services.csv') => {
  if (!services || services.length === 0) {
    console.warn('No repair service records to export.');
    return;
  }

  const headers = [
    'No.',
    'Date',
    'Voucher No.',
    'Branch',
    'Machine / Device Model',
    'Serial / IMEI',
    'Defect / Service Description',
    'Customer Name',
    'Customer Phone',
    'Labor / Service Fee (MMK)',
    'Spare Parts Cost (MMK)',
    'Total Service Bill (MMK)',
    'Net Service Profit (MMK)',
    'Technician In-Charge',
    'Status',
    'Payment Method'
  ];

  const rows = services.map((s, index) => [
    index + 1,
    formatDateDMY(s.date),
    `"${s.invoiceNo}"`,
    `"${s.branchName}"`,
    `"${s.deviceModel || s.itemName}"`,
    `"${s.deviceSerial || ''}"`,
    `"${s.issueDescription || s.notes || ''}"`,
    `"${s.customerName || ''}"`,
    `"${s.customerPhone || ''}"`,
    s.serviceLaborFee || (s.salePrice - (s.costPrice || 0)),
    s.costPrice || 0,
    s.salePrice || 0,
    s.profit || 0,
    `"${s.technicianName || s.employeeName}"`,
    `"${s.serviceStatus || 'COMPLETED'}"`,
    `"${s.paymentMethod}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportExpensesToCSV = (expenses: any[], fileName = 'Shwe_Kyal_Tagon_Operating_Expenses.csv') => {
  if (!expenses || expenses.length === 0) {
    console.warn('No expense records to export.');
    return;
  }

  const headers = [
    'No.',
    'Date',
    'Branch',
    'Expense Title',
    'Category',
    'Amount (MMK)',
    'Payment Method',
    'Recorded By',
    'Notes'
  ];

  const rows = expenses.map((e, index) => [
    index + 1,
    e.date,
    `"${e.branchName}"`,
    `"${e.title}"`,
    `"${e.category}"`,
    e.amount,
    `"${e.paymentMethod}"`,
    `"${e.recordedBy}"`,
    `"${e.notes || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportStockMovementsToCSV = (movements: any[], fileName = 'Shwe_Kyal_Tagon_Stock_Movements_Audit.csv') => {
  if (!movements || movements.length === 0) {
    console.warn('No stock movements to export.');
    return;
  }

  const headers = [
    'No.',
    'Date',
    'Movement Type',
    'Item Name',
    'Category',
    'Quantity',
    'From Branch',
    'To Branch',
    'Reference / Invoice No',
    'Performed By',
    'Notes'
  ];

  const rows = movements.map((m, index) => [
    index + 1,
    m.date,
    `"${m.type}"`,
    `"${m.itemName}"`,
    `"${m.itemCategory}"`,
    m.quantity,
    `"${m.fromBranchName || '-'}"`,
    `"${m.toBranchName || '-'}"`,
    `"${m.referenceNo || '-'}"`,
    `"${m.performedBy}"`,
    `"${m.notes || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportFullSystemBackupJSON = (systemData: {
  branches: any[];
  sales: any[];
  expenses: any[];
  inventory: any[];
  movements?: any[];
  stockMovements?: any[];
  employees: any[];
  salaryRecords: any[];
  contacts?: any[];
  users: any[];
  treasuryAccounts?: any[];
  treasuryTransactions?: any[];
  purchases?: any[];
  supplierReturns?: any[];
  supplierBenefits?: any[];
  activityLogs?: any[];
  interBranchTransfers?: any[];
  customPositions?: any;
}) => {
  const exportPayload = {
    enterprise: 'Shwe Kyal Tagon Co., Ltd.',
    managingDirector: 'Daw Su Myat Win',
    systemVersion: 'Enterprise ERP v3.0 (Offline Database)',
    exportedAt: new Date().toISOString(),
    exportTimestamp: Date.now(),
    branchCount: (systemData.branches || []).length,
    statistics: {
      totalSalesCount: (systemData.sales || []).length,
      totalExpensesCount: (systemData.expenses || []).length,
      totalInventoryCount: (systemData.inventory || []).length,
      totalEmployeesCount: (systemData.employees || []).length,
      totalPayrollCount: (systemData.salaryRecords || []).length,
      totalUsersCount: (systemData.users || []).length,
      totalSupplierReturnsCount: (systemData.supplierReturns || []).length,
    },
    data: {
      branches: systemData.branches || [],
      sales: systemData.sales || [],
      expenses: systemData.expenses || [],
      inventory: systemData.inventory || [],
      stockMovements: systemData.stockMovements || systemData.movements || [],
      employees: systemData.employees || [],
      salaryRecords: systemData.salaryRecords || [],
      contacts: systemData.contacts || [],
      users: systemData.users || [],
      treasuryAccounts: systemData.treasuryAccounts || [],
      treasuryTransactions: systemData.treasuryTransactions || [],
      purchases: systemData.purchases || [],
      supplierReturns: systemData.supplierReturns || [],
      activityLogs: systemData.activityLogs || [],
      interBranchTransfers: systemData.interBranchTransfers || [],
      customPositions: systemData.customPositions || {},
    },
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `SKTG_Full_Database_Offline_Backup_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadOfflineAuditHTML = (systemData: {
  branches: any[];
  sales: any[];
  expenses: any[];
  inventory: any[];
  employees: any[];
  salaryRecords: any[];
}) => {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const totalSalesRev = systemData.sales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
  const productSales = systemData.sales.filter((s) => s.saleType !== 'SERVICE');
  const serviceSales = systemData.sales.filter((s) => s.saleType === 'SERVICE');
  const productRev = productSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
  const serviceRev = serviceSales.reduce((acc, s) => acc + (s.salePrice || 0), 0);
  const totalCost = systemData.sales.reduce((acc, s) => acc + (s.costPrice || 0), 0);
  const grossProfit = totalSalesRev - totalCost;
  const totalExpenses = systemData.expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalPayroll = systemData.salaryRecords.reduce((acc, p) => acc + (p.netSalary || 0), 0);
  const netProfit = grossProfit - totalExpenses - totalPayroll;

  const totalStockUnits = systemData.inventory.reduce((acc, i) => acc + (i.totalStock || 0), 0);
  const totalStockCostValuation = systemData.inventory.reduce(
    (acc, i) => acc + (i.totalStock || 0) * (i.costPrice || 0),
    0
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shwe Kyal Tagon Co., Ltd. - Offline Master Audit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 1100px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; }
    .card-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .card-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    th { background: #f1f5f9; padding: 10px; text-align: left; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .section-title { font-size: 16px; font-weight: 800; margin: 24px 0 12px 0; color: #1e293b; border-left: 4px solid #f59e0b; padding-left: 10px; }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">SHWE KYAL TAGON CO., LTD.</h1>
        <div class="subtitle">Managing Director: Daw Su Myat Win • Multi-Store Corporate Audit Report</div>
        <div class="subtitle">Generated Date: ${dateFormatted} • Offline Permanent Archive Document</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">Official Business Audit</span>
        <div style="margin-top: 10px;" class="no-print">
          <button onclick="window.print()" style="background: #f59e0b; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print / Save as PDF</button>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Total Revenue (Sales + Service)</div>
        <div class="card-value">${formatMMK(totalSalesRev)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Product: ${formatMMK(productRev)} | Service: ${formatMMK(serviceRev)}</div>
      </div>
      <div class="card">
        <div class="card-label">Gross Profit</div>
        <div class="card-value" style="color: #059669;">+${formatMMK(grossProfit)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">COGS: ${formatMMK(totalCost)}</div>
      </div>
      <div class="card">
        <div class="card-label">Expenses & Salaries</div>
        <div class="card-value" style="color: #dc2626;">-${formatMMK(totalExpenses + totalPayroll)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Exp: ${formatMMK(totalExpenses)} | Payroll: ${formatMMK(totalPayroll)}</div>
      </div>
      <div class="card">
        <div class="card-label">Net Profit</div>
        <div class="card-value" style="color: ${netProfit >= 0 ? '#059669' : '#dc2626'};">${formatMMK(netProfit)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Stock Valuation: ${formatMMK(totalStockCostValuation)}</div>
      </div>
    </div>

    <div class="section-title">1. Multi-Branch Performance Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Branch Code</th>
          <th>Branch Name</th>
          <th>Location</th>
          <th>Manager</th>
          <th class="text-right">Sales & Service</th>
          <th class="text-right">Operating Expenses</th>
          <th class="text-right">Stock Valuation</th>
        </tr>
      </thead>
      <tbody>
        ${systemData.branches.map((b: any) => {
          const bSales = systemData.sales.filter((s: any) => s.branchId === b.id).reduce((acc: number, s: any) => acc + (s.salePrice || 0), 0);
          const bExp = systemData.expenses.filter((e: any) => e.branchId === b.id).reduce((acc: number, e: any) => acc + (e.amount || 0), 0);
          const bStockVal = systemData.inventory.reduce((acc: number, i: any) => {
            const count = getAvailableStockForBranch(i, b.id);
            return acc + (count * (i.costPrice || 0));
          }, 0);
          return `<tr>
            <td><strong>${b.code}</strong></td>
            <td>${b.name}</td>
            <td>${b.city}</td>
            <td>${b.managerName}</td>
            <td class="text-right"><strong>${formatMMK(bSales)}</strong></td>
            <td class="text-right">${formatMMK(bExp)}</td>
            <td class="text-right">${formatMMK(bStockVal)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="section-title">2. Machine Maintenance & Repair Services Report</div>
    <table>
      <thead>
        <tr>
          <th>Voucher No</th>
          <th>Date</th>
          <th>Branch</th>
          <th>Device / Model</th>
          <th>Customer</th>
          <th>Service / Defect</th>
          <th class="text-right">Service Bill</th>
          <th class="text-right">Parts Cost</th>
          <th class="text-right">Net Profit</th>
        </tr>
      </thead>
      <tbody>
        ${serviceSales.map((s: any) => `<tr>
          <td><strong>${s.invoiceNo}</strong></td>
          <td>${formatDateDMY(s.date)}</td>
          <td>${s.branchName}</td>
          <td>${s.deviceModel || s.itemName}</td>
          <td>${s.customerName || '-'} (${s.customerPhone || '-'})</td>
          <td>${s.issueDescription || s.notes || '-'}</td>
          <td class="text-right"><strong>${formatMMK(s.salePrice)}</strong></td>
          <td class="text-right">${formatMMK(s.costPrice || 0)}</td>
          <td class="text-right" style="color:#059669;"><strong>+${formatMMK(s.profit)}</strong></td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="section-title">3. Inventory Stock Ledger & Valuation</div>
    <table>
      <thead>
        <tr>
          <th>SKU</th>
          <th>Product Name</th>
          <th>Category</th>
          <th class="text-right">Buying Cost</th>
          <th class="text-right">Selling Price</th>
          <th class="text-right">Total Units</th>
          <th class="text-right">Total Cost Value</th>
        </tr>
      </thead>
      <tbody>
        ${systemData.inventory.map((item: any) => `<tr>
          <td><code>${item.sku}</code></td>
          <td><strong>${item.name}</strong></td>
          <td>${item.category}</td>
          <td class="text-right">${formatMMK(item.costPrice)}</td>
          <td class="text-right">${formatMMK(item.sellingPrice)}</td>
          <td class="text-right"><strong>${item.totalStock}</strong></td>
          <td class="text-right">${formatMMK(item.totalStock * item.costPrice)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div style="margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
      <div>Shwe Kyal Tagon Co., Ltd. • Confidential Corporate Financial Document</div>
      <div>End of Offline Report • Page 1</div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `SKTG_Corporate_Offline_Audit_${dateStr}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Calculate standard working days for a given month:
 * Total days in that month - 3 off days (တလမှာ နားရက် ၃ ရက်)
 * Examples:
 *   31-day month (Jan, Mar, May, Jul, Aug, Oct, Dec) - 3 = 28 days
 *   30-day month (Apr, Jun, Sep, Nov) - 3 = 27 days
 *   28-day Feb - 3 = 25 days (or 29-day leap Feb - 3 = 26 days)
 */
export const getStandardWorkingDaysForMonth = (monthStr?: string): number => {
  if (!monthStr || monthStr === 'ALL') {
    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, totalDays - 3);
  }
  const clean = monthStr.includes('T') ? monthStr.split('T')[0] : monthStr.trim();
  const parts = clean.split(/[-/.]/);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
    const totalDays = new Date(year, month, 0).getDate();
    return Math.max(1, totalDays - 3);
  }
  return 27;
};

/**
 * Total number of calendar days in a month (28, 29, 30, or 31)
 */
export const getTotalDaysInMonth = (monthStr?: string): number => {
  if (!monthStr || monthStr === 'ALL') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  const clean = monthStr.includes('T') ? monthStr.split('T')[0] : monthStr.trim();
  const parts = clean.split(/[-/.]/);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
    return new Date(year, month, 0).getDate();
  }
  return 30;
};

/**
 * Standardized branch name resolver that respects dynamic updates from Branch Network
 */
export const getBranchName = (
  branchId?: string,
  branches?: Array<{ id: string; name: string }>,
  fallbackName?: string
): string => {
  if (!branchId || branchId === 'ALL') return 'All Branches';
  if (branches && branches.length > 0) {
    const found = branches.find((b) => b.id === branchId);
    if (found?.name) return found.name;
  }
  if (branchId === 'SKTG1' || branchId === 'branch-1') return 'Shwe Kyal Tagon (Shop 1)';
  if (branchId === 'SKTG2' || branchId === 'branch-2') return 'Shwe Kyal Tagon (Shop 2)';
  if (branchId === 'SKTG3' || branchId === 'branch-3') return 'Shwe Kyal Tagon (Shop 3)';
  if (branchId === 'SII' || branchId === 'branch-sys2') return 'System II';
  return fallbackName || branchId;
};

/**
 * Standardized branch short name resolver (e.g. "Shop 1", "Shop 2", "Shop 3", "System II")
 */
export const getBranchShortName = (
  branchId?: string,
  branches?: Array<{ id: string; name: string }>,
  fallbackName?: string
): string => {
  if (!branchId || branchId === 'ALL') return 'All Branches';
  const fullName = getBranchName(branchId, branches, fallbackName);
  if (fullName === 'System II') return 'System II';
  const match = fullName.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  return fullName;
};
