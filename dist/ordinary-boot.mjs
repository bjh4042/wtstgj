import './pwa/install.mjs';
// Preserve the audited shell before mounting either ordinary route. No QA storage facade.
const shell='/wtstgj/assets/mobile-viewport-CKi2spbv.js';
await import(/* @vite-ignore */ shell);
const hud='/wtstgj/nearby-safe-band.mjs';
await import(/* @vite-ignore */ hud);
const {installAtlasRecoveryStatus}=await import('./ui/atlas-recovery-status.mjs');
installAtlasRecoveryStatus();
await import('./game-entry.mjs');
