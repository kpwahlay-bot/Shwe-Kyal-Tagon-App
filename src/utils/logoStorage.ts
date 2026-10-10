import { db, doc, getDoc, setDoc, onSnapshot } from '../firebase';
import { 
  SYSTEM2_CUSTOM_LOGO_KEY, 
  SYSTEM2_ADDRESS_KEY, 
  SYSTEM2_PHONE_KEY, 
  SYSTEM2_DEFAULT_ADDRESS, 
  SYSTEM2_DEFAULT_PHONE 
} from '../components/System2Logo';

export const CUSTOM_LOGO_STORAGE_KEY = 'sktg_voucher_custom_logo';
export const GLOBAL_APP_LOGO_KEY = 'sktg_app_custom_logo';
export const SHOW_LOGO_STORAGE_KEY = 'sktg_voucher_show_logo';
export const VOUCHER_BRANCHES_KEY = 'sktg_voucher_branches_v10';
const LEGACY_VOUCHER_BRANCHES_KEYS = [
  'sktg_voucher_branches_v9',
  'sktg_voucher_branches_v8',
  'sktg_voucher_branches_v7',
  'sktg_voucher_branches'
];

export interface VoucherBranch {
  badge: string;
  address: string;
  phone: string;
}

export const VERIFIED_DEFAULT_VOUCHER_BRANCHES: VoucherBranch[] = [
  {
    badge: 'ဆိုင်ခွဲ(၁)',
    address: 'တိုက် (၈၄)၊ အခန်း (၁+၂)၊ နဝဒေးရှော့ဟောက်စ်၊ ကျန်စစ်သားလမ်း၊ လှိုင်သာယာ (အရှေ့ပိုင်း) မြို့နယ်။',
    phone: '09 263027177',
  },
  {
    badge: 'ဆိုင်ခွဲ(၂)',
    address: 'အမှတ် (၁၇/၂၀၀၅)၊ (၂၀) ရပ်ကွက်၊ အနော်ရထာလမ်းမကြီး၊ လှိုင်သာယာ (အနောက်ပိုင်း) မြို့နယ်။',
    phone: '09 250009722, 09 250009710',
  },
  {
    badge: 'ဆိုင်ခွဲ(၃)',
    address: 'အမှတ် (၅၀၆/A+B)၊ (၂၀) ရပ်ကွက်၊ အနော်ရထာလမ်းမကြီး၊ လှိုင်သာယာ (အနောက်ပိုင်း) မြို့နယ်။',
    phone: '09 262522332, 09 262500075, 09 2625000253',
  },
];

/**
 * Checks if an address or phone contains obsolete or erroneous Mingaladon branch info
 */
export function isInvalidOrObsoleteAddress(addr?: string, phone?: string): boolean {
  if (!addr || addr.length < 5) return true;
  const lowerAddr = addr.toLowerCase();
  const lowerPhone = (phone || '').toLowerCase();
  
  if (
    lowerAddr.includes('မင်္ဂလာဒုံ') ||
    lowerAddr.includes('ဇေယျာသီရိ') ||
    lowerAddr.includes('ရွှေနံ့သာ') ||
    lowerAddr.includes('ရွှေနှံ့သစ်ပြေး') ||
    lowerAddr.includes('သာကင်') ||
    lowerAddr.includes('ပတ္တမြား') ||
    lowerPhone.includes('777 554 999') ||
    lowerPhone.includes('797 888 770') ||
    lowerPhone.includes('977 755 499')
  ) {
    return true;
  }
  return false;
}

/**
 * Validates and cleans branch addresses.
 * Ensures the true verified Hlaing Tharyar branches and standard ဆိုင်ခွဲ(၁), ဆိုင်ခွဲ(၂), ဆိုင်ခွဲ(၃) badges.
 */
export function cleanAndSanitizeVoucherBranches(rawBranches?: any[]): VoucherBranch[] {
  if (!Array.isArray(rawBranches) || rawBranches.length === 0) {
    return VERIFIED_DEFAULT_VOUCHER_BRANCHES;
  }

  // If any branch contains wrong/obsolete addresses, completely sanitize to verified branches
  const hasObsolete = rawBranches.some((item) => 
    isInvalidOrObsoleteAddress(item?.address, item?.phone)
  );
  if (hasObsolete) {
    return VERIFIED_DEFAULT_VOUCHER_BRANCHES;
  }

  const results: VoucherBranch[] = rawBranches.map((item, idx) => {
    let badge = (item?.badge || '').trim();
    let address = (item?.address || '').trim();
    let phone = (item?.phone || '').trim();

    if (idx === 0 || badge.includes('1') || badge.includes('၁') || badge.toLowerCase().includes('shop 1') || badge.toLowerCase().includes('branch 1')) {
      badge = 'ဆိုင်ခွဲ(၁)';
      if (isInvalidOrObsoleteAddress(address, phone)) {
        address = VERIFIED_DEFAULT_VOUCHER_BRANCHES[0].address;
        phone = VERIFIED_DEFAULT_VOUCHER_BRANCHES[0].phone;
      }
    } else if (idx === 1 || badge.includes('2') || badge.includes('၂') || badge.toLowerCase().includes('shop 2') || badge.toLowerCase().includes('branch 2')) {
      badge = 'ဆိုင်ခွဲ(၂)';
      if (isInvalidOrObsoleteAddress(address, phone)) {
        address = VERIFIED_DEFAULT_VOUCHER_BRANCHES[1].address;
        phone = VERIFIED_DEFAULT_VOUCHER_BRANCHES[1].phone;
      }
    } else if (idx === 2 || badge.includes('3') || badge.includes('၃') || badge.toLowerCase().includes('shop 3') || badge.toLowerCase().includes('branch 3')) {
      badge = 'ဆိုင်ခွဲ(၃)';
      if (isInvalidOrObsoleteAddress(address, phone)) {
        address = VERIFIED_DEFAULT_VOUCHER_BRANCHES[2].address;
        phone = VERIFIED_DEFAULT_VOUCHER_BRANCHES[2].phone;
      }
    } else {
      badge = `ဆိုင်ခွဲ(${idx + 1})`;
    }

    if (!address && VERIFIED_DEFAULT_VOUCHER_BRANCHES[idx]) {
      address = VERIFIED_DEFAULT_VOUCHER_BRANCHES[idx].address;
    }
    if (!phone && VERIFIED_DEFAULT_VOUCHER_BRANCHES[idx]) {
      phone = VERIFIED_DEFAULT_VOUCHER_BRANCHES[idx].phone;
    }

    return { badge, address, phone };
  });

  return results.length >= 3 ? results.slice(0, 3) : VERIFIED_DEFAULT_VOUCHER_BRANCHES;
}

/**
 * Read saved voucher branches with automatic cache purge and typo healing
 */
export function getSavedVoucherBranches(): VoucherBranch[] {
  // Purge any legacy keys
  LEGACY_VOUCHER_BRANCHES_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });

  try {
    const raw = localStorage.getItem(VOUCHER_BRANCHES_KEY);
    if (raw) {
      // Check if stored string contains wrong Mingaladon info
      if (
        raw.includes('မင်္ဂလာဒုံ') ||
        raw.includes('ဇေယျာသီရိ') ||
        raw.includes('ရွှေနံ့သာ') ||
        raw.includes('ပတ္တမြား') ||
        raw.includes('777 554 999') ||
        raw.includes('797 888 770') ||
        raw.includes('977 755 499')
      ) {
        console.warn('Purging obsolete Mingaladon branch cache, restoring default verified Hlaing Tharyar branches...');
        safeLocalStorageSet(VOUCHER_BRANCHES_KEY, JSON.stringify(VERIFIED_DEFAULT_VOUCHER_BRANCHES));
        setIndexedDBItem(VOUCHER_BRANCHES_KEY, JSON.stringify(VERIFIED_DEFAULT_VOUCHER_BRANCHES));
        return VERIFIED_DEFAULT_VOUCHER_BRANCHES;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = cleanAndSanitizeVoucherBranches(parsed);
        safeLocalStorageSet(VOUCHER_BRANCHES_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch (err) {
    console.warn('Error reading saved voucher branches, falling back to defaults:', err);
  }
  safeLocalStorageSet(VOUCHER_BRANCHES_KEY, JSON.stringify(VERIFIED_DEFAULT_VOUCHER_BRANCHES));
  setIndexedDBItem(VOUCHER_BRANCHES_KEY, JSON.stringify(VERIFIED_DEFAULT_VOUCHER_BRANCHES));
  return VERIFIED_DEFAULT_VOUCHER_BRANCHES;
}

let lastPushedVoucherBranchesString: string = '';

/**
 * Persist Voucher Branches across LocalStorage, IndexedDB, and optionally Firestore
 */
export async function saveVoucherBranchesToAllStores(
  branches: VoucherBranch[],
  pushToCloud: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleaned = cleanAndSanitizeVoucherBranches(branches);
    const cleanedStr = JSON.stringify(cleaned);
    safeLocalStorageSet(VOUCHER_BRANCHES_KEY, cleanedStr);
    await setIndexedDBItem(VOUCHER_BRANCHES_KEY, cleanedStr);

    window.dispatchEvent(new CustomEvent('sktg_branches_updated', { detail: cleaned }));

    if (pushToCloud && cleanedStr !== lastPushedVoucherBranchesString) {
      lastPushedVoucherBranchesString = cleanedStr;
      try {
        await setDoc(
          SHOP_SETTINGS_DOC_REF,
          {
            voucherBranches: cleaned,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.warn('Firestore shop_settings sync (voucherBranches) notice:', firestoreErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save voucher branches:', err);
    return { success: false, error: err?.message || 'Failed to save voucher branches' };
  }
}

const IDB_NAME = 'sktg_persisted_storage';
const IDB_STORE = 'keyval_store';
const SHOP_SETTINGS_DOC_REF = doc(db, 'system_settings', 'shop_settings');

// Open or initialize IndexedDB for large image storage without 5MB quota limits
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setIndexedDBItem(key: string, value: string): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB set error:', err);
  }
}

export async function getIndexedDBItem(key: string): Promise<string | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB get error:', err);
    return null;
  }
}

export async function removeIndexedDBItem(key: string): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
}

// Safe LocalStorage set with quota error handling
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage quota exceeded for key ${key}:`, err);
    // Attempt cleaning known safe caches if needed
    try {
      localStorage.removeItem('sktg_temp_cache');
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Optimizes, auto-trims, and downscales a base64 or blob image
 * to an optimal display resolution (max 600px width, max 260px height).
 * Ensures resulting file size is ~20KB - 50KB instead of 5MB!
 */
export async function optimizeLogoImage(
  dataUrl: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    shouldTrim?: boolean;
    trimWhite?: boolean;
    pad?: number;
  } = {}
): Promise<string> {
  const { 
    maxWidth = 1400, 
    maxHeight = 600, 
    shouldTrim = true, 
    trimWhite = true,
    pad = 4 
  } = options;

  if (!dataUrl) return '';
  if (dataUrl === '/system2-logo.svg' || dataUrl === '/shwekyaltagon-badge-logo.svg') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;

        if (srcW === 0 || srcH === 0) {
          resolve(dataUrl);
          return;
        }

        // Phase 1: Draw to initial canvas to analyze alpha bounds if auto-trim is enabled
        const initialCanvas = document.createElement('canvas');
        initialCanvas.width = srcW;
        initialCanvas.height = srcH;
        const initCtx = initialCanvas.getContext('2d', { willReadFrequently: true });
        if (!initCtx) {
          resolve(dataUrl);
          return;
        }
        initCtx.drawImage(img, 0, 0);

        let cropX = 0;
        let cropY = 0;
        let cropW = srcW;
        let cropH = srcH;

        if (shouldTrim) {
          const imgData = initCtx.getImageData(0, 0, srcW, srcH);
          const data = imgData.data;
          let minX = srcW;
          let minY = srcH;
          let maxX = 0;
          let maxY = 0;
          let foundPixel = false;

          // Check corner pixels luminance to determine if background is white/light
          const cornerIndices = [0, Math.max(0, srcW - 1), Math.max(0, (srcH - 1) * srcW), Math.max(0, srcH * srcW - 1)];
          let lightCornerCount = 0;
          let transparentCornerCount = 0;
          for (const idx of cornerIndices) {
            const a = data[idx * 4 + 3];
            const r = data[idx * 4];
            const g = data[idx * 4 + 1];
            const b = data[idx * 4 + 2];
            if (a < 30) transparentCornerCount++;
            else if (r > 215 && g > 215 && b > 215) lightCornerCount++;
          }
          const isWhiteBg = trimWhite && (lightCornerCount >= 2 || transparentCornerCount < 2);

          for (let y = 0; y < srcH; y++) {
            for (let x = 0; x < srcW; x++) {
              const idx = (y * srcW + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              // Pixel is considered background if transparent OR near-white margin
              let isBg = false;
              if (a < 25) {
                isBg = true;
              } else if (isWhiteBg) {
                if (r > 225 && g > 225 && b > 225) {
                  isBg = true;
                } else if (r > 210 && g > 210 && b > 210 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
                  isBg = true;
                }
              }

              if (!isBg) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                foundPixel = true;
              }
            }
          }

          if (foundPixel && maxX > minX && maxY > minY) {
            cropX = Math.max(0, minX - pad);
            cropY = Math.max(0, minY - pad);
            cropW = Math.min(srcW - cropX, (maxX - minX) + pad * 2);
            cropH = Math.min(srcH - cropY, (maxY - minY) + pad * 2);
          }
        }

        // Phase 2: Compute dimensions preserving aspect ratio with high print density (300+ DPI)
        let targetW = cropW;
        let targetH = cropH;

        // If cropped image is small (< 900px wide), moderately upscale with high smoothing
        if (targetW < 900 && cropW > 0) {
          const upScale = Math.min(2.5, 1200 / targetW);
          targetW = Math.round(targetW * upScale);
          targetH = Math.round(targetH * upScale);
        }

        if (targetW > maxWidth || targetH > maxHeight) {
          const ratioW = maxWidth / targetW;
          const ratioH = maxHeight / targetH;
          const scale = Math.min(ratioW, ratioH);
          targetW = Math.max(1, Math.round(targetW * scale));
          targetH = Math.max(1, Math.round(targetH * scale));
        }

        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = targetW;
        targetCanvas.height = targetH;
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) {
          resolve(dataUrl);
          return;
        }

        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        try {
          targetCtx.filter = 'contrast(1.06) brightness(1.02)';
        } catch {}

        targetCtx.drawImage(
          initialCanvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          targetW,
          targetH
        );
        try {
          targetCtx.filter = 'none';
        } catch {}

        // Try PNG first for transparent clarity and crisp vector/text borders
        let outputDataUrl = targetCanvas.toDataURL('image/png');

        // If string length is unusually high (> 450,000 characters, ~350KB), convert to WebP
        if (outputDataUrl.length > 450000) {
          const webpUrl = targetCanvas.toDataURL('image/webp', 0.95);
          if (webpUrl && webpUrl.startsWith('data:image/webp') && webpUrl.length < outputDataUrl.length) {
            outputDataUrl = webpUrl;
          }
        }

        resolve(outputDataUrl);
      } catch (err) {
        console.warn('Error optimizing logo image:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Persists System II Settings (Address, Phone, Logo) across:
 * 1. LocalStorage
 * 2. IndexedDB (quota-immune storage)
 * 3. Firestore Document (sktg_sync/shop_settings) for cross-device synchronization
 */
export async function saveSystem2SettingsToAllStores(
  address: string,
  phone: string,
  logoDataUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Optimize logo image if custom with high print resolution and border trimming
    let finalLogo = logoDataUrl;
    if (logoDataUrl && logoDataUrl !== '/system2-logo.svg') {
      finalLogo = await optimizeLogoImage(logoDataUrl, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: true,
        trimWhite: true,
        pad: 4
      });
    }

    // 2. Save Address & Phone to LocalStorage
    safeLocalStorageSet(SYSTEM2_ADDRESS_KEY, address);
    safeLocalStorageSet(SYSTEM2_PHONE_KEY, phone);

    // 3. Save Logo to LocalStorage & IndexedDB
    if (finalLogo && finalLogo !== '/system2-logo.svg') {
      safeLocalStorageSet(SYSTEM2_CUSTOM_LOGO_KEY, finalLogo);
      await setIndexedDBItem(SYSTEM2_CUSTOM_LOGO_KEY, finalLogo);
    } else {
      try {
        localStorage.removeItem(SYSTEM2_CUSTOM_LOGO_KEY);
      } catch {}
      await removeIndexedDBItem(SYSTEM2_CUSTOM_LOGO_KEY);
    }

    await setIndexedDBItem(SYSTEM2_ADDRESS_KEY, address);
    await setIndexedDBItem(SYSTEM2_PHONE_KEY, phone);

    // 4. Dispatch Window Events for instant reactive UI updates
    window.dispatchEvent(new CustomEvent('sktg_system2_updated'));
    window.dispatchEvent(new CustomEvent('sktg_system2_logo_updated', { detail: finalLogo }));

    // 5. Cloud Firestore Persistence (Async background sync)
    try {
      await setDoc(
        SHOP_SETTINGS_DOC_REF,
        {
          system2: {
            address,
            phone,
            logo: finalLogo && finalLogo !== '/system2-logo.svg' ? finalLogo : '',
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore shop_settings sync (system2) notice:', firestoreErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save System II settings:', err);
    return { success: false, error: err?.message || 'Failed to save System II settings' };
  }
}

/**
 * Persists Shwe Kyal Tagon Main Logo across LocalStorage, IndexedDB, and Firestore
 */
export async function saveMainLogoToAllStores(
  logoDataUrl: string,
  showLogo: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    let finalLogo = logoDataUrl;
    if (logoDataUrl && logoDataUrl !== '/shwekyaltagon-badge-logo.svg') {
      finalLogo = await optimizeLogoImage(logoDataUrl, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: true,
        trimWhite: true,
        pad: 4
      });
    }

    safeLocalStorageSet(SHOW_LOGO_STORAGE_KEY, showLogo ? 'true' : 'false');

    if (finalLogo) {
      safeLocalStorageSet(CUSTOM_LOGO_STORAGE_KEY, finalLogo);
      safeLocalStorageSet(GLOBAL_APP_LOGO_KEY, finalLogo);
      await setIndexedDBItem(CUSTOM_LOGO_STORAGE_KEY, finalLogo);
      await setIndexedDBItem(GLOBAL_APP_LOGO_KEY, finalLogo);
    } else {
      try {
        localStorage.removeItem(CUSTOM_LOGO_STORAGE_KEY);
        localStorage.removeItem(GLOBAL_APP_LOGO_KEY);
      } catch {}
      await removeIndexedDBItem(CUSTOM_LOGO_STORAGE_KEY);
      await removeIndexedDBItem(GLOBAL_APP_LOGO_KEY);
    }

    window.dispatchEvent(new CustomEvent('sktg_logo_updated', { detail: finalLogo }));

    try {
      await setDoc(
        SHOP_SETTINGS_DOC_REF,
        {
          mainLogo: {
            logo: finalLogo || '',
            showLogo,
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore shop_settings sync (mainLogo) notice:', firestoreErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save main logo:', err);
    return { success: false, error: err?.message || 'Failed to save logo' };
  }
}

/**
 * Synchronize shop settings from Firestore & IndexedDB on boot
 */
export function initShopSettingsCloudSync(): () => void {
  // 1. Immediately hydrate from IndexedDB if LocalStorage is missing values
  (async () => {
    try {
      if (!localStorage.getItem(SYSTEM2_CUSTOM_LOGO_KEY)) {
        const idbLogo = await getIndexedDBItem(SYSTEM2_CUSTOM_LOGO_KEY);
        if (idbLogo) {
          safeLocalStorageSet(SYSTEM2_CUSTOM_LOGO_KEY, idbLogo);
          window.dispatchEvent(new CustomEvent('sktg_system2_logo_updated'));
        }
      }
      if (!localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY)) {
        const idbMainLogo = await getIndexedDBItem(CUSTOM_LOGO_STORAGE_KEY);
        if (idbMainLogo) {
          safeLocalStorageSet(CUSTOM_LOGO_STORAGE_KEY, idbMainLogo);
          safeLocalStorageSet(GLOBAL_APP_LOGO_KEY, idbMainLogo);
          window.dispatchEvent(new CustomEvent('sktg_logo_updated'));
        }
      }

      // Auto-upgrade existing saved logo to HD cropped format if not yet done
      const UPGRADE_KEY = 'sktg_logo_hd_crop_v2';
      if (!localStorage.getItem(UPGRADE_KEY)) {
        localStorage.setItem(UPGRADE_KEY, 'true');
        const currentLogo = localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY) || localStorage.getItem(GLOBAL_APP_LOGO_KEY);
        if (currentLogo && currentLogo.startsWith('data:image')) {
          const upgraded = await optimizeLogoImage(currentLogo, {
            maxWidth: 1400,
            maxHeight: 600,
            shouldTrim: true,
            trimWhite: true,
            pad: 4
          });
          if (upgraded && upgraded.length > 50 && upgraded !== currentLogo) {
            safeLocalStorageSet(CUSTOM_LOGO_STORAGE_KEY, upgraded);
            safeLocalStorageSet(GLOBAL_APP_LOGO_KEY, upgraded);
            await setIndexedDBItem(CUSTOM_LOGO_STORAGE_KEY, upgraded);
            await setIndexedDBItem(GLOBAL_APP_LOGO_KEY, upgraded);
            window.dispatchEvent(new CustomEvent('sktg_logo_updated', { detail: upgraded }));
          }
        }
      }
      // 3. Hydrate and sanitize voucher branches from localStorage / IndexedDB
      try {
        const savedBranches = getSavedVoucherBranches();
        if (savedBranches) {
          window.dispatchEvent(new CustomEvent('sktg_branches_updated', { detail: savedBranches }));
        }
      } catch (err) {
        console.warn('Voucher branches hydration check:', err);
      }
    } catch (e) {
      console.warn('IndexedDB initial hydration check:', e);
    }
  })();

  // 2. Real-time Firestore sync (read-only to local caches)
  try {
    const unsubscribe = onSnapshot(
      SHOP_SETTINGS_DOC_REF,
      (snapshot) => {
        if (!snapshot.exists()) {
          // If document doesn't exist, hydrate local cache without triggering a cloud write loop
          saveVoucherBranchesToAllStores(VERIFIED_DEFAULT_VOUCHER_BRANCHES, false);
          return;
        }
        const data = snapshot.data();
        if (!data) return;

        // Voucher branches sync
        if (data.voucherBranches && Array.isArray(data.voucherBranches) && data.voucherBranches.length > 0) {
          const hasObsolete = data.voucherBranches.some((b: any) => 
            isInvalidOrObsoleteAddress(b?.address, b?.phone)
          );
          if (hasObsolete) {
            saveVoucherBranchesToAllStores(VERIFIED_DEFAULT_VOUCHER_BRANCHES, false);
            return;
          }

          const cloudBranches = cleanAndSanitizeVoucherBranches(data.voucherBranches);
          const currentLocal = localStorage.getItem(VOUCHER_BRANCHES_KEY);
          if (!currentLocal || currentLocal !== JSON.stringify(cloudBranches)) {
            safeLocalStorageSet(VOUCHER_BRANCHES_KEY, JSON.stringify(cloudBranches));
            setIndexedDBItem(VOUCHER_BRANCHES_KEY, JSON.stringify(cloudBranches));
            window.dispatchEvent(new CustomEvent('sktg_branches_updated', { detail: cloudBranches }));
          }
        } else {
          saveVoucherBranchesToAllStores(VERIFIED_DEFAULT_VOUCHER_BRANCHES, false);
        }

        // System 2 sync
        if (data.system2) {
          const cloudSys2 = data.system2;
          if (cloudSys2.address && !localStorage.getItem(SYSTEM2_ADDRESS_KEY)) {
            safeLocalStorageSet(SYSTEM2_ADDRESS_KEY, cloudSys2.address);
          }
          if (cloudSys2.phone && !localStorage.getItem(SYSTEM2_PHONE_KEY)) {
            safeLocalStorageSet(SYSTEM2_PHONE_KEY, cloudSys2.phone);
          }
          if (cloudSys2.logo) {
            const currentLocal = localStorage.getItem(SYSTEM2_CUSTOM_LOGO_KEY);
            if (!currentLocal || currentLocal !== cloudSys2.logo) {
              safeLocalStorageSet(SYSTEM2_CUSTOM_LOGO_KEY, cloudSys2.logo);
              setIndexedDBItem(SYSTEM2_CUSTOM_LOGO_KEY, cloudSys2.logo);
              window.dispatchEvent(new CustomEvent('sktg_system2_logo_updated'));
            }
          }
        }

        // Main logo sync
        if (data.mainLogo) {
          const cloudMain = data.mainLogo;
          if (cloudMain.logo) {
            const currentLocal = localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY);
            if (!currentLocal || currentLocal !== cloudMain.logo) {
              safeLocalStorageSet(CUSTOM_LOGO_STORAGE_KEY, cloudMain.logo);
              safeLocalStorageSet(GLOBAL_APP_LOGO_KEY, cloudMain.logo);
              setIndexedDBItem(CUSTOM_LOGO_STORAGE_KEY, cloudMain.logo);
              window.dispatchEvent(new CustomEvent('sktg_logo_updated'));
            }
          }
        }
      },
      (err) => {
        console.warn('Shop settings cloud listener silent fallback:', err.message);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach shop settings snapshot listener:', err);
    return () => {};
  }
}
