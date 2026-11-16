// Developer-only, one-use authority. Never serializable as a save or JSON grant.
const grants=new WeakMap();
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
export function issueEditorReviewAuthority(base,candidate,{acceptReviewed=false}={}){
 if(acceptReviewed!==true||!base?.maps||!candidate?.maps||candidate.editorItemDrafts?.length)throw Error('EDITOR_REVIEW_AUTHORITY_SCOPE');
 const authority=Object.freeze({kind:'EDITOR_GRID_REVIEW_MEMORY_ONLY'});grants.set(authority,{base:stable(JSON.parse(JSON.stringify(base))),candidate:structuredClone(candidate)});return authority;
}
export function consumeEditorReviewAuthority(authority,current){
 const grant=grants.get(authority);if(!grant)throw Error('EDITOR_REVIEW_AUTHORITY_INVALID');
 // Burn before comparison: a failed attempt cannot later acquire changed state.
 grants.delete(authority);if(grant.base!==stable(JSON.parse(JSON.stringify(current))))throw Error('EDITOR_REVIEW_BASE_CHANGED');
 return structuredClone(grant.candidate);
}
