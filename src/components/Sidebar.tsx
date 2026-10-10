import React from 'react';
import { 
  Building2, 
  Users, 
  Package, 
  Wrench, 
  Contact2, 
  DollarSign, 
  Settings2, 
  LogOut, 
  Shield, 
  X, 
  History, 
  ShieldCheck, 
  SlidersHorizontal,
  Database
} from 'lucide-react';
import { UserAccount, isYaminnwe, isMDUser, canUserViewAdminModules, normalizeUserRole } from '../types';
import { ShweKyalTagonBadgeLogo } from './ShweKyalTagonLogo';

export type NavTab = 
  | 'branches' // Module 1: Branch Management
  | 'hr' // Module 2: HR Management
  | 'inventory' // Module 3: Stock & Inventory Management
  | 'sales' // Module 4: Sales & POS Operations
  | 'customers' // Module 5: Customer Management & Credit Debt (Standalone)
  | 'financial' // Module 6: Financial Management (P&L, Expenses, Purchases, Suppliers, Treasury)
  | 'users' // Module 7: System Administration & RBAC
  | 'suppliers' // Alias for financial suppliers
  | 'rma' // Alias for financial RMA
  | 'dashboard' // Alias for financial P&L
  | 'finance' // Alias for financial purchases
  | 'expenses' // Alias for financial expenses
  | 'branch_transfer' // Alias for inventory branch transfer
  | 'contacts' // Alias for customers
  | 'payroll' // Alias for HR payroll
  | 'team' // Alias for HR directory
  | 'activity_log' // Alias for admin logs
  | 'settings' // Alias for admin settings
  | 'data';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  currentSubTab?: string;
  onSelectNav?: (tab: NavTab, defaultSubTab?: string) => void;
  currentUser: UserAccount;
  onOpenLogin: () => void;
  onSignOut: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export interface MainMenuItem {
  id: NavTab;
  defaultSubTab?: string;
  label: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentSubTab,
  onSelectNav,
  currentUser,
  onOpenLogin,
  onSignOut,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const normalizedRole = normalizeUserRole(currentUser.role);
  const isYamin = isYaminnwe(currentUser) || normalizedRole === 'Operation';
  const isMD = isMDUser(currentUser) || normalizedRole === 'MD';
  const canAccessAdminSection = canUserViewAdminModules(currentUser);
  const isStaffOrCashier = normalizedRole === 'Staff' || normalizedRole === 'Cashier';

  // 1. OPERATIONS & MODULES (5 CORE MAIN CATEGORIES)
  const operationsMenuItems: MainMenuItem[] = [
    {
      id: 'sales',
      defaultSubTab: 'pos',
      label: 'Sales & Service POS',
      sublabel: 'Retail POS & Service Vouchers',
      icon: Wrench,
    },
    {
      id: 'inventory',
      defaultSubTab: 'catalog',
      label: 'Stock & Inventory',
      sublabel: 'Catalog, Transfers & RMA Returns',
      icon: Package,
    },
    {
      id: 'customers',
      label: 'Customer & Supplier Contacts',
      sublabel: 'Customers, Clients & Suppliers Directory',
      icon: Contact2,
    },
    ...(!isStaffOrCashier
      ? [
          {
            id: 'financial' as NavTab,
            defaultSubTab: (isMD ? 'pl' : 'expenses') as any,
            label: 'Financial Management',
            sublabel: isMD ? 'P&L, Expenses, Customer & Supplier Debts' : 'Expenses, Customer Debts & Payables',
            icon: DollarSign,
          },
        ]
      : []),
    ...(!isStaffOrCashier
      ? [
          {
            id: 'hr' as NavTab,
            defaultSubTab: 'directory',
            label: 'HR Management',
            sublabel: isYamin || isMD ? 'Directory, Payroll & Performance' : 'Directory & Performance',
            icon: Users,
          },
        ]
      : []),
  ];

  // 2. ADMINISTRATION SECTION (EACH AS A DEDICATED, DISTINCT TITLE)
  const adminMenuItems: MainMenuItem[] = [
    {
      id: 'branches',
      label: 'Branch Management',
      icon: Building2,
    },
    ...(isMD
      ? [
          {
            id: 'users' as NavTab,
            label: 'User Management',
            icon: ShieldCheck,
          },
        ]
      : []),
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings2,
    },
    {
      id: 'activity_log',
      label: 'Activity & Audit Log',
      icon: History,
    },
    {
      id: 'data',
      label: 'Data Center (ဒေတာ စီမံခန့်ခွဲမှု)',
      sublabel: 'Cloud Sync, Collections & Backup',
      icon: Database,
    },
  ];

  // Helper to test if item is active
  const isItemActive = (item: MainMenuItem) => {
    if (item.id === 'branches') {
      return currentTab === 'branches';
    }
    if (item.id === 'users') {
      return currentTab === 'users';
    }
    if (item.id === 'settings') {
      return currentTab === 'settings';
    }
    if (item.id === 'activity_log') {
      return currentTab === 'activity_log';
    }
    if (item.id === 'data') {
      return currentTab === 'data';
    }
    if (item.id === 'hr' && (currentTab === 'hr' || currentTab === 'team' || currentTab === 'payroll')) return true;
    if (item.id === 'inventory' && (currentTab === 'inventory' || currentTab === 'branch_transfer')) return true;
    if (item.id === 'sales' && currentTab === 'sales') return true;
    if (item.id === 'customers' && (currentTab === 'customers' || currentTab === 'contacts')) return true;
    if (item.id === 'financial' && (currentTab === 'financial' || currentTab === 'dashboard' || currentTab === 'finance' || currentTab === 'expenses' || currentTab === 'suppliers' || currentTab === 'rma')) return true;
    return false;
  };

  const handleItemClick = (item: MainMenuItem) => {
    if (onSelectNav) {
      onSelectNav(item.id, item.defaultSubTab);
    } else {
      setCurrentTab(item.id);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderSidebarInner = (showClose: boolean) => (
    <>
      {/* Top Header with Purple Badge Logo */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 w-full max-w-[210px]">
          <ShweKyalTagonBadgeLogo className="w-full h-auto" />
        </div>

        {showClose && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Categories Menu List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Section 1: OPERATIONS & MODULES */}
        <div className="space-y-1.5">
          <div className="px-3 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              OPERATIONS &amp; MODULES
            </span>
            <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              ERP Master
            </span>
          </div>

          <nav className="space-y-1">
            {operationsMenuItems.map((item) => {
              const ItemIcon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                    active
                      ? 'bg-purple-700 text-white font-bold shadow-md shadow-purple-900/10'
                      : 'hover:bg-slate-100/80 text-slate-700 font-semibold'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 transition-colors ${
                      active
                        ? 'bg-purple-600/50 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-purple-50 group-hover:text-purple-700'
                    }`}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate leading-tight font-bold">
                      {item.label}
                    </div>
                    {item.sublabel && (
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          active ? 'text-purple-100 font-normal' : 'text-slate-400 font-normal'
                        }`}
                      >
                        {item.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: ADMINISTRATION */}
        {canAccessAdminSection && (
          <div className="pt-2 space-y-1.5 border-t border-slate-100">
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ADMINISTRATION
              </span>
            </div>

            <nav className="space-y-1">
              {adminMenuItems.map((item) => {
                const ItemIcon = item.icon;
                const active = isItemActive(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                      active
                        ? item.defaultSubTab === 'activity_log'
                          ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                          : 'bg-[#091124] text-white font-bold shadow-md'
                        : 'hover:bg-slate-100/80 text-slate-700 font-semibold'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 transition-colors ${
                        active
                          ? item.defaultSubTab === 'activity_log'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-purple-600/30 text-purple-300'
                          : 'text-slate-500 group-hover:text-slate-800'
                      }`}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-bold truncate leading-tight ${
                          active ? 'text-white' : 'text-slate-800 group-hover:text-slate-950'
                        }`}
                      >
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div
                          className={`text-[10px] truncate mt-0.5 ${
                            active ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        >
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom User Profile Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0 space-y-2">
        {/* User Card */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-bold text-amber-700 shrink-0 text-sm shadow-2xs">
            {isMD ? '👑' : '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 truncate">
              {currentUser.displayName}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate">
              {currentUser.username}
            </div>
            <div className="text-[10px] font-bold text-amber-800 truncate">
              {currentUser.title || currentUser.role}
            </div>
          </div>
        </div>

        {/* Action Buttons: Switch User & Sign Out */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenLogin}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            title="Switch User Account"
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Switch User</span>
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300 text-rose-700 text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
            title="Sign Out of System"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar (Hidden on Mobile screens < 1024px) */}
      <div className="no-print print:hidden hidden lg:flex flex-col h-full bg-white text-slate-700 select-none border-r border-slate-200 w-72 shrink-0 shadow-xs">
        {renderSidebarInner(false)}
      </div>

      {/* 2. Mobile Off-Canvas Sliding Overlay Drawer */}
      {isOpenMobile && (
        <div className="no-print print:hidden fixed inset-0 z-50 lg:hidden flex">
          {/* Semi-transparent Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Sliding Drawer Container */}
          <div className="relative flex-1 max-w-xs w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarInner(true)}
          </div>
        </div>
      )}
    </>
  );
};
