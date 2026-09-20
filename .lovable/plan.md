# Home menu search, contained labels, Zoe call voice, and background ringing

## Home menu
- Keep the existing seven-column panel and current icon dimensions.
- Add a borderless search field in the unused bottom row, with the cursor at left and a small search symbol immediately before Home.
- Filter every wired Home destination by its visible name without changing navigation, order, badges, or actions.
- Place each name inside its existing icon tile beneath the symbol; do not enlarge tiles or alter unrelated components.

## Zoe group-call voice
- Reuse the authenticated Deepgram voice pipeline only; do not use browser speech or simulated audio.
- Add a call-scoped audio bridge that sends one designated Zoe voice stream through the existing WebRTC group mesh to every participant.
- Keep Zoe’s worker-generated subtitles synchronized and retain text as the fallback for weak networks.
- Add bounded speaking, one-speaker arbitration, and renegotiation safeguards to avoid duplicate voices or dropped human audio.

## Background incoming-call ring
- Harden production PWA registration so the push-capable service worker is ready before subscription and survives recovery refreshes.
- Preserve the existing authenticated Web Push edge function and incoming-call notification deep link.
- Add focused browser push tests. Native killed-app wake requires APNs/FCM credentials and native CallKit/Android call-service setup; no physical wake result will be claimed without a real device test.

## Verification
- Run focused Home, group-call, call-push, type, and existing call tests.
- Check the Home panel at phone, tablet, and desktop widths.
- Report separately what is code-verified, production-PWA capable, and still awaiting physical-device confirmation.
