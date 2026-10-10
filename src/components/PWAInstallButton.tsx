import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Laptop, ShieldCheck } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'topbar' | 'compact' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'topbar', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already installed in standalone mode
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Desktop App Installed (Offline Ready)</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 3000);
    }
  };

  return (
    <>
      {variant === 'topbar' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title={isIOS ? 'Install on iPhone / iPad' : 'Install Desktop App (Offline Mode Ready)'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
            isInstallable || isIOS
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border border-amber-400/40 animate-pulse-subtle'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          } ${className}`}
        >
          {justInstalled ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-950 shrink-0" />
              <span>Installed!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Install Desktop App</span>
              <span className="hidden sm:inline xl:hidden">Install App</span>
              <span className="sm:hidden">Install</span>
            </>
          )}
        </button>
      )}

      {variant === 'card' && (
        <div className="p-4 bg-slate-900 border border-amber-500/30 rounded-xl text-white space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-100">Offline Desktop App (PWA)</h4>
                <p className="text-xs text-slate-400">Run without internet connection or when server is down</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install to Computer</span>
            </button>
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span>All sales, inventory, and ledger records will save locally and auto-sync when online.</span>
          </div>
        </div>
      )}

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Smartphone className="w-5 h-5 text-amber-500" />
                <span>Install on iPhone / iPad</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                  1
                </span>
                <p>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                  2
                </span>
                <p>Scroll down the menu and tap <strong>Add to Home Screen</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                  3
                </span>
                <p>Tap <strong>Add</strong> in the top right corner. The app will appear on your Home Screen.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
