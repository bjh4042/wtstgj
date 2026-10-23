import {createSaveSlotStore,decodeSlot} from '../compatibility/save-slots.mjs';
import {stableJSON} from '../compatibility/codec.mjs';
import {CANDIDATE_ID} from './contract.mjs';
export const CANDIDATE_STORE_PREFIX='geoje.dev.economy-candidate-v1.';
/** Existing checksums, backup/temp/primary transaction and stale-tab detection; separate keyspace. */
export function createCandidateStore(storage,catalog){
 if(catalog.economyPolicy?.id!==CANDIDATE_ID)throw Error('Candidate catalog required');
 const scoped={getItem:k=>storage.getItem(CANDIDATE_STORE_PREFIX+k),setItem:(k,v)=>storage.setItem(CANDIDATE_STORE_PREFIX+k,v),removeItem:k=>storage.removeItem(CANDIDATE_STORE_PREFIX+k)};
 const store=createSaveSlotStore(scoped,{canonicalCatalog:catalog,allowCandidate:true});
 return {save:s=>{
  if(s.candidatePolicyId!==CANDIDATE_ID)throw Error('Candidate saves only');
  // A primary write can succeed before storage reports an error. Exact committed retry is safe;
  // a different/stale runtime still goes through the original optimistic concurrency check.
  const raw=store.peek('SLOT_1');if(raw){const saved=decodeSlot(raw,'SLOT_1',{canonicalCatalog:catalog,allowCandidate:true});if(stableJSON(saved.runtime)===stableJSON(s)){store.load('SLOT_1');return saved}}
  return store.save('SLOT_1',s);
 },load:()=>store.loadSession('SLOT_1')?.runtime??null,restore:()=>store.loadSession('SLOT_1',{backup:true,legacyFallback:false})?.runtime??null};
}
