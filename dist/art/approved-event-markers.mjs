import {browserImageLoader} from '../asset-runtime.mjs';
import {PROLOGUE_PROP_FRAMES} from '../world/prologue-prop-bindings.mjs';
const frame=PROLOGUE_PROP_FRAMES.O_SIGN_WOOD;let image,pending;
export function loadApprovedEventMarker(loader=browserImageLoader){return pending??=(async()=>{try{const im=await loader(frame.src);if(im.naturalWidth===frame.width&&im.naturalHeight===frame.height)image=im}catch{/* No unverified fallback. */}})()}
/** Existing event-only physical blockers are shown as inspection signs, not invented people. */
export function drawApprovedEventMarker(c,actor){if(!image){if(typeof document!=='undefined')loadApprovedEventMarker();return false}const scale=64/frame.height;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,actor.x-frame.pivot[0]*scale,actor.y-frame.pivot[1]*scale,frame.width*scale,frame.height*scale);c.restore();return true}
