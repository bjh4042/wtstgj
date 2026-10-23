import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../dist/data/geoje_species_151_v2.json',import.meta.url)));
test('canonical v2 catalog preserves all numbers and evolution structures',()=>{const rows=data.species;assert.deepEqual(rows.map(s=>s.no),Array.from({length:151},(_,i)=>i+1));const chains=Map.groupBy(rows,s=>s.chain_id);assert.equal(chains.size,58);assert.equal([...chains.values()].filter(a=>a.length===3).length,42);assert.equal([...chains.values()].filter(a=>a.length===2).length,9);assert.equal([...chains.values()].filter(a=>a.length===1).length,7);for(const chain of chains.values()){assert.deepEqual(chain.map(s=>s.name),chain[0].chain_names);assert.equal(chain.length,chain[0].chain_length)}assert.equal(new Set(rows.filter(s=>s.protected_priority_30).map(s=>s.motif)).size,30);assert.equal(rows[150].name,'온섬령')});
