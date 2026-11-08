import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { hash, keyOf } from './dates';
import { DoodleView, HOUSE, plantFor } from './plants';
import type { Memories } from './storage';
import { F, useTheme } from './theme';

type Props = {
  memories: Memories;
  year: number;
  setYear: (y: number) => void;
  today: string;
  focus: string;
  onPick: (day: string) => void;
};

const COLS = 14;
const ROW_GAP = 6;
const PAD_TOP = 14;

export function GardenView({ memories, year, setYear, today, focus, onPick }: Props) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const cw = (Math.min(width, 430) - 32) / COLS;
  const ch = cw * 1.25;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewH, setViewH] = useState(0);

  const nowYear = Number(today.slice(0, 4));
  const firstYear = useMemo(() => {
    const ys = Object.keys(memories).map((k) => Number(k.slice(0, 4)));
    return Math.min(nowYear, ...ys);
  }, [memories, nowYear]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) out.push(keyOf(d));
    return out;
  }, [year]);

  // keep the latest stretch of the garden in view
  useEffect(() => {
    if (!viewH) return;
    const idx = days.indexOf(focus.startsWith(String(year)) ? focus : today);
    if (idx < 0) return;
    const y = PAD_TOP + Math.floor(idx / COLS) * (ch + ROW_GAP);
    scroll.current?.scrollTo({ y: Math.max(0, y - viewH * 0.6), animated: false });
  }, [viewH, days, focus, today, year, ch]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Pressable hitSlop={10} disabled={year <= firstYear} onPress={() => setYear(year - 1)}>
          <Text style={[s.chev, { color: t.inkSoft }, year <= firstYear && s.disabled]}>‹</Text>
        </Pressable>
        <View style={[s.pill, { backgroundColor: t.ink, shadowColor: t.ink }]}>
          <Text style={[s.pillText, { color: t.bg }]}>{year}</Text>
        </View>
        <Pressable hitSlop={10} disabled={year >= nowYear} onPress={() => setYear(year + 1)}>
          <Text style={[s.chev, { color: t.inkSoft }, year >= nowYear && s.disabled]}>›</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.grid}
      >
        {days.map((k) => {
          const j = hash(k + 'j');
          const dx = (j % 7) - 3;
          const dy = ((j >> 3) % 7) - 3;
          let inner;
          if (memories[k]) inner = <DoodleView shapes={plantFor(k)} size={cw * 1.35} color={t.ink} />;
          else if (k === today) inner = <DoodleView shapes={HOUSE} size={cw * 1.15} color={t.ink} />;
          else
            inner = (
              <View
                style={[s.dot, { backgroundColor: t.ink, transform: [{ translateX: dx }, { translateY: dy }] }, k > today && { opacity: 0.35 }]}
              />
            );
          return (
            <Pressable key={k} onPress={() => onPick(k)} style={[s.cell, { width: cw, height: ch }]}>
              {inner}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 14 },
  chev: { fontFamily: F.mono, fontSize: 18, paddingHorizontal: 8, paddingVertical: 4 },
  disabled: { opacity: 0.25 },
  pill: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 6 } },
  pillText: { fontFamily: F.monoMedium, fontSize: 15, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: ROW_GAP, paddingTop: PAD_TOP, paddingBottom: 20 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});
