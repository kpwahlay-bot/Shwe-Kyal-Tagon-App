import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  History, 
  Settings2
} from 'lucide-react';
import { 
  UserAccount, 
  Branch, 
  Employee, 
  DailySale, 
  DailyExpense, 
  InventoryItem, 
  StockMovement, 
  SalaryRecord, 
  ContactPartner, 
  TreasuryAccount, 
  TreasuryTransaction, 
  PurchaseRecord, 
  SupplierReturn, 
  ActivityLogEntry, 
  InterBranchTransfer,
  DepartmentPositionsMap
} from '../types';
import { UserManagement } from './UserManagement';
import { ActivityLogView } from './ActivityLogView';
import { DataBackupCenter } from './DataBackupCenter';

export type AdminSubTab = 'users' | 'activity_log' | 'settings';

interface SystemAdminViewProps {
  initialSubTab?: AdminSubTab;
  users: UserAccount[];
  branches: Branch[];
  employees: Employee[];
  sales: DailySale[];
  expenses: DailyExpense[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  salaryRecords: SalaryRecord[];
  contacts: ContactPartner[];
  treasuryAccounts: TreasuryAccount[];
  treasuryTransactions: TreasuryTransaction[];
  purchases: PurchaseRecord[];
  supplierReturns: SupplierReturn[];
  activityLogs: ActivityLogEntry[];
  interBranchTransfers: InterBranchTransfer[];
  positionsMap: DepartmentPositionsMap;
  currentUser: UserAccount;
  cloudSyncStatus: string;
  onAddUser: (user: UserAccount) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUser: (user: UserAccount) => void;
  onResetAllUsers: () => void;
  onUpdateEmployee: (emp: Employee) => void;
  onClearLogs: () => void;
  onRestoreBackup: (data: any) => void;
  onResetOperationsToZero: () => void;
  onWipeAllData: () => void;
  onResetToDemo: () => void;
}

export const SystemAdminView: React.FC<SystemAdminViewProps> = ({
  initialSubTab = 'users',
  users,
  branches,
  employees,
  sales,
  expenses,
  inventory,
  stockMovements,
  salaryRecords,
  contacts,
  treasuryAccounts,
  treasuryTransactions,
  purchases,
  supplierReturns,
  activityLogs,
  interBranchTransfers,
  positionsMap,
  currentUser,
  cloudSyncStatus,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
  onResetAllUsers,
  onUpdateEmployee,
  onClearLogs,
  onRestoreBackup,
  onResetOperationsToZero,
  onWipeAllData,
  onResetToDemo,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  return (
    <div className="space-y-4">
      {/* Module 6 Header with Sub-Categories */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                Core Module 6
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Security, Roles &amp; System Administration
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <span>System Administration</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              User &amp; Access Security (RBAC) • Activity &amp; Audit Logs • System Settings &amp; Data Backup
            </p>
          </div>

          {/* Sub-Category Navigation Bar */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold flex-wrap">
            <button
              onClick={() => setActiveSubTab('users')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>1. User &amp; Access (RBAC)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('activity_log')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'activity_log'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Activity &amp; Audit Logs</span>
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>3. Settings &amp; Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Category Content */}
      {activeSubTab === 'users' && (
        <UserManagement
          users={users}
          branches={branches}
          employees={employees}
          currentUser={currentUser}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          onSwitchUser={onSwitchUser}
          onResetAllUsers={onResetAllUsers}
          onUpdateEmployee={onUpdateEmployee}
        />
      )}

      {activeSubTab === 'activity_log' && (
        <ActivityLogView
          logs={activityLogs}
          branches={branches}
          users={users}
          currentUser={currentUser}
          onClearLogs={onClearLogs}
        />
      )}

      {activeSubTab === 'settings' && (
        <DataBackupCenter
          branches={branches}
          sales={sales}
          expenses={expenses}
          inventory={inventory}
          stockMovements={stockMovements}
          employees={employees}
          salaryRecords={salaryRecords}
          contacts={contacts}
          users={users}
          treasuryAccounts={treasuryAccounts}
          treasuryTransactions={treasuryTransactions}
          purchases={purchases}
          supplierReturns={supplierReturns}
          activityLogs={activityLogs}
          interBranchTransfers={interBranchTransfers}
          customPositions={positionsMap}
          currentUser={currentUser}
          cloudSyncStatus={cloudSyncStatus}
          onRestoreBackup={onRestoreBackup}
        />
      )}
    </div>
  );
};
