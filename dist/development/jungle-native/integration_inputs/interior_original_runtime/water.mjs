export const WATER_REVISION='JUNGLE_B_NEW_WATER24_2400_20261027_R1';
export function bindWater(m,indices,owners,rgb){
 if(m?.waterRevision!==WATER_REVISION||m.sampleCount!==21313||m.phaseCount!==24||m.periodMs!==2400||JSON.stringify(m.origin)!=='[1928,72]'||JSON.stringify(m.size)!=='[754,318]')throw Error('water manifest contract mismatch');
 if(indices.length!==m.sampleCount||owners.length!==m.sampleCount||rgb.length!==m.sampleCount*24*3)throw Error('water buffer shape mismatch');
 for(let i=0;i<indices.length;i++)if(indices[i]>=754*318||owners[i]>3||(i&&indices[i]<=indices[i-1]))throw Error('water index contract mismatch');
 return Object.freeze({m,indices,owners,rgb});
}
// Host is the already-composed unlit selected state. This mutates eligible RGB only, never alpha.
// Unavailable/mismatched metadata is a no-op: no fallback image may erase other host effects.
export function applyWater(host,width,height,camera,meta,bank){
 const unavailable=reason=>({available:false,reason,written:0,changed:0,phase:null,waterRevision:WATER_REVISION});
 if(!bank||meta?.waterRevision!==WATER_REVISION||meta?.artRevision!==bank.m.baseConsumerRevision||meta.existingWaterLayer!==false)return unavailable('revision or existing water layer');
 if(!['open','closed'].includes(meta.source)||meta.sourceSHA256!==bank.m[meta.source==='open'?'sourceOpenSHA256':'sourceClosedSHA256'])return unavailable('source pin');
 if(!['raw','selected'].includes(meta.mode)||!Number.isInteger(meta.bits)||meta.bits<0||meta.bits>7||!Number.isInteger(meta.phase)||meta.phase<0||meta.phase>=24||typeof meta.enabled!=='boolean')return unavailable('invalid state');
 if(!(host instanceof Uint8ClampedArray)||host.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||!Array.isArray(camera)||camera.length!==2||!camera.every(Number.isInteger))return unavailable('invalid host or camera');
 if(meta.mode==='raw'||!meta.enabled)return {available:true,reason:meta.mode==='raw'?'raw original static':'disabled',written:0,changed:0,phase:meta.phase,waterRevision:WATER_REVISION};
 let written=0,changed=0;const {m,indices,owners,rgb}=bank,frame=meta.phase*m.sampleCount*3;
 for(let i=0;i<indices.length;i++){
  const owner=owners[i];if(owner&&!(meta.bits&(1<<(owner-1))))continue;
  const x=indices[i]%754+1928-camera[0],y=Math.floor(indices[i]/754)+72-camera[1];if(x<0||y<0||x>=width||y>=height)continue;
  const q=(y*width+x)*4,k=frame+i*3;
  changed+=Number(host[q]!==rgb[k]||host[q+1]!==rgb[k+1]||host[q+2]!==rgb[k+2]);
  host[q]=rgb[k];host[q+1]=rgb[k+1];host[q+2]=rgb[k+2];written++;
 }
 return {available:true,reason:'selected-mask-only',written,changed,phase:meta.phase,waterRevision:WATER_REVISION,alphaWrites:0};
}
