import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle,
  Tag,
  Layers,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Search,
  Check,
} from 'lucide-react';
import { InventoryCategory } from '../types';
import {
  BrandSKUConfig,
  getAllBrandSKUConfigs,
  saveCustomBrandSKUConfig,
  deleteCustomBrandSKUConfig,
  resetBrandSKUConfigs,
  PRIMARY_INVENTORY_CATEGORIES,
} from '../utils/skuGenerator';

interface SkuStandardManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: InventoryCategory;
  onSelectStandard?: (config: BrandSKUConfig) => void;
}

const CATEGORY_TABS: { id: string; label: string; category: InventoryCategory | 'All'; icon: string }[] = [
  { id: 'all', label: 'All Categories', category: 'All', icon: '🌐' },
  { id: 'mobile', label: 'Mobile (Smartphones & Tablets)', category: 'Smartphones & Tablets', icon: '📱' },
  { id: 'laptop', label: 'Laptop (Laptops & Computers)', category: 'Laptops & Computers', icon: '💻' },
  { id: 'accessories', label: 'Accessories & Gadgets', category: 'Accessories & Gadgets', icon: '🎧' },
  { id: 'spare', label: 'Spare Parts (Service)', category: 'Service Spare Part', icon: '🔧' },
  { id: 'service', label: 'Service Charges', category: 'Service Charges', icon: '⚡' },
];

export const SkuStandardManagerModal: React.FC<SkuStandardManagerModalProps> = ({
  isOpen,
  onClose,
  defaultCategory,
  onSelectStandard,
}) => {
  const [configs, setConfigs] = useState<BrandSKUConfig[]>(() => getAllBrandSKUConfigs());
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (defaultCategory === 'Laptops & Computers') return 'laptop';
    if (defaultCategory === 'Accessories & Gadgets') return 'accessories';
    if (defaultCategory === 'Service Spare Part') return 'spare';
    if (defaultCategory === 'Service Charges') return 'service';
    if (defaultCategory === 'Smartphones & Tablets') return 'mobile';
    return 'all';
  });

  // New Standard Form state
  const [formCategory, setFormCategory] = useState<InventoryCategory>(
    defaultCategory || 'Smartphones & Tablets'
  );
  const [formBrand, setFormBrand] = useState('');
  const [formPrefix, setFormPrefix] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfigs(getAllBrandSKUConfigs());
      if (defaultCategory) {
        setFormCategory(defaultCategory);
        if (defaultCategory === 'Laptops & Computers') setSelectedTab('laptop');
        else if (defaultCategory === 'Accessories & Gadgets') setSelectedTab('accessories');
        else if (defaultCategory === 'Service Spare Part') setSelectedTab('spare');
        else if (defaultCategory === 'Service Charges') setSelectedTab('service');
        else if (defaultCategory === 'Smartphones & Tablets') setSelectedTab('mobile');
      }
    }
  }, [isOpen, defaultCategory]);

  useEffect(() => {
    const handleUpdate = () => {
      setConfigs(getAllBrandSKUConfigs());
    };
    window.addEventListener('sktg_sku_standards_updated', handleUpdate);
    return () => window.removeEventListener('sktg_sku_standards_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const currentTabObj = CATEGORY_TABS.find((t) => t.id === selectedTab);
  const targetCategory = currentTabObj ? currentTabObj.category : 'All';

  const filteredConfigs = configs.filter((c) => {
    const matchCategory = targetCategory === 'All' || c.category === targetCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCategory;
    const matchSearch =
      c.brand.toLowerCase().includes(q) ||
      c.prefix.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanBrand = formBrand.trim();
    const cleanPrefix = formPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanBrand || !cleanPrefix) {
      setFeedback({ type: 'error', message: 'Please enter both Brand Name and SKU Prefix Code.' });
      return;
    }

    if (cleanPrefix.length < 1 || cleanPrefix.length > 6) {
      setFeedback({ type: 'error', message: 'Prefix Code must be between 1 and 6 characters (e.g. SS, HN, DL).' });
      return;
    }

    const aliasesList = formAliases
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);

    const res = saveCustomBrandSKUConfig({
      brand: cleanBrand,
      prefix: cleanPrefix,
      category: formCategory,
      aliases: aliasesList.length > 0 ? aliasesList : [cleanBrand.toLowerCase()],
    });

    if (res.success) {
      setConfigs(getAllBrandSKUConfigs());
      setFeedback({
        type: 'success',
        message: `✅ "${cleanBrand} (${cleanPrefix})" SKU Code Standard saved successfully!`,
      });
      setFormBrand('');
      setFormPrefix('');
      setFormAliases('');

      // Auto-select tab
      if (formCategory === 'Smartphones & Tablets') setSelectedTab('mobile');
      else if (formCategory === 'Laptops & Computers') setSelectedTab('laptop');
      else if (formCategory === 'Accessories & Gadgets') setSelectedTab('accessories');
      else if (formCategory === 'Service Spare Part') setSelectedTab('spare');
      else if (formCategory === 'Service Charges') setSelectedTab('service');

      if (onSelectStandard) {
        onSelectStandard(res.config);
      }
    } else {
      setFeedback({ type: 'error', message: 'Error saving SKU Code Standard.' });
    }
  };

  const handleDelete = (prefix: string, brand: string) => {
    if (window.confirm(`Are you sure you want to delete SKU standard "${brand} (${prefix})"?`)) {
      deleteCustomBrandSKUConfig(prefix, brand);
      setConfigs(getAllBrandSKUConfigs());
      setFeedback({ type: 'success', message: `🗑️ Removed "${brand}" SKU standard.` });
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all SKU Code Standards to default presets? Custom codes will be removed.')) {
      resetBrandSKUConfigs();
      setConfigs(getAllBrandSKUConfigs());
      setFeedback({ type: 'success', message: '🔄 Reset Brand SKU Standards to default presets.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Tag className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>Brand & SKU Code Standards</span>
                <span className="text-[11px] bg-purple-500/40 text-purple-100 font-normal px-2 py-0.5 rounded-full border border-purple-300/30">
                  Category SKU Prefixes
                </span>
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                Manage automated SKU prefix code rules across Mobile, Laptop, Accessories, and Spare Parts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Form to Add New Brand SKU Standard */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-xs sm:text-sm text-purple-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-700" />
                <span>Add New Brand / Item Code Standard</span>
              </h4>
              <span className="text-[11px] text-purple-700 font-medium">
                Auto Format: <strong className="font-mono">{formPrefix ? `${formPrefix.toUpperCase()}0001` : 'PRE0001'}</strong>
              </span>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category Selection */}
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as InventoryCategory)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    {PRIMARY_INVENTORY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'Smartphones & Tablets' && '📱 Mobile (Smartphones & Tablets)'}
                        {cat === 'Laptops & Computers' && '💻 Laptop (Laptops & Computers)'}
                        {cat === 'Accessories & Gadgets' && '🎧 Accessories & Gadgets'}
                        {cat === 'Service Spare Part' && '🔧 Service Spare Part'}
                        {cat === 'Service Charges' && '⚡ Service Charges'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand / Item Name */}
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1">
                    Brand / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook, Dell, Anker, Power Bank"
                    value={formBrand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormBrand(val);
                      // Auto suggest prefix if empty
                      if (!formPrefix && val.trim().length >= 2) {
                        const letters = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        if (letters.length >= 2) {
                          setFormPrefix(letters.slice(0, 3));
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Prefix Code */}
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1">
                    SKU Prefix Code *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. MB, DL, AK, PB"
                      value={formPrefix}
                      onChange={(e) =>
                        setFormPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                      }
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-mono font-bold text-purple-900 focus:outline-hidden focus:ring-2 focus:ring-purple-400 uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Code</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Search Aliases */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="text-slate-600 font-medium shrink-0">Auto-Detect Keywords (Optional):</span>
                <input
                  type="text"
                  placeholder="Comma-separated aliases - e.g. macbook pro, apple mac, m1, m2, m3"
                  value={formAliases}
                  onChange={(e) => setFormAliases(e.target.value)}
                  className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 focus:outline-hidden"
                />
              </div>
            </form>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = selectedTab === tab.id;
                  const count = configs.filter(
                    (c) => tab.category === 'All' || c.category === tab.category
                  ).length;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-purple-900 text-white shadow-xs ring-2 ring-purple-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-800 border border-slate-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label.split('(')[0].trim()}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code / brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-purple-400"
                />
              </div>
            </div>

            {/* Grid of Brand Code Standard Cards */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-[340px] overflow-y-auto">
              {filteredConfigs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Tag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No SKU Code Standards found for this category</p>
                  <p className="text-[11px] mt-1 text-purple-700">You can add a new standard using the form above</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredConfigs.map((cfg) => {
                    return (
                      <div
                        key={`${cfg.category}_${cfg.prefix}_${cfg.brand}`}
                        className="bg-white border border-slate-200 hover:border-purple-300 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 block truncate" title={cfg.brand}>
                              {cfg.brand}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {cfg.category}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                            {cfg.prefix}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-auto">
                          <span className="text-[10px] font-mono text-slate-500">
                            e.g. <strong className="text-purple-700 font-bold">{cfg.prefix}0001</strong>
                          </span>

                          <div className="flex items-center gap-1">
                            {onSelectStandard && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectStandard(cfg);
                                  onClose();
                                }}
                                className="p-1 rounded bg-purple-50 hover:bg-purple-700 text-purple-700 hover:text-white transition-colors cursor-pointer text-[10px] font-bold px-1.5"
                                title="Use this standard"
                              >
                                Select
                              </button>
                            )}
                            {cfg.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDelete(cfg.prefix, cfg.brand)}
                                className="p-1 rounded text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete custom standard"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-rose-700 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Reset to initial default presets"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standards to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
