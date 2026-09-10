import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p5e9c1fcbad3b434fa9d89d7d3fb4a4b4',
  appName: 'wwwmmoraxyz',
  webDir: 'dist',
  server: {
    url: 'https://5e9c1fcb-ad3b-434f-a9d8-9d7d3fb4a4b4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
  // iOS-specific settings.
  // Background listening also needs, in Xcode:
  //   Signing & Capabilities -> Background Modes -> Audio, AirPlay and Picture in Picture
  //   Info.plist -> NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  // Android-specific settings.
  // Background listening also needs, in AndroidManifest.xml:
  //   RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, BLUETOOTH_CONNECT, FOREGROUND_SERVICE,
  //   FOREGROUND_SERVICE_MICROPHONE
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
  },
};

export default config;
