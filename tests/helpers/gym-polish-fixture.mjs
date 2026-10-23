import {readFileSync} from 'node:fs';
import {loadCanonicalRuntimeAdapter} from '../../dist/compatibility/canonical-runtime-adapter.mjs';
import {CanonicalWorld} from '../../dist/world/service.mjs';
import {cellPosition} from '../../dist/world/definition.mjs';
import {syncWorldLocation} from '../../dist/world/state.mjs';
import {postLeagueFixture} from './enhanced-league-fixture.mjs';
export const adapter=await loadCanonicalRuntimeAdapter({readText:async f=>readFileSync(new URL('../../dist/data/canonical-handoff-v1/'+f,import.meta.url),'utf8')});
// Geometry only: prior trainer wins avoid re-running battles. Not progression evidence.
export function gymSeed(number){
 const s=postLeagueFixture(adapter),w=new CanonicalWorld({adapter,runtime:s,mode:'test'});
 s.progress.items.field_ability_surf=1;
 s.position=cellPosition('world:gym:'+number,3,18);s.world.puzzles=[];
 syncWorldLocation(s,w.host);w.dispose();return s;
}
export const gymWorld=(number,options={})=>new CanonicalWorld({adapter,runtime:gymSeed(number),mode:'test',...options});
