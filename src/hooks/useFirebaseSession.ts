import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { loadSessionUser, signOutStaff, friendlyAuthError } from '../utils/authProfile';
import type { UserAccount } from '../types';

export interface FirebaseSession {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: UserAccount | null;
  /** Why the last sign-in was refused (shown on the login screen). */
  error: string;
}

// Signing out after a refused profile fires a second "signed out" event; remember why.
let refusalMessage = '';

export function useFirebaseSession(): FirebaseSession {
  const [session, setSession] = useState<FirebaseSession>({ status: 'loading', user: null, error: '' });

  useEffect(() => {
    let cancelled = false;
    const stop = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        if (!cancelled) setSession({ status: 'signedOut', user: null, error: refusalMessage });
        refusalMessage = '';
        return;
      }
      try {
        const user = await loadSessionUser(fbUser);
        if (!cancelled) setSession({ status: 'signedIn', user, error: '' });
      } catch (err) {
        refusalMessage = friendlyAuthError(err);
        await signOutStaff();
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return session;
}
