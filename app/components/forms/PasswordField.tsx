'use client';

import { useState } from 'react';

import { Input, type InputProps } from '@/app/components/ui/Input';
import { cn } from '@/app/lib/utils';

interface PasswordFieldProps extends Omit<InputProps, 'type'> {
  id: string;
  label: string;
  errorMessage?: string | null;
}

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
    <circle cx="12" cy="12" r="3" opacity={open ? 1 : 0.3} />
    {!open && <path d="m4.5 4.5 15 15" strokeLinecap="round" />}
  </svg>
);

export function PasswordField({
  id,
  label,
  errorMessage,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          {...inputProps}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
        />
        <button
          type="button"
          onClick={() => setVisible(prev => !prev)}
          className="absolute inset-y-0 right-3 flex items-center text-text-muted transition hover:text-text"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        >
          <EyeIcon open={visible} />
        </button>
      </div>
      {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
    </div>
  );
}
