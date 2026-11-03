// Ownership pattern adapted from original s4-area-native/common.mjs.
export function createScope(signal){let dead=false;const images=new Set(),closed=new WeakSet(),cleanups=[],errors=[];
 const close=im=>{if(im&&!closed.has(im)){closed.add(im);try{im.close?.()}catch(e){errors.push(String(e))}}};
 const check=()=>{if(dead||signal?.aborted)throw Error('S6_HUB_ABORTED_OR_DISPOSED')};
 const release=im=>{images.delete(im);close(im)};
 const dispose=()=>{if(dead)return;dead=true;signal?.removeEventListener('abort',dispose);for(const im of images)close(im);images.clear();for(const fn of cleanups.splice(0))try{fn()}catch(e){errors.push(String(e))}};
 signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted)dispose();
 return{check,dispose,release,adopt(im,w,h){if(dead||signal?.aborted){close(im);check()}images.add(im);if(im.width!==w||im.height!==h)throw Error('S6_HUB_DIMENSIONS');return im},onCleanup(fn){if(dead)fn();else cleanups.push(fn)},get dead(){return dead},get errors(){return [...errors]}};
}
