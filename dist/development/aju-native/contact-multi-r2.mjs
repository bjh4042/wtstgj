import {createNativePoint2Reader} from './point2.mjs';
export const CONTACT_R2=Object.freeze({distance:32,frameMs:90,lifeMs:360,maxContacts:8,maxContinuousSampleDistance:32,entryDistance:4,entryCooldownMs:180,entryCooldownTravel:32});
export function createGrassStepR2({sceneId,materialContains,safe49,width=1536,height=1024}){
 const read=createNativePoint2Reader(width,height);let distance=0,last=null,active=[],serial=0,lastFoot=null,wasInside=null,entryTravel=0,entryArmed=false,totalTravel=0,lastEmissionTravel=-Infinity,lastEmissionMs=-Infinity;
 const reset=()=>{distance=0;last=null;lastFoot=null;active=[];wasInside=null;entryTravel=0;entryArmed=false;totalTravel=0;lastEmissionTravel=-Infinity;lastEmissionMs=-Infinity;return{frames:[],emitted:false,sourceWrites:0}};
 return {reset,sample({sceneId:id,foot,movedDistance=0,nowMs,blocked=false,menu=false,focused=true,movementIntent=false,subpixelDeferred=false}){
 const p=read(foot);
 if(!p||id!==sceneId||menu||!focused||blocked||!Number.isFinite(nowMs)||!Number.isFinite(movedDistance)||movedDistance<0||movedDistance>32||!safe49(p))return reset();
 if(last!==null&&nowMs<last)return reset();
 if(lastFoot&&Math.abs(p[0]-lastFoot[0])+Math.abs(p[1]-lastFoot[1])>movedDistance)return reset();
 const inside=materialContains(p),hasBaseline=lastFoot!==null,previousInside=wasInside;
 if(movedDistance===0&&!(movementIntent&&subpixelDeferred)){reset();last=nowMs;lastFoot=[...p];wasInside=inside;return{frames:[],emitted:false,sourceWrites:0};}
 last=nowMs;lastFoot=[...p];wasInside=inside;totalTravel+=movedDistance;
 if(!inside){distance=0;active=[];entryTravel=0;entryArmed=false;return{frames:[],emitted:false,sourceWrites:0};}
 if(hasBaseline&&previousInside===false&&movedDistance>0){entryArmed=true;entryTravel=0;}
 if(entryArmed)entryTravel+=movedDistance;
 active=active.filter(a=>nowMs-a.start<360);distance+=movedDistance;
 const regular=distance>=32,entryReady=entryArmed&&entryTravel>=4,entry=entryReady&&totalTravel-lastEmissionTravel>=32&&nowMs-lastEmissionMs>=180;
 if(entryReady)entryArmed=false;
 let emitted=false,reason=null;
 if(regular||entry){if(regular)distance%=32;active.push({start:nowMs,foot:[...p],id:++serial});active=active.slice(-8);lastEmissionTravel=totalTravel;lastEmissionMs=nowMs;entryArmed=false;emitted=true;reason=regular?'stride32':'entry4';}
 return{frames:active.map(a=>({frame:Math.floor((nowMs-a.start)/90),contact:a.foot,id:a.id})),emitted,reason,accumulatedDistance:distance,sourceWrites:0};
 }};
}
// Explicit newer-contact wins per nontransparent pixel, no repeated source-over stacking.
export function composeContactLayerR2({contacts,phaseRGBA,width=960,height=540,origin=[0,0],targetPixels=null,targetOwner=null}){
 const pixels=targetPixels??new Uint8ClampedArray(width*height*4),owner=targetOwner??new Uint32Array(width*height);pixels.fill(0);owner.fill(0);
 for(const c of contacts){if(!Number.isInteger(c.frame)||c.frame<0||c.frame>3)throw Error('FRAME');const src=phaseRGBA[c.frame],x=c.contact[0]-origin[0]-32,y=c.contact[1]-origin[1]-28;
 for(let yy=0;yy<40;yy++)for(let xx=0;xx<64;xx++){const dx=x+xx,dy=y+yy;if(dx<0||dy<0||dx>=width||dy>=height)continue;const s=(yy*64+xx)*4;if(!src[s+3])continue;const d=dy*width+dx;pixels.set(src.subarray(s,s+4),d*4);owner[d]=c.id;}}
 return{pixels,owner};
}
