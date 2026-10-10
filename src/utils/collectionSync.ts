/**
 * collectionSync.ts - Modular Collection-Based Sync & Migration Engine
 * 
 * Implements the normalized collection-based database structure (Image 1):
 * - /inventory/{itemId}
 * - /sales/{saleId}
 * - /expenses/{expenseId}
 * - /purchases/{purchaseId}
 * - /contacts/{contactId}
 * - /employees/{employeeId}
 * - /branches/{branchId}
 * - /stock_movements/{movementId}
 * - /supplier_benefits/{benefitId}
 * - /supplier_returns/{rmaId}
 * - /treasury_accounts/{accountId}
 * - /treasury_transactions/{txId}
 * - /inter_branch_transfers/{transferId}
 * - /salary_records/{salaryId}
 */

import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Branch,
  Employee,
  SalaryRecord,
  DailySale,
  DailyExpense,
  InventoryItem,
  StockMovement,
  ContactPartner,
  PurchaseRecord,
  TreasuryAccount,
  TreasuryTransaction,
  InterBranchTransfer,
  SupplierReturn,
  SupplierBenefit,
  UserAccount,
} from '../types';

export interface MigrationPayload {
  branches?: Branch[];
  users?: UserAccount[];
  employees?: Employee[];
  salaryRecords?: SalaryRecord[];
  sales?: DailySale[];
  expenses?: DailyExpense[];
  inventory?: InventoryItem[];
  stockMovements?: StockMovement[];
  contacts?: ContactPartner[];
  purchases?: PurchaseRecord[];
  supplierReturns?: SupplierReturn[];
  supplierBenefits?: SupplierBenefit[];
  treasuryAccounts?: TreasuryAccount[];
  treasuryTransactions?: TreasuryTransaction[];
  interBranchTransfers?: InterBranchTransfer[];
}

export interface MigrationProgress {
  currentCategory: string;
  completedItems: number;
  totalItems: number;
  percent: number;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

/**
 * Cleanly saves a single entity document directly into its designated collection (Image 1 pattern).
 * Consumes exactly 1 write unit.
 */
export async function saveDocumentToCollection<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  if (!item || !item.id) return;
  try {
    const docRef = doc(db, collectionName, String(item.id));
    await setDoc(docRef, {
      ...item,
      _syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn(`[collectionSync] Failed to save single doc to ${collectionName}:`, err);
    throw err;
  }
}

/**
 * Cleanly deletes a single entity document from its designated collection.
 */
export async function deleteDocumentFromCollection(
  collectionName: string,
  itemId: string
): Promise<void> {
  if (!itemId) return;
  try {
    const docRef = doc(db, collectionName, String(itemId));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`[collectionSync] Failed to delete doc from ${collectionName}:`, err);
    throw err;
  }
}

/**
 * Migrates all local data into individual Firestore collections (Image 1 structure).
 * Safely processes items with progress feedback and quota detection.
 */
export async function migrateAllToCleanCollections(
  payload: MigrationPayload,
  onProgress: (p: MigrationProgress) => void
): Promise<{ success: boolean; migratedCount: number; error?: string }> {
  const tasks: Array<{ collectionName: string; items: Array<{ id: string; [key: string]: any }> }> = [
    { collectionName: 'branches', items: payload.branches || [] },
    { collectionName: 'employees', items: payload.employees || [] },
    { collectionName: 'salary_records', items: payload.salaryRecords || [] },
    { collectionName: 'inventory', items: payload.inventory || [] },
    { collectionName: 'sales', items: payload.sales || [] },
    { collectionName: 'expenses', items: payload.expenses || [] },
    { collectionName: 'stock_movements', items: payload.stockMovements || [] },
    { collectionName: 'contacts', items: payload.contacts || [] },
    { collectionName: 'purchases', items: payload.purchases || [] },
    { collectionName: 'supplier_benefits', items: payload.supplierBenefits || [] },
    { collectionName: 'supplier_returns', items: payload.supplierReturns || [] },
    { collectionName: 'treasury_accounts', items: payload.treasuryAccounts || [] },
    { collectionName: 'treasury_transactions', items: payload.treasuryTransactions || [] },
    { collectionName: 'inter_branch_transfers', items: payload.interBranchTransfers || [] },
  ];

  const totalItems = tasks.reduce((sum, t) => sum + t.items.length, 0);
  if (totalItems === 0) {
    onProgress({
      currentCategory: 'None',
      completedItems: 0,
      totalItems: 0,
      percent: 100,
      status: 'success',
    });
    return { success: true, migratedCount: 0 };
  }

  let completedItems = 0;
  onProgress({
    currentCategory: 'Starting...',
    completedItems: 0,
    totalItems,
    percent: 0,
    status: 'running',
  });

  try {
    for (const task of tasks) {
      if (task.items.length === 0) continue;

      onProgress({
        currentCategory: task.collectionName,
        completedItems,
        totalItems,
        percent: Math.round((completedItems / totalItems) * 100),
        status: 'running',
      });

      // Process in small batches of 20 to avoid locking the UI and handle quota gracefully
      const BATCH_SIZE = 20;
      for (let i = 0; i < task.items.length; i += BATCH_SIZE) {
        const slice = task.items.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const item of slice) {
          if (!item.id) continue;
          const ref = doc(db, task.collectionName, String(item.id));
          batch.set(ref, {
            ...item,
            _migratedAt: new Date().toISOString(),
          }, { merge: true });
        }

        // Add 12-second timeout to prevent indefinite hanging if Myanmar network blocks Firebase WebSocket
        const commitTimeout = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Firebase Cloud Server သို့ ချိတ်ဆက်မှု ကြာမြင့်နေပါသည် (Connection Timeout)။ အင်တာနက်လိုင်း ကောင်းမွန်မှု ရှိမရှိ သို့မဟုတ် VPN ဖွင့်ထားခြင်း ရှိမရှိ စစ်ဆေးပေးပါခင်ဗျာ။'
                )
              ),
            12000
          )
        );

        await Promise.race([batch.commit(), commitTimeout]);
        completedItems += slice.length;

        onProgress({
          currentCategory: `${task.collectionName} (${completedItems}/${totalItems})`,
          completedItems,
          totalItems,
          percent: Math.round((completedItems / totalItems) * 100),
          status: 'running',
        });

        // Small pause between batches for smooth network execution
        await new Promise((r) => setTimeout(r, 60));
      }
    }

    onProgress({
      currentCategory: 'Completed',
      completedItems: totalItems,
      totalItems,
      percent: 100,
      status: 'success',
    });

    return { success: true, migratedCount: completedItems };
  } catch (err: any) {
    const errorStr = String(err?.message || err);
    console.error('[collectionSync] Migration error:', err);

    let friendlyError = errorStr;
    if (errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Quota limit exceeded') || errorStr.includes('429')) {
      friendlyError = 'Firebase Write Quota (တစ်နေ့တာ ရေးသားခွင့် အကြိမ် ၂၀,၀၀၀) ပြည့်နေပါသဖြင့် စောင့်ဆိုင်းပါ သို့မဟုတ် Firebase Console တွင် Blaze Plan (Pay as you go) ဖွင့်ပေးပါ။';
    }

    onProgress({
      currentCategory: 'Error',
      completedItems,
      totalItems,
      percent: Math.round((completedItems / totalItems) * 100),
      status: 'error',
      errorMessage: friendlyError,
    });

    return { success: false, migratedCount: completedItems, error: friendlyError };
  }
}
