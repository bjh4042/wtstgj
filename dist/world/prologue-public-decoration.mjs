/** PROLOGUE composition v1. Presentation only by default; proposal props require explicit root gate.
 * Never mutates map tiles, event coordinates, world state, or saves. Units: canonical 48px cells. */
import {browserImageLoader} from '../asset-runtime.mjs';
import {drawApprovedTile} from '../approved-field-terrain.mjs';
import {approvedObjectEntries} from '../art/approved-field-proof.mjs';
import {PROLOGUE_PROP_FRAMES} from './prologue-public-bindings.mjs';
export const PROLOGUE_PROPORTIONS=Object.freeze({actor64:{actorHeight:64,centerScale:.24,doorHeight:115.2,lampHeight:150.9,treeHeight:178,benchHeight:31},actor80:{actorHeight:80,centerScale:.28,doorHeight:134.4,lampHeight:184.8,treeHeight:178,benchHeight:31},centerFootprintProposal:{from:[3,5,7,3],to:[4,6,5,2],foot:[312,384]}});
const G=48,ID='world:hub:PROLOGUE';
export const PROLOGUE_COMPOSITION=Object.freeze({
 version:'PROLOGUE_COMPOSITION_V2',mapId:ID,geometry:'UNCHANGED_DEFAULT',
 corridors:[{name:'Main village promenade',rect:[1,10,38,4]},{name:'Center forecourt',rect:[4,8,5,3]},{name:'West woodland connection',rect:[1,2,2,10]},{name:'North connection lane',rect:[2,2,10,3]},{name:'Coast connection lane',rect:[10,4,2,7]},{name:'Harin garden approach',rect:[21,13,5,6]},{name:'Survey approach',rect:[30,13,5,7]},{name:'Southern garden loop',rect:[2,18,35,2]}],
 flowers:[[3,15],[4,15],[8,16],[9,16],[13,6],[17,6],[19,8],[27,7],[29,7],[34,8],[36,16],[16,20],[17,20],[27,21],[28,21]],
 proposalProps:[
 {id:'forest-camellia-a',kind:'O_CAMELLIA_BLOOM',rect:[12,5,1,1]}, {id:'forest-camellia-b',kind:'O_CAMELLIA_BLOOM',rect:[16,4,1,1]}, {id:'forest-canopy-a',kind:'O_EVERGREEN_BROAD',rect:[14,3,1,1]}, {id:'forest-canopy-b',kind:'O_EVERGREEN_BROAD',rect:[19,5,1,1]},
 {id:'entry-camellia',kind:'O_CAMELLIA_BLOOM',rect:[3,7,1,1]},
 {id:'foreground-canopy',kind:'O_EVERGREEN_BROAD',rect:[1,16,1,1]},
 {id:'entry-planter-west',kind:'gardenbed',rect:[3,8,2,1]}, {id:'entry-planter-east',kind:'gardenbed',rect:[8,8,2,1]},
 {id:'north-shrub-a',kind:'O_SHRUB_ROUND',rect:[12,6,1,1]}, {id:'north-shrub-b',kind:'O_SHRUB_ROUND',rect:[13,6,1,1]},
 {id:'north-shrub-c',kind:'O_WOODLAND_SHRUB',rect:[19,7,1,1]}, {id:'north-shrub-d',kind:'O_SHRUB_ROUND',rect:[19,8,1,1]},
 {id:'south-shrub-a',kind:'O_SHRUB_ROUND',rect:[4,16,1,1]}, {id:'south-shrub-b',kind:'O_SHRUB_ROUND',rect:[5,16,1,1]},
 {id:'south-shrub-c',kind:'O_WOODLAND_SHRUB',rect:[11,16,1,1]}, {id:'south-shrub-d',kind:'O_SHRUB_ROUND',rect:[12,16,1,1]},
 {id:'north-pine-a',kind:'tree',rect:[14,8,1,1]}, {id:'north-pine-b',kind:'tree',rect:[18,8,1,1]},
 {id:'north-bench',kind:'O_BENCH',rect:[15,9,2,1]},
 {id:'center-lamp',kind:'O_LAMP_STREET',rect:[12,9,1,1]},
 {id:'garden-sign',kind:'O_SIGN_WOOD',rect:[13,9,1,1]},
 {id:'south-bench',kind:'O_BENCH',rect:[6,16,2,1]},
 {id:'south-planter',kind:'O_PLANTER',rect:[9,16,2,1]},
 {id:'south-pine-a',kind:'tree',rect:[3,16,1,1]}, {id:'south-pine-b',kind:'tree',rect:[13,17,1,1]},
 {id:'east-pine-a',kind:'tree',rect:[28,8,1,1]}, {id:'east-pine-b',kind:'tree',rect:[34,8,1,1]},
 {id:'east-bench',kind:'O_BENCH',rect:[30,8,2,1]},
 {id:'east-lamp',kind:'O_LAMP_STREET',rect:[35,9,1,1]},
 {id:'garden-fence-a',kind:'O_FENCE_WOOD',rect:[15,16,2,1]},
 {id:'garden-fence-b',kind:'O_FENCE_WOOD',rect:[17,16,2,1]},
 {id:'garden-planter',kind:'O_PLANTER',rect:[27,17,2,1]},
 {id:'south-pine-c',kind:'tree',rect:[35,21,1,1]},
 {id:'south-pine-d',kind:'tree',rect:[6,21,1,1]}
 ]
});
const frames={...PROLOGUE_PROP_FRAMES,flower:{src:'./assets/approved-terrain/O_WILDFLOWER.png',width:256,height:256,pivot:[128,128]}};
const images=new Map();let pending;
export function loadPrologueDecorations(loader=browserImageLoader){return pending??=Promise.all(Object.entries(frames).map(async([k,v])=>{const im=await loader(v.src);if((im.naturalWidth||im.width)!==v.width||(im.naturalHeight||im.height)!==v.height)throw Error('Bad PROLOGUE art: '+k);images.set(k,im)}));}
const inside=(x,y,r)=>x>=r[0]&&x<r[0]+r[2]&&y>=r[1]&&y<r[1]+r[3];
export function prologueLawnAt(map,x,y){return x>0&&x<39&&y>0&&y<23&&map.tiles[y]?.[x]!==1&&!PROLOGUE_COMPOSITION.corridors.some(a=>inside(x,y,a.rect));}
export function drawPrologueGround(c,w,now=0){if(w.map.id!==ID)return false;loadPrologueDecorations();const m=w.map;
 const paving=images.get('paver');if(paving){c.save();c.imageSmoothingEnabled=true;for(let y=1;y<23;y++)for(let x=1;x<39;x++)if(m.tiles[y][x]!==1&&!prologueLawnAt(m,x,y)){c.drawImage(paving,(x%2)*128,(y%2)*128,128,128,x*G,y*G,G,G)}c.restore()}
 // Short lawn is decorative, fully traversable, never tall grass or encounter grass.
 for(let y=1;y<23;y++)for(let x=1;x<39;x++)if(prologueLawnAt(m,x,y))drawApprovedTile(c,8,x*G,y*G,G,now,{neighbors:[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].map(([dx,dy])=>prologueLawnAt(m,x+dx,y+dy)?8:0)});
 const im=images.get('flower');if(im){c.save();c.imageSmoothingEnabled=true;for(const[x,y]of PROLOGUE_COMPOSITION.flowers)if(prologueLawnAt(m,x,y))c.drawImage(im,0,0,256,256,x*G-4,y*G-4,56,56);c.restore()}
 // Selected moss material only at planted bed corners, never random dirt across walking lanes.
 const moss=images.get('moss');if(moss){c.save();c.globalAlpha=.38;for(const[x,y,rx,ry]of[[181,435,23,5],[430,434,25,5],[577,478,14,8],[642,478,17,5],[188,383,6,20],[438,383,6,18],[715,477,19,5],[860,476,15,6]]){c.save();c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.clip();c.drawImage(moss,x-rx,y-ry,rx*2,ry*2);c.restore()}c.restore()}
 // Two shallow doorstep courses connect the existing center facade to its approach.
 c.save();c.fillStyle='#b2aa91';c.fillRect(280,384,64,6);c.fillStyle='#e9e3cb';c.fillRect(278,390,68,5);c.restore();
 return true;
}
function propLayer(p,actorHeight=64){const[x,y,w,h]=p.rect,foot=(y+h)*G,center=(x+w/2)*G;const shadow={depth:foot-2,draw:c=>{c.save();for(const spread of [1.45,1.12,.82]){c.fillStyle='rgba(32,49,43,0.045)';c.beginPath();c.ellipse(center+7,foot-5,Math.max(10,w*G*.37)*spread,Math.max(4,h*G*.10)*spread,0,0,Math.PI*2);c.fill()}c.restore()}};if(p.kind==='tree')return [shadow,...approvedObjectEntries('field.objects.tree',p.rect,G)??[]];if(['O_CAMELLIA_BLOOM','O_EVERGREEN_BROAD'].includes(p.kind)){const scale=p.kind==='O_CAMELLIA_BLOOM'?.56:.50;return[shadow,...['base','foreground'].map((role,i)=>({depth:foot+i,draw:c=>{const key=p.kind+'_'+role,f=frames[key],im=images.get(key);if(!im)return;c.save();c.imageSmoothingEnabled=true;c.drawImage(im,center-f.pivot[0]*scale,foot-f.pivot[1]*scale,f.width*scale,f.height*scale);c.restore()}}))]}const kind=p.kind==='gardenbed'?'O_PLANTER':p.kind;const f=frames[kind];return[shadow,{depth:foot,draw:c=>{const im=images.get(kind);if(!im)return;const scale=p.kind==='O_LAMP_STREET'?(actorHeight>=80?.60:.49):G/128;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(im,center-f.pivot[0]*scale,foot-f.pivot[1]*scale,f.width*scale,f.height*scale);if(p.kind==='gardenbed'){const hedge=images.get('O_SHRUB_ROUND');if(hedge)for(const dx of[-23,23])c.drawImage(hedge,center+dx-34,foot-56,68,68)}c.restore()}}]}
export function prologueDecorationLayers(w){if(w.map.id!==ID)return[];loadPrologueDecorations();
 // Solid props on traversable ground are forbidden until their matching collision delta is accepted.
 return w.prologueCompositionProposal===true?PROLOGUE_COMPOSITION.proposalProps.flatMap(p=>propLayer(p,w.actorHeight??64)):[];
}
export function prologueSuggestedCameraY(playerY,height,mapHeight=1152){const northBias=Math.max(0,Math.min(1,(840-playerY)/240))*Math.min(250,height*.46);return Math.max(0,Math.min(mapHeight-height,playerY-height/2-northBias));}

/** Ground-level interaction medallions are UI cues, not fake solid furniture. */
export function drawSemanticPoint(c,p,{diagnostics=false}={}){
 const allowed=['warp','heal','shop','research','landmark','event'];if(!allowed.includes(p.kind))return false;
 if(p.kind==='event'&&!['event:P00_HOME_START','event:P04_SUSPICIOUS_TRACE'].includes(p.id))return false;
 const x=p.x*G+24,y=p.y*G+24;
 c.save();c.strokeStyle='#f6f4dc';c.fillStyle='rgba(44,77,68,0.24)';c.lineWidth=2;c.beginPath();c.ellipse(x,y+8,18,8,0,0,Math.PI*2);c.fill();c.stroke();
 c.textAlign='center';c.font='bold 17px sans-serif';c.fillStyle='#fdf8dc';c.fillText(({warp:'↗',heal:'+',shop:'•',research:'⌕',landmark:'i',event:'◇'})[p.kind],x,y+10);
 if(diagnostics){c.font='11px sans-serif';c.fillStyle='#24483b';c.fillText(p.label?.slice(0,16)??p.kind,x,y+28)}c.restore();return true;
}
