// NEW current-V5 two-fixture registration; no old wetland lighting support reused.
const re=x=>{const f=Math.floor(x);return x-f===.5?f+(f%2):Math.round(x)},ss=x=>x*x*(3-2*x),tint=[.32,.39,.56];
export const mixForMinutes=m=>{if(!Number.isFinite(m))throw Error('V5_NIGHT_CLOCK');m=((m%1440)+1440)%1440;return m<300||m>=1200?1:m<420?1-ss((m-300)/120):m<1080?0:ss((m-1080)/120)};
export function createV5Night({ids,weights,depthAlpha,npcAlpha,poolMultiplier=1.6}){
 if(ids.length!==14712||weights.length!==44136||depthAlpha.length!==16000||npcAlpha.length!==14712||poolMultiplier!==1.6)throw Error('V5_NIGHT_REGISTRATION');
 ids=new Uint32Array(ids);weights=new Float32Array(weights);depthAlpha=new Uint8Array(depthAlpha);npcAlpha=new Uint8Array(npcAlpha);
 for(let k=0;k<ids.length;k++)if(ids[k]>=1536*1024||k&&ids[k]<=ids[k-1])throw Error('V5_NIGHT_IDS');
 if(weights.some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('V5_NIGHT_WEIGHTS');
 let dead=false,last='',rows=[],lastMix=NaN;const lut=new Uint8Array(768),check=()=>{if(dead)throw Error('V5_NIGHT_DISPOSED')};
 const visible=([ox,oy])=>{const key=ox+','+oy;if(key===last)return rows;last=key;rows=[];for(let k=0;k<ids.length;k++){const x=ids[k]%1536-ox,y=Math.floor(ids[k]/1536)-oy;if(x>=0&&x<960&&y>=0&&y<540)rows.push([k,(y*960+x)*4])}return rows};
 return Object.freeze({apply(rgba,camera,{minutes,lights=true,rest=false,foot,actorAlpha,actorOrigin}){
  check();if(rgba.length!==2073600||!Array.isArray(camera)||camera.length!==2||!camera.every(Number.isInteger)||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger))throw Error('V5_NIGHT_FRAME');
  const mix=rest?0:mixForMinutes(minutes);if(!mix)return{mix,rows:0};
  if(lastMix!==mix){lastMix=mix;for(let c=0;c<3;c++)for(let v=0;v<256;v++)lut[c*256+v]=Math.round(v*(1-mix)+re(v*tint[c])*mix)}
  for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)rgba[i+c]=lut[c*256+rgba[i+c]];
  const indexes=lights?visible(camera):[];
  for(const[k,i]of indexes){const p=i/4,wx=ids[k]%1536,wy=Math.floor(ids[k]/1536);let player=0;
   if(actorAlpha){const sx=p%960-actorOrigin[0],sy=Math.floor(p/960)-actorOrigin[1];if(sx>=0&&sy>=0&&sx<107&&sy<107){let occlusion=0;if(foot[1]<600)for(const gx of[104,262]){const x=wx-gx+40,y=wy-420;if(x>=0&&x<80&&y>=0&&y<200)occlusion=Math.max(occlusion,depthAlpha[y*80+x]/255)}player=actorAlpha[sy*107+sx]/255*(1-occlusion)}}
   const guard=1-(1-player)*(1-npcAlpha[k]/255),lens=weights[k*3],pool=weights[k*3+1],halo=weights[k*3+2];
   for(let c=0;c<3;c++){const ambient=rgba[i+c];let v=ambient+mix*pool*poolMultiplier*[96,70,38][c]+mix*halo*[70,50,24][c];v=v*(1-mix*lens)+[255,224,157][c]*mix*lens;rgba[i+c]=Math.round(Math.min(255,v)*(1-guard)+ambient*guard)}
  }return{mix,rows:indexes.length};
 },dispose(){if(dead)return;dead=true;rows=[];ids=null;weights=null;depthAlpha=null;npcAlpha=null}});
}
