// ── Dismissed state utilities ──
// localStorage-backed list of dismissed item IDs per key

/**
 * Get dismissed IDs from localStorage
 * Returns empty array in SSR environment
 */
export function getDismissed(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as string[];
  } catch {
    return [];
  }
}

/**
 * Add an ID to the dismissed list
 */
export function addDismissed(key: string, id: string): void {
  if (typeof window === 'undefined') return;
  const current = getDismissed(key);
  if (!current.includes(id)) {
    localStorage.setItem(key, JSON.stringify([...current, id]));
  }
}

/**
 * Remove an ID from the dismissed list
 */
export function removeDismissed(key: string, id: string): void {
  if (typeof window === 'undefined') return;
  const current = getDismissed(key);
  localStorage.setItem(key, JSON.stringify(current.filter((x) => x !== id)));
}
