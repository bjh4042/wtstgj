// Private destination observation, no renderer/geometry change. DOM-only proof:
// unobservable OffscreenCanvas resets are deliberately not authorized here.
const branded=new WeakSet();
export const isGreenObservedView=v=>branded.has(v);
export function observeGreenView(inner){
 if(!inner||typeof inner.draw!=='function'||typeof inner.currentFrame!=='function'||typeof inner.frameMatchesState!=='function'||typeof inner.invalidateFrame!=='function')throw Error('GREEN_VIEW_REQUIRED');
 let destination=null,canvas=null,observer=null,listener=null,receipt=null,epoch=0,observation=0,dead=false;
 function invalidateFrame(){epoch++;receipt=null;inner.invalidateFrame()}
 function detach(){observation++;const o=observer,c=canvas,l=listener;observer=listener=destination=canvas=null;let fault;for(const close of[()=>o?.disconnect(),()=>l&&c?.removeEventListener('contextlost',l),()=>l&&c?.removeEventListener('contextrestored',l)])try{close()}catch(e){fault??=e}if(fault)throw fault}
 function valid(){try{return !dead&&destination&&destination.canvas===canvas&&canvas.width===960&&canvas.height===540&&destination.isContextLost?.()!==true&&observer&&observer.takeRecords().length===0}catch{return false}}
 function observe(d){if(destination===d&&canvas===d.canvas)return;detach();try{const c=d.canvas;if(c?.nodeType!==1||typeof MutationObserver!=='function'||typeof c.addEventListener!=='function'||typeof c.removeEventListener!=='function')throw Error('GREEN_OBSERVABLE_DOM_REQUIRED');destination=d;canvas=c;const own=observation;listener=()=>{if(observation===own&&destination===d)invalidateFrame()};c.addEventListener('contextlost',listener);c.addEventListener('contextrestored',listener);observer=new MutationObserver(records=>{if(records.length&&observation===own&&destination===d)invalidateFrame()});observer.observe(c,{attributes:true,attributeFilter:['width','height']})}catch(e){detach();invalidateFrame();throw e}}
 function currentFrame(){if(!valid()||!receipt||inner.currentFrame()!==receipt){invalidateFrame();return null}return receipt}
 const api=Object.freeze({draw(d,input){invalidateFrame();if(dead)throw Error('GREEN_VIEW_CLOSED');observe(d);if(!valid())throw Error('GREEN_DESTINATION_INVALID');const generation=epoch,result=inner.draw(d,input);if(!valid()||epoch!==generation){invalidateFrame();throw Error('GREEN_DESTINATION_INVALIDATED')}receipt=inner.currentFrame();return result},currentFrame,frameMatchesState(token,pose,input){return !!token&&currentFrame()===token&&inner.frameMatchesState(token,pose,input)&&currentFrame()===token},invalidateFrame,dispose(){if(dead)return;dead=true;try{invalidateFrame()}finally{detach()}}});
 branded.add(api);return api;
}
