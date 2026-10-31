/** Bounded, read-only DEV diagnostics. No timers, input, world or save writes. */
export function mountReviewPositionHud({container,read,enabled=false}){
 if(!enabled)return Object.freeze({refresh(){},dispose(){}});
 const node=container.ownerDocument.createElement('p');node.dataset.reviewPosition='';node.setAttribute('aria-label','개발 검토 위치');node.style.cssText='font:12px monospace;overflow-wrap:anywhere';container.append(node);let disposed=false,last=null;
 const refresh=provided=>{if(disposed)return;let s;try{s=provided??read()}catch{s=null}const foot=Array.isArray(s?.foot)&&s.foot.length===2&&s.foot.every(Number.isFinite)?s.foot:null,scene=typeof s?.scene==='string'?s.scene.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,100):'—',facing=typeof s?.facing==='string'?s.facing.slice(0,12):'—';const value=`DEV · scene ${scene} · foot ${foot?foot.join(', '):'—'} · facing ${facing} · pending ${s?.pending===true?'yes':'no'}`;if(value!==last){node.textContent=value;last=value}};
 return Object.freeze({refresh,dispose(){if(disposed)return;disposed=true;node.remove()}});
}
