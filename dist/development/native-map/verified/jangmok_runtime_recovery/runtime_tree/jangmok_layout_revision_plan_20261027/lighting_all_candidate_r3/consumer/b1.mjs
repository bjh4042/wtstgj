export const REV='JANGMOK_B1_TOPCLIP_BOB_R1';
export function render(host,meta,payload){
 const no={applied:false,written:0,changed:0};
 try{
 if(!(host instanceof Uint8ClampedArray)||!meta||!payload||typeof meta.enabled!=='boolean'||typeof meta.rest!=='boolean'||meta.enabled===false||meta.rest===true)return no;
 const {camera:c,worldTimeMs:t,sourceSHA,revision,state}=meta;
 if(typeof sourceSHA!=='string'||typeof payload.sourceSHA!=='string'||typeof revision!=='string'||typeof payload.revision!=='string'||!/^[a-f0-9]{64}$/.test(sourceSHA)||sourceSHA!==payload.sourceSHA||revision!==REV||payload.revision!==REV||state!=='CURRENT_SELECTED'||meta.proof!==true||!Number.isFinite(t)||!Array.isArray(c)||c.length!==4||!c.every(Number.isInteger)||c[0]<0||c[1]<0||c[2]<1||c[3]<1||c[0]+c[2]>5120||c[1]+c[3]>1536||host.length!==c[2]*c[3]*4)return no;
 const ids=payload.indices,rgb=payload.rgb;if(!(ids instanceof Uint32Array)||ids.length!==5980||!(rgb instanceof Uint8Array)||rgb.length!==96*5980*3)return no;
 const phase=((Math.floor(t/50)%96)+96)%96;let written=0,changed=0;
 for(let k=0;k<ids.length;k++){let q=ids[k];if(q>=310*180||(k>0&&q<=ids[k-1]))return no;}
 for(let k=0;k<ids.length;k++){const q=ids[k],x=300+q%310-c[0],y=Math.floor(q/310)-c[1];if(x<0||y<0||x>=c[2]||y>=c[3])continue;const d=(y*c[2]+x)*4,s=(phase*ids.length+k)*3;let diff=false;for(let j=0;j<3;j++){if(host[d+j]!==rgb[s+j])diff=true;host[d+j]=rgb[s+j];}written++;if(diff)changed++;}
 return {applied:true,phase,written,changed};
 }catch{return no;}
}
