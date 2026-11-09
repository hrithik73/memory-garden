// import each font from its own path so builds only bundle the weights we use
import { Gaegu_700Bold } from '@expo-google-fonts/gaegu/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { useFonts } from 'expo-font';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DayView } from './components/day-view';
import { exportBackup } from './lib/backup';
import { notify } from './lib/dialogs';
import { GardenView } from './components/garden-view';
import { todayKey } from './lib/dates';
import { DoodleView, ICON_DAY, ICON_GARDEN } from './components/plants';
import { reminderSupported, timeLabel, useReminder, useReminderTap } from './lib/reminder';
import { loadDraft, saveDraft, useMemories } from './lib/storage';
import { F, useTheme } from './lib/theme';

type View_ = 'year' | 'day';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ IBMPlexMono_400Regular, IBMPlexMono_500Medium, Gaegu_700Bold });
  const { memories, ready, put, importBackup } = useMemories();
  const reminder = useReminder(memories);
  const t = useTheme();
  const [today, setToday] = useState(todayKey());
  const [view, setView] = useState<View_>('year');
  const [sel, setSel] = useState(todayKey());
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // roll "today" over at midnight, whether the app stayed open or comes back later
  useEffect(() => {
    const check = () => setToday(todayKey());
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    const timer = setInterval(check, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  // reopen a memory that was being written when the app closed
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    loadDraft()
      .then((d) => {
        if (!d) return;
        setSel(d.day);
        setView('day');
        setDraft(d.text);
        setEditing(true);
      })
      .finally(() => setResumed(true));
  }, []);
  useEffect(() => {
    if (!resumed) return;
    const id = setTimeout(() => saveDraft(editing ? { day: sel, text: draft } : null), 300);
    return () => clearTimeout(id);
  }, [resumed, editing, sel, draft]);

  // tapping the evening reminder opens today, ready to write
  useReminderTap(ready && resumed, () => {
    if (editing) return; // don't interrupt something already being written
    const now = todayKey();
    setToday(now);
    setSel(now);
    setView('day');
    if (!memories[now]) {
      setDraft('');
      setEditing(true);
    }
  });

  // if the fonts fail to load, carry on with the system fonts rather than a blank screen
  if ((!fontsLoaded && !fontError) || !ready || !resumed) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const go = (v: View_) => {
    if (editing || v === view) return;
    Haptics.selectionAsync().catch(() => {});
    if (v === 'year') setYear(Number(sel.slice(0, 4)));
    setView(v);
  };

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await fetch(res.assets[0].uri).then((r) => r.text());
      const { changed, total } = importBackup(JSON.parse(text));
      const plural = (n: number) => `${n} ${n === 1 ? 'memory' : 'memories'}`;
      if (!total) notify('No memories found in that file.');
      else if (!changed) notify('Nothing new to import', `All ${plural(total)} in that file are already in your garden.`);
      else if (changed === total) notify(`Imported ${plural(changed)}.`);
      else notify(`Imported ${plural(changed)}.`, `${total - changed} already in your garden were kept as they are (yours were newer or the same).`);
    } catch {
      notify('That file could not be read.');
    }
  };

  const count = Object.keys(memories).length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <SafeAreaView style={[s.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.main}>
              {view === 'year' ? (
                <GardenView
                  memories={memories}
                  year={year}
                  setYear={setYear}
                  today={today}
                  focus={sel}
                  onPick={(k) => {
                    setSel(k);
                    setView('day');
                  }}
                />
              ) : (
                <DayView
                  day={sel}
                  setDay={(k) => {
                    setSel(k);
                    setEditing(false);
                  }}
                  today={today}
                  memories={memories}
                  put={put}
                  editing={editing}
                  setEditing={setEditing}
                  draft={draft}
                  setDraft={setDraft}
                />
              )}
            </View>

            {!editing && (
              <View style={s.footer}>
                <View style={[s.toggle, { backgroundColor: t.card, borderColor: t.pillBorder }]}>
                  {(['year', 'day'] as View_[]).map((v) => (
                    <Pressable
                      key={v}
                      accessibilityLabel={v === 'year' ? 'Garden view' : 'Day view'}
                      onPress={() => go(v)}
                      style={[s.toggleBtn, view === v && { backgroundColor: t.ink }]}
                    >
                      <DoodleView shapes={v === 'year' ? ICON_GARDEN : ICON_DAY} size={30} color={view === v ? t.bg : t.ink} />
                    </Pressable>
                  ))}
                </View>
                <View style={s.meta}>
                  <Text style={[s.metaText, { color: t.inkSoft }]}>
                    <Text style={{ color: t.ink, fontFamily: F.monoMedium }}>{count}</Text>
                    {count === 1 ? ' memory planted' : ' memories planted'}
                  </Text>
                  <Pressable onPress={() => exportBackup(memories)} hitSlop={6}>
                    <Text style={[s.metaText, s.link, { color: t.inkSoft }]}>export</Text>
                  </Pressable>
                  <Pressable onPress={importFile} hitSlop={6}>
                    <Text style={[s.metaText, s.link, { color: t.inkSoft }]}>import</Text>
                  </Pressable>
                  {reminderSupported && (
                    <Pressable onPress={reminder.choose} hitSlop={6} accessibilityLabel="Daily reminder">
                      <Text style={[s.metaText, s.link, { color: t.inkSoft }]}>
                        {reminder.time ? `remind ${timeLabel(reminder.time)}` : 'remind me'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  main: { flex: 1, paddingHorizontal: 16 },
  footer: { alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 18 },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, borderWidth: 1 },
  toggleBtn: { width: 44, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaText: { fontFamily: F.mono, fontSize: 12 },
  link: { textDecorationLine: 'underline' },
});
