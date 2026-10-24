import {validateCanonicalStorySave} from '../story/save.mjs';
import {tableAccess,acquisitionAccess} from './access.mjs';
import {isPost20260927,roamerAt20260927} from '../story/post-20260927.mjs';
// Single-use session/revision-bound capabilities, never serializable asset/name bypasses.
const permits=new WeakMap();
export function issueEncounterPermit(input,catalog,request){
 const save=validateCanonicalStorySave(input,catalog),c=catalog.encounterContract;
 let error;
 if(request.tableId){
  error=tableAccess(save,c,request.tableId);const slot=c.tables[request.tableId]?.slots.find(s=>s.slotId===request.slotId);
  if(!slot||slot.speciesId!==request.speciesId||!Number.isInteger(request.level)||request.level<slot.level[0]||request.level>slot.level[1])error='SLOT_MISMATCH';
 }else if(request.roamingNo){
  const no=request.roamingNo,p=save.position;
  if(!isPost20260927(c)||roamerAt20260927(save,c.story,p.scene,Math.floor(p.x/48),Math.floor(p.y/48))!==no||c.story.speciesIdsByNumber[no]!==request.speciesId||!Number.isInteger(request.level)||request.level<1||request.level>100)error='ROAMER_NOT_AVAILABLE';
 }else{
  error=acquisitionAccess(save,c,request.eventId);const event=c.events[request.eventId];
  if(!['battle_capture',...(isPost20260927(c)?['battle_resolution']:[])].includes(event?.mode)||event.speciesId!==request.speciesId||event.level!==request.level)error='FIXED_ENCOUNTER_MISMATCH';
 }
 if(error)throw Error(error);
 const permit=Object.freeze({});permits.set(permit,{sessionId:save.sessionId,revision:save.revision,speciesId:request.speciesId,level:request.level});return permit;
}
export function consumeEncounterPermit(permit,session,opponents,kind){
 const proof=permits.get(permit);permits.delete(permit);
 if(!proof||kind!=='wild'||opponents.length!==1||proof.sessionId!==session.runtime.sessionId||proof.revision!==session.runtime.revision||opponents[0].namespace!=='canonical'||proof.speciesId!==opponents[0].speciesId||proof.level!==opponents[0].level)throw Error('Invalid encounter capability');
 return true;
}
