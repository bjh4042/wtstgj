import test from 'node:test';
import assert from 'node:assert/strict';
import {freshWorld} from './helpers/world-fixture.mjs';
import {inspectCanonicalWorldV3Boundary,requireCanonicalWorldV3Bridge} from '../dist/compatibility/save-v3-runtime.mjs';

test('fresh canonical world exposes exact known mappings and rejects unsupported v3 roundtrip',()=>{
 const runtime=freshWorld().snapshot(),original=structuredClone(runtime);
 const audit=inspectCanonicalWorldV3Boundary(runtime);
 assert.equal(audit.supported,false);
 assert.equal(audit.knownMappings.progress.currentStage,'PROLOGUE');
 assert.deepEqual(audit.knownMappings.dex.seenSpeciesNos,[]);
 assert.equal(audit.knownMappings.inventory.tm.TM50,false);
 assert.ok(audit.blockers.some(b=>b.code==='NATIVE_STATE_FIELD_UNMAPPED'&&b.path==='encounter'));
 assert.ok(audit.blockers.some(b=>b.code==='POSITION_UNIT_MAPPING_UNAVAILABLE'));
 assert.throws(()=>requireCanonicalWorldV3Bridge(runtime),error=>error.code==='CANONICAL_WORLD_SAVE_V3_BRIDGE_UNAVAILABLE'&&error.audit.blockers.some(b=>b.path==='encounter'));
 assert.deepEqual(runtime,original);
});

test('creature and grant provenance cannot be fabricated from their IDs',()=>{
 const runtime=freshWorld().snapshot();
 runtime.party=[{instanceId:'mon-1',speciesId:'SPECIES_001',level:5,totalExp:125,moves:[{id:'MV001',pp:20}],hp:20,status:null}];
 runtime.progress.geojeBallGrantHistory=['GEOJE_SAMPLE_GRANT'];
 const audit=inspectCanonicalWorldV3Boundary(runtime);
 assert.equal(audit.knownMappings.creatures[0].speciesNo,1);
 assert.ok(audit.blockers.some(b=>b.code==='CREATURE_PROVENANCE_UNAVAILABLE'&&b.path==='creatures.mon-1'));
 assert.ok(audit.blockers.some(b=>b.code==='GEOJE_GRANT_TIMESTAMP_UNAVAILABLE'));
 assert.equal(Object.hasOwn(audit.knownMappings.creatures[0],'obtainedAt'),false);
});

test('ordinary and malformed sessions cannot enter canonical v3 runtime bridge',()=>{
 const audit=inspectCanonicalWorldV3Boundary({format:'GEOJE_COMPATIBILITY_SAVE'});
 assert.equal(audit.knownMappings,null);
 assert.deepEqual(audit.blockers,[{code:'CANONICAL_WORLD_SESSION_REQUIRED',path:'runtime'}]);
});
