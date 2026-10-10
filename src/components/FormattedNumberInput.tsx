import React, { useState, useEffect, useRef } from 'react';

export interface FormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined | null;
  onChange: (val: number) => void;
  showLiveBadge?: boolean;
  currencySuffix?: string;
  allowDecimals?: boolean;
}

export const formatWithCommas = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).replace(/,/g, '').trim();
  if (str === '') return '';
  const num = Number(str);
  if (isNaN(num)) return '';
  const parts = str.split('.');
  const integerPart = Number(parts[0]).toLocaleString('en-US');
  if (parts.length > 1) {
    return `${integerPart}.${parts[1]}`;
  }
  return integerPart;
};

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  showLiveBadge = false,
  currencySuffix = 'MMK',
  allowDecimals = false,
  className = '',
  placeholder = '0',
  min,
  max,
  disabled,
  ...props
}) => {
  const isFocused = useRef(false);
  const isFirstClickAfterFocus = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Internal display string formatted with commas
  const [displayValue, setDisplayValue] = useState<string>(() => formatWithCommas(value));

  // Keep internal string in sync when external numeric value changes
  useEffect(() => {
    const formatted = formatWithCommas(value);
    if (!isFocused.current) {
      // Always enforce the exact formatted string with commas when not actively typing
      setDisplayValue(formatted);
    } else {
      // While typing, if the external value changed significantly (e.g. selection or reset)
      const currentNum = Number(displayValue.replace(/,/g, '')) || 0;
      const incomingNum = typeof value === 'number' ? value : Number(String(value || 0).replace(/,/g, '')) || 0;
      if (currentNum !== incomingNum) {
        setDisplayValue(formatted);
      }
    }
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    isFirstClickAfterFocus.current = true;
    if (props.onFocus) props.onFocus(e);

    const currentNum = Number(displayValue.replace(/,/g, '')) || 0;
    if (currentNum === 0) {
      // Clear 0 immediately so user can type without having to backspace 0
      setDisplayValue('');
    } else {
      // Auto-select text so typing immediately overwrites existing number
      e.currentTarget.select();
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isFirstClickAfterFocus.current) {
      isFirstClickAfterFocus.current = false;
      const currentNum = Number(displayValue.replace(/,/g, '')) || 0;
      if (currentNum === 0) {
        setDisplayValue('');
      } else {
        e.currentTarget.select();
      }
    }
    if (props.onMouseUp) props.onMouseUp(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const pos = input.selectionStart || 0;
      // If backspacing directly after a comma (e.g. "1,|000"), shift cursor back by 1 so the actual digit is deleted
      if (pos > 0 && input.value[pos - 1] === ',') {
        input.setSelectionRange(pos - 1, pos - 1);
      }
      return;
    }

    // Direct key replacement if current value is 0 and user presses 1-9:
    const prevClean = displayValue.replace(/,/g, '').trim();
    if ((prevClean === '0' || prevClean === '') && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const num = Number(e.key);
      const newFormatted = formatWithCommas(num);
      setDisplayValue(newFormatted);
      onChange(num);
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newFormatted.length, newFormatted.length);
        }
      });
      return;
    }
    if (prevClean === '0' && e.key === '0') {
      e.preventDefault();
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let oldVal = input.value;
    const cursorPos = input.selectionStart || 0;

    // Count how many non-comma characters were before the cursor
    const nonCommasBeforeCursor = oldVal.slice(0, cursorPos).replace(/,/g, '').length;

    // Filter characters
    let cleanStr = allowDecimals
      ? oldVal.replace(/[^\d.]/g, '')
      : oldVal.replace(/[^\d]/g, '');

    // If previously 0, and user typed a digit (e.g. "05" or "50"), strip the old 0
    const prevClean = displayValue.replace(/,/g, '');
    if ((prevClean === '0' || prevClean === '') && cleanStr.length === 2 && !cleanStr.includes('.')) {
      if (cleanStr.startsWith('0')) {
        cleanStr = cleanStr.slice(1);
      } else if (cleanStr.endsWith('0') && cleanStr !== '00') {
        cleanStr = cleanStr.slice(0, 1);
      }
    }

    if (cleanStr === '' || cleanStr === '.') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    let num = allowDecimals ? parseFloat(cleanStr) : parseInt(cleanStr, 10);
    if (isNaN(num)) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    if (max !== undefined && num > Number(max)) {
      num = Number(max);
    }

    const newFormatted = formatWithCommas(num);
    setDisplayValue(newFormatted);
    onChange(num);

    // Calculate preserved cursor position
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCursorPos = 0;
      let count = 0;
      for (let i = 0; i < newFormatted.length; i++) {
        if (newFormatted[i] !== ',') {
          count++;
        }
        if (count === nonCommasBeforeCursor) {
          newCursorPos = i + 1;
          break;
        }
      }
      if (newCursorPos === 0 && newFormatted.length > 0) {
        newCursorPos = newFormatted.length;
      }
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = false;
    isFirstClickAfterFocus.current = false;
    if (props.onBlur) props.onBlur(e);

    const cleanStr = displayValue.replace(/,/g, '').trim();
    if (cleanStr === '' || isNaN(Number(cleanStr)) || Number(cleanStr) === 0) {
      setDisplayValue('0');
      onChange(0);
    } else {
      let num = allowDecimals ? parseFloat(cleanStr) : parseInt(cleanStr, 10);
      if (isNaN(num)) num = 0;
      if (min !== undefined && num < Number(min)) num = Number(min);
      if (max !== undefined && num > Number(max)) num = Number(max);
      setDisplayValue(formatWithCommas(num));
      onChange(num);
    }
  };

  const numValue = typeof value === 'number' ? value : Number(String(value || 0).replace(/,/g, '')) || 0;

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        {...props}
      />
    </div>
  );
};
