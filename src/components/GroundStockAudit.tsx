import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  History, 
  FileSpreadsheet, 
  Printer, 
  Package, 
  ShieldCheck, 
  Layers, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Check,
  Info
} from 'lucide-react';
import { InventoryItem, Branch, UserAccount, StockMovement, ActivityLogEntry, isMDUser } from '../types';
import { formatMMK, formatNumber } from '../utils/formatters';

interface GroundStockAuditProps {
  inventory: InventoryItem[];
  branches: Branch[];
  movements: StockMovement[];
  currentUser: UserAccount;
  onUpdateItem: (item: InventoryItem) => void;
  onRecordMovement?: (movement: StockMovement) => void;
  onLogActivity?: (log: Partial<ActivityLogEntry>) => void;
  onInspectItemTimeline: (item: InventoryItem) => void;
}

export const GroundStockAudit: React.FC<GroundStockAuditProps> = ({
  inventory = [],
  branches = [],
  movements = [],
  currentUser,
  onUpdateItem,
  onRecordMovement,
  onLogActivity,
  onInspectItemTimeline,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || 'branch-1');
  const [filterType, setFilterType] = useState<'ALL' | 'DISCREPANCY' | 'SHORTAGE' | 'SURPLUS' | 'MATCHED' | 'UNCOUNTED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Physical Counts state: itemId -> physical count number
  const [physicalCounts, setPhysicalCounts] = useState<{ [itemId: string]: number | undefined }>({});
  // Discrepancy Reasons: itemId -> reason string
  const [reasons, setReasons] = useState<{ [itemId: string]: string }>({});
  // Notes: itemId -> notes string
  const [notes, setNotes] = useState<{ [itemId: string]: string }>({});

  const isMDOrAdmin = isMDUser(currentUser) || currentUser.role === 'Admin';
  const isManager = currentUser.role === 'Sales Manager';
  const canReconcileStock = isMDOrAdmin || isManager;
  const isStaffReadOnly = currentUser.role === 'Staff' || currentUser.role === 'Cashier';

  const selectedBranchObj = branches.find(b => b.id === selectedBranchId) || branches[0];

  // Categories list
  const categoriesList = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.category))).filter(Boolean);
  }, [inventory]);

  // Audit Rows with calculations
  const auditRows = useMemo(() => {
    return inventory.map((item) => {
      const systemQty = item.branchStock ? (item.branchStock[selectedBranchId] || 0) : 0;
      const pCount = physicalCounts[item.id];
      const isCounted = pCount !== undefined;
      const physicalQty = isCounted ? Number(pCount) : systemQty;
      const variance = isCounted ? (physicalQty - systemQty) : 0;
      const varianceValue = variance * item.costPrice;

      let status: 'MATCHED' | 'SHORTAGE' | 'SURPLUS' | 'UNCOUNTED' = 'UNCOUNTED';
      if (isCounted) {
        if (variance === 0) status = 'MATCHED';
        else if (variance < 0) status = 'SHORTAGE';
        else status = 'SURPLUS';
      }

      return {
        item,
        systemQty,
        physicalQty,
        isCounted,
        variance,
        varianceValue,
        status,
        reason: reasons[item.id] || 'Physical Counting Discrepancy',
        note: notes[item.id] || '',
      };
    });
  }, [inventory, selectedBranchId, physicalCounts, reasons, notes]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return auditRows.filter((row) => {
      if (selectedCategory !== 'ALL' && row.item.category !== selectedCategory) {
        return false;
      }

      if (filterType === 'DISCREPANCY' && (!row.isCounted || row.variance === 0)) {
        return false;
      }
      if (filterType === 'SHORTAGE' && (!row.isCounted || row.variance >= 0)) {
        return false;
      }
      if (filterType === 'SURPLUS' && (!row.isCounted || row.variance <= 0)) {
        return false;
      }
      if (filterType === 'MATCHED' && (!row.isCounted || row.variance !== 0)) {
        return false;
      }
      if (filterType === 'UNCOUNTED' && row.isCounted) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = row.item.name.toLowerCase().includes(q);
        const inSku = row.item.sku.toLowerCase().includes(q);
        const inBrand = (row.item.brand || '').toLowerCase().includes(q);
        if (!inName && !inSku && !inBrand) return false;
      }

      return true;
    });
  }, [auditRows, selectedCategory, filterType, searchQuery]);

  // KPI Summary Metrics
  const summary = useMemo(() => {
    let totalItems = auditRows.length;
    let countedCount = 0;
    let matchedCount = 0;
    let discrepancyCount = 0;
    let shortageCount = 0;
    let surplusCount = 0;
    let totalFinancialVariance = 0;
    let totalLossAmount = 0;
    let totalSurplusAmount = 0;

    auditRows.forEach((r) => {
      if (r.isCounted) {
        countedCount++;
        if (r.variance === 0) {
          matchedCount++;
        } else {
          discrepancyCount++;
          totalFinancialVariance += r.varianceValue;
          if (r.variance < 0) {
            shortageCount++;
            totalLossAmount += Math.abs(r.varianceValue);
          } else {
            surplusCount++;
            totalSurplusAmount += r.varianceValue;
          }
        }
      }
    });

    return {
      totalItems,
      countedCount,
      matchedCount,
      discrepancyCount,
      shortageCount,
      surplusCount,
      totalFinancialVariance,
      totalLossAmount,
      totalSurplusAmount,
    };
  }, [auditRows]);

  // Handle Count input
  const handleSetCount = (itemId: string, count: number) => {
    setPhysicalCounts(prev => ({
      ...prev,
      [itemId]: Math.max(0, count)
    }));
  };

  // Mark all uncounted items as matched with system
  const handleMarkAllSystemMatched = () => {
    const newCounts: { [itemId: string]: number } = { ...physicalCounts };
    inventory.forEach((item) => {
      if (newCounts[item.id] === undefined) {
        const sys = item.branchStock ? (item.branchStock[selectedBranchId] || 0) : 0;
        newCounts[item.id] = sys;
      }
    });
    setPhysicalCounts(newCounts);
  };

  // Reset current audit session
  const handleResetAudit = () => {
    if (confirm('Are you sure you want to clear all entered physical ground counts for this session?')) {
      setPhysicalCounts({});
      setReasons({});
      setNotes({});
    }
  };

  // Reconcile single item
  const handleReconcileItem = (row: typeof auditRows[0]) => {
    if (!row.isCounted) {
      alert('Please enter a physical count before reconciling.');
      return;
    }

    if (row.variance === 0) {
      alert('Physical count matches system stock. No adjustment needed.');
      return;
    }

    const branchName = selectedBranchObj?.name || 'Branch';
    const proceed = confirm(
      `Reconcile ${row.item.name} at ${branchName}?\n` +
      `System Stock: ${row.systemQty} ➔ Physical Count: ${row.physicalQty}\n` +
      `Adjustment: ${row.variance > 0 ? `+${row.variance}` : row.variance} units (${formatMMK(row.varianceValue)})\n` +
      `Reason: ${row.reason}`
    );

    if (!proceed) return;

    // 1. Update Inventory Item
    const updatedBranchStock = {
      ...(row.item.branchStock || {}),
      [selectedBranchId]: row.physicalQty,
    };
    const newTotal = (Object.values(updatedBranchStock) as number[]).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);

    const updatedItem: InventoryItem = {
      ...row.item,
      branchStock: updatedBranchStock,
      totalStock: newTotal,
      lastAuditedDate: new Date().toISOString().slice(0, 10),
    };

    onUpdateItem(updatedItem);

    // 2. Record Stock Movement
    const movement: StockMovement = {
      id: `mov-audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'AUDIT_ADJUSTMENT',
      itemId: row.item.id,
      itemName: row.item.name,
      sku: row.item.sku,
      itemCategory: row.item.category,
      quantity: Math.abs(row.variance),
      unitCost: row.item.costPrice,
      fromBranchId: row.variance < 0 ? selectedBranchId : undefined,
      fromBranchName: row.variance < 0 ? branchName : undefined,
      toBranchId: row.variance > 0 ? selectedBranchId : undefined,
      toBranchName: row.variance > 0 ? branchName : undefined,
      performedBy: `${currentUser.displayName} (${currentUser.role})`,
      notes: `Ground Audit Reconcile (${row.reason}) | Prev: ${row.systemQty} ➔ New: ${row.physicalQty} | Note: ${row.note || 'None'}`,
      supplierOrCustomer: 'Ground Stock Audit',
      createdAt: new Date().toISOString(),
    };

    if (onRecordMovement) {
      onRecordMovement(movement);
    }

    // 3. Log Activity
    if (onLogActivity) {
      onLogActivity({
        module: 'AUDIT',
        action: 'ADJUST',
        title: `Ground Audit Adjustment: ${row.item.name}`,
        description: `Physical count adjusted at ${branchName} from ${row.systemQty} to ${row.physicalQty} units (${row.variance > 0 ? `+${row.variance}` : row.variance} units). Reason: ${row.reason}`,
        branchId: selectedBranchId,
        branchName,
        details: {
          itemId: row.item.id,
          sku: row.item.sku,
          itemName: row.item.name,
          prevQty: row.systemQty,
          newQty: row.physicalQty,
          quantity: Math.abs(row.variance),
          amount: Math.abs(row.varianceValue),
          reason: row.reason,
        }
      });
    }

    alert(`Successfully reconciled stock for ${row.item.name}!`);
  };

  // Batch Reconcile all counted items with discrepancies
  const handleBatchReconcile = () => {
    const discrepantRows = auditRows.filter(r => r.isCounted && r.variance !== 0);
    if (discrepantRows.length === 0) {
      alert('No counted items with stock discrepancies found to reconcile.');
      return;
    }

    const branchName = selectedBranchObj?.name || 'Branch';
    const proceed = confirm(
      `Reconcile ALL ${discrepantRows.length} discrepant items for ${branchName}?\n` +
      `Total Net Financial Variance: ${formatMMK(summary.totalFinancialVariance)}\n\n` +
      `This will update system stock to match your physical count and log all audit records.`
    );

    if (!proceed) return;

    discrepantRows.forEach((row) => {
      // Update Item
      const updatedBranchStock = {
        ...(row.item.branchStock || {}),
        [selectedBranchId]: row.physicalQty,
      };
      const newTotal = (Object.values(updatedBranchStock) as number[]).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);

      const updatedItem: InventoryItem = {
        ...row.item,
        branchStock: updatedBranchStock,
        totalStock: newTotal,
        lastAuditedDate: new Date().toISOString().slice(0, 10),
      };

      onUpdateItem(updatedItem);

      // Record Movement
      const movement: StockMovement = {
        id: `mov-audit-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'AUDIT_ADJUSTMENT',
        itemId: row.item.id,
        itemName: row.item.name,
        sku: row.item.sku,
        itemCategory: row.item.category,
        quantity: Math.abs(row.variance),
        unitCost: row.item.costPrice,
        fromBranchId: row.variance < 0 ? selectedBranchId : undefined,
        fromBranchName: row.variance < 0 ? branchName : undefined,
        toBranchId: row.variance > 0 ? selectedBranchId : undefined,
        toBranchName: row.variance > 0 ? branchName : undefined,
        performedBy: `${currentUser.displayName} (${currentUser.role})`,
        notes: `Batch Ground Audit (${row.reason}) | Prev: ${row.systemQty} ➔ New: ${row.physicalQty}`,
        supplierOrCustomer: 'Ground Stock Audit',
        createdAt: new Date().toISOString(),
      };

      if (onRecordMovement) {
        onRecordMovement(movement);
      }
    });

    if (onLogActivity) {
      onLogActivity({
        module: 'AUDIT',
        action: 'ADJUST',
        title: `Batch Ground Audit Reconcile (${discrepantRows.length} items)`,
        description: `Batch reconciled ${discrepantRows.length} items at ${branchName}. Total financial variance: ${formatMMK(summary.totalFinancialVariance)}.`,
        branchId: selectedBranchId,
        branchName,
        details: {
          itemCount: discrepantRows.length,
          totalFinancialVariance: summary.totalFinancialVariance,
        }
      });
    }

    alert(`Successfully batch reconciled ${discrepantRows.length} items!`);
  };

  // Export Audit CSV
  const handleExportAuditCSV = () => {
    const headers = [
      'SKU',
      'Item Name',
      'Category',
      'Cost Price (MMK)',
      'System Stock',
      'Physical Count',
      'Variance (Units)',
      'Variance Value (MMK)',
      'Status',
      'Discrepancy Reason',
      'Notes'
    ];

    const rows = auditRows.map(r => [
      `"${r.item.sku}"`,
      `"${r.item.name.replace(/"/g, '""')}"`,
      `"${r.item.category}"`,
      r.item.costPrice,
      r.systemQty,
      r.isCounted ? r.physicalQty : 'UNCOUNTED',
      r.variance,
      r.varianceValue,
      r.status,
      `"${r.reason}"`,
      `"${r.note.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ground_stock_audit_${selectedBranchObj?.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shadow-2xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Ground Stock Audit & Discrepancy Reconciliation</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                Physical Inventory Audit
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instantly detect missing, surplus, or miscounted stock during physical counts and reconcile inventory in one click.
            </p>
          </div>
        </div>

        {/* Global Branch Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Building2 className="w-4 h-4 text-purple-600 ml-1.5 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-800 pr-2 py-1 focus:outline-hidden cursor-pointer"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.code} ({b.name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportAuditCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Export Ground Audit Report to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Audit CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Print Audit Sheet"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Count Progress & Financial Discrepancy Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Count Progress */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Items Audited</span>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            {summary.countedCount} / {summary.totalItems}
          </div>
          <span className="text-[10px] text-purple-600 font-bold">
            {Math.round((summary.countedCount / (summary.totalItems || 1)) * 100)}% Complete
          </span>
        </div>

        {/* Matched */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-900 uppercase">Matched Stock</span>
          <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
            {summary.matchedCount}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">0 Variance</span>
        </div>

        {/* Shortage */}
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-900 uppercase">Shortages (Missing)</span>
          <div className="text-xl font-black text-rose-600 mt-1 font-mono">
            {summary.shortageCount} items
          </div>
          {isMDOrAdmin ? (
            <span className="text-[10px] text-rose-600 font-bold">
              -{formatMMK(summary.totalLossAmount)}
            </span>
          ) : (
            <span className="text-[10px] text-rose-500 font-medium">
              Physical Count Deficit
            </span>
          )}
        </div>

        {/* Surplus */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase">Surplus (Excess)</span>
          <div className="text-xl font-black text-amber-700 mt-1 font-mono">
            {summary.surplusCount} items
          </div>
          {isMDOrAdmin ? (
            <span className="text-[10px] text-amber-600 font-bold">
              +{formatMMK(summary.totalSurplusAmount)}
            </span>
          ) : (
            <span className="text-[10px] text-amber-600 font-medium">
              Physical Count Surplus
            </span>
          )}
        </div>

        {/* Net Financial Variance or Audit Progress (Staff) */}
        {isMDOrAdmin ? (
          <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-purple-900 uppercase">Net Financial Variance</span>
            <div className={`text-xl font-black mt-1 font-mono ${summary.totalFinancialVariance < 0 ? 'text-rose-600' : summary.totalFinancialVariance > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
              {summary.totalFinancialVariance >= 0 ? `+${formatMMK(summary.totalFinancialVariance)}` : formatMMK(summary.totalFinancialVariance)}
            </div>
            <span className="text-[10px] text-slate-400">Total net impact</span>
          </div>
        ) : (
          <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-purple-900 uppercase">Counting Progress</span>
            <div className="text-xl font-black text-purple-900 mt-1 font-mono">
              {summary.countedCount} / {summary.totalItems}
            </div>
            <span className="text-[10px] text-purple-600 font-medium">Items Counted</span>
          </div>
        )}
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Items ({auditRows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DISCREPANCY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'DISCREPANCY' ? 'bg-rose-600 text-white shadow-2xs font-black' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Discrepancies Only ({summary.discrepancyCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('SHORTAGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'SHORTAGE' ? 'bg-rose-100 text-rose-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Shortages ({summary.shortageCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('SURPLUS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'SURPLUS' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Surplus ({summary.surplusCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MATCHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'MATCHED' ? 'bg-emerald-100 text-emerald-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Matched ({summary.matchedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNCOUNTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === 'UNCOUNTED' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Uncounted ({summary.totalItems - summary.countedCount})
            </button>
          </div>

          {/* Quick Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMarkAllSystemMatched}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Populate all uncounted items with system stock numbers"
            >
              Auto-Fill Matched
            </button>

            {summary.discrepancyCount > 0 && canReconcileStock && (
              <button
                type="button"
                onClick={handleBatchReconcile}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                title="Batch reconcile all counted discrepancies"
              >
                Reconcile All ({summary.discrepancyCount})
              </button>
            )}

            <button
              type="button"
              onClick={handleResetAudit}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Clear all physical counts"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-100">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU, item name, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <span className="text-xs text-slate-400 font-bold ml-auto">
            Showing {filteredRows.length} items
          </span>
        </div>
      </div>

      {/* Audit Count Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3 px-4 w-28">SKU</th>
                <th className="py-3 px-4 min-w-[200px]">ITEM / MODEL</th>
                {isMDOrAdmin && (
                  <th className="py-3 px-4 w-28 text-right bg-amber-50/30 text-amber-900">BUYING COST</th>
                )}
                <th className="py-3 px-4 w-28 text-center bg-purple-50/40 text-purple-900 font-black">
                  SYSTEM STOCK
                </th>
                <th className="py-3 px-4 w-44 text-center bg-sky-50/50 text-sky-900 font-black">
                  PHYSICAL GROUND COUNT
                </th>
                <th className="py-3 px-4 w-32 text-center font-black">VARIANCE</th>
                {isMDOrAdmin && (
                  <th className="py-3 px-4 w-32 text-right font-black">LOSS / SURPLUS</th>
                )}
                <th className="py-3 px-4 min-w-[160px]">DISCREPANCY REASON</th>
                <th className="py-3 px-3 w-28 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={isMDOrAdmin ? 9 : 7} className="py-12 text-center text-slate-400">
                    <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-bold text-slate-600 text-sm">No items found matching the filter</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const hasDiscrepancy = row.isCounted && row.variance !== 0;

                  return (
                    <tr 
                      key={row.item.id} 
                      className={`hover:bg-purple-50/20 transition-colors ${
                        row.isCounted && row.variance < 0 
                          ? 'bg-rose-50/20' 
                          : row.isCounted && row.variance > 0 
                          ? 'bg-amber-50/20' 
                          : ''
                      }`}
                    >
                      {/* SKU with inspect link */}
                      <td className="py-3 px-4 font-mono font-bold text-purple-900">
                        <button
                          type="button"
                          onClick={() => onInspectItemTimeline(row.item)}
                          className="hover:underline flex items-center gap-1 group text-left cursor-pointer"
                          title="Click to view full movement lifecycle"
                        >
                          <span>{row.item.sku}</span>
                          <History className="w-3 h-3 text-slate-400 group-hover:text-purple-600 shrink-0" />
                        </button>
                      </td>

                      {/* Item Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {row.item.category} • {row.item.brand}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      {isMDOrAdmin && (
                        <td className="py-3 px-4 text-right font-mono text-amber-900 bg-amber-50/10">
                          {formatMMK(row.item.costPrice)}
                        </td>
                      )}

                      {/* System Stock */}
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900 bg-purple-50/20 text-sm">
                        {row.systemQty} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                      </td>

                      {/* Physical Ground Count Input */}
                      <td className="py-2 px-3 bg-sky-50/20">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetCount(row.item.id, (physicalCounts[row.item.id] ?? row.systemQty) - 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer text-xs"
                            title="Minus 1"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={0}
                            placeholder={String(row.systemQty)}
                            value={physicalCounts[row.item.id] !== undefined ? physicalCounts[row.item.id] : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : Number(e.target.value);
                              setPhysicalCounts(prev => ({
                                ...prev,
                                [row.item.id]: val
                              }));
                            }}
                            className={`w-16 py-1 px-1.5 text-center font-mono font-black text-xs rounded-lg border focus:outline-hidden ${
                              row.isCounted
                                ? row.variance === 0
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                  : row.variance < 0
                                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                                  : 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleSetCount(row.item.id, (physicalCounts[row.item.id] ?? row.systemQty) + 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer text-xs"
                            title="Plus 1"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetCount(row.item.id, row.systemQty)}
                            className="px-1.5 py-1 text-[10px] bg-slate-100 hover:bg-purple-100 text-purple-700 rounded font-bold cursor-pointer transition-colors"
                            title="Match System Stock"
                          >
                            =
                          </button>
                        </div>
                      </td>

                      {/* Variance Indicator */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {!row.isCounted ? (
                          <span className="text-slate-400 text-[11px]">Uncounted</span>
                        ) : row.variance === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Matched (0)
                          </span>
                        ) : row.variance < 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[11px] font-black">
                            <TrendingDown className="w-3 h-3" /> Shortage ({row.variance})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[11px] font-black">
                            <TrendingUp className="w-3 h-3" /> Surplus (+{row.variance})
                          </span>
                        )}
                      </td>

                      {/* Loss / Surplus Amount */}
                      {isMDOrAdmin && (
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {!row.isCounted || row.variance === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : row.variance < 0 ? (
                            <span className="text-rose-600">-{formatMMK(Math.abs(row.varianceValue))}</span>
                          ) : (
                            <span className="text-emerald-600">+{formatMMK(row.varianceValue)}</span>
                          )}
                        </td>
                      )}

                      {/* Discrepancy Reason Selector */}
                      <td className="py-2 px-4">
                        {hasDiscrepancy ? (
                          <select
                            value={reasons[row.item.id] || 'Physical Counting Error'}
                            onChange={(e) => setReasons(prev => ({ ...prev, [row.item.id]: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-hidden focus:border-purple-500 cursor-pointer"
                          >
                            <option value="Damage / Defective">Damage / Defective</option>
                            <option value="Lost / Missing / Stolen">Lost / Missing / Stolen</option>
                            <option value="Physical Counting Error">Counting Error</option>
                            <option value="Unrecorded Sale">Unrecorded Sale</option>
                            <option value="Unrecorded Restock">Unrecorded Restock</option>
                            <option value="Branch Transfer Unrecorded">Transfer Unrecorded</option>
                            <option value="Other Discrepancy">Other Discrepancy</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No reason needed</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasDiscrepancy ? (
                            canReconcileStock ? (
                              <button
                                type="button"
                                onClick={() => handleReconcileItem(row)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs cursor-pointer"
                                title="Reconcile and adjust stock now"
                              >
                                Reconcile
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                Variance
                              </span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => onInspectItemTimeline(row.item)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Inspect Item Lifecycle"
                            >
                              <History className="w-4 h-4 text-purple-600" />
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
      </div>
    </div>
  );
};
