import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      id="pwa-offline-indicator"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/95 border border-amber-500/50 text-white rounded-xl shadow-2xl backdrop-blur-md animate-bounce-subtle"
    >
      <div className="relative flex items-center justify-center">
        <WifiOff className="w-4 h-4 text-amber-400" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
      </div>
      <div className="text-xs">
        <div className="font-bold text-amber-300 flex items-center gap-1.5">
          <span>Offline Mode</span>
          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono">Local Active</span>
        </div>
        <div className="text-[11px] text-slate-300 flex items-center gap-1">
          <Database className="w-3 h-3 text-slate-400" />
          <span>Entries saved locally; auto-syncs when online</span>
        </div>
      </div>
    </div>
  );
};
