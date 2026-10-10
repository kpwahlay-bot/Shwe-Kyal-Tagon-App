import React, { useState } from 'react';
import { UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { db, doc, getDoc, setDoc } from '../firebase';
import { STAFF_ROLES, canManageStaffAccounts, type StaffRole } from '../utils/authProfile';
import type { Branch, UserAccount } from '../types';

interface Props {
  branches: Branch[];
  currentUser: UserAccount;
}

const UID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

/**
 * Admin-only form that links a Firebase Auth account (created by hand in the Firebase Console)
 * to a staff profile. The pasted Firebase UID becomes the document id: users/{uid}.
 * There is no sign-up here and no account is created from the browser.
 */
export const StaffAccountsPanel: React.FC<Props> = ({ branches, currentUser }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');
  const [role, setRole] = useState<StaffRole>('Staff');
  const [uid, setUid] = useState('');
  const [replace, setReplace] = useState(false);
  const [askReplace, setAskReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (!canManageStaffAccounts(currentUser)) return null;

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setUid('');
    setReplace(false);
    setAskReplace(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setDone('');

    const cleanUid = uid.trim();
    if (!name.trim() || !phone.trim()) return setError('Name and phone are required.');
    if (role !== 'MD' && !branchId) return setError('Choose a branch.');
    if (!UID_PATTERN.test(cleanUid)) return setError('That does not look like a Firebase UID. Copy it from Firebase Console > Authentication > Users.');

    const branch = branches.find((b) => b.id === branchId);
    setBusy(true);
    try {
      const ref = doc(db, 'users', cleanUid);
      const existing = await getDoc(ref);
      if (existing.exists() && !replace) {
        setAskReplace(true);
        setError('A profile for this UID already exists. Tick "Replace existing profile" to overwrite it.');
        return;
      }
      await setDoc(ref, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        branchId: role === 'MD' ? 'ALL' : branchId,
        branchName: role === 'MD' ? 'All Branches' : branch?.name || '',
        role,
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      });
      setDone(`${name.trim()} can now sign in as ${role}.`);
      reset();
    } catch (err: any) {
      setError(err?.code === 'permission-denied' ? 'You do not have permission to add staff.' : 'Could not save. Check the internet and try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800"
      >
        <span className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-amber-600" />
          Staff login accounts
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={submit} className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            First create the account in Firebase Console (Authentication &gt; Add user), copy its User UID, then paste it below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-700">
              Name
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email (optional)
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Role
              <select className={field} value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Branch
              <select className={field} value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={role === 'MD'}>
                <option value="">{role === 'MD' ? 'All branches' : 'Select branch'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Firebase UID
              <input className={`${field} font-mono`} value={uid} onChange={(e) => setUid(e.target.value)} spellCheck={false} autoComplete="off" />
            </label>
          </div>

          {askReplace && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Replace existing profile
            </label>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {done && <p className="text-sm text-emerald-700">{done}</p>}

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
          >
            {busy ? 'Saving...' : 'Save staff'}
          </button>
        </form>
      )}
    </div>
  );
};
