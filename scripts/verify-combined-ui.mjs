import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Focused integration gate. The full aggregate remains `npm test`; this does not
// replace it. Both production entry paths and the pinned shell are exercised.
const files=['tests/region-entry-popup.test.mjs','tests/region-entry-canonical.test.mjs',
 'tests/region-entry-opening.test.mjs','tests/region-entry-shell.test.mjs',
 'tests/species-dex-menu.test.mjs','tests/legacy-dex-entry.test.mjs','tests/dex-detail-presentation.test.mjs','tests/ordinary-overlays-presentation.test.mjs','tests/ordinary-status-row.test.mjs'];
const result=spawnSync(process.execPath,['--test',...files],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
