import {sha256,deepFreeze} from './codec.mjs';
import {AQUATIC_POLICY_A} from './aquatic-policy-a-v1.mjs';
/** Apply only the approved, hash-bound RFC6902 subset to a copy of the source. */
export function effectiveAquaticSource(text,policy=AQUATIC_POLICY_A){
 if(policy.approvalStatus!=='APPROVED'||policy.contentNamespace!=='canonical-v1'||sha256(text)!==policy.sourceSha256)throw Error('Aquatic policy source/approval mismatch');
 const source=JSON.parse(text);
 for(const op of policy.patch){
  const parts=op.path.slice(1).split('/').map(p=>p.replace(/~1/g,'/').replace(/~0/g,'~'));const key=parts.pop();let parent=source;
  for(const part of parts){if(!parent||!Object.hasOwn(parent,part))throw Error('Aquatic policy pointer mismatch');parent=parent[part]}
  if(!parent||!Object.hasOwn(parent,key))throw Error('Aquatic policy target missing');
  if(op.op==='test'){if(JSON.stringify(parent[key])!==JSON.stringify(op.value))throw Error('Aquatic policy test mismatch')}
  else if(op.op==='remove'){if(!Array.isArray(parent))throw Error('Aquatic removal must target array');parent.splice(Number(key),1)}
  else if(op.op==='replace')parent[key]=structuredClone(op.value);
  else throw Error('Unsupported aquatic patch');
 }
 const effectiveText=JSON.stringify(source,null,2)+'\n';
 if(sha256(effectiveText)!==policy.effectiveSha256)throw Error('Aquatic effective hash mismatch');
 return deepFreeze(source);
}
