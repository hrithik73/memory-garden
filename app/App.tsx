import { Gaegu_700Bold } from '@expo-google-fonts/gaegu';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, useFonts } from '@expo-google-fonts/ibm-plex-mono';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, AppState, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DayView } from './src/DayView';
import { GardenView } from './src/GardenView';
import { todayKey } from './src/dates';
import { DoodleView, ICON_DAY, ICON_GARDEN } from './src/plants';
import { useMemories } from './src/storage';
import { F, useTheme } from './src/theme';

type View_ = 'year' | 'day';

export default function App() {
  const [fontsLoaded] = useFonts({ IBMPlexMono_400Regular, IBMPlexMono_500Medium, Gaegu_700Bold });
  const { memories, ready, put, importBackup } = useMemories();
  const t = useTheme();
  const [today, setToday] = useState(todayKey());
  const [view, setView] = useState<View_>('year');
  const [sel, setSel] = useState(todayKey());
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState(false);

  // roll "today" over when the app comes back after midnight
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setToday(todayKey());
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const go = (v: View_) => {
    if (editing || v === view) return;
    Haptics.selectionAsync().catch(() => {});
    if (v === 'year') setYear(Number(sel.slice(0, 4)));
    setView(v);
  };

  const exportBackup = () =>
    Share.share({ title: 'Memory Garden backup', message: JSON.stringify(memories, null, 2) }).catch(() => {});

  const importFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await fetch(res.assets[0].uri).then((r) => r.text());
      const n = importBackup(JSON.parse(text));
      Alert.alert(`Imported ${n} ${n === 1 ? 'memory' : 'memories'}.`);
    } catch {
      Alert.alert('That file could not be read.');
    }
  };

  const count = Object.keys(memories).length;

  return (
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
                <Pressable onPress={exportBackup} hitSlop={6}>
                  <Text style={[s.metaText, s.link, { color: t.inkSoft }]}>export</Text>
                </Pressable>
                <Pressable onPress={importFile} hitSlop={6}>
                  <Text style={[s.metaText, s.link, { color: t.inkSoft }]}>import</Text>
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
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
