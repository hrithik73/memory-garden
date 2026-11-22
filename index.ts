import { registerRootComponent } from 'expo';
import { whenSkiaReady } from './src/lib/skia-ready';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// The app is required only once Skia is ready (immediately on native; after CanvasKit loads on the web).
whenSkiaReady(() => registerRootComponent(require('./src/root').default));
