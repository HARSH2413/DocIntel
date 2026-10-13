'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

// Browser-only values (localStorage, the clock) read through useSyncExternalStore so the
// server render and hydration use a stable fallback and the client value appears right
// after, without setState-in-effect cascades or hydration mismatches.

const noopSubscribe = () => () => {};

/** False during the server render and hydration, true once running in the browser. */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const STORAGE_EVENT = 'docintel:storage';

function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode / blocked storage
  }
}

/** JSON value persisted in localStorage and shared by every component using the same key. */
export function useLocalStorage<T>(key: string, fallback: T): [T, (next: T | ((previous: T) => T)) => void] {
  const [initial] = useState(fallback);
  const raw = useSyncExternalStore(subscribeStorage, () => readStorage(key), () => null);

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const setValue = useCallback((next: T | ((previous: T) => T)) => {
    const stored = readStorage(key);
    let current = initial;
    if (stored !== null) {
      try { current = JSON.parse(stored) as T; } catch { /* keep fallback */ }
    }
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current) : next;
    try {
      localStorage.setItem(key, JSON.stringify(resolved));
    } catch { /* storage unavailable: value just won't persist */ }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, [key, initial]);

  return [value, setValue];
}

const MINUTE = 60_000;

function subscribeMinute(callback: () => void) {
  const id = window.setInterval(callback, MINUTE);
  return () => window.clearInterval(id);
}

/** Current time rounded to the minute (0 on the server); re-renders once a minute. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => 0,
  );
}

/** "Just now", "5m ago", "3d ago", or a date — relative to `now` from useNow(). */
export function timeAgo(dateStr: string | undefined, now: number): string {
  if (!dateStr || !now) return '';
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((now - then) / MINUTE);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
