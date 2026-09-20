# Fix the connected Saraswati profile

## Scope
Fix only the profile opened from the Home page’s top-right Saraswati photo. Keep every component and function unchanged.

## Steps
1. Scope the transparent, white-only profile styling to the Home profile side panel itself.
2. Apply the same treatment to Event Planner Diary, Smart Reminders, Calendar View, Edit Profile, and profile-owned popups and menus.
3. Preserve the real profile photo and existing controls, data, and integrations.
4. Add focused regression checks proving the Home avatar flow receives the profile styling.
5. Sign in with the available @moksh50 session and visually test the connected profile on phone, tablet, and desktop, including its four named sections.

## Technical details
- Add a profile-specific marker to the Home sheet and activate the existing profile portal scope while that sheet is open.
- Extend the existing scoped CSS selectors instead of restyling shared components globally.
- Validate the latest build signal, focused tests, screenshots, visible colors, and browser errors before reporting completion.
