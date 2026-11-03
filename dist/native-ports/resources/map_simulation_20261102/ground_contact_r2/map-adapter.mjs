import{isSimulationMapAdapter as isLegacyAdapter}from'../map-adapter.mjs';
// Common independent-map contract. This brand NEVER denotes original game authority.
export const SIMULATION_NAMESPACE='READONLY_MAP_SIMULATION/NEW_REBUILD_R1';
const brands=new WeakSet(),hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
export const isSimulationMapAdapter=x=>(brands.has(x)||isLegacyAdapter(x))&&!x.disposed;
export function simulationPose({mapId,state,foot,facing,epoch}){
 if(typeof mapId!=='string'||typeof state!=='string'||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger)||!['up','down','left','right'].includes(facing)||!Number.isSafeInteger(epoch)||epoch<0)throw Error('SIM_POSE');
 return Object.freeze({namespace:SIMULATION_NAMESPACE,mapId,state,foot:Object.freeze([...foot]),facing,epoch,gameAuthority:false});
}
export function createSimulationMapAdapter({provider,expected,sourceKind}){
 if(!provider||!expected||!['ORIGINAL_LEAF_PROVIDER','NEW_REBUILD_LEAF_PROVIDER'].includes(sourceKind))throw Error('SIM_ADAPTER_INPUT');
 const i=provider.identity;if(!i||i.mapId!==expected.mapId||i.state!==expected.state||i.width!==expected.width||i.height!==expected.height||i.imageSHA256!==expected.imageSHA256||!hex(expected.imageSHA256)||!hex(expected.supportSHA256)||(i.rawFloorSHA256??i.safeSHA256??i.supportSHA256??i.geometrySHA256)!==expected.supportSHA256||expected.footWidth!==30||expected.footHeight!==8||expected.contactPolicy!=='NEW_COMMON_FOOT_IDLE30_DEPTH8'||i.contactPolicy!==expected.contactPolicy||i.footWidth!==30||i.footHeight!==8)throw Error('SIM_ADAPTER_IDENTITY');
 for(const f of['safe','camera','drawBase','dispose'])if(typeof provider[f]!=='function')throw Error('SIM_ADAPTER_API');
 const identity=Object.freeze({...expected,namespace:SIMULATION_NAMESPACE,sourceKind,gameAuthority:false});let dead=false,finalized=false;const leases=new Set();
 const alive=()=>{if(dead)throw Error('SIM_ADAPTER_DISPOSED')},finish=()=>{if(dead&&!leases.size&&!finalized){finalized=true;provider.dispose()}};
 const safe=(x,y)=>!dead&&Number.isInteger(x)&&Number.isInteger(y)&&provider.safe(x,y)===true;
 const camera=(x,y)=>{alive();const raw=provider.camera(x,y),c=Array.isArray(raw)?raw:raw&&[raw.x,raw.y,raw.width,raw.height];if(!Array.isArray(c)||c.length!==4||!c.every(Number.isInteger)||c[2]!==960||c[3]!==540||c[0]<0||c[1]<0||c[0]>Math.max(0,identity.width-960)||c[1]>Math.max(0,identity.height-540))throw Error('SIM_CAMERA');return Object.freeze([...c])};
 function acquirePresentation(){alive();let released=false;const token={};leases.add(token);const check=()=>{if(released||finalized)throw Error('SIM_PRESENTATION_RELEASED')};
  return Object.freeze({namespace:SIMULATION_NAMESPACE,identity,drawBase(ctx,c){check();const rawCamera=provider.camera(c[0]+480,c[1]+270);if(provider.drawBase(ctx,Array.isArray(rawCamera)?c:Object.freeze({x:c[0],y:c[1],width:c[2],height:c[3]}))!==true)throw Error('SIM_BASE_DRAW_FAILED');check();return true},release(){if(released)return;released=true;leases.delete(token);finish()},get released(){return released}});
 }
 const api=Object.freeze({identity,safe,camera,acquirePresentation,dispose(){if(dead)return;dead=true;finish()},get disposed(){return dead},get activePresentationLeases(){return leases.size},get providerFinalized(){return finalized}});brands.add(api);return api;
}
