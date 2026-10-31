export function applyOptical(host,ids,rgb,meta,m){
 const no=()=>({available:false,written:0});
 if(!meta||!m||typeof meta.sourceSHA!=='string'||!/^[a-f0-9]{64}$/.test(meta.sourceSHA)||typeof m.source?.sha256!=='string'||!/^[a-f0-9]{64}$/.test(m.source.sha256)||typeof meta.revision!=='string'||!meta.revision||typeof m.revision!=='string'||!m.revision||m.allowedPixels!==25491||meta.rest===true||meta.enabled!==true||meta.conflict!==false||meta.sourceSHA!==m.source.sha256||meta.revision!==m.revision||!Number.isFinite(meta.timeMs)||!Array.isArray(meta.camera)||meta.camera.length!==4)return no();
 const[cx,cy,w,h]=meta.camera;if(![cx,cy,w,h].every(Number.isInteger)||cx<0||cy<0||w<1||h<1||cx+w>1536||cy+h>1024||host?.length!==w*h*4||ids?.length!==m.allowedPixels||rgb?.length!==48*ids.length*3)return no();
 const phase=((Math.floor(meta.timeMs/50)%48)+48)%48;let written=0;
 for(let i=0;i<ids.length;i++){const id=ids[i],x=id%1536-cx,y=Math.floor(id/1536)-cy;if(x<0||x>=w||y<0||y>=h)continue;let d=(y*w+x)*4,s=(phase*ids.length+i)*3;host[d]=rgb[s];host[d+1]=rgb[s+1];host[d+2]=rgb[s+2];written++;}return{available:true,written,phase};
}
