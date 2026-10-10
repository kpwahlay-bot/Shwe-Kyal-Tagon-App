import React, { useState } from 'react';
import { UserAccount, UserRole, Branch, isMDUser, normalizeUserRole } from '../types';
import { 
  User, 
  ShieldAlert, 
  ShieldCheck, 
  KeyRound, 
  Check, 
  Lock, 
  Building2, 
  X, 
  Users,
  ChevronDown,
  Crown
} from 'lucide-react';

interface UserAccountSwitcherProps {
  currentUser: UserAccount;
  users: UserAccount[];
  branches: Branch[];
  onSwitchUser: (user: UserAccount) => void;
  onAddUser?: (user: UserAccount) => void;
  onOpenLoginModal?: () => void;
}

export const UserAccountSwitcher: React.FC<UserAccountSwitcherProps> = ({
  currentUser,
  users,
  branches,
  onSwitchUser,
  onOpenLoginModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Security Switcher PIN Verification
  const [targetSwitchUser, setTargetSwitchUser] = useState<UserAccount | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isCurrentMD = isMDUser(currentUser);

  const handleInitiateSwitch = (u: UserAccount) => {
    if (u.id === currentUser.id) {
      setIsOpen(false);
      return;
    }
    // MD has executive bypass to preview any staff view
    if (isCurrentMD) {
      onSwitchUser(u);
      setIsOpen(false);
      return;
    }
    // Non-MD requires target user's PIN to switch
    setTargetSwitchUser(u);
    setPinInput('');
    setPinError('');
    setIsOpen(false);
  };

  const handleConfirmPinSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSwitchUser) return;

    const trimmed = pinInput.trim();
    const isTargetMD = isMDUser(targetSwitchUser);
    const isMasterPin = false;

    const isMatch = Boolean(
      (targetSwitchUser.pin && targetSwitchUser.pin === trimmed) ||
      (targetSwitchUser.password && targetSwitchUser.password === trimmed) ||
      isMasterPin
    );

    if (isMatch) {
      onSwitchUser(targetSwitchUser);
      setTargetSwitchUser(null);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect security PIN. Please try again.');
    }
  };

  const getRoleBadge = (userRole: string) => {
    const normalized = normalizeUserRole(userRole);
    switch (normalized) {
      case 'MD':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
            MD (Managing Director)
          </span>
        );
      case 'Operation':
        return (
          <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
            <ShieldCheck className="w-3 h-3 text-cyan-700" />
            Operation
          </span>
        );
      case 'Sales Manager':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Sales Manager
          </span>
        );
      case 'Admin':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <ShieldAlert className="w-3 h-3 text-purple-700" />
            Admin
          </span>
        );
      case 'Finance':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <ShieldCheck className="w-3 h-3 text-blue-600" />
            Finance
          </span>
        );
      case 'Cashier':
        return (
          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 border border-orange-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <User className="w-3 h-3 text-orange-600" />
            Cashier
          </span>
        );
      case 'Staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
            <User className="w-3 h-3 text-slate-500" />
            Staff
          </span>
        );
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors text-left"
      >
        <div className={`w-7 h-7 rounded-full ${currentUser.avatarBg || 'bg-purple-600'} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
          {currentUser.displayName.charAt(0)}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-bold text-slate-900 leading-none">
            {currentUser.displayName}
          </div>
          <div className="text-[10px] text-purple-700 font-semibold mt-0.5">
            {currentUser.role} • {currentUser.branchId === 'ALL' ? 'HQ' : currentUser.branchName}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 text-xs">
            <div className="p-2 border-b border-slate-100 pb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Session
              </span>
              <div className="font-bold text-slate-900 mt-0.5">{currentUser.displayName}</div>
              <div className="text-slate-500 text-[11px]">{currentUser.username}</div>
            </div>

            <div className="py-2 space-y-1 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Switch Authorized User
              </span>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleInitiateSwitch(u)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                    currentUser.id === u.id
                      ? 'bg-purple-50 text-purple-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full ${u.avatarBg || 'bg-slate-600'} text-white flex items-center justify-center font-bold text-[10px] shrink-0`}>
                      {normalizeUserRole(u.role) === 'MD' ? '👑' : u.displayName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate leading-tight">{u.displayName}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{u.username}</div>
                      <div className="text-[10px] font-semibold text-purple-700">{normalizeUserRole(u.role)}</div>
                    </div>
                  </div>
                  {currentUser.id === u.id && <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
              {onOpenLoginModal && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenLoginModal();
                  }}
                  className="w-full py-1.5 px-2 text-purple-700 hover:bg-purple-50 rounded-lg text-left font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login / Security Authentication</span>
                </button>
              )}

            </div>
          </div>
        </>
      )}

      {/* Security PIN Modal for User Switch */}
      {targetSwitchUser && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setTargetSwitchUser(null);
              setPinInput('');
              setPinError('');
            }
          }}
        >
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 text-xs my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Security PIN Required</h3>
                  <p className="text-[10px] text-slate-500">Enter PIN to switch account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTargetSwitchUser(null);
                  setPinInput('');
                  setPinError('');
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full ${targetSwitchUser.avatarBg || 'bg-slate-600'} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                {targetSwitchUser.displayName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-xs truncate">{targetSwitchUser.displayName}</div>
                <div className="text-[10px] text-purple-700 font-semibold">{targetSwitchUser.role} • {targetSwitchUser.branchName || 'Branch'}</div>
              </div>
            </div>

            <form onSubmit={handleConfirmPinSwitch} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-[11px]">
                  Enter 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  className="w-full text-center tracking-widest text-lg font-mono py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-purple-600"
                  placeholder="••••"
                />
              </div>

              {pinError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-bold text-rose-700 text-center">
                  ⚠️ {pinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setTargetSwitchUser(null);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Confirm Switch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
