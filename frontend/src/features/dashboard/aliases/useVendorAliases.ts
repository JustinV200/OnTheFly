/* Loads vendor alias suggestions and applies the owner's merge or dismiss decision.
   Each action reloads the list, so a resolved suggestion disappears only once the backend confirms it. */
import { useCallback, useEffect, useState } from 'react';

import { ApiError, get, post } from '../../../shared/api/client';
import type { FlyBrainAttribution } from '../../../shared/flybrain/types';
import type { VendorAliasListResponse, VendorAliasPair, VendorAliasSuggestion } from './types';

interface UseVendorAliasesResult {
  suggestions: VendorAliasSuggestion[];
  attributions: FlyBrainAttribution[];
  error: string | null;
  pendingAliasId: string | null;
  merge: (suggestion: VendorAliasSuggestion) => Promise<boolean>;
  dismiss: (suggestion: VendorAliasSuggestion) => Promise<void>;
}

/** Fetch suggestions for the acting owner and expose merge/dismiss actions. */
export function useVendorAliases(): UseVendorAliasesResult {
  const [suggestions, setSuggestions] = useState<VendorAliasSuggestion[]>([]);
  const [attributions, setAttributions] = useState<FlyBrainAttribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingAliasId, setPendingAliasId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const response = await get<VendorAliasListResponse>('/api/vendor-aliases');
      setSuggestions(response.suggestions);
      setAttributions(response.fly_brain);
      setError(null);
    } catch (caught) {
      setError(describeError(caught, 'Could not load duplicate-vendor suggestions.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (path: string, suggestion: VendorAliasSuggestion, failure: string): Promise<boolean> => {
    setPendingAliasId(suggestion.alias.expense_id);
    try {
      await post<unknown>(path, toPair(suggestion));
      await load();
      return true;
    } catch (caught) {
      setError(describeError(caught, failure));
      return false;
    } finally {
      setPendingAliasId(null);
    }
  };

  const merge = (suggestion: VendorAliasSuggestion): Promise<boolean> =>
    runAction('/api/vendor-aliases/merge', suggestion, 'The merge did not go through.');

  const dismiss = async (suggestion: VendorAliasSuggestion): Promise<void> => {
    await runAction('/api/vendor-aliases/dismiss', suggestion, 'Could not dismiss that suggestion.');
  };

  return { suggestions, attributions, error, pendingAliasId, merge, dismiss };
}

function toPair(suggestion: VendorAliasSuggestion): VendorAliasPair {
  return {
    alias_expense_id: suggestion.alias.expense_id,
    canonical_expense_id: suggestion.canonical.expense_id,
  };
}

function describeError(caught: unknown, fallback: string): string {
  // The backend's refusal text (e.g. "has listing history") tells the owner what to do next.
  return caught instanceof ApiError ? `${fallback} ${caught.message}` : fallback;
}
