import {verifyMaterial} from './port-adapter.mjs';
const ROOT=new URL('./',import.meta.url);
async function verifiedBytes(pin,signal){const response=await fetch(new URL(pin.path,ROOT),{signal});if(!response.ok)throw Error('ASSET_HTTP_'+response.status);const bytes=await response.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==pin.sha256)throw Error('ASSET_SHA_MISMATCH');return bytes;}
async function bitmap(bytes){return createImageBitmap(new Blob([bytes],{type:'image/png'}));}
export async function loadProvenScene(spec,{signal}={}){
 const [artBytes,maskBytes]=await Promise.all([verifiedBytes(spec.art,signal),verifiedBytes(spec.footCenters,signal)]);
 let art,mask;
 try{
  art=await bitmap(artBytes);mask=await bitmap(maskBytes);
  if(art.width!==spec.width||art.height!==spec.height||mask.width!==spec.width||mask.height!==spec.height)throw Error('ASSET_SIZE');
  const canvas=document.createElement('canvas');canvas.width=spec.width;canvas.height=spec.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(mask,0,0);const pixels=ctx.getImageData(0,0,spec.width,spec.height).data;mask.close();mask=null;
  const scene={sceneId:spec.sceneId,artSHA256:spec.art.sha256,footMaskSHA256:spec.footCenters.sha256,width:spec.width,height:spec.height,art,isSafeFoot([x,y]){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<spec.width&&y<spec.height&&pixels[(y*spec.width+x)*4]===255},dispose(){art.close()}};
  if(!verifyMaterial(spec,scene))throw Error('MATERIAL_PROOF');return scene;
 }catch(e){art?.close();mask?.close();throw e}
}
