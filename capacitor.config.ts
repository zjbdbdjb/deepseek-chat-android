import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.chatdemo.deepseek',
  appName: 'DeepSeek Chat',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DEFAULT',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      launchFadeOutDuration: 200,
      showSpinner: false,
    },
  },
}

// eslint-disable-next-line import/no-default-export
export default config
