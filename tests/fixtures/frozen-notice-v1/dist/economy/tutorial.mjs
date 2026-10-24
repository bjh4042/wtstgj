import {NORMAL_BALLS} from './contract.mjs';
const permits=new WeakMap();
export function tutorialReady(s){return !!s.economy?.tutorial.open&&!s.economy.tutorial.completed&&s.progress?.currentStage==='PROLOGUE'&&s.progress.completedEvents.includes('P03_TUTORIAL')&&!s.progress.completedEvents.includes('P04_SUSPICIOUS_TRACE')}
export function issueTutorialPermit(s,request){
 if(!tutorialReady(s)||request.tableId!=='P_ECO_CENTER_EDGE:land_grass')throw Error('Designated tutorial capture unavailable');
 const token=Object.freeze({});permits.set(token,{sessionId:s.sessionId,revision:s.revision,speciesId:request.speciesId,level:request.level});return token;
}
export function consumeTutorialPermit(token,s,opponents,kind){
 if(!token)return false;const p=permits.get(token);permits.delete(token);
 if(!p||kind!=='wild'||opponents.length!==1||p.sessionId!==s.sessionId||p.revision!==s.revision||p.speciesId!==opponents[0].speciesId||p.level!==opponents[0].level||!s.economy?.tutorial.open||s.economy.tutorial.completed)throw Error('Invalid tutorial capability');return true;
}
export const needsTutorialRefill=s=>NORMAL_BALLS.every(id=>s.inventory[id]===0);
export function refillTutorial(s,rule){if(needsTutorialRefill(s)){s.inventory.ecology_ball+=rule.refill_if_empty;s.economy.tutorial.refills++;return true}return false}
export function tutorialChance(s,rule,ballId,base){
 if(ballId==='ecology_ball'&&s.economy.tutorial.attempts>=2)return 1;
 return Math.max(rule.minimum_success_probability,base);
}
