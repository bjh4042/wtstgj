import{loadApprovedNPCs,drawApprovedNPC}from'../../art/approved-npc-field.mjs';
import{loadApprovedAtlas}from'../../approved-atlas-runtime.mjs';
export async function loadRescueHarin(){for(const face of ['FRONT','BACK','LEFT','RIGHT']){const im=await loadApprovedAtlas('npc','HARIN.'+face+'.IDLE');if(!im||!(im.width>0)||!(im.height>0))throw Error('APPROVED_HARIN_IMAGE_REQUIRED')}await loadApprovedNPCs(undefined,'HARIN')}
export function drawRescueHarin(ctx,{completed=false}={}){return drawApprovedNPC(ctx,{id:'NPC_RIVAL_HARIN',assetId:'human.harin.field',x:800,y:400,facing:completed?'up':'down',visibleHeight:80})}
export function drawBridgeRescueForeground(ctx,art){if(!art)return;ctx.drawImage(art,1416,434,120,147,1416,434,120,147)}
