# Fix Google sign-in (redirect_uri_mismatch)

## Current finding (checked live just now)
- The app sends people to Google correctly, with no Lovable step.
- Google still replies "Access blocked: redirect_uri_mismatch".
- The sign-in request uses Client ID starting `115346596528-24jr4knv...`.
- So Google hasn't matched the saved redirect address to this client yet.

## Likely causes (in order)
1. Google hasn't finished saving the change. This can take 5 minutes to a few hours.
2. The address was saved on a different OAuth client in Google Cloud, not the one starting `115346596528-24jr4knv`.
3. The address was pasted into "Authorised JavaScript origins" rather than "Authorised redirect URIs", or it has a trailing slash or space.

## Steps
1. You: in Google Cloud → Credentials, open the client whose ID starts `115346596528-24jr4knv`. Under **Authorised redirect URIs**, make sure the callback address from the backend is there exactly (ending `/auth/v1/callback`). Under **Authorised JavaScript origins**, add `https://mmora.xyz`, `https://www.mmora.xyz`, `https://myzoe.xyz`, `https://www.myzoe.xyz`, `https://wwwmmoraxyz.lovable.app`. Save.
2. Me: re-run the live check every few minutes until Google stops reporting the mismatch.
3. Me: once it's accepted, test the full flow on mmora.xyz up to Google's account picker. Then confirm that returning to /auth takes you to Home, and that any error shows a clear message.
4. No app code changes are needed unless step 3 shows a problem after Google sends you back.
