import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building2, 
  Package, 
  ShoppingBag, 
  Receipt, 
  DollarSign, 
  ArrowRightLeft, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Trash2, 
  Layers, 
  RefreshCw,
  Wrench,
  Eye,
  Info,
  X
} from 'lucide-react';
import { ActivityLogEntry, Branch, UserAccount } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';
import { DateRangeFilter, DateFilterState, isDateWithinFilter } from './DateRangeFilter';

interface ActivityLogViewProps {
  logs: ActivityLogEntry[];
  branches: Branch[];
  users: UserAccount[];
  currentUser?: UserAccount;
  onClearLogs?: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs = [],
  branches = [],
  users = [],
  currentUser,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filters State
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    preset: 'MONTHLY',
    startDate: `${todayStr.slice(0, 7)}-01`,
    endDate: todayStr,
  });

  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<ActivityLogEntry | null>(null);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date Filter
      if (!isDateWithinFilter(log.date || log.timestamp?.slice(0, 10), dateFilter)) {
        return false;
      }

      // Module Filter
      if (selectedModule !== 'ALL' && log.module !== selectedModule) {
        return false;
      }

      // Action Filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Branch Filter
      if (selectedBranchId !== 'ALL' && log.branchId !== selectedBranchId && log.branchId !== 'ALL') {
        return false;
      }

      // User Filter
      if (selectedUserId !== 'ALL') {
        if (log.userId) {
          if (log.userId !== selectedUserId) return false;
        } else {
          // Fallback match user by name
          const targetUser = users.find(u => u.id === selectedUserId);
          if (targetUser && !log.userName.toLowerCase().includes(targetUser.displayName.toLowerCase())) {
            return false;
          }
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (log.title || '').toLowerCase().includes(q);
        const inDesc = (log.description || '').toLowerCase().includes(q);
        const inUser = (log.userName || '').toLowerCase().includes(q);
        const inItem = (log.details?.itemName || '').toLowerCase().includes(q);
        const inSku = (log.details?.sku || '').toLowerCase().includes(q);
        const inInv = (log.details?.invoiceNo || log.details?.referenceNo || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inUser && !inItem && !inSku && !inInv) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
  }, [logs, dateFilter, selectedModule, selectedAction, selectedBranchId, selectedUserId, searchQuery, users]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let restockEvents = 0;
    let totalRestockUnits = 0;
    let salesEvents = 0;
    let totalSalesValue = 0;
    let expenseEvents = 0;
    let auditAdjustments = 0;

    filteredLogs.forEach((l) => {
      if (l.action === 'RESTOCK' || (l.module === 'INVENTORY' && l.action === 'CREATE')) {
        restockEvents++;
        if (l.details?.quantity) totalRestockUnits += Number(l.details.quantity);
      }
      if (l.module === 'SALES' && l.action === 'CREATE') {
        salesEvents++;
        if (l.details?.amount) totalSalesValue += Number(l.details.amount);
      }
      if (l.module === 'EXPENSE') {
        expenseEvents++;
      }
      if (l.module === 'AUDIT' || l.action === 'ADJUST') {
        auditAdjustments++;
      }
    });

    return {
      totalLogs: filteredLogs.length,
      restockEvents,
      totalRestockUnits,
      salesEvents,
      totalSalesValue,
      expenseEvents,
      auditAdjustments
    };
  }, [filteredLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No activity logs found for the selected filter.');
      return;
    }

    const headers = [
      'Timestamp',
      'Date',
      'User Name',
      'User Role',
      'Branch',
      'Module',
      'Action',
      'Title',
      'Description',
      'Item SKU',
      'Item Name',
      'Quantity',
      'Amount (MMK)',
      'Reference / Invoice No',
      'Notes'
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.timestamp || l.createdAt}"`,
      `"${formatDateDMY(l.date) || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.userRole || ''}"`,
      `"${l.branchName || ''}"`,
      `"${l.module || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.details?.sku || ''}"`,
      `"${(l.details?.itemName || '').replace(/"/g, '""')}"`,
      l.details?.quantity !== undefined ? l.details.quantity : '',
      l.details?.amount !== undefined ? l.details.amount : '',
      `"${l.details?.invoiceNo || l.details?.referenceNo || ''}"`,
      `"${(l.details?.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_audit_logs_${dateFilter.startDate || todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper badge renderers
  const renderModuleBadge = (mod: string) => {
    switch (mod) {
      case 'INVENTORY':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300"><Package className="w-3 h-3" /> STOCK</span>;
      case 'SALES':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300"><ShoppingBag className="w-3 h-3" /> SALES</span>;
      case 'SERVICE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300"><Wrench className="w-3 h-3" /> SERVICE</span>;
      case 'EXPENSE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300"><Receipt className="w-3 h-3" /> EXPENSE</span>;
      case 'PURCHASE':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300"><DollarSign className="w-3 h-3" /> PURCHASE</span>;
      case 'BRANCH_TRANSFER':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300"><ArrowRightLeft className="w-3 h-3" /> TRANSFER</span>;
      case 'AUDIT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-300"><ShieldAlert className="w-3 h-3" /> AUDIT</span>;
      case 'USERS':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300"><User className="w-3 h-3" /> ACCOUNT</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-300"><Layers className="w-3 h-3" /> {mod}</span>;
    }
  };

  const renderActionBadge = (act: string) => {
    switch (act) {
      case 'CREATE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">CREATE</span>;
      case 'RESTOCK':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">RESTOCK +</span>;
      case 'UPDATE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">UPDATE</span>;
      case 'DELETE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">DELETE</span>;
      case 'TRANSFER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">TRANSFER</span>;
      case 'ADJUST':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-50 text-orange-800 border border-orange-300">ADJUST</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">{act}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl shadow-2xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>System Activity Logs & Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track every user creation, stock restock date, inventory transfer, sales entry, expense, and ground audit adjustment.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Export filtered logs to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Logs (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Events */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Logged Activities</span>
            <Activity className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-1 font-mono">{metrics.totalLogs}</p>
          <span className="text-[10px] text-slate-400">Total in selected period</span>
        </div>

        {/* Restocks */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-900 uppercase">Stock Restocks</span>
            <Package className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1 font-mono">
            +{formatNumber(metrics.totalRestockUnits)} <span className="text-xs font-bold text-emerald-600">units</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">{metrics.restockEvents} restock events</span>
        </div>

        {/* Sales */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-900 uppercase">Sales Invoices</span>
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 mt-1 font-mono">{metrics.salesEvents}</p>
          <span className="text-[10px] text-blue-600 font-medium">Invoices generated</span>
        </div>

        {/* Audit Adjustments */}
        <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-900 uppercase">Ground Audit Adjustments</span>
            <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <p className="text-xl font-black text-orange-700 mt-1 font-mono">{metrics.auditAdjustments}</p>
          <span className="text-[10px] text-orange-600 font-medium">Stock reconcile events</span>
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Date Picker using our custom interactive Calendar */}
          <DateRangeFilter
            value={dateFilter}
            onChange={setDateFilter}
            totalCount={filteredLogs.length}
            label="Filter Date"
          />

          {/* Search Box */}
          <div className="relative w-full xl:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, item, SKU, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-purple-500 focus:bg-white shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-Filters: Module, Action, Branch, User */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-100">
          {/* Module Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-purple-500"
            >
              <option value="ALL">All Modules</option>
              <option value="INVENTORY">Inventory / Stock</option>
              <option value="SALES">Sales Ledger</option>
              <option value="SERVICE">Service & Repair</option>
              <option value="EXPENSE">Expenses</option>
              <option value="PURCHASE">Purchases / Restock</option>
              <option value="BRANCH_TRANSFER">Branch Transfer</option>
              <option value="AUDIT">Ground Stock Audit</option>
              <option value="USERS">User Accounts</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-purple-500"
            >
              <option value="ALL">All Actions</option>
              <option value="RESTOCK">RESTOCK (+ Stock In)</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ADJUST">ADJUST</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Branch:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-purple-500"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">User Account:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:border-purple-500"
            >
              <option value="ALL">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
              ))}
            </select>
          </div>

          {(selectedModule !== 'ALL' || selectedAction !== 'ALL' || selectedBranchId !== 'ALL' || selectedUserId !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedModule('ALL');
                setSelectedAction('ALL');
                setSelectedBranchId('ALL');
                setSelectedUserId('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3.5 px-4 w-36">DATE & TIME</th>
                <th className="py-3.5 px-4 min-w-[160px]">PERFORMED BY</th>
                <th className="py-3.5 px-4 w-28">BRANCH</th>
                <th className="py-3.5 px-4 w-28">MODULE</th>
                <th className="py-3.5 px-4 w-24">ACTION</th>
                <th className="py-3.5 px-4 min-w-[280px]">SUMMARY & EVENT DETAILS</th>
                <th className="py-3.5 px-4 w-24 text-right">QTY / AMT</th>
                <th className="py-3.5 px-3 w-16 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="font-bold text-slate-600 text-sm">No activity logs found</p>
                    <p className="text-xs text-slate-400 mt-1">Actions performed by users will automatically be recorded here in real-time.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const timeFormatted = log.timestamp 
                    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : (log.time || '');

                  return (
                    <tr key={log.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800">{log.date || log.timestamp?.slice(0, 10)}</div>
                        <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{timeFormatted}</span>
                        </div>
                      </td>

                      {/* Performed By */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${log.userAvatarBg || 'bg-slate-700'} shrink-0 shadow-2xs`}>
                            {log.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{log.userName}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{log.userRole}</div>
                          </div>
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{log.branchName || 'Enterprise'}</span>
                        </span>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-4">
                        {renderModuleBadge(log.module)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Summary & Event Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.title}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {log.description}
                        </div>
                        {log.details?.sku && (
                          <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-purple-700">
                            <span className="bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                              SKU: {log.details.sku}
                            </span>
                            {log.details?.supplier && (
                              <span className="text-slate-500">Supplier: {log.details.supplier}</span>
                            )}
                            {log.details?.invoiceNo && (
                              <span className="text-blue-700 font-bold">Inv: {log.details.invoiceNo}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Qty / Amount */}
                      <td className="py-3 px-4 text-right font-mono">
                        {log.details?.quantity !== undefined && (
                          <div className={`font-black ${log.action === 'RESTOCK' ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {log.action === 'RESTOCK' ? `+${log.details.quantity}` : log.details.quantity} <span className="text-[10px] text-slate-400 font-normal">pcs</span>
                          </div>
                        )}
                        {log.details?.amount !== undefined && (
                          <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                            {formatMMK(log.details.amount)}
                          </div>
                        )}
                      </td>

                      {/* Detail Popover / View Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetail(log)}
                          className="p-1.5 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors cursor-pointer"
                          title="View Full Audit Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-slate-900 text-base">Activity Log Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Event Title:</span>
                  <span className="font-black text-slate-900">{selectedLogDetail.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Date & Time:</span>
                  <span className="font-mono text-slate-700">{selectedLogDetail.timestamp || selectedLogDetail.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">User:</span>
                  <span className="font-bold text-slate-900">{selectedLogDetail.userName} ({selectedLogDetail.userRole})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Branch:</span>
                  <span className="font-bold text-slate-900">{selectedLogDetail.branchName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Module / Action:</span>
                  <div className="flex items-center gap-1.5">
                    {renderModuleBadge(selectedLogDetail.module)}
                    {renderActionBadge(selectedLogDetail.action)}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Full Description:</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
                  {selectedLogDetail.description}
                </p>
              </div>

              {selectedLogDetail.details && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Metadata & Payload Details:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLogDetail.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
