import {createNextSelectedSceneMaterial} from '../../world/cargo-five-scene-geometry.mjs';
const assetModuleURL=import.meta.url;
const ROOT=new URL('./',assetModuleURL);
export async function loadNextSelectedScene(spec,{readDoors,signal}={}){
 return createNextSelectedSceneMaterial({spec,readDoors,readBytes:async path=>{const response=await fetch(new URL(path,ROOT),{signal});if(!response.ok)throw Error('BRIDGE_ASSET_HTTP_'+response.status);return new Uint8Array(await response.arrayBuffer())},decodeArt:bytes=>createImageBitmap(new Blob([bytes],{type:'image/png'})),decodeMask:async bytes=>{const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));try{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);return {width:bitmap.width,height:bitmap.height,data:ctx.getImageData(0,0,bitmap.width,bitmap.height).data}}finally{bitmap.close()}}});
}
