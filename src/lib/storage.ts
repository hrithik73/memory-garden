import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from './dialogs';

export type Memory = { text: string; updated: number };
export type Memories = Record<string, Memory>;

const KEY = 'memory-garden-v1';
const DRAFT_KEY = 'memory-garden-draft';
export const MAX_LEN = 2000;

/** Keep only well-formed entries; anything else in the data is dropped. */
function sanitize(data: unknown): Memories {
  const out: Memories = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
    const { text, updated } = v as Partial<Memory>;
    if (typeof text !== 'string' || !text.trim()) continue;
    out[k] = {
      text: text.trim().slice(0, MAX_LEN),
      updated: typeof updated === 'number' && Number.isFinite(updated) ? updated : 0,
    };
  }
  return out;
}

export function useMemories() {
  const [memories, setMemories] = useState<Memories>({});
  const [ready, setReady] = useState(false);
  const latest = useRef<Memories>({});
  // Never write until we know what's already saved, so a failed read can't be overwritten.
  const canSave = useRef(false);

  useEffect(() => {
    (async () => {
      let raw: string | null;
      try {
        raw = await AsyncStorage.getItem(KEY);
      } catch {
        notify("Couldn't open your garden", 'Your memories could not be read, so nothing will be saved until the app is reopened.');
        return;
      }
      let loaded: Memories = {};
      if (raw) {
        try {
          loaded = sanitize(JSON.parse(raw));
        } catch {
          // keep the unreadable data untouched under another key before anything new is saved
          try {
            await AsyncStorage.setItem(`${KEY}-unreadable-${Date.now()}`, raw);
          } catch {
            notify("Couldn't open your garden", 'Your saved memories could not be read, so nothing will be saved until the app is reopened.');
            return;
          }
          notify('Some memories could not be read', 'A copy of the saved data was kept aside so nothing is lost.');
        }
      }
      latest.current = loaded;
      setMemories(loaded);
      canSave.current = true;
    })().finally(() => setReady(true));
  }, []);

  const save = useCallback((next: Memories) => {
    latest.current = next;
    setMemories(next);
    if (canSave.current) AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const put = useCallback(
    (key: string, text: string) => {
      const next = { ...latest.current };
      const clean = text.trim();
      if (clean) next[key] = { text: clean.slice(0, MAX_LEN), updated: Date.now() };
      else delete next[key];
      save(next);
    },
    [save],
  );

  /**
   * Merge a backup file (same format as export). For a day that exists in both,
   * the more recently edited version wins. Returns how many days were added or updated.
   */
  const importBackup = useCallback(
    (data: unknown) => {
      const incoming = sanitize(data);
      const next = { ...latest.current };
      let changed = 0;
      for (const [k, m] of Object.entries(incoming)) {
        const mine = next[k];
        if (mine && (mine.updated >= m.updated || mine.text === m.text)) continue;
        next[k] = m;
        changed++;
      }
      if (changed) save(next);
      return { changed, total: Object.keys(incoming).length };
    },
    [save],
  );

  return { memories, ready, put, importBackup };
}

/** The memory being written, kept so it survives the app being closed mid-sentence. */
export type Draft = { day: string; text: string };

export async function loadDraft(): Promise<Draft | null> {
  try {
    const d = JSON.parse((await AsyncStorage.getItem(DRAFT_KEY)) ?? 'null');
    return d && typeof d.day === 'string' && typeof d.text === 'string' ? d : null;
  } catch {
    return null;
  }
}

export function saveDraft(d: Draft | null) {
  (d ? AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(d)) : AsyncStorage.removeItem(DRAFT_KEY)).catch(() => {});
}
