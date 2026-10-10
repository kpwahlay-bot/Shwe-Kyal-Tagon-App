import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Check, 
  CalendarDays,
  Sparkles
} from 'lucide-react';

export type DateFilterPreset = 'DAILY' | 'MONTHLY' | 'RANGE' | 'ALL';

export interface DateFilterState {
  preset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Utility to strip redundant unit markers from item names/descriptions
 * e.g., "iPhone 13 (2 units)" -> "iPhone 13"
 */
export const cleanItemDescription = (name?: string): string => {
  if (!name) return '';
  return name
    .replace(/\s*\(\d+(\.\d+)?\s*(units?|unit|pcs?|items?)\)/gi, '')
    .replace(/\s*\(1\.0\)/g, '')
    .trim();
};

/**
 * Format YYYY-MM-DD into DD/MM/YYYY (Day/Month/Year) for UI display
 */
export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD -> DD/MM/YYYY
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    if (parts[2].length === 4) {
      // Already DD/MM/YYYY
      const [day, month, year] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  return dateStr;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Checks whether a given record date falls within the active filter
 */
export const isDateWithinFilter = (dateStr?: string, filter?: DateFilterState): boolean => {
  if (!filter || filter.preset === 'ALL') return true;
  if (!dateStr) return false;

  const d = dateStr.slice(0, 10);

  if (filter.preset === 'DAILY') {
    return filter.startDate ? d === filter.startDate : true;
  }

  if (filter.preset === 'MONTHLY') {
    if (!filter.startDate) return true;
    const targetMonth = filter.startDate.slice(0, 7); // YYYY-MM
    return d.startsWith(targetMonth);
  }

  if (filter.preset === 'RANGE') {
    if (filter.startDate && filter.endDate) {
      const min = filter.startDate <= filter.endDate ? filter.startDate : filter.endDate;
      const max = filter.startDate <= filter.endDate ? filter.endDate : filter.startDate;
      return d >= min && d <= max;
    }
    if (filter.startDate) return d >= filter.startDate;
    if (filter.endDate) return d <= filter.endDate;
    return true;
  }

  return true;
};

interface DateRangeFilterProps {
  value: DateFilterState;
  onChange: (newValue: DateFilterState) => void;
  className?: string;
  totalCount?: number;
  label?: string;
  allowedPresets?: DateFilterPreset[];
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = '',
  totalCount,
  label = 'FILTER RECORDS',
  allowedPresets,
}) => {
  const isPresetAllowed = (p: DateFilterPreset) => !allowedPresets || allowedPresets.includes(p);
  const today = new Date().toISOString().slice(0, 10);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize active mode
  let rawMode: DateFilterPreset = 
    value.preset === 'RANGE' ? 'RANGE' : 
    value.preset === 'MONTHLY' ? 'MONTHLY' :
    value.preset === 'ALL' ? 'ALL' : 'DAILY';

  if (allowedPresets && !allowedPresets.includes(rawMode)) {
    rawMode = allowedPresets[0] || 'DAILY';
  }
  const activeMode: DateFilterPreset = rawMode;

  const currentStartDate = value.startDate || today;
  const currentEndDate = value.endDate || today;

  // Internal Calendar Navigation State
  const initialYear = Number(currentStartDate.slice(0, 4)) || new Date().getFullYear();
  const initialMonth = (Number(currentStartDate.slice(5, 7)) || (new Date().getMonth() + 1)) - 1;

  const [navYear, setNavYear] = useState<number>(initialYear);
  const [navMonth, setNavMonth] = useState<number>(initialMonth); // 0-11
  const [viewTab, setViewTab] = useState<'DAYS' | 'MONTHS'>('DAYS');

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sync internal year/month with currentStartDate when it changes
  useEffect(() => {
    if (currentStartDate && currentStartDate.length >= 7) {
      const y = Number(currentStartDate.slice(0, 4));
      const m = Number(currentStartDate.slice(5, 7)) - 1;
      if (!isNaN(y)) setNavYear(y);
      if (!isNaN(m) && m >= 0 && m <= 11) setNavMonth(m);
    }
  }, [currentStartDate]);

  const handleModeChange = (mode: DateFilterPreset) => {
    if (mode === 'DAILY') {
      const nowStr = new Date().toISOString().slice(0, 10);
      onChange({
        preset: 'DAILY',
        startDate: nowStr,
        endDate: nowStr,
      });
      setViewTab('DAYS');
    } else if (mode === 'MONTHLY') {
      const now = new Date();
      const y = String(now.getFullYear());
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      onChange({
        preset: 'MONTHLY',
        startDate: `${y}-${m}-01`,
        endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
      });
      setNavYear(now.getFullYear());
      setNavMonth(now.getMonth());
      setViewTab('MONTHS');
    } else if (mode === 'RANGE') {
      onChange({
        preset: 'RANGE',
        startDate: currentStartDate || today,
        endDate: currentEndDate || today,
      });
      setViewTab('DAYS');
    } else {
      onChange({
        preset: 'ALL',
        startDate: '',
        endDate: '',
      });
      setIsOpen(false);
    }
  };

  // Navigate prev/next month
  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  // Step single day directly from bar
  const handleStepDay = (direction: -1 | 1) => {
    const baseDate = new Date(currentStartDate || today);
    baseDate.setDate(baseDate.getDate() + direction);
    const newDateStr = baseDate.toISOString().slice(0, 10);
    onChange({
      preset: activeMode === 'DAILY' ? 'DAILY' : activeMode,
      startDate: newDateStr,
      endDate: activeMode === 'DAILY' ? newDateStr : currentEndDate,
    });
  };

  // Select a specific day
  const handleSelectDay = (dayNum: number) => {
    const y = String(navYear);
    const m = String(navMonth + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    const selectedDateStr = `${y}-${m}-${d}`;

    if (activeMode === 'DAILY' || activeMode === 'ALL' || activeMode === 'MONTHLY') {
      onChange({
        preset: 'DAILY',
        startDate: selectedDateStr,
        endDate: selectedDateStr,
      });
      setIsOpen(false);
    } else if (activeMode === 'RANGE') {
      // In range mode: if start is already set and end is empty or equal to start, set end
      if (value.startDate && !value.endDate) {
        if (selectedDateStr < value.startDate) {
          onChange({
            preset: 'RANGE',
            startDate: selectedDateStr,
            endDate: value.startDate,
          });
        } else {
          onChange({
            preset: 'RANGE',
            startDate: value.startDate,
            endDate: selectedDateStr,
          });
        }
        setIsOpen(false);
      } else {
        onChange({
          preset: 'RANGE',
          startDate: selectedDateStr,
          endDate: '',
        });
      }
    }
  };

  // Select a month
  const handleSelectMonth = (monthIndex: number) => {
    setNavMonth(monthIndex);
    const y = String(navYear);
    const m = String(monthIndex + 1).padStart(2, '0');
    const lastDay = new Date(navYear, monthIndex + 1, 0).getDate();

    if (activeMode === 'MONTHLY') {
      onChange({
        preset: 'MONTHLY',
        startDate: `${y}-${m}-01`,
        endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
      });
      setIsOpen(false);
    } else {
      // Switch to Day view of that month so user can pick exact day!
      setViewTab('DAYS');
    }
  };

  // Quick preset handlers
  const setQuickToday = () => {
    onChange({
      preset: 'DAILY',
      startDate: today,
      endDate: today,
    });
    setIsOpen(false);
  };

  const setQuickYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yestStr = d.toISOString().slice(0, 10);
    onChange({
      preset: 'DAILY',
      startDate: yestStr,
      endDate: yestStr,
    });
    setIsOpen(false);
  };

  const setQuickThisMonth = () => {
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    onChange({
      preset: 'MONTHLY',
      startDate: `${y}-${m}-01`,
      endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    });
    setNavYear(now.getFullYear());
    setNavMonth(now.getMonth());
    setIsOpen(false);
  };

  const setQuickLastMonth = () => {
    const now = new Date();
    const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = String(lastM.getFullYear());
    const m = String(lastM.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(lastM.getFullYear(), lastM.getMonth() + 1, 0).getDate();
    onChange({
      preset: 'MONTHLY',
      startDate: `${y}-${m}-01`,
      endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    });
    setNavYear(lastM.getFullYear());
    setNavMonth(lastM.getMonth());
    setIsOpen(false);
  };

  // Calculate calendar grid days for current navYear & navMonth
  const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
  const firstDayIndex = new Date(navYear, navMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(navYear, navMonth, 0).getDate();

  // Year options for selection dropdown
  const yearOptions = Array.from({ length: 12 }, (_, i) => 2022 + i);

  return (
    <div className={`relative flex items-center gap-2.5 flex-wrap ${className}`} ref={containerRef}>
      {/* Label */}
      {label && (
        <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase select-none">
          {label}
        </span>
      )}

      {/* Main Filter Bar */}
      <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-2xl p-1 shadow-2xs transition-all hover:border-slate-300">
        
        {/* Toggle Pills (DAILY / MONTHLY / RANGE / ALL) */}
        <div className="flex items-center bg-slate-100/90 p-0.5 rounded-xl gap-0.5">
          {isPresetAllowed('DAILY') && (
            <button
              type="button"
              onClick={() => handleModeChange('DAILY')}
              className={`px-2.5 py-1 text-xs font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                activeMode === 'DAILY'
                  ? 'bg-white text-sky-600 shadow-xs scale-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Select specific day"
            >
              DAILY
            </button>
          )}

          {isPresetAllowed('MONTHLY') && (
            <button
              type="button"
              onClick={() => handleModeChange('MONTHLY')}
              className={`px-2.5 py-1 text-xs font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                activeMode === 'MONTHLY'
                  ? 'bg-white text-purple-700 shadow-xs scale-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Select full month"
            >
              MONTH
            </button>
          )}

          {isPresetAllowed('RANGE') && (
            <button
              type="button"
              onClick={() => handleModeChange('RANGE')}
              className={`px-2.5 py-1 text-xs font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                activeMode === 'RANGE'
                  ? 'bg-white text-sky-600 shadow-xs scale-100'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Select date range"
            >
              RANGE
            </button>
          )}

          {isPresetAllowed('ALL') && (
            <button
              type="button"
              onClick={() => handleModeChange('ALL')}
              className={`px-2 py-1 text-xs font-bold tracking-wide rounded-lg transition-all cursor-pointer ${
                activeMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs scale-100'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Show all records without date filter"
            >
              ALL
            </button>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-200 mx-1.5" />

        {/* Date Selector Trigger Button */}
        <div className="flex items-center gap-1">
          {activeMode === 'DAILY' && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewTab('DAYS');
                  setIsOpen(!isOpen);
                }}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-sky-50 rounded-lg group transition-colors cursor-pointer"
                title="Click to open full calendar"
              >
                <CalendarIcon className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-800 tracking-tight">
                  {formatDisplayDate(currentStartDate)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeMode === 'MONTHLY' && (
            <button
              type="button"
              onClick={() => {
                setViewTab('MONTHS');
                setIsOpen(!isOpen);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-purple-50 rounded-lg group transition-colors cursor-pointer"
              title="Click to select month"
            >
              <CalendarDays className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-mono font-bold text-xs sm:text-sm text-purple-900 tracking-tight">
                {MONTH_NAMES[navMonth]} {navYear}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-700 transition-colors" />
            </button>
          )}

          {activeMode === 'RANGE' && (
            <button
              type="button"
              onClick={() => {
                setViewTab('DAYS');
                setIsOpen(!isOpen);
              }}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-sky-50 rounded-lg group transition-colors cursor-pointer text-xs"
              title="Click to select date range"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-mono font-bold text-slate-800">
                {formatDisplayDate(currentStartDate)}
              </span>
              <span className="text-slate-400 font-bold font-mono">~</span>
              <span className="font-mono font-bold text-slate-800">
                {formatDisplayDate(currentEndDate)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          {activeMode === 'ALL' && (
            <div className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 font-medium font-mono">
              <span>All Historical Records</span>
            </div>
          )}
        </div>
      </div>

      {/* Record Counter Badge */}
      {totalCount !== undefined && (
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 hidden xl:inline-block font-mono">
          {totalCount} records
        </span>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE CALENDAR DROPDOWN POPUP */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 w-[330px] sm:w-[350px] animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header Bar: Month, Year & View Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Selector */}
              <select
                value={navMonth}
                onChange={(e) => setNavMonth(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 cursor-pointer focus:outline-hidden"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={navYear}
                onChange={(e) => setNavYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 cursor-pointer focus:outline-hidden"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Switch: Days vs Months */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setViewTab('DAYS')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  viewTab === 'DAYS' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Days
              </button>
              <button
                type="button"
                onClick={() => setViewTab('MONTHS')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  viewTab === 'MONTHS' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Months
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: DAYS CALENDAR GRID */}
          {/* ========================================================================= */}
          {viewTab === 'DAYS' && (
            <div className="py-2.5">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAY_NAMES.map((day, i) => (
                  <div
                    key={day}
                    className={`text-[10px] font-black uppercase py-1 ${
                      i === 0 ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Previous month filler days */}
                {Array.from({ length: firstDayIndex }).map((_, i) => {
                  const prevDayNum = daysInPrevMonth - firstDayIndex + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-8 flex items-center justify-center text-[11px] text-slate-300 font-mono select-none"
                    >
                      {prevDayNum}
                    </div>
                  );
                })}

                {/* Current Month Active Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isToday = dayStr === today;
                  const isSelected =
                    activeMode === 'DAILY'
                      ? dayStr === currentStartDate
                      : activeMode === 'RANGE'
                      ? dayStr >= currentStartDate && dayStr <= currentEndDate
                      : false;

                  const isRangeStart = activeMode === 'RANGE' && dayStr === currentStartDate;
                  const isRangeEnd = activeMode === 'RANGE' && dayStr === currentEndDate;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer relative ${
                        isSelected
                          ? isRangeStart || isRangeEnd || activeMode === 'DAILY'
                            ? 'bg-sky-600 text-white shadow-xs font-black scale-105 z-10'
                            : 'bg-sky-100 text-sky-900 font-bold'
                          : isToday
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isToday && !isSelected && (
                        <span className="w-1 h-1 bg-amber-500 rounded-full absolute bottom-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 12 MONTHS GRID (Select month directly - 4x3 matching Screenshot 1) */}
          {/* ========================================================================= */}
          {viewTab === 'MONTHS' && (
            <div className="py-3">
              <div className="grid grid-cols-4 gap-2">
                {MONTH_NAMES_SHORT.map((mShort, index) => {
                  const isCurrentMonth =
                    navMonth === index &&
                    navYear === Number(currentStartDate.slice(0, 4));
                  const isThisCalendarMonth =
                    new Date().getMonth() === index &&
                    new Date().getFullYear() === navYear;

                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => handleSelectMonth(index)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isCurrentMonth
                          ? 'bg-purple-600 text-white shadow-xs font-black scale-105'
                          : isThisCalendarMonth
                          ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                      }`}
                    >
                      <span className="text-xs font-black">{mShort}</span>
                      <span className="text-[9px] opacity-75 font-mono">
                        {String(index + 1).padStart(2, '0')}/{navYear}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Quick Preset Shortcuts */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap text-[11px]">
            <div className="flex items-center gap-1 flex-wrap">
              {isPresetAllowed('DAILY') && (
                <>
                  <button
                    type="button"
                    onClick={setQuickToday}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md cursor-pointer transition-colors"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={setQuickYesterday}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md cursor-pointer transition-colors"
                  >
                    Yesterday
                  </button>
                </>
              )}

              {isPresetAllowed('MONTHLY') && (
                <>
                  <button
                    type="button"
                    onClick={setQuickThisMonth}
                    className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-md cursor-pointer transition-colors"
                  >
                    This Month
                  </button>

                  <button
                    type="button"
                    onClick={setQuickLastMonth}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md cursor-pointer transition-colors"
                  >
                    Last Month
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer ml-auto"
              title="Close Calendar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
