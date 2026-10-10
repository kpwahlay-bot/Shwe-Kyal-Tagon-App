import React from 'react';
import { DailySale, CustomerProfile } from '../types';
import { formatMMK, formatDateDMY } from '../utils/formatters';
import { 
  X, 
  Crown, 
  Phone, 
  MapPin, 
  Calendar, 
  Receipt, 
  ShoppingBag, 
  CreditCard, 
  ExternalLink,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile | null;
  historySales: DailySale[];
  onSelectVoucher?: (sale: DailySale) => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  historySales,
  onSelectVoucher,
}) => {
  if (!isOpen || !customer) return null;

  const totalCustomerCredit = React.useMemo(() => {
    return historySales.reduce((sum, s) => {
      const debt = s.remainingDebt !== undefined ? s.remainingDebt : (s.paymentStatus === 'CREDIT' ? s.salePrice : 0);
      return sum + (s.paymentStatus !== 'PAID' ? Math.max(0, debt) : 0);
    }, 0);
  }, [historySales]);

  const creditVouchers = React.useMemo(() => {
    return historySales.filter((sale) => {
      const debt = sale.remainingDebt !== undefined ? sale.remainingDebt : (sale.paymentStatus === 'CREDIT' ? sale.salePrice : 0);
      return debt > 0 && sale.paymentStatus !== 'PAID';
    });
  }, [historySales]);

  const [historyTab, setHistoryTab] = React.useState<'CREDIT' | 'ALL'>('CREDIT');

  const filteredHistorySales = React.useMemo(() => {
    if (historyTab === 'CREDIT') {
      return creditVouchers;
    }
    return historySales;
  }, [historySales, historyTab, creditVouchers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${customer.isVip ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-slate-800 text-amber-400'}`}>
              {customer.isVip ? <Crown className="w-5 h-5 fill-slate-950" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {customer.name}
                </h2>
                {customer.isVip && (
                  <span className="text-xs font-semibold text-amber-400">
                    (VIP Customer)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {customer.phone || 'No Phone Recorded'}
                </span>
                {customer.township && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {customer.township}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Statistics Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Purchases
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-slate-900">
                {customer.totalPurchaseCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">orders</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Items
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-amber-600">
                {customer.totalItemsPurchased}
              </span>
              <span className="text-xs text-slate-400 font-medium">items</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Total Spent
            </span>
            <div className="text-lg font-mono font-black text-emerald-700 truncate" title={formatMMK(customer.totalSpent)}>
              {formatMMK(customer.totalSpent)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
            <span className="text-[10.5px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">
              Total Credit
            </span>
            <div className={`text-lg font-mono font-black truncate ${totalCustomerCredit > 0 ? 'text-rose-600' : 'text-slate-400'}`} title={formatMMK(totalCustomerCredit)}>
              {formatMMK(totalCustomerCredit)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              Customer Tier
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {customer.isVip ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Award className="w-3.5 h-3.5" />
                  VIP Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  Regular Customer
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Purchase History Timeline / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setHistoryTab('CREDIT')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  historyTab === 'CREDIT'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Credit / Debt Vouchers ({creditVouchers.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  historyTab === 'ALL'
                    ? 'bg-white text-indigo-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Vouchers (ALL) ({historySales.length})
              </button>
            </div>

            <span className="text-slate-500 font-mono text-[11px]">
              {filteredHistorySales.length} Shown ({historySales.length} Total)
            </span>
          </div>

          {filteredHistorySales.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-600">No vouchers found for this filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Switch to ALL tab to view all purchased vouchers</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredHistorySales.map((sale) => {
                const isMultiItem = sale.items && sale.items.length > 0;
                const itemsCount = isMultiItem
                  ? sale.items!.reduce((s, i) => s + (i.quantity || 1), 0)
                  : (sale.quantity || 1);

                return (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          #{sale.invoiceNo}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateDMY(sale.date)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sale.branchName || 'Main Branch'}
                        </span>
                        {sale.saleType === 'SERVICE' && (
                          <span className="text-[10.5px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                            Service / Repair
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-slate-900">
                        {sale.itemName}
                        {itemsCount > 1 && (
                          <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                            {itemsCount} items
                          </span>
                        )}
                      </div>

                      {isMultiItem && (
                        <div className="text-xs text-slate-500 pl-2 border-l-2 border-slate-200 space-y-0.5">
                          {sale.items!.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <span>• {it.name} (x{it.quantity})</span>
                              <span className="font-mono text-slate-700">{formatMMK(it.total || it.unitPrice * it.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {sale.paymentMethod || 'Cash'}
                        </span>
                        <span>•</span>
                        <span>Sales Person: {sale.salespersonName || sale.employeeName || 'Staff'}</span>
                        {sale.warranty && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold">Warranty: {sale.warranty}</span>
                          </>
                        )}
                      </div>

                      {sale.paymentHistory && sale.paymentHistory.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                            <span className="flex items-center gap-1">
                              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Repayment & Settlement History ({sale.paymentHistory.length})</span>
                            </span>
                            <span className="font-mono">
                              Paid Total: {formatMMK(sale.paymentHistory.reduce((s, p) => s + p.amount, 0))}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            {sale.paymentHistory.map((ph, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between gap-2 bg-white px-2 py-1 rounded border border-emerald-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-700">{formatDateDMY(ph.date)}</span>
                                  {ph.installmentNo && (
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                                      Month {ph.installmentNo}
                                    </span>
                                  )}
                                  {ph.notes && <span className="text-slate-500 italic">({ph.notes})</span>}
                                </div>
                                <span className="font-mono font-bold text-emerald-700">
                                  +{formatMMK(ph.amount)} ({ph.paymentMethod || 'Cash'})
                                </span>
                              </div>
                            ))}
                          </div>
                          {sale.remainingDebt !== undefined && sale.remainingDebt > 0 && (
                            <div className="text-[11px] font-semibold text-rose-700 flex justify-between pt-0.5">
                              <span>Remaining Debt Balance:</span>
                              <span className="font-mono font-bold">{formatMMK(sale.remainingDebt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Balance</span>
                        <span className="text-base font-mono font-black text-slate-900 block">
                          {formatMMK(sale.salePrice)}
                        </span>
                        {sale.discount && sale.discount > 0 ? (
                          <span className="text-[11px] text-rose-500 font-mono">
                            Discount: -{formatMMK(sale.discount)}
                          </span>
                        ) : null}
                      </div>

                      {onSelectVoucher && (
                        <button
                          type="button"
                          onClick={() => onSelectVoucher(sale)}
                          className="mt-2 px-2.5 py-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Voucher</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Shwe Kyal Tagon Customer Loyalty & History Engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
