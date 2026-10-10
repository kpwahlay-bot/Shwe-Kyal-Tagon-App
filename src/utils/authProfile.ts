// Firebase sign-in + staff profile lookup.
//
// Accounts are created by hand in the Firebase Console (Authentication > Users > Add user).
// The staff profile lives in Firestore at users/{firebaseUid} and holds role and branch.
// This file never creates Firebase Auth accounts.

import { signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc } from '../firebase';
import { normalizeUserRole, type UserAccount } from '../types';

export const STAFF_ROLES = ['MD', 'Editor', 'Manager', 'Sales Manager', 'Admin', 'Executive', 'Staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Must match isPrimaryOwner() in firestore.rules. Lets the owner create their own MD profile
// the very first time they sign in. The Firestore rules enforce this again on the server.
const OWNER_EMAILS = ['sumyatwin.sktg@gmail.com', 'wahwahlwin.1990@gmail.com'];

export interface StaffProfile {
  name: string;
  phone: string;
  email?: string;
  branchId: string;
  branchName: string;
  role: StaffRole;
  status: 'active' | 'inactive';
}

/** Thrown with a message that is safe to show to the person signing in. */
export class LoginProblem extends Error {}

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  if (err instanceof LoginProblem) return err.message;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Email or password is not correct.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the administrator.';
    case 'auth/network-request-failed':
      return 'No connection to the server. Check the internet and try again.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'You do not have permission to open this account. Please contact the administrator.';
    default:
      return 'Could not sign in. Please try again.';
  }
}

export async function signInStaff(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutStaff(): Promise<void> {
  await signOut(auth);
}

function toUserAccount(uid: string, email: string, p: StaffProfile): UserAccount {
  return {
    id: uid,
    username: email,
    displayName: p.name,
    // Editor -> Operation, Manager -> Sales Manager, Executive -> Admin (names used inside the app screens)
    role: normalizeUserRole(p.role),
    title: p.role === 'Editor' ? 'Finance & Policy' : undefined,
    branchId: p.role === 'MD' ? 'ALL' : p.branchId,
    branchName: p.role === 'MD' ? 'All Branches' : p.branchName,
    pin: '',
    avatarBg: 'bg-amber-600',
    status: 'active',
  };
}

/** Reads users/{uid}. Throws LoginProblem when the account has no usable staff profile. */
export async function loadSessionUser(fbUser: User): Promise<UserAccount> {
  const email = (fbUser.email || '').toLowerCase();
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    if (OWNER_EMAILS.includes(email)) {
      const profile: StaffProfile = {
        name: fbUser.displayName || 'Managing Director',
        phone: '',
        email,
        branchId: 'ALL',
        branchName: 'All Branches',
        role: 'MD',
        status: 'active',
      };
      await setDoc(ref, { ...profile, createdAt: new Date().toISOString() });
      return toUserAccount(fbUser.uid, email, profile);
    }
    throw new LoginProblem('This account has no staff profile yet. Please ask the administrator to add you.');
  }

  const data = snap.data() as Partial<StaffProfile>;
  if (data.status === 'inactive') {
    throw new LoginProblem('This staff account is switched off. Please contact the administrator.');
  }
  const role = STAFF_ROLES.includes(data.role as StaffRole) ? (data.role as StaffRole) : 'Staff';
  const profile: StaffProfile = {
    name: data.name || email || 'Staff',
    phone: data.phone || '',
    email,
    branchId: data.branchId || '',
    branchName: data.branchName || '',
    role,
    status: 'active',
  };
  return toUserAccount(fbUser.uid, email, profile);
}

/** Only the MD may create or change staff profiles (the Firestore rules enforce it too). */
export function canManageStaffAccounts(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  return normalizeUserRole(user.role) === 'MD';
}

// The old "User Security" screen calls these. Real staff profiles are now created ONLY with the
// "Staff login accounts" panel (HR Management), keyed by the Firebase UID. These do nothing on purpose,
// so the old screen can never create a login or change anyone's role.
export async function saveUserToFirestore(_user: unknown): Promise<void> {}
export async function deleteUserFromFirestore(_id: string): Promise<void> {}
