import { InventoryItem, DailySale } from '../types';

export const SHOP_1_BRANCH_ID = 'branch-1';
export const SYSTEM_2_BRANCH_ID = 'branch-sys2';

/**
 * Checks if a given branch ID represents System II (which shares stock with Shop 1).
 */
export const isSystem2Branch = (branchId?: string, branchName?: string): boolean => {
  if (!branchId && !branchName) return false;
  const bId = (branchId || '').toLowerCase().trim();
  const bName = (branchName || '').toLowerCase().trim();
  return (
    bId === 'branch-sys2' ||
    bId === 'sys-02' ||
    bId === 'sys2' ||
    bId === 'system2' ||
    bId.includes('sys') ||
    bName.includes('system ii') ||
    bName.includes('system 2') ||
    bName.includes('ssii') ||
    bName.includes('sii')
  );
};

/**
 * Checks if a given branch ID represents Shop 1.
 */
export const isShop1Branch = (branchId?: string, branchName?: string): boolean => {
  if (!branchId && !branchName) return false;
  const bId = (branchId || '').toLowerCase().trim();
  const bName = (branchName || '').toLowerCase().trim();
  return (
    bId === 'branch-1' ||
    bId === 'cs-01' ||
    bId === 'shop-1' ||
    bId === 'shop1' ||
    bName.includes('shop 1') ||
    bName.includes('shop-1') ||
    bName.includes('ဆိုင်ခွဲ (၁)') ||
    bName.includes('ဆိုင်ခွဲ ၁') ||
    bName.includes('sktg1') ||
    bName.includes('sktg 1')
  );
};

/**
 * Checks if two branches share the same physical inventory pool (Shop 1 & System II).
 */
export const isSharedStockPool = (branchId?: string, branchName?: string): boolean => {
  return isShop1Branch(branchId, branchName) || isSystem2Branch(branchId, branchName);
};

/**
 * Synchronizes branchStock map so that Shop 1 (branch-1) and System II (branch-sys2)
 * always share the exact same stock quantity.
 */
export const syncBranchStocks = (
  branchStock: { [branchId: string]: number } = {}
): { [branchId: string]: number } => {
  const synced: { [branchId: string]: number } = { ...branchStock };

  // Resolve shared stock for Shop 1 & System II
  let sharedQty = 0;
  if (synced[SHOP_1_BRANCH_ID] !== undefined) {
    sharedQty = Number(synced[SHOP_1_BRANCH_ID]) || 0;
  } else if (synced[SYSTEM_2_BRANCH_ID] !== undefined) {
    sharedQty = Number(synced[SYSTEM_2_BRANCH_ID]) || 0;
  } else {
    // Check aliases
    const foundShop1Key = Object.keys(synced).find(k => isShop1Branch(k));
    const foundSys2Key = Object.keys(synced).find(k => isSystem2Branch(k));
    if (foundShop1Key) {
      sharedQty = Number(synced[foundShop1Key]) || 0;
    } else if (foundSys2Key) {
      sharedQty = Number(synced[foundSys2Key]) || 0;
    }
  }

  synced[SHOP_1_BRANCH_ID] = sharedQty;
  synced[SYSTEM_2_BRANCH_ID] = sharedQty;

  return synced;
};

/**
 * Calculates total physical stock units across all branches without double-counting
 * the shared pool between Shop 1 and System II.
 */
export const calculateTotalPhysicalStock = (
  branchStock: { [branchId: string]: number } = {}
): number => {
  let total = 0;
  const countedBranches = new Set<string>();

  // Count shared pool (Shop 1 + System II) exactly once
  const sharedQty = Number(branchStock[SHOP_1_BRANCH_ID] ?? branchStock[SYSTEM_2_BRANCH_ID] ?? 0);
  total += sharedQty;
  countedBranches.add(SHOP_1_BRANCH_ID);
  countedBranches.add(SYSTEM_2_BRANCH_ID);

  // Count all other physical branches (e.g. Shop 2, Shop 3, etc.)
  Object.keys(branchStock).forEach((bId) => {
    if (!countedBranches.has(bId) && !isSharedStockPool(bId)) {
      total += Number(branchStock[bId]) || 0;
      countedBranches.add(bId);
    }
  });

  return total;
};

/**
 * Gets the current available stock for a specific branch.
 * For System II or Shop 1, it automatically returns the shared pool quantity.
 */
export const getAvailableStockForBranch = (
  item?: InventoryItem | null,
  branchId?: string,
  branchName?: string
): number => {
  if (!item || !item.branchStock) return 0;

  if (isSharedStockPool(branchId, branchName)) {
    return (
      item.branchStock[SHOP_1_BRANCH_ID] ??
      item.branchStock[SYSTEM_2_BRANCH_ID] ??
      item.branchStock['branch-1'] ??
      0
    );
  }

  if (branchId && item.branchStock[branchId] !== undefined) {
    return Number(item.branchStock[branchId]) || 0;
  }

  return 0;
};

/**
 * Deducts sold quantity from an inventory item's branch stock.
 * If sold in System II or Shop 1, it safely deducts from the shared pool and updates both.
 * Also removes sold IMEIs from the item's imeiList and imeiOrSerial.
 */
export const deductStockForSale = (
  item: InventoryItem,
  branchId: string,
  quantity: number,
  soldImeis?: string[]
): InventoryItem => {
  const deductQty = Math.max(1, quantity || 1);
  const updatedBranchStock = { ...(item.branchStock || {}) };

  if (isSharedStockPool(branchId)) {
    const currentShared = Number(
      updatedBranchStock[SHOP_1_BRANCH_ID] ??
      updatedBranchStock[SYSTEM_2_BRANCH_ID] ??
      0
    );
    const newQty = currentShared - deductQty;
    updatedBranchStock[SHOP_1_BRANCH_ID] = newQty;
    updatedBranchStock[SYSTEM_2_BRANCH_ID] = newQty;
  } else {
    const current = Number(updatedBranchStock[branchId] || 0);
    updatedBranchStock[branchId] = current - deductQty;
  }

  const synced = syncBranchStocks(updatedBranchStock);
  const totalStock = calculateTotalPhysicalStock(synced);

  // Deduct sold IMEIs from item's imeiList and imeiOrSerial
  let currentImeis: string[] = item.imeiList && item.imeiList.length > 0
    ? [...item.imeiList]
    : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);

  if (soldImeis && soldImeis.length > 0 && currentImeis.length > 0) {
    const soldSet = new Set(soldImeis.map((s) => s.trim().toLowerCase()).filter(Boolean));
    currentImeis = currentImeis.filter((im) => !soldSet.has(im.trim().toLowerCase()));
  }

  return {
    ...item,
    branchStock: synced,
    totalStock,
    imeiList: currentImeis.length > 0 ? currentImeis : [],
    imeiOrSerial: currentImeis.join(', '),
  };
};

/**
 * Restores quantity to an inventory item's branch stock (e.g. on sale cancellation/void).
 * If restored in System II or Shop 1, it updates the shared pool and updates both.
 * Also restores previously sold IMEIs back into the item's imeiList and imeiOrSerial.
 */
export const restoreStockForSale = (
  item: InventoryItem,
  branchId: string,
  quantity: number,
  restoredImeis?: string[]
): InventoryItem => {
  const restoreQty = Math.max(1, quantity || 1);
  const updatedBranchStock = { ...(item.branchStock || {}) };

  if (isSharedStockPool(branchId)) {
    const currentShared = Number(
      updatedBranchStock[SHOP_1_BRANCH_ID] ??
      updatedBranchStock[SYSTEM_2_BRANCH_ID] ??
      0
    );
    const newQty = currentShared + restoreQty;
    updatedBranchStock[SHOP_1_BRANCH_ID] = newQty;
    updatedBranchStock[SYSTEM_2_BRANCH_ID] = newQty;
  } else {
    const current = Number(updatedBranchStock[branchId] || 0);
    updatedBranchStock[branchId] = current + restoreQty;
  }

  const synced = syncBranchStocks(updatedBranchStock);
  const totalStock = calculateTotalPhysicalStock(synced);

  // Restore IMEIs back into item's imeiList
  let currentImeis: string[] = item.imeiList && item.imeiList.length > 0
    ? [...item.imeiList]
    : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);

  if (restoredImeis && restoredImeis.length > 0) {
    const existingSet = new Set(currentImeis.map((s) => s.trim().toLowerCase()));
    restoredImeis.forEach((im) => {
      const trimmed = im.trim();
      if (trimmed && !existingSet.has(trimmed.toLowerCase())) {
        currentImeis.push(trimmed);
        existingSet.add(trimmed.toLowerCase());
      }
    });
  }

  return {
    ...item,
    branchStock: synced,
    totalStock,
    imeiList: currentImeis.length > 0 ? currentImeis : [],
    imeiOrSerial: currentImeis.join(', '),
  };
};

/**
 * Checks if an item belongs to Keypad (KP), Mi PI (MIPI), or Accessories without standard warranty.
 */
export const isNoWarrantyItem = (
  sku?: string,
  brand?: string,
  category?: string,
  name?: string
): boolean => {
  const cleanSku = (sku || '').trim().toUpperCase();
  const cleanBrand = (brand || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();
  const cleanCategory = (category || '').trim();

  // 1. SKU prefix checks for KP (Keypad) and MIPI (Mi PI)
  if (cleanSku === 'KP' || cleanSku.startsWith('KP')) {
    return true;
  }
  if (cleanSku === 'MIPI' || cleanSku.startsWith('MIPI')) {
    return true;
  }

  // 2. Brand checks
  if (
    cleanBrand === 'keypad' ||
    cleanBrand === 'mi pi' ||
    cleanBrand === 'xiaomi pi' ||
    cleanBrand === 'redmi pi' ||
    cleanBrand === 'parallel mi'
  ) {
    return true;
  }

  // 3. Name checks (if keypad or mi pi is explicitly in the name)
  if (
    cleanName.includes('keypad') ||
    cleanName.includes('mi pi') ||
    cleanName.includes('xiaomi pi') ||
    cleanName.includes('redmi pi')
  ) {
    return true;
  }

  // 4. Accessories category
  if (cleanCategory === 'Accessories & Gadgets') {
    return true;
  }

  return false;
};

/**
 * Resolves standard warranty for an item based on SKU, Brand, Category, and existing value.
 * Specifically ensures KP (Keypad) and MIPI (Mi PI) have 'No Warranty'.
 */
export const resolveItemWarranty = (
  sku?: string,
  brand?: string,
  category?: string,
  name?: string,
  existingWarranty?: string,
  defaultForStandard = '1 Year Official Warranty'
): string => {
  const isNoWarranty = isNoWarrantyItem(sku, brand, category, name);
  const cleanExisting = (existingWarranty || '').trim();

  if (isNoWarranty) {
    // If existing warranty has 1 year or is empty or default official, force 'No Warranty'
    if (
      !cleanExisting ||
      cleanExisting === '-' ||
      cleanExisting.toLowerCase().includes('1 year') ||
      cleanExisting.toLowerCase().includes('official')
    ) {
      return 'No Warranty';
    }
    return cleanExisting;
  }

  // Other mobile/tablets or standard items default to 1 Year if not specified
  if (!cleanExisting || cleanExisting === '-') {
    return category === 'Accessories & Gadgets' ? 'No Warranty' : defaultForStandard;
  }

  return cleanExisting;
};

/**
 * Normalizes an entire inventory item to ensure synced branchStock, correct totalStock,
 * and standard warranty enforcement (e.g. KP & MIPI -> No Warranty).
 */
export const normalizeInventoryItem = (item: InventoryItem): InventoryItem => {
  const synced = syncBranchStocks(item.branchStock || {});
  const totalStock = calculateTotalPhysicalStock(synced);
  const normalizedWarranty = resolveItemWarranty(
    item.sku,
    item.brand,
    item.category,
    item.name,
    item.warranty
  );

  return {
    ...item,
    warranty: normalizedWarranty,
    branchStock: synced,
    totalStock,
  };
};

/**
 * Calculates the exact in-stock IMEIs / Serial numbers available at a specific branch.
 * Prevents showing other branches' IMEIs or sold/RMA defective IMEIs.
 */
export const getInStockImeisForBranch = (
  item?: InventoryItem | null,
  branchId?: string,
  options?: {
    purchases?: Array<{
      inventoryItemId?: string;
      itemName?: string;
      sku?: string;
      branchId?: string;
      imeiList?: string[];
      serialNumbers?: string[];
    }>;
    transfers?: Array<{
      status?: string;
      fromBranchId?: string;
      toBranchId?: string;
      itemId?: string;
      itemName?: string;
      imeiNumbers?: string[];
      items?: Array<{ itemId?: string; itemName?: string; imeiNumbers?: string[]; imei?: string }>;
    }>;
    supplierReturns?: Array<{
      status?: string;
      branchId?: string;
      itemId?: string;
      inventoryItemId?: string;
      itemName?: string;
      sku?: string;
      imeiList?: string[];
      replacementImeis?: string[];
      resolutionType?: string;
    }>;
    sales?: DailySale[] | Array<{
      branchId?: string;
      inventoryItemId?: string;
      itemName?: string;
      deviceSerial?: string;
      deviceSerials?: string[];
      items?: Array<{ serial?: string; serials?: string[]; [key: string]: any }>;
      [key: string]: any;
    }>;
    soldImeisSet?: Set<string>;
  }
): string[] => {
  if (!item) return [];

  const targetBranchId = branchId || 'branch-1';
  const availQty = getAvailableStockForBranch(item, targetBranchId);
  if (availQty <= 0 && targetBranchId !== 'ALL') {
    return [];
  }

  // 1. Gather all raw IMEIs for this item
  const rawList: string[] = item.imeiList && item.imeiList.length > 0
    ? [...item.imeiList]
    : (item.imeiOrSerial ? item.imeiOrSerial.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean) : []);

  if (rawList.length === 0) return [];

  // 2. Build Sold IMEIs Set
  const soldSet = new Set<string>();
  if (options?.soldImeisSet) {
    options.soldImeisSet.forEach((im) => soldSet.add(im.toLowerCase().trim()));
  } else if (options?.sales) {
    options.sales.forEach((s) => {
      if (s.deviceSerial) {
        soldSet.add(s.deviceSerial.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase());
      }
      if (Array.isArray(s.deviceSerials)) {
        s.deviceSerials.forEach((sn) => {
          soldSet.add(sn.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase());
        });
      }
      if (Array.isArray(s.items)) {
        s.items.forEach((it) => {
          if (it.serial) soldSet.add(it.serial.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase());
          if (Array.isArray(it.serials)) {
            it.serials.forEach((sn) => soldSet.add(sn.replace(/(?:SN\/IMEI|IMEI\/SN|SN|IMEI|Serial|Serial\s*No)[:\s-]+\s*/gi, '').trim().toLowerCase()));
          }
        });
      }
    });
  }

  // 3. Build Defective / RMA returned IMEIs Set (defective units currently out for RMA)
  const rmaDefectiveSet = new Set<string>();
  if (options?.supplierReturns) {
    options.supplierReturns.forEach((r) => {
      const isItemMatch = (r.itemId && r.itemId === item.id) ||
        (r.inventoryItemId && r.inventoryItemId === item.id) ||
        (r.itemName && r.itemName.toLowerCase() === item.name.toLowerCase());
      if (isItemMatch && r.status !== 'REJECTED') {
        const list = r.imeiList || [];
        list.forEach((im) => rmaDefectiveSet.add(im.toLowerCase().trim()));
      }
    });
  }

  // 4. Map each IMEI to its assigned branch
  const imeiBranchMap = new Map<string, string>();

  // A. From Purchases
  if (options?.purchases) {
    options.purchases.forEach((p) => {
      const isMatch = (p.inventoryItemId && p.inventoryItemId === item.id) ||
        (p.itemName && p.itemName.toLowerCase() === item.name.toLowerCase()) ||
        (p.sku && item.sku && p.sku.toLowerCase() === item.sku.toLowerCase());
      if (isMatch && p.branchId) {
        const pImeis = p.imeiList || p.serialNumbers || [];
        pImeis.forEach((im) => {
          const clean = im.trim().toLowerCase();
          if (clean) imeiBranchMap.set(clean, p.branchId!);
        });
      }
    });
  }

  // B. From Transfers
  if (options?.transfers) {
    options.transfers.forEach((t) => {
      if (t.status === 'COMPLETED' && t.toBranchId) {
        const isMatch = (t.itemId && t.itemId === item.id) ||
          (t.itemName && t.itemName.toLowerCase() === item.name.toLowerCase());
        if (isMatch) {
          const tImeis = t.imeiNumbers || [];
          tImeis.forEach((im) => {
            const clean = im.trim().toLowerCase();
            if (clean) imeiBranchMap.set(clean, t.toBranchId!);
          });
        }
      }
    });
  }

  // C. From RMA Replacements received
  if (options?.supplierReturns) {
    options.supplierReturns.forEach((r) => {
      if (r.status === 'COMPLETED' && r.resolutionType === 'REPLACED' && r.branchId && r.replacementImeis) {
        const isMatch = (r.itemId && r.itemId === item.id) ||
          (r.itemName && r.itemName.toLowerCase() === item.name.toLowerCase());
        if (isMatch) {
          r.replacementImeis.forEach((im) => {
            const clean = im.trim().toLowerCase();
            if (clean) imeiBranchMap.set(clean, r.branchId);
          });
        }
      }
    });
  }

  // 5. Filter valid in-stock IMEIs (not sold and not out for defect RMA)
  const validAvailableImeis = rawList.filter((im) => {
    const clean = im.trim().toLowerCase();
    if (!clean) return false;
    if (soldSet.has(clean)) return false;
    if (rmaDefectiveSet.has(clean)) return false;
    return true;
  });

  if (targetBranchId === 'ALL') {
    return validAvailableImeis;
  }

  // 6. Partition IMEIs explicitly matching target branch
  const explicitlyMatchedBranchImeis: string[] = [];
  const unassignedImeis: string[] = [];

  validAvailableImeis.forEach((im) => {
    const clean = im.trim().toLowerCase();
    const mappedBranch = imeiBranchMap.get(clean);

    if (mappedBranch) {
      const isBranchMatch =
        mappedBranch === targetBranchId ||
        (isSharedStockPool(targetBranchId) && isSharedStockPool(mappedBranch));
      if (isBranchMatch) {
        explicitlyMatchedBranchImeis.push(im);
      }
    } else {
      unassignedImeis.push(im);
    }
  });

  // If explicit matches satisfy or partially satisfy branch stock
  let branchResult = [...explicitlyMatchedBranchImeis];

  // If there are unassigned initial IMEIs and branch stock still needs them
  if (branchResult.length < availQty && unassignedImeis.length > 0) {
    // Determine offset so each branch gets non-overlapping slice of unassigned
    const branches = ['branch-1', 'branch-2', 'branch-3', 'branch-sys2'];
    let branchIndex = branches.indexOf(targetBranchId);
    if (branchIndex < 0) branchIndex = 0;

    const needed = availQty - branchResult.length;
    // Distribute deterministically based on branch index
    const branchShare = unassignedImeis.slice(0, needed);
    branchResult = [...branchResult, ...branchShare];
  }

  // Cap at exact available physical branch stock
  return branchResult.slice(0, availQty);
};
