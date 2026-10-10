import { InventoryCategory } from '../types';

export interface CategorySKUConfig {
  category: string;
  codeName: string;
  start: number;
  min: number;
  max: number;
  badge: string;
  badgeClass: string;
}

export interface BrandSKUConfig {
  brand: string;
  prefix: string;
  example: string;
  category: InventoryCategory;
  aliases: string[];
  badgeClass?: string;
  isCustom?: boolean;
}

/**
 * Brand-specific Code Configurations as designated by shop standard
 */
export const DEFAULT_PRIMARY_SHOP_BRANDS: BrandSKUConfig[] = [
  // 1. Mobile / Smartphones & Tablets
  { brand: 'Samsung', prefix: 'SS', example: 'SS0001', category: 'Smartphones & Tablets', aliases: ['samsung', 'galaxy', 'sm-', 'z flip', 'z fold', 'flip', 'fold'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'Honor', prefix: 'HN', example: 'HN0001', category: 'Smartphones & Tablets', aliases: ['honor'], badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
  { brand: 'Huawei', prefix: 'HW', example: 'HW0001', category: 'Smartphones & Tablets', aliases: ['huawei', 'matepad', 'matebook', 'nova'], badgeClass: 'bg-red-100 text-red-800 border-red-300' },
  { brand: 'Infinix', prefix: 'IN', example: 'IN0001', category: 'Smartphones & Tablets', aliases: ['infinix', 'hot', 'smart', 'zero', 'note'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { brand: 'iPhone', prefix: 'IP', example: 'IP0001', category: 'Smartphones & Tablets', aliases: ['iphone', 'apple', 'ipad', 'airpods', 'macbook', 'apple watch', 'ios'], badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  { brand: 'Itel', prefix: 'IT', example: 'IT0001', category: 'Smartphones & Tablets', aliases: ['itel', 'vision', 'a-series'], badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  { brand: 'Keypad', prefix: 'KP', example: 'KP0001', category: 'Smartphones & Tablets', aliases: ['keypad', 'basic phone', 'button phone', 'feature phone', 'benco', 'kenxinda', 'gfive'], badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { brand: 'Mi Official', prefix: 'MIOF', example: 'MIOF0001', category: 'Smartphones & Tablets', aliases: ['mi official', 'xiaomi official', 'redmi official', 'official mi'], badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { brand: 'Mi PI', prefix: 'MIPI', example: 'MIPI0001', category: 'Smartphones & Tablets', aliases: ['mi pi', 'xiaomi pi', 'redmi pi', 'parallel mi', 'mi', 'xiaomi', 'redmi'], badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { brand: 'Meizu', prefix: 'M', example: 'M0001', category: 'Smartphones & Tablets', aliases: ['meizu', 'mblu'], badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { brand: 'Nubia', prefix: 'NUB', example: 'NUB0001', category: 'Smartphones & Tablets', aliases: ['nubia', 'redmagic', 'z-series'], badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { brand: 'Oppo', prefix: 'OP', example: 'OP0001', category: 'Smartphones & Tablets', aliases: ['oppo', 'reno', 'find', 'a-series'], badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' },
  { brand: 'POCO', prefix: 'POC', example: 'POC0001', category: 'Smartphones & Tablets', aliases: ['poco', 'xiaomi poco', 'f-series', 'x-series', 'm-series'], badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { brand: 'Realme', prefix: 'RM', example: 'RM0001', category: 'Smartphones & Tablets', aliases: ['realme', 'narzo', 'c-series', 'gt'], badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { brand: 'Tecno', prefix: 'TC', example: 'TC0001', category: 'Smartphones & Tablets', aliases: ['tecno', 'spark', 'camon', 'pova', 'phantom'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'Vivo', prefix: 'VV', example: 'VV0001', category: 'Smartphones & Tablets', aliases: ['vivo', 'iqoo', 'y-series', 'v-series', 'x-series'], badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { brand: 'Pixel', prefix: 'PX', example: 'PX0001', category: 'Smartphones & Tablets', aliases: ['pixel', 'google pixel'], badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' },
  { brand: 'OnePlus', prefix: '1P', example: '1P0001', category: 'Smartphones & Tablets', aliases: ['oneplus', '1+'], badgeClass: 'bg-red-100 text-red-800 border-red-300' },

  // 2. Laptops & Computers (Laptop)
  { brand: 'Laptops', prefix: 'LP', example: 'LP0001', category: 'Laptops & Computers', aliases: ['laptop', 'notebook', 'ultrabook'], badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { brand: 'MacBook', prefix: 'MB', example: 'MB0001', category: 'Laptops & Computers', aliases: ['macbook', 'macbook air', 'macbook pro', 'apple mac'], badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  { brand: 'Dell', prefix: 'DL', example: 'DL0001', category: 'Laptops & Computers', aliases: ['dell', 'alienware', 'latitude', 'inspiron', 'vostro', 'xps'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'HP', prefix: 'HP', example: 'HP0001', category: 'Laptops & Computers', aliases: ['hp', 'hewlett', 'pavilion', 'victus', 'omen', 'envy', 'probook'], badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
  { brand: 'Lenovo', prefix: 'LN', example: 'LN0001', category: 'Laptops & Computers', aliases: ['lenovo', 'thinkpad', 'ideapad', 'legion', 'yoga', 'loq'], badgeClass: 'bg-red-100 text-red-800 border-red-300' },
  { brand: 'Asus', prefix: 'AS', example: 'AS0001', category: 'Laptops & Computers', aliases: ['asus', 'rog', 'tuf', 'zenbook', 'vivobook'], badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { brand: 'Acer', prefix: 'AC', example: 'AC0001', category: 'Laptops & Computers', aliases: ['acer', 'aspire', 'predator', 'nitro', 'swift'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { brand: 'MSI', prefix: 'MSI', example: 'MSI0001', category: 'Laptops & Computers', aliases: ['msi', 'stealth', 'raider', 'cyborg', 'katana'], badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  { brand: 'Desktop PC', prefix: 'PC', example: 'PC0001', category: 'Laptops & Computers', aliases: ['desktop', 'pc', 'all-in-one', 'aio', 'system unit', 'tower'], badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },

  // 3. Accessories & Gadgets (Accessories)
  { brand: 'Borofone', prefix: 'BF', example: 'BF0001', category: 'Accessories & Gadgets', aliases: ['borofone', 'bf'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'Gerlax', prefix: 'GL', example: 'GL0001', category: 'Accessories & Gadgets', aliases: ['gerlax', 'gl'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { brand: 'Maimi', prefix: 'MM', example: 'MM0001', category: 'Accessories & Gadgets', aliases: ['maimi', 'mm'], badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { brand: 'O Like', prefix: 'OL', example: 'OL0001', category: 'Accessories & Gadgets', aliases: ['o like', 'olike', 'ol', 'o-like'], badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { brand: 'Remax', prefix: 'RMX', example: 'RMX0001', category: 'Accessories & Gadgets', aliases: ['remax', 'rmx'], badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { brand: 'Yi Acc', prefix: 'YI', example: 'YI0001', category: 'Accessories & Gadgets', aliases: ['yi acc', 'yi', 'yi-acc', 'yi accessories'], badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { brand: 'Anker', prefix: 'AK', example: 'AK0001', category: 'Accessories & Gadgets', aliases: ['anker', 'soundcore', 'eufy'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'Hoco', prefix: 'HC', example: 'HC0001', category: 'Accessories & Gadgets', aliases: ['hoco'], badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { brand: 'Joyroom', prefix: 'JR', example: 'JR0001', category: 'Accessories & Gadgets', aliases: ['joyroom'], badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { brand: 'Baseus', prefix: 'BS', example: 'BS0001', category: 'Accessories & Gadgets', aliases: ['baseus'], badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { brand: 'Oraimo', prefix: 'ORM', example: 'ORM0001', category: 'Accessories & Gadgets', aliases: ['oraimo'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { brand: 'Ugreen', prefix: 'UG', example: 'UG0001', category: 'Accessories & Gadgets', aliases: ['ugreen'], badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' },
  { brand: 'Accessories', prefix: 'ACC', example: 'ACC0001', category: 'Accessories & Gadgets', aliases: ['accessories', 'gadget'], badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { brand: 'Power Bank', prefix: 'PB', example: 'PB0001', category: 'Accessories & Gadgets', aliases: ['power bank', 'powerbank', 'portable charger'], badgeClass: 'bg-orange-100 text-orange-800 border-orange-300' },
  { brand: 'Audio / Earphone', prefix: 'EAR', example: 'EAR0001', category: 'Accessories & Gadgets', aliases: ['earphone', 'headphone', 'headset', 'airpods', 'tws', 'speaker', 'bluetooth'], badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { brand: 'Charger & Cable', prefix: 'CHG', example: 'CHG0001', category: 'Accessories & Gadgets', aliases: ['charger', 'cable', 'adapter', 'type-c', 'lightning', 'usb'], badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  { brand: 'Smart Watch', prefix: 'SW', example: 'SW0001', category: 'Accessories & Gadgets', aliases: ['smartwatch', 'smart watch', 'band', 'fitbit'], badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },

  // 4. Service Spare Part (Spare Part)
  { brand: 'Spare Part', prefix: 'SP', example: 'SP0001', category: 'Service Spare Part', aliases: ['spare', 'spare part', 'service spare'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { brand: 'Display / Screen', prefix: 'LCD', example: 'LCD0001', category: 'Service Spare Part', aliases: ['lcd', 'oled', 'display', 'screen', 'touch', 'glass'], badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' },
  { brand: 'Battery', prefix: 'BAT', example: 'BAT0001', category: 'Service Spare Part', aliases: ['battery', 'cell', 'batt'], badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  { brand: 'Motherboard', prefix: 'MBP', example: 'MBP0001', category: 'Service Spare Part', aliases: ['motherboard', 'mainboard', 'logic board', 'ic', 'chip'], badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { brand: 'Camera Part', prefix: 'CAM', example: 'CAM0001', category: 'Service Spare Part', aliases: ['camera part', 'front cam', 'back cam', 'lens'], badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  { brand: 'Housing / Body', prefix: 'HSG', example: 'HSG0001', category: 'Service Spare Part', aliases: ['housing', 'back glass', 'middle frame', 'body cover'], badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },

  // 5. Service Charges (Service)
  { brand: 'Service', prefix: 'SRV', example: 'SRV0001', category: 'Service Charges', aliases: ['service', 'service charge', 'labor', 'repair fee'], badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { brand: 'Software Service', prefix: 'SWF', example: 'SWF0001', category: 'Service Charges', aliases: ['software', 'firmware', 'rom', 'flashing', 'unlock', 'bypass', 'format'], badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { brand: 'Hardware Repair', prefix: 'HWR', example: 'HWR0001', category: 'Service Charges', aliases: ['hardware repair', 'ic repair', 'soldering', 'board repair'], badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { brand: 'Maintenance / Clean', prefix: 'MNT', example: 'MNT0001', category: 'Service Charges', aliases: ['cleaning', 'maintenance', 'paste', 'thermal'], badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
];

export const PRIMARY_SHOP_BRANDS: BrandSKUConfig[] = DEFAULT_PRIMARY_SHOP_BRANDS;

const STORAGE_KEY_CUSTOM_STANDARDS = 'sktg_custom_brand_sku_configs';

/**
 * Get all Brand SKU Configurations (Built-in + Custom from localStorage)
 */
export function getAllBrandSKUConfigs(): BrandSKUConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_STANDARDS);
    if (!raw) return DEFAULT_PRIMARY_SHOP_BRANDS;
    const customList: BrandSKUConfig[] = JSON.parse(raw);
    if (!Array.isArray(customList) || customList.length === 0) {
      return DEFAULT_PRIMARY_SHOP_BRANDS;
    }

    // Merge: custom items override or append to default
    const combined: BrandSKUConfig[] = [...DEFAULT_PRIMARY_SHOP_BRANDS];
    customList.forEach((c) => {
      const idx = combined.findIndex(
        (b) => b.prefix.toUpperCase() === c.prefix.toUpperCase() || b.brand.toLowerCase() === c.brand.toLowerCase()
      );
      if (idx >= 0) {
        combined[idx] = { ...combined[idx], ...c, isCustom: true };
      } else {
        combined.push({ ...c, isCustom: true });
      }
    });
    return combined;
  } catch {
    return DEFAULT_PRIMARY_SHOP_BRANDS;
  }
}

/**
 * Save / Add / Update a Custom Brand SKU Standard
 */
export function saveCustomBrandSKUConfig(config: {
  brand: string;
  prefix: string;
  category: InventoryCategory;
  aliases?: string[];
}): { success: boolean; config: BrandSKUConfig } {
  const normBrand = config.brand.trim();
  const normPrefix = config.prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!normBrand || !normPrefix) {
    throw new Error('Brand name and Prefix code are required');
  }

  const newConfig: BrandSKUConfig = {
    brand: normBrand,
    prefix: normPrefix,
    example: `${normPrefix}0001`,
    category: config.category,
    aliases: config.aliases || [normBrand.toLowerCase()],
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    isCustom: true,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_STANDARDS);
    let customList: BrandSKUConfig[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(customList)) customList = [];

    const existingIdx = customList.findIndex(
      (c) => c.prefix.toUpperCase() === normPrefix || c.brand.toLowerCase() === normBrand.toLowerCase()
    );

    if (existingIdx >= 0) {
      customList[existingIdx] = newConfig;
    } else {
      customList.push(newConfig);
    }

    localStorage.setItem(STORAGE_KEY_CUSTOM_STANDARDS, JSON.stringify(customList));
    window.dispatchEvent(new CustomEvent('sktg_sku_standards_updated'));
    return { success: true, config: newConfig };
  } catch (err) {
    console.error('Failed to save SKU standard:', err);
    return { success: false, config: newConfig };
  }
}

/**
 * Delete a Custom Brand SKU Standard
 */
export function deleteCustomBrandSKUConfig(prefix: string, brand?: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_STANDARDS);
    if (!raw) return false;
    let customList: BrandSKUConfig[] = JSON.parse(raw);
    if (!Array.isArray(customList)) return false;

    const normPrefix = (prefix || '').trim().toUpperCase();
    const normBrand = (brand || '').trim().toLowerCase();

    customList = customList.filter(
      (c) => c.prefix.toUpperCase() !== normPrefix && (!normBrand || c.brand.toLowerCase() !== normBrand)
    );

    localStorage.setItem(STORAGE_KEY_CUSTOM_STANDARDS, JSON.stringify(customList));
    window.dispatchEvent(new CustomEvent('sktg_sku_standards_updated'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset Custom Brand SKU Standards to Default
 */
export function resetBrandSKUConfigs(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_STANDARDS);
    window.dispatchEvent(new CustomEvent('sktg_sku_standards_updated'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Brand SKU Standards filtered by Category
 */
export function getBrandSKUConfigsByCategory(categoryOrType?: string): BrandSKUConfig[] {
  const all = getAllBrandSKUConfigs();
  if (!categoryOrType || categoryOrType === 'All' || categoryOrType === 'အားလုံး') {
    return all;
  }

  const norm = categoryOrType.toLowerCase().trim();

  // Match category family
  if (norm.includes('smartphone') || norm.includes('mobile') || norm.includes('tablet') || norm.includes('phone')) {
    return all.filter((b) => b.category === 'Smartphones & Tablets');
  }
  if (norm.includes('laptop') || norm.includes('computer') || norm.includes('pc')) {
    return all.filter((b) => b.category === 'Laptops & Computers');
  }
  if (norm.includes('accessori') || norm.includes('gadget')) {
    return all.filter((b) => b.category === 'Accessories & Gadgets');
  }
  if (norm.includes('spare') || norm.includes('hardware part')) {
    return all.filter((b) => b.category === 'Service Spare Part');
  }
  if (norm.includes('charge') || norm.includes('labor') || norm.includes('service') || norm.includes('repair')) {
    return all.filter((b) => b.category === 'Service Charges');
  }

  // Exact category match
  const matched = all.filter((b) => b.category.toLowerCase() === norm);
  return matched.length > 0 ? matched : all;
}

export const CATEGORY_SKU_CONFIGS: CategorySKUConfig[] = [
  {
    category: 'Smartphones & Tablets',
    codeName: 'Smartphones & Tablets',
    start: 100001,
    min: 100000,
    max: 199999,
    badge: '100001+',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    category: 'Laptops & Computers',
    codeName: 'Laptops & Computers',
    start: 200001,
    min: 200000,
    max: 299999,
    badge: '200001+',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    category: 'Accessories & Gadgets',
    codeName: 'Accessories & Gadgets',
    start: 300001,
    min: 300000,
    max: 399999,
    badge: '300001+',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    category: 'Service Charges',
    codeName: 'Service Charges & Labor',
    start: 400001,
    min: 400000,
    max: 499999,
    badge: '400001+',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    category: 'Service Spare Part',
    codeName: 'Service Spare Part',
    start: 500001,
    min: 500000,
    max: 599999,
    badge: '500001+',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
];

export const PRIMARY_INVENTORY_CATEGORIES: InventoryCategory[] = [
  'Smartphones & Tablets',
  'Laptops & Computers',
  'Accessories & Gadgets',
  'Service Spare Part',
  'Service Charges'
];

export function getCategorySKUConfig(categoryOrType: string): CategorySKUConfig {
  const str = (categoryOrType || '').toLowerCase().trim();

  if (str.includes('spare') || str.includes('service spare') || str.includes('hardware')) {
    return CATEGORY_SKU_CONFIGS[4]; // 500001+
  }
  if (str.includes('charge') || str.includes('labor') || str.includes('service') || str.includes('repair')) {
    return CATEGORY_SKU_CONFIGS[3]; // 400001+
  }
  if (str.includes('accessori') || str.includes('gadget')) {
    return CATEGORY_SKU_CONFIGS[2]; // 300001+
  }
  if (str.includes('laptop') || str.includes('computer') || str.includes('pc')) {
    return CATEGORY_SKU_CONFIGS[1]; // 200001+
  }
  // Default to Mobile
  return CATEGORY_SKU_CONFIGS[0]; // 100001+
}

/**
 * Get brand prefix for SKU code generation
 */
export function getBrandSKUPrefix(brandName: string, category?: string, productName?: string): string {
  const normBrand = (brandName || '').trim().toLowerCase();
  const normProduct = (productName || '').trim().toLowerCase();
  const allBrands = getAllBrandSKUConfigs();

  // 1. Direct match with configured brands
  const directMatch = allBrands.find(b => b.brand.toLowerCase() === normBrand);
  if (directMatch) return directMatch.prefix;

  // 2. Check aliases
  for (const b of allBrands) {
    if (b.aliases && b.aliases.some(a => normBrand.includes(a) || normProduct.includes(a))) {
      return b.prefix;
    }
  }

  // 3. Fallback based on category
  const normCat = (category || '').toLowerCase();
  if (normCat.includes('spare')) return 'SP';
  if (normCat.includes('charge') || normCat.includes('service') || normCat.includes('labor')) return 'SRV';
  if (normCat.includes('access') || normCat.includes('gadget')) return 'ACC';
  if (normCat.includes('laptop') || normCat.includes('computer')) return 'LP';

  // 4. If custom brand, generate 2-3 letter uppercase prefix
  if (brandName && brandName.trim().length >= 2) {
    const letters = brandName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (letters.length >= 2) {
      return letters.slice(0, 3);
    }
  }

  return 'SKU';
}

/**
 * Intelligently detect brand from product name or category
 */
export function detectBrandFromName(name: string, category?: string): string {
  const n = (name || '').toLowerCase().trim();
  if (!n) return category?.includes('Laptop') ? 'Laptops' : 'Smartphones & Tablets';

  const allBrands = getAllBrandSKUConfigs();

  // Check aliases from all configured brands first
  for (const b of allBrands) {
    if (b.aliases && b.aliases.length > 0) {
      for (const alias of b.aliases) {
        const cleanAlias = alias.toLowerCase().trim();
        if (cleanAlias.length >= 2) {
          const escaped = cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (regex.test(n) || n.startsWith(cleanAlias + ' ') || n === cleanAlias) {
            return b.brand;
          }
        }
      }
    }
    if (n.includes(b.brand.toLowerCase())) {
      return b.brand;
    }
  }

  // Fallback to the first capitalized word if it looks like a brand
  const words = name.trim().split(/\s+/);
  if (words.length > 0 && words[0].length >= 2 && words[0].length <= 15) {
    const firstWord = words[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  return category?.includes('Laptop') ? 'Laptops' : 'Smartphones & Tablets';
}

/**
 * Generate Brand-specific Auto SKU (e.g. SS0001, HN0001, HW0001, IN0001, IP0001, VV0001...)
 */
export function generateBrandAutoSKU(
  brandOrName: string,
  category: string = 'Smartphones & Tablets',
  existingItems: { sku?: string }[] = [],
  existingSales: { sku?: string }[] = [],
  productName?: string
): string {
  const prefix = getBrandSKUPrefix(brandOrName, category, productName);
  
  const allSKUStrings = [
    ...existingItems.map((i) => i.sku || ''),
    ...existingSales.map((s) => s.sku || ''),
  ];

  let maxNum = 0;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedPrefix}0*(\\d+)$`, 'i');

  for (const skuStr of allSKUStrings) {
    if (!skuStr) continue;
    const cleanSku = skuStr.trim();
    const match = cleanSku.match(regex);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }

  const nextNumber = maxNum + 1;
  // Format with minimum 4 digits padding (e.g. SS0001, HN0001, HW0001)
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Universal Auto-SKU Generator
 * Checks brand first, then generates brand-specific SKU or category SKU.
 */
export function generateAutoSKU(
  categoryOrType: string,
  existingItems: { sku?: string }[] = [],
  existingSales: { sku?: string }[] = [],
  brandName?: string,
  productName?: string
): string {
  // If brand is provided, generate brand-specific SKU
  if (brandName && brandName.trim().length > 0) {
    return generateBrandAutoSKU(brandName, categoryOrType, existingItems, existingSales, productName);
  }

  // If categoryOrType actually contains a brand name
  const detectedBrand = detectBrandFromName(productName || categoryOrType, categoryOrType);
  if (detectedBrand && detectedBrand !== 'Mobile' && detectedBrand !== 'Laptop' && detectedBrand !== 'Smartphones & Tablets') {
    return generateBrandAutoSKU(detectedBrand, categoryOrType, existingItems, existingSales, productName);
  }

  // Fallback to Category Prefix or Category 6-digit number
  const config = getCategorySKUConfig(categoryOrType);
  
  const allSKUStrings = [
    ...existingItems.map((i) => i.sku || ''),
    ...existingSales.map((s) => s.sku || ''),
  ];

  let maxNum = config.start - 1;

  for (const skuStr of allSKUStrings) {
    if (!skuStr) continue;
    const match = skuStr.match(/\b(\d{6})\b/) || skuStr.match(/(\d+)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= config.min && val <= config.max) {
        if (val > maxNum) {
          maxNum = val;
        }
      }
    }
  }

  const nextNumber = maxNum + 1;
  return String(nextNumber);
}

/**
 * Group inventory items by normalized product name and brand to detect duplicate entries
 */
export function findDuplicateProductGroups(items: any[]): { nameKey: string; items: any[] }[] {
  const groups: { [key: string]: any[] } = {};
  
  items.forEach((item) => {
    if (!item.name) return;
    const key = `${item.name.trim().toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  return Object.keys(groups)
    .filter((key) => groups[key].length > 1)
    .map((key) => ({
      nameKey: key,
      items: groups[key],
    }));
}

/**
 * Consolidate duplicate products into a single master product with unified SKU, aggregated branch stock, and merged FIFO batches
 */
export function consolidateDuplicateProducts(items: any[]): any[] {
  const nameMap: { [key: string]: any } = {};

  items.forEach((item) => {
    const key = `${item.name.trim().toLowerCase()}`;
    if (!nameMap[key]) {
      // First canonical item
      nameMap[key] = {
        ...item,
        branchStock: { ...(item.branchStock || {}) },
        batches: item.batches ? [...item.batches] : [],
      };
    } else {
      // Merge into canonical item
      const master = nameMap[key];
      // Prefer the earliest or numeric SKU
      if (item.sku && !master.sku) {
        master.sku = item.sku;
      }
      
      // Combine branch stock
      const existingBranchStock = master.branchStock || {};
      const newBranchStock = item.branchStock || {};
      const combinedBranchStock: { [branchId: string]: number } = { ...existingBranchStock };
      
      Object.keys(newBranchStock).forEach((bId) => {
        combinedBranchStock[bId] = (combinedBranchStock[bId] || 0) + (newBranchStock[bId] || 0);
      });
      master.branchStock = combinedBranchStock;

      // Merge FIFO Batches
      if (item.batches && Array.isArray(item.batches)) {
        master.batches = [...(master.batches || []), ...item.batches];
      }

      // Re-calculate totalStock
      master.totalStock = Object.values(master.branchStock as Record<string, number>).reduce(
        (sum, q) => sum + (Number(q) || 0),
        0
      );

      // Keep latest restocked date
      if (item.lastRestockedDate && (!master.lastRestockedDate || item.lastRestockedDate > master.lastRestockedDate)) {
        master.lastRestockedDate = item.lastRestockedDate;
      }

      // Keep higher retail price / warranty if more descriptive
      if (item.sellingPrice && item.sellingPrice > (master.sellingPrice || 0)) {
        master.sellingPrice = item.sellingPrice;
      }
    }
  });

  return Object.values(nameMap);
}

/**
 * Check if an entered product name, brand, model, or description matches an existing inventory item
 */
export function findMatchingProductByDescriptionOrName(
  nameQuery: string,
  modelQuery: string = '',
  brandQuery: string = '',
  items: any[] = [],
  excludeItemId?: string
): { matchedItem: any; matchType: 'EXACT_NAME' | 'MODEL_BRAND' | 'SIMILAR_NAME'; matchScore: number } | null {
  if (!nameQuery && !modelQuery) return null;

  const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  const normName = normalize(nameQuery);
  const normModel = normalize(modelQuery);
  const normBrand = normalize(brandQuery);

  const candidateItems = excludeItemId ? items.filter((i) => i.id !== excludeItemId) : items;

  // 1. Check exact name match (ignoring case, spaces, punctuation)
  if (normName.length > 2) {
    const exactNameMatch = candidateItems.find((i) => {
      const itemNormName = normalize(i.name);
      return itemNormName === normName && itemNormName.length > 0;
    });
    if (exactNameMatch) {
      return { matchedItem: exactNameMatch, matchType: 'EXACT_NAME', matchScore: 100 };
    }
  }

  // 2. Check exact brand + model match
  if (normBrand.length > 1 && normModel.length > 1) {
    const exactBrandModelMatch = candidateItems.find((i) => {
      const iBrand = normalize(i.brand);
      const iModel = normalize(i.model);
      return iBrand === normBrand && iModel === normModel;
    });
    if (exactBrandModelMatch) {
      return { matchedItem: exactBrandModelMatch, matchType: 'MODEL_BRAND', matchScore: 90 };
    }
  }

  // 3. Check if name contains model or substring match
  if (normName.length > 4) {
    const similarMatch = candidateItems.find((i) => {
      const itemNormName = normalize(i.name);
      if (itemNormName.length > 4) {
        return itemNormName.includes(normName) || normName.includes(itemNormName);
      }
      return false;
    });
    if (similarMatch) {
      return { matchedItem: similarMatch, matchType: 'SIMILAR_NAME', matchScore: 75 };
    }
  }

  return null;
}

/**
 * Auto-generate PO Code starting from 6000001 (or 6000001+)
 * Scans existing purchase records to find the highest number in the 6000001+ series.
 */
export function generateAutoPOCode(existingPurchases: { invoiceNo?: string }[] = []): string {
  const START_PO_CODE = 6000001;
  let maxCode = START_PO_CODE - 1;

  for (const p of existingPurchases) {
    if (!p || !p.invoiceNo) continue;
    // Extract any number from invoiceNo (e.g. "6000001", "PO-6000001", "PO6000001")
    const match = p.invoiceNo.match(/(\d{6,8})/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 6000001 && val < 7000000) {
        if (val > maxCode) {
          maxCode = val;
        }
      }
    }
  }

  const nextCode = maxCode + 1;
  return String(nextCode);
}
