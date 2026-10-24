# Mongdol standalone playable QA candidate

This is an unfinished single-scene QA module, not the full game. It does not read or write the existing game's saved data and does not register a service worker. Serve this directory over an authorized HTTPS origin. All resource paths are relative.

- Arrow keys or WASD: move. Z/Enter: A. X/Esc: B. D-pad and A/B buttons are provided for later touch testing.
- The shop door opens a local probe only; no indoor map is connected. Sea and rocky shore are blocked. Stairs join the two walking levels.
- Day/night and automatic KST night (18:00–06:00) controls are available. UI remains outside scene lighting.
- Player default is 80 px. The 110 px option is a comparison only and does not change collision or speed.
- Gait phases use actual movement distance. Five registered foreground fragments restore limited occlusion; water is static.

Static unit/geometry and shared-controller simulations passed. Real HTTPS browser, touch, device brightness, interruption and performance checks remain separate. Fixed frame registration is not a claim of perfect support-foot lock.

The background is a user-approved AI edit derived directly from a supplied reference scene, not an independently invented scene. The private reference file itself is not included. Five foreground transmission layers zero RGB only where alpha is zero; all alpha and every visible pixel are unchanged. See asset-provenance.json for the selected asset origins and hashes. No general redistribution license is granted.

A pre-existing parent-scope service worker may control navigation on a shared host. This module neither registers nor unregisters workers and does not change the parent's offline shell or caches. Offline use is not supported.
