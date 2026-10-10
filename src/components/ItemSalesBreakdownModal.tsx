import React, { useState, useMemo } from 'react';
import { 
  X, 
  Package, 
  Search, 
  TrendingUp, 
  FileSpreadsheet, 
  ArrowUpDown, 
  Layers, 
  Building2,
  Calendar
} from 'lucide-react';
import { DailySale, InventoryItem, Branch } from '../types';
import { formatMMK, formatNumber } from '../utils/formatters';

interface ItemSalesBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: DailySale[];
  inventory: InventoryItem[];
  branches: Branch[];
  activeBranchFilter: string;
  periodLabel: string;
}

interface ItemSalesStat {
  itemId: string;
  name: string;
  category: string;
  brand: string;
  sku: string;
  unitsSold: number;
  totalRevenue: number;
  currentStock: number;
  avgSellingPrice: number;
}

export const ItemSalesBreakdownModal: React.FC<ItemSalesBreakdownModalProps> = ({
  isOpen,
  onClose,
  sales,
  inventory,
  branches,
  activeBranchFilter,
  periodLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState<'unitsSold' | 'revenue' | 'name' | 'stock'>('unitsSold');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Compute stats per item
  const itemStats = useMemo(() => {
    const statsMap: Record<string, ItemSalesStat> = {};

    // 1. Gather all items from sales
    sales.forEach(sale => {
      if (sale.cartItems && sale.cartItems.length > 0) {
        sale.cartItems.forEach(ci => {
          const key = ci.itemId || ci.sku || ci.name.trim().toLowerCase();
          const qty = ci.quantity || 1;
          const rev = ci.totalPrice || (ci.unitPrice * qty);
          
          if (!statsMap[key]) {
            statsMap[key] = {
              itemId: ci.itemId || key,
              name: ci.name,
              category: ci.category || 'General',
              brand: '',
              sku: ci.sku || '',
              unitsSold: 0,
              totalRevenue: 0,
              currentStock: 0,
              avgSellingPrice: ci.unitPrice,
            };
          }
          statsMap[key].unitsSold += qty;
          statsMap[key].totalRevenue += rev;
        });
      } else {
        const key = sale.inventoryItemId || sale.sku || sale.itemName.trim().toLowerCase();
        const qty = sale.quantity || 1;
        const rev = sale.netPayable || sale.totalAmount || (sale.unitPrice * qty);

        if (!statsMap[key]) {
          statsMap[key] = {
            itemId: sale.inventoryItemId || key,
            name: sale.itemName,
            category: sale.category || 'General',
            brand: '',
            sku: sale.sku || '',
            unitsSold: 0,
            totalRevenue: 0,
            currentStock: 0,
            avgSellingPrice: sale.unitPrice || 0,
          };
        }
        statsMap[key].unitsSold += qty;
        statsMap[key].totalRevenue += rev;
      }
    });

    // 2. Also map to existing inventory to fill brand, stock, proper name
    const list: ItemSalesStat[] = Object.values(statsMap).map(stat => {
      const inv = inventory.find(i => 
        i.id === stat.itemId || 
        (stat.sku && i.sku === stat.sku) || 
        i.name.trim().toLowerCase() === stat.name.trim().toLowerCase()
      );
      if (inv) {
        const stock = activeBranchFilter === 'ALL'
          ? inv.totalStock
          : (inv.branchStock[activeBranchFilter] || 0);
        return {
          ...stat,
          name: inv.name,
          category: inv.category || stat.category,
          brand: inv.brand || '',
          sku: inv.sku || stat.sku,
          currentStock: stock,
          avgSellingPrice: stat.unitsSold > 0 ? Math.round(stat.totalRevenue / stat.unitsSold) : inv.sellingPrice,
        };
      }
      return stat;
    });

    return list;
  }, [sales, inventory, activeBranchFilter]);

  if (!isOpen) return null;

  // Filtered & Sorted
  const filteredList = itemStats
    .filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let valA = a.unitsSold;
      let valB = b.unitsSold;
      if (sortBy === 'revenue') {
        valA = a.totalRevenue;
        valB = b.totalRevenue;
      } else if (sortBy === 'stock') {
        valA = a.currentStock;
        valB = b.currentStock;
      } else if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  const totalUnits = filteredList.reduce((acc, i) => acc + i.unitsSold, 0);
  const totalRev = filteredList.reduce((acc, i) => acc + i.totalRevenue, 0);

  const categories = Array.from(new Set(itemStats.map(i => i.category))).filter(Boolean);

  const handleExportCSV = () => {
    const headers = ['No,Item Name,Category,Brand,SKU,Units Sold,Avg Price,Total Revenue,Current Stock'];
    const rows = filteredList.map((item, idx) => 
      `${idx + 1},"${item.name.replace(/"/g, '""')}","${item.category}","${item.brand}","${item.sku}",${item.unitsSold},${item.avgSellingPrice},${item.totalRevenue},${item.currentStock}`
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Item_Sales_Breakdown_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Item-wise Sales Breakdown</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-mono font-bold border border-emerald-700/50">
                  {periodLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Item-wise quantity sold and total revenue performance for the selected period
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Summary Strip */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Items Sold</span>
            <p className="text-lg font-black text-slate-900 font-mono">{filteredList.length} Items</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/20">
            <span className="text-[10px] text-emerald-700 font-bold uppercase">Total Units Sold</span>
            <p className="text-lg font-black text-emerald-700 font-mono">{formatNumber(totalUnits)} pcs</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-200 bg-purple-50/20 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-purple-700 font-bold uppercase">Total Sales Value</span>
            <p className="text-lg font-black text-purple-800 font-mono">{formatMMK(totalRev)}</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search item name, brand, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-hidden shrink-0"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Main Items Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm text-slate-600">No items sold during the selected period</p>
              <p className="text-xs text-slate-400 mt-1">Item-level sales performance and analytics will appear here once sales are recorded</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">NO.</th>
                  <th className="py-2.5 px-3">
                    <button 
                      onClick={() => {
                        setSortBy('name');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    >
                      <span>ITEM / MODEL</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3">CATEGORY</th>
                  <th className="py-2.5 px-3 text-center bg-emerald-50/70 text-emerald-900">
                    <button 
                      onClick={() => {
                        setSortBy('unitsSold');
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-emerald-950 font-black cursor-pointer"
                    >
                      <span>UNITS SOLD</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">AVG PRICE</th>
                  <th className="py-2.5 px-3 text-right bg-purple-50/70 text-purple-900">
                    <button 
                      onClick={() => {
                        setSortBy('revenue');
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-purple-950 font-black cursor-pointer"
                    >
                      <span>TOTAL REVENUE</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-center bg-slate-100/70 text-slate-800">
                    <button 
                      onClick={() => {
                        setSortBy('stock');
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      }}
                      className="inline-flex items-center gap-1 hover:text-slate-950 font-bold cursor-pointer"
                    >
                      <span>REMAINING STOCK</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item, idx) => (
                  <tr key={item.itemId || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.sku && (
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center bg-emerald-50/30">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        {formatNumber(item.unitsSold)} pcs
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatMMK(item.avgSellingPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900 bg-purple-50/30">
                      {formatMMK(item.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3 text-center bg-slate-50/50">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                        item.currentStock > 5 
                          ? 'bg-blue-50 text-blue-800 border border-blue-200' 
                          : item.currentStock > 0 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {formatNumber(item.currentStock)} in stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium">
            Showing {filteredList.length} item sales records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
