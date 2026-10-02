# Restyle the first-time intro in the M'Mora warm theme

## What the page is
It's the first-time intro film (the "Genesis" intro) that plays before Home. It has 5 screens in a row: opening words, "reality" glitch, city reveal, "Choose your vessel" (pick Gunther, Sentinel or Pixie), and the warp into the app. It still uses an old black neon look (cyan, purple, pink, sci-fi fonts) from before the platform moved to the warm tan look of Home and Zoe chat.

## Changes (look only, all 5 screens)
- Background: the warm tan of Home and chat, instead of black.
- Text: the platform's normal font in cream and dark brown, instead of neon cyan and the sci-fi font. Words stay the same.
- Avatar cards: no boxes or outlines. White icon circles with dark symbols, the same as the permissions window. The chosen card gets a soft highlight and a check mark.
- "Enter the Omega" button: plain text button with no fill or outline, matching the platform buttons.
- Step dots, sound and skip controls: cream and brown instead of cyan.
- Opening, glitch, city and warp effects stay, recoloured to soft warm light instead of neon.

## Not changing
- What the intro does, the order of the screens, skipping, and when it shows.
- The screens before it (sign-in, which already uses the warm look) and after it (permissions window, welcome, Home), which already follow the theme. I'll check each one again in a test browser and fix any leftover black or neon parts.

## Technical details
- File: `src/components/GenesisCinematicIntro.tsx`. Replace `bg-black`, cyan/purple/pink gradients and `font-orbitron` with `surface-warm-tan`, semantic tokens and `.tan-circle` / `.tan-circle-icon`.
- Check with Playwright screenshots of each scene at phone and desktop size.
