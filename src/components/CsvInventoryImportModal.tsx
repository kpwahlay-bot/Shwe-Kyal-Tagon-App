import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Building2, 
  Info,
  ChevronRight,
  Database,
  FileCheck
} from 'lucide-react';
import { InventoryItem, InventoryCategory, Branch, UserAccount } from '../types';
import { PRIMARY_INVENTORY_CATEGORIES, generateAutoSKU, detectBrandFromName } from '../utils/skuGenerator';
import { formatMMK, formatNumber } from '../utils/formatters';
import { resolveItemWarranty } from '../utils/inventoryHelper';

interface CsvInventoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  branches: Branch[];
  currentUser: UserAccount;
  activeBranchId: string;
  onBulkReplaceInventory?: (items: InventoryItem[]) => void;
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onLogActivity?: (log: any) => void;
}

// Helper to safely parse CSV line handling quotes
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// Helper to parse complete CSV string
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  // Remove BOM if present
  let cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  
  // Detect delimiter: tab or comma
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const rawLines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (rawLines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(rawLines[0], delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: string[][] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCSVLine(rawLines[i], delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
    if (cols.some(c => c.length > 0)) {
      rows.push(cols);
    }
  }

  return { headers, rows };
}

// Header auto-matcher
function autoMatchColumn(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const cleanHeader = headers[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const cand of candidates) {
      const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanCand || cleanHeader.includes(cleanCand)) {
        return i;
      }
    }
  }
  return -1;
}

export const CsvInventoryImportModal: React.FC<CsvInventoryImportModalProps> = ({
  isOpen,
  onClose,
  inventory,
  branches,
  currentUser,
  activeBranchId,
  onBulkReplaceInventory,
  onAddItem,
  onUpdateItem,
  onLogActivity,
}) => {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [targetBranchId, setTargetBranchId] = useState<string>(
    activeBranchId !== 'ALL' ? activeBranchId : (branches[0]?.id || 'b-sk-hq')
  );
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; added: number; updated: number; error: number }>({
    total: 0,
    added: 0,
    updated: 0,
    error: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Mapping indices
  const [colName, setColName] = useState<number>(-1);
  const [colSku, setColSku] = useState<number>(-1);
  const [colCategory, setColCategory] = useState<number>(-1);
  const [colCost, setColCost] = useState<number>(-1);
  const [colPrice, setColPrice] = useState<number>(-1);
  const [colQty, setColQty] = useState<number>(-1);
  const [colBrand, setColBrand] = useState<number>(-1);
  const [colModel, setColModel] = useState<number>(-1);
  const [colWarranty, setColWarranty] = useState<number>(-1);
  const [colSupplier, setColSupplier] = useState<number>(-1);
  const [colSerial, setColSerial] = useState<number>(-1);

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFile(null);
      setCsvHeaders([]);
      setCsvRows([]);
      setTargetBranchId(activeBranchId !== 'ALL' ? activeBranchId : (branches[0]?.id || 'b-sk-hq'));
      setImportMode('MERGE');
      setIsProcessing(false);
    }
  }, [isOpen, activeBranchId, branches]);

  // Handle File Selection (Supports CSV and Excel .xlsx/.xls via SheetJS)
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const fileName = selectedFile.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonRows: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (jsonRows.length === 0) {
            alert('Selected Excel file is empty.');
            return;
          }

          const headers = (jsonRows[0] || []).map(h => String(h || '').trim());
          const rows = jsonRows.slice(1).map(r => (r || []).map(c => String(c ?? '').trim())).filter(r => r.some(c => c.length > 0));

          setCsvHeaders(headers);
          setCsvRows(rows);

          // Auto match columns
          setColName(autoMatchColumn(headers, ['itemname', 'name', 'description', 'productname', 'item', 'product', 'title']));
          setColSku(autoMatchColumn(headers, ['sku', 'barcode', 'itemcode', 'code', 'productcode', 'id']));
          setColCategory(autoMatchColumn(headers, ['category', 'group', 'type', 'cat']));
          setColCost(autoMatchColumn(headers, ['costprice', 'cost', 'buyingprice', 'purchaseprice', 'unitcost', 'buyingcost', 'purcost', 'buyingcostmmk']));
          setColPrice(autoMatchColumn(headers, ['sellingprice', 'price', 'saleprice', 'retailprice', 'unitprice', 'sale', 'sellingpricemmk']));
          setColQty(autoMatchColumn(headers, ['qty', 'quantity', 'stock', 'balance', 'instock', 'currentstock', 'onhand', 'stockquantityunits', 'stockqty', 'units']));
          setColBrand(autoMatchColumn(headers, ['brand', 'manufacturer', 'make']));
          setColModel(autoMatchColumn(headers, ['model', 'modelno']));
          setColWarranty(autoMatchColumn(headers, ['warranty', 'guarantee']));
          setColSupplier(autoMatchColumn(headers, ['supplier', 'vendor']));
          setColSerial(autoMatchColumn(headers, ['imei', 'serial', 'serialnumber', 'serials']));

          setStep('map');
        } catch (err) {
          console.error('Error parsing Excel file:', err);
          alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        const parsed = parseCSV(content);
        setCsvHeaders(parsed.headers);
        setCsvRows(parsed.rows);

        // Auto match columns
        const h = parsed.headers;
        setColName(autoMatchColumn(h, ['itemname', 'name', 'description', 'productname', 'item', 'product', 'title']));
        setColSku(autoMatchColumn(h, ['sku', 'barcode', 'itemcode', 'code', 'productcode', 'id']));
        setColCategory(autoMatchColumn(h, ['category', 'group', 'type', 'cat']));
        setColCost(autoMatchColumn(h, ['costprice', 'cost', 'buyingprice', 'purchaseprice', 'unitcost', 'buyingcost', 'purcost', 'buyingcostmmk']));
        setColPrice(autoMatchColumn(h, ['sellingprice', 'price', 'saleprice', 'retailprice', 'unitprice', 'sale', 'sellingpricemmk']));
        setColQty(autoMatchColumn(h, ['qty', 'quantity', 'stock', 'balance', 'instock', 'currentstock', 'onhand', 'stockquantityunits', 'stockqty', 'units']));
        setColBrand(autoMatchColumn(h, ['brand', 'manufacturer', 'make']));
        setColModel(autoMatchColumn(h, ['model', 'modelno']));
        setColWarranty(autoMatchColumn(h, ['warranty', 'guarantee']));
        setColSupplier(autoMatchColumn(h, ['supplier', 'vendor']));
        setColSerial(autoMatchColumn(h, ['imei', 'serial', 'serialnumber', 'serials']));

        setStep('map');
      };
      reader.readAsText(selectedFile);
    }
  };

  // Download Sample Template for iStock & Excel
  const handleDownloadSample = () => {
    const sampleHeaders = [
      'Item Code / Barcode',
      'Item Name',
      'Category',
      'Brand',
      'Model',
      'Buying Cost (MMK)',
      'Selling Price (MMK)',
      'Opening Stock Qty',
      'Warranty',
      'Supplier',
      'IMEI / Serials'
    ];

    const sampleRows = [
      ['100001', 'iPhone 15 Pro Max (256GB, Natural Titanium)', 'Smartphones & Tablets', 'Apple', 'A3106', '3850000', '4200000', '5', '1 Year Official', 'Apple Direct HQ', '356891102938471, 356891102938472'],
      ['100002', 'Samsung Galaxy S24 Ultra (512GB, Titanium Gray)', 'Smartphones & Tablets', 'Samsung', 'SM-S928B', '3600000', '3950000', '4', '1 Year Official', 'Samsung Authorized', ''],
      ['200001', 'MacBook Air M3 (13-inch, 16GB, 512GB SSD)', 'Laptops & Computers', 'Apple', 'MRX43LL/A', '3250000', '3550000', '3', '1 Year Official', 'Apple Direct HQ', ''],
      ['300001', 'Anker 737 Power Bank (PowerCore 24K, 140W)', 'Accessories & Gadgets', 'Anker', 'A1289', '280000', '340000', '15', '18 Months Shop', 'Anker Myanmar Official', ''],
      ['500001', 'iPhone 14 Pro OLED Screen Assembly (Original Pull)', 'Service Spare Part', 'Apple', 'OEM Part', '480000', '650000', '8', '30 Days Testing', 'Shenzhen Tech Spare', '']
    ];

    const csvContent = [
      sampleHeaders.join(','),
      ...sampleRows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iStock_Excel_Inventory_Sample_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert raw row to InventoryItem preview
  const parsedPreviewItems = useMemo(() => {
    if (colName === -1 || csvRows.length === 0) return [];

    return csvRows.map((row, idx) => {
      const name = (row[colName] || '').trim();
      const sku = colSku !== -1 && row[colSku] ? row[colSku].trim() : '';
      
      // Parse category
      let rawCat = colCategory !== -1 && row[colCategory] ? row[colCategory].trim() : '';
      let category: InventoryCategory = 'Accessories & Gadgets';
      const lowerCat = rawCat.toLowerCase();
      if (lowerCat.includes('phone') || lowerCat.includes('tablet') || lowerCat.includes('smartphone') || lowerCat.includes('mobile')) {
        category = 'Smartphones & Tablets';
      } else if (lowerCat.includes('laptop') || lowerCat.includes('computer') || lowerCat.includes('pc') || lowerCat.includes('macbook')) {
        category = 'Laptops & Computers';
      } else if (lowerCat.includes('spare') || lowerCat.includes('part') || lowerCat.includes('screen') || lowerCat.includes('battery')) {
        category = 'Service Spare Part';
      } else if (lowerCat.includes('service') || lowerCat.includes('labor') || lowerCat.includes('charge')) {
        category = 'Service Charges';
      } else if (lowerCat.includes('access') || lowerCat.includes('gadget') || lowerCat.includes('case') || lowerCat.includes('charger')) {
        category = 'Accessories & Gadgets';
      }

      // Brand
      let brand = colBrand !== -1 && row[colBrand] ? row[colBrand].trim() : detectBrandFromName(name);
      if (!brand) brand = 'General';

      // Clean Numeric values (removing currency signs, commas, spaces)
      const parseNum = (val: string | undefined): number => {
        if (!val) return 0;
        const cleaned = val.replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return isNaN(n) ? 0 : Math.max(0, n);
      };

      const costPrice = colCost !== -1 ? parseNum(row[colCost]) : 0;
      const sellingPrice = colPrice !== -1 ? parseNum(row[colPrice]) : 0;
      const qty = colQty !== -1 ? Math.round(parseNum(row[colQty])) : 1;
      const model = colModel !== -1 && row[colModel] ? row[colModel].trim() : 'Standard';
      const rawWarranty = colWarranty !== -1 && row[colWarranty] ? row[colWarranty].trim() : '';
      const warranty = resolveItemWarranty(sku, brand, category, name, rawWarranty, '1 Year Official');
      const supplier = colSupplier !== -1 && row[colSupplier] ? row[colSupplier].trim() : 'General Supplier';
      const imeiOrSerial = colSerial !== -1 && row[colSerial] ? row[colSerial].trim() : '';

      // Check if item already exists in existing inventory
      const existing = inventory.find(
        it => {
          const s1 = (sku || '').trim().toLowerCase();
          const s2 = (it.sku || '').trim().toLowerCase();
          const n1 = (name || '').trim().toLowerCase();
          const n2 = (it.name || '').trim().toLowerCase();
          if (s1 && s2 && s1 === s2) return true;
          if (n1 && n2 && n1 === n2) return true;
          return false;
        }
      );

      return {
        rowIdx: idx + 1,
        isValid: name.length > 0,
        isExisting: !!existing,
        existingId: existing?.id,
        name,
        sku: sku || existing?.sku || '',
        category,
        brand,
        model,
        costPrice,
        sellingPrice,
        qty,
        warranty,
        supplier,
        imeiOrSerial,
      };
    });
  }, [csvRows, colName, colSku, colCategory, colCost, colPrice, colQty, colBrand, colModel, colWarranty, colSupplier, colSerial, inventory]);

  // Execute Import
  const handleConfirmImport = async () => {
    const validItems = parsedPreviewItems.filter(item => item.isValid);
    if (validItems.length === 0) {
      alert('No valid items found to import.');
      return;
    }

    if (importMode === 'REPLACE') {
      const confirmReplace = window.confirm(
        `⚠️ WARNING: Full Catalog Replacement mode selected!\nThis will replace the existing catalog of ${inventory.length} items with ${validItems.length} items from the CSV file.\n\nAre you sure you want to proceed?`
      );
      if (!confirmReplace) return;
    }

    setIsProcessing(true);

    try {
      let addedCount = 0;
      let updatedCount = 0;
      let workingInventory = [...inventory];

      if (importMode === 'REPLACE') {
        // Build fresh replacement inventory
        const newInventory: InventoryItem[] = validItems.map((item, idx) => {
          const autoSku = item.sku || generateAutoSKU(item.category, workingInventory, [], item.brand, item.name);
          const branchStockMap: { [branchId: string]: number } = {};
          branches.forEach(b => {
            branchStockMap[b.id] = b.id === targetBranchId ? item.qty : 0;
          });

          return {
            id: `item-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            sku: autoSku,
            name: item.name,
            category: item.category,
            brand: item.brand,
            model: item.model,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            minStockAlert: 3,
            warranty: item.warranty,
            supplier: item.supplier,
            imeiOrSerial: item.imeiOrSerial,
            branchStock: branchStockMap,
            totalStock: item.qty,
            lastRestockedDate: new Date().toISOString(),
          };
        });

        if (onBulkReplaceInventory) {
          onBulkReplaceInventory(newInventory);
        } else {
          newInventory.forEach(it => onAddItem(it));
        }

        addedCount = newInventory.length;
      } else {
        // MERGE Mode: Update existing or add new
        for (let i = 0; i < validItems.length; i++) {
          const item = validItems[i];
          const existingIndex = workingInventory.findIndex(
            it => {
              const s1 = (item.sku || '').trim().toLowerCase();
              const s2 = (it.sku || '').trim().toLowerCase();
              const n1 = (item.name || '').trim().toLowerCase();
              const n2 = (it.name || '').trim().toLowerCase();
              if (s1 && s2 && s1 === s2) return true;
              if (n1 && n2 && n1 === n2) return true;
              return false;
            }
          );

          if (existingIndex >= 0) {
            // Update existing product
            const existing = workingInventory[existingIndex];
            const updatedBranchStock = { ...existing.branchStock };
            const currentBranchQty = updatedBranchStock[targetBranchId] || 0;
            // Add imported quantity to target branch
            updatedBranchStock[targetBranchId] = currentBranchQty + item.qty;

            // Recalculate total across all branches
            const totalStock = Object.values(updatedBranchStock).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

            const updatedItem: InventoryItem = {
              ...existing,
              costPrice: item.costPrice > 0 ? item.costPrice : existing.costPrice,
              sellingPrice: item.sellingPrice > 0 ? item.sellingPrice : existing.sellingPrice,
              warranty: item.warranty || existing.warranty,
              supplier: item.supplier || existing.supplier,
              branchStock: updatedBranchStock,
              totalStock,
              lastRestockedDate: new Date().toISOString(),
            };

            workingInventory[existingIndex] = updatedItem;
            onUpdateItem(updatedItem);
            updatedCount++;
          } else {
            // Add new item
            const autoSku = item.sku || generateAutoSKU(item.category, workingInventory, [], item.brand, item.name);
            const branchStockMap: { [branchId: string]: number } = {};
            branches.forEach(b => {
              branchStockMap[b.id] = b.id === targetBranchId ? item.qty : 0;
            });

            const newItem: InventoryItem = {
              id: `item-import-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
              sku: autoSku,
              name: item.name,
              category: item.category,
              brand: item.brand,
              model: item.model,
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice,
              minStockAlert: 3,
              warranty: item.warranty,
              supplier: item.supplier,
              imeiOrSerial: item.imeiOrSerial,
              branchStock: branchStockMap,
              totalStock: item.qty,
              lastRestockedDate: new Date().toISOString(),
            };

            workingInventory.push(newItem);
            onAddItem(newItem);
            addedCount++;
          }
        }
      }

      // Log activity
      if (onLogActivity) {
        onLogActivity({
          user: currentUser.displayName || currentUser.username,
          role: currentUser.role,
          branch: branches.find(b => b.id === targetBranchId)?.name || 'Branch',
          action: `CSV Import (${importMode}): ${addedCount} added, ${updatedCount} updated`,
          type: 'STOCK_IN',
          amount: 0,
        });
      }

      setImportStats({
        total: validItems.length,
        added: addedCount,
        updated: updatedCount,
        error: parsedPreviewItems.length - validItems.length,
      });

      setStep('success');
    } catch (err: any) {
      console.error('Import error:', err);
      alert(`Import failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const targetBranchName = branches.find(b => b.id === targetBranchId)?.name || 'Selected Branch';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'preview') onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>iStock & Excel / CSV Inventory Import</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Fast Catalog Sync
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Import opening stock & product catalogs directly from iStock Myanmar or Microsoft Excel (.csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition text-xs font-semibold cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${step === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              1. Upload File
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${step === 'map' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              2. Match Columns
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${step === 'preview' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              3. Review & Import
            </span>
          </div>

          <button
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
            title="Download CSV sample file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-800 text-xs">

          {/* STEP 1: Upload File */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-indigo-600 mb-3 border border-indigo-100">
                  <Upload className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Click or drag your iStock / Excel (.csv) file here
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Supports comma-separated (.csv) and tab-separated (.tsv) files exported from iStock or created in Excel.
                </p>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv, .tsv, text/csv, text/plain" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }} 
                />
              </div>

              {/* Tips & Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 text-xs">How to export from iStock:</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    1. In your existing <strong>iStock Software</strong>, go to <strong>Inventory / Stock Balance &gt; Export to Excel</strong>.<br />
                    2. Save or export as <strong>CSV (Comma Delimited) (*.csv)</strong>.<br />
                    3. Upload the exported CSV file here. The system will auto-detect columns, SKUs, Buying Costs, Selling Prices, and Stock Quantities.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Match Columns & Target Branch */}
          {step === 'map' && (
            <div className="space-y-5">
              {/* Branch and Mode Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Target Branch for Opening Stock:
                  </label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Quantities from the CSV will be added/allocated to this branch.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Import Strategy:
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="MERGE">Merge & Update (Recommended: Adds new, updates existing)</option>
                    <option value="REPLACE">Full Catalog Replacement (Wipes and replaces all catalog)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {importMode === 'MERGE' 
                      ? 'Matches by SKU or Name: updates prices & adds stock to target branch.' 
                      : '⚠️ Overwrites current catalog completely with CSV contents.'}
                  </p>
                </div>
              </div>

              {/* Column Mapping Selectors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    Verify Column Header Mapping ({csvHeaders.length} headers found in file):
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    File: <span className="font-bold text-slate-700">{file?.name}</span> ({csvRows.length} rows)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                  {/* Name (Required) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Product Name <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      value={colName}
                      onChange={(e) => setColName(parseInt(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${colName === -1 ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-300 bg-white'}`}
                    >
                      <option value={-1}>-- Select Column --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKU / Barcode */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      SKU / Barcode / Code:
                    </label>
                    <select
                      value={colSku}
                      onChange={(e) => setColSku(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Auto-generate (None) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category / Group:
                    </label>
                    <select
                      value={colCategory}
                      onChange={(e) => setColCategory(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Auto-detect from Name --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Buying Cost (MMK):
                    </label>
                    <select
                      value={colCost}
                      onChange={(e) => setColCost(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- None (0 MMK) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Selling Price (MMK):
                    </label>
                    <select
                      value={colPrice}
                      onChange={(e) => setColPrice(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- None (0 MMK) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Stock Quantity:
                    </label>
                    <select
                      value={colQty}
                      onChange={(e) => setColQty(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Default (1 qty) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Brand / Make:
                    </label>
                    <select
                      value={colBrand}
                      onChange={(e) => setColBrand(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Auto-detect from Name --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Warranty */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Warranty:
                    </label>
                    <select
                      value={colWarranty}
                      onChange={(e) => setColWarranty(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Default (1 Year Official) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Supplier / Vendor:
                    </label>
                    <select
                      value={colSupplier}
                      onChange={(e) => setColSupplier(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                    >
                      <option value={-1}>-- Default (General Supplier) --</option>
                      {csvHeaders.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {colName === -1 && (
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Please select which column contains the Product Name before proceeding.
                </p>
              )}
            </div>
          )}

          {/* STEP 3: Preview Table */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500 font-bold">Total Rows</div>
                  <div className="text-lg font-black text-slate-900">{parsedPreviewItems.length}</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="text-[11px] text-emerald-700 font-bold">New Products</div>
                  <div className="text-lg font-black text-emerald-700">
                    {parsedPreviewItems.filter(it => it.isValid && !it.isExisting).length}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-[11px] text-blue-700 font-bold">Existing to Update</div>
                  <div className="text-lg font-black text-blue-700">
                    {parsedPreviewItems.filter(it => it.isValid && it.isExisting).length}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div className="text-[11px] text-purple-700 font-bold">Destination Branch</div>
                  <div className="text-xs font-black text-purple-900 truncate mt-1">
                    {targetBranchName}
                  </div>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">SKU / Code</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Cost (MMK)</th>
                        <th className="py-2 px-3 text-right">Price (MMK)</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreviewItems.slice(0, 50).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3 text-slate-400">{it.rowIdx}</td>
                          <td className="py-2 px-3">
                            {!it.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                Invalid Name
                              </span>
                            ) : it.isExisting ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                Update Existing
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                + New Item
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">{it.sku || '<Auto>'}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 max-w-xs truncate">{it.name}</td>
                          <td className="py-2 px-3 text-slate-600">{it.category}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatNumber(it.costPrice)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatNumber(it.sellingPrice)}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-indigo-700">+{it.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedPreviewItems.length > 50 && (
                  <div className="bg-slate-50 px-4 py-2 text-center text-slate-500 text-[11px] border-t border-slate-200">
                    Showing first 50 items. Total of {parsedPreviewItems.length} items will be processed.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Success Message */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Inventory Import Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  The stock items have been successfully synchronized into the system.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[11px] text-slate-500">Total Processed</div>
                  <div className="text-base font-black text-slate-900">{importStats.total}</div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-600 font-bold">New Items Added</div>
                  <div className="text-base font-black text-emerald-600">+{importStats.added}</div>
                </div>
                <div>
                  <div className="text-[11px] text-blue-600 font-bold">Updated Existing</div>
                  <div className="text-base font-black text-blue-600">{importStats.updated}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step === 'upload' && (
            <div className="text-slate-500 text-xs">
              Upload a .csv file exported from iStock to begin.
            </div>
          )}

          {step === 'map' && (
            <button
              onClick={() => setStep('upload')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Back to Upload
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={() => setStep('map')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Back to Mapping
            </button>
          )}

          {step === 'success' && (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
              >
                Close & View Inventory
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {step === 'map' && (
              <button
                disabled={colName === -1}
                onClick={() => setStep('preview')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <span>Preview Import Data</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 'preview' && (
              <button
                disabled={isProcessing || parsedPreviewItems.filter(it => it.isValid).length === 0}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing Inventory...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Confirm & Import ({parsedPreviewItems.filter(it => it.isValid).length} items)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
