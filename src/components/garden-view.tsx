import * as Haptics from 'expo-haptics';
import { type ComponentRef, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { keyOf, tipDate } from '../lib/dates';
import { EASE_OUT, SPRING_FOLLOW, SPRING_SETTLE, SPRING_SNAP } from '../lib/motion';
import { type CellKind, GardenCanvas } from './garden-canvas';
import { plantIndex } from './plants';
import type { Memories } from '../lib/storage';
import { F, useTheme } from '../lib/theme';

type Props = {
  memories: Memories;
  year: number;
  setYear: (y: number) => void;
  today: string;
  focus: string;
  onPick: (day: string) => void;
  /** a day that was just given its first memory: its plant draws itself in, then onGrown is called */
  justPlanted: string | null;
  onGrown: () => void;
};

const COLS = 14;
const ROW_GAP = 6;
const PAD_TOP = 14;
const PAD_BOTTOM = 20;
const TIP_W = 170; // with a memory preview
const TIP_W_DATE = 112; // date only

export function GardenView({ memories, year, setYear, today, focus, onPick, justPlanted, onGrown }: Props) {
  const t = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const cw = (Math.min(width, 430) - 32) / COLS;
  const ch = cw * 1.25;
  const gridW = cw * COLS;
  // stable callbacks, so moving the date label doesn't re-render all 365 days
  const pickRef = useRef(onPick);
  useEffect(() => {
    pickRef.current = onPick;
  });
  const pick = useCallback((k: string) => pickRef.current(k), []);
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
  const rows = Math.ceil(days.length / COLS);
  const gridH = PAD_TOP + rows * ch + (rows - 1) * ROW_GAP + PAD_BOTTOM;

  const kinds = useMemo<CellKind[]>(
    () => days.map((k) => (memories[k] ? plantIndex(k) : k === today ? 'today' : k > today ? 'future' : 'past')),
    [days, memories, today],
  );

  // ---- motion, all on the UI thread ----
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);
  const active = useSharedValue(0);
  const pressIdx = useSharedValue(-1);
  const press = useSharedValue(0);
  const intro = useSharedValue(1);
  // start a just-planted day undrawn, so it doesn't flash in fully before growing
  const plantedAt = justPlanted ? days.indexOf(justPlanted) : -1;
  const growIdx = useSharedValue(plantedAt);
  const grow = useSharedValue(plantedAt >= 0 ? 0 : 1);
  /** the day under the finger (or mouse), -1 when none */
  const tipIdx = useSharedValue(-1);

  // index (into `days`) of the day the date label shows; React only hears about it when the day changes
  const [tip, setTip] = useState<number | null>(null);
  const showTip = useCallback((i: number) => {
    if (i >= 0) Haptics.selectionAsync().catch(() => {});
    setTip(i >= 0 ? i : null);
  }, []);
  useAnimatedReaction(
    () => tipIdx.get(),
    (i, prev) => {
      if (i !== prev) scheduleOnRN(showTip, i);
    },
  );

  const scrub = useMemo(() => {
    const n = days.length;
    const dayAt = (x: number, y: number) => {
      'worklet';
      const col = Math.min(COLS - 1, Math.max(0, Math.floor(x / cw)));
      const row = Math.max(0, Math.floor((y - PAD_TOP + ROW_GAP / 2) / (ch + ROW_GAP)));
      return Math.min(n - 1, row * COLS + col);
    };
    // press and hold, then slide: nearby days swell and lean away, and the date label follows
    return Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart((e) => {
        fx.set(e.x);
        fy.set(e.y);
        active.set(withSpring(1, SPRING_SNAP));
        tipIdx.set(dayAt(e.x, e.y));
      })
      .onUpdate((e) => {
        fx.set(e.x);
        fy.set(e.y);
        tipIdx.set(dayAt(e.x, e.y));
      })
      .onFinalize(() => {
        active.set(withSpring(0, SPRING_SNAP));
        tipIdx.set(-1);
      });
  }, [cw, ch, days.length, fx, fy, active, tipIdx]);

  // web: hovering with a mouse shows the date, and the lens glides to the day under the pointer
  const hoverIn = useCallback(
    (i: number) => {
      const x = (i % COLS) * cw + cw / 2;
      const y = PAD_TOP + Math.floor(i / COLS) * (ch + ROW_GAP) + ch / 2;
      const fresh = active.get() < 0.05;
      fx.set(fresh ? x : withSpring(x, SPRING_FOLLOW));
      fy.set(fresh ? y : withSpring(y, SPRING_FOLLOW));
      active.set(withSpring(0.6, SPRING_SETTLE));
      tipIdx.set(i);
    },
    [cw, ch, fx, fy, active, tipIdx],
  );
  const hoverOut = useCallback(
    (i: number) => {
      if (tipIdx.get() !== i) return;
      active.set(withSpring(0, SPRING_SETTLE));
      tipIdx.set(-1);
    },
    [active, tipIdx],
  );

  // a quick dip on the day being tapped
  const pressIn = useCallback(
    (i: number) => {
      pressIdx.set(i);
      press.set(withTiming(1, { duration: 120, easing: EASE_OUT }));
    },
    [pressIdx, press],
  );
  const pressOut = useCallback(() => press.set(withTiming(0, { duration: 150, easing: EASE_OUT })), [press]);

  // a new year's garden comes in row by row (not on first show: switching views happens too often)
  const shownYear = useRef(year);
  useEffect(() => {
    if (shownYear.current === year) return;
    shownYear.current = year;
    intro.set(0);
    intro.set(withTiming(1, { duration: 350, easing: EASE_OUT }));
  }, [year, intro]);

  // the plant for a newly written memory draws itself in, once
  const grownRef = useRef(onGrown);
  useEffect(() => {
    grownRef.current = onGrown;
  });
  const done = useCallback(() => grownRef.current(), []);
  useEffect(() => {
    const i = justPlanted ? days.indexOf(justPlanted) : -1;
    if (i < 0) return;
    growIdx.set(i);
    grow.set(0);
    grow.set(
      withDelay(
        250,
        withTiming(1, { duration: reduced ? 200 : 900, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(done);
        }),
      ),
    );
  }, [justPlanted, days, growIdx, grow, reduced, done]);

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
        <GestureDetector gesture={scrub}>
          {/* a fixed width (plus a hair of slack for rounding) keeps exactly COLS days per row on any screen */}
          <View style={[s.grid, { width: gridW + 1 }]}>
            <GardenCanvas
              kinds={kinds}
              cols={COLS}
              cw={cw}
              ch={ch}
              rowGap={ROW_GAP}
              padTop={PAD_TOP}
              width={gridW + 1}
              height={gridH}
              color={t.ink}
              reduced={reduced}
              fx={fx}
              fy={fy}
              active={active}
              pressIdx={pressIdx}
              press={press}
              intro={intro}
              growIdx={growIdx}
              grow={grow}
            />
            {/* the canvas draws the days; these invisible cells take taps, hovers and screen readers */}
            {days.map((k, i) => (
              <Cell
                key={k}
                day={k}
                index={i}
                isToday={k === today}
                hasMemory={!!memories[k]}
                cw={cw}
                ch={ch}
                onPick={pick}
                onPressIn={pressIn}
                onPressOut={pressOut}
                onHoverIn={hoverIn}
                onHoverOut={hoverOut}
              />
            ))}
            <Tip
              index={tip}
              days={days}
              memories={memories}
              cw={cw}
              ch={ch}
              gridW={gridW}
              ink={t.ink}
              bg={t.bg}
              reduced={reduced}
            />
          </View>
        </GestureDetector>
      </ScrollView>
    </View>
  );
}

type CellProps = {
  day: string;
  index: number;
  isToday: boolean;
  hasMemory: boolean;
  cw: number;
  ch: number;
  onPick: (day: string) => void;
  onPressIn: (i: number) => void;
  onPressOut: () => void;
  onHoverIn: (i: number) => void;
  onHoverOut: (i: number) => void;
};

const Cell = memo(function Cell({ day, index, isToday, hasMemory, cw, ch, onPick, onPressIn, onPressOut, onHoverIn, onHoverOut }: CellProps) {
  return (
    <Pressable
      onPress={() => onPick(day)}
      onPressIn={() => onPressIn(index)}
      onPressOut={onPressOut}
      onHoverIn={() => onHoverIn(index)}
      onHoverOut={() => onHoverOut(index)}
      accessibilityRole="button"
      accessibilityLabel={`${tipDate(day)}${isToday ? ', today' : ''}${hasMemory ? ', memory planted' : ''}`}
      style={{ width: cw, height: ch }}
    />
  );
});

type TipProps = {
  index: number | null;
  days: string[];
  memories: Memories;
  cw: number;
  ch: number;
  gridW: number;
  ink: string;
  bg: string;
  reduced: boolean;
};

/** The date label above the finger. It glides from day to day and fades out after the finger lifts. */
function Tip({ index, days, memories, cw, ch, gridW, ink, bg, reduced }: TipProps) {
  // keep showing the last day while fading out
  const [last, setLast] = useState<number | null>(index);
  if (index !== null && index !== last) setLast(index);
  const shown = index ?? last;

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const vis = useSharedValue(0);

  const key = shown === null ? null : days[shown];
  const m = key ? memories[key] : undefined;
  const tipW = m ? TIP_W : TIP_W_DATE;

  useEffect(() => {
    if (index === null) {
      vis.set(withTiming(0, { duration: 150, easing: EASE_OUT }));
      return;
    }
    const cx = (index % COLS) * cw + cw / 2;
    const left = Math.min(Math.max(cx - tipW / 2, 0), gridW - tipW);
    // sit well above the finger
    const top = PAD_TOP + Math.floor(index / COLS) * (ch + ROW_GAP) - (m ? 64 : 46);
    const appearing = vis.get() < 0.05;
    x.set(appearing || reduced ? left : withSpring(left, SPRING_FOLLOW));
    y.set(appearing || reduced ? top : withSpring(top, SPRING_FOLLOW));
    vis.set(withTiming(1, { duration: 150, easing: EASE_OUT }));
  }, [index, cw, ch, gridW, tipW, m, reduced, x, y, vis]);

  const style = useAnimatedStyle(() => ({
    opacity: vis.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: reduced ? 1 : 0.95 + 0.05 * vis.get() }],
  }));

  if (!key) return null;
  return (
    <Animated.View pointerEvents="none" style={[s.tip, { backgroundColor: ink, width: tipW }, style]}>
      <Text style={[s.tipDate, { color: bg }]}>{tipDate(key)}</Text>
      {m && (
        <Text numberOfLines={1} style={[s.tipText, { color: bg }]}>
          {m.text}
        </Text>
      )}
    </Animated.View>
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
  grid: { alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', rowGap: ROW_GAP, paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM },
  tip: {
    position: 'absolute',
    left: 0,
    top: 0,
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
