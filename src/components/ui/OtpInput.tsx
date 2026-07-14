import React, { useRef } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  error = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    inputsRef.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  };

  const handleChange = (index: number, digit: string) => {
    const clean = digit.replace(/\D/g, '');
    if (!clean) return;
    const chars = value.padEnd(length, ' ').split('');
    // Support typing multiple digits (e.g. autofill into one box)
    clean.split('').slice(0, length - index).forEach((c, offset) => {
      chars[index + offset] = c;
    });
    onChange(chars.join('').trimEnd());
    focusInput(index + clean.length);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = value.padEnd(length, ' ').split('');
      if (chars[index] !== ' ') {
        chars[index] = ' ';
        onChange(chars.join('').trimEnd());
      } else if (index > 0) {
        chars[index - 1] = ' ';
        onChange(chars.join('').trimEnd());
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusInput(pasted.length);
    }
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={value[i]?.trim() ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          aria-label={`Digit ${i + 1}`}
          className={`w-11 h-12 sm:w-12 text-center text-xl font-semibold rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors duration-150 ${
            error
              ? 'border-error-500 focus:border-error-500 focus:ring-error-500/30 text-error-700'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/30 text-gray-900'
          }`}
        />
      ))}
    </div>
  );
};
