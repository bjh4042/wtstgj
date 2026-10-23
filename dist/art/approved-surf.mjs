/** Selected original SURF art. Presentation only: no inventory, provider, save or collision state. */
import {SURF_FRAMES} from './approved-surf-bindings.mjs';
import {browserImageLoader} from '../asset-runtime.mjs';
import {approvedPlayerIdentity,drawApprovedPlayer} from './approved-player-field.mjs';
import {evaluateStoryExpression} from '../story/gates.mjs';
import {GRID,tileAt} from '../world/definition.mjs';
import {drawSurfWake} from './approved-surf-wake.mjs';
export {surfWakeGeometry} from './approved-surf-wake.mjs';
const directions={down:'FRONT',right:'RIGHT',left:'LEFT',up:'BACK'},images=new Map();let pending;
const clamp=n=>Math.max(0,Math.min(1,n));
/** Exact canonical tile coverage; prologue ground paints over its interior tiles. */
export function surfRenderedWaterAt(map,x,y){
 if(!map||!Array.isArray(map.tiles)||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const tx=Math.floor(x/GRID),ty=Math.floor(y/GRID);
 if(!tileAt(map,tx,ty).water)return false;
 if(map.id==='world:hub:PROLOGUE'&&tx>=1&&tx<39&&ty>=1&&ty<23)return false;
 return !(map.solidObjects??[]).some(o=>{const[a,b,w,h]=o.rect;return tx>=a&&tx<a+w&&ty>=b&&ty<b+h});
}
export function surfWaterClipRects(map,{x,y,visibleHeight=80}){
 const out=[],radius=visibleHeight*2;
 for(let ty=Math.max(0,Math.floor((y-radius)/GRID));ty<Math.min(map?.height??0,Math.ceil((y+radius)/GRID));ty++)for(let tx=Math.max(0,Math.floor((x-radius)/GRID));tx<Math.min(map?.width??0,Math.ceil((x+radius)/GRID));tx++)if(surfRenderedWaterAt(map,(tx+.5)*GRID,(ty+.5)*GRID))out.push([tx*GRID,ty*GRID,GRID,GRID]);
 return out;
}
export function approvedSurfPose({appearance='boy',facing='down',x,y,visibleHeight=80}={}){
 if(!directions[facing]||![x,y,visibleHeight].every(Number.isFinite)||visibleHeight<=0)return null;
 const key=`ACTION_${approvedPlayerIdentity(appearance)}_${directions[facing]}_SURF_RIDER`,frame=SURF_FRAMES[key];if(!frame)return null;
 const [l,t,r,b]=frame.bounds,scale=visibleHeight/frame.standingHeight,width=visibleHeight*1.5,height=width/(1741/499),footY=y-height*.05;
 return {key,frame,board:[x-width/2,y-height*.55,width,height],foot:[x,footY],rider:[x-(frame.foot[0]-l)*scale,footY-(frame.foot[1]-t)*scale,(r-l)*scale,(b-t)*scale]};
}
/** Existing 180 ms movement endpoints only. Never writes a mode into the save. */
export function approvedSurfState(actor,{map,save,story,motion=null,now=0}={}){
 if(!actor||!map||save?.position?.scene!==map.id)return null;
 const pose=approvedSurfPose(actor);if(!pose)return null;
 try{if(!evaluateStoryExpression('CAN_SURF',save,story))return null}catch{return null}
 const active=motion?.scene===map?.id&&Number.isFinite(motion.start)&&Number.isFinite(motion.x)&&Number.isFinite(motion.y),t=active?clamp((now-motion.start)/180):1;
 // During the retained movement segment, interpolated actor position and endpoint are both inspected.
 const current=surfRenderedWaterAt(map,save?.position?.x,save?.position?.y),previous=active&&surfRenderedWaterAt(map,motion.x,motion.y),contact=surfRenderedWaterAt(map,actor.x,actor.y);
 const alpha=active&&t<1?(previous?(current?1:1-t):(current?t:0)):(current&&contact?1:0);
 if(!(alpha>0))return null;
 const clip=surfWaterClipRects(map,actor);if(!clip.length)return null;
 return {...pose,alpha,clip,t,contact};
}
export function loadApprovedSurf(loader=browserImageLoader,{dpr=globalThis.devicePixelRatio??1}={}){
 const variant=dpr>2?'3':'2';return pending??=Promise.all(Object.entries(SURF_FRAMES).map(async([key,frame])=>{try{const image=await loader(frame.variants[variant].url);if((image.naturalWidth??image.width)>0)images.set(key,image)}catch{/* Safe standing fallback; no substitute legacy art. */}}));
}
function clipped(c,rects,draw){c.save();c.beginPath();for(const r of rects)c.rect(...r);c.clip();draw();c.restore()}
/** Returns false when unavailable/ineligible so caller keeps the existing standing renderer. */
export function drawApprovedSurf(c,actor,options={}){
 const state=approvedSurfState(actor,options),rider=state&&images.get(state.key),board=images.get('BOARD');if(!state||!rider||!board)return false;
 const {alpha,clip}=state,h=actor.visibleHeight??80,wake={x:actor.x,y:actor.y,actorHeight:h,moving:!!actor.moving,facing:actor.facing,time:options.now??0,reducedMotion:!!options.reducedMotion};
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 if(alpha<1){c.save();c.globalAlpha*=1-alpha;drawApprovedPlayer(c,actor);c.restore()}
 c.globalAlpha*=alpha;
 clipped(c,clip,()=>{drawSurfWake(c,wake,'rear');c.drawImage(board,...state.board)});
 c.drawImage(rider,...state.rider);
 clipped(c,clip,()=>drawSurfWake(c,wake,'front'));
 c.restore();return true;
}
