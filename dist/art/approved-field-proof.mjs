import {FIELD_PROOF_FRAMES} from './approved-field-proof-bindings.mjs';
import {browserImageLoader} from '../asset-runtime.mjs';
const images=new Map(); let pending;
// Presentation only. Existing collision, doorway, NPC and save coordinates remain authoritative.
export const FIELD_PROOF_PLACEMENTS=Object.freeze({
 'field.objects.ecocenter':Object.freeze({x:730,y:351,scale:0.45,depth:348,roles:['center_base','center_foreground']}),
 'field.objects.tree':Object.freeze({x:443,y:80,scale:0.25,depth:80,roles:['pine_base','pine_foreground']})
});
export function proofDestination(key,placement,camera=0){const f=FIELD_PROOF_FRAMES[key];return [placement.x-f.pivot[0]*placement.scale,placement.y-f.pivot[1]*placement.scale-camera,f.width*placement.scale,f.height*placement.scale]}
export function loadApprovedFieldProof(loader=browserImageLoader){return pending??=Promise.all(Object.entries(FIELD_PROOF_FRAMES).map(async([key,f])=>{try{const im=await loader(f.src);if(im.naturalWidth===f.width&&im.naturalHeight===f.height)images.set(key,im)}catch{ /* No unverified replacement fallback. */ }}))}
function draw(c,key,p,camera){const im=images.get(key);if(!im)return;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(im,...proofDestination(key,p,camera));c.restore()}
export function queueApprovedFieldProof(entities,source,context,camera,doorOpen=false){const p=FIELD_PROOF_PLACEMENTS[source];if(!p)return false;entities.push({depth:p.depth,draw:()=>{draw(context,p.roles[0],p,camera);if(source==='field.objects.ecocenter')draw(context,doorOpen?'door_open':'door_closed',p,camera)}},{depth:p.depth+1,draw:()=>draw(context,p.roles[1],p,camera)});return true}

// Canonical maps keep their authored collision rectangle; art gets its own uniform scale.
export function approvedObjectEntries(source,rect,grid=48,{objectScale=null}={}){
 const [x,y,w,h]=rect,center=(x+w/2)*grid,foot=(y+h)*grid;
 const config=source==='building.ecocenter'?{roles:['center_base','center_foreground'],scale:.35,door:true}:source==='field.objects.tree'?{roles:['pine_base','pine_foreground'],scale:.28}:source==='field.interior.table'?{roles:['table'],scale:.28}:null;
 if(!config)return null;const p={x:center,y:foot,scale:objectScale??config.scale};
 return config.roles.map((key,i)=>({depth:foot+i,draw:c=>{draw(c,key,p,0);if(i===0&&config.door)draw(c,'door_closed',p,0)}}));
}
