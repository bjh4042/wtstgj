import {insidePolygon,tipOffset,depthSide,rootTransform} from './tuft-motion.mjs';
export function createTuftRenderer({contract,masters,atlas}){
 const S=contract.sourceDensity;
 function tuft(ctx,t,motion){const m=contract.masters.find(m=>m.id===t.master),im=masters[t.master],z=t.height/26,r=rootTransform(t,tipOffset(motion,t.id));ctx.save();ctx.translate(t.root[0]*S,t.root[1]*S);ctx.transform(1,0,r.shear,1,0,0);if(t.mirror)ctx.scale(-1,1);ctx.scale(z,z);ctx.drawImage(im,-m.nativeRoot[0],-m.nativeRoot[1]);ctx.restore();}
 function actor(ctx,a){const row=['FRONT','RIGHT','LEFT','BACK'].indexOf(a.facing??'FRONT'),col=['IDLE','A','B'].indexOf(a.phase??'IDLE'),z=a.height/192*S;ctx.drawImage(atlas,col*256,row*256,256,256,a.x*S-128*z,a.y*S-216*z,256*z,256*z);}
 function render(ctx,a,motion,{actorOnly=false,foregroundOnly=false}={}){const occupied=insidePolygon(a.x,a.y,contract.footprint);const rows=[...contract.instances].sort((a,b)=>a.root[1]-b.root[1]);if(actorOnly){actor(ctx,a);return;}if(!foregroundOnly){for(const t of rows)if(depthSide(t,a,occupied)==='back')tuft(ctx,t,motion);actor(ctx,a);}for(const t of rows)if(depthSide(t,a,occupied)==='front')tuft(ctx,t,motion);return {occupied,frontIds:rows.filter(t=>depthSide(t,a,occupied)==='front').map(t=>t.id)};}
 return {render,drawTuft:tuft};
}
