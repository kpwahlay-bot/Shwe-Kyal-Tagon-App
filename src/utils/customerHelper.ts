import { DailySale, CustomerProfile, VipConfig, ContactPartner } from '../types';

export const DEFAULT_VIP_CONFIG: VipConfig = {
  minItems: 5, // Auto VIP when buying 5 or more items
  minPurchases: 3, // Auto VIP on 3 or more visits
  minAmount: 500000, // Or 500,000 MMK total spend
  autoPromote: true,
};

const VIP_CONFIG_KEY = 'sktg_vip_config_v1';
const VIP_OVERRIDES_KEY = 'sktg_customer_vip_overrides_v1';

/**
 * Normalizes phone numbers for accurate, seamless lookup
 * e.g. "09 795 123 456", "09-795123456", "+959795123456" -> "09795123456"
 */
export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+959')) {
    return '09' + digits.slice(4);
  }
  if (digits.startsWith('959')) {
    return '09' + digits.slice(3);
  }
  if (digits.startsWith('9') && digits.length >= 8 && digits.length <= 10) {
    return '0' + digits;
  }
  return digits;
}

export function loadVipConfig(): VipConfig {
  try {
    const saved = localStorage.getItem(VIP_CONFIG_KEY);
    if (saved) return { ...DEFAULT_VIP_CONFIG, ...JSON.parse(saved) };
  } catch (e) {
    console.warn('Error loading VIP config', e);
  }
  return DEFAULT_VIP_CONFIG;
}

export function saveVipConfig(config: VipConfig): void {
  try {
    localStorage.setItem(VIP_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving VIP config', e);
  }
}

export function loadVipOverrides(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(VIP_OVERRIDES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Error loading VIP overrides', e);
  }
  return {};
}

export function saveVipOverride(rawPhone: string, isVip: boolean): void {
  const normPhone = normalizePhone(rawPhone);
  if (!normPhone) return;
  const current = loadVipOverrides();
  current[normPhone] = isVip;
  try {
    localStorage.setItem(VIP_OVERRIDES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Error saving VIP override', e);
  }
}

/**
 * VIP qualification rule: Only Laptop and Mobile (smartphones/tablets/laptops)
 * count towards VIP item counts, visit thresholds, and qualifying spend.
 * Accessories, cables, chargers, cases, spare parts, and repair services are strictly excluded.
 */
export function isVipEligibleCategory(category?: string, itemName?: string): boolean {
  const cat = (category || '').trim().toLowerCase();
  const name = (itemName || '').trim().toLowerCase();

  // If category or item name specifically mentions accessories or repair/service
  if (
    cat.includes('accessor') ||
    cat.includes('cable') ||
    cat.includes('charger') ||
    cat.includes('case') ||
    cat.includes('cover') ||
    cat.includes('service') ||
    cat.includes('repair') ||
    cat.includes('part') ||
    cat.includes('spare')
  ) {
    return false;
  }

  // If category is Laptop or Mobile
  if (
    cat.includes('laptop') ||
    cat.includes('notebook') ||
    cat.includes('macbook') ||
    cat.includes('computer') ||
    cat.includes('mobile') ||
    cat.includes('phone') ||
    cat.includes('smartphone') ||
    cat.includes('tablet') ||
    cat.includes('ipad')
  ) {
    return true;
  }

  // Check item name if category was generic or blank
  if (
    name.includes('iphone') ||
    name.includes('samsung galaxy') ||
    name.includes('pixel') ||
    name.includes('xiaomi') ||
    name.includes('redmi') ||
    name.includes('oppo') ||
    name.includes('vivo') ||
    name.includes('macbook') ||
    name.includes('laptop') ||
    name.includes('dell') ||
    name.includes('lenovo') ||
    name.includes('thinkpad') ||
    name.includes('asus') ||
    name.includes('hp ') ||
    name.includes('ipad') ||
    name.includes('tablet')
  ) {
    // Exclude if the item itself is an accessory for that device
    if (
      name.includes('case') ||
      name.includes('cover') ||
      name.includes('charger') ||
      name.includes('cable') ||
      name.includes('adapter') ||
      name.includes('protector') ||
      name.includes('tempered') ||
      name.includes('glass') ||
      name.includes('airpods') ||
      name.includes('earphone') ||
      name.includes('headphone') ||
      name.includes('powerbank') ||
      name.includes('power bank') ||
      name.includes('pouch') ||
      name.includes('sleeve') ||
      name.includes('stand') ||
      name.includes('bag')
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Aggregates all sales and saved Contact Partners to compute comprehensive customer profiles,
 * ensuring contacts added in Contact & Supplier list immediately connect with Daily Sales POS.
 */
export function buildCustomerProfiles(
  sales: DailySale[] = [],
  partnersOrConfig?: ContactPartner[] | VipConfig,
  configOrOverrides?: VipConfig | Record<string, boolean>,
  overridesParam?: Record<string, boolean>
): CustomerProfile[] {
  let partners: ContactPartner[] = [];
  let config: VipConfig = loadVipConfig();
  let overrides: Record<string, boolean> = loadVipOverrides();

  if (Array.isArray(partnersOrConfig)) {
    partners = partnersOrConfig;
    if (configOrOverrides && typeof configOrOverrides === 'object' && 'minItems' in configOrOverrides) {
      config = configOrOverrides as VipConfig;
      if (overridesParam) overrides = overridesParam;
    } else if (configOrOverrides && typeof configOrOverrides === 'object') {
      overrides = configOrOverrides as Record<string, boolean>;
    }
  } else if (partnersOrConfig && typeof partnersOrConfig === 'object' && 'minItems' in partnersOrConfig) {
    config = partnersOrConfig as VipConfig;
    if (configOrOverrides && typeof configOrOverrides === 'object') {
      overrides = configOrOverrides as Record<string, boolean>;
    }
  }

  const map = new Map<string, {
    id?: string;
    name: string;
    phone: string;
    townships: string[];
    purchases: DailySale[];
    totalItems: number;
    totalSpent: number;
    vipEligibleItems: number;
    vipEligibleSpent: number;
    vipEligiblePurchasesCount: number;
    firstDate?: string;
    lastDate?: string;
    notes?: string;
    isContactPartner?: boolean;
    partnerType?: string;
    contactPartnerId?: string;
  }>();

  // 1. First seed with saved Contact Partners (ONLY Customers & Corporates - NEVER Suppliers)
  if (Array.isArray(partners)) {
    for (const p of partners) {
      if (!p || (!p.name && !p.phone)) continue;
      
      // Strictly exclude Suppliers so they NEVER appear in Daily Sales customer lookups
      const pType = (p.type || (p as any).partnerType || '').trim().toLowerCase();
      if (pType === 'supplier' || pType.includes('supplier')) {
        continue;
      }

      const normPhone = normalizePhone(p.phone);
      const nameKey = p.name ? `name:${p.name.trim().toLowerCase()}` : '';
      const key = normPhone || nameKey;
      if (!key) continue;

      const township = p.city || p.address || '';
      map.set(key, {
        id: `cust-partner-${p.id || normPhone || key}`,
        name: p.name || 'Customer',
        phone: p.phone || '',
        townships: township ? [township] : [],
        purchases: [],
        totalItems: 0,
        totalSpent: 0,
        vipEligibleItems: 0,
        vipEligibleSpent: 0,
        vipEligiblePurchasesCount: 0,
        notes: p.notes,
        isContactPartner: true,
        partnerType: p.type || 'Customer',
        contactPartnerId: p.id,
      });

      // If both normPhone and nameKey exist, register both in map so lookup finds it either way
      if (normPhone && nameKey && !map.has(nameKey)) {
        map.set(nameKey, map.get(key)!);
      }
    }
  }

  // 2. Process sales from oldest to newest for chronological tracking
  const sortedSales = [...sales].sort((a, b) => (a.date > b.date ? 1 : -1));

  for (const sale of sortedSales) {
    const normPhone = normalizePhone(sale.customerPhone);
    const nameKey = sale.customerName ? `name:${sale.customerName.trim().toLowerCase()}` : '';
    if (!normPhone && !nameKey) continue;

    let existing = normPhone ? map.get(normPhone) : undefined;
    if (!existing && nameKey) {
      existing = map.get(nameKey);
    }

    if (!existing) {
      const key = normPhone || nameKey;
      existing = {
        id: `cust-${normPhone || key}`,
        name: sale.customerName || 'Walk-in Customer',
        phone: sale.customerPhone || '',
        townships: [],
        purchases: [],
        totalItems: 0,
        totalSpent: 0,
        vipEligibleItems: 0,
        vipEligibleSpent: 0,
        vipEligiblePurchasesCount: 0,
        firstDate: sale.date,
        lastDate: sale.date,
      };
      map.set(key, existing);
    }

    // Keep the most informative name and phone
    if (sale.customerName && sale.customerName !== 'Walk-in Customer' && sale.customerName !== 'General Customer') {
      existing.name = sale.customerName;
    }
    if (sale.customerPhone) {
      existing.phone = sale.customerPhone;
    }
    if (sale.township && !existing.townships.includes(sale.township)) {
      existing.townships.push(sale.township);
    }

    // Calculate overall items count & VIP-qualifying
    let itemsCount = 0;
    let vipItemsCount = 0;
    let vipSpend = 0;
    let hasVipEligibleItem = false;

    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item) => {
        const q = Number(item.quantity) || 1;
        const total = Number(item.total) || (Number(item.unitPrice) * q) || 0;
        itemsCount += q;
        if (isVipEligibleCategory(item.category, item.name)) {
          vipItemsCount += q;
          vipSpend += total;
          hasVipEligibleItem = true;
        }
      });
    } else {
      const q = Number(sale.quantity) || 1;
      itemsCount = q;
      if (isVipEligibleCategory(sale.category, sale.itemName)) {
        vipItemsCount = q;
        vipSpend = Number(sale.salePrice) || 0;
        hasVipEligibleItem = true;
      }
    }

    existing.purchases.push(sale);
    existing.totalItems += itemsCount;
    existing.totalSpent += Number(sale.salePrice) || 0;
    existing.vipEligibleItems += vipItemsCount;
    existing.vipEligibleSpent += vipSpend;
    if (hasVipEligibleItem) {
      existing.vipEligiblePurchasesCount += 1;
    }
    if (!existing.firstDate) existing.firstDate = sale.date;
    existing.lastDate = sale.date;

    if (normPhone) map.set(normPhone, existing);
    if (nameKey) map.set(nameKey, existing);
  }

  const profiles: CustomerProfile[] = [];
  const visitedObj = new Set<any>();

  map.forEach((data, key) => {
    if (visitedObj.has(data)) return;
    visitedObj.add(data);

    const normPhone = normalizePhone(data.phone);
    const hasManualOverride = normPhone && overrides[normPhone] !== undefined;
    
    // Auto-VIP check strictly requires Laptop & Mobile purchases (Accessories do not count)
    const autoVip = config.autoPromote && (
      data.vipEligibleItems >= config.minItems ||
      data.vipEligiblePurchasesCount >= config.minPurchases ||
      data.vipEligibleSpent >= config.minAmount
    );

    const isVip = hasManualOverride ? Boolean(overrides[normPhone]) : autoVip;

    profiles.push({
      id: data.id || `cust-${normPhone || key}`,
      phone: data.phone,
      name: data.name,
      township: data.townships[data.townships.length - 1] || '',
      isVip,
      vipTier: isVip ? (data.vipEligibleSpent >= 1500000 || data.totalSpent >= 2000000 ? 'PLATINUM_VIP' : 'VIP') : 'REGULAR',
      totalPurchaseCount: data.purchases.length,
      totalItemsPurchased: data.totalItems,
      totalSpent: data.totalSpent,
      vipEligibleItems: data.vipEligibleItems,
      vipEligibleSpent: data.vipEligibleSpent,
      firstPurchaseDate: data.firstDate,
      lastPurchaseDate: data.lastDate,
      manualVipOverride: hasManualOverride,
      autoVipQualified: autoVip,
      notes: data.notes,
      isContactPartner: data.isContactPartner,
      partnerType: data.partnerType,
      contactPartnerId: data.contactPartnerId,
    });
  });

  // Sort VIPs first, then by highest total spend, then by name
  return profiles.sort((a, b) => {
    if (a.isVip && !b.isVip) return -1;
    if (!a.isVip && b.isVip) return 1;
    if (b.totalSpent !== a.totalSpent) return b.totalSpent - a.totalSpent;
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Searches for an existing customer by phone number (supports partial, normalized, prefix and suffix matching)
 */
export function findCustomerByPhone(
  inputPhone: string,
  customers: CustomerProfile[]
): CustomerProfile | null {
  if (!inputPhone) return null;
  const rawClean = inputPhone.trim();
  const norm = normalizePhone(rawClean);
  
  if (!norm && rawClean.length < 3) return null;

  // 1. Exact raw phone match
  const rawExact = customers.find((c) => c.phone && c.phone.trim() === rawClean);
  if (rawExact) return rawExact;

  // 2. Exact normalized phone match
  if (norm) {
    const exact = customers.find((c) => normalizePhone(c.phone) === norm);
    if (exact) return exact;
  }

  // 3. Suffix match (e.g. user typed 795123456 matching 09795123456)
  if (norm && norm.length >= 4) {
    const suffix = customers.find((c) => {
      const cNorm = normalizePhone(c.phone);
      return cNorm && (cNorm.endsWith(norm) || norm.endsWith(cNorm));
    });
    if (suffix) return suffix;
  }

  // 4. Substring contains match (when phone digits length >= 5)
  if (norm && norm.length >= 5) {
    const substringMatch = customers.find((c) => {
      const cNorm = normalizePhone(c.phone);
      return cNorm && cNorm.includes(norm);
    });
    if (substringMatch) return substringMatch;
  }

  return null;
}

/**
 * Searches for an existing customer by name
 */
export function findCustomerByName(
  inputName: string,
  customers: CustomerProfile[]
): CustomerProfile | null {
  if (!inputName || inputName.trim().length < 2) return null;
  const q = inputName.trim().toLowerCase();
  
  const exact = customers.find((c) => c.name && c.name.trim().toLowerCase() === q);
  if (exact) return exact;

  const starts = customers.find((c) => c.name && c.name.trim().toLowerCase().startsWith(q));
  if (starts) return starts;

  return null;
}

/**
 * Returns all historical sales for a customer by phone number or name
 */
export function getCustomerPurchaseHistory(
  phoneOrName: string,
  sales: DailySale[]
): DailySale[] {
  const norm = normalizePhone(phoneOrName);
  return sales.filter((s) => {
    if (norm && s.customerPhone && normalizePhone(s.customerPhone) === norm) {
      return true;
    }
    if (phoneOrName && s.customerName && s.customerName.trim().toLowerCase() === phoneOrName.trim().toLowerCase()) {
      return true;
    }
    return false;
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

