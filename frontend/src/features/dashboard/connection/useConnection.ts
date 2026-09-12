/* Loads the acting business's connection status and runs its import.
   The server picks the provider account, so the import request carries no account id. */
import { useState } from 'react';

import { ApiError, post } from '../../../shared/api/client';
import { ApiQueryState, useApiQuery } from '../../../shared/api/useApiQuery';
import type { ConnectionStatus, ImportResult, ImportState } from './types';

interface UseConnectionResult {
  status: ApiQueryState<ConnectionStatus>;
  importState: ImportState;
  runImport: () => Promise<void>;
}

/** Load connection status; runImport refreshes it and calls onImported after a successful run. */
export function useConnection(onImported: () => void): UseConnectionResult {
  const status = useApiQuery<ConnectionStatus>('/api/connection');
  const [importState, setImportState] = useState<ImportState>({ phase: 'idle' });

  const runImport = async (): Promise<void> => {
    setImportState({ phase: 'running' });
    try {
      const result = await post<ImportResult>('/api/connection/import');
      setImportState({ phase: 'succeeded', result });
      status.reload();
      onImported();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      setImportState({ phase: 'failed', message: error.message });
    }
  };

  return { status, importState, runImport };
}
