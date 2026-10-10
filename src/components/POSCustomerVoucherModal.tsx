import React, { useState, useEffect } from 'react';
import { Printer, X, ShieldCheck, Settings, Upload, RotateCcw, Check, MapPin, Phone, Image as ImageIcon, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { DailySale, Branch, MYANMAR_PAYMENT_METHODS, InventoryItem, PurchaseRecord } from '../types';
import { formatDateDMY } from '../utils/formatters';
import { ensureMyanmarUnicode } from '../utils/myanmarFontHelper';
import { ShweKyalTagonLogo, ShweKyalTagonBadgeLogo } from './ShweKyalTagonLogo';
import { 
  System2BadgeLogo, 
  getSystem2Address, 
  getSystem2Phone,
  getSystem2CustomLogo,
  SYSTEM2_ADDRESS_KEY,
  SYSTEM2_PHONE_KEY 
} from './System2Logo';
import { Employee } from '../types';
import { 
  ShopLogoSettingsModal, 
  getSavedCustomLogo, 
  VoucherBranch, 
  DEFAULT_VOUCHER_BRANCHES, 
  VOUCHER_BRANCHES_KEY,
  SHOW_LOGO_STORAGE_KEY,
  cleanAndSanitizeVoucherBranches,
  getSavedVoucherBranches
} from './ShopLogoSettingsModal';
import { getDefaultCashierForBranch, getDefaultFinanceForBranch } from '../utils/staffBranchHelper';

export type VoucherPrintType = 'invoice' | 'receipt';

export interface POSCustomerVoucherModalProps {
  sale: DailySale | null;
  sales?: DailySale[];
  branches: Branch[];
  inventory?: InventoryItem[];
  purchases?: PurchaseRecord[];
  employees?: Employee[];
  printType?: VoucherPrintType;
  onPrintTypeChange?: (type: VoucherPrintType) => void;
  onClose: () => void;
}

// Clean item description without SKU codes or extra brackets
const cleanCustomerDescription = (itemName: string) => {
  if (!itemName) return '';
  return itemName
    .replace(/\[\s*SKU:?\s*[^\]]+\]/gi, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\bSKU:\s*[A-Z0-9_-]+/gi, '')
    .replace(/\bSKU-[A-Z0-9_-]+/gi, '')
    .replace(/\|\s*\|+/g, '|')
    .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
    .trim();
};

// Clean serial / IMEI notes to only show the bare numbers or clean list
const cleanCustomerSerialNotes = (notes?: string) => {
  if (!notes) return '';
  
  // Clean out SKU tags and extraneous prefix labels if present
  return notes
    .replace(/\[\s*SKU:?\s*[^\]]+\]/gi, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\bSKU:\s*[A-Z0-9_-]+/gi, '')
    .replace(/\bSKU-[A-Z0-9_-]+/gi, '')
    .replace(/^(SN\/IMEI|IMEI\/SN|IMEI|SN|Serial|Serial\s*No|Serial\s*Number)[:\s-]+\s*/gi, '')
    .trim();
};

// Robust helper to extract individual serials or IMEIs from arrays or formatted strings
const extractIndividualSerials = (
  deviceSerials?: string[],
  deviceSerial?: string,
  notes?: string,
  imeiOrSerial?: string
): string[] => {
  const serials: string[] = [];

  // 1. If explicit array
  if (Array.isArray(deviceSerials) && deviceSerials.length > 0) {
    for (const s of deviceSerials) {
      if (!s) continue;
      const clean = cleanCustomerSerialNotes(s);
      if (clean) serials.push(clean);
    }
    if (serials.length > 0) return serials;
  }

  // 2. Parse from deviceSerial, imeiOrSerial, or notes
  const candidates = [deviceSerial, imeiOrSerial, notes].filter(Boolean) as string[];
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.replace(/^(SN\/IMEI|IMEI|SN|Serial):\s*/gi, '').trim();
    if (/[,;\n\/|]/.test(cleaned)) {
      const parts = cleaned
        .split(/[,;\n\/|]+/)
        .map((p) => cleanCustomerSerialNotes(p))
        .filter(Boolean);
      if (parts.length > 0) {
        return parts;
      }
    } else if (cleaned) {
      const cleanVal = cleanCustomerSerialNotes(cleaned);
      if (cleanVal) return [cleanVal];
    }
  }

  return serials;
};

// Helper to split branch address into uniform 2 lines (Line 1: Building/Street, Line 2: Township + Phone)
const splitBranchAddress = (address: string) => {
  if (address.includes('လှိုင်သာယာ')) {
    const idx = address.indexOf('လှိုင်သာယာ');
    return {
      line1: address.substring(0, idx).trim(),
      township: address.substring(idx).trim(),
    };
  }
  const commaIdx = address.lastIndexOf('၊');
  if (commaIdx > 0) {
    return {
      line1: address.substring(0, commaIdx + 1).trim(),
      township: address.substring(commaIdx + 1).trim(),
    };
  }
  return {
    line1: address,
    township: '',
  };
};

export const POSCustomerVoucherModal: React.FC<POSCustomerVoucherModalProps> = ({
  sale,
  sales = [],
  branches,
  inventory = [],
  purchases = [],
  employees = [],
  printType: initialPrintType = 'invoice',
  onPrintTypeChange,
  onClose,
}) => {
  // Default to Portrait as requested
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('portrait');

  // Shop Info & Logo state
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(getSavedCustomLogo);
  const [showLogo, setShowLogo] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [isLogoSettingsOpen, setIsLogoSettingsOpen] = useState<boolean>(false);
  const [logoModalTab, setLogoModalTab] = useState<'logo' | 'branches' | 'system2'>('logo');

  // System II State
  const [system2Address, setSystem2Address] = useState<string>(getSystem2Address);
  const [system2Phone, setSystem2Phone] = useState<string>(getSystem2Phone);
  const [system2LogoUrl, setSystem2LogoUrl] = useState<string>(getSystem2CustomLogo);

  useEffect(() => {
    const handleSystem2Update = () => {
      setSystem2Address(getSystem2Address());
      setSystem2Phone(getSystem2Phone());
      setSystem2LogoUrl(getSystem2CustomLogo());
    };
    window.addEventListener('sktg_system2_updated', handleSystem2Update);
    window.addEventListener('sktg_system2_logo_updated', handleSystem2Update);
    window.addEventListener('storage', handleSystem2Update);
    return () => {
      window.removeEventListener('sktg_system2_updated', handleSystem2Update);
      window.removeEventListener('sktg_system2_logo_updated', handleSystem2Update);
      window.removeEventListener('storage', handleSystem2Update);
    };
  }, []);

  useEffect(() => {
    if (sale) {
      setCustomLogoUrl(getSavedCustomLogo());
      try {
        setShowLogo(localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false');
      } catch {
        setShowLogo(true);
      }
      setSystem2Address(getSystem2Address());
      setSystem2Phone(getSystem2Phone());
      setSystem2LogoUrl(getSystem2CustomLogo());
      setVoucherBranches(getSavedVoucherBranches());
    }
  }, [sale?.id]);

  const [voucherBranches, setVoucherBranches] = useState<VoucherBranch[]>(getSavedVoucherBranches);

  useEffect(() => {
    const handleBranchesUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setVoucherBranches(cleanAndSanitizeVoucherBranches(e.detail));
      } else {
        setVoucherBranches(getSavedVoucherBranches());
      }
    };
    window.addEventListener('sktg_branches_updated', handleBranchesUpdate);
    window.addEventListener('storage', handleBranchesUpdate);
    return () => {
      window.removeEventListener('sktg_branches_updated', handleBranchesUpdate);
      window.removeEventListener('storage', handleBranchesUpdate);
    };
  }, []);

  useEffect(() => {
    const handleLogoUpdate = () => {
      setCustomLogoUrl(getSavedCustomLogo());
      try {
        setShowLogo(localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false');
      } catch {
        setShowLogo(true);
      }
    };
    window.addEventListener('sktg_logo_updated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);
    return () => {
      window.removeEventListener('sktg_logo_updated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLogoSettingsOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isLogoSettingsOpen]);

  if (!sale) return null;

  const isService = sale.saleType === 'SERVICE';
  const isCreditRepay = sale.category === 'Credit Repayment' || sale.sku === 'REPAY' || (sale.itemName && sale.itemName.toLowerCase().includes('credit repay'));

  // Branch and Letterhead System II auto-detection
  const saleBranchObj = React.useMemo(() => {
    return branches.find(b => b.id === sale?.branchId) || null;
  }, [branches, sale?.branchId]);

  const isSaleSystem2 = React.useMemo(() => {
    if (!sale) return false;
    if (sale.invoiceNo && (
      sale.invoiceNo.startsWith('SII-INV') || 
      sale.invoiceNo.startsWith('SSII-INV') || 
      sale.invoiceNo.startsWith('SII-DS') || 
      sale.invoiceNo.startsWith('SSII-DS')
    )) return true;
    if (sale.branchId === 'branch-sys2') return true;
    const sName = (sale.branchName || '').toLowerCase();
    if (sName.includes('system') || sName.includes('sys-02') || sName.includes('sys2')) return true;
    if (saleBranchObj) {
      const bName = (saleBranchObj.name || '').toLowerCase();
      const bCode = (saleBranchObj.code || '').toLowerCase();
      if (bName.includes('system') || bCode.includes('sys')) return true;
    }
    return false;
  }, [sale, saleBranchObj]);

  const [letterheadMode, setLetterheadMode] = useState<'AUTO' | 'SHWE_KYAL_TAGON' | 'SYSTEM_II'>('AUTO');
  const isSystem2 = letterheadMode === 'SYSTEM_II' ? true : (letterheadMode === 'SHWE_KYAL_TAGON' ? false : isSaleSystem2);

  // Dual Print Mode: 'invoice' (Commercial Invoice - Default) vs 'receipt' (Receipt - Tax-Safe Version)
  const [printType, setPrintType] = useState<VoucherPrintType>(initialPrintType || 'invoice');

  useEffect(() => {
    if (initialPrintType) {
      setPrintType(initialPrintType);
    }
  }, [initialPrintType]);

  const handleSetPrintType = (type: VoucherPrintType) => {
    setPrintType(type);
    if (onPrintTypeChange) {
      onPrintTypeChange(type);
    }
  };

  // Generic description state for Receipt mode (strictly blank by default, hides all Smartphone & Tablet / Mobile Handset terms)
  const [receiptGenericDescription, setReceiptGenericDescription] = useState<string>('');

  // Helper to dynamically format the voucher number:
  // - Commercial Invoice (Default): exactly as stored (e.g. SKTG1-INV20260928/002)
  // - Receipt (Tax-Safe): strictly NO Branch ID, format: RCP{YYYYMMDD}/{seq} (e.g. RCP20260928/02)
  const getFormattedVoucherNo = (invNo?: string, mode: VoucherPrintType = printType): string => {
    if (mode === 'receipt') {
      const fallbackDate = (sale?.date || new Date().toISOString().split('T')[0]).replace(/-/g, '').slice(0, 8);
      if (invNo) {
        // Matches standard date & sequence: e.g. SKTG1-INV20260928/02, SKTG1-INV20260928/002, SII-INV20260928/02, RCP20260928/02
        const dateSeqMatch = invNo.match(/(\d{8})\/(\d+)/);
        if (dateSeqMatch) {
          const d = dateSeqMatch[1];
          const num = parseInt(dateSeqMatch[2], 10);
          const seqFormatted = isNaN(num) ? dateSeqMatch[2] : (num < 10 ? String(num).padStart(2, '0') : String(num));
          return `RCP${d}/${seqFormatted}`;
        }
        // Matches dash or underscore separated e.g. SKTG1-INV20260928-02
        const dateDashMatch = invNo.match(/(\d{8})[-_](\d+)/);
        if (dateDashMatch) {
          const d = dateDashMatch[1];
          const num = parseInt(dateDashMatch[2], 10);
          const seqFormatted = isNaN(num) ? dateDashMatch[2] : (num < 10 ? String(num).padStart(2, '0') : String(num));
          return `RCP${d}/${seqFormatted}`;
        }
        // Matches generic sequence at end e.g. INV-002, 002
        const seqMatch = invNo.match(/(\d+)$/);
        if (seqMatch) {
          const num = parseInt(seqMatch[1], 10);
          const seqFormatted = isNaN(num) ? seqMatch[1] : (num < 10 ? String(num).padStart(2, '0') : String(num));
          return `RCP${fallbackDate}/${seqFormatted}`;
        }
      }
      return `RCP${fallbackDate}/01`;
    }
    return invNo || 'INV-001';
  };

  // Responsive Zoom & Viewport Scaling State for all monitors and devices
  const [zoomLevel, setZoomLevel] = useState<number | 'fit'>('fit');
  const [autoScale, setAutoScale] = useState<number>(1);
  const scrollWrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateScale = () => {
      if (!scrollWrapperRef.current) return;
      const containerWidth = scrollWrapperRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 48);
      const targetWidth = printOrientation === 'portrait' ? 560 : 794;
      if (containerWidth < targetWidth && containerWidth > 100) {
        const calculated = Math.max(0.42, Math.min(1, containerWidth / targetWidth));
        setAutoScale(calculated);
      } else {
        setAutoScale(1);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [printOrientation]);

  const effectiveScale = zoomLevel === 'fit' ? autoScale : zoomLevel;

  const handlePrint = (overrideType?: VoucherPrintType) => {
    const activeType = overrideType || printType;
    if (overrideType && overrideType !== printType) {
      handleSetPrintType(overrideType);
    }
    const originalTitle = document.title;
    const vNo = getFormattedVoucherNo(sale?.invoiceNo, activeType);
    try {
      document.title = activeType === 'receipt' ? `Receipt_${vNo}` : `Commercial_Invoice_${vNo}`;
    } catch (e) {
      // ignore
    }
    const printClass = activeType === 'receipt' ? 'printing-receipt' : 'printing-commercial-invoice';
    document.body.classList.add(printClass);
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt', 'printing-commercial-invoice');
      try {
        document.title = originalTitle;
      } catch (e) {
        // ignore
      }
    }, 1500);
  };

  // Format numbers cleanly as whole integers without .00 matching user requirement (e.g. 7,150,000 and 0)
  const formatInvoiceNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    return Math.round(Number(num)).toLocaleString('en-US');
  };

  const formattedDate = formatDateDMY(sale.date);
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Clean spare part name without SKU code
  const cleanSparePartName = (name: string) => {
    if (!name) return 'Spare Part Replacement';
    return name.replace(/\[\d+\]/g, '').replace(/\(SKU:.*?\)/gi, '').trim();
  };

  const isServiceSale = sale.saleType === 'SERVICE' || sale.category === 'Service Charges';
  const technicianName = sale.technicianName || (isServiceSale ? (sale.salespersonName || sale.employeeName) : '');
  const salesPersonName = sale.salespersonName || sale.employeeName || (isServiceSale ? (sale.technicianName || 'Technician') : 'Staff');
  const cashierName = sale.cashierName || getDefaultCashierForBranch(employees, sale.branchId);
  const financeName = sale.financeName || getDefaultFinanceForBranch(employees, sale.branchId);
  const customerTownship = sale.township || '-';

  // Format warranty cleanly: e.g. "1 Year Warranty", "6 Months Warranty", etc.
  const formatVoucherWarranty = (rawWarranty?: string): string => {
    const w = (rawWarranty || '').trim();
    if (!w || w === '-' || w === '0') {
      return '-';
    }
    if (w.toLowerCase() === 'no warranty' || w.toLowerCase() === 'none') {
      return '-';
    }
    // Capitalize properly: e.g. "1 year" -> "1 Year Warranty"
    if (w.toLowerCase().includes('warranty')) {
      return w.replace(/\bwarranty\b/i, 'Warranty');
    }
    return `${w} Warranty`;
  };

  // Resolve warranty with intelligent fallback: Item/Sale explicit -> Stock Inventory -> Purchase Orders (PO)
  const resolveItemWarranty = (
    explicitWarranty?: string,
    inventoryItemId?: string,
    sku?: string,
    itemName?: string,
    isServiceItem?: boolean
  ): string => {
    if (isServiceItem) {
      return '-';
    }

    const explicit = (explicitWarranty || '').trim();
    if (
      explicit.toLowerCase() === 'no warranty' ||
      explicit.toLowerCase() === 'none' ||
      explicit === '-' ||
      explicit === '0'
    ) {
      return '-';
    }

    if (explicit) {
      return formatVoucherWarranty(explicit);
    }

    // 1. Lookup in Stock Inventory
    if (inventory && inventory.length > 0) {
      let matchedInv: InventoryItem | undefined = undefined;
      if (inventoryItemId) {
        matchedInv = inventory.find((i) => i.id === inventoryItemId);
      }
      if (!matchedInv && sku) {
        const cleanSku = sku.trim().toLowerCase();
        matchedInv = inventory.find((i) => i.sku && i.sku.trim().toLowerCase() === cleanSku);
      }
      if (!matchedInv && itemName) {
        const cleanName = itemName.toLowerCase().replace(/\[.*?\]/g, '').trim();
        matchedInv = inventory.find((i) => {
          const invName = i.name.toLowerCase().trim();
          return invName === cleanName || invName.includes(cleanName) || cleanName.includes(invName);
        });
      }

      if (matchedInv) {
        if (matchedInv.category === 'Accessories & Gadgets') {
          const invW = (matchedInv.warranty || '').trim();
          if (invW && invW !== '-' && !invW.toLowerCase().includes('1 year') && invW.toLowerCase() !== 'no warranty' && invW.toLowerCase() !== 'none' && invW !== '0') {
            return formatVoucherWarranty(invW);
          }
          return '-';
        }

        if (matchedInv.warranty) {
          const invW = matchedInv.warranty.trim();
          if (invW && invW !== '-' && invW.toLowerCase() !== 'no warranty' && invW.toLowerCase() !== 'none' && invW !== '0') {
            return formatVoucherWarranty(invW);
          }
        }
      }
    }

    // 2. Lookup in Purchase Orders (PO)
    if (purchases && purchases.length > 0) {
      const targetSku = (sku || '').trim().toLowerCase();
      const targetName = (itemName || '').toLowerCase().replace(/\[.*?\]/g, '').trim();

      for (const po of purchases) {
        if (po.items && po.items.length > 0) {
          const matchedPoItem = po.items.find((pi) => {
            if (targetSku && pi.sku && pi.sku.trim().toLowerCase() === targetSku) return true;
            if (targetName && pi.name) {
              const piName = pi.name.toLowerCase().trim();
              return piName === targetName || piName.includes(targetName) || targetName.includes(piName);
            }
            return false;
          });

          if (matchedPoItem) {
            if (matchedPoItem.category === 'Accessories & Gadgets') {
              const poW = (matchedPoItem.warranty || '').trim();
              if (poW && poW !== '-' && !poW.toLowerCase().includes('1 year') && poW.toLowerCase() !== 'no warranty' && poW.toLowerCase() !== 'none' && poW !== '0') {
                return formatVoucherWarranty(poW);
              }
              return '-';
            }

            if (matchedPoItem.warranty) {
              const poW = matchedPoItem.warranty.trim();
              if (poW && poW !== '-' && poW.toLowerCase() !== 'no warranty' && poW.toLowerCase() !== 'none' && poW !== '0') {
                return formatVoucherWarranty(poW);
              }
            }
          }
        }
      }
    }

    // Default warranty fallback for IT & Mobile retail: 1 Year Warranty
    return '1 Year Warranty';
  };

  interface InvoiceItemRow {
    no: number;
    description: string;
    subDetail?: string;
    warranty: string;
    qty: number;
    price: number;
    originalPrice?: number;
    cashback?: number;
    amount: number;
    category?: string;
  }

  // Support multiple sales on the same invoice voucher (e.g. multiple models billed on the same invoice)
  const siblingSales = (sales && sales.length > 0)
    ? sales.filter(s => s.invoiceNo === sale.invoiceNo && (!sale.branchId || s.branchId === sale.branchId))
    : [sale];
  const effectiveSales = siblingSales.length > 0 ? siblingSales : [sale];

  const invoiceItems: InvoiceItemRow[] = [];
  let itemCounter = 1;

  effectiveSales.forEach((currentSale) => {
    if (currentSale.saleType === 'SERVICE') {
      const serviceLaborFee = currentSale.serviceLaborFee !== undefined 
        ? currentSale.serviceLaborFee 
        : (currentSale.salePrice - (currentSale.sparePartsPrice || 0));
      const sparePartFee = currentSale.sparePartsPrice || 0;
      const hasSpareParts = !!(currentSale.sparePartsUsed || sparePartFee > 0);

      invoiceItems.push({
        no: itemCounter++,
        description: `Service Charges (${currentSale.deviceModel || 'Device Service'}${currentSale.issueDescription ? ` - ${currentSale.issueDescription}` : ''})`,
        subDetail: currentSale.deviceSerial ? cleanCustomerSerialNotes(currentSale.deviceSerial) : undefined,
        warranty: '-',
        qty: 1,
        price: serviceLaborFee,
        amount: serviceLaborFee,
        category: currentSale.category || 'Service & Maintenance Charges',
      });

      if (hasSpareParts) {
        invoiceItems.push({
          no: itemCounter++,
          description: cleanSparePartName(currentSale.sparePartsUsed || ''),
          subDetail: undefined,
          warranty: currentSale.sparePartsWarranty ? formatVoucherWarranty(currentSale.sparePartsWarranty) : '-',
          qty: 1,
          price: sparePartFee,
          amount: sparePartFee,
          category: 'Spare Parts & Accessories',
        });
      }
    } else if (currentSale.items && currentSale.items.length > 0) {
      // Modern POS multi-item sales
      currentSale.items.forEach((cartItem) => {
        const itemSerials = extractIndividualSerials(undefined, undefined, undefined, cartItem.imeiOrSerial);
        const itemQty = cartItem.quantity || 1;
        const itemPrice = cartItem.unitPrice;
        const itemCashback = Math.max(0, cartItem.cashback || 0);
        const itemWarranty = resolveItemWarranty(cartItem.warranty || currentSale.warranty, cartItem.inventoryItemId, cartItem.sku, cartItem.name);
        const itemCategory = cartItem.category || currentSale.category;

        if (itemSerials.length > 0) {
          // Each IMEI / Serial appears line-by-line as its own numbered row!
          itemSerials.forEach((serial) => {
            invoiceItems.push({
              no: itemCounter++,
              description: cleanCustomerDescription(cartItem.name),
              subDetail: cleanCustomerSerialNotes(serial),
              warranty: itemWarranty,
              qty: 1,
              price: itemPrice,
              originalPrice: itemPrice,
              cashback: itemCashback > 0 ? itemCashback : undefined,
              amount: itemPrice,
              category: itemCategory,
            });
          });
          const extraQty = itemQty - itemSerials.length;
          if (extraQty > 0) {
            invoiceItems.push({
              no: itemCounter++,
              description: cleanCustomerDescription(cartItem.name),
              warranty: itemWarranty,
              qty: extraQty,
              price: itemPrice,
              originalPrice: itemPrice,
              cashback: itemCashback > 0 ? itemCashback : undefined,
              amount: extraQty * itemPrice,
              category: itemCategory,
            });
          }
        } else {
          invoiceItems.push({
            no: itemCounter++,
            description: cleanCustomerDescription(cartItem.name),
            warranty: itemWarranty,
            qty: itemQty,
            price: itemPrice,
            originalPrice: itemPrice,
            cashback: itemCashback > 0 ? itemCashback : undefined,
            amount: itemQty * itemPrice,
            category: itemCategory,
          });
        }
      });
    } else {
      // Standard product sale record
      const sQty = currentSale.quantity || 1;
      const sSubtotal = (currentSale.salePrice || 0) + (currentSale.discount || 0) + (currentSale.cashback || 0);
      const sUnitPrice = sQty > 0 ? Math.round(sSubtotal / sQty) : sSubtotal;
      const sCashback = (currentSale.cashback && sQty > 0) ? Math.round(currentSale.cashback / sQty) : 0;
      const sSerials = extractIndividualSerials(currentSale.deviceSerials, currentSale.deviceSerial, currentSale.notes);
      const sWarranty = resolveItemWarranty(currentSale.warranty, currentSale.inventoryItemId, currentSale.sku, currentSale.itemName);
      const sCategory = currentSale.category;

      if (sSerials.length > 0) {
        // Output each IMEI / Serial as its own numbered row (No 1, 2, 3...)
        sSerials.forEach((serial) => {
          invoiceItems.push({
            no: itemCounter++,
            description: cleanCustomerDescription(currentSale.itemName),
            subDetail: cleanCustomerSerialNotes(serial),
            warranty: sWarranty,
            qty: 1,
            price: sUnitPrice,
            originalPrice: sUnitPrice,
            cashback: sCashback > 0 ? sCashback : undefined,
            amount: sUnitPrice,
            category: sCategory,
          });
        });
        const extraQty = sQty - sSerials.length;
        if (extraQty > 0) {
          invoiceItems.push({
            no: itemCounter++,
            description: cleanCustomerDescription(currentSale.itemName),
            warranty: sWarranty,
            qty: extraQty,
            price: sUnitPrice,
            originalPrice: sUnitPrice,
            cashback: sCashback > 0 ? sCashback : undefined,
            amount: extraQty * sUnitPrice,
            category: sCategory,
          });
        }
      } else {
        invoiceItems.push({
          no: itemCounter++,
          description: cleanCustomerDescription(currentSale.itemName),
          warranty: sWarranty,
          qty: sQty,
          price: sUnitPrice,
          originalPrice: sUnitPrice,
          cashback: sCashback > 0 ? sCashback : undefined,
          amount: sQty * sUnitPrice,
          category: sCategory,
        });
      }
    }
  });

  // Description resolver adhering strictly to Dual Print Mode rules:
  // - Format 1 (Commercial Invoice): EXACTLY as it is (specific productName & IMEI)
  // - Format 2 (Receipt): STRICTLY BLANK / Empty description unless custom text is explicitly provided;
  //   Completely removes "Smartphones & Tablets", "Mobile Handset & Accessories" or similar phrases.
  const getDisplayDescription = (item: InvoiceItemRow, mode: VoucherPrintType = printType) => {
    if (mode === 'receipt') {
      const raw = (receiptGenericDescription || '').trim();
      if (/smartphone|tablet|mobile handset & accessories|mobile handset/i.test(raw)) {
        return '';
      }
      return raw;
    }
    return item.description || '_';
  };

  const subTotal = invoiceItems.reduce((sum, it) => sum + it.amount, 0);
  const totalCashback = invoiceItems.reduce((sum, it) => sum + (it.cashback ? it.cashback * it.qty : 0), 0);
  const discountAmount = effectiveSales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const netTotal = Math.max(0, subTotal - totalCashback - discountAmount);
  // The original voucher must represent the transaction as it was when first purchased.
  // Subsequent repayments logged in paymentHistory must NOT deduct/alter the original purchase Paid and Balance!
  const remaining = effectiveSales.reduce((sum, s) => {
    if (s.initialDebtAmount !== undefined) return sum + s.initialDebtAmount;
    if (s.initialPaidAmount !== undefined) {
      return sum + Math.max(0, (s.salePrice || 0) - (s.discount || 0) - s.initialPaidAmount);
    }
    const repaymentsTotal = s.paymentHistory && s.paymentHistory.length > 0
      ? s.paymentHistory.reduce((pSum, ph) => pSum + (ph.amount || 0), 0)
      : 0;
    const currentDebt = s.remainingDebt ?? (s.paymentStatus === 'CREDIT' ? (s.salePrice || 0) : 0);
    return sum + (currentDebt + repaymentsTotal);
  }, 0);
  const paid = Math.max(0, netTotal - remaining);

  const totalCashPaid = effectiveSales.reduce((sum, s) => {
    if (s.cashAmount !== undefined && s.cashAmount > 0) return sum + s.cashAmount;
    if (s.paymentMethod === 'Cash') {
      if (s.initialPaidAmount !== undefined) return sum + s.initialPaidAmount;
      const repaymentsTotal = s.paymentHistory && s.paymentHistory.length > 0
        ? s.paymentHistory.reduce((pSum, ph) => pSum + (ph.amount || 0), 0)
        : 0;
      const recordedPaid = s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'CREDIT' ? 0 : (s.salePrice || 0));
      return sum + Math.max(0, recordedPaid - repaymentsTotal);
    }
    return sum;
  }, 0);

  const totalBankPaid = effectiveSales.reduce((sum, s) => {
    if (s.bankAmount !== undefined && s.bankAmount > 0) return sum + s.bankAmount;
    if (s.paymentMethod !== 'Cash' && !s.paymentMethod?.toLowerCase().includes('split')) {
      if (s.initialPaidAmount !== undefined) return sum + s.initialPaidAmount;
      const repaymentsTotal = s.paymentHistory && s.paymentHistory.length > 0
        ? s.paymentHistory.reduce((pSum, ph) => pSum + (ph.amount || 0), 0)
        : 0;
      const recordedPaid = s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'CREDIT' ? 0 : (s.salePrice || 0));
      return sum + Math.max(0, recordedPaid - repaymentsTotal);
    }
    return sum;
  }, 0);

  const isSplitPayment = (totalCashPaid > 0 && totalBankPaid > 0) || 
    effectiveSales.some(s => s.paymentMethod === 'Split (Cash + Bank)' || s.paymentMethod?.toLowerCase().includes('split'));

  const bankNameLabel = sale.bankType && sale.bankType !== '-' && sale.bankType !== 'Cash' 
    ? sale.bankType 
    : (sale.paymentMethod !== 'Cash' && sale.paymentMethod !== 'Split (Cash + Bank)' ? sale.paymentMethod : 'Bank');

  const spacerHeight = printOrientation === 'landscape'
    ? (invoiceItems.length >= 6 ? '8px' : invoiceItems.length >= 4 ? '14px' : invoiceItems.length === 3 ? '20px' : invoiceItems.length === 2 ? '28px' : '36px')
    : (invoiceItems.length >= 6 ? '10px' : invoiceItems.length >= 4 ? '22px' : invoiceItems.length === 3 ? '40px' : invoiceItems.length === 2 ? '65px' : '88px');

  return (
    <div 
      id="commercial-invoice-modal-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Print-specific style override for perfect single-page A5 printing across any printer and browser */}
      <style>{`
        @media print {
          @page {
            size: A5 ${printOrientation};
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
          body.printing-receipt .letterhead-box {
            visibility: hidden !important;
            opacity: 0 !important;
            border-color: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
          }
          body.printing-receipt .letterhead-box * {
            visibility: hidden !important;
            opacity: 0 !important;
          }
          body.printing-receipt .item-subdetail-tax-safe {
            visibility: hidden !important;
            opacity: 0 !important;
          }
          html, body {
            width: ${printOrientation === 'portrait' ? '148mm' : '210mm'} !important;
            height: ${printOrientation === 'portrait' ? '210mm' : '148mm'} !important;
            max-width: ${printOrientation === 'portrait' ? '148mm' : '210mm'} !important;
            max-height: ${printOrientation === 'portrait' ? '210mm' : '148mm'} !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #commercial-invoice-modal-overlay,
          #commercial-invoice-modal-container,
          #commercial-invoice-scroll-wrapper {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            overflow: visible !important;
            display: block !important;
          }
          #commercial-invoice-print-area, #commercial-invoice-print-area * {
            visibility: visible !important;
          }
          #commercial-invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: none !important;
            margin: 0 !important;
            margin-bottom: 0 !important;
            width: ${printOrientation === 'portrait' ? '148mm' : '210mm'} !important;
            height: ${printOrientation === 'portrait' ? '205mm' : '145mm'} !important;
            max-height: ${printOrientation === 'portrait' ? '206mm' : '145.5mm'} !important;
            min-height: auto !important;
            box-sizing: border-box !important;
            padding: ${printOrientation === 'portrait' ? '3.5mm 4.5mm 3.5mm 4.5mm' : '3.5mm 5mm 3.5mm 5mm'} !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            z-index: 9999999 !important;
          }
          .letterhead-box,
          .letterhead-box *,
          .branch-capsule,
          .branch-capsule * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
          .letterhead-system2-box {
            background-color: #f0f7ff !important;
            border: 1px solid #93c5fd !important;
            border-radius: 8px !important;
            padding: 1.8mm 2.2mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .system2-address-card {
            background-color: #ffffff !important;
            border: 1px solid #bfdbfe !important;
            border-radius: 6px !important;
            padding: 2mm 2.8mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 1.6mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .system2-address-line {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-size: 6.9px !important;
            line-height: 1.45 !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .system2-phone-line {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            font-size: 7.8px !important;
            line-height: 1.35 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .letterhead-sktg-box {
            background-color: #faf5ff !important;
            border: 1px solid #c084fc !important;
            border-radius: 8px !important;
            padding: 1.4mm 2mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .system2-divider-line {
            width: 1.8px !important;
            min-height: 44px !important;
            background-color: #0038ff !important;
            border-radius: 9999px !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .voucher-logo-system2 {
            width: 39mm !important;
            min-width: 39mm !important;
            max-width: 41mm !important;
          }
          .voucher-logo-sktg {
            width: 38.5mm !important;
            min-width: 38.5mm !important;
            max-width: 41mm !important;
          }
          .voucher-logo-img,
          .voucher-logo-sktg svg,
          .voucher-logo-system2 svg {
            width: 100% !important;
            height: auto !important;
            max-height: 24mm !important;
            object-fit: contain !important;
            image-rendering: -webkit-optimize-contrast !important;
            image-rendering: crisp-edges !important;
            text-rendering: geometricPrecision !important;
            shape-rendering: geometricPrecision !important;
          }
          .branch-capsule {
            border: 1px solid #d8b4fe !important;
            border-radius: 6px !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .branch-badge-pill {
            width: 13.5mm !important;
            min-width: 13.5mm !important;
            max-width: 13.5mm !important;
            font-size: 6.8px !important;
            background-color: #7e22ce !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        id="commercial-invoice-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[96vh]"
      >
        {/* Top Header bar (Hidden in print) */}
        <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>{printType === 'receipt' ? 'RECEIPT (A5 Tax-Safe Format)' : 'COMMERCIAL INVOICE (A5 Format)'}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {printType === 'receipt' 
                  ? `Receipt No: ${getFormattedVoucherNo(sale?.invoiceNo, 'receipt')} (No Branch ID)` 
                  : 'A5 Single Page • Epson L3110 / L3210 / L3250 Calibrated'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Description Customizer for Receipt mode */}
            {printType === 'receipt' && (
              <div className="hidden md:flex items-center bg-slate-800 px-2 py-1 rounded-lg text-xs border border-emerald-600/50 gap-1.5 shadow-inner">
                <span className="text-emerald-400 font-bold whitespace-nowrap text-[10.5px]">Receipt Item:</span>
                <input
                  type="text"
                  value={receiptGenericDescription}
                  onChange={(e) => setReceiptGenericDescription(e.target.value)}
                  className="bg-slate-950 text-white px-2 py-0.5 rounded text-[11px] border border-slate-700 w-44 focus:outline-none focus:border-emerald-500 font-sans"
                  placeholder="(Blank)"
                  title="Receipt description (leaves blank by default)"
                />
              </div>
            )}

            {/* Dual Print Mode Selection (Commercial Invoice vs Receipt) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => handleSetPrintType('invoice')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  printType === 'invoice'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Format 1: Commercial Invoice (Standard Full Audit layout with Letterhead, Logo, Device details & IMEIs)"
              >
                <span>Commercial Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetPrintType('receipt')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  printType === 'receipt'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Format 2: Receipt (Tax-Safe compliance version with generic item names and no letterhead)"
              >
                <span>Receipt (Tax-Safe)</span>
              </button>
            </div>

            {/* Letterhead Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-700">
              <button
                type="button"
                onClick={() => setLetterheadMode('AUTO')}
                className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  letterheadMode === 'AUTO'
                    ? (isSaleSystem2 ? 'bg-blue-600 text-white font-bold' : 'bg-purple-600 text-white font-bold')
                    : 'text-slate-300 hover:text-white'
                }`}
                title={`Branch: ${saleBranchObj?.name || sale?.branchName || 'Auto'} (Auto Detect)`}
              >
                Auto ({isSaleSystem2 ? 'System II' : 'Shwe Kyal Tagon'})
              </button>
              <button
                type="button"
                onClick={() => setLetterheadMode('SHWE_KYAL_TAGON')}
                className={`px-2 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  letterheadMode === 'SHWE_KYAL_TAGON'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Shwe Kyal Tagon
              </button>
              <button
                type="button"
                onClick={() => setLetterheadMode('SYSTEM_II')}
                className={`px-2 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  letterheadMode === 'SYSTEM_II'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                System II
              </button>
            </div>

            {/* Shop Info & Branches Settings Button */}
            <button
              type="button"
              onClick={() => {
                setLogoModalTab(isSystem2 ? 'system2' : 'branches');
                setIsLogoSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 whitespace-nowrap cursor-pointer"
              title="Configure branch address and contact numbers"
            >
              <Settings className={`w-3.5 h-3.5 shrink-0 ${isSystem2 ? 'text-blue-400' : 'text-amber-400'}`} />
              <span className="whitespace-nowrap">{isSystem2 ? 'Edit System II' : 'Branches'}</span>
            </button>

            {/* Quick Refresh Voucher Data Button */}
            <button
              type="button"
              onClick={() => {
                const freshBranches = getSavedVoucherBranches();
                setVoucherBranches(freshBranches);
                setCustomLogoUrl(getSavedCustomLogo());
                try {
                  setShowLogo(localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false');
                } catch {
                  setShowLogo(true);
                }
                setSystem2Address(getSystem2Address());
                setSystem2Phone(getSystem2Phone());
                setSystem2LogoUrl(getSystem2CustomLogo());
                window.dispatchEvent(new CustomEvent('sktg_branches_updated', { detail: freshBranches }));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 whitespace-nowrap cursor-pointer"
              title="Refresh latest voucher addresses, logo & sync data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Zoom / Scale Control for any Screen / Monitor Size */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (typeof prev === 'number' ? Math.max(0.45, prev - 0.1) : Math.max(0.45, autoScale - 0.1)))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel('fit')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  zoomLevel === 'fit' ? 'bg-purple-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="Fit to Screen width"
              >
                Fit ({Math.round(effectiveScale * 100)}%)
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className={`hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  zoomLevel === 1 ? 'bg-purple-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
                title="Actual 1:1 A5 Print Size"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (typeof prev === 'number' ? Math.min(1.5, prev + 0.1) : Math.min(1.5, autoScale + 0.1)))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Paper Orientation Selector */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                  printOrientation === 'portrait' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                A5 Portrait
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                  printOrientation === 'landscape' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                A5 Landscape
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container (Rendered to match the exact Commercial Invoice layout) */}
        <div 
          id="commercial-invoice-scroll-wrapper"
          ref={scrollWrapperRef}
          className="p-2 sm:p-6 overflow-x-auto overflow-y-auto bg-slate-200/80 flex-1 flex justify-center items-start"
        >
          <div
            id="commercial-invoice-print-area"
            style={{
              transform: effectiveScale < 1 ? `scale(${effectiveScale})` : (zoomLevel !== 'fit' && zoomLevel !== 1 ? `scale(${effectiveScale})` : undefined),
              transformOrigin: 'top center',
              marginBottom: effectiveScale < 1 ? `-${Math.round((1 - effectiveScale) * (printOrientation === 'portrait' ? 794 : 560))}px` : undefined,
            }}
            className={`bg-white p-4 sm:p-5 shadow-2xl text-slate-950 font-sans flex flex-col justify-between box-border border border-slate-300 ${
              printOrientation === 'portrait' ? 'w-[148mm] min-w-[148mm] min-h-[205mm] max-h-[206mm]' : 'w-[210mm] min-w-[210mm] min-h-[145mm] max-h-[146mm]'
            } shrink-0 transition-transform duration-150`}
          >
            <div className="space-y-1.5">
              {/* Company Letterhead and Logo Section - Structure preserved with visibility: hidden in Receipt format to avoid layout collapse */}
              {isSystem2 ? (
                /* Top System II Brand Letterhead Box - Clean, elegant, high-contrast, perfectly organized */
                <div 
                  className={`letterhead-box letterhead-system2-box w-full px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl border ${
                    printType === 'receipt'
                      ? 'invisible border-transparent bg-transparent shadow-none pointer-events-none select-none'
                      : 'border-blue-300/90 bg-[#f0f7ff] shadow-2xs'
                  }`}
                  style={{
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    backgroundColor: printType === 'receipt' ? 'transparent' : '#f0f7ff',
                    borderColor: printType === 'receipt' ? 'transparent' : '#93c5fd',
                    visibility: printType === 'receipt' ? 'hidden' : 'visible',
                    opacity: printType === 'receipt' ? 0 : 1,
                    boxShadow: printType === 'receipt' ? 'none' : undefined,
                    fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                  aria-hidden={printType === 'receipt'}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Left Block: Official System II Logo */}
                    <div className="voucher-logo-system2 shrink-0 flex items-center justify-center text-center w-[138px] sm:w-[148px] min-w-[130px] max-w-[155px] my-auto">
                      {showLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoModalTab('system2');
                            setIsLogoSettingsOpen(true);
                          }}
                          className="flex items-center justify-center w-full cursor-pointer group relative p-0 bg-transparent border-0"
                          title="Click to edit System II logo and details"
                        >
                          {system2LogoUrl && system2LogoUrl !== '/system2-logo.svg' ? (
                            <img
                              src={system2LogoUrl}
                              alt="System II Logo"
                              className="voucher-logo-img w-full h-auto max-h-[64px] sm:max-h-[70px] object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <System2BadgeLogo forceDefault className="voucher-logo-img w-full h-auto drop-shadow-2xs group-hover:opacity-90 transition-opacity" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Middle Vertical Sleek Blue Divider Line */}
                    <div 
                      className="system2-divider-line w-[1.8px] self-stretch my-auto rounded-full shrink-0 bg-[#0038ff]" 
                      style={{ 
                        minHeight: '44px',
                        backgroundColor: '#0038ff',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    />

                    {/* Right Block: Structured Pure White Capsule Card - Single line address, zero side-overflow, zero top-clipping */}
                    <div 
                      className="system2-address-card flex-1 flex flex-col justify-center gap-1.5 sm:gap-2 min-w-0 bg-white rounded-lg border border-blue-200/90 px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-2xs overflow-hidden my-auto"
                      style={{
                        backgroundColor: '#ffffff',
                        borderColor: '#bfdbfe',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                    >
                      {/* Line 1: Blue Location Pin + Single-line Full Address without wrapping or clipping */}
                      <div className="flex items-center gap-1.5 text-slate-900 min-w-0 w-full overflow-hidden">
                        <MapPin className="w-3.5 h-3.5 text-[#0038ff] shrink-0 fill-[#0038ff]/15" />
                        <span 
                          className="system2-address-line text-[6.8px] sm:text-[7.2px] md:text-[7.4px] print:text-[6.9px] font-bold text-slate-900 tracking-tight leading-normal whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
                          style={{
                            fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                            lineHeight: '1.45',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={system2Address}
                        >
                          {ensureMyanmarUnicode(system2Address)}
                        </span>
                      </div>

                      {/* Line 2: Blue Phone Icon + Phone label and numbers */}
                      <div className="flex items-center gap-1.5 text-slate-950 min-w-0 w-full overflow-hidden">
                        <Phone className="w-3 h-3 text-[#0038ff] shrink-0 fill-[#0038ff]/15" />
                        <span className="font-bold text-[#0038ff] text-[7.4px] sm:text-[7.8px] print:text-[7.4px] shrink-0 font-sans">
                          Phone :
                        </span>
                        <span 
                          className="system2-phone-line text-slate-950 font-mono font-bold tracking-tight text-[7.8px] sm:text-[8.4px] print:text-[7.8px] whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ lineHeight: '1.4' }}
                        >
                          {system2Phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Top Brand Letterhead Box matching Shwe Kyal Tagon reference design */
                <div 
                  className={`letterhead-box letterhead-sktg-box w-full p-1.5 sm:p-2 rounded-xl border ${
                    printType === 'receipt'
                      ? 'invisible border-transparent bg-transparent shadow-none pointer-events-none select-none'
                      : 'border-purple-300/90 bg-[#faf5ff] shadow-2xs'
                  }`}
                  style={{
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    backgroundColor: printType === 'receipt' ? 'transparent' : '#faf5ff',
                    borderColor: printType === 'receipt' ? 'transparent' : '#c084fc',
                    visibility: printType === 'receipt' ? 'hidden' : 'visible',
                    opacity: printType === 'receipt' ? 0 : 1,
                    boxShadow: printType === 'receipt' ? 'none' : undefined,
                    fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                  aria-hidden={printType === 'receipt'}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Left Block: Official Purple Pill Badge Logo (Widened by ~0.5cm) */}
                    <div className="voucher-logo-sktg shrink-0 flex items-center justify-center text-center pr-2 border-r border-purple-200/80 w-[130px] sm:w-[140px] min-w-[124px] max-w-[146px] my-auto">
                      {showLogo && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoModalTab('logo');
                            setIsLogoSettingsOpen(true);
                          }}
                          className="flex items-center justify-center w-full cursor-pointer group relative p-0 bg-transparent border-0"
                          title="Click to manage/change logo"
                        >
                          {customLogoUrl && customLogoUrl !== '/shwekyaltagon-badge-logo.svg' ? (
                            <img
                              src={customLogoUrl}
                              alt="Shwe Kyal Tagon Logo"
                              className="voucher-logo-img w-full h-auto max-h-[56px] sm:max-h-[62px] object-contain drop-shadow-xs group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <ShweKyalTagonBadgeLogo forceDefault className="voucher-logo-img w-full h-auto drop-shadow-2xs group-hover:opacity-90 transition-opacity" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Right Block: 3 Distinct Branch Capsule Cards exactly like the reference design */}
                    <div className="flex-1 flex flex-col justify-between space-y-0.75 sm:space-y-1 py-0 min-w-0 pl-0.5 pr-0.5">
                      {voucherBranches.map((br, bIdx) => {
                        return (
                          <div 
                            key={bIdx}
                            className="branch-capsule rounded-lg border border-purple-200/90 overflow-hidden flex items-stretch bg-white shadow-2xs"
                            style={{
                              WebkitPrintColorAdjust: 'exact',
                              printColorAdjust: 'exact',
                              borderColor: '#d8b4fe',
                            }}
                          >
                            {/* Solid Vibrant Purple Left Badge with perfect proportion */}
                            <div 
                              className="branch-badge-pill w-[48px] sm:w-[54px] print:w-[15mm] shrink-0 bg-[#7e22ce] text-white flex items-center justify-center font-bold text-[6.6px] sm:text-[7.2px] print:text-[6.8px] border-r border-purple-200/80 px-1 py-0.5 select-none text-center shadow-xs whitespace-nowrap"
                              style={{
                                backgroundColor: '#7e22ce',
                                color: '#ffffff',
                                fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                                lineHeight: '1.35',
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact',
                              }}
                            >
                              {ensureMyanmarUnicode(
                                bIdx === 0
                                  ? 'ဆိုင်ခွဲ(၁)'
                                  : bIdx === 1
                                  ? 'ဆိုင်ခွဲ(၂)'
                                  : bIdx === 2
                                  ? 'ဆိုင်ခွဲ(၃)'
                                  : br.badge || `ဆိုင်ခွဲ(${bIdx + 1})`
                              )}
                            </div>

                            {/* 2-line uniform content right section with full single-line address and full phone numbers */}
                            <div 
                              className="flex-1 px-1.5 py-0.5 sm:py-1 flex flex-col justify-center bg-white min-w-0 overflow-hidden"
                              style={{
                                backgroundColor: '#ffffff',
                                fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                                WebkitPrintColorAdjust: 'exact',
                                printColorAdjust: 'exact',
                              }}
                            >
                              {/* Line 1: Orange Location pin + Full Address in ONE unbroken line */}
                              <div className="flex items-center gap-1 text-slate-900 min-w-0 overflow-hidden">
                                <MapPin className="w-2.5 h-2.5 text-[#ea580c] shrink-0 fill-[#ea580c]/15" />
                                <span 
                                  className="text-[6px] sm:text-[6.6px] print:text-[6.1px] font-bold text-slate-900 truncate tracking-tight"
                                  style={{
                                    fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                                    lineHeight: '1.5',
                                    letterSpacing: '-0.01em',
                                  }}
                                >
                                  {ensureMyanmarUnicode(br.address)}
                                </span>
                              </div>

                              {/* Line 2: Orange Phone Icon + Phone label and numbers */}
                              <div className="flex items-center gap-1 pl-3 text-slate-900 min-w-0 overflow-hidden">
                                <Phone className="w-2 h-2 text-[#ea580c] shrink-0 fill-[#ea580c]/15" />
                                <span 
                                  className="font-bold text-[#581c87] text-[6.2px] sm:text-[6.8px] print:text-[6.4px] shrink-0 font-sans"
                                  style={{ lineHeight: '1.3' }}
                                >
                                  Phone :
                                </span>
                                <span 
                                  className="text-slate-950 font-mono font-bold tracking-tight text-[6.5px] sm:text-[7.1px] print:text-[6.6px] whitespace-nowrap"
                                  style={{ lineHeight: '1.3' }}
                                >
                                  {br.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Centered Title directly underneath the letterhead */}
              <div className="text-center pt-1 pb-0.5">
                <h1 className="text-xs sm:text-sm font-black tracking-widest text-black uppercase font-sans">
                  {printType === 'receipt' ? 'RECEIPT' : 'COMMERCIAL INVOICE'}
                </h1>
              </div>

              {/* Top Metadata 2-Column Grid (Left flush with No, Right flush with Amount) */}
              <table className="w-full text-[11px] font-sans my-1 border-collapse" style={{ tableLayout: 'auto' }}>
                <tbody>
                  <tr>
                    {/* Left Column (Invoice No / Receipt No, Phone No, Customer Name, Township) */}
                    <td className="w-[55%] align-top p-0 text-left pr-1.5">
                      <table className="text-[11px] border-collapse w-full">
                        <tbody>
                          <tr>
                            <td className="font-bold text-black pr-1.5 py-0.5 whitespace-nowrap w-[92px]">
                              {printType === 'receipt' ? 'Receipt No' : 'Invoice No'}
                            </td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans pl-1 py-0.5 whitespace-nowrap">
                              {getFormattedVoucherNo(sale.invoiceNo, printType)}
                            </td>
                          </tr>
                          {!isCreditRepay && (
                            <tr>
                              <td className="font-bold text-black pr-1.5 py-0.5 whitespace-nowrap w-[92px]">Phone No</td>
                              <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                              <td className="font-bold text-black font-sans pl-1 py-0.5 whitespace-nowrap">{sale.customerPhone || '-'}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="font-bold text-black pr-1.5 py-0.5 whitespace-nowrap w-[92px]">Customer Name</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans pl-1 py-0.5 whitespace-nowrap">
                              <span>{sale.customerName || 'CASH'}</span>
                              {sale.isVipCustomer && (
                                <span className="ml-1 font-bold text-black">
                                  (VIP Customer)
                                </span>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold text-black pr-1.5 py-0.5 whitespace-nowrap w-[92px]">Township</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans pl-1 py-0.5 whitespace-nowrap">{customerTownship}</td>
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    {/* Right Column (Date, Staff / Cashier / Finance, Print Time, Currency) - Aligned flush right with Amount */}
                    <td className="w-[45%] align-top p-0 text-right pl-1.5">
                      <table className="text-[11px] border-collapse ml-auto">
                        <tbody>
                          <tr>
                            <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Date</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap">{formattedDate}</td>
                          </tr>
                          {isServiceSale ? (
                            <tr>
                              <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Technician</td>
                              <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                              <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap">{technicianName || salesPersonName}</td>
                            </tr>
                          ) : (
                            <tr>
                              <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Sales Person</td>
                              <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                              <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap">{salesPersonName}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Print Time</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap">{currentTime}</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Currency</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap">MMK</td>
                          </tr>
                          <tr>
                            <td className="font-bold text-black text-left pr-1.5 py-0.5 whitespace-nowrap w-[80px]">Payment</td>
                            <td className="font-bold text-black px-1 py-0.5 text-center w-2">:</td>
                            <td className="font-bold text-black font-sans text-left pl-1 py-0.5 whitespace-nowrap text-[10.5px]">
                              {isSplitPayment ? `Cash + ${bankNameLabel}` : (sale.paymentMethod || 'Cash')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Table with Exact Proportions, Fixed Layout (No Horizontal Scroll or Cut-off) */}
              <div className="pt-0.5">
                <table 
                  className="w-full text-left border-collapse text-[11px] font-sans" 
                  style={{ tableLayout: 'fixed', width: '100%' }}
                >
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '37%' }} />
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '19%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold border-t border-b border-black">
                      <th className="py-1 px-1 text-center border-l border-r border-black font-bold whitespace-nowrap">No</th>
                      <th className="py-1 px-2 text-center border-r border-black font-bold whitespace-nowrap">Description</th>
                      <th className="py-1 px-1 text-center border-r border-black font-bold whitespace-nowrap">Warranty</th>
                      <th className="py-1 px-1 text-center border-r border-black font-bold whitespace-nowrap">Qty</th>
                      <th className="py-1 pr-2.5 pl-1 text-right border-r border-black font-bold whitespace-nowrap">Price</th>
                      <th className="py-1 pr-3 pl-1 text-right border-r border-black font-bold whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Item rows */}
                    {invoiceItems.map((item) => (
                      <React.Fragment key={item.no}>
                        {/* Main Item Row */}
                        <tr className="align-top">
                          <td className="py-1 px-1 text-center font-bold text-black border-l border-r border-black align-top">
                            <span>{item.no}</span>
                          </td>
                          <td className="py-1 px-2 border-r border-black font-bold text-black align-top">
                            <div className="leading-snug">
                              {getDisplayDescription(item)}
                            </div>
                            {item.subDetail && (
                              <div 
                                className={`item-subdetail-tax-safe text-[10.5px] font-bold mt-0.5 leading-tight ${
                                  printType === 'receipt' ? 'invisible select-none' : 'text-black'
                                }`}
                                style={{
                                  visibility: printType === 'receipt' ? 'hidden' : 'visible',
                                  opacity: printType === 'receipt' ? 0 : 1,
                                  userSelect: printType === 'receipt' ? 'none' : 'auto',
                                }}
                                aria-hidden={printType === 'receipt'}
                              >
                                {cleanCustomerSerialNotes(item.subDetail)}
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-1 border-r border-black font-bold text-black text-center align-top text-[10.5px]">
                            {item.warranty}
                          </td>
                          <td className="py-1 px-1 text-center font-bold text-black border-r border-black font-sans align-top">{item.qty}</td>
                          <td className="py-1 pr-2.5 pl-1 text-right font-bold text-black border-r border-black font-sans align-top text-[11px] whitespace-nowrap">
                            {formatInvoiceNumber(item.price)}
                          </td>
                          <td className="py-1 pr-3 pl-1 text-right font-sans font-bold text-black border-r border-black align-top text-[11px] whitespace-nowrap">
                            <div className="leading-snug">{formatInvoiceNumber(item.amount)}</div>
                          </td>
                        </tr>

                        {/* Cashback One Blank Line Separator Row */}
                        {item.cashback !== undefined && item.cashback > 0 && (
                          <tr className="select-none">
                            <td className="border-l border-r border-black py-0.5 text-transparent">&nbsp;</td>
                            <td className="border-r border-black py-0.5 text-transparent">&nbsp;</td>
                            <td className="border-r border-black py-0.5 text-transparent">&nbsp;</td>
                            <td className="border-r border-black py-0.5 text-transparent">&nbsp;</td>
                            <td className="border-r border-black py-0.5 text-transparent">&nbsp;</td>
                            <td className="border-r border-black py-0.5 text-transparent">&nbsp;</td>
                          </tr>
                        )}

                        {/* Dedicated Cashback Row */}
                        {item.cashback !== undefined && item.cashback > 0 && (
                          <tr className="align-top">
                            <td className="py-0.5 px-1 text-center font-bold text-black border-l border-r border-black align-top text-transparent">&nbsp;</td>
                            <td className="py-0.5 px-2 border-r border-black font-bold text-black align-top">
                              <div className="text-[10.5px] text-black font-bold leading-tight font-sans tracking-wide">
                                Cashback
                              </div>
                            </td>
                            <td className="py-0.5 px-1 border-r border-black font-bold text-black text-center align-top text-[10.5px] text-transparent">&nbsp;</td>
                            <td className="py-0.5 px-1 text-center font-bold text-black border-r border-black font-sans align-top text-transparent">&nbsp;</td>
                            <td className="py-0.5 pr-2.5 pl-1 text-right font-bold text-black border-r border-black font-sans align-top text-[11px] whitespace-nowrap text-transparent">&nbsp;</td>
                            <td className="py-0.5 pr-3 pl-1 text-right font-sans font-bold text-black border-r border-black align-top text-[11px] whitespace-nowrap">
                              <div className="text-[10.5px] text-black font-bold leading-tight font-sans text-right">
                                - {formatInvoiceNumber(item.cashback * item.qty)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Spacer Row: Extends table vertical lines down to the solid bottom line */}
                    <tr>
                      <td className="border-l border-r border-b border-black" style={{ height: spacerHeight }}></td>
                      <td className="border-r border-b border-black" style={{ height: spacerHeight }}></td>
                      <td className="border-r border-b border-black" style={{ height: spacerHeight }}></td>
                      <td className="border-r border-b border-black" style={{ height: spacerHeight }}></td>
                      <td className="border-r border-b border-black" style={{ height: spacerHeight }}></td>
                      <td className="border-r border-b border-black" style={{ height: spacerHeight }}></td>
                    </tr>

                    {/* Sub Total */}
                    <tr>
                      <td 
                        colSpan={4} 
                        rowSpan={totalCashback > 0 ? 6 : 5} 
                        style={{ border: 'none' }} 
                        className="align-bottom p-1.5 sm:p-2 pr-3 sm:pr-4 text-left"
                      >
                        <div className="bg-slate-50/80 border border-slate-300 rounded-lg p-2 sm:p-2.5 max-w-[280px]">
                          <div className="flex items-center gap-1.5 text-black font-bold text-[10.5px] sm:text-[11px]">
                            <span className="text-amber-700 text-xs font-black select-none">★</span>
                            <span style={{ fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', sans-serif" }}>
                              ဝယ်ပြီးပစ္စည်း ပြန်လဲမပေးပါ။
                            </span>
                          </div>
                          <p className="text-[8.5px] sm:text-[9px] text-slate-500 italic font-sans mt-0.5 pl-4">
                            (Goods sold are not returnable or exchangeable)
                          </p>
                        </div>
                      </td>
                      <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Sub Total</td>
                      <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-black text-[11px] whitespace-nowrap">{formatInvoiceNumber(subTotal)}</td>
                    </tr>

                    {/* Cashback Summary Row */}
                    {totalCashback > 0 && (
                      <tr>
                        <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Cashback</td>
                        <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-black text-[11px] whitespace-nowrap">- {formatInvoiceNumber(totalCashback)}</td>
                      </tr>
                    )}

                    {/* Discount */}
                    <tr>
                      <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Discount</td>
                      <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-black text-[11px] whitespace-nowrap">{formatInvoiceNumber(discountAmount)}</td>
                    </tr>

                    {/* Net Total */}
                    <tr>
                      <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Net Total</td>
                      <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-black text-[11px] whitespace-nowrap">{formatInvoiceNumber(netTotal)}</td>
                    </tr>

                    {/* Paid */}
                    <tr>
                      <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Paid</td>
                      <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-black text-[11px] whitespace-nowrap">{formatInvoiceNumber(paid)}</td>
                    </tr>

                    {/* Balance */}
                    <tr>
                      <td className="border-l border-r border-b border-black px-2 py-1 font-bold text-black text-[11px] text-right whitespace-nowrap">Balance</td>
                      <td className="border-r border-b border-black pr-3 pl-1 py-1 text-right font-sans font-bold text-[11px] text-black whitespace-nowrap">{formatInvoiceNumber(remaining)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom 2 Signature Lines: Customer (Far Left) and Sales Person (Far Right) */}
            <div className="pt-8 sm:pt-10 pb-2 text-xs font-sans w-full">
              <div className="flex justify-between items-end w-full px-1 sm:px-2">
                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-black w-32 sm:w-40 mb-1.5"></div>
                  <span className="font-bold text-black text-[11px] whitespace-nowrap block">Customer Signature</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="border-t-2 border-black w-32 sm:w-40 mb-1.5"></div>
                  <span className="font-bold text-black text-[11px] whitespace-nowrap block">Sales Person Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden in Print) */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between no-print gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <ShieldCheck className={`w-4 h-4 ${printType === 'receipt' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>
              {printType === 'receipt'
                ? 'Tax-Safe Receipt • No Letterhead • Generic Item Names • Single-Page A5'
                : 'Standard Commercial Invoice • Full Audit Details & Letterhead • Single-Page A5'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Format Selector Pill directly before printing */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs border border-slate-300">
              <button
                type="button"
                onClick={() => handleSetPrintType('invoice')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer text-xs whitespace-nowrap ${
                  printType === 'invoice'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Commercial Invoice: Default Full Audit Voucher"
              >
                Commercial Invoice
              </button>
              <button
                type="button"
                onClick={() => handleSetPrintType('receipt')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer text-xs whitespace-nowrap ${
                  printType === 'receipt'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Receipt: Tax-Safe Version without Letterhead and with Generic Item Names"
              >
                Receipt (Tax-Safe)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>

            {/* Separate Print Buttons for Dual Print Mode */}
            <button
              type="button"
              onClick={() => handlePrint('invoice')}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                printType === 'invoice'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
              title="Print as Commercial Invoice with Full Letterhead and Serial/IMEI details"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print as Commercial Invoice</span>
            </button>

            <button
              type="button"
              onClick={() => handlePrint('receipt')}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                printType === 'receipt'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
              title="Print as Tax-Safe Receipt with generic description and no letterhead"
            >
              <Printer className="w-4 h-4 text-emerald-800" />
              <span>Print as Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Shop & Logo Settings Modal */}
      <ShopLogoSettingsModal
        isOpen={isLogoSettingsOpen}
        onClose={() => setIsLogoSettingsOpen(false)}
        initialTab={logoModalTab}
        onLogoUpdated={(newUrl) => setCustomLogoUrl(newUrl)}
        onBranchesUpdated={(newBranches) => setVoucherBranches(newBranches)}
      />
    </div>
  );
};

export const PrintVoucher = POSCustomerVoucherModal;
export default POSCustomerVoucherModal;
