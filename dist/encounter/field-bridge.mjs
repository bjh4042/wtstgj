import {setEncounterMovementHandler} from './field-hook.mjs';
import {FIELD_GRID,behaviorAt} from '../field-behavior.mjs';
import {lockField,unlockField} from '../field-engine-core.mjs';
import {mapPresentation} from '../presentation/map-presentation.mjs';
/** Bind this sidecar only to the canonical session's field, never the legacy field.
 * Region placement is host metadata, independent of graphics. Default uses existing eligible tiles.
 */
export function attachCanonicalEncounterField(field,service,{regionAt=null,onResult=()=>{},onError=()=>{},battleOptions={}}={}){
 let pending=null,distance=0,scene=field.scene,cell={x:Math.floor(field.x/FIELD_GRID),y:Math.floor(field.y/FIELD_GRID)},regionKey=null;
 const reset=()=>{distance=0;scene=field.scene;cell={x:Math.floor(field.x/FIELD_GRID),y:Math.floor(field.y/FIELD_GRID)}};
 const detach=setEncounterMovementHandler(field,d=>{
  if(pending||service.busy||service.pendingCommit)return true;
  const context=service.encounterContext(),behavior=behaviorAt(field.scene,field.x,field.y),region=regionAt?.(field)??{areaId:context.areaId,method:context.method,eligible:!!behavior.encounter};
  const key=`${region.areaId}:${region.method}`;
  // No battle lock, RNG, safe-step consumption, or replacement table on approved no-random water.
  if(service.catalog.encounterContract.policyExcludedTables?.[key]){reset();regionKey=key;return false}
  if(scene!==field.scene||key!==regionKey){reset();regionKey=key;return false}
  if(!region.eligible){reset();return false}
  distance+=d;const next={x:Math.floor(field.x/FIELD_GRID),y:Math.floor(field.y/FIELD_GRID)},displacement=Math.abs(next.x-cell.x)+Math.abs(next.y-cell.y);
  if(displacement>1){reset();return false} // Warp/ledge relocation is not a walking check.
  if(distance+1e-6<FIELD_GRID||displacement!==1)return false;
  const movement={from:cell,to:next,serial:service.snapshot().encounter.movementSerial+1,areaId:region.areaId,method:region.method,moved:true,eligible:true,blocked:false,position:{scene:field.scene,x:field.x,y:field.y,facing:field.facing}};reset();
  lockField(field,'canonical-story');
  pending=service.encounterStep(movement,{...battleOptions,map:mapPresentation(field.scene)}).then(onResult).catch(onError).finally(()=>{pending=null;if(field.core.lock==='canonical-story')unlockField(field)});
  return true;
 });
 return {dispose:detach,settled:()=>pending??Promise.resolve(),resetPlacement:reset};
}
