import { API_URL } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';

// Answers can take several model calls and uploads can be 25 MB, so allow up to two minutes.
const DEFAULT_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

/** Human-readable text from a FastAPI error body (`detail` may be a string or a list of issues). */
function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  if (status === 403) return 'You don’t have access to this.';
  if (status === 404) return 'Not found.';
  if (status === 429) return 'Too many requests — please wait a moment and try again.';
  if (status >= 500) return 'The server ran into a problem. Please try again.';
  return `Request failed (HTTP ${status}).`;
}

/** Full page navigation to sign-in: clears in-memory state from the expired session. */
function goToLogin(): Promise<never> {
  if (typeof window !== 'undefined') {
    const next = window.location.pathname + window.location.search;
    window.location.assign(new URL(`/login?next=${encodeURIComponent(next)}`, window.location.origin).href);
  }
  return new Promise<never>(() => {}); // the page is unloading; never settle
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const supabase = createClient();
  let { data: { session } } = await supabase.auth.getSession();

  if (isRetry) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) return goToLogin();
    session = refreshData.session;
  }

  const headers = new Headers(options?.headers);
  // FormData bodies need the browser to set Content-Type with the multipart boundary.
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      throw new ApiError(0, null, 'The request took too long. Please try again.');
    }
    throw new ApiError(0, null, 'Can’t reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401) {
      if (!isRetry) return apiFetch<T>(path, options, true);
      return goToLogin();
    }
    const data = await res.json().catch(() => ({})) as { detail?: unknown };
    throw new ApiError(res.status, data.detail, errorMessage(data.detail, res.status));
  }

  return res.json() as Promise<T>;
}
