# Compact Home controls and native hands-free Zoe

## What will change
- Make the floating Zoe Audio entry a bare headset icon with no outline, background, or text, and position it so notification controls remain unobstructed.
- Replace the always-visible four-choice Home feed bar with a bare **Global** label. Tapping it expands **Friends**, **Mosaic**, and **Selfie City** to the right; tapping Global again collapses it.
- Preserve the existing Home feed content, dock, notification behavior, and all other features.

## Native hands-free support
- Complete the Capacitor iOS and Android wrapper setup using the existing React app and AudioRouterService.
- Add a native voice bridge with explicit microphone/background state events, headset-button activation, wake/stop phrase delivery, and foreground restoration.
- Connect native events to the same Zoe activation, Deepgram reply, selected-headset routing, and one-time microphone permission flow already used by the web app.
- Configure required iOS background-audio/microphone declarations and Android foreground microphone service declarations. Native listening will show an honest unavailable/error state if the operating system denies access.

## Verification
- Add focused tests for compact/expanded Home feed behavior and the native bridge event contract.
- Check Home and Zoe Audio in the signed-in preview for overlap, navigation, and console/runtime errors.
- Verify TypeScript, focused voice/audio tests, native synchronization readiness, and the latest build result.

## Technical details
- Browser tabs will continue to report foreground-only listening; locked/minimized listening is enabled only inside the native wrapper.
- The native wrapper will reuse the current M'Mora Zoe pipeline and will not introduce a second Zoe or any Zoe Infinity fallback.
- Physical locked-screen wake-word behavior still requires final testing on a real iPhone or Android device after native project synchronization.
