import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.retropick.app',
  appName: 'RetroPick',
  webDir: 'out',
  backgroundColor: '#0E131F',
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#0E131F',
      style: 'DARK',
    },
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#0E131F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
