import React, { useState } from 'react';
import {
  FolderTree,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  migrateAllToCleanCollections,
  MigrationProgress,
  MigrationPayload
} from '../utils/collectionSync';

interface CleanCollectionMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: MigrationPayload;
  currentUserRole?: string;
}

export const CleanCollectionMigrationModal: React.FC<CleanCollectionMigrationModalProps> = ({
  isOpen,
  onClose,
  payload,
  currentUserRole
}) => {
  const [migrationScope, setMigrationScope] = useState<'active_2' | 'all'>('active_2');
  const [progress, setProgress] = useState<MigrationProgress>({
    currentCategory: '',
    completedItems: 0,
    totalItems: 0,
    percent: 0,
    status: 'idle',
  });

  if (!isOpen) return null;

  // Active 2 Branches: branch-1 (CS-01) and branch-2 (CS-02)
  const isBranchActive = (bId?: string) => !bId || bId === 'ALL' || bId === 'branch-1' || bId === 'branch-2';

  const scopedBranches = migrationScope === 'active_2'
    ? (payload.branches || []).filter(b => b.id === 'branch-1' || b.id === 'branch-2')
    : (payload.branches || []);

  const scopedSales = migrationScope === 'active_2'
    ? (payload.sales || []).filter(s => isBranchActive(s.branchId))
    : (payload.sales || []);

  const scopedExpenses = migrationScope === 'active_2'
    ? (payload.expenses || []).filter(e => isBranchActive(e.branchId))
    : (payload.expenses || []);

  const scopedEmployees = migrationScope === 'active_2'
    ? (payload.employees || []).filter(e => isBranchActive(e.branchId))
    : (payload.employees || []);

  const scopedTransfers = migrationScope === 'active_2'
    ? (payload.interBranchTransfers || []).filter(t => isBranchActive(t.fromBranchId) || isBranchActive(t.toBranchId))
    : (payload.interBranchTransfers || []);

  const scopedPayload: MigrationPayload = {
    ...payload,
    branches: scopedBranches,
    sales: scopedSales,
    expenses: scopedExpenses,
    employees: scopedEmployees,
    interBranchTransfers: scopedTransfers,
  };

  const inventoryCount = scopedPayload.inventory?.length || 0;
  const salesCount = scopedPayload.sales?.length || 0;
  const expensesCount = scopedPayload.expenses?.length || 0;
  const contactsCount = scopedPayload.contacts?.length || 0;
  const employeesCount = scopedPayload.employees?.length || 0;
  const branchesCount = scopedPayload.branches?.length || 0;
  const purchasesCount = scopedPayload.purchases?.length || 0;
  const benefitsCount = scopedPayload.supplierBenefits?.length || 0;
  const returnsCount = scopedPayload.supplierReturns?.length || 0;
  const treasuryAccCount = scopedPayload.treasuryAccounts?.length || 0;
  const treasuryTxCount = scopedPayload.treasuryTransactions?.length || 0;
  const transfersCount = scopedPayload.interBranchTransfers?.length || 0;
  const salaryCount = scopedPayload.salaryRecords?.length || 0;

  const totalRecords =
    inventoryCount +
    salesCount +
    expensesCount +
    contactsCount +
    employeesCount +
    branchesCount +
    purchasesCount +
    benefitsCount +
    returnsCount +
    treasuryAccCount +
    treasuryTxCount +
    transfersCount +
    salaryCount;

  const handleStartMigration = async () => {
    await migrateAllToCleanCollections(scopedPayload, (p) => {
      setProgress(p);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 min-h-screen">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FolderTree className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <span>Database Collections Migration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Image 1 Structure
                </span>
              </h3>
              <p className="text-[11px] text-indigo-200/80">
                Data များကို သီးသန့် Collection/Folder များအလိုက် ခွဲခြားသိမ်းဆည်းခြင်း
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={progress.status === 'running'}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Quota Shield: Branch Scope Selector */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Quota Shield (ဆလင်ဒါ/ဒေတာချွေတာရေး ရွေးချယ်မှု):</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                Active 2 Branches Optimized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMigrationScope('active_2')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  migrationScope === 'active_2'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-black text-[11px] flex items-center justify-between">
                  <span>🏪 ဆိုင်ခွဲ ၂ ဆိုင်သာ ဦးစားပေးမည် (CS-01, CS-02)</span>
                  {migrationScope === 'active_2' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`text-[10px] mt-0.5 ${migrationScope === 'active_2' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  လက်ရှိဖွင့်လှစ်ထားသော ဆိုင် ၂ ဆိုင်စာသာ ခွဲခြမ်းသိမ်းမည် (Quota အလွန်သက်သာသည်)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMigrationScope('all')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  migrationScope === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-black text-[11px] flex items-center justify-between">
                  <span>🏢 ဆိုင်ခွဲအားလုံး (All Branches & Records)</span>
                  {migrationScope === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className={`text-[10px] mt-0.5 ${migrationScope === 'all' ? 'text-indigo-100' : 'text-slate-500'}`}>
                  စနစ်တစ်ခုလုံးရှိ data အားလုံး (Write ပိုမိုသုံးစွဲမည်)
                </div>
              </button>
            </div>
          </div>

          {/* Comparison Card (Image 2 vs Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="space-y-1 p-2.5 rounded-xl bg-white border border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>လက်ရှိပုံစံ (Image 2)</span>
              </div>
              <div className="font-bold text-slate-800 text-[11px]">sktg_sync / main_v3</div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Data အားလုံးကို Document ၁ ခုတည်းထဲသို့ JSON text အဖြစ် စုပြုံသိမ်းဆည်းထားသည်။
              </p>
            </div>

            <div className="space-y-1 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                <span>ပြောင်းလဲမည့်ပုံစံ (Image 1)</span>
              </div>
              <div className="font-bold text-indigo-950 text-[11px]">Normalized Root Collections</div>
              <p className="text-[10px] text-indigo-700 leading-relaxed">
                /inventory, /sales, /expenses စသည်ဖြင့် သီးသန့် Folder အလိုက် ရှင်းလင်းစွာခွဲသိမ်းမည်။
              </p>
            </div>
          </div>

          {/* Record Breakdown Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-slate-700">ခွဲဝေသိမ်းဆည်းမည့် Collections စာရင်း:</span>
              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                စုစုပေါင်း: {totalRecords} Records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/inventory</span>
                <span className="font-bold text-slate-900 font-mono">{inventoryCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/sales</span>
                <span className="font-bold text-slate-900 font-mono">{salesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/contacts</span>
                <span className="font-bold text-slate-900 font-mono">{contactsCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/employees</span>
                <span className="font-bold text-slate-900 font-mono">{employeesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/branches</span>
                <span className="font-bold text-slate-900 font-mono">{branchesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/expenses</span>
                <span className="font-bold text-slate-900 font-mono">{expensesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/purchases</span>
                <span className="font-bold text-slate-900 font-mono">{purchasesCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/supplier_benefits</span>
                <span className="font-bold text-slate-900 font-mono">{benefitsCount}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-mono text-slate-600 font-medium">/treasury_accounts</span>
                <span className="font-bold text-slate-900 font-mono">{treasuryAccCount}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          {progress.status === 'running' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between font-bold text-indigo-950">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Migrating: {progress.currentCategory}...</span>
                </span>
                <span className="font-mono">{progress.percent}%</span>
              </div>
              <div className="w-full bg-indigo-200/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-[10px] text-indigo-700 font-mono text-right">
                {progress.completedItems} / {progress.totalItems} records transferred
              </div>
            </div>
          )}

          {/* Success Alert */}
          {progress.status === 'success' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-1.5">
              <div className="font-bold flex items-center gap-2 text-emerald-800 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Migration Completed Successfully! 🎉</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Data {progress.completedItems} ခုလုံးကို သက်ဆိုင်ရာ Collections/Folders များအလိုက် အောင်မြင်စွာ ခွဲခြမ်းသိမ်းဆည်းပြီးပါပြီ။ Firebase Console ထဲတွင် ပုံ ၁ ကဲ့သို့ ရှင်းလင်းစွာ မြင်တွေ့နိုင်ပါပြီ။
              </p>
            </div>
          )}

          {/* Error Alert */}
          {progress.status === 'error' && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-900 text-xs">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>Migration ရပ်တန့်ရခြင်း အကြောင်းရင်း</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {progress.errorMessage}
              </p>
              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-[10px] text-amber-900 space-y-1">
                <span className="font-bold block">💡 ဖြေရှင်းနိုင်မည့် နည်းလမ်းများ:</span>
                <div>၁။ Firebase Console (Blaze Plan) သို့ switch ထားပါက အကန့်အသတ်မရှိ ချက်ချင်း ပြောင်းရွှေ့နိုင်ပါသည်။</div>
                <div>၂။ သို့မဟုတ် ယနေ့ည ၁၂ နာရီကျော် (Quota ပြန် reset ချိန်) တွင် ဤခလုတ်ကို ပြန်နှိပ်နိုင်ပါသည်။</div>
              </div>
            </div>
          )}

          {/* Information Note */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Safety &amp; Data Integrity Guarantee</span>
            </span>
            <p className="text-blue-800/90 leading-relaxed text-[10px]">
              ဤ Migration ပြုလုပ်ခြင်းသည် လက်ရှိ Local Data နှင့် စနစ်လည်ပတ်မှုကို လုံးဝထိခိုက်စေခြင်းမရှိပါ။ ပုံ ၁ ကဲ့သို့ သီးသန့် Collections များအလိုက် အသစ်ထည့်သွင်းသိမ်းဆည်းပေးခြင်းသာ ဖြစ်ပါသည်။
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={progress.status === 'running'}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {progress.status === 'success' ? 'Close' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleStartMigration}
            disabled={progress.status === 'running' || totalRecords === 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {progress.status === 'running' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Migrating ({progress.percent}%)...</span>
              </>
            ) : progress.status === 'success' ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Run Migration Again</span>
              </>
            ) : (
              <>
                <FolderTree className="w-4 h-4" />
                <span>Start Migration (ပုံ ၁ ပုံစံသို့ ခွဲဝေသိမ်းဆည်းမည်)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
