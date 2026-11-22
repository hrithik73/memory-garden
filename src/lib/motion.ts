import { Easing } from 'react-native-reanimated';

/** Strong ease-out for things entering or responding to a tap. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Settles without overshoot. */
export const SPRING_SETTLE = { duration: 400, dampingRatio: 1 };
/** Snaps back after the finger lets go, with a little life in it. */
export const SPRING_SNAP = { duration: 400, dampingRatio: 0.8 };
/** Quick follow for things that track the finger, like the date label. */
export const SPRING_FOLLOW = { duration: 300, dampingRatio: 1 };

/** Scrub lens: how far it reaches (in cells), how big the day under the finger gets, and how far plants lean (degrees). */
export const LENS_CELLS = 2.5;
export const LENS_SCALE = 1.5;
export const LEAN_DEG = 12;
