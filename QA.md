# Development QA status

This is a source/build test snapshot, not a release-quality certificate.

- Production build: passed.
- Full automated suite: 1,247 tests; 1,236 passed, 0 failed, 11 skipped (9 documented historical-only retirements, 2 pre-existing). Sanitized approved-binding follow-up: 12/12 passed.
- Browser/device/PWA install testing: NOT EXECUTED.
- End-to-end complete story playthrough: NOT EXECUTED.
- Remote deployment: not yet verified.

All functional gameplay, battle, save, route, environment and state tests are retained. Nine historical-only tests are explicitly skipped: six excluded raster-presence checks and three private static-recording checks. Four mixed historical pixel-inspection sections were removed while their identity, binding, animation, collision and save assertions remain. Approved player/NPC/species/terrain integrity suites replace the old asset-byte checks. Two renderer expectations were updated to the approved loading contract. The online hash-sync tests remain unchanged, with their required pure helper restored. Two pre-existing skips remain separate.

The original historical tests are retained privately, not reported as passing. `QA_TEST_MAPPING.json` lists the exact changes. No excluded historical image was restored merely to satisfy a test.

Lossless atlas update: 214 PNG sheets replace 996 individual images without resampling. All 996 exact RGBA crops and padding/deferred pixels are verified in the public Node suite. Atlas runtime tests verify lazy identity requests, exact foot anchors and canonical icon bindings. Canonical import tests preserve 604 logical slots while allowing shared physical files. Full suite and production build were rerun after these changes.
