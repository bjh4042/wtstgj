# One-map original-World comparison experiment

This is an isolated development comparison, not an architecture change or production game/save format.

The included fixture.json is a synthetic assisted QA seed, not a user's save. It was created in a fresh in-memory backend with the player label 격리QA, an explicitly assisted level-100 party, and original game progression APIs. Its SHA-256 is 3132d12909bdfd83f96e846b041a050c29c18a69c7daec058c13de3545f7f2cf. Random session/creature identifiers and timestamps belong only to that generated test session. The visible QA-start button explicitly selects this seed. Subsequent movement, battle choices, original rewards and completed-state saves use the original World engine. No harness-created wins, direct pose injection or real user profile is included.

The app writes only its isolated geoje.dev.gym8-native-cadence-v1. browser-storage namespace. Completed SLOT 1 and explicitly imported SLOT 2 are distinct. An unfinished battle does not survive page destruction. This is not production save migration, Firebase integration, arbitrary encounters, or arbitrary full-world native movement. This successor opts into reviewed held native input only in GYM8. Original World owns the live position; release/pause/save barriers await durable flush acknowledgement. Page destruction can recover only the last completed durable save, not necessarily the latest live movement. Nominal192px/s is not an observed wall-clock guarantee.

Build order: run the repository's existing asset preparation, then tools/portable-native/build.mjs, then this directory's build.mjs. Its exact-copy manifest reuses existing repository files and the already-published portable native build; no new image bytes are uploaded. Serve only this directory's build output, never the repository root. Open /native_world_cadence_browser_r1/index.html.

All runtime bytes are pinned. Reports, local execution paths, stored QA test output and private review records are excluded. The build and static server reuse previously reviewed unchanged implementations. Chrome evidence remains pending until a separately approved bounded run.
