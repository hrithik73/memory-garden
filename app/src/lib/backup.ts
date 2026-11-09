import { Platform, Share } from 'react-native';
import { todayKey } from './dates';
import type { Memories } from './storage';

/** Save a JSON backup: the share sheet on a phone, a file download in a browser. */
export async function exportBackup(memories: Memories) {
  const json = JSON.stringify(memories, null, 2);
  if (Platform.OS !== 'web') {
    await Share.share({ title: 'Memory Garden backup', message: json }).catch(() => {});
    return;
  }
  const name = `memory-garden-${todayKey()}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  // home-screen web apps on iOS can't download files, so use the share sheet there
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Memory Garden backup' }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
