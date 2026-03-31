'use client';

import { useState, useRef, useEffect } from 'react';

// ── DetailField ──

interface DetailFieldProps {
  label: string;
  value: string | null;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'date' | 'phone' | 'email' | 'url';
  options?: string[];
  onSave: (value: string | null) => void;
}

export default function DetailField({ label, value, type, options = [], onSave }: DetailFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [multiDraft, setMultiDraft] = useState<string[]>(
    value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(value ?? '');
    setMultiDraft(value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (type === 'multiselect') {
      onSave(multiDraft.length > 0 ? multiDraft.join(', ') : null);
    } else {
      onSave(draft.trim() !== '' ? draft.trim() : null);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value ?? '');
    setMultiDraft(value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  const toggleMulti = (opt: string) => {
    setMultiDraft((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
    );
  };

  // ── Display value ──
  const displayValue = value && value.trim() !== '' ? value : null;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400">{label}</span>

      {editing ? (
        // ── Edit mode ──
        <div className="flex flex-col gap-1">
          {type === 'select' && (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="rounded border border-brand px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-brand/30"
            >
              <option value="">미선택</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {type === 'multiselect' && (
            <div className="flex flex-col gap-1 rounded border border-brand p-2">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={multiDraft.includes(opt)}
                    onChange={() => toggleMulti(opt)}
                    className="accent-brand"
                  />
                  {opt}
                </label>
              ))}
              <button
                onClick={commit}
                className="mt-1 rounded bg-brand px-2 py-0.5 text-xs text-white"
              >
                확인
              </button>
            </div>
          )}

          {(type === 'text' || type === 'number' || type === 'date' || type === 'phone' || type === 'email' || type === 'url') && (
            <input
              ref={inputRef}
              type={type === 'phone' ? 'tel' : type === 'url' ? 'url' : type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'email' ? 'email' : 'text'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              className="rounded border border-brand px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-brand/30"
            />
          )}
        </div>
      ) : (
        // ── Display mode ──
        <div
          onClick={startEdit}
          className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-50"
        >
          {type === 'phone' && displayValue ? (
            <a
              href={`tel:${displayValue}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 underline"
            >
              {displayValue}
            </a>
          ) : type === 'email' && displayValue ? (
            <a
              href={`mailto:${displayValue}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-600 underline"
            >
              {displayValue}
            </a>
          ) : type === 'url' && displayValue ? (
            <a
              href={displayValue}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="max-w-[200px] truncate text-sm text-blue-600 underline"
            >
              {displayValue}
            </a>
          ) : displayValue ? (
            <span className="text-sm text-gray-800">{displayValue}</span>
          ) : (
            <span className="text-sm italic text-gray-300">미입력</span>
          )}
        </div>
      )}
    </div>
  );
}
