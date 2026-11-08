import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Memory = { text: string; updated: number };
export type Memories = Record<string, Memory>;

const KEY = 'memory-garden-v1';

export function useMemories() {
  const [memories, setMemories] = useState<Memories>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((s) => {
        if (s) setMemories(JSON.parse(s));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const write = useCallback((update: (prev: Memories) => Memories) => {
    setMemories((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const put = useCallback(
    (key: string, text: string) =>
      write((prev) => {
        const next = { ...prev };
        const clean = text.trim();
        if (clean) next[key] = { text: clean, updated: Date.now() };
        else delete next[key];
        return next;
      }),
    [write],
  );

  /** Merge a backup file (same format as the web export). Returns how many were imported. */
  const importBackup = useCallback(
    (data: unknown) => {
      const valid: Memories = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
          const m = v as Memory;
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && m && typeof m.text === 'string') valid[k] = m;
        }
      }
      write((prev) => ({ ...prev, ...valid }));
      return Object.keys(valid).length;
    },
    [write],
  );

  return { memories, ready, put, importBackup };
}
