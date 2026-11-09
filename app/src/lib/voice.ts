import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { notify } from './dialogs';

type SpeechModule = typeof import('expo-speech-recognition');

// The speech module is native code that Expo Go doesn't ship, so load it
// lazily: in Expo Go the mic button simply doesn't appear.
let speech: SpeechModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  speech = require('expo-speech-recognition') as SpeechModule;
} catch {
  speech = null;
}

// On web this uses the browser's speech recognition, which not every browser has.
const MIC_OFF =
  Platform.OS === 'web'
    ? 'Allow microphone access for this page to speak your memories.'
    : 'Allow microphone and speech recognition for Memory Garden in Settings to speak your memories.';

export const voiceAvailable =
  speech !== null && (Platform.OS !== 'web' || speech.ExpoSpeechRecognitionModule.isRecognitionAvailable());

/**
 * Speak-to-write. `onTranscript` receives the whole transcript of the current
 * listening session each time it updates (interim results included).
 */
export function useDictation(onTranscript: (spoken: string) => void) {
  const [listening, setListening] = useState(false);
  const latest = useRef(onTranscript);
  useEffect(() => {
    latest.current = onTranscript;
  });

  useEffect(() => {
    if (!speech) return;
    const M = speech.ExpoSpeechRecognitionModule;
    const subs = [
      M.addListener('start', () => setListening(true)),
      M.addListener('end', () => {
        setListening(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }),
      M.addListener('result', (e) => latest.current(e.results[0]?.transcript ?? '')),
      M.addListener('error', (e) => {
        setListening(false);
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          notify('Microphone is off', MIC_OFF);
        } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
          notify("Couldn't listen", e.message || 'Speech recognition is unavailable right now.');
        }
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      M.abort();
    };
  }, []);

  const start = async () => {
    if (!speech) return;
    // The iOS Simulator's audio input aborts the app when opened, so don't try there.
    if (Platform.OS !== 'web' && !Device.isDevice) {
      notify('Use a real phone', "Speaking a memory needs a device's microphone. It isn't available in the simulator.");
      return;
    }
    const M = speech.ExpoSpeechRecognitionModule;
    const perm = await M.requestPermissionsAsync();
    if (!perm.granted) {
      notify('Microphone is off', MIC_OFF);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    M.start({ interimResults: true, continuous: true, addsPunctuation: true });
  };

  const stop = () => speech?.ExpoSpeechRecognitionModule.stop();
  const abort = () => speech?.ExpoSpeechRecognitionModule.abort();

  return { listening, start, stop, abort };
}
