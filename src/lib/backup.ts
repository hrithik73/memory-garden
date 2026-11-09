import { File as FsFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { todayKey } from './dates';
import type { Memories } from './storage';

/** Save a JSON backup: the share sheet on a phone, a file download in a browser. */
export async function exportBackup(memories: Memories) {
  const json = JSON.stringify(memories, null, 2);
  const name = `memory-garden-${todayKey()}.json`;
  if (Platform.OS !== 'web') {
    // a real .json file, so it can be saved to Files and imported back
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
      const file = new FsFile(Paths.cache, name);
      await file.write(json);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Memory Garden backup' });
    } catch {
      await Share.share({ title: 'Memory Garden backup', message: json }).catch(() => {});
    }
    return;
  }
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
