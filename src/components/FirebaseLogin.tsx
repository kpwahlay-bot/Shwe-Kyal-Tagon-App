import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { signInStaff, friendlyAuthError } from '../utils/authProfile';

interface FirebaseLoginProps {
  /** Message from a refused sign-in (for example "no staff profile yet"). */
  initialError?: string;
}

export const FirebaseLogin: React.FC<FirebaseLoginProps> = ({ initialError = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const shownError = error || initialError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await signInStaff(email, password);
      // On success the session hook takes over and this screen disappears.
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Shwe Kyal Tagon</h1>
          <p className="text-xs text-slate-500">Sign in with your staff account</p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </label>

        {shownError && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {shownError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2.5 text-sm"
        >
          <LogIn className="w-4 h-4" />
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};
