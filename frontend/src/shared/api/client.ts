/* Wraps fetch with typed helpers and the acting-account header.
   This module owns HTTP error parsing, so every failure reaches features as one ApiError shape. */
import { actingAccountStore } from '../account/actingAccountStore';
import type { ErrorEnvelope } from './types';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

// Status used when no HTTP response arrived at all (network down, DNS, CORS rejection).
export const NETWORK_FAILURE_STATUS = 0;

export class ApiError extends Error {
  public readonly envelope: ErrorEnvelope;
  public readonly status: number;

  public constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.detail ?? envelope.error);
    this.envelope = envelope;
    this.status = status;
  }
}

/** Fetch JSON from the API with the acting-account header; every failure throws ApiError. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // A public visitor sends no header at all, which is exactly what a stranger's browser does.
  const actingAccountId = actingAccountStore.read();
  if (actingAccountId) {
    headers.set('X-Account-ID', actingAccountId);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (cause) {
    console.error('API request failed before a response arrived', cause);
    throw new ApiError(NETWORK_FAILURE_STATUS, {
      error: 'network_error',
      detail: `Could not reach the API at ${API_BASE_URL}. It may be down, or this network may be blocking it.`,
    });
  }

  const payload = parseJson(await response.text());
  if (!response.ok) {
    throw new ApiError(response.status, toEnvelope(response.status, payload));
  }
  if (payload === undefined) {
    throw new ApiError(response.status, {
      error: 'invalid_response',
      detail: 'The API answered with something other than JSON (often a proxy or host error page).',
    });
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

function parseJson(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    // A non-JSON body is reported by the caller as invalid_response, not swallowed.
    console.warn('API response body was not JSON', error);
    return undefined;
  }
}

function toEnvelope(status: number, payload: unknown): ErrorEnvelope {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string') {
      return { error: record.error, detail: typeof record.detail === 'string' ? record.detail : null };
    }
    // FastAPI's request-validation errors arrive as {"detail": [{loc, msg}, ...]}, outside our envelope.
    if (Array.isArray(record.detail)) {
      const messages = record.detail.map((item) => {
        const entry = item as { loc?: unknown[]; msg?: string };
        return `${(entry.loc ?? []).slice(1).join('.')}: ${entry.msg ?? 'invalid'}`;
      });
      return { error: 'validation_error', detail: `The request was invalid (${messages.join('; ')}).` };
    }
  }
  return { error: 'http_error', detail: `The API answered with HTTP ${status}.` };
}
