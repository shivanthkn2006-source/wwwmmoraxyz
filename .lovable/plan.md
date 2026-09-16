# My uploads in Music + a real personal listening shelf

## 1. A page to upload my own music

New page at `/music/uploads` (linked from the Music page, no design changes to existing components — it reuses the same Liquid Glass classes).

- Pick one or many audio files (mp3, m4a, wav, ogg, flac) plus an optional cover image per song.
- Show title, artist and album fields filled in from the file name, editable before saving.
- Per-file progress, clear errors, and a list of everything already uploaded with cover art, play button, and delete.
- Files are stored in a private `music-uploads` area; only the owner can read, replace or delete them.
- Cover art: use the uploaded image if given; otherwise show the standard music symbol (nothing invented).

Uploaded songs then appear in the Music page search: any search first matches my own uploaded songs (title, artist, album) and lists them at the top under "My uploads", with album art and a play button, and they play full length through the same player as everything else.

## 2. Home shelf shows my real listening history

Today the Home shelf lists other members' recent plays. It will change to my own history:

- Group my `music_listens` rows by song and show my real play count ("12 plays"), newest first when counts tie.
- Show the album art stored with the play; fall back to the music symbol when none exists.
- Play button starts that song in the same global player, so it keeps playing while I move around the app.
- When I have no listening history yet, the shelf stays hidden (no placeholder data).
- Every play started anywhere in Music, including my uploads, is logged so the shelf stays accurate.

## Technical details

- Storage: private bucket `music-uploads` with owner-scoped policies on `storage.objects`.
- New table `music_uploads` (title, artist, album, storage path, artwork path, mime type, duration, size) with grants, RLS restricted to the owner, and an updated-at trigger.
- New `src/features/music/musicUploads.ts`: upload, list, delete, signed-URL playback, and a `searchMyUploads(query)` helper returning normal `MusicTrack` objects with `source: 'upload'`.
- `musicProviders.ts`: extend the `MusicTrack` source union with `'upload'`, treat uploads as full length, and merge my uploads ahead of provider results in `searchMusicCatalog`.
- `musicSocial.ts`: add `fetchMyListening()` returning my own tracks with play counts; `HomeMusicShelf.tsx` renders that instead of member rows.
- New `src/pages/MusicUploadsPage.tsx`, route added in `src/App.tsx` behind the existing protected route wrapper.
- Tests for upload search matching, play-count grouping, and source ranking; then a signed-in preview check on phone and desktop.
