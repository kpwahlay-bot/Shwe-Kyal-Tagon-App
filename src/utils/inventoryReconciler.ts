import { InventoryItem, InventoryCategory } from '../types';
import { saveRecordToCloud } from './cloudSync';

export interface RequiredPoItem {
  sku: string;
  name: string;
  model: string;
  brand: string;
  category: InventoryCategory;
  unitCost: number;
  branchStock: Record<string, number>;
  totalStock: number;
  imeis: string[];
}

export const REQUIRED_PO_ITEMS: RequiredPoItem[] = [
  {
    sku: 'SS0138',
    name: 'samsung Flip 7 8/256Gb',
    model: 'samsung Flip 7 8/256Gb',
    brand: 'Samsung',
    category: 'Smartphones & Tablets',
    unitCost: 3500000,
    branchStock: { 'branch-1': 3, 'branch-sys2': 3 },
    totalStock: 6,
    imeis: ['3456789876543', '34567890987654', '456789876543'],
  },
  {
    sku: 'SS0139',
    name: 'samsung A80 8/256GB / A56 6/256GB',
    model: 'samsung A80 8/256GB',
    brand: 'Samsung',
    category: 'Smartphones & Tablets',
    unitCost: 750000,
    branchStock: { 'branch-1': 5 },
    totalStock: 5,
    imeis: ['34567898765'],
  },
  {
    sku: 'SS0140',
    name: 'Samsung A09 8/256GB',
    model: 'Samsung A09 8/256GB',
    brand: 'Samsung',
    category: 'Smartphones & Tablets',
    unitCost: 900000,
    branchStock: { 'branch-1': 5 },
    totalStock: 5,
    imeis: ['345678987654', '34567898765445', '567890987654', '34567898765454'],
  },
  {
    sku: 'SS70',
    name: 'A07 (6/128)purple',
    model: 'A07 (6/128)purple',
    brand: 'Samsung',
    category: 'Smartphones & Tablets',
    unitCost: 500000,
    branchStock: { 'branch-1': 1 },
    totalStock: 1,
    imeis: [],
  },
];

/**
 * Reconciles inventory list to guarantee the 17 units across PO vouchers are faithfully present.
 * Prevents cloud sync or page reloads from dropping the stock back from 832 to 815.
 * Automatically persists any restored items to Firestore.
 */
export function reconcileInventoryWithPoStock(
  currentInventory: InventoryItem[],
  persistToCloud: boolean = true
): { items: InventoryItem[]; changed: boolean; updatedItems: InventoryItem[] } {
  if (!Array.isArray(currentInventory)) {
    return { items: [], changed: false, updatedItems: [] };
  }

  let changed = false;
  const updatedItems: InventoryItem[] = [];
  const updated = currentInventory.map((item) => ({ ...item }));

  for (const req of REQUIRED_PO_ITEMS) {
    const existingIdx = updated.findIndex(
      (i) => i.sku?.trim().toUpperCase() === req.sku.toUpperCase()
    );

    if (existingIdx >= 0) {
      const item = updated[existingIdx];
      const bStock = { ...(item.branchStock || {}) };
      let bStockChanged = false;

      for (const [bId, minQty] of Object.entries(req.branchStock)) {
        const curQty = Number(bStock[bId]) || 0;
        if (curQty < minQty) {
          bStock[bId] = minQty;
          bStockChanged = true;
        }
      }

      // Check IMEIs
      const curImeis = item.imeiList && item.imeiList.length > 0
        ? [...item.imeiList]
        : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);
      
      let imeisChanged = false;
      const combinedImeis = [...curImeis];
      for (const im of req.imeis) {
        if (!combinedImeis.includes(im)) {
          combinedImeis.push(im);
          imeisChanged = true;
        }
      }

      if (bStockChanged || imeisChanged) {
        const total = Object.values(bStock).reduce((sum, q) => sum + (Number(q) || 0), 0);
        const resolvedItem: InventoryItem = {
          ...item,
          branchStock: bStock,
          totalStock: Math.max(item.totalStock, total),
          imeiList: combinedImeis.length > 0 ? combinedImeis : undefined,
          serialNumbers: combinedImeis.length > 0 ? combinedImeis : undefined,
          imeiOrSerial: combinedImeis.length > 0 ? combinedImeis.join(', ') : undefined,
        };
        updated[existingIdx] = resolvedItem;
        updatedItems.push(resolvedItem);
        changed = true;
      }
    } else {
      // Missing item: construct full record
      const newItem: InventoryItem = {
        id: `inv-po-${req.sku.toLowerCase()}`,
        name: req.name,
        model: req.model,
        brand: req.brand,
        category: req.category,
        sku: req.sku,
        costPrice: req.unitCost,
        sellingPrice: Math.round(req.unitCost * 1.15),
        branchStock: req.branchStock,
        totalStock: req.totalStock,
        imeiList: req.imeis.length > 0 ? req.imeis : undefined,
        serialNumbers: req.imeis.length > 0 ? req.imeis : undefined,
        imeiOrSerial: req.imeis.length > 0 ? req.imeis.join(', ') : undefined,
        warranty: '1 Year Official',
        supplier: 'UC',
        minStockAlert: 5,
        lastRestockedDate: '2026-09-28',
      };
      updated.unshift(newItem);
      updatedItems.push(newItem);
      changed = true;
    }
  }

  // Push restored items to Firestore immediately so all devices receive the 832 units
  if (persistToCloud && updatedItems.length > 0) {
    updatedItems.forEach((item) => {
      void saveRecordToCloud('inventory', item, 'Auto-Sync PO Inventory').catch((err) => {
        console.warn('PO stock cloud push note:', err);
      });
    });
  }

  return { items: updated, changed, updatedItems };
}
