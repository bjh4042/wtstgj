import {readFileSync} from 'node:fs';
import {deepFreeze} from '../../dist/compatibility/codec.mjs';
// Exact immutable pre-price/PP approval item table. Historical assertions remain unchanged.
const source=JSON.parse(readFileSync(new URL('../../dist/data/canonical-handoff-v1/geoje_battle_collection_master_v3.json',import.meta.url),'utf8'));
export function beforeConsumablesApproval(adapter){return {...adapter,consumableApproval:undefined,battleRuntime:{...adapter.battleRuntime,items:deepFreeze(Object.fromEntries(source.items.catalog.map(i=>[i.id,structuredClone(i)])))}}}
