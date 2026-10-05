# Sign-in page: new wording and everything on one screen

## Changes
1. Change "Sign in to continue" to **"Sign in/Sign up"**.
2. Change "Sign in with camera face scan" to **"Face Scan"**.
3. Change "Sign in with Fingerprint / Passkey" to **"Fingerprint/Passkey"**.
4. Fit the whole page on one phone screen with no scrolling. That includes the copyright line and the links below "Explore M'Mora — sign up now..".
   - Colours, fonts, the order of items and the button styles stay exactly the same.
   - The space between items gets a little smaller but stays even and comfortable, so the page still looks neat and not squeezed. It adjusts to the screen height, with a firm minimum gap that is never crossed, so even short phones show everything.
5. Check it on short and tall phone sizes (about 360×640 up to 430×930) and on desktop, and confirm the copyright line is visible without scrolling.

## Technical details
- `src/pages/AuthPage.tsx`: update the subtitle text, line 545 (face scan) and line 175 (passkey label).
- Make the outer container `min-h-[100dvh]` with a flex column. Swap the fixed vertical gaps and margins for height-based values (`clamp()` or `max-h` media queries) so the footer sits inside the visible screen. Don't change sizes, colours or element order.
- Verify with Playwright screenshots at several phone sizes.
