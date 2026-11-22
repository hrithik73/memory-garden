import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/**
 * Web: Skia draws with CanvasKit (public/canvaskit.wasm, copied there on install), which has
 * to finish loading before any Skia module runs.
 */
export function whenSkiaReady(start: () => void) {
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(start);
}
