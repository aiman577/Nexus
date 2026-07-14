import React from 'react';
import { Check, X } from 'lucide-react';

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'Upper & lowercase letters', test: p => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'At least one number', test: p => /\d/.test(p) },
  { label: 'At least one symbol', test: p => /[^A-Za-z0-9]/.test(p) },
];

export const scorePassword = (password: string): number => {
  if (!password) return 0;
  let score = requirements.filter(r => r.test(password)).length;
  if (password.length >= 12 && score >= 3) score = 4;
  return Math.min(score, 4);
};

const levels = [
  { label: 'Too weak', color: 'bg-error-500', text: 'text-error-700' },
  { label: 'Weak', color: 'bg-error-500', text: 'text-error-700' },
  { label: 'Fair', color: 'bg-warning-500', text: 'text-warning-700' },
  { label: 'Good', color: 'bg-accent-500', text: 'text-accent-700' },
  { label: 'Strong', color: 'bg-success-500', text: 'text-success-700' },
];

interface PasswordStrengthMeterProps {
  password: string;
  showChecklist?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showChecklist = true,
}) => {
  if (!password) return null;

  const score = scorePassword(password);
  const level = levels[score];

  return (
    <div className="mt-2 space-y-2 animate-fade-in" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < score ? level.color : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${level.text}`}>{level.label}</span>
      </div>

      {showChecklist && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
          {requirements.map(req => {
            const met = req.test(password);
            return (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 text-xs ${met ? 'text-success-700' : 'text-gray-500'}`}
              >
                {met ? <Check size={12} /> : <X size={12} className="text-gray-400" />}
                {req.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
