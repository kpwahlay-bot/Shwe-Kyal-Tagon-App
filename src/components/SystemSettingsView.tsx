import React, { useState } from 'react';
import { 
  Settings2, 
  Image as ImageIcon, 
  Building2, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  Sliders, 
  ShieldCheck, 
  Store,
  Sparkles
} from 'lucide-react';
import { Branch, UserAccount, isMDUser } from '../types';
import { ShopLogoSettingsModal, getSavedCustomLogo } from './ShopLogoSettingsModal';
import { ShweKyalTagonBadgeLogo } from './ShweKyalTagonLogo';
import { 
  getSystem2CustomLogo, 
  getSystem2Address, 
  getSystem2Phone,
  SYSTEM2_DEFAULT_ADDRESS,
  SYSTEM2_DEFAULT_PHONE 
} from './System2Logo';

interface SystemSettingsViewProps {
  branches: Branch[];
  currentUser: UserAccount;
  onUpdateBranch?: (branch: Branch) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsViewProps> = ({
  branches,
  currentUser,
  onUpdateBranch,
}) => {
  const isMD = isMDUser(currentUser);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoModalTab, setLogoModalTab] = useState<'logo' | 'branches' | 'system2'>('logo');
  const [currentLogo, setCurrentLogo] = useState<string>(getSavedCustomLogo);
  const [system2Logo, setSystem2Logo] = useState<string>(getSystem2CustomLogo);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Administration Module
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Brand &amp; System Configuration
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-purple-600" />
              <span>System Settings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize company brand logos, voucher print templates, branch receipt headers, and POS preferences
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enterprise Master Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Main Shop Logo & Brand Identity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-bold shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  1. Shwe Kyal Tagon Main Logo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Company brand logo displayed on POS vouchers, reports, and navbar
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center min-h-[90px]">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Company Logo"
                  className="max-h-16 max-w-full object-contain"
                />
              ) : (
                <div className="w-44">
                  <ShweKyalTagonBadgeLogo className="w-full h-auto" />
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upload high-resolution PNG or JPEG logo for Shwe Kyal Tagon. Automatically synced across all branch vouchers and offline reports.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLogoModalTab('logo');
              setIsLogoModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-purple-200" />
            <span>Change Main Company Logo</span>
          </button>
        </div>

        {/* Card 2: System II Service Center Letterhead */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  2. System II Service &amp; Repair Letterhead
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dedicated header for machine repair vouchers and technical job sheets
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200 flex flex-col items-center justify-center min-h-[90px] text-center">
              <div className="font-black text-sm text-blue-950 font-serif tracking-wide">
                SYSTEM II
              </div>
              <div className="text-[10px] text-blue-700 mt-0.5">
                Service, Repair &amp; Maintenance Center
              </div>
              <div className="text-[9px] text-slate-500 font-mono mt-1">
                {getSystem2Address() || SYSTEM2_DEFAULT_ADDRESS}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Configure secondary letterhead, workshop phone number, and service center addresses for technical service receipts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLogoModalTab('system2');
              setIsLogoModalOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-blue-200" />
            <span>Configure System II Letterhead</span>
          </button>
        </div>

        {/* Card 3: Branch Voucher Addresses & Footers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 md:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    3. Shop Branch Voucher Addresses &amp; Print Footers
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Set store addresses, contact hotlines, and return policy notes on 80mm &amp; A4 vouchers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLogoModalTab('branches');
                  setIsLogoModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Voucher Branch Details</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {branches.map((b) => (
                <div key={b.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{b.name}</span>
                    <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                      {b.id === 'branch-sys2' || b.name === 'System II' ? 'System II' : (b.code || b.id)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate" title={b.address}>
                    {b.address || 'Address not registered'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">
                    📞 {b.phone || '09-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logo & Branch Settings Modal */}
      <ShopLogoSettingsModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        initialTab={logoModalTab}
        onLogoUpdated={(url) => {
          setCurrentLogo(url);
          showToast('Company logo updated globally.');
        }}
      />
    </div>
  );
};
