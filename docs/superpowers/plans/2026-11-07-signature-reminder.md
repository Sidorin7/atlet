# Signature reminder implementation plan

**Goal:** Remind the owner to renew the personal iOS build before its signature expires, including when Atlet is closed.

**Approved behavior:** Notifications two days and one day before expiration, at 19:00 local time. A small message on the home screen displays the real deadline. New builds replace the old reminders after the first launch. Ask for notification permission once; show a way to enable it in Settings if denied. Unsupported builds do not show a guessed deadline.

**Architecture:** A local Apple Expo module reads the embedded provisioning profile and exposes its expiration date and UserNotifications operations. TypeScript derives the reminder dates and renders the existing app's text/card styles. No backend, database changes, or changes to workout records.

**Execution:** Inline in the current checkout; retain the existing ignored native project and its device setup. Use a local module so prebuild can reproduce the addition. No commits or branch changes are required for this task.

## Tasks

- [x] Add failing tests for reminder dates, local 19:00, expired/missing profiles, late first launches, and stable reminder identities across new builds.
- [x] Implement date logic and a local Swift module. Validate profile parsing against binary CMS fixtures and the signed build. Only reminders owned by this feature may be replaced. Denied permission and scheduling failures remain visible to the user.
- [x] Add Russian/English home-screen text, foreground/time refresh, and notification-permission recovery using existing styles.
- [x] Run the complete Jest suite (193 passing tests), TypeScript (passed), lint (no errors, two existing warnings), native profile/calendar tests, and a signed Release build. Inspect autolinking.
- [x] Install on the connected iPhone without deleting app data (installation proxy reported Complete and verified the bundle identifier). Runtime permission/banner confirmation requested from the user; Xcode device services remain blocked by the previously diagnosed Apple disk-image authorization error.

## Review and validation

Independent review found fixed-instant notifications would drift from local 19:00 after a time-zone change. Replaced them with floating local calendar triggers and added a Swift regression test. Date checks are made against the absolute expiration when scheduling; extreme travel while the app remains closed can move a calendar reminder beyond that deadline. Foreground sync recomputes the dates.

Native parser verified the real signed build deadline: 2026-11-14T10:27:23Z. No workout schema or data changes. On-device notification authorization requires the user to open the newly installed app and answer the iOS permission dialog.

## Review focus

Avoid reminders after expiration, after a past 19:00 slot, or at an unexpected time zone. Do not reset expiration on launch. Do not clear other notification features. Missing production/simulator profiles must be harmless. Failed permission requests or scheduling must not crash workout entry or claim notifications are enabled.
