# Exact source asset storage

The approved S7 and S8 PNGs are stored as three and two byte chunks under `asset-sources/nambu-open-r1` and `asset-sources/s8-closed-r1`, not as a directly uploaded large PNG blob. This is a source-storage recipe, not a new image, compression method, runtime map format or save format.

`npm run dev`, `npm test`, and `npm run build` run `node scripts/prepare-assets.mjs` first. It verifies every chunk and the full original PNG SHA-256, then reconstructs the original runtime path automatically. No manual joining, network access, dependencies or install hooks are used.

The S8 original is exactly 13,270,263 bytes, SHA-256 `f602c93bdee4c4bd7d08f87d9951b34515d9ffbb34769aea28a4331ffb8b5e06`.

The S7 original is exactly 21,968,609 bytes, SHA-256 `72751f4ffa8e719a3a500d59dda6ae777ebb33022120563e237ac354e61a55b9`. Its PNG bytes, pixels, scale and runtime consumers are unchanged. Existing exact files are reused. A conflicting file, missing/corrupt chunk, symlink, or unsupported atomic hard-link operation stops preparation. It never overwrites a conflicting user file. Keep the conflicting file for review rather than deleting it automatically.

Generated PNG storage is ignored only in its own source directory. Chunk files and their manifest are committed. The existing sanitized native development scope and provenance remain unchanged. This does not claim that the candidate is published or that browser latency is verified.
