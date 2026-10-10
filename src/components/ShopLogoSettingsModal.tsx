import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Check, 
  RotateCcw, 
  X, 
  Settings, 
  Save, 
  Store, 
  Trash2,
  Eye,
  Sliders,
  Sparkles,
  MapPin,
  Phone,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ShweKyalTagonBadgeLogo } from './ShweKyalTagonLogo';
import { 
  System2BadgeLogo, 
  getSystem2CustomLogo, 
  getSystem2Address, 
  getSystem2Phone,
  SYSTEM2_CUSTOM_LOGO_KEY,
  SYSTEM2_ADDRESS_KEY,
  SYSTEM2_PHONE_KEY,
  SYSTEM2_DEFAULT_ADDRESS,
  SYSTEM2_DEFAULT_PHONE 
} from './System2Logo';
import { ensureMyanmarUnicode } from '../utils/myanmarFontHelper';
import { 
  saveSystem2SettingsToAllStores, 
  saveMainLogoToAllStores, 
  optimizeLogoImage,
  safeLocalStorageSet,
  SHOW_LOGO_STORAGE_KEY,
  VOUCHER_BRANCHES_KEY,
  CUSTOM_LOGO_STORAGE_KEY,
  GLOBAL_APP_LOGO_KEY,
  VoucherBranch,
  VERIFIED_DEFAULT_VOUCHER_BRANCHES,
  cleanAndSanitizeVoucherBranches,
  getSavedVoucherBranches,
  saveVoucherBranchesToAllStores
} from '../utils/logoStorage';
export { 
  SHOW_LOGO_STORAGE_KEY,
  VOUCHER_BRANCHES_KEY,
  CUSTOM_LOGO_STORAGE_KEY,
  GLOBAL_APP_LOGO_KEY,
  cleanAndSanitizeVoucherBranches,
  getSavedVoucherBranches,
  saveVoucherBranchesToAllStores
};
export type { VoucherBranch };

export const DEFAULT_VOUCHER_BRANCHES: VoucherBranch[] = VERIFIED_DEFAULT_VOUCHER_BRANCHES;

export function getSavedCustomLogo(): string {
  try {
    return localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY) || localStorage.getItem(GLOBAL_APP_LOGO_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomLogoGlobally(dataUrl: string): void {
  saveMainLogoToAllStores(dataUrl, true);
}

interface ShopLogoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'logo' | 'branches' | 'system2';
  onLogoUpdated?: (newLogoUrl: string) => void;
  onBranchesUpdated?: (newBranches: VoucherBranch[]) => void;
}

export const ShopLogoSettingsModal: React.FC<ShopLogoSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'logo',
  onLogoUpdated,
  onBranchesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'logo' | 'branches' | 'system2'>(initialTab);
  
  // Logo State (Shwe Kyal Tagon)
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(getSavedCustomLogo);
  const [showLogo, setShowLogo] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [rawUploadedDataUrl, setRawUploadedDataUrl] = useState<string>('');
  const [autoTrim, setAutoTrim] = useState<boolean>(true);
  const [paddingPx, setPaddingPx] = useState<number>(4);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');
  const [isSavingLogo, setIsSavingLogo] = useState<boolean>(false);
  const [isSavingBranches, setIsSavingBranches] = useState<boolean>(false);
  const [isSavingSystem2, setIsSavingSystem2] = useState<boolean>(false);
  const [isProcessingImg, setIsProcessingImg] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const system2FileInputRef = useRef<HTMLInputElement>(null);

  // System II State
  const [system2Address, setSystem2Address] = useState<string>(getSystem2Address);
  const [system2Phone, setSystem2Phone] = useState<string>(getSystem2Phone);
  const [system2Logo, setSystem2Logo] = useState<string>(getSystem2CustomLogo);
  const [system2RawUploadedDataUrl, setSystem2RawUploadedDataUrl] = useState<string>('');
  const [system2AutoTrim, setSystem2AutoTrim] = useState<boolean>(true);
  const [system2PaddingPx, setSystem2PaddingPx] = useState<number>(4);

  // Branches State
  const [branches, setBranches] = useState<VoucherBranch[]>(getSavedVoucherBranches);

  useEffect(() => {
    if (isOpen) {
      setCustomLogoUrl(getSavedCustomLogo());
      try {
        setShowLogo(localStorage.getItem(SHOW_LOGO_STORAGE_KEY) !== 'false');
      } catch {
        setShowLogo(true);
      }
      setSystem2Address(getSystem2Address());
      setSystem2Phone(getSystem2Phone());
      setSystem2Logo(getSystem2CustomLogo());
      setBranches(getSavedVoucherBranches());
      setSaveSuccessMsg('');
      setSaveErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    setSaveErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawResult = event.target?.result as string;
        if (!rawResult) {
          setIsProcessingImg(false);
          return;
        }
        setRawUploadedDataUrl(rawResult);
        const optimized = await optimizeLogoImage(rawResult, {
          maxWidth: 1400,
          maxHeight: 600,
          shouldTrim: autoTrim,
          trimWhite: true,
          pad: paddingPx,
        });
        setCustomLogoUrl(optimized);
        setIsProcessingImg(false);
        setSaveSuccessMsg('Logo image selected. Click "Save Logo Permanently" to confirm.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsProcessingImg(false);
      setSaveErrorMsg('Error reading image file');
    }
  };

  const handleToggleAutoTrim = async (checked: boolean) => {
    setAutoTrim(checked);
    const source = rawUploadedDataUrl || customLogoUrl;
    if (source) {
      setIsProcessingImg(true);
      const optimized = await optimizeLogoImage(source, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: checked,
        trimWhite: true,
        pad: paddingPx,
      });
      setCustomLogoUrl(optimized);
      setIsProcessingImg(false);
    }
  };

  const handlePaddingChange = async (val: number) => {
    setPaddingPx(val);
    const source = rawUploadedDataUrl || customLogoUrl;
    if (source && autoTrim) {
      const optimized = await optimizeLogoImage(source, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: true,
        trimWhite: true,
        pad: val,
      });
      setCustomLogoUrl(optimized);
    }
  };

  const handleSaveLogo = async () => {
    setIsSavingLogo(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const res = await saveMainLogoToAllStores(customLogoUrl, showLogo);
      if (res.success) {
        if (onLogoUpdated) onLogoUpdated(customLogoUrl);
        setSaveSuccessMsg('Logo saved successfully. Applied across all vouchers and the system.');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveErrorMsg(res.error || 'Error saving logo');
      }
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Error saving logo');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleResetToDefaultLogo = async () => {
    setIsSavingLogo(true);
    setSaveErrorMsg('');
    setCustomLogoUrl('');
    setRawUploadedDataUrl('');
    await saveMainLogoToAllStores('', showLogo);
    if (onLogoUpdated) onLogoUpdated('');
    setIsSavingLogo(false);
    setSaveSuccessMsg('Successfully restored to default vector logo design.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveBranches = async () => {
    setIsSavingBranches(true);
    setSaveErrorMsg('');
    try {
      const cleaned = cleanAndSanitizeVoucherBranches(branches);
      const res = await saveVoucherBranchesToAllStores(cleaned);
      if (res.success) {
        setBranches(cleaned);
        if (onBranchesUpdated) onBranchesUpdated(cleaned);
        setSaveSuccessMsg('Branch information saved successfully.');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      } else {
        setSaveErrorMsg(res.error || 'Error saving branch information');
      }
    } catch (err: any) {
      setSaveErrorMsg('Error saving branch information');
    } finally {
      setIsSavingBranches(false);
    }
  };

  const handleResetBranches = async () => {
    setIsSavingBranches(true);
    setSaveErrorMsg('');
    try {
      await saveVoucherBranchesToAllStores(DEFAULT_VOUCHER_BRANCHES);
      setBranches([...DEFAULT_VOUCHER_BRANCHES]);
      if (onBranchesUpdated) onBranchesUpdated(DEFAULT_VOUCHER_BRANCHES);
      setSaveSuccessMsg('Branch addresses restored to defaults.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err: any) {
      setSaveErrorMsg('Error resetting branch information');
    } finally {
      setIsSavingBranches(false);
    }
  };

  // System II Handlers
  const handleSaveSystem2 = async () => {
    setIsSavingSystem2(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const res = await saveSystem2SettingsToAllStores(
        system2Address,
        system2Phone,
        system2Logo
      );
      if (res.success) {
        setSaveSuccessMsg('System II info and logo saved successfully.');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveErrorMsg(res.error || 'Error saving System II info');
      }
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Error saving System II info');
    } finally {
      setIsSavingSystem2(false);
    }
  };

  const handleResetSystem2 = async () => {
    setIsSavingSystem2(true);
    setSaveErrorMsg('');
    setSystem2Address(SYSTEM2_DEFAULT_ADDRESS);
    setSystem2Phone(SYSTEM2_DEFAULT_PHONE);
    setSystem2Logo('/system2-logo.svg');
    setSystem2RawUploadedDataUrl('');
    await saveSystem2SettingsToAllStores(
      SYSTEM2_DEFAULT_ADDRESS,
      SYSTEM2_DEFAULT_PHONE,
      '/system2-logo.svg'
    );
    setIsSavingSystem2(false);
    setSaveSuccessMsg('System II info restored to defaults.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSystem2FileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingImg(true);
    setSaveErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawResult = event.target?.result as string;
        if (!rawResult) {
          setIsProcessingImg(false);
          return;
        }
        setSystem2RawUploadedDataUrl(rawResult);
        const optimized = await optimizeLogoImage(rawResult, {
          maxWidth: 1400,
          maxHeight: 600,
          shouldTrim: system2AutoTrim,
          trimWhite: true,
          pad: system2PaddingPx,
        });
        setSystem2Logo(optimized);
        setIsProcessingImg(false);
        setSaveSuccessMsg('New System II logo selected. Click "Save System II" to confirm.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsProcessingImg(false);
      setSaveErrorMsg('System II Error reading image file');
    }
  };

  const handleToggleSystem2AutoTrim = async (checked: boolean) => {
    setSystem2AutoTrim(checked);
    const source = system2RawUploadedDataUrl || system2Logo;
    if (source && source !== '/system2-logo.svg') {
      setIsProcessingImg(true);
      const optimized = await optimizeLogoImage(source, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: checked,
        trimWhite: true,
        pad: system2PaddingPx,
      });
      setSystem2Logo(optimized);
      setIsProcessingImg(false);
    }
  };

  const handleSystem2PaddingChange = async (val: number) => {
    setSystem2PaddingPx(val);
    const source = system2RawUploadedDataUrl || system2Logo;
    if (source && source !== '/system2-logo.svg' && system2AutoTrim) {
      const optimized = await optimizeLogoImage(source, {
        maxWidth: 1400,
        maxHeight: 600,
        shouldTrim: true,
        trimWhite: true,
        pad: val,
      });
      setSystem2Logo(optimized);
    }
  };

  const handleResetSystem2LogoOnly = async () => {
    setSystem2Logo('/system2-logo.svg');
    setSystem2RawUploadedDataUrl('');
    await saveSystem2SettingsToAllStores(system2Address, system2Phone, '/system2-logo.svg');
    setSaveSuccessMsg('System II logo restored to default vector design.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800/90 px-4 py-3.5 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Shop Logo & Branch Profile Management
              </h3>
              <p className="text-[11px] text-slate-400">
                Configured once here, updates automatically reflect on all vouchers and invoices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 bg-slate-800/50 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logo'
                ? 'border-purple-500 text-purple-300 bg-purple-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Logo Settings / Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'branches'
                ? 'border-amber-500 text-amber-300 bg-amber-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Branch Addresses & Contacts</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system2')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'system2'
                ? 'border-blue-500 text-blue-300 bg-blue-950/30 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>System II Letterhead</span>
          </button>
        </div>

        {/* Notification message */}
        {saveSuccessMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-emerald-900/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn shrink-0">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'logo' ? (
            <div className="space-y-4">
              {/* File Upload Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600/30 group-hover:bg-purple-600/50 border border-purple-500/40 flex items-center justify-center text-purple-300 transition-colors">
                  <Upload className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-purple-200">
                    Click to select and upload Logo PNG (watermark_transparent.png)
                  </p>
                  <p className="text-[11px] text-purple-400/80 mt-0.5">
                    Supports PNG, JPG, SVG files (Transparent PNG recommended)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Advanced Crop / Trim Options */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    Auto-Fit &amp; Transparent Border Trimming
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={autoTrim}
                      onChange={(e) => handleToggleAutoTrim(e.target.checked)}
                      className="rounded accent-purple-500"
                    />
                    <span>Auto-crop transparent padding</span>
                  </label>
                </div>

                {autoTrim && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-700/60">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Padding adjustment: {paddingPx}px
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      value={paddingPx}
                      onChange={(e) => handlePaddingChange(Number(e.target.value))}
                      className="flex-1 accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview on Voucher Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Live Voucher Preview
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {customLogoUrl ? '⭐ Custom Uploaded Logo Active' : 'ℹ️ Default Vector Logo Active'}
                  </span>
                </div>

                {/* Simulated Voucher Header Card - Displays REAL branch addresses & phone numbers */}
                <div 
                  className="w-full p-2 sm:p-2.5 rounded-xl border border-purple-300 bg-[#faf5ff] shadow-sm text-slate-900 overflow-hidden"
                  style={{
                    fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Left Block: Logo Preview enlarged +0.5cm */}
                    <div className="shrink-0 flex items-center justify-center text-center pr-2 border-r border-purple-200/80 w-[118px] sm:w-[126px] min-w-[112px] max-w-[130px] my-auto">
                      {showLogo ? (
                        customLogoUrl ? (
                          <img
                            src={customLogoUrl}
                            alt="Shop Logo Preview"
                            className="w-full h-auto max-h-[54px] sm:max-h-[60px] object-contain drop-shadow-xs"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                        ) : (
                          <ShweKyalTagonBadgeLogo forceDefault className="w-full h-auto drop-shadow-2xs" />
                        )
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Logo is hidden</span>
                      )}
                    </div>

                    {/* Right Block: Real 3 Branch Capsules with Full Address and Phone Numbers */}
                    <div className="flex-1 flex flex-col justify-between space-y-1 py-0 min-w-0 pl-0.5 pr-0.5">
                      {branches.map((br, bIdx) => (
                        <div 
                          key={bIdx}
                          className="rounded-lg border border-purple-200/90 overflow-hidden flex items-stretch bg-white shadow-2xs"
                        >
                          {/* Vibrant Purple Badge Pill */}
                          <div 
                            className="w-[48px] sm:w-[54px] shrink-0 bg-[#7e22ce] text-white flex items-center justify-center font-bold text-[7px] sm:text-[7.6px] border-r border-purple-200/80 px-1 py-0.5 select-none text-center whitespace-nowrap"
                            style={{
                              fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                              lineHeight: '1.35',
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

                          {/* Real Address and Phone Number Content */}
                          <div className="flex-1 px-1.5 py-0.5 flex flex-col justify-center bg-white min-w-0">
                            {/* Line 1: Orange Location Pin + Full Address */}
                            <div className="flex items-center gap-1 text-slate-900 min-w-0">
                              <MapPin className="w-2.5 h-2.5 text-[#ea580c] shrink-0 fill-[#ea580c]/15" />
                              <span 
                                className="text-[6.6px] sm:text-[7.2px] font-bold text-slate-900 whitespace-nowrap tracking-tight"
                                style={{
                                  fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                                  lineHeight: '1.5',
                                }}
                              >
                                {ensureMyanmarUnicode(br.address)}
                              </span>
                            </div>

                            {/* Line 2: Orange Phone Icon + Phone label and number */}
                            <div className="flex items-center gap-1 pl-3 text-slate-900 min-w-0">
                              <Phone className="w-2 h-2 text-[#ea580c] shrink-0 fill-[#ea580c]/15" />
                              <span className="font-bold text-[#581c87] text-[6.6px] sm:text-[7.2px] shrink-0 font-sans" style={{ lineHeight: '1.3' }}>
                                Phone :
                              </span>
                              <span className="text-slate-950 font-mono font-bold tracking-tight text-[7px] sm:text-[7.6px] whitespace-nowrap" style={{ lineHeight: '1.3' }}>
                                {br.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'branches' ? (
            /* Branches Tab */
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Customize names, addresses, and phone numbers of branches printed on voucher headers.
              </p>
              {branches.map((br, idx) => (
                <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      Branch #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={br.badge}
                      onChange={(e) => {
                        const updated = [...branches];
                        updated[idx].badge = e.target.value;
                        setBranches(updated);
                      }}
                      placeholder="Badge (e.g. Branch 1)"
                      className="px-2 py-0.5 bg-slate-900 border border-slate-600 rounded text-white text-xs w-32 text-right focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10.5px] text-slate-400 mb-0.5">Branch Address</label>
                      <input
                        type="text"
                        value={br.address}
                        onChange={(e) => {
                          const updated = [...branches];
                          updated[idx].address = e.target.value;
                          setBranches(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] text-slate-400 mb-0.5">Phone Number</label>
                      <input
                        type="text"
                        value={br.phone}
                        onChange={(e) => {
                          const updated = [...branches];
                          updated[idx].phone = e.target.value;
                          setBranches(updated);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded text-white text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* System II Tab */
            <div className="space-y-4">
              {/* Info banner */}
              <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl text-blue-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">System II Branch Letterhead Design & Logo Management</p>
                  <p className="text-[11px] text-blue-300/90 mt-0.5 leading-relaxed">
                    When System II is selected as branch during checkout, this System II logo and address will be used.',
                  </p>
                </div>
              </div>

              {/* Dedicated Custom Logo Upload Zone */}
              <div 
                onClick={() => system2FileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-950/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-600/30 group-hover:bg-blue-600/50 border border-blue-500/40 flex items-center justify-center text-blue-300 transition-colors">
                  <Upload className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-blue-200">
                    Click to select and upload System II custom logo
                  </p>
                  <p className="text-[11px] text-blue-300/80 mt-0.5">
                    Supports PNG, JPG, SVG, WebP (Transparent PNG recommended)
                  </p>
                </div>
                <input
                  ref={system2FileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSystem2FileUpload}
                  className="hidden"
                />
              </div>

              {/* Advanced Crop / Trim Options for System II */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    Auto-Fit &amp; Transparent Border Trimming
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={system2AutoTrim}
                      onChange={(e) => handleToggleSystem2AutoTrim(e.target.checked)}
                      className="rounded accent-blue-500"
                    />
                    <span>Auto-crop transparent padding</span>
                  </label>
                </div>

                {system2AutoTrim && (
                  <div className="flex items-center gap-3 pt-1 border-t border-slate-700/60">
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Padding adjustment: {system2PaddingPx}px
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      value={system2PaddingPx}
                      onChange={(e) => handleSystem2PaddingChange(Number(e.target.value))}
                      className="flex-1 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview of System II Letterhead */}
              <div className="p-3 bg-slate-950 border border-slate-700 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Letterhead Sample (Live Preview)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-blue-400 font-mono">
                      {system2Logo && system2Logo !== '/system2-logo.svg' ? '⭐ Custom Uploaded Logo Active' : 'ℹ️ Default Vector Logo Active'}
                    </span>
                    {system2Logo && system2Logo !== '/system2-logo.svg' && (
                      <button
                        type="button"
                        onClick={handleResetSystem2LogoOnly}
                        className="text-[10px] text-rose-300 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        title="Reset to default vector logo"
                      >
                        Reset Logo
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Visual Preview Box matching voucher header exactly */}
                <div 
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-blue-300/90 bg-[#f0f7ff] shadow-2xs select-none"
                  style={{
                    fontFamily: "'Noto Sans Myanmar', 'Pyidaungsu', 'Padauk', 'Myanmar Text', sans-serif",
                  }}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Left Pill Logo - Widened by ~1.0cm total, +0.25cm for enhanced prominence and sharpness */}
                    <div className="shrink-0 flex items-center justify-center text-center w-[140px] sm:w-[150px] min-w-[134px] max-w-[158px] my-auto">
                      {system2Logo && system2Logo !== '/system2-logo.svg' ? (
                        <img
                          src={system2Logo}
                          alt="System II Logo Preview"
                          className="w-full h-auto max-h-[66px] sm:max-h-[72px] object-contain drop-shadow-xs"
                        />
                      ) : (
                        <System2BadgeLogo forceDefault className="w-full h-auto drop-shadow-2xs" />
                      )}
                    </div>

                    {/* Blue Vertical Divider */}
                    <div 
                      className="w-[1.8px] self-stretch my-auto rounded-full shrink-0 bg-[#0038ff]" 
                      style={{ minHeight: '44px' }}
                    />

                    {/* Right Address & Phone structured capsule card - Single-line address, zero top-clipping, zero side-overflow */}
                    <div className="flex-1 flex flex-col justify-center gap-1.5 sm:gap-2 min-w-0 bg-white rounded-lg border border-blue-200/90 px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-2xs overflow-hidden my-auto">
                      {/* Line 1: Location Pin + Address on a single line */}
                      <div className="flex items-center gap-1.5 text-slate-900 min-w-0 w-full overflow-hidden">
                        <MapPin className="w-3.5 h-3.5 text-[#0038ff] shrink-0 fill-[#0038ff]/15" />
                        <span 
                          className="text-[6.8px] sm:text-[7.2px] md:text-[7.4px] font-bold text-slate-900 tracking-tight leading-normal whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1"
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
                      {/* Line 2: Phone */}
                      <div className="flex items-center gap-1.5 text-slate-950 min-w-0 w-full overflow-hidden">
                        <Phone className="w-3 h-3 text-[#0038ff] shrink-0 fill-[#0038ff]/15" />
                        <span className="font-bold text-[#0038ff] text-[7.4px] sm:text-[7.8px] shrink-0 font-sans">
                          Phone :
                        </span>
                        <span className="text-slate-950 font-mono font-bold tracking-tight text-[7.8px] sm:text-[8.4px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ lineHeight: '1.4' }}>
                          {system2Phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Inputs for Address and Phone */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>System II Address & Contact Info</span>
                </h4>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Branch Address
                  </label>
                  <textarea
                    rows={2}
                    value={system2Address}
                    onChange={(e) => setSystem2Address(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-xs leading-relaxed focus:border-blue-400 focus:outline-hidden"
                    placeholder="B/84B, Room (3+4+5+6), Nawaday Shop House..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Phone Numbers
                  </label>
                  <input
                    type="text"
                    value={system2Phone}
                    onChange={(e) => setSystem2Phone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-xs focus:border-blue-400 focus:outline-hidden"
                    placeholder="09 453077667, 09 457063667"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800/90 px-4 py-3 border-t border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'logo' ? (
              <>
                <button
                  type="button"
                  onClick={handleResetToDefaultLogo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-rose-900 text-rose-200 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Reset to default logo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Default Logo</span>
                </button>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 ml-2">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span>Show Logo</span>
                </label>
              </>
            ) : activeTab === 'branches' ? (
              <button
                type="button"
                onClick={handleResetBranches}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset Branches</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetSystem2}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-blue-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Reset System II</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {saveSuccessMsg && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium bg-emerald-950/70 border border-emerald-500/40 px-3 py-1 rounded-lg animate-fadeIn">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
            {saveErrorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-medium bg-rose-950/70 border border-rose-500/40 px-3 py-1 rounded-lg animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            {activeTab === 'logo' ? (
              <button
                type="button"
                disabled={isSavingLogo || isProcessingImg}
                onClick={handleSaveLogo}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-purple-900/40 transition-all cursor-pointer"
              >
                {isSavingLogo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Logo Permanently</span>
                  </>
                )}
              </button>
            ) : activeTab === 'branches' ? (
              <button
                type="button"
                disabled={isSavingBranches}
                onClick={handleSaveBranches}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {isSavingBranches ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Branches</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSavingSystem2 || isProcessingImg}
                onClick={handleSaveSystem2}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-900/40 transition-all cursor-pointer"
              >
                {isSavingSystem2 ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save System II</span>
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
