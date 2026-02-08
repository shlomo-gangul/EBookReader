import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production' && !process.env.CAPACITOR_RELEASE;

const config: CapacitorConfig = {
  appId: 'com.bookreader.app',
  appName: 'BookReader',
  webDir: 'dist',

  // Server configuration
  server: {
    androidScheme: 'https',
    // Only use dev server URL during development (10.0.2.2 = host localhost in Android emulator)
    ...(isDev ? { url: 'http://10.0.2.2:3000' } : {}),
  },

  // Plugins configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a', // slate-900 to match app
      showSpinner: true,
      spinnerColor: '#3b82f6', // blue-500
    },
    StatusBar: {
      style: 'DARK', // Light text for dark background
      backgroundColor: '#0f172a', // Match app header
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  // Android specific
  android: {
    allowMixedContent: true, // Allow loading book content from various sources
    backgroundColor: '#0f172a',
  },
};

export default config;
