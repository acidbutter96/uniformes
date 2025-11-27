import { InputHTMLAttributes } from 'react';
import { cn } from '@/app/lib/utils';

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function SearchField({ label, className, ...props }: SearchFieldProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm font-medium text-neutral-600">
      {label && <span>{label}</span>}
      <input
        type="search"
        className={cn(
          'w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100',
          className,
        )}
        {...props}
      />
    </label>
  );
}
