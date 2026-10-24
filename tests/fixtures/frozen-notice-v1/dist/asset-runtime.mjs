import {validateFollowerMetadata} from './species-asset-contract.mjs';
import {ASSET_MANIFEST,assetDescriptor} from './asset-manifest.mjs';
const cache=new Map(),pending=new Map();
let forcePlaceholder=false;
let inventoryPromise;
function availableFinals(){if(typeof fetch==='undefined'||typeof document==='undefined')return Promise.resolve(null);return inventoryPromise??=(async()=>{try{const response=await fetch('art-inventory.json');if(!response.ok)return null;const data=await response.json();return new Set(data.paths)}catch{return null}})();}
export function configureAssets({placeholder=false}={}){forcePlaceholder=placeholder;cache.clear();pending.clear();}
export const assetsUsePlaceholders=()=>forcePlaceholder;
export const peekAsset=id=>cache.get(id);
export const assetStats=()=>({loaded:cache.size,final:[...cache.values()].filter(a=>a.status==='final').length,legacy:[...cache.values()].filter(a=>a.status==='legacy').length,placeholder:[...cache.values()].filter(a=>a.status==='placeholder').length});
// A functional geometric marker, not substitute character artwork. Always available offline.
export function placeholderURL(id,width=64,height=64){
 const placeholderColor=assetDescriptor(id).placeholderColor??'#728899';
 const label=String(id).replace(/[^a-zA-Z0-9 ._-]/g,'').slice(-22);
 const human=id.startsWith('human.'),follower=id.endsWith('.fieldFollower.atlas'),cells=follower?Array.from({length:12},(_,i)=>`<g transform="translate(${i%3*96} ${Math.floor(i/3)*120})"><rect x="27" y="58" width="44" height="${i%3===0?62:58}" fill="#658c9e"/><text x="49" y="80" text-anchor="middle" fill="white" font-size="12">${id.split('.')[1]}</text><text x="49" y="100" text-anchor="middle" fill="white" font-size="11">${['F','R','L','B'][Math.floor(i/3)]}:${i%3}</text></g>`).join(''):human?Array.from({length:12},(_,i)=>`<g transform="translate(${i%3*96} ${Math.floor(i/3)*120})"><rect x="25" y="48" width="48" height="72" fill="#758fa4"/><text x="49" y="84" text-anchor="middle" fill="white" font-size="18">${Math.floor(i/3)}:${i%3}</text></g>`).join(''):`<rect x="1" y="1" width="${Math.max(1,width-2)}" height="${Math.max(1,height-2)}" fill="${placeholderColor}" stroke="#334958"/><path d="M0 0L${width} ${height}M${width} 0L0 ${height}" stroke="#aabac3"/><text x="50%" y="55%" text-anchor="middle" fill="white" font-size="${Math.max(7,Math.min(16,width/10))}">${label}</text>`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${cells}</svg>`);
}
export function browserImageLoader(src,timeout=5000){return new Promise((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>{image.onload=null;image.onerror=null;reject(Error('Image timeout'))},timeout);image.onload=()=>{clearTimeout(timer);resolve(image)};image.onerror=()=>{clearTimeout(timer);reject(Error('Image unavailable'))};image.src=src;});}
export function validateFinalImage(asset,image){
 if(asset.kind==='follower')validateFollowerMetadata(asset.metadata);
 if(!image.naturalWidth||!image.naturalHeight)throw Error('Empty image');
 if(asset.final&&(image.naturalWidth!==asset.final.width||image.naturalHeight!==asset.final.height))throw Error('Asset dimensions do not match contract');
 if(asset.alpha&&typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;validateAlphaPixels(asset,p,c.width,c.height);
 }
}
/** Check each atlas cell independently; empty frames must not disappear at runtime. */
export function validateAlphaPixels(asset,p,width,height){
 const columns=asset.kind==='follower'?3:1,rows=asset.kind==='follower'?4:1,cw=width/columns,ch=height/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  let clear=false,visible=false;
  for(let y=row*ch;y<(row+1)*ch;y++)for(let x=col*cw;x<(col+1)*cw;x++){const alpha=p[(y*width+x)*4+3];clear ||= alpha===0;visible ||= alpha>0}
  if(!clear||!visible)throw Error(`Visible pixels and transparent background required in frame ${row}:${col}`);
 }
}
export async function resolveAsset(id,{loader=browserImageLoader,placeholder=forcePlaceholder,validate=validateFinalImage,available=null}={}){
 const asset=assetDescriptor(id);
 for(const status of placeholder?[]:['final','legacy']){const art=asset[status];if(!art||(status==='final'&&available&&!available.has(art.src)))continue;try{const image=await loader(art.src);if(status==='final')validate(asset,image);return {...art,image,status,id,source:art.source??[0,0,art.width,art.height]}}catch{/* Missing, malformed or timed-out art is never a gameplay failure. */}}
 const width=asset.final?.width??asset.legacy?.width??64,height=asset.final?.height??asset.legacy?.height??64,src=placeholderURL(id,width,height);
 try{return {id,src,width,height,source:[0,0,width,height],status:'placeholder',image:await loader(src)}}catch{
  // CSP/data-URI failures still resolve, using a local canvas.
  const image=typeof document!=='undefined'?document.createElement('canvas'):{width,height};image.width=width;image.height=height;
  if('getContext' in image){const c=image.getContext('2d');c.fillStyle=asset.placeholderColor??'#728899';if(asset.kind==='follower'){for(let i=0;i<12;i++){const x=i%3*96,y=Math.floor(i/3)*120;c.fillStyle='#658c9e';c.fillRect(x+27,y+58,44,62);c.fillStyle='white';c.font='12px monospace';c.fillText(String(asset.speciesId),x+30,y+90);c.fillText(`${Math.floor(i/3)}:${i%3}`,x+30,y+108)}}else c.fillRect(0,0,width,height)}
  return {id,src,width,height,source:[0,0,width,height],status:'placeholder',image};
 }
}
export function loadAsset(id){if(cache.has(id))return Promise.resolve(cache.get(id));if(!pending.has(id)){const promise=availableFinals().then(available=>resolveAsset(id,{available})).then(result=>{if(pending.get(id)===promise)cache.set(id,result);return result});pending.set(id,promise)}return pending.get(id);}
export function assetMarkup(id,alt=''){
 const asset=assetDescriptor(id),art=asset.legacy??asset.final,w=art?.width??64,h=art?.height??64,[sx,sy,sw,sh]=art?.source??[0,0,w,h];
 const src=forcePlaceholder||!asset.legacy?placeholderURL(id,w,h):art?.src??placeholderURL(id,w,h);
 return `<span data-asset-id="${id}" style="display:inline-block;position:relative;overflow:hidden;width:100%;aspect-ratio:${sw}/${sh}"><img alt="${alt}" src="${src}" style="position:absolute;max-width:none;width:${w/sw*100}%;height:${h/sh*100}%;left:${-sx/sw*100}%;top:${-sy/sh*100}%;image-rendering:${asset.approvedOriginalStatus?'auto':'pixelated'}"></span>`;
}
export function installAssetDOM(root=document){
 const bind=element=>{if(element.dataset.assetBound)return;element.dataset.assetBound='1';const id=element.dataset.assetId??element.dataset.assetBackground;loadAsset(id).then(art=>{if(!element.isConnected)return;if(element.dataset.assetBackground){const [x,y,w,h]=art.source;element.style.backgroundImage=`url("${art.src}")`;element.style.backgroundSize=`${art.width/w*100}% ${art.height/h*100}%`;element.style.backgroundPosition=`${art.width===w?0:x/(art.width-w)*100}% ${art.height===h?0:y/(art.height-h)*100}%`;return}const image=element.querySelector('img');if(!image)return;const [sx,sy,sw,sh]=art.source;element.style.aspectRatio=`${sw}/${sh}`;image.src=art.src;Object.assign(image.style,{width:art.width/sw*100+'%',height:art.height/sh*100+'%',left:-sx/sw*100+'%',top:-sy/sh*100+'%'});element.dataset.assetStatus=art.status;});};
 const scan=node=>{if(node.nodeType!==1&&node!==root)return;if(node.matches?.('[data-asset-id],[data-asset-background]'))bind(node);node.querySelectorAll?.('[data-asset-id],[data-asset-background]').forEach(bind)};
 scan(root);const observer=new MutationObserver(records=>{for(const r of records)r.addedNodes.forEach(scan)});observer.observe(root,{childList:true,subtree:true});return ()=>observer.disconnect();
}

/** Adapter for retained canvas renderers: missing files get same-sized functional placeholders. */
export function guardLegacyImage(image){image.addEventListener('error',()=>{if(image.dataset?.fallback)return;if(image.dataset)image.dataset.fallback='1';const path=new URL(image.src,location.href).pathname.replace(/^\//,'');const entry=Object.values(ASSET_MANIFEST).find(a=>a.legacy?.src===path);image.src=placeholderURL(entry?.id??'unavailable',entry?.legacy?.width??96,entry?.legacy?.height??120)},{once:true});return image;}
