export const STORY_OPERATIONS=Object.freeze(['dialogue','actorFace','actorMove','inputLock','inputUnlock','flagSet','itemReward','badgeReward','trainerBattle','warp','cameraCue','cutIn','stageComplete','starter','seen']);
const presentationOps=new Set(['dialogue','actorFace','actorMove','warp','cameraCue','cutIn']);
/** One sequencer for field/service hosts. Missing presentation assets/hooks cannot stop logic.
 * Reward/flag mutations operate on a transaction draft supplied by the progression service.
 */
export class StoryEventRunner {
 constructor(hooks={}){this.hooks=hooks;this.running=false;this.warnings=[]}
 async cue(op){
  const fn=this.hooks[op.op];if(!fn){if(op.op==='warp')throw Error('Story warp host binding required');return}
  if(['inputLock','warp'].includes(op.op)){await fn(structuredClone(op));return}
  try{await fn(structuredClone(op))}catch(error){this.warnings.push({op:op.op,message:error.message})}
 }
 async run(operations,{apply,battle,guard,signal}){
  if(this.running)throw Error('Story runner already active');
  for(const op of operations)if(!STORY_OPERATIONS.includes(op.op))throw Error('Unknown story operation');
  if(guard!==undefined&&(typeof guard!=='function'||!(signal instanceof AbortSignal)))throw Error('STORY_GUARD_REQUIRED');
  const check=()=>{if(signal?.aborted)throw Error('STORY_PRESENTATION_CANCELLED');guard?.()};
  const wait=async promise=>{if(!signal)return promise;check();let abort;try{return await Promise.race([promise,new Promise((_,reject)=>{abort=()=>reject(Error('STORY_PRESENTATION_CANCELLED'));signal.addEventListener('abort',abort,{once:true})})])}finally{signal.removeEventListener('abort',abort)}};
  this.running=true;
  try{
   await this.cue({op:'inputLock'});
   for(const op of operations){
    check();
    if(op.op==='trainerBattle'){const won=await battle(op.trainerId);if(!won)return {completed:false}}
    else if(presentationOps.has(op.op)||['inputLock','inputUnlock'].includes(op.op))await wait(this.cue(op));
    else await apply(op);
   }
   check();return {completed:true};
  }finally{await this.cue({op:'inputUnlock'});this.running=false}
 }
}
