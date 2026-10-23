# Latest56 development verification

This is an unfinished development release for browser QA, not a finished game.

- Fresh ordinary games use the explicitly merged56-map release. Historical unversioned saves resolve to the historical55 adapter. No automatic migration or reset.
- Historical combat tables and existing trainer parties remain retained. New story/POST/trainer bindings and one exact trainer-only move exception are independently allowlisted.
- Public projection:1,333 tests total;1,322 passed,0 failed,11 skipped. Nine skips retain the earlier explicit retirement of excluded historical-art fixtures, and two are pre-existing skips. Gameplay/save/route/state tests are not retired to satisfy asset cleanup.
- The working tree additionally tests seven private-scene geometry cases. Those private features and their tests are excluded from this public projection, not represented as public gameplay coverage.
- Build passed. Configured typecheck passed its existing golden-field/vertical-slice scope; this is not a claim that every JavaScript module is typechecked.
- Build before running the test suite: the PWA test reads the generated service worker. The first concurrent build/test attempt had a missing built-worker fixture; the sequential full rerun passed.
- Relative module dependency closure has zero missing targets. Production output excludes private regional scene geometry/art. Existing approved PROLOGUE baseline is retained.

## What tests do and do not prove

Tests cover release-aware save read/import/reload, retained combat tables, authoritative battle outcomes and presentation tails, exactly-once capture/reward behavior, manual evolution presentation, responsive battle-layout bounds and approved asset integrity. Story-ending fixtures use controlled/overlevelled parties to prove state transitions, not normal-play balance or route discoverability.

Actual browser/device interaction, mobile browser bars, installed standalone mode, focus behavior, online weather failure, real save/reload and complete natural progression still require browser QA. Static or fake-DOM tests are not browser screenshots.

## Remaining limitations

Regional visual quality is unfinished. Private harbor/PROLOGUE prototypes are not included. Audio is not final; some selected fishing/tool artwork is not runtime-bound. Species004 and132 back art remain explicitly deferred and use a neutral labeled marker. Browser storage is local, not cloud synchronization. Export/import is needed when moving saves between origins. PWA offline support is a small fallback shell, not the full game; install UI/shortcut behavior depends on the browser and operating system.
