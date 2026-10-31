import{loadApprovedNPCs,drawApprovedNPC}from'../../art/approved-npc-field.mjs';
import{loadApprovedAtlas}from'../../approved-atlas-runtime.mjs';
import{cargoOfficerRows}from'./officer-registration.mjs';
const names={BLACKNET_BOMI_FINAL:['BOMI','human.bomi.field'],BLACKNET_JUNSEOK_FINAL:['JUNSEOK','human.junseok.field'],BLACKNET_HWIGYEONG_FINAL:['HWIGYEONG','human.hwigyeong.field']};
export async function loadCargoOfficers(){for(const[name]of Object.values(names)){for(const face of ['FRONT','BACK','LEFT','RIGHT']){const image=await loadApprovedAtlas('npc',name+'.'+face+'.IDLE');if(!image||!(image.width>0)||!(image.height>0))throw Error('APPROVED_OFFICER_IMAGE_REQUIRED')}await loadApprovedNPCs(undefined,name)}}
export function cargoOfficerLayers(scene){return cargoOfficerRows().filter(r=>r.sceneId===scene).map(r=>({kind:'cargoOfficer',row:r,depthY:r.rootSelectedBody[1]}))}
export function drawCargoOfficer(ctx,r){return drawApprovedNPC(ctx,{id:r.sourcePoint.npcId,assetId:names[r.trainerId][1],x:r.rootSelectedBody[0],y:r.rootSelectedBody[1],facing:'down',visibleHeight:80})}
