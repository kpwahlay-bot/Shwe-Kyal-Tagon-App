import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  User, 
  Phone, 
  Printer, 
  X, 
  Package, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  MapPin,
  Calendar,
  Eye,
  Tag,
  Receipt
} from 'lucide-react';
import { DailySale, Branch, InventoryItem, PurchaseRecord } from '../types';
import { formatMMK, formatDateDMY, formatNumber } from '../utils/formatters';
import { isNoWarrantyItem, resolveItemWarranty } from '../utils/inventoryHelper';

interface CustomerWarrantyTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: DailySale[];
  branches: Branch[];
  inventory?: InventoryItem[];
  purchases?: PurchaseRecord[];
  onSelectSaleVoucher?: (sale: DailySale) => void;
  onSelectVoucherToPrint?: (sale: DailySale) => void;
}

// Helper to calculate warranty expiration from sale date and warranty string
export const calculateWarrantyStatus = (saleDateStr: string, warrantyStr?: string) => {
  const clean = (warrantyStr || '').trim();
  if (!clean || clean === '-' || clean.toLowerCase().includes('no warranty') || clean === '0' || clean.toLowerCase() === 'none') {
    return { 
      status: 'NO_WARRANTY' as const, 
      label: 'No Warranty', 
      warrantyText: 'No Warranty',
      daysRemaining: 0 
    };
  }

  const warrantyText = clean.toLowerCase().includes('warranty') ? clean : `${clean} Warranty`;
  const saleDate = new Date(saleDateStr);
  let months = 0;

  if (clean.toLowerCase().includes('year') || clean.toLowerCase().includes('yr')) {
    const years = parseInt(clean, 10) || 1;
    months = years * 12;
  } else if (clean.toLowerCase().includes('month') || clean.toLowerCase().includes('mo')) {
    months = parseInt(clean, 10) || 6;
  } else if (clean.toLowerCase().includes('day')) {
    const days = parseInt(clean, 10) || 7;
    const expireDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expireDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      status: daysRemaining >= 0 ? ('ACTIVE' as const) : ('EXPIRED' as const),
      label: daysRemaining >= 0 ? `${daysRemaining} days remaining` : 'Expired',
      warrantyText,
      expireDate: expireDate.toISOString().split('T')[0],
      daysRemaining,
    };
  } else {
    const num = parseInt(clean, 10);
    months = (num && num > 0) ? num * 12 : 12;
  }

  const expireDate = new Date(saleDate);
  expireDate.setMonth(expireDate.getMonth() + months);

  const now = new Date();
  const diffMs = expireDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    status: daysRemaining >= 0 ? ('ACTIVE' as const) : ('EXPIRED' as const),
    label: daysRemaining >= 0 ? `${daysRemaining} days left` : 'Expired',
    warrantyText,
    expireDate: expireDate.toISOString().split('T')[0],
    daysRemaining,
  };
};

export const CustomerWarrantyTrackerModal: React.FC<CustomerWarrantyTrackerModalProps> = ({
  isOpen,
  onClose,
  sales,
  branches,
  inventory = [],
  purchases = [],
  onSelectSaleVoucher,
  onSelectVoucherToPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDetailSale, setViewingDetailSale] = useState<DailySale | null>(null);

  // Helper to resolve warranty if undefined in old sale
  const getResolvedSaleWarranty = (s: DailySale): string => {
    if (s.saleType === 'SERVICE') {
      return 'No Warranty';
    }
    if (isNoWarrantyItem(s.sku, undefined, s.category, s.itemName)) {
      const raw = (s.warranty || '').trim();
      if (raw && !raw.toLowerCase().includes('1 year') && raw.toLowerCase() !== 'no warranty' && raw !== '-') {
        return raw;
      }
      return 'No Warranty';
    }
    const raw = (s.warranty || '').trim();
    if (raw.toLowerCase() === 'no warranty' || raw.toLowerCase() === 'none') {
      return 'No Warranty';
    }
    if (raw && raw !== '-' && raw !== '0') {
      return raw;
    }
    // Search inventory
    if (inventory && inventory.length > 0) {
      let matched = s.inventoryItemId ? inventory.find(i => i.id === s.inventoryItemId) : undefined;
      if (!matched && s.sku) {
        matched = inventory.find(i => i.sku && i.sku.trim().toLowerCase() === s.sku.trim().toLowerCase());
      }
      if (!matched && s.itemName) {
        const cleanName = s.itemName.toLowerCase().replace(/\[.*?\]/g, '').trim();
        matched = inventory.find(i => i.name.toLowerCase().trim() === cleanName);
      }
      if (matched && matched.warranty && matched.warranty.trim() && matched.warranty.trim() !== '-') {
        return resolveItemWarranty(matched.sku, matched.brand, matched.category, matched.name, matched.warranty.trim());
      }
    }
    // Search purchases
    if (purchases && purchases.length > 0) {
      for (const po of purchases) {
        const pi = po.items?.find(p => (s.sku && p.sku && p.sku.toLowerCase() === s.sku.toLowerCase()) || (p.name && s.itemName && p.name.toLowerCase().trim() === s.itemName.toLowerCase().trim()));
        if (pi?.warranty && pi.warranty.trim() && pi.warranty.trim() !== '-') {
          return resolveItemWarranty(s.sku, undefined, s.category, s.itemName, pi.warranty.trim());
        }
      }
    }
    return resolveItemWarranty(s.sku, undefined, s.category, s.itemName, raw, '1 Year');
  };

  // Filter sales based on customer phone, name, invoice number, or device serial/IMEI
  const matchedSales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Default to latest 15 sales
      return sales.slice(0, 15);
    }

    return sales.filter((s) => {
      const matchPhone = s.customerPhone && s.customerPhone.toLowerCase().includes(query);
      const matchName = s.customerName && s.customerName.toLowerCase().includes(query);
      const matchInvoice = s.invoiceNo && s.invoiceNo.toLowerCase().includes(query);
      const matchSerial = s.deviceSerial && s.deviceSerial.toLowerCase().includes(query);
      const matchNotes = s.notes && s.notes.toLowerCase().includes(query);
      const matchItem = s.itemName && s.itemName.toLowerCase().includes(query);
      return matchPhone || matchName || matchInvoice || matchSerial || matchNotes || matchItem;
    });
  }, [sales, searchQuery]);

  // Aggregate customer details if phone is searched
  const customerProfile = useMemo(() => {
    const query = searchQuery.trim();
    if (!query || matchedSales.length === 0) return null;

    const first = matchedSales[0];
    const totalSpent = matchedSales.reduce((sum, s) => sum + (s.salePrice || 0), 0);
    const uniqueTownships = Array.from(
      new Set(matchedSales.map((s) => s.township).filter(Boolean))
    );

    return {
      name: first.customerName || 'Customer',
      phone: first.customerPhone || query,
      township: uniqueTownships.join(', ') || 'Yangon',
      totalPurchases: matchedSales.length,
      totalSpent,
    };
  }, [matchedSales, searchQuery]);

  const handleOpenPrintVoucher = (sale: DailySale) => {
    if (onSelectSaleVoucher) {
      onSelectSaleVoucher(sale);
    } else if (onSelectVoucherToPrint) {
      onSelectVoucherToPrint(sale);
    } else {
      setViewingDetailSale(sale);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Customer CRM & Warranty Tracker
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Search customer records and view purchased vouchers with warranty details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="w-5 h-5 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Phone (09xxxxxxxxx), Customer Name, Invoice No, or Serial..."
              autoFocus
              className="w-full pl-11 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden text-sm font-medium transition-all"
            />
          </div>
        </div>

        {/* Customer Profile Banner if available */}
        {customerProfile && searchQuery.trim().length >= 3 && (
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>{customerProfile.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 font-semibold">
                    {customerProfile.phone}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{customerProfile.township}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Orders</div>
                <div className="text-sm font-bold text-slate-900">{customerProfile.totalPurchases} Vouchers</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Lifetime Spend</div>
                <div className="text-sm font-extrabold font-mono text-amber-700">
                  {formatMMK(customerProfile.totalSpent)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales & Warranty List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
            <span>Customer Vouchers & Warranty Records ({matchedSales.length})</span>
            {searchQuery && (
              <span className="text-slate-400 font-normal">
                Filtering by: "{searchQuery}"
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {matchedSales.map((sale) => {
              const warranty = calculateWarrantyStatus(sale.date, getResolvedSaleWarranty(sale));
              const branch = branches.find((b) => b.id === sale.branchId);

              return (
                <div
                  key={sale.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setViewingDetailSale(sale)}
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-xs font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{sale.invoiceNo}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {formatDateDMY(sale.date)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {branch ? `${branch.code} (${branch.city})` : sale.branchName}
                      </span>
                      {sale.saleType === 'SERVICE' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          SERVICE REPAIR
                        </span>
                      )}
                      {sale.isVipCustomer && (
                        <span className="text-[10px] text-slate-700 font-semibold">
                          (VIP Customer)
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug hover:text-amber-700 transition-colors">
                      {sale.itemName}
                    </h4>

                    {/* Serial / Notes */}
                    <div className="text-xs text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-3">
                      {sale.deviceSerial && (
                        <span>No: <strong className="text-slate-700">{sale.deviceSerial}</strong></span>
                      )}
                      {sale.customerName && (
                        <span>Customer: <strong className="text-slate-700">{sale.customerName}</strong></span>
                      )}
                      {sale.customerPhone && (
                        <span>Phone: <strong className="text-slate-700">{sale.customerPhone}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Warranty Badge, Amount & Actions */}
                  <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-slate-900">
                        {formatMMK(sale.salePrice)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Paid via {sale.paymentMethod}
                      </div>
                    </div>

                    {/* Warranty Status & Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {warranty.status === 'ACTIVE' ? (
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{warranty.warrantyText} • {warranty.label}</span>
                        </div>
                      ) : warranty.status === 'EXPIRED' ? (
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                          <span>{warranty.warrantyText} • Expired</span>
                        </div>
                      ) : (
                        <div className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                          No Warranty
                        </div>
                      )}

                      {/* Detail View Button */}
                      <button
                        type="button"
                        onClick={() => setViewingDetailSale(sale)}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                        title="View Voucher Detail"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Detail</span>
                      </button>

                      {/* Print Voucher Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenPrintVoucher(sale)}
                        className="p-1 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        title="Print Commercial Voucher"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {matchedSales.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No customer purchase or warranty records found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Modal Detailed Voucher Viewer */}
      {viewingDetailSale && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingDetailSale(null);
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">
                    Voucher Detail: #{viewingDetailSale.invoiceNo}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {formatDateDMY(viewingDetailSale.date)} • {viewingDetailSale.branchName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailSale(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Details Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Customer Info Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer Information
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2 text-slate-900">
                  <div className="font-bold text-sm">
                    {viewingDetailSale.customerName || 'Walk-in Customer'}
                    {viewingDetailSale.isVipCustomer && (
                      <span className="ml-1.5 font-normal text-slate-600">
                        (VIP Customer)
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-slate-700 font-semibold">
                    {viewingDetailSale.customerPhone || 'N/A'}
                  </div>
                </div>
                {viewingDetailSale.township && (
                  <div className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewingDetailSale.township}</span>
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Purchased Items & Warranty Terms
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {viewingDetailSale.items && viewingDetailSale.items.length > 0 ? (
                    viewingDetailSale.items.map((it, idx) => {
                      const itemWarranty = calculateWarrantyStatus(viewingDetailSale.date, resolveItemWarranty(it.sku, it.brand, it.category, it.name, it.warranty));
                      return (
                        <div key={idx} className="p-3 bg-white space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900">{it.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                SKU: {it.sku} {it.imeiOrSerial ? `• No: ${it.imeiOrSerial}` : ''}
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-slate-900">
                              {formatMMK(it.total)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500">
                              Qty: {it.quantity} @ {formatMMK(it.unitPrice)}
                            </span>
                            {itemWarranty.status === 'NO_WARRANTY' ? (
                              <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                No Warranty
                              </span>
                            ) : (
                              <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                itemWarranty.status === 'ACTIVE' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {itemWarranty.warrantyText} • {itemWarranty.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 bg-white space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900">{viewingDetailSale.itemName}</div>
                          {viewingDetailSale.deviceSerial && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              No: {viewingDetailSale.deviceSerial}
                            </div>
                          )}
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900">
                          {formatMMK(viewingDetailSale.salePrice)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-500">
                          Qty: {viewingDetailSale.quantity || 1}
                        </span>
                        {(() => {
                          const wStatus = calculateWarrantyStatus(viewingDetailSale.date, getResolvedSaleWarranty(viewingDetailSale));
                          return wStatus.status === 'NO_WARRANTY' ? (
                            <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                              No Warranty
                            </span>
                          ) : (
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              wStatus.status === 'ACTIVE' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {wStatus.warrantyText} • {wStatus.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono">
                {viewingDetailSale.discount ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatMMK((viewingDetailSale.salePrice || 0) + (viewingDetailSale.discount || 0))}</span>
                    </div>
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Discount:</span>
                      <span>- {formatMMK(viewingDetailSale.discount)}</span>
                    </div>
                  </>
                ) : null}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>Net Total:</span>
                  <span className="text-amber-800">{formatMMK(viewingDetailSale.salePrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid Amount:</span>
                  <span>{formatMMK(viewingDetailSale.paidAmount !== undefined ? viewingDetailSale.paidAmount : viewingDetailSale.salePrice)}</span>
                </div>
                {viewingDetailSale.remainingDebt ? (
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Remaining Due:</span>
                    <span>{formatMMK(viewingDetailSale.remainingDebt)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>Payment Method:</span>
                  <span className="font-sans font-bold text-slate-800">{viewingDetailSale.paymentMethod}</span>
                </div>
                {viewingDetailSale.salespersonName && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Salesperson / Staff:</span>
                    <span className="font-sans font-medium text-slate-800">{viewingDetailSale.salespersonName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingDetailSale(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const saleToPrint = viewingDetailSale;
                  setViewingDetailSale(null);
                  handleOpenPrintVoucher(saleToPrint);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print A5 Commercial Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
