import{startCanonicalWorld}from'../../world/entry.mjs';
import{CanonicalWorld}from'../../world/service.mjs';
import{loadApprovedLatestRuntimeAdapter}from'../../compatibility/approved-latest-runtime-adapter.mjs';
import{loadPrologueReviewScene}from'./loader.mjs';
import{installPrologueReviewHost}from'./review-host.mjs';
/** Fresh original source runtime, DEV no-storage fixture path. No grant, warp or story edits. */
export async function startPrologueNativeReview(){
 const query=new URLSearchParams(location.search);if(!import.meta.env.DEV||query.get('prologueNative')!=='1'||query.getAll('prologueNative').length!==1)throw Error('DEVELOPMENT_ONLY');
 let disposed=false,lifecycle=null;const cleanup=e=>{if(e?.persisted)return;disposed=true;lifecycle?.dispose();window.removeEventListener('pagehide',cleanup)};window.addEventListener('pagehide',cleanup);
 try{const adapter=await loadApprovedLatestRuntimeAdapter();if(disposed)return;const initial=new CanonicalWorld({adapter});let runtime;try{runtime=initial.snapshot()}finally{initial.dispose()}
 const next=await startCanonicalWorld({developmentAdapter:adapter,developmentFixture:()=>structuredClone(runtime),developmentReview:options=>installPrologueReviewHost({...options,loadScene:loadPrologueReviewScene})});if(disposed)next.dispose();else lifecycle=next;return next;}catch(e){cleanup();throw e;}
}
