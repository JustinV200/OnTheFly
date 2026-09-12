/* Wraps fetch with typed helpers and the acting-account header.
   This module owns HTTP error parsing so features stay focused on UI state. */
import { getStoredActingAccountId } from '../../app/AccountSwitcher';
import type { ErrorEnvelope } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  public readonly envelope: ErrorEnvelope;
  public readonly status: number;

  public constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.detail ?? envelope.error);
    this.envelope = envelope;
    this.status = status;
  }
}

/** Fetch JSON from the API and attach the acting-account header when present. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  const actingAccountId = getStoredActingAccountId();
  if (actingAccountId) {
    headers.set('X-Account-ID', actingAccountId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json()) as T | ErrorEnvelope;

  if (!response.ok) {
    throw new ApiError(response.status, payload as ErrorEnvelope);
  }

  return payload as T;
}

/** Issue a GET request and parse the typed JSON body. */
export function get<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

/** Issue a POST request and parse the typed JSON body. */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { body: body ? JSON.stringify(body) : undefined, method: 'POST' });
}

/** Issue a PATCH request and parse the typed JSON body. */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { body: body ? JSON.stringify(body) : undefined, method: 'PATCH' });
}

/** Issue a DELETE request and parse the typed JSON body. */
export function del<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
