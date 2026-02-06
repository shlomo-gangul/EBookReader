import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookreader.app',
  appName: 'BookReader',
  webDir: 'dist',

  // Server configuration
  server: {
    // Allow loading from localhost during development
    androidScheme: 'https',
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
