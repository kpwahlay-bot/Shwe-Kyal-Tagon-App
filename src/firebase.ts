import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  getDocFromServer,
  enableNetwork,
  disableNetwork,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import rawFirebaseConfig from '../firebase-applet-config.json';

// Resolves Firebase Configuration:
// Prioritizes Vite environment variables (VITE_FIREBASE_*) configured in Vercel / Production Dashboard,
// falling back safely to local workspace configuration.
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as Record<string, string>);

const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY as string) || rawFirebaseConfig.apiKey,
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) || rawFirebaseConfig.authDomain,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) || rawFirebaseConfig.projectId,
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string) || rawFirebaseConfig.storageBucket,
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawFirebaseConfig.messagingSenderId,
  appId: (env.VITE_FIREBASE_APP_ID as string) || rawFirebaseConfig.appId,
  firestoreDatabaseId: (env.VITE_FIREBASE_DATABASE_ID as string) || rawFirebaseConfig.firestoreDatabaseId,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase App Check Initialization (reCAPTCHA Enterprise for Zero-Abuse Protection)
if (typeof window !== 'undefined' && env?.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn('App Check initialization skipped or already active:', err);
  }
}

// Suppress Firestore verbose debug/offline connection retry logs in sandbox preview
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set
}

// ---------------------------------------------------------------------------
// Connection mode
//   direct : the phone talks to Google (Firebase) itself.
//   proxy  : the phone talks only to OUR OWN website address; the website (Vercel, see vercel.json)
//            passes the traffic on to Google. Use this in places where Google is blocked or slow
//            without a VPN. It is NOT a security hole: the proxy only forwards. Google still checks
//            the staff login and the security rules on every request.
// Turn proxy mode on:  open the website once with  ?proxy=1  at the end of the address
//                      (turn off with ?proxy=0), or set VITE_FIREBASE_PROXY=1 in Vercel.
// ---------------------------------------------------------------------------
function readProxyMode(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('proxy');
    if (q === '1') localStorage.setItem('sktg_proxy', '1');
    if (q === '0') localStorage.removeItem('sktg_proxy');
    if (localStorage.getItem('sktg_proxy') === '1') return true;
  } catch {
    // storage blocked: fall through to the build setting
  }
  return String(env.VITE_FIREBASE_PROXY || '') === '1';
}

export const useProxyMode = readProxyMode();

const firestoreSettings: Record<string, unknown> = {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
};
if (useProxyMode && typeof window !== 'undefined') {
  firestoreSettings.host = window.location.host;
  firestoreSettings.ssl = window.location.protocol === 'https:';
  // Streaming connections do not survive a reverse proxy; plain requests do.
  firestoreSettings.experimentalForceLongPolling = true;
}

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    firestoreSettings as any,
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  // already initialised (hot reload)
  firestoreInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

if (useProxyMode && typeof window !== 'undefined') {
  // Sign-in and token refresh also go through our own address (see vercel.json rewrites).
  const cfg = (auth as any).config;
  if (cfg) {
    cfg.apiHost = window.location.host;
    cfg.tokenApiHost = window.location.host;
    cfg.apiScheme = window.location.protocol.replace(':', '');
  }
}

// NOTE: there is deliberately NO anonymous sign-in here. Only staff accounts that the MD created
// in the Firebase Console can use the app.

export { doc, getDoc, setDoc, onSnapshot, getDocFromServer, enableNetwork, disableNetwork, setLogLevel };

// Error handling conforming to firebase-integration-rpc specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Graceful connection initialization
async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch {
    // Non-blocking in sandbox / offline mode
  }
}
void testConnection();


