// Atlas-selector contract: reused reference guard rules, not typed-array renderer API.
export function selectB2(meta,contract,proofPin,owners){
 const no=()=>({available:false,drawn:0}),hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v),rev=v=>typeof v==='string'&&v.trim().length>0;
 if(!meta||!contract||!(owners instanceof Set)||!hex(meta.sourceSHA)||!hex(contract.source?.sha256)||meta.sourceSHA!==contract.source.sha256||!rev(meta.revision)||!rev(contract.revision)||meta.revision!==contract.revision||!hex(meta.proofPin)||!hex(proofPin)||meta.proofPin!==proofPin)return no();
 if(meta.enabled!==true||meta.conflict!==false||meta.assetsVerified!==true||meta.state!=='CURRENT_SELECTED'||contract.state!=='CURRENT_SELECTED'||contract.owner!=='JANGMOK_B2_BOB'||contract.gateCount!==32352||contract.frames!==96||contract.width!==5120||contract.height!==1536||!hex(contract.atlasSHA)||!Array.isArray(meta.camera)||meta.camera.length!==4)return no();
 const[x,y,w,h]=meta.camera;if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>5120||y+h>1536||!Number.isInteger(meta.phase)||meta.phase<0||meta.phase>=96||owners.has(contract.owner))return no();
 if(x>=800||y>=390||x+w<=288||y+h<=70)return no();
 owners.add(contract.owner);return{available:true,drawn:1,phase:meta.phase,sx:(meta.phase%16)*512,sy:Math.floor(meta.phase/16)*320,dx:288-x,dy:70-y,w:512,h:320,owner:contract.owner};
}
