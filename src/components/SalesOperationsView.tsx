import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Contact2, 
  Building2, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { 
  DailySale, 
  Branch, 
  Employee, 
  InventoryItem, 
  PurchaseRecord, 
  UserAccount, 
  ContactPartner, 
  SupplierReturn, 
  SupplierBenefit, 
  InterBranchTransfer,
  TreasuryAccount,
  CashierShift
} from '../types';
import { DailySalesLedger } from './DailySalesLedger';
import { ContactPartners } from './ContactPartners';
import { SupplierClaimsAndBenefitsLedger } from './SupplierClaimsAndBenefitsLedger';

export type SalesSubTab = 'pos' | 'customers' | 'suppliers';

interface SalesOperationsViewProps {
  initialSubTab?: SalesSubTab;
  sales: DailySale[];
  branches: Branch[];
  employees: Employee[];
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  users: UserAccount[];
  currentUser: UserAccount;
  activeBranchFilter: string;
  contacts: ContactPartner[];
  supplierReturns: SupplierReturn[];
  supplierBenefits: SupplierBenefit[];
  interBranchTransfers: InterBranchTransfer[];
  treasuryAccounts: TreasuryAccount[];
  shifts: CashierShift[];
  activeShift: CashierShift | null;
  heldBills: any[];
  supplierInitialSubTab?: 'po_payables' | 'claims' | 'rma' | 'directory';
  onAddSale: (sale: DailySale, accountId?: string) => void;
  onUpdateSale: (sale: DailySale) => void;
  onDeleteSale: (id: string, voidMeta?: { authorizedBy: string; reason: string }) => void;
  onStartShift?: (openingCash: number, notes?: string) => void;
  onCloseShift?: (actualCash: number, expectedCash: number, notes?: string) => void;
  onSaveHoldBill?: (bill: any) => void;
  onRemoveHoldBill?: (id: string) => void;
  onCompleteSmartPOSSale?: (saleData: any) => void;
  onAddContact: (contact: ContactPartner) => void;
  onUpdateContact: (contact: ContactPartner) => void;
  onDeleteContact: (id: string) => void;
  onSettleCustomerDebt?: (
    partnerId: string | undefined,
    customerName: string,
    customerPhone: string | undefined,
    amount: number,
    accountId: string,
    notes?: string,
    voucherId?: string,
    paymentMethod?: string
  ) => void;
  onAddSupplierBenefit: (benefit: SupplierBenefit) => void;
  onUpdateSupplierBenefit?: (benefit: SupplierBenefit) => void;
  onDeleteSupplierBenefit: (id: string) => void;
  onSettleSupplierBenefit?: (
    benefitId: string,
    optionsOrAccountId?: {
      settleAction?: 'DEPOSIT_TREASURY' | 'DEDUCT_SUPPLIER_DEBT';
      accountId?: string;
      targetPoId?: string;
      settleDate?: string;
      notes?: string;
    } | string,
    settleDate?: string,
    notes?: string
  ) => void;
  onAddSupplierReturn: (returnRecord: SupplierReturn) => void;
  onDeleteSupplierReturn?: (id: string, restoreStock?: boolean) => void;
  onClearAllSupplierReturns?: () => void;
  onSettleRma: (
    rmaId: string,
    resolutionType: 'REPAIRED' | 'REPLACED' | 'REFUNDED' | 'DEBT_DEDUCTED',
    resolutionDetails: {
      settlementDate: string;
      replacementImeis?: string[];
      replacementItemName?: string;
      refundAmount?: number;
      settledAccountId?: string;
      settledPoInvoiceNo?: string;
      settledPoId?: string;
      resolutionNotes?: string;
      performedBy: string;
    }
  ) => void;
  onPaySupplierDebt: (supplierName: string, amount: number, accountId: string, method: string, notes?: string, poId?: string) => void;
}

export const SalesOperationsView: React.FC<SalesOperationsViewProps> = ({
  initialSubTab = 'pos',
  sales,
  branches,
  employees,
  inventory,
  purchases,
  users,
  currentUser,
  activeBranchFilter,
  contacts,
  supplierReturns,
  supplierBenefits,
  interBranchTransfers,
  treasuryAccounts,
  shifts,
  activeShift,
  heldBills,
  supplierInitialSubTab,
  onAddSale,
  onUpdateSale,
  onDeleteSale,
  onStartShift,
  onCloseShift,
  onSaveHoldBill,
  onRemoveHoldBill,
  onCompleteSmartPOSSale,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSettleCustomerDebt,
  onAddSupplierBenefit,
  onUpdateSupplierBenefit,
  onDeleteSupplierBenefit,
  onSettleSupplierBenefit,
  onAddSupplierReturn,
  onDeleteSupplierReturn,
  onClearAllSupplierReturns,
  onSettleRma,
  onPaySupplierDebt,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SalesSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      {/* Module 4 Header with Sub-Categories */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Core Module 4
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Sales, POS, Customers &amp; Suppliers Hub
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>Sales &amp; POS Operations</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Retail POS Vouchers • Customers &amp; Credit Debt • Supplier Claims &amp; RMA
            </p>
          </div>

          {/* Sub-Category Navigation Bar */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold flex-wrap">
            <button
              onClick={() => setActiveSubTab('pos')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'pos'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-600" />
              <span>1. Retail Sales &amp; POS</span>
            </button>

            <button
              onClick={() => setActiveSubTab('customers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'customers'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Contact2 className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Customers &amp; Credit Debt</span>
            </button>

            <button
              onClick={() => setActiveSubTab('suppliers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Suppliers &amp; Benefit Claims</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Category Content */}
      {activeSubTab === 'pos' && (
        <DailySalesLedger
          sales={sales}
          branches={branches}
          employees={employees}
          inventory={inventory}
          purchases={purchases}
          users={users}
          currentUser={currentUser}
          activeBranchFilter={activeBranchFilter}
          contacts={contacts}
          supplierReturns={supplierReturns}
          supplierBenefits={supplierBenefits}
          interBranchTransfers={interBranchTransfers}
          onAddSale={onAddSale}
          onUpdateSale={onUpdateSale}
          onDeleteSale={onDeleteSale}
          shifts={shifts}
          activeShift={activeShift}
          onStartShift={onStartShift}
          onCloseShift={onCloseShift}
          heldBills={heldBills}
          onSaveHoldBill={onSaveHoldBill}
          onRemoveHoldBill={onRemoveHoldBill}
          onCompleteSmartPOSSale={onCompleteSmartPOSSale}
        />
      )}

      {activeSubTab === 'customers' && (
        <ContactPartners
          partners={contacts}
          sales={sales}
          purchases={purchases}
          branches={branches}
          currentUser={currentUser}
          treasuryAccounts={treasuryAccounts}
          onAddPartner={onAddContact}
          onUpdatePartner={onUpdateContact}
          onDeletePartner={onDeleteContact}
          onSettleCustomerDebt={onSettleCustomerDebt}
        />
      )}

      {activeSubTab === 'suppliers' && (
        <SupplierClaimsAndBenefitsLedger
          suppliers={contacts}
          supplierBenefits={supplierBenefits}
          supplierReturns={supplierReturns}
          purchases={purchases}
          treasuryAccounts={treasuryAccounts}
          branches={branches}
          inventory={inventory}
          currentUser={currentUser}
          initialSubTab={supplierInitialSubTab}
          onAddSupplier={onAddContact}
          onUpdateSupplier={onUpdateContact}
          onDeleteSupplier={onDeleteContact}
          onAddSupplierBenefit={onAddSupplierBenefit}
          onUpdateSupplierBenefit={onUpdateSupplierBenefit}
          onDeleteSupplierBenefit={onDeleteSupplierBenefit}
          onSettleSupplierBenefit={onSettleSupplierBenefit}
          onAddSupplierReturn={onAddSupplierReturn}
          onDeleteSupplierReturn={onDeleteSupplierReturn}
          onClearAllSupplierReturns={onClearAllSupplierReturns}
          onSettleRma={onSettleRma}
          onPayPurchaseDebt={onPaySupplierDebt}
        />
      )}
    </div>
  );
};
