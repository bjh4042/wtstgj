// Candidate only. No storage, mutable scene, landing selection or source installation.
const PINS=Object.freeze({
 'world:hub:POST':Object.freeze({revision:'POST_NATIVE_2SCENE_DEV_R1:hub',imageSHA:'29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8',maskSHA:'3ecad473fb5bbefce73d9afdf0b0f2ee57862f670f7e781eba1ffb5ecab38e48',width:3072,height:1024}),
 'world:post:nojasan-summit':Object.freeze({revision:'NOJASAN_NATIVE_FLOOR_YEJI_PROPOSAL_R2',imageSHA:'c6d76ae2334c032b7630c2fe547e3921731b558b9b324daa3ff912bf7ba7af66',maskSHA:'2ab3f2d872be9f7641542ebf035363cbcca53d81f9f1a4bbea1e8db018970602',width:1536,height:1024})
});
const fields=['version','sceneId','mapId','mapRevision','imageSHA','maskSHA','foot','facing'];
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function createPostSummitLocationRegistry({postMask,summitMask}){
 // Snapshot synchronously before any await; caller mutation cannot change verified movement support.
 const masks=new Map([['world:hub:POST',postMask],['world:post:nojasan-summit',summitMask]].map(([id,b])=>{if(!(b instanceof Uint8Array))throw Error('MASK_BYTES_REQUIRED');return[id,b.slice()]}));
 for(const[id,b]of masks){const p=PINS[id];if(b.length!==p.width*p.height||await sha(b)!==p.maskSHA)throw Error('EXACT_SELECTED_MASK_REQUIRED')}
 function validate(n){
  if(!n||Object.getPrototypeOf(n)!==Object.prototype||Reflect.ownKeys(n).length!==fields.length||fields.some(k=>!Object.hasOwn(n,k)||(!Object.hasOwn(Object.getOwnPropertyDescriptor(n,k),'value')||!Object.getOwnPropertyDescriptor(n,k).enumerable)))return 'INVALID_LOCATION_SCHEMA';
  if(n.version!==1)return 'UNKNOWN_NATIVE_VERSION';const p=typeof n.sceneId==='string'&&Object.hasOwn(PINS,n.sceneId)?PINS[n.sceneId]:null;if(!p)return 'UNKNOWN_NATIVE_SCENE';
  if(n.mapId!==n.sceneId)return 'NATIVE_MAP_MISMATCH';if(n.mapRevision!==p.revision)return 'UNKNOWN_MAP_REVISION';
  if(n.imageSHA!==p.imageSHA||n.maskSHA!==p.maskSHA)return 'NATIVE_PIN_MISMATCH';
  if(!['up','down','left','right'].includes(n.facing))return 'INVALID_FACING';
  const foot=n.foot;if(!Array.isArray(foot)||foot.length!==2||Reflect.ownKeys(foot).length!==3||[0,1].some(i=>!Object.hasOwn(Object.getOwnPropertyDescriptor(foot,String(i))??{},'value')||!Number.isSafeInteger(Object.getOwnPropertyDescriptor(foot,String(i)).value)))return 'INVALID_FOOT';
  const[x,y]=n.foot;if(x<0||y<0||x>=p.width||y>=p.height||masks.get(n.sceneId)[y*p.width+x]!==1)return 'UNSUPPORTED_FOOT';
  // Summit actor is visible even after completion; match current scene collision exactly.
  if(n.sceneId==='world:post:nojasan-summit'&&Math.abs(x-960)<=48&&Math.abs(y-360)<=36)return 'ACTOR_COLLISION';
  return null;
 }
 return Object.freeze({validate,describe(id){const p=typeof id==='string'&&Object.hasOwn(PINS,id)?PINS[id]:null;if(!p)throw Error('UNKNOWN_NATIVE_SCENE');return {version:1,sceneId:id,mapId:id,mapRevision:p.revision,imageSHA:p.imageSHA,maskSHA:p.maskSHA}}});
}
