'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', h);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmBg =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-brand hover:bg-brand-dark';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      data-testid="confirm-dialog"
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 text-sm text-ink-secondary">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="btn-ghost px-4 py-2 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
