export const SOURCE='48e2b1289016299208667b4f5e13152b652756e3f5b2eae561f04454651c53f0';
export function selectFrame(meta,clockMs,m,owners=new Set()){
 const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
 if(!meta||!m||!(owners instanceof Set)||meta.enabled!==true||meta.rest!==false||meta.conflict!==false||!hex(meta.sourceSHA)||!hex(m.sourceSHA)||meta.sourceSHA!==SOURCE||m.sourceSHA!==SOURCE||meta.revision!=='JANGMOK_B3_CANDIDATE_R5'||m.revision!==meta.revision||meta.width!==5120||meta.height!==1536||m.width!==5120||m.height!==1536||meta.state!=='CURRENT_SELECTED'||m.state!==meta.state||m.frames!==96||m.count!==25079||!hex(m.atlasSHA)||meta.assetsVerified!==true||!Number.isFinite(clockMs)||owners.has('B3'))return{write:false,reason:'off_or_guard'};
 owners.add('B3');const phase=Math.floor(((clockMs%4800)+4800)%4800/50);return{write:true,phase,sx:phase%16*410,sy:Math.floor(phase/16)*260,dx:1100,dy:0,width:410,height:260};
}
