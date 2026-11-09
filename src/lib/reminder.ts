import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { addDays, fromKey, todayKey } from './dates';
import { notify } from './dialogs';
import type { Memories } from './storage';

/*
 * A gentle nudge each evening to plant the day's memory.
 *
 * Instead of one repeating notification, we schedule a separate one for each of the next
 * DAYS_AHEAD days and leave out any day that already has a memory, so you are never
 * reminded about a day you've already written. The schedule is rebuilt whenever memories
 * change or the app comes back to the foreground. (iOS allows 64 pending notifications.)
 *
 * Local notifications aren't available on the web, so there the reminder is simply off.
 */

export type ReminderTime = { hour: number; minute: number };

const KEY = 'memory-garden-reminder';
const DAYS_AHEAD = 30;
export const reminderSupported = Platform.OS !== 'web';

const CHOICES: ReminderTime[] = [
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
  { hour: 22, minute: 0 },
];

const LINES = [
  'What is one thing from today worth keeping?',
  "Plant today's memory before it slips away.",
  'A small moment from today, written down.',
  'Your garden is waiting for today.',
];

if (reminderSupported) {
  // the app is already open, so there's no need to show the banner on top of it
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** "9 pm", "9:30 pm" */
export function timeLabel({ hour, minute }: ReminderTime) {
  const h = hour % 12 || 12;
  const m = minute ? `:${String(minute).padStart(2, '0')}` : '';
  return `${h}${m} ${hour < 12 ? 'am' : 'pm'}`;
}

async function reschedule(time: ReminderTime | null, memories: Memories) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!time) return;
  const now = Date.now();
  const today = todayKey();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    if (memories[day]) continue;
    const date = fromKey(day);
    date.setHours(time.hour, time.minute, 0, 0);
    if (date.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Memory Garden', body: LINES[i % LINES.length], data: { kind: 'reminder' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'reminder' },
    });
  }
}

async function askPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminder', {
      name: 'Daily reminder',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return asked.granted;
}

let queue: Promise<void> = Promise.resolve();

export function useReminder(memories: Memories) {
  const [time, setTime] = useState<ReminderTime | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!reminderSupported) return;
    AsyncStorage.getItem(KEY)
      .then((s) => s && setTime(JSON.parse(s)))
      .catch(() => {})
      .finally(() => setLoaded(true));
    // rebuild the schedule when the app returns, so it never runs out
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setActive((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  // only which upcoming days are written matters to the schedule, not the text itself
  const written = useMemo(() => {
    const today = todayKey();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => (memories[addDays(today, i)] ? '1' : '0')).join('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memories, active]);

  useEffect(() => {
    if (!reminderSupported || !loaded) return;
    // run one at a time, so overlapping rebuilds can't schedule the same day twice
    queue = queue.then(() => reschedule(time, memories)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, written, loaded]);

  const save = useCallback(async (next: ReminderTime | null) => {
    if (next && !(await askPermission())) {
      notify('Notifications are off', 'To get a daily reminder, allow notifications for Memory Garden in Settings.');
      return;
    }
    setTime(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  /** Ask when to be reminded (or to stop). */
  const choose = useCallback(() => {
    Alert.alert('Daily reminder', 'A nudge in the evening, only on days you haven’t written yet.', [
      ...CHOICES.map((c) => ({ text: timeLabel(c), onPress: () => save(c) })),
      ...(time ? [{ text: 'Turn off', style: 'destructive' as const, onPress: () => save(null) }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [save, time]);

  return { time, choose };
}

/**
 * Calls `onTap` when the person opens the app from a reminder (including a cold start).
 * Waits until `enabled`, so the app can finish loading first.
 */
export function useReminderTap(enabled: boolean, onTap: () => void) {
  const latest = useRef(onTap);
  useEffect(() => {
    latest.current = onTap;
  });

  useEffect(() => {
    if (!reminderSupported || !enabled) return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      if (r?.notification.request.content.data?.kind !== 'reminder') return;
      // forget it, so the next ordinary launch doesn't open the editor again
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      latest.current();
    };
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [enabled]);
}
