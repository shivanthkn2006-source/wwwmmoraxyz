# MMora Mobile App - Complete Build & Deployment Guide

## Prerequisites

### Required Software
- **Node.js** 18+ (LTS recommended)
- **For iOS**:
  - macOS with Xcode 14+ installed
  - CocoaPods (`sudo gem install cocoapods`)
  - Apple Developer Account ($99/year)
- **For Android**:
  - Android Studio (latest stable)
  - JDK 11 or higher
  - Google Play Developer Account ($25 one-time)

## Step 1: Clone & Setup Project

```bash
# Clone from GitHub (after exporting from Lovable)
git clone <your-repo-url>
cd mmora-app

# Install dependencies
npm install

# Build the web app
npm run build
```

## Step 2: Add Native Platforms

### iOS Platform
```bash
# Add iOS platform (requires macOS)
npx cap add ios

# Update native dependencies
npx cap update ios

# Open in Xcode
npx cap open ios
```

### Android Platform
```bash
# Add Android platform
npx cap add android

# Update native dependencies
npx cap update android

# Open in Android Studio
npx cap open android
```

## Step 3: Configure Native Projects

### iOS Configuration (in Xcode)

1. **Update Bundle Identifier**
   - Select project in Xcode
   - Go to Signing & Capabilities
   - Change Bundle Identifier to your domain (e.g., `com.yourcompany.mmora`)

2. **Add Capabilities**
   - Camera (already used in app)
   - Push Notifications
   - Background Modes (for notifications)
   - Face ID (for face verification)

3. **Update Info.plist**
```xml
<key>NSCameraUsageDescription</key>
<string>MMora needs camera access for posts and face verification</string>
<key>NSMicrophoneUsageDescription</key>
<string>MMora needs microphone access for voice commands</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>MMora uses your location for Huddle feature</string>
<key>NSFaceIDUsageDescription</key>
<string>MMora uses Face ID for secure authentication</string>
```

4. **Add App Icons**
   - Place icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Sizes needed: 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt (all @1x, @2x, @3x)

5. **Configure Launch Screen**
   - Edit `LaunchScreen.storyboard` for branded splash screen

### Android Configuration (in Android Studio)

1. **Update Package Name**
   - File → Project Structure → Modules
   - Change applicationId to your domain (e.g., `com.yourcompany.mmora`)

2. **Update AndroidManifest.xml**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
```

3. **Add App Icons**
   - Place icons in `android/app/src/main/res/` folders
   - Required sizes: mdpi (48x48), hdpi (72x72), xhdpi (96x96), xxhdpi (144x144), xxxhdpi (192x192)

4. **Configure Splash Screen**
   - Edit `android/app/src/main/res/values/styles.xml`
   - Add branded splash screen image

## Step 4: Build for Testing

### iOS Testing Build

1. **Select Device/Simulator**
   - Choose target device in Xcode

2. **Build and Run**
   - Product → Build (⌘B)
   - Product → Run (⌘R)

3. **Test on Physical Device**
   - Connect iPhone via USB
   - Select device in Xcode
   - Trust certificate on device
   - Run app

### Android Testing Build

1. **Enable Developer Mode**
   - On Android device: Settings → About → Tap "Build number" 7 times

2. **Enable USB Debugging**
   - Developer Options → USB Debugging

3. **Build and Run**
   - Click "Run" button in Android Studio
   - Select connected device or emulator
   - App will install and launch

## Step 5: Production Builds

### iOS Production Build (App Store)

1. **Configure Signing**
   - Xcode → Signing & Capabilities
   - Select your Team
   - Enable "Automatically manage signing"
   - Or manually add provisioning profiles

2. **Archive the App**
   ```bash
   # Update version and build number
   # Product → Archive in Xcode
   ```

3. **Upload to App Store Connect**
   - Window → Organizer
   - Select archive
   - Click "Distribute App"
   - Follow wizard for App Store upload

4. **App Store Connect Setup**
   - Create app listing
   - Add screenshots (required sizes):
     - 6.5" (iPhone 14 Pro Max): 1290 x 2796
     - 5.5" (iPhone 8 Plus): 1242 x 2208
     - 12.9" (iPad Pro): 2048 x 2732
   - Add app description, keywords, category
   - Set pricing and availability
   - Submit for review

### Android Production Build (Play Store)

1. **Generate Signing Key**
```bash
# Create keystore
keytool -genkey -v -keystore mmora-release.keystore -alias mmora -keyalg RSA -keysize 2048 -validity 10000
```

2. **Configure Gradle Signing**
Edit `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("mmora-release.keystore")
            storePassword "your-password"
            keyAlias "mmora"
            keyPassword "your-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

3. **Build Release APK/AAB**
```bash
# Build AAB (recommended for Play Store)
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

4. **Play Console Setup**
   - Create app listing
   - Add screenshots (required sizes):
     - Phone: 16:9 ratio (1080 x 1920 recommended)
     - 7" Tablet: 1024 x 1800
     - 10" Tablet: 1200 x 1920
   - Add app description, category
   - Set content rating
   - Upload AAB
   - Set up pricing and distribution
   - Submit for review

## Step 6: Optimize for Performance

### iOS Optimizations

1. **Enable Bitcode**
   - Build Settings → Enable Bitcode → Yes

2. **Optimize Images**
   - Use Asset Catalogs
   - Enable "Compress PNG Files"

3. **Dead Code Stripping**
   - Build Settings → Dead Code Stripping → Yes

### Android Optimizations

1. **Enable ProGuard/R8**
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

2. **Enable App Bundle**
   - Use AAB format (already configured above)
   - Dynamic feature delivery

3. **Optimize Images**
   - Use WebP format where possible
   - Enable PNG crunching

## Step 7: Testing Checklist

### Functional Testing
- [ ] All pages load correctly
- [ ] Authentication works (sign up, login, logout)
- [ ] Face verification captures and verifies
- [ ] Camera and media upload work
- [ ] Zoe voice assistant responds
- [ ] Huddle map displays users
- [ ] Notifications deliver properly
- [ ] Offline functionality (where applicable)

### Platform-Specific Testing
- [ ] iOS: Face ID/Touch ID authentication
- [ ] iOS: Push notifications appear
- [ ] iOS: Safe area handling on notched devices
- [ ] Android: Biometric authentication
- [ ] Android: Back button behavior
- [ ] Android: Adaptive icons
- [ ] Android: Multi-window mode

### Performance Testing
- [ ] App launches in < 3 seconds
- [ ] Smooth 60fps animations
- [ ] No memory leaks (use profilers)
- [ ] Battery usage acceptable
- [ ] Network usage optimized

## Step 8: App Store Guidelines Compliance

### iOS App Store Review Guidelines

✅ **Safety**
- Privacy policy linked in app
- Data encryption implemented
- No unauthorized data collection

✅ **Performance**
- App completes functions as described
- No placeholder content
- Accurate metadata

✅ **Business**
- Clear in-app purchase descriptions (if applicable)
- Subscription terms visible

✅ **Design**
- Follows Human Interface Guidelines
- Proper use of system features
- Accessible to all users

### Google Play Store Policies

✅ **Content Policy**
- Age-appropriate content
- No misleading claims
- Privacy policy accessible

✅ **Quality**
- App functions on range of devices
- Proper error handling
- Responsive UI

✅ **Monetization**
- Clear pricing (if applicable)
- No deceptive practices

## Step 9: Continuous Integration/Deployment

### GitHub Actions for iOS
```yaml
name: iOS Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: npx cap sync ios
      - run: xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release archive
```

### GitHub Actions for Android
```yaml
name: Android Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '11'
      - run: npm install
      - run: npm run build
      - run: npx cap sync android
      - run: cd android && ./gradlew bundleRelease
```

## Step 10: Post-Launch Monitoring

### Analytics Setup
- Firebase Analytics (free)
- Crashlytics for crash reporting
- Performance monitoring

### Version Updates
```bash
# Increment version
# iOS: Update in Xcode
# Android: Update versionCode and versionName in build.gradle

# Rebuild and resubmit
npm run build
npx cap sync
# Build and upload new version
```

## Common Issues & Solutions

### iOS Issues

**Issue**: "No matching provisioning profiles found"
**Solution**: 
- Log into Apple Developer account
- Generate new provisioning profile
- Download and double-click to install

**Issue**: "App crashes on launch"
**Solution**:
- Check Xcode console for errors
- Verify all capacitor plugins are synced
- Clean build folder (Product → Clean Build Folder)

### Android Issues

**Issue**: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"
**Solution**:
- Uninstall old version from device
- Rebuild and reinstall

**Issue**: "Unable to load script"
**Solution**:
- Ensure `capacitor.config.ts` server URL is correct
- Run `npx cap sync android`
- Rebuild project

## Support & Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://m3.material.io/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)

## Estimated Timeline

- **Initial Setup**: 2-3 hours
- **iOS Build & Test**: 4-6 hours
- **Android Build & Test**: 4-6 hours
- **Store Assets Creation**: 8-12 hours
- **App Store Submission**: 1 week review
- **Play Store Submission**: 3-5 days review

**Total Time to Launch**: 2-3 weeks from start to both stores live