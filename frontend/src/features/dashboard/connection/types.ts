/* Declares the connection status and import result shapes (backend app/api/connection). */
export interface ConnectionStatus {
  status: 'not_connected' | 'connected_not_imported' | 'imported';
  provider: string | null;
  provider_account_id: string | null;
  transaction_count: number;
  excluded_count: number;
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
