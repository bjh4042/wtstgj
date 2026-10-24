# Standalone source verification for notice V2

This additive source-only portability overlay does not change game runtime, media, map data or compiled output. It preserves the frozen notice-V2 candidate identified by SHA-256 d1780ced2d345b86ebd859d575a9ef44fdfcaea4c5ca94ac164dade565e4a5f7.

## Supported clean-checkout verification

1. npm ci
2. node tools/build-ordinary-notice-v2.mjs
3. npm test
4. npm run typecheck

The verified toolchain was Node.js 24.22.1 and npm 11.9.0. LinkeDOM 0.18.12 is now an exact development dependency with its transitive packages pinned in package-lock.json, rather than a dependency on a neighboring recovery workspace. The isolated validation used a fresh npm ci --offline --ignore-scripts from the already populated package cache; the cache supplies dependency archives, not project source.

The custom build copies the four original static PWA resources before invoking the unchanged PWA generator. The historical generic npm run build command assumes these resources were already staged; use the custom command above for this source candidate. This work does not alter installation, worker registration, caching or activation behavior.

The standalone source projection reproduced 1,419 passing tests and the same 11 explicitly skipped historical-evidence tests, with zero failures. No tests were removed, no result was weakened and no additional skip was introduced. The old lifecycle negative-control fixture is now mandatory: a missing vendored fixture fails rather than silently skips. The configured typecheck remains limited to vertical-slice.mjs and golden-field.mjs; it is not a whole-repository typecheck.

## Exact historical fixtures

The tests compare against original earlier source, not rewritten substitutes. tests/fixtures/PORTABLE_HISTORY_PROVENANCE.json records every original byte hash, size and source revision label.

- frozen-notice-v1: original StoryProgressionService with its complete minimal transitive relative-import closure (81 files), plus the original world entry read as text by the existing full-entry harness.
- published-main-8c4f847: original world definition and its complete minimal transitive relative-import closure (33 files).
- frozen-retry-v2: original pre-repair world entry read as text by the existing negative-control harness.
- frozen-retry-v3: the original NPC binding module and the original five source files used for byte-hash preservation assertions.

The 122 historical fixture files are copied byte-for-byte. Their import statements were not rewritten, and no executable historical module depends on source outside the checkout. Entry fixtures are intentionally read as text and have browser bindings injected by the pre-existing tests; byte-hash fixtures are read but not executed, so these do not need their own browser/module closure.

## Optional historical packaging tools

The verification commands above are self-contained after npm ci. The historical archive-generation helpers tools/freeze-notice-v2.py and tools/package-ordinary-candidate.py are not. They intentionally compare against earlier recovery archives, prior frozen manifests, reports and pinned publication dependencies that are not recreated by this portability overlay. Treat them as optional archival tooling, not clean-checkout build or test requirements. This overlay does not claim every historical packaging or manual QA-generation script is a standalone workflow.

The 11 retained skips concern unavailable historical raster/static recording or Git-history evidence. A full-history clone may make historical Git checks available; this source-snapshot result does not claim those checks passed. Real-browser/device/network/PWA-install verification remains separate from source portability.
