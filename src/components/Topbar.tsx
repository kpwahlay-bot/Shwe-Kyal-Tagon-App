import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Building2, 
  UserCheck, 
  Crown,
  LogOut,
  Cloud,
  CloudUpload,
  RefreshCw,
  Loader2,
  Menu,
  X,
  Lock,
  Database,
  Download
} from 'lucide-react';
import { Branch, UserAccount, hasGlobalBranchAccess, isMDUser } from '../types';

interface TopbarProps {
  branches: Branch[];
  activeBranchFilter: string;
  setActiveBranchFilter: (branchId: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currentUser: UserAccount;
  onOpenLogin: () => void;
  onOpenDataCenter?: () => void;
  onSignOut?: () => void;
  onOpenQrScan?: () => void;
  lowStockCount?: number;
  onOpenLowStockAlert?: () => void;
  cloudSyncStatus?: 'synced' | 'syncing' | 'error' | 'quota_exceeded' | 'idle';
  lastSyncedTime?: string;
  onTriggerSync?: () => void;
  onDownloadOfflineBackup?: () => void;
  onClearCache?: () => void;
  onBrowserRefresh?: () => void;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  branches,
  activeBranchFilter,
  setActiveBranchFilter,
  selectedMonth,
  setSelectedMonth,
  currentUser,
  onOpenLogin,
  onOpenDataCenter,
  onSignOut,
  onOpenQrScan,
  lowStockCount = 0,
  onOpenLowStockAlert,
  cloudSyncStatus = 'synced',
  lastSyncedTime,
  onTriggerSync,
  onDownloadOfflineBackup,
  onClearCache,
  onBrowserRefresh,
  onToggleMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
  const today = new Date();
  const dayStr = String(today.getDate()).padStart(2, '0');
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');
  const yearStr = today.getFullYear();
  const formattedSystemDate = `${dayStr}/${monthStr}/${yearStr}`;

  const isMD = isMDUser(currentUser);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-2 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs no-print shrink-0 gap-2 overflow-x-auto no-scrollbar">
      {/* Left: Mobile Toggle + Clean Branch Selector (Prominent & Clear) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Mobile Hamburger Toggle */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isMobileSidebarOpen ? "Close menu" : "Open navigation menu"}
            aria-label="Toggle menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
          </button>
        )}

        {/* Branch Selector: Enterprise Access for all employees */}
        <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 transition-colors shadow-2xs shrink-0">
          <Building2 className="w-4 h-4 text-amber-600 mr-2 shrink-0" />
          <select
            value={activeBranchFilter}
            onChange={(e) => setActiveBranchFilter(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden cursor-pointer min-w-[120px] sm:min-w-[150px] max-w-[180px] sm:max-w-[220px] truncate"
            title="Enterprise Branch Selector (Multi-Branch Access)"
          >
            <option value="ALL">🏢 All Branches (Enterprise)</option>
            {branches.map((b) => {
              const isSys2 = b.id === 'branch-sys2' || b.name.includes('System II') || b.code === 'System II';
              const label = isSys2 ? 'System II' : `${b.name} (${b.code || b.id})`;
              return (
                <option key={b.id} value={b.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Right Controls: Sync, Browser Refresh, User Profile, Sign Out */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
        {/* Cloud Sync Status Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {cloudSyncStatus === 'syncing' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold animate-pulse shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
              <span className="hidden md:inline">Syncing...</span>
            </div>
          )}

          {cloudSyncStatus === 'synced' && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0"
              title={`VPN-Free Cloud Synced: ${lastSyncedTime || 'Realtime'}`}
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden xl:inline">Synced</span>
            </div>
          )}

          {cloudSyncStatus === 'quota_exceeded' && (
            <button
              type="button"
              onClick={onTriggerSync}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100/90 hover:bg-amber-200 border border-amber-300 text-amber-950 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              title="Daily free quota reached. Data 100% saved locally."
            >
              <Cloud className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden md:inline">Local Safe</span>
            </button>
          )}

          {cloudSyncStatus === 'error' && (
            <button
              type="button"
              onClick={onTriggerSync}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              title="Offline mode active."
            >
              <CloudUpload className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="hidden md:inline">Offline</span>
            </button>
          )}
        </div>

        {/* One-Click Complete Database Backup Export */}
        {onDownloadOfflineBackup && (
          <button
            type="button"
            onClick={onDownloadOfflineBackup}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            title="Download One-Click Complete Database Backup (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden lg:inline font-bold">One-Click Backup</span>
          </button>
        )}

        {/* Live Cloud Refresh & Sync Button */}
        <button
          onClick={onBrowserRefresh || onTriggerSync}
          disabled={cloudSyncStatus === 'syncing'}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border border-blue-500 shrink-0 group"
          title="Live Data Sync with Cloud Database"
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          <span className="inline font-bold">{cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Refresh'}</span>
        </button>

        {/* PWA Install Desktop App Button */}
        <PWAInstallButton variant="topbar" />
      </div>
    </header>
  );
};
