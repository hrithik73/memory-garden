import { Canvas, PaintStyle, Picture, Skia, StrokeCap, StrokeJoin, createPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';
import { LEAN_DEG, LENS_CELLS, LENS_SCALE } from '../lib/motion';
import { STROKE, housePath, plantPaths } from './plants';

/** What a day looks like: a plant (its index in plantPaths), the house for today, or a dot. */
export type CellKind = number | 'today' | 'past' | 'future';

export type GardenMotion = {
  /** finger (or mouse) position in grid coordinates */
  fx: SharedValue<number>;
  fy: SharedValue<number>;
  /** 0 → 1 while scrubbing; drives the lens and the lean */
  active: SharedValue<number>;
  /** the day being pressed, and how far into the press it is (0 → 1) */
  pressIdx: SharedValue<number>;
  press: SharedValue<number>;
  /** 0 → 1 when a new year comes in; rows arrive one after another */
  intro: SharedValue<number>;
  /** the day just planted, and how much of it has been drawn (0 → 1) */
  growIdx: SharedValue<number>;
  grow: SharedValue<number>;
};

type Props = GardenMotion & {
  kinds: CellKind[];
  cols: number;
  cw: number;
  ch: number;
  rowGap: number;
  padTop: number;
  width: number;
  height: number;
  color: string;
  reduced: boolean;
};

const WEB = Platform.OS === 'web';
const ROW_STAGGER = 0.6; // fraction of the intro spent staggering rows

/**
 * The whole year on one Skia canvas. It's one recorded picture, redrawn only when one of the
 * motion values changes, so a garden at rest costs nothing.
 */
export function GardenCanvas(props: Props) {
  const { kinds, cols, cw, ch, rowGap, padTop, width, height, color, reduced } = props;
  const { fx, fy, active, pressIdx, press, intro, growIdx, grow } = props;
  const plants = useMemo(() => plantPaths(), []);
  const house = useMemo(() => housePath(), []);
  // room around the grid so plants at the edges, enlarged by the lens, aren't clipped
  const m = cw;
  const rows = Math.ceil(kinds.length / cols);

  const picture = useDerivedValue(() => {
    const radius = LENS_CELLS * cw;
    const x0 = fx.get();
    const y0 = fy.get();
    const on = reduced ? 0 : active.get();
    const pi = pressIdx.get();
    const pr = reduced ? 0 : press.get();
    const it = intro.get();
    const gi = growIdx.get();
    const g = grow.get();

    const ink = Skia.Color(color);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(ink);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(STROKE);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    const dot = Skia.Paint();
    dot.setAntiAlias(true);
    dot.setColor(ink);

    return createPicture(
      (canvas) => {
        canvas.translate(m, m);
        for (let i = 0; i < kinds.length; i++) {
          const kind = kinds[i];
          const row = Math.floor(i / cols);
          const cx = (i % cols) * cw + cw / 2;
          const cy = padTop + row * (ch + rowGap) + ch / 2;

          // new year: each row fades and settles in a little after the one above
          let alpha = 1;
          let scale = 1;
          if (it < 1) {
            const start = (row / Math.max(1, rows - 1)) * ROW_STAGGER;
            const t = Math.min(1, Math.max(0, (it - start) / (1 - ROW_STAGGER)));
            alpha = t;
            if (!reduced) scale = 0.92 + 0.08 * t;
          }

          // scrub lens: days near the finger grow, and plants lean away from it
          let lean = 0;
          if (on > 0) {
            const dx = cx - x0;
            const dy = cy - y0;
            const d = Math.sqrt(dx * dx + dy * dy);
            const t = Math.max(0, 1 - d / radius);
            const f = t * t * (3 - 2 * t) * on;
            scale *= 1 + (LENS_SCALE - 1) * f;
            lean = Math.max(-1, Math.min(1, dx / cw)) * LEAN_DEG * f;
          }
          if (i === pi) scale *= 1 - 0.1 * pr;

          if (typeof kind === 'number' || kind === 'today') {
            const size = typeof kind === 'number' ? cw * 1.35 : cw * 1.15;
            let path = typeof kind === 'number' ? plants[kind] : house;
            if (i === gi && g < 1) {
              if (reduced) alpha *= g;
              else {
                const trimmed = g > 0 ? Skia.Path.Trim(path, 0, g, false) : null;
                if (!trimmed) continue;
                path = trimmed;
              }
            }
            if (alpha <= 0) continue;
            paint.setAlphaf(alpha);
            // the doodle is centred in its cell; it grows and leans from where it meets the ground, (16, 31)
            const k = (size / 32) * scale;
            canvas.save();
            canvas.translate(cx, cy - size / 2 + (31 * size) / 32);
            if (lean) canvas.rotate(lean, 0, 0);
            canvas.scale(k, k);
            canvas.translate(-16, -31);
            canvas.drawPath(path, paint);
            canvas.restore();
          } else {
            const a = alpha * (kind === 'future' ? 0.35 : 1);
            if (a <= 0) continue;
            dot.setAlphaf(a);
            canvas.drawCircle(cx, cy, 1.5 * scale, dot);
          }
        }
      },
      { width: width + 2 * m, height: height + 2 * m },
    );
    // native tracks what the worklet reads by itself and warns about a list; the web needs one
  }, WEB ? [kinds, cols, cw, ch, rowGap, padTop, width, height, color, reduced, plants, house, m, rows] : undefined);

  return (
    <Canvas pointerEvents="none" style={{ position: 'absolute', left: -m, top: -m, width: width + 2 * m, height: height + 2 * m }}>
      <Picture picture={picture} />
    </Canvas>
  );
}
