// Candidate-only geometry and presentation. No canonical actions, saves or HP/economy writes.
const directions=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
export function createRoomProvider(contract,bytes,{foot=contract.entry,facing='up'}={}){
 const [w,h]=contract.native;if(!(bytes instanceof Uint8Array)||bytes.length!==w*h||bytes.some(v=>v!==0&&v!==1))throw Error('EXACT_SAFE_MASK_REQUIRED');
 const mask=Uint8Array.from(bytes),support=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)&&p[0]>=0&&p[1]>=0&&p[0]<w&&p[1]<h&&mask[p[1]*w+p[0]]===1;
 if(!support(foot)||!Object.hasOwn(directions,facing))throw Error('INVALID_ROOM_POSE_NO_SNAP');
 let position=[...foot],direction=facing,disposed=false,locked=false,walked=0;
 const snapshot=()=>({sceneId:contract.id,foot:[...position],facing:direction,walkedPixels:walked,readOnly:true});
 return Object.freeze({snapshot,support,face(d){if(disposed||locked)return false;if(!Object.hasOwn(directions,d))throw Error('CARDINAL_REQUIRED');direction=d;return true},setLocked(v){locked=v===true},step(d){if(disposed||locked)return false;if(!Object.hasOwn(directions,d))throw Error('CARDINAL_REQUIRED');direction=d;const v=directions[d],next=[position[0]+v[0],position[1]+v[1]];if(!support(next))return false;position=next;walked++;return true},inspect(){if(disposed||locked)return null;if(direction===contract.serviceFacing&&position.every((v,i)=>v===contract.servicePoint[i]))return Object.freeze({kind:'SERVICE_INTENT_ONLY',roomId:contract.id});return null},dispose(){disposed=true;locked=true}});
}
