import Svg, { Circle, Path } from 'react-native-svg';
import { hash } from '../lib/dates';

/** A doodle is a list of path strings and circles ([cx, cy, r]) on a 32×32 grid. */
type Shape = string | [number, number, number];
export type Doodle = Shape[];

const PLANTS: Doodle[] = [
  // daisy
  ['M16 31V17M16 25c-3-1-5-3-5-6M16 27c3-1 5-3 5-5', [16, 11, 2.2], [16, 5.6, 2.6], [21, 9.3, 2.6], [19.1, 15.2, 2.6], [12.9, 15.2, 2.6], [11, 9.3, 2.6]],
  // tulip
  ['M16 31V15M16 26c-4 0-6-3-6-6 3 0 6 2 6 6M16 23c4 0 6-3 6-6-3 0-6 2-6 6', 'M11 5l2.5 3L16 4l2.5 4L21 5v6a5 5 0 0 1-10 0z'],
  // mushroom
  ['M5 16a11 9 0 0 1 22 0z', 'M13 16v9a3 3 0 0 0 6 0v-9', [11.5, 11, 1.3], [18.5, 9.5, 1.6], [22, 13, 1], 'M8 30.5h16'],
  // grass tuft
  ['M6 30c0-7-2-11-4-14M10 30c0-9 1-15 4-19M15 30c0-7-2-12-5-16M19 30c0-8 2-15 6-20M23 30c0-6 2-10 5-13M27 30c0-4-1-7-3-9'],
  // sprout
  ['M16 31V14M16 19c0-6-5-9-11-9 0 6 5 9 11 9M16 15c0-5 4-8 10-8 0 5-4 8-10 8M11 31h10'],
  // rose
  [
    'M16 31V17M16 27c-3 0-6-2-7-5 3-1 6 1 7 5M16 24c3 0 5-2 6-5-3-1-5 1-6 5',
    'M10.5 9.5c0 4 2.5 7.5 5.5 7.5s5.5-3.5 5.5-7.5',
    'M16 12c-2 0-3-1.5-3-3s1.5-3 3-3 3 1.2 3 2.6-1 2-2 2-1.6-.6-1.6-1.4',
  ],
  // cherries
  ['M17 4c-1 6-4 10-8 14M17 4c1 6 3 10 6 15M17 4c3-2 7-1 9 1-3 2-6 2-9-1', [9, 22, 4], [23, 23, 4], 'M7.5 20.5l1 -1M21.5 21.5l1-1'],
  // cactus
  ['M13 30V9a3 3 0 0 1 6 0v21M13 20H9.5a2 2 0 0 1-2-2v-5a1.5 1.5 0 0 1 3 0v4H13M19 17h2.5v-4a1.5 1.5 0 0 1 3 0v5a2 2 0 0 1-2 2H19M8 30.5h16M15 11v1M17 15v1M15 19v1M17 23v1'],
  // lavender
  [
    'M10 31V13M16 31V8M22 31V13',
    'M10 13l-1.5-1.5M10 13l1.5-1.5M10 17l-1.5-1.5M10 17l1.5-1.5M16 8l-1.5-1.5M16 8l1.5-1.5M16 12l-1.5-1.5M16 12l1.5-1.5M16 16l-1.5-1.5M16 16l1.5-1.5M22 13l-1.5-1.5M22 13l1.5-1.5M22 17l-1.5-1.5M22 17l1.5-1.5',
  ],
  // leaf
  ['M7 30C7 18 13 8 26 4c0 12-6 22-19 26zM7 30l13-16M12 23l-4-2M15 19.5l-1-5M12 23l5 1M15 19.5l5 .5'],
  // berry bush
  ['M16 31V20M16 27l-6-6M16 25l6-6', [16, 14.5, 3.4], [9, 17.5, 3], [23, 16.5, 3], [12, 9, 2.6], [20.5, 9, 2.6]],
  // sunflower
  [[16, 11, 4], 'M16 3v3M16 16v15M8 11h3M21 11h3M10.3 5.3l2.1 2.1M19.6 14.6l2.1 2.1M21.7 5.3l-2.1 2.1M12.4 14.6l-2.1 2.1M16 25c-3 0-5-2-6-4 3 0 5 1 6 4'],
  // fern
  ['M16 31C16 20 14 12 9 4M15.3 24l-5-1M15.3 24l4.5-2.5M14.4 19l-4.5-1.5M14.4 19l4-3M13 14.5l-4-1.5M13 14.5l3.5-3M11.2 10l-3-1M11.2 10l3-2.5'],
  // bluebells
  [
    'M9 31c0-10 3-18 10-24M19 7c2 0 4 1 5 3M13 14c-2 0-3 1-3 3M16 10.5c1.5 0 3 .5 3.5 2',
    'M8 17c0 2 1 3.5 2.5 3.5S13 19 13 17zM18 12.5c0 2 1 3.5 2.5 3.5S23 14.5 23 12.5zM22.5 10c0 2 1 3.5 2.5 3.5S27.5 12 27.5 10z',
  ],
];

export const HOUSE: Doodle = ['M4 13L16 3.5 28 13M7 11v19h18V11M5 30h22', [16, 17.5, 3.6], 'M16 24v3'];
export const PLUS: Doodle = ['M16 4.5c6.6-.5 11.5 4.2 11.5 11s-4.6 12-11.3 12S4.6 22.5 4.5 16C4.4 9.5 9.6 4.9 15 4.2', 'M16 10.5v11M10.5 16h11'];
export const MIC: Doodle = ['M16 4.5a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0v-7a4 4 0 0 1 4-4z', 'M9 15a7 7 0 0 0 14 0M16 22v5M12 27.5h8'];
export const ICON_GARDEN: Doodle = ['M5 28v-9M5 23l-3-2M11 28V16M11 22l3-3M19 28v-8M26 28V15M26 21l-3-2', [5, 16, 2.5], [11, 12.5, 2.8], 'M15 20a4 3 0 0 1 8 0z', [26, 11.5, 2.8]];
export const ICON_DAY: Doodle = ['M16 30V17M16 25c-3 0-5-2-5-4 3 0 5 1 5 4', [16, 11, 2], [16, 6, 2.4], [20.6, 9.4, 2.4], [18.8, 14.6, 2.4], [13.2, 14.6, 2.4], [11.4, 9.4, 2.4]];

/** Same day → same plant, matching the web version. */
export const plantFor = (day: string) => PLANTS[hash(day) % PLANTS.length];

export function DoodleView({ shapes, size, color }: { shapes: Doodle; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {shapes.map((s, i) =>
        typeof s === 'string' ? (
          <Path key={i} d={s} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <Circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill="none" stroke={color} strokeWidth={1.5} />
        ),
      )}
    </Svg>
  );
}
