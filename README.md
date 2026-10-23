# 생태몬스터: 거제도 — development preview

This repository is an **unfinished development build**, not a finished game or a claim of production quality. It is prepared for remote browser testing.

## Run

Node.js 22.12+ (or a compatible newer release):

```sh
npm ci
npm test
npm run build
npm run dev
```

The production base is `/wtstgj/`. Publish the generated `build/` directory, not a source ZIP. No provider credentials are required for the local single-player preview. Online services are not configured or claimed to work.

## Current scope

- Existing ordinary 55-map story/runtime and save namespace retained. The separate staged 56-map dataset is not activated.
- Selected original smooth player/NPC art, semantic terrain, opening art, 11 battle backgrounds and original monster battle art replace excluded historical images.
- Saved progress is not reset or migrated. Legacy saved-game routing remains, but its visual replacement is incomplete and may show missing/fallback presentation.
- Install support uses the browser's optional installation prompt. iOS receives manual installation guidance. Browser address-bar controls and desktop shortcuts cannot be forced.
- The service worker caches only a small installation/offline shell. Full offline gameplay is not yet supported.

## Known unfinished work

Map composition, building/person proportions, some old-route/interior visuals, battle UI integration and complete story playthrough still need work. Two monster rear views (GM004 and GM132) are intentionally deferred and display a neutral “후면 준비 중” marker. Special action art, follower/bicycle/surf presentation and shared effects are not all wired. No final audio package is included.

Responsive styles and automated geometry tests are present; real desktop/tablet/phone, orientation, zoom, safe-area, browser-bar and installed-mode checks are **not yet executed**. Static recordings are not browser QA. See `QA.md` and `QA_TEST_MAPPING.json`.

## Assets and rights

Only explicitly selected project artwork and the bundled OFL-licensed font are distributed. Original-source and runtime-derivative hashes are retained in approved bindings. Historical screenshot-derived artwork, ROMs, extracted sprites, provider logs and private archives are excluded. No third-party franchise affiliation is implied. No general license grant is made for project artwork; see the font's bundled OFL for its separate terms.

## Lossless runtime sheets

Human frames are packed per identity and monster front/back images per species, without resizing or changing RGBA pixels. Runtime sheets load lazily. The public atlas tests verify every original frame pixel hash, source rectangle, transparent deferred view and padding. This packaging reduces upload/network file counts, not image quality.
