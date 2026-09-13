/* Declares the connection status and import result shapes (backend app/api/connection). */

/** One live link to a provider account (backend connection/linked.py). */
export interface LinkedConnection {
  provider: string;
  // Null for Stripe: the bank account id stays on the backend.
  provider_account_id: string | null;
  provenance: string;
  // Only 'connection_import' links import from ConnectionPanel; Stripe links import from StripeConnection.
  imported_through: 'connection_import' | 'stripe_sync';
}

/** Stored transactions from one provider under one provenance label (backend connection/sources.py). */
export interface ImportedSource {
  provider: string;
  source_type: string;
  transaction_count: number;
  is_connected: boolean;
}

export interface ConnectionStatus {
  status: 'not_connected' | 'connected_not_imported' | 'imported';
  connections: LinkedConnection[];
  sources: ImportedSource[];
  transaction_count: number;
  excluded_count: number;
  excluded_reasons: string[];
  provenance: string[];
  first_posted_at: string | null;
  last_posted_at: string | null;
  last_imported_at: string | null;
}

export interface ImportResult {
  new: number;
  duplicate: number;
  excluded: number;
  failed: number;
}

export type ImportState =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'succeeded'; result: ImportResult }
  | { phase: 'failed'; message: string };
