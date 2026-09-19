# Repair Home navigation and calling

## What will change
- Restore the Home button as a permanent, working control inside the opened Home menu as well as the closed trigger.
- Repair recently used icon ordering so moving icons keep their own working action and remain easy to reach.
- Keep the new Calls icon clearly visible beside Messages without removing or changing existing destinations.
- Make the Calls page use the same transparent, white-only glass language as Music, without changing other pages.
- Fix Moksh-to-Asha call delivery by giving the app one shared call engine instead of competing listeners.
- Preserve incoming calls across pages so Asha sees the request and can answer even when the Calls page is closed.

## Verification
- Add checks for Home visibility, recent-icon clicks, Calls navigation, and one shared call listener.
- Verify outgoing request, incoming display, accept/reject, and call-end paths against real row permissions.
- Check the live preview at phone, tablet, and desktop sizes and capture the visible results.
- Report separately if internet relay testing remains blocked by missing call-relay credentials.

## Technical approach
- Use a single authenticated call provider mounted at the app level; Calls and Zoe controls consume that shared state.
- Keep the existing WebRTC media path and database signaling contract; do not replace unrelated architecture.
- Correct the custom Calls icon so it works with animated wrappers and does not generate ref warnings.
- Limit edits to Home navigation and calling files, plus their focused tests.
