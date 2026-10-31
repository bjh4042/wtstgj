// Root-selected NEW visual placement. Existing engine collision and original background unchanged.
const pins=Object.freeze([
 ['base','assets/W02__H_RAIL_MARINE__base__v001.png','005d1e4dd5f7690ea115a0eff9735f789623d0f3fb47c748ecf7601652589832'],
 ['foreground','assets/W02__H_RAIL_MARINE__foreground__v001.png','dd466274a2bd3afd9f8f5cc82951f5e57f8816f2544e87423f6da1597a24807f']
]);
export async function loadEngineSideBarriers({readBytes,decode=bytes=>createImageBitmap(new Blob([bytes],{type:'image/png'}))}){
 const images={};let disposed=false;
 try{for(const [role,path,sha]of pins){const raw=await readBytes(path),bytes=raw instanceof ArrayBuffer?new Uint8Array(raw.slice(0)):new Uint8Array(raw);const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==sha)throw Error('Engine side barrier art pin mismatch');const image=await decode(bytes);images[role]=image;if(image.width!==512||image.height!==256)throw Error('Engine side barrier dimensions');}}
 catch(e){for(const image of Object.values(images))image.close?.();throw e}
 function draw(ctx,role){if(disposed)throw Error('Engine side barriers disposed');for(const x of [643,895])ctx.drawImage(images[role],108,0,294,128,x-48.51,169.76,97.02,42.24)}
 return Object.freeze({drawBase:ctx=>draw(ctx,'base'),drawForeground:ctx=>draw(ctx,'foreground'),dispose(){if(disposed)return;disposed=true;for(const image of Object.values(images))image.close?.()}});
}
