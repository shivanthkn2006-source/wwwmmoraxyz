# Extend warm Liquid Glass across Home, planning tools, and admin

## Goal
Apply the Profile/Calls warm frosted transparency and white-only text/icons to Home, Event Planner Diary, Smart Reminders, Calendar, and every admin screen, while preserving all data, controls, routes, and behavior.

## Changes
- Add a shared warm Liquid Glass surface style using the existing semantic white and warm ambient tokens.
- Scope the shared treatment to the Home route and all admin routes, including Omni-Sense, Staff Dashboard, Sovereign Vault, admin overview, health, memory, search, DHF, growth, invites, moderation, Sentinel, feed debug, and Zoe preview.
- Give Diary, Smart Reminders, and Calendar explicit scoped wrappers so their cards, fields, tabs, date cells, labels, icons, and status markers use transparent white glass instead of colored fills.
- Convert the Home shell and controls to the same warm frosted surface without obscuring photos, videos, post media, or the bottom-right controls.
- Convert the Home floating Sovereign Control panel to the same white-only glass treatment.
- Preserve meaningful images/media and all existing click, form, calendar, reminder, diary, feed, and admin actions.

## Technical approach
- Reuse one CSS surface system rather than rewriting individual components.
- Add route-aware classes at the shared app shell for `/admin`, `/analytics-dashboard`, and related admin destinations.
- Add small data/class markers only where needed to distinguish planning surfaces and protected media from decorative backgrounds.
- Keep portal dialogs, menus, and selectors readable through scoped active-route rules.

## Verification
- Add focused source/style tests covering Home, Diary, Reminders, Calendar, Omni-Sense, Vault, Staff Dashboard, and the floating admin panel.
- Run focused tests and inspect the latest build health.
- Walk signed-in Home/Profile planning tools and representative admin screens at phone, tablet, and desktop sizes, checking controls, text contrast, scrolling, media visibility, and unobstructed bottom-right controls.
