import{validatedState}from'./progress-shape.mjs';
// NEW root-selected local student rule implementation. No canonical/save/reward APIs.
export const RULE_REVISION='JUNGLE_ABC_LOCAL_STUDENT_CANDIDATE_R1';
export const APPROVED_SYMBOL_SELECTION=Object.freeze({revision:'C_SYMBOL_MAP_OVERLAY_SELECTED_R1',layerSHA256:'a9415bacde90e52a7766c0695db1fe810919da090ccb2b8a43137378e637c739'});
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))deepFreeze(v);Object.freeze(o)}return o};
export const POINTS=deepFreeze({A:{foot:[640,190],layer:'upper',facing:'up',meaning:'NEW viewpoint observation area; not an existing sign'},B1:{anchor:[1976,368],read:[1976,405],layer:'ground',facing:'up'},B2:{anchor:[2304,368],read:[2304,405],layer:'ground',facing:'up'},B3:{anchor:[2630,368],read:[2630,405],layer:'ground',facing:'up'},C1:{anchor:[3566,360],read:[3566,397],layer:'ground',facing:'up'},C2:{anchor:[3929,709],read:[3917,673],layer:'ground',facing:'down'}});
export class JunglePuzzle{
 #s; #restored=false; #symbolsApproved=false; #safe; #canOpenGate; #disposed=false; #held=false;
 constructor({safe,canOpenGate=()=>false,symbolSelection=null}){if(typeof safe!=='function')throw Error('safe required');this.#safe=safe;this.#symbolsApproved=symbolSelection?.revision===APPROVED_SYMBOL_SELECTION.revision&&symbolSelection?.layerSHA256===APPROVED_SYMBOL_SELECTION.layerSHA256;this.#canOpenGate=canOpenGate;this.#s={revision:RULE_REVISION,aObserved:false,bBits:0,cObserved:[false,false],cProgress:0,cOpen:false,epoch:0};this.#held=false;this.#disposed=false}
 get disposed(){return this.#disposed}
 get symbolsApproved(){return this.#symbolsApproved}
 snapshot(){return structuredClone(this.#s)}
 restoreLocalShape(s){if(!validatedState(s,RULE_REVISION))throw Error('INVALID_PROGRESS_DTO');this.#s=structuredClone(s);this.#s.epoch++;this.#restored=true;this.#held=true}
 receiptEligible(){return !this.#restored&&!this.#disposed&&this.#s.aObserved&&this.#s.bBits===7&&this.#s.cOpen}
 release(){this.#held=false}
 dispose(){this.#disposed=true;this.#held=true;this.#s.epoch++}
 check(ctx,id){const p=POINTS[id];if(this.#disposed||!p||ctx?.pinsVerified!==true||ctx.scene!=='jungle-interior-r2'||ctx.layer!==p.layer||ctx.facing!==p.facing||!Array.isArray(ctx.foot)||ctx.foot.length!==2||!ctx.foot.every(Number.isInteger)||!this.#safe(ctx.layer,ctx.foot,this.#s.cOpen?'OPEN':'CLOSED'))return false;const anchor=p.anchor??p.foot;return Math.abs(ctx.foot[0]-anchor[0])+Math.abs(ctx.foot[1]-anchor[1])<=48}
 action(type,id,ctx){if(this.#held||this.#disposed)return{ok:false,reason:'RELEASE_OR_DISPOSE'};this.#held=true;if(/^C[12]$/.test(id)&&!this.#symbolsApproved)return{ok:false,reason:'SYMBOL_VISUAL_SELECTION_PENDING'};if(!this.check(ctx,id))return{ok:false,reason:'SCENE_LAYER_PIN_FACING_OR_SUPPORT'};if(type==='observe'&&id==='A'){this.#s.aObserved=true;return{ok:true,message:'전망 자리에서 식생과 세 갈래 수로, 닫힌 보드워크를 살펴보았다.',state:this.snapshot()}}
 if(type==='toggle'&&/^B[123]$/.test(id)){if(!this.#s.aObserved)return{ok:false,reason:'OBSERVE_A_FIRST',message:'전망 자리에서 식생 관찰을 해 보자.'};this.#s.bBits^=1<<(Number(id[1])-1);return{ok:true,message:this.#s.bBits===7?'세 받는 곳 모두 물길이 연결되었다.':'받는 곳까지 물길이 이어지는지 살펴보자.',state:this.snapshot()}}
 if(type==='observe'&&/^C[12]$/.test(id)){this.#s.cObserved[Number(id[1])-1]=true;return{ok:true,message:id==='C1'?'좁은잎 표식을 기록했다.':'갈래잎 표식을 기록했다.',state:this.snapshot(),visualCandidateRequired:true}}
 if(type==='press'&&/^C[12]$/.test(id)){if(this.#s.cOpen)return{ok:true,alreadyOpen:true,state:this.snapshot()};if(!this.#s.aObserved||this.#s.bBits!==7||!this.#s.cObserved.every(Boolean))return{ok:false,reason:'OBSERVATION_AND_WATER_REQUIRED',message:'세 물길을 잇고 두 잎모양을 관찰해 기록하자.'};const expected=['C1','C2','C1'][this.#s.cProgress];if(id!==expected){this.#s.cProgress=0;return{ok:true,wrong:true,message:'기록의 잎모양 순서를 다시 살펴보자.',state:this.snapshot()}}if(this.#s.cProgress===2){if(this.#canOpenGate(ctx,this.snapshot())!==true)return{ok:false,reason:'GATE_TRANSITION_SUPPORT_HOLD'};this.#s.cOpen=true;this.#s.cProgress=3}else this.#s.cProgress++;return{ok:true,message:this.#s.cOpen?'보드워크 길이 열렸다.':'다음 잎모양을 살펴보자.',state:this.snapshot()}}
 return{ok:false,reason:'UNSUPPORTED_ACTION'}
 }
 journal(){return{a:this.#s.aObserved,bConnected:[0,1,2].map(i=>!!(this.#s.bBits&(1<<i))),observed:[...this.#s.cObserved],sequence:this.#s.cObserved.every(Boolean)?['좁은잎','갈래잎','좁은잎']:null,progress:this.#s.cProgress,gateOpen:this.#s.cOpen,penalty:0,timeLimit:null,typedAnswer:false}}
 completion(){return{eligibleForFutureCanonicalValidation:this.#s.aObserved&&this.#s.bBits===7&&this.#s.cOpen,canonicalEvent:'S5_JUNGLE_DOME_EXPEDITION',canonicalReward:'TX_S5_JUNGLE_DOME_REWARD',connected:false,grantCalls:0,persistCalls:0,devRewardReceiptReusable:false}}
}
