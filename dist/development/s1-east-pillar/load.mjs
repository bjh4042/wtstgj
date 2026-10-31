import{PILLAR as R}from'./pins.mjs';
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
// Source-pixel depth only. No support/warp/save/world clock authority.
export async function loadS1PillarForeground({fetcher=fetch,decode=b=>createImageBitmap(new Blob([b])),signal}={}){
 let image=null,alpha=null,closed=false;
 const check=()=>{if(closed||signal?.aborted)throw Error('S1_PILLAR_CANCELLED')};
 const dispose=()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',dispose);const own=image;image=null;alpha=null;own?.close?.()};
 const read=async row=>{check();const response=await fetcher(new URL(row.path,import.meta.url),{signal});if(!response.ok)throw Error('S1_PILLAR_MISSING');const bytes=new Uint8Array(await response.arrayBuffer());check();if(bytes.length!==row.bytes||await hash(bytes)!==row.sha256)throw Error('S1_PILLAR_PIN');check();return bytes};
 try{check();const bytes=await read(R.image);image=await decode(bytes);check();if(image.width!==R.dimensions[0]||image.height!==R.dimensions[1])throw Error('S1_PILLAR_DIMENSIONS');alpha=await read(R.alpha);check();signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted){dispose();throw Error('S1_PILLAR_CANCELLED')}
  return Object.freeze({registration:R,drawDepth(ctx,camera,foot){check();if(foot[1]>=R.groundY)return false;const[x,y]=R.origin,[w,h]=R.dimensions;if(x+w<=camera[0]||x>=camera[0]+ctx.canvas.width||y+h<=camera[1]||y>=camera[1]+ctx.canvas.height)return false;ctx.drawImage(image,x-camera[0],y-camera[1]);return true},foregroundAlpha(wx,wy,foot){check();const x=wx-R.origin[0],y=wy-R.origin[1];return foot[1]<R.groundY&&Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<R.dimensions[0]&&y<R.dimensions[1]?alpha[y*R.dimensions[0]+x]/255:0},dispose});
 }catch(error){dispose();throw error}
}
