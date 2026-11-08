export const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const pad = (n: number) => String(n).padStart(2, '0');
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
export const todayKey = () => keyOf(new Date());

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** "Monday, 9 November 2026" */
export function pretty(k: string) {
  const d = fromKey(k);
  return `${cap(WEEKDAYS[d.getDay()])}, ${d.getDate()} ${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
}

/** "Mon, 9 Nov" */
export function tipDate(k: string) {
  const d = fromKey(k);
  return `${cap(WEEKDAYS[d.getDay()].slice(0, 3))}, ${d.getDate()} ${cap(MONTHS[d.getMonth()].slice(0, 3))}`;
}

/** "9 nov" */
export function short(k: string) {
  const d = fromKey(k);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Stable hash so each day always grows the same plant. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
