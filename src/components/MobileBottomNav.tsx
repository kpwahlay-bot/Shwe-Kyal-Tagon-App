import React from 'react';
import { 
  Package, 
  Wrench, 
  Users, 
  DollarSign, 
  Menu,
  Sparkles,
  Layers
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserAccount, isMDUser } from '../types';

interface MobileBottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  currentUser: UserAccount;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onToggleMenu,
  isMenuOpen,
  currentUser,
}) => {
  const isMD = isMDUser(currentUser);

  const navItems = [
    {
      id: 'sales' as NavTab,
      label: 'POS Sales',
      shortLabel: 'POS',
      icon: Wrench,
      badge: null,
    },
    {
      id: 'inventory' as NavTab,
      label: 'Inventory',
      shortLabel: 'Stock',
      icon: Package,
      badge: null,
    },
    {
      id: 'financial' as NavTab,
      label: 'Finance',
      shortLabel: 'Finance',
      icon: DollarSign,
      badge: null,
    },
    {
      id: 'hr' as NavTab,
      label: 'HR & Staff',
      shortLabel: 'HR',
      icon: Users,
      badge: null,
    },
  ];

  return (
    <nav 
      className="no-print print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around safe-area-pb"
      aria-label="Mobile Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id && !isMenuOpen;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[60px] ${
              isActive
                ? 'text-indigo-600 font-black'
                : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600 scale-105 shadow-2xs'
                  : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
              {item.shortLabel}
            </span>
            {isActive && (
              <span className="absolute -bottom-0.5 w-4 h-1 bg-indigo-600 rounded-full" />
            )}
          </button>
        );
      })}

      {/* Menu / More Button */}
      <button
        type="button"
        onClick={onToggleMenu}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-w-[60px] ${
          isMenuOpen
            ? 'text-indigo-600 font-black'
            : 'text-slate-500 hover:text-slate-900 font-semibold'
        }`}
        aria-label="All Modules & Settings"
      >
        <div
          className={`p-1.5 rounded-xl transition-all ${
            isMenuOpen
              ? 'bg-indigo-600 text-white scale-105 shadow-xs'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Menu className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight">
          {isMenuOpen ? 'Close' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};
