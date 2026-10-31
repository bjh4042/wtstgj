import{createFrameLighting}from'../jungle_environment_candidate_r7/consumer/frame-lighting.mjs';
// Same selected R7 composition math, wrapped for a separate development host.
export function composeEnvironment(g,A,{elapsedMs=0,nightMix=0,water=true,lights=true}={}){
 const {M,source,ids,rgb,li,lw}=A,phase=Math.floor((elapsedMs%4800)/150);g.drawImage(source,0,0);const f=g.getImageData(0,0,1536,1024),out=new Uint8ClampedArray(f.data.length);
 if(water)for(let i=0;i<ids.length;i++){let p=ids[i]*4,z=(phase*ids.length+i)*3;f.data[p]=rgb[z];f.data[p+1]=rgb[z+1];f.data[p+2]=rgb[z+2]}
 createFrameLighting({nightTint:M.ambientTint})(f.data,out,nightMix);
 for(let i=0;i<li.length;i++){let p=li[i]*4,z=i*3,lens=lights?lw[z]:0,pool=lights?lw[z+1]:0,glass=lights?lw[z+2]:0;for(let c=0;c<3;c++){const base=out[p+c];let result=base+nightMix*pool*[96,70,38][c];result=result*(1+nightMix*glass*[1.35,1.05,.48][c]);result=result*(1-nightMix*lens*.95)+[255,224,157][c]*nightMix*lens*.95;out[p+c]=Math.min(255,Math.round(result))}}
 f.data.set(out);g.putImageData(f,0,0);return phase;
}
