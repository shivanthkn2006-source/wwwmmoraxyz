# Fit long Zoe chat messages inside the orb window on phones

## Problem
In the Zoe orb chat window, long messages run past the right edge of the window instead of wrapping onto the next line. This hides the end of the text, and it also hides the copy and reply options that sit at the end of each message box. Your own short messages, like "Wh…", get cut off too.

## Cause
The scrolling message area lets its content grow wider than the window. The message boxes are meant to cap at 85% width, but that cap is measured against the stretched area, so the text never wraps.

## Fix (layout only, no design or behavior changes)
1. Keep the message list exactly as wide as the orb window, so it can't stretch sideways.
2. Wrap long text inside every message box (Zoe's and yours), including long words and links.
3. Keep the copy and reply options that follow each message inside the window.
4. Check the window on a phone-sized screen (411px wide) and on iPad and desktop.

Colors, spacing, icons, chat history, voice and wiring stay the same.

## Technical details
- `src/components/ZoeOrbConversationPanel.tsx`, the main `ScrollArea` (around line 3997): add `viewportClassName="overscroll-contain [&>div]:!block [&>div]:!min-w-0 [&>div]:w-full"`. This overrides the Radix `display:table` wrapper, which is what causes the horizontal stretch. Add `min-w-0 w-full overflow-x-hidden` to the inner `space-y-2` list.
- Zoe message bubble (line 4131): add `min-w-0 break-words [overflow-wrap:anywhere]` to both max-width variants, and `min-w-0 max-w-full` to the per-message row wrapper.
- Apply the same wrapping to the direct-message bubbles in the same list.
- Verify with Playwright at 411×717 by injecting a long message, then confirm that `scrollWidth <= clientWidth` for the message viewport.
