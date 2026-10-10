// Vercel Serverless Function: Firebase Firestore REST Proxy
// Enables Myanmar users to sync with Firebase Firestore without needing a VPN!

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0794645955';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyDB1422biYDFXr6xodwtHgtEjSYxJ2mZao';
const FIRESTORE_DB_ID = process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || 'ai-studio-remixshwekyaltag-16a89cd6-3a3a-4743-9d03-d11d5bd9266b';
const DOC_PATH = 'sktg_sync/main_v3';

const REST_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/${DOC_PATH}?key=${FIREBASE_API_KEY}`;

export default async function handler(req: any, res: any) {
  // Set CORS headers for seamless cross-origin and local execution
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Retrieve Cloud Data from Firestore without VPN
  if (req.method === 'GET') {
    try {
      const response = await fetch(REST_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(200).json({ success: true, data: null, message: 'Document not found yet' });
        }
        const errText = await response.text();
        return res.status(response.status).json({ success: false, error: errText });
      }

      const firestoreDoc = await response.json();
      const fields = firestoreDoc.fields || {};

      const parseField = (f: any) => {
        if (!f) return undefined;
        if (f.stringValue !== undefined) {
          try {
            return JSON.parse(f.stringValue);
          } catch {
            return f.stringValue;
          }
        }
        if (f.integerValue !== undefined) return parseInt(f.integerValue, 10);
        if (f.doubleValue !== undefined) return parseFloat(f.doubleValue);
        if (f.booleanValue !== undefined) return f.booleanValue;
        return undefined;
      };

      const parsedPayload = {
        branches: parseField(fields.branches) || [],
        users: parseField(fields.users) || [],
        employees: parseField(fields.employees) || [],
        salaryRecords: parseField(fields.salaryRecords) || [],
        sales: parseField(fields.sales) || [],
        expenses: parseField(fields.expenses) || [],
        inventory: parseField(fields.inventory) || [],
        stockMovements: parseField(fields.stockMovements) || [],
        contacts: parseField(fields.contacts) || [],
        purchases: parseField(fields.purchases) || [],
        supplierReturns: parseField(fields.supplierReturns) || [],
        treasuryAccounts: parseField(fields.treasuryAccounts) || undefined,
        treasuryTransactions: parseField(fields.treasuryTransactions) || [],
        interBranchTransfers: parseField(fields.interBranchTransfers) || [],
        customPositions: parseField(fields.customPositions) || undefined,
        updatedAt: fields.updatedAt?.stringValue || new Date().toISOString(),
        updatedBy: fields.updatedBy?.stringValue || 'Vercel VPN-Free Proxy',
      };

      return res.status(200).json({
        success: true,
        source: 'vercel_proxy',
        data: parsedPayload,
      });
    } catch (err: any) {
      console.error('Vercel Firestore Proxy GET error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  }

  // POST / PATCH: Push Cloud Data to Firestore without VPN
  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const payload = body.payload || body;
      const updatedBy = body.updatedBy || payload.updatedBy || 'Vercel VPN-Free Proxy';

      const fieldsToSave: Record<string, { stringValue: string }> = {
        branches: { stringValue: JSON.stringify(payload.branches || []) },
        users: { stringValue: JSON.stringify(payload.users || []) },
        employees: { stringValue: JSON.stringify(payload.employees || []) },
        salaryRecords: { stringValue: JSON.stringify(payload.salaryRecords || []) },
        sales: { stringValue: JSON.stringify(payload.sales || []) },
        expenses: { stringValue: JSON.stringify(payload.expenses || []) },
        inventory: { stringValue: JSON.stringify(payload.inventory || []) },
        stockMovements: { stringValue: JSON.stringify(payload.stockMovements || []) },
        contacts: { stringValue: JSON.stringify(payload.contacts || []) },
        purchases: { stringValue: JSON.stringify(payload.purchases || []) },
        supplierReturns: { stringValue: JSON.stringify(payload.supplierReturns || []) },
        treasuryAccounts: { stringValue: JSON.stringify(payload.treasuryAccounts || []) },
        treasuryTransactions: { stringValue: JSON.stringify(payload.treasuryTransactions || []) },
        interBranchTransfers: { stringValue: JSON.stringify(payload.interBranchTransfers || []) },
        customPositions: { stringValue: JSON.stringify(payload.customPositions || {}) },
        updatedAt: { stringValue: new Date().toISOString() },
        updatedBy: { stringValue: updatedBy },
      };

      const response = await fetch(REST_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: fieldsToSave }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ success: false, error: errText });
      }

      const result = await response.json();
      return res.status(200).json({
        success: true,
        source: 'vercel_proxy',
        updatedAt: fieldsToSave.updatedAt.stringValue,
      });
    } catch (err: any) {
      console.error('Vercel Firestore Proxy POST error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to push state' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
