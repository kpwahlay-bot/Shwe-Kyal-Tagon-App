import React, { useEffect, useState } from 'react';
import { CloudUpload, ShieldAlert, CloudOff, Wifi, X } from 'lucide-react';
import {
  getSyncInfo,
  onSyncInfoChange,
  migrateLocalToCloud,
  approveLargeSave,
  peekLegacyCloudData,
  importLegacyCloudData,
  type SyncInfo,
  type LegacyPeek,
  type CloudSyncPayload,
} from '../utils/cloudSync';
import { isMDUser, type UserAccount } from '../types';

interface Props {
  currentUser: UserAccount;
  /** Returns everything this device currently holds (used once, to fill an empty cloud). */
  getPayload: () => Omit<CloudSyncPayload, 'updatedAt' | 'updatedBy'>;
}

const LABELS: Record<string, string> = {
  branches: 'Branches',
  employees: 'Staff',
  salaryRecords: 'Payroll',
  sales: 'Sales',
  expenses: 'Expenses',
  inventory: 'Stock',
  stockMovements: 'Stock moves',
  contacts: 'Contacts',
  purchases: 'Purchases',
  supplierReturns: 'RMA',
  supplierBenefits: 'Claims',
  treasuryAccounts: 'Accounts',
  treasuryTransactions: 'Transactions',
  interBranchTransfers: 'Transfers',
};

/** Cloud status pill (everyone) plus notices and MD tools. Needs no data from the rest of the app. */
export const CloudSyncNotice: React.FC<Props> = ({ currentUser, getPayload }) => {
  const [info, setInfo] = useState<SyncInfo>(() => getSyncInfo());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [peek, setPeek] = useState<LegacyPeek | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [toolMsg, setToolMsg] = useState('');

  useEffect(() => onSyncInfoChange(setInfo), []);

  const isMD = isMDUser(currentUser);
  const canSeeDetails = isMD || currentUser.role === 'Editor';
  const refusedTotal = Object.values(info.refusedByCollection).reduce((a, b) => a + b, 0);
  const showRefused = canSeeDetails && refusedTotal > 0 && !info.allDenied;

  const upload = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setProgress('Starting...');
    const res = await migrateLocalToCloud(getPayload(), currentUser.displayName, (d, t) => setProgress(`${d} / ${t}`));
    setBusy(false);
    if (!res.success) setError(res.error || 'Upload failed.');
    else setProgress('');
  };

  const checkOld = async () => {
    if (busy) return;
    setBusy(true);
    setToolMsg('');
    setConfirmImport(false);
    setPeek(await peekLegacyCloudData());
    setBusy(false);
  };

  const useOld = async () => {
    if (busy) return;
    setBusy(true);
    setToolMsg('');
    setProgress('Starting...');
    const res = await importLegacyCloudData(currentUser.displayName, (d, t) => setProgress(`${d} / ${t}`));
    setBusy(false);
    setConfirmImport(false);
    setProgress('');
    if (res.success) {
      setToolMsg(`Done. ${res.total} change(s) saved. The cloud and this screen now match the old copy.`);
      setPeek(null);
    } else {
      setToolMsg(res.error || 'Import failed.');
    }
  };

  // ---- status pill
  let dot = 'bg-emerald-500';
  let text = 'Cloud connected';
  if (info.allDenied) {
    dot = 'bg-red-500';
    text = 'Cloud blocked';
  } else if (info.breakerTripped) {
    dot = 'bg-red-500';
    text = 'Cloud paused';
  } else if (!info.ready && info.connectionProblem) {
    dot = 'bg-amber-500';
    text = 'No connection to cloud';
  } else if (!info.ready) {
    dot = 'bg-slate-400';
    text = 'Connecting...';
  } else if (info.needsMigration) {
    dot = 'bg-amber-500';
    text = 'Cloud empty';
  }

  if (!info.signedIn) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm space-y-2">
      {!info.ready && info.connectionProblem && !info.allDenied && (
        <div className="bg-white border border-amber-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <Wifi className="w-4 h-4" />
            Cannot reach the cloud server
          </div>
          <p className="mt-1 text-slate-600">
            Your work is saved on this device but is not shared yet. Check the internet connection. If this phone only works
            with a VPN, tell the MD.
          </p>
        </div>
      )}

      {info.allDenied && (
        <div className="bg-white border border-red-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-red-700">
            <CloudOff className="w-4 h-4" />
            Cloud is blocking this account
          </div>
          <p className="mt-1 text-slate-600">
            Nothing is being saved to the cloud, so other devices will not see your changes. Your work is still saved on this device.
          </p>
          {canSeeDetails && (
            <p className="mt-2 text-slate-600">
              Usual causes: the Firestore rules were not published to the correct database, or this account has no staff profile yet.
            </p>
          )}
        </div>
      )}

      {info.needsMigration && (
        <div className="bg-white border border-amber-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <CloudUpload className="w-4 h-4 text-amber-600" />
            Cloud is empty
          </div>
          {isMD ? (
            <>
              <p className="mt-1 text-slate-600">
                Nothing is shared between devices yet. First check whether an old cloud copy exists (open the status button below), then
                choose ONE device that has the correct data and upload it once.
              </p>
              <button
                type="button"
                onClick={upload}
                disabled={busy}
                className="mt-3 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5"
              >
                {busy && !toolsOpen ? `Uploading ${progress}` : "Upload this device's data"}
              </button>
              {error && <p role="alert" className="mt-2 text-red-600">{error}</p>}
            </>
          ) : (
            <p className="mt-1 text-slate-600">Sharing between devices starts after the MD uploads the first data. Your work is safe on this device.</p>
          )}
        </div>
      )}

      {!info.needsMigration && error && (
        <div role="alert" className="bg-white border border-red-300 rounded-xl shadow-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {showRefused && (
        <div className="bg-white border border-amber-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <ShieldAlert className="w-4 h-4" />
            {refusedTotal} change(s) not saved to the cloud
          </div>
          <p className="mt-1 text-slate-600">
            The cloud refused these for this account:{' '}
            {Object.entries(info.refusedByCollection)
              .map(([name, n]) => `${name} (${n})`)
              .join(', ')}
            . They stay on this device only.
          </p>
        </div>
      )}

      {info.breakerTripped && (
        <div className="bg-white border border-red-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center gap-2 font-semibold text-red-700">
            <ShieldAlert className="w-4 h-4" />
            Cloud saving paused
          </div>
          <p className="mt-1 text-slate-600">{info.breakerReason} Your data is still saved on this device.</p>
          {isMD ? (
            <>
              <p className="mt-2 text-slate-600">
                If this was on purpose (for example restoring a backup or clearing all stock), approve it, then press the cloud
                sync button at the top of the screen.
              </p>
              <button
                type="button"
                onClick={approveLargeSave}
                className="mt-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold px-3 py-1.5 text-slate-800"
              >
                Allow this big save
              </button>
            </>
          ) : (
            <p className="mt-2 text-slate-600">Please ask the MD to review this.</p>
          )}
        </div>
      )}

      {isMD && toolsOpen && (
        <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-center justify-between font-semibold text-slate-900">
            <span>Cloud tools (MD)</span>
            <button type="button" onClick={() => setToolsOpen(false)} aria-label="Close" className="p-1 text-slate-500 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-slate-600">
            Writes today from this device: {info.writesToday}. Server answered: {info.connected ? 'yes' : 'not yet'}.
          </p>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="font-semibold text-slate-800">Old cloud copy (before the update)</div>
            <p className="mt-1 text-slate-600">
              Before the update the whole database was saved as one document. Use this if your real data is missing now.
            </p>
            <button
              type="button"
              onClick={checkOld}
              disabled={busy}
              className="mt-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 font-semibold px-3 py-1.5 text-slate-800"
            >
              {busy && !peek ? 'Checking...' : 'Check old data'}
            </button>

            {peek && !peek.found && <p role="alert" className="mt-2 text-red-600">{peek.error || 'Not found.'}</p>}

            {peek && peek.found && (
              <div className="mt-2 text-slate-700">
                <p>
                  Last saved: {peek.updatedAt ? new Date(peek.updatedAt).toLocaleString() : 'unknown'}
                  {peek.updatedBy ? ` by ${peek.updatedBy}` : ''}
                </p>
                <p className="mt-1">
                  {Object.entries(peek.counts)
                    .map(([k, n]) => `${LABELS[k] || k}: ${n}`)
                    .join(' · ') || 'No records.'}
                </p>
                {!confirmImport ? (
                  <button
                    type="button"
                    onClick={() => setConfirmImport(true)}
                    className="mt-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5"
                  >
                    Use the old data...
                  </button>
                ) : (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-red-800 font-semibold">Are you sure?</p>
                    <p className="mt-1 text-red-800">
                      The cloud and this screen will be made equal to the old copy. Anything newer that exists only in the cloud now
                      will be removed. Download a backup first if unsure.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={useOld}
                        disabled={busy}
                        className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-3 py-1.5"
                      >
                        {busy ? `Working ${progress}` : 'Yes, use old data'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmImport(false)}
                        disabled={busy}
                        className="rounded-lg border border-slate-300 hover:bg-white font-semibold px-3 py-1.5 text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {toolMsg && <p className="mt-2 text-slate-800">{toolMsg}</p>}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => isMD && setToolsOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-full bg-white/95 border border-slate-300 shadow px-3 py-1 text-xs text-slate-700 ${isMD ? 'hover:bg-white cursor-pointer' : 'cursor-default'}`}
        title={isMD ? 'Cloud status and tools' : 'Cloud status'}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        {text}
      </button>
    </div>
  );
};
