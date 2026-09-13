/* Remembers how this viewer likes the fly brain dock: minimized to its labelled pill (the default, so a run never covers
   page content uninvited) or open as a panel, and whether that panel is the larger one. A device preference like the
   theme, kept in localStorage; storage failures degrade to the minimized pill, which still states that a run exists. */
import { useCallback, useState } from 'react';

export interface DockPreference {
  isMinimized: boolean;
  isExpanded: boolean;
}

const STORAGE_KEY = 'flyBrainDock';
const DEFAULT_PREFERENCE: DockPreference = { isMinimized: true, isExpanded: false };

/** Return the stored preference and a setter that merges a change and stores it. */
export function useDockPreference(): [DockPreference, (change: Partial<DockPreference>) => void] {
  const [preference, setPreference] = useState<DockPreference>(readPreference);

  const update = useCallback((change: Partial<DockPreference>): void => {
    setPreference((current) => {
      const next = { ...current, ...change };
      writePreference(next);
      return next;
    });
  }, []);

  return [preference, update];
}

function readPreference(): DockPreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? DEFAULT_PREFERENCE : parsePreference(JSON.parse(stored));
  } catch (error) {
    // Unreadable storage or a corrupt value: the pill is the safe start, since it covers nothing and still labels the run.
    console.warn('Could not read the fly brain dock preference; starting minimized', error);
    return DEFAULT_PREFERENCE;
  }
}

function parsePreference(value: unknown): DockPreference {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_PREFERENCE;
  }
  const candidate = value as Record<string, unknown>;
  return {
    isMinimized: typeof candidate.isMinimized === 'boolean' ? candidate.isMinimized : DEFAULT_PREFERENCE.isMinimized,
    isExpanded: typeof candidate.isExpanded === 'boolean' ? candidate.isExpanded : DEFAULT_PREFERENCE.isExpanded,
  };
}

function writePreference(preference: DockPreference): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    // The dock still changes for this visit; only remembering it failed.
    console.warn('Could not store the fly brain dock preference; it will reset on reload', error);
  }
}
