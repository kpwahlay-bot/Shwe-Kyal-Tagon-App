import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Scan, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Coins, 
  Banknote, 
  Printer, 
  PauseCircle, 
  PlayCircle, 
  Search, 
  X, 
  User, 
  Phone, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Crown,
  History,
  MapPin,
  Lock
} from 'lucide-react';
import { 
  InventoryItem, 
  Branch, 
  Employee, 
  UserAccount, 
  DailySale, 
  SaleCartItem, 
  HoldBill, 
  MYANMAR_PAYMENT_METHODS, 
  PaymentMethod,
  CustomerProfile,
  ContactPartner,
  normalizeDepartmentName,
  canUserApplyDiscount,
  canUserAccessAllBranchesPOS
} from '../types';
import { formatMMK, formatNumber, formatDateDMY } from '../utils/formatters';
import { buildCustomerProfiles, findCustomerByPhone, findCustomerByName, getCustomerPurchaseHistory, normalizePhone } from '../utils/customerHelper';
import { isDummyOrInvalidStaff } from '../data/initialData';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import { FormattedNumberInput } from './FormattedNumberInput';
import { generateDailySalesInvoiceNo } from './DailySalesLedger';
import { getAvailableStockForBranch, resolveItemWarranty } from '../utils/inventoryHelper';

interface SmartPOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  branches: Branch[];
  employees: Employee[];
  currentUser: UserAccount;
  activeBranchId?: string;
  activeBranchFilter?: string;
  existingSales?: DailySale[];
  contacts?: ContactPartner[];
  activeShift?: any;
  onCompleteSale: (
    sale: DailySale, 
    cartItems: SaleCartItem[]
  ) => void;
  heldBills: HoldBill[];
  onSaveHoldBill: (bill: HoldBill) => void;
  onRemoveHoldBill: (id: string) => void;
}

export const SmartPOSModal: React.FC<SmartPOSModalProps> = ({
  isOpen,
  onClose,
  inventory,
  branches,
  employees,
  currentUser,
  activeBranchId = 'ALL',
  activeBranchFilter,
  existingSales = [],
  contacts = [],
  activeShift,
  onCompleteSale,
  heldBills,
  onSaveHoldBill,
  onRemoveHoldBill,
}) => {
  // Current active branch (Strictly locked to assigned branch for Staff/Cashier/Manager)
  const canAccessAllBranches = canUserAccessAllBranchesPOS(currentUser);
  const effectiveBranchId = canAccessAllBranches
    ? ((activeBranchFilter && activeBranchFilter !== 'ALL')
        ? activeBranchFilter
        : (activeBranchId !== 'ALL'
            ? activeBranchId
            : (currentUser.branchId === 'ALL' ? (branches[0]?.id || 'branch-1') : currentUser.branchId)))
    : (currentUser.branchId && currentUser.branchId !== 'ALL' ? currentUser.branchId : (branches[0]?.id || 'branch-1'));
  const currentBranch = branches.find((b) => b.id === effectiveBranchId) || branches[0];

  // Barcode search input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Multi-item Cart
  const [cart, setCart] = useState<SaleCartItem[]>([]);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTownship, setCustomerTownship] = useState('');
  const [notes, setNotes] = useState('');

  // Customer Profile & VIP Lookup
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

  const customerProfiles = useMemo(() => {
    return buildCustomerProfiles(existingSales, contacts);
  }, [existingSales, contacts]);

  const matchedCustomer = useMemo(() => {
    return findCustomerByPhone(customerPhone, customerProfiles);
  }, [customerPhone, customerProfiles]);

  const phoneSuggestions = useMemo(() => {
    if (!customerPhone || customerPhone.trim().length < 1) return [];
    const q = customerPhone.trim().toLowerCase();
    const normQ = normalizePhone(q);
    return customerProfiles.filter((c) => {
      const cPhone = c.phone.toLowerCase();
      const cNorm = normalizePhone(c.phone);
      const cName = c.name.toLowerCase();
      return (
        cPhone.includes(q) ||
        (normQ && cNorm.includes(normQ)) ||
        cName.includes(q)
      );
    }).slice(0, 8);
  }, [customerPhone, customerProfiles]);

  const handlePhoneChange = (input: string) => {
    setCustomerPhone(input);
    setShowPhoneSuggestions(true);
    const found = findCustomerByPhone(input, customerProfiles);
    if (found) {
      setCustomerName(found.name);
      if (found.township) setCustomerTownship(found.township);
    }
  };

  const handleCustomerNameChange = (input: string) => {
    setCustomerName(input);
    const found = findCustomerByName(input, customerProfiles);
    if (found) {
      if (!customerPhone && found.phone) setCustomerPhone(found.phone);
      if (found.township && !customerTownship) setCustomerTownship(found.township);
    }
  };

  const handleSelectSuggestedCustomer = (c: CustomerProfile) => {
    setCustomerPhone(c.phone);
    setCustomerName(c.name);
    if (c.township) setCustomerTownship(c.township);
    setShowPhoneSuggestions(false);
  };

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('KBZPay');
  const [bankType, setBankType] = useState('KBZPay');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);

  // Discount authorization check (MD & Yamin Only)
  const canApplyDiscount = useMemo(() => canUserApplyDiscount(currentUser), [currentUser]);

  // Branch-specific Sales Department staff list for Product POS Checkout
  const branchSalesStaff = useMemo(() => {
    const list: { name: string; title: string; branch: string; position: string; role: string; dept: string }[] = [];
    const seen = new Set<string>();

    employees.forEach((emp) => {
      if (emp.status === 'resigned') return;
      if (isDummyOrInvalidStaff(emp.name)) return;
      if (effectiveBranchId && effectiveBranchId !== 'ALL' && emp.branchId !== effectiveBranchId) return;

      const dept = normalizeDepartmentName(emp.department || emp.position);
      // Strictly Sales Department staff for Product Sales
      const isSales = dept === 'Sales Department';

      if (isSales && emp.name && !seen.has(emp.name)) {
        seen.add(emp.name);
        list.push({
          name: emp.name,
          title: emp.position || emp.department || 'Sales Staff',
          position: emp.position || 'Sales Staff',
          role: emp.isManager ? 'Manager' : 'Staff',
          branch: emp.branchName || '',
          dept: 'Sales Department',
        });
      }
    });

    if (list.length === 0) {
      employees.forEach((emp) => {
        if (emp.status === 'resigned' || isDummyOrInvalidStaff(emp.name)) return;
        const dept = normalizeDepartmentName(emp.department || emp.position);
        if (dept === 'Sales Department' && emp.name && !seen.has(emp.name)) {
          seen.add(emp.name);
          list.push({
            name: emp.name,
            title: `${emp.position || 'Sales Staff'} (${emp.branchName?.replace('ရွှေကြယ်တံခွန် (', '').replace(')', '') || 'HQ'})`,
            position: emp.position || 'Sales Staff',
            role: emp.isManager ? 'Manager' : 'Staff',
            branch: emp.branchName || '',
            dept: 'Sales Department',
          });
        }
      });
    }

    return list;
  }, [employees, effectiveBranchId]);

  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(() => {
    return currentUser.displayName;
  });

  // Keep selected salesperson in sync with branch sales staff
  useEffect(() => {
    if (branchSalesStaff.length > 0) {
      const match = branchSalesStaff.find(s => s.name === currentUser.displayName) || branchSalesStaff[0];
      setSelectedSalesperson((prev) => {
        if (prev && branchSalesStaff.some(s => s.name === prev)) return prev;
        return match.name;
      });
    }
  }, [branchSalesStaff, currentUser.displayName]);

  // Held Bills Drawer
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [scanNotice, setScanNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto focus barcode input on mount and on modal open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Keyboard shortcut listener: F2 (Focus Scanner), F9 (Checkout), Escape (Close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (isHeldBillsOpen) {
          setIsHeldBillsOpen(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isHeldBillsOpen, onClose]);

  // Inventory available in this branch
  const branchInventory = useMemo(() => {
    return inventory.map((item) => {
      const branchQty = getAvailableStockForBranch(item, effectiveBranchId);
      return {
        ...item,
        currentBranchStock: branchQty,
      };
    });
  }, [inventory, effectiveBranchId]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    branchInventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [branchInventory]);

  // Filtered products for quick picker
  const filteredProducts = useMemo(() => {
    return branchInventory.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch = !productSearch || 
        item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        (item.brand && item.brand.toLowerCase().includes(productSearch.toLowerCase())) ||
        (item.model && item.model.toLowerCase().includes(productSearch.toLowerCase())) ||
        (item.imeiOrSerial && item.imeiOrSerial.toLowerCase().includes(productSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [branchInventory, selectedCategory, productSearch]);

  // Add an item to the Cart
  const addItemToCart = (item: InventoryItem) => {
    const currentBranchStock = effectiveBranchId === 'ALL'
      ? item.totalStock
      : (item.branchStock[effectiveBranchId] || 0);

    if (currentBranchStock <= 0) {
      setScanNotice({ text: `❌ "${item.name}" is out of stock (0 units). Cannot create sale for out of stock items.`, type: 'error' });
      return;
    }

    const existingIdx = cart.findIndex((c) => c.inventoryItemId === item.id);
    if (existingIdx >= 0) {
      const currentItem = cart[existingIdx];
      if (currentItem.quantity >= currentBranchStock) {
        setScanNotice({ text: `❌ "${item.name}" only has ${currentBranchStock} units in stock. Cannot add more!`, type: 'error' });
        return;
      }
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.inventoryItemId === item.id);
      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prev];
        const currentItem = updated[existingIdx];
        const newQty = currentItem.quantity + 1;
        const cb = currentItem.cashback || 0;
        updated[existingIdx] = {
          ...currentItem,
          quantity: newQty,
          total: (newQty * Math.max(0, currentItem.unitPrice - cb)) - currentItem.discount,
        };
        return updated;
      } else {
        // Add new line
        const itemWarranty = resolveItemWarranty(
          item.sku,
          item.brand,
          item.category,
          item.name,
          item.warranty,
          '1 Year (Official)'
        );
        const newItem: SaleCartItem = {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          inventoryItemId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          brand: item.brand,
          quantity: 1,
          unitPrice: item.sellingPrice,
          costPrice: item.costPrice || 0,
          discount: 0,
          cashback: 0,
          total: item.sellingPrice,
          warranty: itemWarranty,
          imeiOrSerial: item.imeiOrSerial,
        };
        return [newItem, ...prev];
      }
    });

    setScanNotice({ text: `Added "${item.name}" to cart`, type: 'success' });
    setTimeout(() => setScanNotice(null), 2500);
  };

  // Barcode / Scanner submission
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Search by exact SKU, exact IMEI, or case-insensitive match
    const matchedItem = branchInventory.find(
      (item) =>
        item.sku.toLowerCase() === query.toLowerCase() ||
        (item.imeiOrSerial && item.imeiOrSerial.toLowerCase() === query.toLowerCase()) ||
        item.name.toLowerCase() === query.toLowerCase()
    );

    if (matchedItem) {
      addItemToCart(matchedItem);
      setBarcodeInput('');
    } else {
      // Try partial match
      const partialMatch = branchInventory.find(
        (item) =>
          item.sku.toLowerCase().includes(query.toLowerCase()) ||
          item.name.toLowerCase().includes(query.toLowerCase())
      );

      if (partialMatch) {
        addItemToCart(partialMatch);
        setBarcodeInput('');
      } else {
        setScanNotice({ text: `Barcode / Item not found: "${query}"`, type: 'error' });
        setTimeout(() => setScanNotice(null), 3000);
      }
    }
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartId);
      return;
    }
    const itemInCart = cart.find((i) => i.id === cartId);
    if (itemInCart?.inventoryItemId) {
      const inv = inventory.find((i) => i.id === itemInCart.inventoryItemId);
      if (inv) {
        const avail = effectiveBranchId === 'ALL' ? inv.totalStock : (inv.branchStock[effectiveBranchId] || 0);
        if (newQty > avail) {
          setScanNotice({ text: `❌ "${itemInCart.name}" only has ${avail} units in stock. Cannot increase quantity!`, type: 'error' });
          return;
        }
      }
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          const qty = Math.max(1, newQty);
          const cb = item.cashback || 0;
          return {
            ...item,
            quantity: qty,
            total: (qty * Math.max(0, item.unitPrice - cb)) - item.discount,
          };
        }
        return item;
      })
    );
  };

  // Update Cart Item Unit Price
  const handleUpdateUnitPrice = (cartId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          const price = Math.max(0, newPrice);
          const cb = item.cashback || 0;
          return {
            ...item,
            unitPrice: price,
            total: (item.quantity * Math.max(0, price - cb)) - item.discount,
          };
        }
        return item;
      })
    );
  };

  // Update Cart Item Cashback
  const handleUpdateCashback = (cartId: string, newCashback: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartId) {
          const cb = Math.max(0, newCashback);
          return {
            ...item,
            cashback: cb,
            total: (item.quantity * Math.max(0, item.unitPrice - cb)) - item.discount,
          };
        }
        return item;
      })
    );
  };

  // Remove Cart Item
  const handleRemoveCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== cartId));
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear all items from the cart?')) {
      setCart([]);
      setOverallDiscount(0);
      setTenderedAmount(0);
    }
  };

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  }, [cart]);

  const cartCashbackTotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + ((i.cashback || 0) * i.quantity), 0);
  }, [cart]);

  const lineDiscountsTotal = useMemo(() => {
    return cart.reduce((sum, i) => sum + (i.discount || 0), 0);
  }, [cart]);

  const totalDiscount = lineDiscountsTotal + overallDiscount;
  const netTotal = Math.max(0, cartSubtotal - cartCashbackTotal - totalDiscount);

  // Change Due Calculation
  const changeDue = paymentMethod === 'Cash' 
    ? Math.max(0, (tenderedAmount || 0) - netTotal)
    : 0;

  // Set default tendered to exact when netTotal changes and tendered was 0 or matching previous
  useEffect(() => {
    if (paymentMethod === 'Cash' && tenderedAmount === 0 && netTotal > 0) {
      setTenderedAmount(netTotal);
    }
  }, [netTotal, paymentMethod]);

  // Cash Presets helper
  const handleAddPreset = (amount: number) => {
    setTenderedAmount((prev) => prev + amount);
  };

  const handleSetExact = () => {
    setTenderedAmount(netTotal);
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const holdBillRecord: HoldBill = {
      id: `hold-${Date.now()}`,
      holdNumber: `HB-${Date.now().toString().slice(-4)}`,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      township: customerTownship,
      branchId: effectiveBranchId,
      branchName: currentBranch ? `${currentBranch.code} (${currentBranch.city})` : 'Main Branch',
      items: [...cart],
      subTotal: cartSubtotal,
      discount: totalDiscount,
      netTotal,
      savedAt: new Date().toISOString(),
      savedBy: currentUser.displayName,
      notes,
    };

    onSaveHoldBill(holdBillRecord);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerTownship('');
    setNotes('');
    setOverallDiscount(0);
    setTenderedAmount(0);
    setScanNotice({ text: `Saved bill ${holdBillRecord.holdNumber} to Held Bills`, type: 'success' });
    setTimeout(() => setScanNotice(null), 3000);
  };

  // Recall Held Bill
  const handleRecallBill = (bill: HoldBill) => {
    if (cart.length > 0) {
      if (!window.confirm('Do you want to replace current cart and recall the held voucher?')) {
        return;
      }
    }
    setCart(bill.items);
    setCustomerName(bill.customerName || '');
    setCustomerPhone(bill.customerPhone || '');
    setCustomerTownship(bill.township || '');
    setNotes(bill.notes || '');
    onRemoveHoldBill(bill.id);
    setIsHeldBillsOpen(false);
    setScanNotice({ text: `Recalled ${bill.holdNumber}`, type: 'success' });
    setTimeout(() => setScanNotice(null), 2500);
  };

  // Complete Sale & Print
  const handleCheckoutSubmit = () => {
    if (cart.length === 0) {
      alert('Please add at least 1 item to the cart.');
      return;
    }

    // Hard block out of stock items
    for (const item of cart) {
      if (item.inventoryItemId) {
        const inv = inventory.find(i => i.id === item.inventoryItemId);
        if (inv) {
          const avail = effectiveBranchId === 'ALL' ? inv.totalStock : (inv.branchStock[effectiveBranchId] || 0);
          if (avail <= 0 || item.quantity > avail) {
            alert(`❌ "${item.name}" is out of stock or requested quantity exceeds available stock!\n\nAvailable: ${avail} Units\nRequested: ${item.quantity} Units\n\nSales for items without sufficient stock are restricted.`);
            return;
          }
        }
      }
    }

    if (paymentMethod === 'Cash' && tenderedAmount < netTotal) {
      const proceed = window.confirm(
        `Tendered cash (${formatMMK(tenderedAmount)}) is less than net total (${formatMMK(netTotal)}). Proceed as partial/credit?`
      );
      if (!proceed) return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const invoiceNo = generateDailySalesInvoiceNo(
      todayDate, 
      existingSales || [], 
      effectiveBranchId, 
      currentBranch?.name
    );

    // Item summary name
    const summaryItemName = cart.length === 1 
      ? cart[0].name 
      : `${cart[0].name} + ${cart.length - 1} other items`;

    const totalCost = cart.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
    const profit = Math.max(0, netTotal - totalCost);

    const newSale: DailySale = {
      id: `sale-${Date.now()}`,
      date: todayDate,
      invoiceNo,
      sku: cart[0]?.sku || 'POS-CART',
      saleType: 'PRODUCT',
      branchId: effectiveBranchId,
      branchName: currentBranch ? `${currentBranch.code} (${currentBranch.city})` : 'Main Branch',
      inventoryItemId: cart.length === 1 ? cart[0].inventoryItemId : undefined,
      quantity: cart.reduce((sum, i) => sum + i.quantity, 0),
      itemName: summaryItemName,
      category: cart[0]?.category || 'Retail Sales',
      costPrice: totalCost,
      salePrice: netTotal,
      cashback: cartCashbackTotal > 0 ? cartCashbackTotal : undefined,
      profit,
      paymentMethod,
      bankType: paymentMethod === 'Cash' ? 'Cash' : bankType,
      paidAmount: paymentMethod === 'Cash' ? Math.min(tenderedAmount, netTotal) : netTotal,
      remainingDebt: Math.max(0, netTotal - (paymentMethod === 'Cash' ? tenderedAmount : netTotal)),
      paymentStatus: paymentMethod === 'Cash' && tenderedAmount < netTotal ? 'PARTIAL' : 'PAID',
      tenderedAmount: paymentMethod === 'Cash' ? tenderedAmount : netTotal,
      changeAmount: changeDue,
      items: [...cart],
      employeeId: currentUser.id,
      employeeName: selectedSalesperson || currentUser.displayName,
      salespersonName: selectedSalesperson || currentUser.displayName,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      township: customerTownship,
      isVipCustomer: matchedCustomer?.isVip || false,
      discount: totalDiscount,
      warranty: cart[0]?.warranty || resolveItemWarranty(cart[0]?.sku, cart[0]?.brand, cart[0]?.category, cart[0]?.name, undefined, '1 Year'),
      notes,
      createdAt: new Date().toISOString(),
    };

    onCompleteSale(newSale, cart);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex flex-col p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col h-full max-h-[96vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold shadow-md">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                  <span>Smart Retail POS Checkout</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    High Speed
                  </span>
                </h2>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Branch: <strong className="text-slate-200">{currentBranch?.code} ({currentBranch?.city})</strong></span>
                <span>•</span>
                <span>Cashier: <strong className="text-slate-200">{currentUser.displayName}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Held Bills Toggle */}
            <button
              type="button"
              onClick={() => setIsHeldBillsOpen(!isHeldBillsOpen)}
              className="relative px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Held Bills</span>
              {heldBills.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {heldBills.length}
                </span>
              )}
            </button>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
              <span className="font-mono bg-slate-700 text-amber-300 px-1 rounded">F2</span> Scanner
              <span className="mx-1">•</span>
              <span className="font-mono bg-slate-700 text-amber-300 px-1 rounded">Esc</span> Close
            </div>

            {/* Close modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close POS"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scan Status Toast Banner */}
        {scanNotice && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all ${
              scanNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {scanNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{scanNotice.text}</span>
            </div>
          </div>
        )}

        {/* Main Body Grid: 2 Columns (Left: Fast Scanner & Product Catalog, Right: High Speed Cart & Tender) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT COLUMN: Fast Barcode Scanner & Product Grid (7 cols) */}
          <div className="lg:col-span-7 flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50/50">
            {/* Barcode Search Bar */}
            <div className="p-3 sm:p-4 bg-white border-b border-slate-200 shrink-0 shadow-2xs">
              <form onSubmit={handleBarcodeSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Scan className="w-5 h-5 text-amber-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan Barcode / SKU / Serial / IMEI and press Enter... (F2)"
                    className="w-full pl-11 pr-24 py-2.5 text-sm bg-slate-50 border-2 border-amber-400/80 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden font-mono transition-all placeholder:font-sans placeholder:text-slate-400 font-medium"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      Auto-Scan
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Add (Enter)
                </button>
              </form>

              {/* Secondary Keyword Search & Category Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name or brand..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
                  {categories.slice(0, 6).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Quick Picker Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProducts.map((item) => {
                  const isOutOfStock = item.currentBranchStock <= 0;
                  const isLow = item.currentBranchStock > 0 && item.currentBranchStock <= (item.minStockAlert || 3);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItemToCart(item)}
                      className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between bg-white hover:border-amber-400 hover:shadow-md cursor-pointer group ${
                        isOutOfStock 
                          ? 'border-slate-200 opacity-60' 
                          : 'border-slate-200/90 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-slate-500 font-bold truncate max-w-[80px]">
                            {item.sku}
                          </span>
                          <span
                            className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.currentBranchStock} in stock
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
                          {item.name}
                        </h4>
                        {item.brand && (
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {item.brand} {item.model ? `• ${item.model}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {formatMMK(item.sellingPrice)}
                        </span>
                        <div className="p-1 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                    No products found. Please check name, SKU or barcode.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Cart, Tender & Change Calculator (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
            {/* Cart Header */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)} Items)
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    Selected Items
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleHoldBill}
                  disabled={cart.length === 0}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors cursor-pointer"
                  title="Suspend & Hold Bill"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>Hold</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Clear Cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col gap-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{item.sku}</span>
                        {item.warranty && <span>• {item.warranty}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCartItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity and Price row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value, 10) || 1)}
                        className="w-10 text-center text-xs font-bold font-mono bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-200 text-xs font-bold shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {formatMMK(item.total)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        @ {formatNumber(item.unitPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                  <ShoppingCart className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scan barcode or select products from the left catalogue
                  </p>
                </div>
              )}
            </div>

            {/* Customer & Salesperson Info Accordion */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 text-xs shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer Information</span>
                </span>
                
                {/* VIP Customer Badge Indicator */}
                {matchedCustomer && (
                  <div className="flex items-center gap-1.5">
                    {matchedCustomer.isVip ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs">
                        <Crown className="w-3 h-3 fill-slate-950" />
                        <span>VIP Customer ({matchedCustomer.vipEligibleItems ?? matchedCustomer.totalItemsPurchased} items)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                        Regular ({matchedCustomer.totalPurchaseCount} orders)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsHistoryOpen(true)}
                      className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>History</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Phone First, Name Second, Township Third */}
              <div className="grid grid-cols-2 gap-2 relative">
                {/* Customer Phone - Positioned FIRST as requested */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10.5px] font-bold text-slate-700">
                      Customer Phone *
                    </label>
                    {matchedCustomer && (
                      <span className="text-[9.5px] text-emerald-600 font-bold">
                        ✓ Found ({matchedCustomer.vipEligibleItems ?? matchedCustomer.totalItemsPurchased} items)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onFocus={() => setShowPhoneSuggestions(true)}
                    placeholder="09xxxxxxxxx (Auto-fill Name)"
                    className={`w-full px-2.5 py-1 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-mono font-bold ${
                      matchedCustomer?.isVip ? 'border-amber-400 bg-amber-50/50 text-amber-950' : 'border-slate-300'
                    }`}
                  />

                  {/* Phone Suggestions Dropdown */}
                  {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {phoneSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectSuggestedCustomer(c)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50 flex items-center justify-between text-xs cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {c.isVip && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                                  VIP
                                </span>
                              )}
                              {c.isContactPartner && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                  {c.partnerType || 'Contact'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.phone || 'No phone'}</div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500">
                            {c.totalPurchaseCount > 0 ? `${c.vipEligibleItems ?? c.totalItemsPurchased} items` : (c.township || 'Contact List')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Name - Positioned Second */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10.5px] font-bold text-slate-700">Customer Name</label>
                    {customerName && customerName !== 'Walk-in Customer' && (
                      <span className="text-[9.5px] text-slate-400">Recorded</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => handleCustomerNameChange(e.target.value)}
                    placeholder="Walk-in Customer / U Kyaw"
                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Sales Person (Sales Department only) */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3 h-3 text-purple-600" />
                    <span>Sales Person ({currentBranch?.code || 'Shop'} • Sales Dept) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const customName = prompt('Enter Sales Person Name (e.g. Mya Mya):');
                      if (customName && customName.trim()) {
                        setSelectedSalesperson(customName.trim());
                      }
                    }}
                    className="text-[9.5px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                  >
                    + Custom
                  </button>
                </div>
                <select
                  value={selectedSalesperson}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      const customName = prompt('Enter Sales Person Name (e.g. Mya Mya):');
                      if (customName && customName.trim()) {
                        setSelectedSalesperson(customName.trim());
                      }
                    } else {
                      setSelectedSalesperson(e.target.value);
                    }
                  }}
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-bold text-slate-800 cursor-pointer"
                >
                  {selectedSalesperson && !branchSalesStaff.some(s => s.name === selectedSalesperson) && (
                    <option value={selectedSalesperson}>{selectedSalesperson} (Selected)</option>
                  )}
                  {branchSalesStaff.map((st) => (
                    <option key={st.name} value={st.name}>
                      {st.name} ({st.title})
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Name...</option>
                </select>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'KBZPay', 'WavePay', 'Bank Transfer'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        paymentMethod === pm
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Input Field */}
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    <span>Discount (MMK)</span>
                  </span>
                  {!canApplyDiscount && (
                    <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                      <Lock className="w-3 h-3 text-amber-700" />
                      <span>MD & Yamin Only</span>
                    </span>
                  )}
                  <div className="relative w-36">
                    <FormattedNumberInput
                      value={overallDiscount}
                      onChange={(val) => {
                        if (!canApplyDiscount) return;
                        setOverallDiscount(val);
                      }}
                      disabled={!canApplyDiscount}
                      min={0}
                      placeholder="0"
                      className={`w-full text-right pr-2.5 pl-6 py-1 border-2 rounded-lg font-mono font-bold text-xs shadow-2xs ${
                        !canApplyDiscount 
                          ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed' 
                          : 'bg-white border-amber-300 text-slate-900 focus:border-amber-500 focus:outline-hidden'
                      }`}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">Ks</span>
                  </div>
                </div>

                {/* Quick Discount Presets (Only for authorized users) */}
                {canApplyDiscount && (
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                    <span className="text-[10px] text-slate-500 shrink-0 font-medium">Quick:</span>
                    {[500, 1000, 2000, 3000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setOverallDiscount(amt)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer shrink-0 ${
                          overallDiscount === amt 
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        +{formatNumber(amt)}
                      </button>
                    ))}
                    {overallDiscount > 0 && (
                      <button
                        type="button"
                        onClick={() => setOverallDiscount(0)}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer shrink-0 ml-auto"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tendered Cash & Change Due Calculator (Shown when payment is Cash) */}
              {paymentMethod === 'Cash' && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      <span>Customer Tendered Cash</span>
                    </span>
                    <FormattedNumberInput
                      value={tenderedAmount}
                      onChange={(val) => setTenderedAmount(val)}
                      min={0}
                      placeholder="0"
                      className="w-32 text-right px-2 py-1 bg-white border-2 border-amber-400 rounded-lg font-mono font-extrabold text-sm text-slate-900 focus:outline-hidden"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-0.5">
                    <button
                      type="button"
                      onClick={handleSetExact}
                      className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 font-bold rounded text-[11px] hover:bg-amber-100 shrink-0 cursor-pointer"
                    >
                      Exact
                    </button>
                    {[1000, 5000, 10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAddPreset(amt)}
                        className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded text-[10px] hover:bg-slate-100 shrink-0 cursor-pointer"
                      >
                        +{formatNumber(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Change Due:
                    </span>
                    <span className="text-base font-extrabold font-mono text-emerald-700">
                      {formatMMK(changeDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Checkout Action Panel */}
            <div className="p-3.5 bg-slate-900 text-white border-t border-slate-800 shrink-0">
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-slate-400">Subtotal:</span>
                <span className="font-mono text-slate-200">
                  {formatMMK(cartSubtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Total Discount:</span>
                </span>
                <span className="font-mono font-bold text-amber-400">
                  - {formatMMK(totalDiscount)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3 pt-2 border-t border-slate-800">
                <span className="text-sm font-bold text-white">Net Total:</span>
                <span className="text-xl font-extrabold font-mono text-amber-400">
                  {formatMMK(netTotal)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Complete Sale & Print Voucher</span>
              </button>
            </div>
          </div>
        </div>

        {/* Held Bills Drawer (Slides in when clicked) */}
        {isHeldBillsOpen && (
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Suspended & Held Bills</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHeldBillsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {heldBills.map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-400 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{bill.holdNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateDMY(new Date(bill.savedAt).toISOString().split('T')[0])} {new Date(bill.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    Customer: {bill.customerName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {bill.items.length} items • Net: <strong className="text-slate-900">{formatMMK(bill.netTotal)}</strong>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveHoldBill(bill.id)}
                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecallBill(bill)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Recall Sale</span>
                    </button>
                  </div>
                </div>
              ))}

              {heldBills.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No suspended bills.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Purchase History Modal */}
      {isHistoryOpen && matchedCustomer && (
        <CustomerHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          customer={matchedCustomer}
          historySales={getCustomerPurchaseHistory(matchedCustomer.phone || matchedCustomer.name, existingSales)}
        />
      )}
    </div>
  );
};
