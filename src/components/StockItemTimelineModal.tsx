import React, { useState, useMemo } from 'react';
import { 
  History, 
  X, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft, 
  ShieldAlert, 
  Building2, 
  Clock, 
  User, 
  FileSpreadsheet, 
  Search,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { InventoryItem, StockMovement, Branch, UserAccount, isMDUser } from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';

interface StockItemTimelineModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  movements: StockMovement[];
  branches: Branch[];
  currentUser?: UserAccount | null;
}

export const StockItemTimelineModal: React.FC<StockItemTimelineModalProps> = ({
  item,
  onClose,
  movements = [],
  branches = [],
  currentUser,
}) => {
  if (!item) return null;

  const isMD = currentUser 
    ? (isMDUser(currentUser) || currentUser.role === 'Admin')
    : false;

  const [searchFilter, setSearchFilter] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  // Filter movements related to this specific item
  const itemMovements = useMemo(() => {
    return movements.filter((mov) => {
      const matchId = mov.itemId && mov.itemId === item.id;
      const matchSku = mov.sku && mov.sku.toLowerCase() === item.sku.toLowerCase();
      const matchName = mov.itemName && mov.itemName.toLowerCase() === item.name.toLowerCase();
      return matchId || matchSku || matchName;
    }).filter((mov) => {
      if (selectedBranchFilter !== 'ALL') {
        const inFrom = mov.fromBranchId === selectedBranchFilter;
        const inTo = mov.toBranchId === selectedBranchFilter;
        if (!inFrom && !inTo) return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const inNotes = (mov.notes || '').toLowerCase().includes(q);
        const inBy = (mov.performedBy || '').toLowerCase().includes(q);
        const inParty = (mov.party || '').toLowerCase().includes(q);
        const inDate = (mov.date || '').toLowerCase().includes(q);
        if (!inNotes && !inBy && !inParty && !inDate) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime());
  }, [movements, item, selectedBranchFilter, searchFilter]);

  // Export item card to CSV
  const handleExportItemCSV = () => {
    const headers = ['Date', 'Type', 'Quantity', 'From Branch', 'To Branch', 'Performed By', 'Party / Ref', 'Notes'];
    const rows = itemMovements.map(m => [
      `"${formatDateDMY(m.date) || ''}"`,
      `"${m.type || ''}"`,
      m.quantity,
      `"${m.fromBranchName || ''}"`,
      `"${m.toBranchName || ''}"`,
      `"${m.performedBy || ''}"`,
      `"${m.party || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stock_card_${item.sku}_${item.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-xl text-white shadow-2xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">{item.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 font-mono text-[11px] font-bold">
                  SKU: {item.sku}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{item.category}</span>
                <span>•</span>
                <span>{item.brand} {item.model ? `• ${item.model}` : ''}</span>
                {item.supplier && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-200 bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-500/40 text-[10px] font-bold">
                      🏢 {item.supplier}
                    </span>
                  </>
                )}
                {item.warranty && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-200 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40 text-[10px] font-bold">
                      🛡️ {item.warranty}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportItemCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Export this item's movement history"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Card</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Item Stock Summary Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {isMD ? (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Buying Cost</span>
              <div className="font-mono font-black text-amber-900 text-sm mt-0.5">
                {formatMMK(item.costPrice)}
              </div>
            </div>
          ) : (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
              <div className="font-semibold text-slate-800 text-sm mt-0.5 truncate">
                {item.category}
              </div>
            </div>
          )}
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</span>
            <div className="font-mono font-black text-blue-900 text-sm mt-0.5">
              {formatMMK(item.sellingPrice)}
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-200">
            <span className="text-[10px] font-bold text-purple-900 uppercase">Total System Stock</span>
            <div className="font-mono font-black text-purple-700 text-sm mt-0.5">
              {item.totalStock} units
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Branch Breakdown</span>
            <div className="text-[11px] font-bold text-slate-700 mt-0.5 truncate">
              {branches.map(b => `${b.code}: ${item.branchStock?.[b.id] || 0}`).join(' | ')}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes, staff, supplier..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Branch Events</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} ({b.name})</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-500">
            {itemMovements.length} logged stock events
          </span>
        </div>

        {/* Movements History Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {itemMovements.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="font-bold text-slate-600 text-sm">No movement history logged yet for this item</p>
              <p className="text-xs text-slate-400 mt-1">
                Stock in, sales, branch transfers, and ground audit adjustments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {itemMovements.map((mov) => {
                let badge = <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">{mov.type}</span>;
                let sign = '';
                let qtyColor = 'text-slate-800';

                if (mov.type === 'STOCK_IN') {
                  badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200"><ArrowDownToLine className="w-3 h-3" /> STOCK IN (RESTOCK)</span>;
                  sign = '+';
                  qtyColor = 'text-emerald-600';
                } else if (mov.type === 'STOCK_OUT') {
                  badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200"><ArrowUpFromLine className="w-3 h-3" /> STOCK OUT / SALE</span>;
                  sign = '-';
                  qtyColor = 'text-rose-600';
                } else if (mov.type === 'TRANSFER') {
                  badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200"><ArrowRightLeft className="w-3 h-3" /> BRANCH TRANSFER</span>;
                  qtyColor = 'text-blue-600';
                } else if (mov.type === 'AUDIT_ADJUSTMENT') {
                  badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200"><ShieldAlert className="w-3 h-3" /> GROUND AUDIT ADJUST</span>;
                  qtyColor = 'text-orange-600';
                } else if (mov.type === 'RETURN_TO_SUPPLIER') {
                  badge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200"><ShieldAlert className="w-3 h-3" /> RETURN TO SUPPLIER</span>;
                  sign = '-';
                  qtyColor = 'text-amber-600';
                }

                return (
                  <div key={mov.id} className="p-3 bg-white rounded-xl border border-slate-200 hover:border-purple-300 transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge}
                        <span className="font-mono text-slate-500 font-bold">{formatDateDMY(mov.date)}</span>
                        {mov.fromBranchName && mov.toBranchName && mov.type === 'TRANSFER' && (
                          <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            {mov.fromBranchName} ➔ {mov.toBranchName}
                          </span>
                        )}
                        {mov.toBranchName && mov.type !== 'TRANSFER' && (
                          <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                            Location: {mov.toBranchName}
                          </span>
                        )}
                      </div>

                      <div className="text-slate-700 font-medium">
                        {mov.notes || 'Routine stock record'}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>By: {mov.performedBy || 'System User'}</span>
                        </span>
                        {mov.party && (
                          <span>Party / Supplier: {mov.party}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-base font-black font-mono ${qtyColor}`}>
                        {sign}{mov.quantity} units
                      </div>
                      {isMD && mov.unitCost !== undefined && mov.unitCost > 0 && (
                        <div className="text-[10px] font-mono text-slate-500">
                          @ {formatMMK(mov.unitCost)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
