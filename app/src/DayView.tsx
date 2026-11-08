import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { addDays, pretty, short } from './dates';
import { DoodleView, HOUSE, PLUS, plantFor } from './plants';
import type { Memories } from './storage';
import { F, useTheme } from './theme';

type Props = {
  day: string;
  setDay: (d: string) => void;
  today: string;
  memories: Memories;
  put: (day: string, text: string) => void;
  editing: boolean;
  setEditing: (e: boolean) => void;
};

export function DayView({ day, setDay, today, memories, put, editing, setEditing }: Props) {
  const t = useTheme();
  const memory = memories[day];
  const [draft, setDraft] = useState('');
  const future = day > today;

  // horizontal swipe between days
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !editing && Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          const next = addDays(day, g.dx < 0 ? 1 : -1);
          if (Math.abs(g.dx) < 50 || next > today) return;
          Haptics.selectionAsync().catch(() => {});
          setDay(next);
        },
      }),
    [day, editing, today, setDay],
  );

  const startEdit = () => {
    setDraft(memory?.text ?? '');
    setEditing(true);
  };
  const commit = () => {
    put(day, draft);
    setEditing(false);
    if (draft.trim()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const remove = () =>
    Alert.alert('Remove this memory?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          put(day, '');
          setEditing(false);
        },
      },
    ]);

  const dateLine = <Text style={[s.dateLine, { color: t.inkSoft }]}>{pretty(day)}</Text>;

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      <View style={s.header}>
        <Pressable
          onPress={() => !editing && setDay(today)}
          style={[s.pill, { backgroundColor: t.pill, borderColor: t.pillBorder }]}
        >
          <Text style={[s.pillText, { color: t.ink }]}>{day === today ? 'today' : short(day)}</Text>
        </Pressable>
      </View>

      <View style={s.strip}>
        {[-3, -2, -1, 0, 1, 2, 3].map((i) => {
          const k = addDays(day, i);
          if (k > today) return <View key={k} style={s.slot} />;
          const sel = k === day;
          return (
            <Pressable
              key={k}
              disabled={editing}
              onPress={() => setDay(k)}
              style={[s.slot, { opacity: sel ? 1 : 0.4, transform: [{ scale: sel ? 1.1 : 1 }] }]}
            >
              {memories[k] ? (
                <DoodleView shapes={plantFor(k)} size={38} color={t.ink} />
              ) : k === today ? (
                <DoodleView shapes={HOUSE} size={38} color={t.ink} />
              ) : (
                <View style={[s.dot, { backgroundColor: t.ink }]} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={s.center}>
        {editing ? (
          <View style={s.full}>
            {dateLine}
            <TextInput
              autoFocus
              multiline
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a memory..."
              placeholderTextColor={t.inkSoft}
              selectionColor={t.ink}
              maxLength={2000}
              style={[s.input, { color: t.ink }]}
            />
            <View style={s.doneRow}>
              {memory && (
                <Pressable onPress={remove} hitSlop={8}>
                  <Text style={[s.ghost, { color: t.inkSoft }]}>remove</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setEditing(false)} hitSlop={8}>
                <Text style={[s.ghost, { color: t.inkSoft }]}>cancel</Text>
              </Pressable>
              <Pressable onPress={commit} style={({ pressed }) => [s.done, { backgroundColor: t.ink }, pressed && { opacity: 0.85 }]}>
                <Text style={[s.doneText, { color: t.bg }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        ) : memory ? (
          <Pressable onPress={startEdit} style={s.full}>
            {dateLine}
            <Text style={[s.memory, { color: t.ink }]}>{memory.text}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={startEdit} disabled={future} style={[s.plantBtn, future && { opacity: 0.35 }]}>
            <DoodleView shapes={PLUS} size={56} color={t.ink} />
            <Text style={[s.plantText, { color: t.ink }]}>{future ? 'not yet' : 'plant memory'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 14 },
  pill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  pillText: { fontFamily: F.monoMedium, fontSize: 13, lineHeight: 15 },
  strip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 56 },
  slot: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingBottom: 40 },
  full: { width: '100%' },
  dateLine: { fontFamily: F.mono, fontSize: 12, marginBottom: 10 },
  memory: { fontFamily: F.mono, fontSize: 15, lineHeight: 22 },
  input: { fontFamily: F.mono, fontSize: 16, lineHeight: 23, minHeight: 120, padding: 0, textAlignVertical: 'top' },
  doneRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12 },
  ghost: { fontFamily: F.mono, fontSize: 13 },
  done: { borderRadius: 9, paddingHorizontal: 16, paddingTop: 5, paddingBottom: 3 },
  doneText: { fontFamily: F.hand, fontSize: 19, lineHeight: 24 },
  plantBtn: { alignItems: 'center', gap: 10 },
  plantText: { fontFamily: F.monoMedium, fontSize: 15 },
});
