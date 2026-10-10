import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  X, 
  Check, 
  Sparkles 
} from 'lucide-react';

export interface CalendarMonthPickerProps {
  // Value can be YYYY-MM (e.g. "2026-09" or "ALL") for Month mode, or YYYY-MM-DD for Date mode
  selectedMonth?: string;
  onSelectMonth?: (monthStr: string) => void;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  mode?: 'MONTH' | 'DATE' | 'HORIZON_AWARE';
  timeHorizon?: string; // If 'DAILY', auto-switches to Date mode; if 'MONTH', '3M', '6M', 'YEAR', 'ALL', uses Month mode
  className?: string;
  buttonClassName?: string;
  activeMonths?: string[];
  latestActiveMonth?: string;
  align?: 'left' | 'right';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarMonthPicker: React.FC<CalendarMonthPickerProps> = ({
  selectedMonth = '2026-09',
  onSelectMonth,
  selectedDate = new Date().toISOString().slice(0, 10),
  onSelectDate,
  mode = 'MONTH',
  timeHorizon = 'MONTH',
  className = '',
  buttonClassName = '',
  activeMonths = [],
  latestActiveMonth,
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentCalYear = new Date().getFullYear();
  const currentCalMonth = new Date().getMonth(); // 0-11

  // Resolve whether we are showing single Date picker or Month picker
  const isDateView = mode === 'DATE' || (mode === 'HORIZON_AWARE' && timeHorizon === 'DAILY');

  // Determine initial Year & Month to display in popover
  const initialYear = isDateView 
    ? (Number(selectedDate?.slice(0, 4)) || currentCalYear)
    : (selectedMonth && selectedMonth !== 'ALL' ? Number(selectedMonth.slice(0, 4)) : currentCalYear);

  const initialMonth = isDateView
    ? ((Number(selectedDate?.slice(5, 7)) || (currentCalMonth + 1)) - 1)
    : (selectedMonth && selectedMonth !== 'ALL' ? (Number(selectedMonth.slice(5, 7)) - 1) : currentCalMonth);

  const [navYear, setNavYear] = useState<number>(initialYear);
  const [navMonth, setNavMonth] = useState<number>(initialMonth >= 0 && initialMonth <= 11 ? initialMonth : currentCalMonth);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Sync internal view when props change
  useEffect(() => {
    if (isDateView && selectedDate && selectedDate.length >= 10) {
      const y = Number(selectedDate.slice(0, 4));
      const m = Number(selectedDate.slice(5, 7)) - 1;
      if (!isNaN(y)) setNavYear(y);
      if (!isNaN(m) && m >= 0 && m <= 11) setNavMonth(m);
    } else if (!isDateView && selectedMonth && selectedMonth !== 'ALL' && selectedMonth.length >= 7) {
      const y = Number(selectedMonth.slice(0, 4));
      const m = Number(selectedMonth.slice(5, 7)) - 1;
      if (!isNaN(y)) setNavYear(y);
      if (!isNaN(m) && m >= 0 && m <= 11) setNavMonth(m);
    }
  }, [selectedDate, selectedMonth, isDateView]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthDropdownOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format trigger button display text
  const getButtonText = (): string => {
    if (isDateView) {
      if (!selectedDate) return 'SELECT DATE';
      // Format as DD/MM/YYYY (Day/Month/Year)
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return selectedDate;
    }

    if (selectedMonth === 'ALL') {
      return 'ALL MONTHS';
    }

    const parts = (selectedMonth || '2026-09').split('-');
    const y = parts[0] || '2026';
    const mIdx = Math.max(0, Math.min(11, (Number(parts[1]) || 9) - 1));
    return `${MONTH_NAMES[mIdx].toUpperCase()} ${y}`;
  };

  // Month select handler
  const handleSelectMonth = (monthIdx: number, yearNum: number = navYear) => {
    const mFormatted = String(monthIdx + 1).padStart(2, '0');
    const newMonthStr = `${yearNum}-${mFormatted}`;
    if (onSelectMonth) {
      onSelectMonth(newMonthStr);
    }
    if (onSelectDate) {
      onSelectDate(`${newMonthStr}-01`);
    }
    setNavMonth(monthIdx);
    setNavYear(yearNum);
    setIsOpen(false);
    setIsMonthDropdownOpen(false);
  };

  // Date select handler
  const handleSelectDay = (dayNum: number) => {
    const mFormatted = String(navMonth + 1).padStart(2, '0');
    const dFormatted = String(dayNum).padStart(2, '0');
    const newDateStr = `${navYear}-${mFormatted}-${dFormatted}`;
    if (onSelectDate) {
      onSelectDate(newDateStr);
    }
    if (onSelectMonth) {
      onSelectMonth(`${navYear}-${mFormatted}`);
    }
    setIsOpen(false);
  };

  // Quick action: Today
  const handleToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const dStr = now.toISOString().slice(0, 10);
    const mStr = `${y}-${String(m + 1).padStart(2, '0')}`;

    setNavYear(y);
    setNavMonth(m);

    if (isDateView) {
      if (onSelectDate) onSelectDate(dStr);
      if (onSelectMonth) onSelectMonth(mStr);
    } else {
      if (onSelectMonth) onSelectMonth(mStr);
      if (onSelectDate) onSelectDate(`${mStr}-01`);
    }
    setIsOpen(false);
  };

  // Quick action: Clear / All
  const handleClearOrAll = () => {
    if (isDateView) {
      if (onSelectDate) onSelectDate('');
    } else {
      if (onSelectMonth) onSelectMonth('ALL');
    }
    setIsOpen(false);
  };

  // Month Navigation
  const handlePrevNavMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(y => y - 1);
    } else {
      setNavMonth(m => m - 1);
    }
  };

  const handleNextNavMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(y => y + 1);
    } else {
      setNavMonth(m => m + 1);
    }
  };

  // Days matrix calculation
  const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
  const firstDayIndex = new Date(navYear, navMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(navYear, navMonth, 0).getDate();

  const yearList = Array.from({ length: 9 }, (_, i) => 2022 + i);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {/* Trigger Button Pill matching Screenshot 1 & 2 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`border-2 border-sky-500 hover:border-sky-600 rounded-xl px-3 sm:px-3.5 py-1.5 bg-white text-sky-700 hover:bg-sky-50/60 font-black text-xs sm:text-sm tracking-wide flex items-center gap-2 shadow-2xs cursor-pointer transition-all ${buttonClassName}`}
        title="Click to select Date / Month"
      >
        <CalendarIcon className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="uppercase font-black text-sky-900 font-mono">
          {getButtonText()}
        </span>
        <CalendarDays className="w-4 h-4 text-sky-600 shrink-0" />
      </button>

      {/* ========================================================================= */}
      {/* POPUP DROPDOWN (SCREENSHOT 1 & SCREENSHOT 2 FIDELITY) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className={`absolute top-full ${align === 'left' ? 'left-0' : 'right-0'} mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3.5 w-[300px] sm:w-[320px] animate-in fade-in zoom-in-95 duration-100 select-none`}>
          
          {/* ------------------------------------------------------------- */}
          {/* MODE A: MONTH SELECTION GRID (SCREENSHOT 1 FIDELITY) */}
          {/* ------------------------------------------------------------- */}
          {!isDateView && (
            <div className="space-y-3">
              {/* Year Navigation Header */}
              <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setNavYear(y => y - 1)}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  <span className="font-mono font-black text-sm text-slate-900">
                    {navYear}
                  </span>
                  <select
                    value={navYear}
                    onChange={(e) => setNavYear(Number(e.target.value))}
                    className="opacity-0 w-4 h-4 absolute cursor-pointer"
                  >
                    {yearList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setNavYear(y => y + 1)}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid: 4 columns x 3 rows (Jan-Dec) as shown in Screenshot 1 */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {MONTH_SHORT.map((mShort, index) => {
                  const targetMonthStr = `${navYear}-${String(index + 1).padStart(2, '0')}`;
                  const isSelected = selectedMonth === targetMonthStr;
                  const isCurrentCalMonth = currentCalYear === navYear && currentCalMonth === index;
                  const hasData = activeMonths.includes(targetMonthStr);

                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => handleSelectMonth(index)}
                      className={`relative py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-xs font-black scale-105'
                          : isCurrentCalMonth
                          ? 'bg-sky-50 text-sky-900 border border-sky-300 font-bold hover:bg-sky-100'
                          : hasData
                          ? 'bg-emerald-50/80 text-emerald-900 border border-emerald-300 font-bold hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/50'
                      }`}
                      title={hasData ? `${targetMonthStr} (Contains records)` : targetMonthStr}
                    >
                      {mShort}
                      {hasData && (
                        <span 
                          className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-600'}`}
                          title="Contains transaction records"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-1">
                <button
                  type="button"
                  onClick={handleClearOrAll}
                  className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                >
                  All Months
                </button>
                {latestActiveMonth && latestActiveMonth !== selectedMonth && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectMonth) onSelectMonth(latestActiveMonth);
                      if (onSelectDate) onSelectDate(`${latestActiveMonth}-01`);
                      setIsOpen(false);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-black hover:underline cursor-pointer flex items-center gap-0.5"
                    title={`Switch to active records in ${latestActiveMonth}`}
                  >
                    <span>★ {latestActiveMonth}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-sky-600 hover:text-sky-800 font-bold hover:underline cursor-pointer"
                >
                  Current Month
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* MODE B: DAYS CALENDAR MATRIX (SCREENSHOT 2 FIDELITY) */}
          {/* ------------------------------------------------------------- */}
          {isDateView && (
            <div className="space-y-2">
              {/* Header: "September 2026 v" and Arrow buttons */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    className="flex items-center gap-1 font-black text-sm text-slate-900 hover:text-sky-600 transition-colors cursor-pointer"
                  >
                    <span>{MONTH_NAMES[navMonth]} {navYear}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Quick Month / Year selector popover when clicking header */}
                  {isMonthDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 z-60 bg-white border border-slate-200 shadow-xl rounded-xl p-2 w-48 animate-in fade-in">
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                        {MONTH_SHORT.map((m, idx) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setNavMonth(idx);
                              setIsMonthDropdownOpen(false);
                            }}
                            className={`p-1 rounded-md text-center cursor-pointer ${
                              navMonth === idx ? 'bg-sky-600 text-white' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Arrow Navigation (Up/Down or Prev/Next) matching Screenshot 2 */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevNavMonth}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextNavMonth}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Weekday Names Header: S M T W T F S */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-700 py-1 font-mono">
                {WEEKDAY_SHORT.map((day, i) => (
                  <div key={i} className="py-0.5">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Grid Matrix */}
              <div className="grid grid-cols-7 gap-1 font-mono text-xs">
                {/* Previous Month Filler Days */}
                {Array.from({ length: firstDayIndex }).map((_, i) => {
                  const prevDayNum = daysInPrevMonth - firstDayIndex + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="h-8 flex items-center justify-center text-slate-300 select-none"
                    >
                      {prevDayNum}
                    </div>
                  );
                })}

                {/* Current Month Active Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dayStr;
                  const isToday = dayStr === todayStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-sky-600 text-white font-black shadow-xs scale-105'
                          : isToday
                          ? 'bg-amber-50 text-amber-900 border border-amber-300 font-black'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Footer: Clear on Left, Today on Right matching Screenshot 2 */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <button
                  type="button"
                  onClick={handleClearOrAll}
                  className="text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                >
                  Today
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
