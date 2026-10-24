# Ordinary UI development integration

This is a development integration, not a finished-game, mobile-device or iOS certification. It adds the species Dex and short region-entry notice to the existing ordinary game, including the desktop-tested menu/Help focus coordination and measured-header status row. It does not change canonical battle balance, maps, artwork, save formats or slot keys. Opening-character selection and the later P02 starter grant remain the existing separate flow.

## Reproduce from this repository

Use the committed package lock and existing dependencies:

```sh
npm ci --ignore-scripts
node tools/build-ordinary-notice-v2.mjs
npm test
node scripts/verify-combined-ui.mjs
npm run typecheck
```

The established ordinary build stages the unchanged four PWA resources before running the existing service-worker generator. The generic package build command alone does not stage those resources into a freshly emptied build directory. Type checking retains its existing two-module scope; it is not whole-project TypeScript coverage.

The fresh sibling-free verification on 2026-10-24 passed 1,501 tests, with 11 existing skips, out of 1,512 total; the focused UI suite passed 77/77. All 29 generated build files matched the tested candidate byte for byte. The 23 compiled asset files were already present in docs/assets; deployment changes only the ordinary HTML entry URL and generated service-worker cache-version literal.

## Portability and persistence

Four UI tests import the already locked linkedom dependency by package name rather than a neighboring checkout. The canonical test defaults to this repository root. The Dex baseline fixture is byte-identical to its original input: 708 relative public game paths and SHA-256 values only, with no absolute workspace paths or unrelated metadata. Existing portable fixtures and lockfiles are preserved.

The ordinary bootstrap, PWA registration, save implementation and namespaces are unchanged. No isolated-preview storage wrapper or PWA-disable wrapper is used by the ordinary route. The service worker retains its existing static-resource policy; the cache-version change does not clear or migrate game saves, force activation, or add runtime caching.

## Verification boundaries

Actual cloud-desktop checks passed in the isolated preview using its dedicated QA slot: title contrast, first-detail top/image, search/filter/Back focus, pointer focus containment, Help/menu handoff, repeated and held controls, visible menu status, and non-overlapping 44-pixel nearby controls after save feedback. These are not observations of a newly deployed ordinary route or a user's ordinary save.

Final post-save export equality was not run because the optional file-manager navigation was blocked. Baseline export comparison and source persistence invariance were verified; they are not a substitute for that missing final runtime comparison. Real iOS, touch/soft-keyboard and narrow/short viewport checks, legacy import, forced storage failures, fresh region timing/lifecycle, PWA installation/offline/update behavior, and naturally unavailable long/error feedback remain unverified in the final browser pass. Existing isolated previews remain separate and unchanged.
