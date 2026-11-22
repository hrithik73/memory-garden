/** Native: Skia is built in, so start straight away. (The web version loads CanvasKit first.) */
export function whenSkiaReady(start: () => void) {
  start();
}
