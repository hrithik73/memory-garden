import { useColorScheme } from 'react-native';

const light = {
  bg: '#dedce2',
  ink: '#2410d8',
  inkSoft: '#8a80d9',
  pill: '#e9e6f3',
  pillBorder: '#d2cde6',
  card: '#ebe9f0',
};

const dark: Theme = {
  bg: '#15132a',
  ink: '#a99cff',
  inkSoft: '#6b62a8',
  pill: '#221f3d',
  pillBorder: '#353060',
  card: '#1d1a36',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const F = {
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  hand: 'Gaegu_700Bold',
};
