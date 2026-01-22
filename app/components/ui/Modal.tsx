'use client';

import { type HTMLAttributes, type ReactNode, useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/app/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(el => {
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (typeof document === 'undefined') return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [locked]);
}

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  zIndexClassName?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  zIndexClassName,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const raf = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;

      const focusables = getFocusableElements(panel);
      if (focusables[0]) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    if (open) return;

    const el = previouslyFocused.current;
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  if (!open) return null;
  if (!portalTarget) return null;

  return createPortal(
    <div className={cn('fixed inset-0', zIndexClassName ?? 'z-50')}>
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 h-full w-full bg-black/40"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      <div className="relative mx-auto flex h-full w-full max-w-6xl items-center justify-center p-md">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'w-full overflow-hidden rounded-card bg-surface shadow-soft ring-1 ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            sizeClasses[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="border-b border-border px-lg py-md">
              {title && (
                <div className="flex items-start justify-between gap-md">
                  <h2 id={titleId} className="text-h3 font-heading text-text">
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'rounded-card px-sm py-xs text-sm font-semibold text-text-muted transition hover:bg-background/70 hover:text-text',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                    aria-label="Fechar"
                  >
                    Fechar
                  </button>
                </div>
              )}
              {description && (
                <p id={descriptionId} className="mt-xs text-body text-text-muted">
                  {description}
                </p>
              )}
            </div>
          )}

          <div className="px-lg py-md">{children}</div>

          {footer && (
            <div className="border-t border-border bg-background/40 px-lg py-md">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

export type ModalFooterProps = HTMLAttributes<HTMLDivElement>;

export function ModalFooter({ className, ...props }: ModalFooterProps) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-sm sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
