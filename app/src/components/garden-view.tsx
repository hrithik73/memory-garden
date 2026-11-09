import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { keyOf, tipDate } from '../lib/dates';
import { DoodleView, HOUSE, plantFor } from './plants';
import type { Memories } from '../lib/storage';
import { F, useTheme } from '../lib/theme';

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
const TIP_W = 170; // with a memory preview
const TIP_W_DATE = 112; // date only

export function GardenView({ memories, year, setYear, today, focus, onPick }: Props) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const cw = (Math.min(width, 430) - 32) / COLS;
  const ch = cw * 1.25;
  const gridW = cw * COLS;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewH, setViewH] = useState(0);
  // index (into `days`) of the day under the finger while peeking
  const [tip, setTip] = useState<number | null>(null);

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

  const tipKey = tip === null ? null : days[tip];

  // a light tick each time the label moves to another day
  useEffect(() => {
    if (tip !== null) Haptics.selectionAsync().catch(() => {});
  }, [tip]);

  const scrub = useMemo(() => {
    const dayAt = (x: number, y: number) => {
      const col = Math.min(COLS - 1, Math.max(0, Math.floor(x / cw)));
      const row = Math.max(0, Math.floor((y - PAD_TOP + ROW_GAP / 2) / (ch + ROW_GAP)));
      return Math.min(days.length - 1, row * COLS + col);
    };
    const follow = (x: number, y: number) => {
      const i = dayAt(x, y);
      setTip((prev) => (prev === i ? prev : i));
    };
    return Gesture.Pan()
      .activateAfterLongPress(250)
      .runOnJS(true)
      .onStart((e) => follow(e.x, e.y))
      .onUpdate((e) => follow(e.x, e.y))
      .onFinalize(() => setTip(null));
  }, [cw, ch, days]);

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

      <ScrollView ref={scroll} onLayout={(e) => setViewH(e.nativeEvent.layout.height)} showsVerticalScrollIndicator={false}>
        {/* press and hold, then slide: the date label follows your finger from day to day */}
        <GestureDetector gesture={scrub}>
          <View style={s.grid}>
            {days.map((k, i) => {
              let inner;
              if (memories[k]) inner = <DoodleView shapes={plantFor(k)} size={cw * 1.35} color={t.ink} />;
              else if (k === today) inner = <DoodleView shapes={HOUSE} size={cw * 1.15} color={t.ink} />;
              else inner = <View style={[s.dot, { backgroundColor: t.ink }, k > today && { opacity: 0.35 }]} />;
              return (
                <Pressable
                  key={k}
                  onPress={() => onPick(k)}
                  // web: hovering with a mouse shows the date too
                  onHoverIn={() => setTip(i)}
                  onHoverOut={() => setTip((prev) => (prev === i ? null : prev))}
                  style={[s.cell, { width: cw, height: ch }]}
                >
                  {inner}
                </Pressable>
              );
            })}
            {tipKey &&
              (() => {
                const i = tip as number;
                const m = memories[tipKey];
                const tipW = m ? TIP_W : TIP_W_DATE;
                const x = (i % COLS) * cw + cw / 2;
                const y = PAD_TOP + Math.floor(i / COLS) * (ch + ROW_GAP);
                return (
                  <View
                    pointerEvents="none"
                    style={[
                      s.tip,
                      {
                        backgroundColor: t.ink,
                        width: tipW,
                        left: Math.min(Math.max(x - tipW / 2, 0), gridW - tipW),
                        // sit well above the finger
                        top: y - (m ? 64 : 46),
                      },
                    ]}
                  >
                    <Text style={[s.tipDate, { color: t.bg }]}>{tipDate(tipKey)}</Text>
                    {m && (
                      <Text numberOfLines={1} style={[s.tipText, { color: t.bg }]}>
                        {m.text}
                      </Text>
                    )}
                  </View>
                );
              })()}
          </View>
        </GestureDetector>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 20, paddingBottom: 14 },
  chev: { fontFamily: F.mono, fontSize: 18, paddingHorizontal: 8, paddingVertical: 4 },
  disabled: { opacity: 0.25 },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
  },
  pillText: { fontFamily: F.monoMedium, fontSize: 15, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: ROW_GAP, paddingTop: PAD_TOP, paddingBottom: 20 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  tip: {
    position: 'absolute',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tipDate: { fontFamily: F.monoMedium, fontSize: 12, lineHeight: 16 },
  tipText: { fontFamily: F.mono, fontSize: 11, lineHeight: 15, opacity: 0.8, marginTop: 1 },
});
