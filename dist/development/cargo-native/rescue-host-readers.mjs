import{verifyEightSceneMaterial}from'../../world/cargo-eight-scene-geometry.mjs';
const readers=new WeakSet();
export const RESCUE_IDS=Object.freeze(['S9_FINAL_VILLAIN_RAID','RIVAL_S9_ALLY','S9_RELEASE_RESCUED'].map(x=>'event:'+x));
const anchors=Object.freeze({'event:S9_FINAL_VILLAIN_RAID':[215,166,18],'event:RIVAL_S9_ALLY':[800,400,37],'event:S9_RELEASE_RESCUED':[775,130,18]});
const foot=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger);
export function cargoRescueBodyClear(scene,p){if(!foot(p))return false;if(scene!=='ship_rescue')return true;return !(p[0]>=752&&p[0]<849&&p[1]>=364&&p[1]<437)}
export function allowsRescueInteraction(spec,m,id,p,facing){const a=anchors[id];return!!a&&spec?.sceneId==='ship_rescue'&&verifyEightSceneMaterial(spec,m)&&foot(p)&&facing==='up'&&m.isSafeFoot(p)&&cargoRescueBodyClear('ship_rescue',p)&&p[1]>=a[1]+a[2]&&(p[0]-a[0])**2+(p[1]-a[1])**2<=64**2}
export function createCargoRescueHostReaders({getConsumer,getMaterial,getWorld,getConsumerWorld,getSessionEpoch,registry}){
 for(const f of[getConsumer,getMaterial,getWorld,getConsumerWorld,getSessionEpoch])if(typeof f!=='function')throw Error('RESCUE_HOST_READER_FUNCTIONS');
 const out=Object.freeze({readNative(id){const w=getWorld();if(!w||w!==getConsumerWorld())return null;const c=getConsumer();if(!c)return null;const s=c.snapshot(),n=s.native,epoch=getSessionEpoch(),spec=registry.scenes[n?.sceneId],m=getMaterial(n?.sceneId);if(s.active!==true||s.hidden!==false||s.fixturePending!==false||s.uiMode!==null||n?.active!==true||n.pending||n.clock?.paused!==false||n.mapId!=='world:ship:S9'||!Number.isSafeInteger(epoch)||epoch<0||!allowsRescueInteraction(spec,m,id,n.foot,n.facing))return null;return Object.freeze({version:1,eventPointId:id,sceneId:'ship_rescue',mapId:'world:ship:S9',revision:m.geometryRevision,imageSHA:m.artSHA256,maskSHA:m.footMaskSHA256,foot:Object.freeze([...n.foot]),facing:n.facing,sessionEpoch:epoch})}});readers.add(out);return out;
}
export const isCargoRescueHostReaders=r=>readers.has(r);
