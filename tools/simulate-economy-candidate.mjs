import {tableAccess} from '../dist/encounter/access.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {catalog,ordinary,rules,fresh,service,seeded,bestMove,host,walkTo,research} from '../tests/helpers/economy-fixture.mjs';
import {createCanonicalCreature} from '../dist/canonical-session.mjs';
import {captureProbability,battleStats} from '../dist/battle-v3/rules.mjs';
const output=new URL('../docs/economy-capture-policy-candidate-v1/',import.meta.url);mkdirSync(output,{recursive:true});
const write=(name,data)=>writeFileSync(new URL(name,output),JSON.stringify(data,null,2)+'\n');
const seeds=[17,193,2026];
export function captureSimulation(){
 const lines=['speciesId,ballAllowed,hp,status,failures,ball,formula,oldFormula,cap,samples,successRate,failed,seed17,seed193,seed2026'],coverage=[],samplesPerSeed=1000;let rows=0,maxDeviation=0,failuresAtCap=0;
 const rolls=seeds.map(seed=>{const rng=seeded(seed);return Array.from({length:samplesPerSeed},()=>rng()).sort((a,b)=>a-b)});
 const successes=(sorted,p)=>{let lo=0,hi=sorted.length;while(lo<hi){const mid=(lo+hi)>>>1;if(sorted[mid]<p)lo=mid+1;else hi=mid}return lo};
 for(const ch of Object.values(catalog.encounterContract.chains))for(const id of ch.speciesIds){
  coverage.push({id,ballAllowed:ch.ballAllowed,acquisitionMode:ch.mode,note:ch.ballAllowed?'Formula survey; availability still requires existing table/event capability':'BLOCKED: no probability calculation or new capture route'});
  if(!ch.ballAllowed)continue;
  for(const hp of [1,.5,.25,'1HP'])for(const status of [null,'paralysis','sleep'])for(const failures of [0,2,5])for(const ball of rules.capture.balls){
   const mon=createCanonicalCreature(catalog,id,50);mon.hp=hp==='1HP'?1:battleStats(catalog,mon).hp*hp;mon.status=status;
   const p=captureProbability(rules,catalog,mon,ball,failures),counts=rolls.map(r=>successes(r,p)),n=samplesPerSeed*seeds.length,sum=counts.reduce((a,b)=>a+b,0),rate=sum/n;
   maxDeviation=Math.max(maxDeviation,Math.abs(rate-p));if(ball==='geoje_ball'&&p===.95)failuresAtCap+=n-sum;
   lines.push([id,true,hp,status??'none',failures,ball,p,captureProbability(rules,ordinary,mon,ball,failures),p===.95,n,rate,n-sum,...counts.map(x=>x/samplesPerSeed)].join(','));rows++;
  }
 }
 writeFileSync(new URL('capture-grid.csv',output),lines.join('\n')+'\n');
 const result={seeds,samplesPerSeed,rows,bernoulliTrials:rows*samplesPerSeed*3,maxAbsoluteDeviation:maxDeviation,tolerance:.035,pass:maxDeviation<=.035,geojeFailuresAtCap:failuresAtCap,speciesCoverage:coverage.length,ballAllowedSpecies:coverage.filter(x=>x.ballAllowed).length,blockedSpecies:coverage.filter(x=>!x.ballAllowed).length,method:'Fixed uniform seeds compared with production probability resolver. Common random numbers across grid; rows are correlated, not independent replication. Ratios use exact fractional HP for formula comparison; actual battles retain integer HP.',coverage};write('capture-summary.json',result);return result;
}
export async function runEconomy(seed,style){
 const rng=seeded(seed),s=service(fresh(catalog,catalog.starterIds[seeds.indexOf(seed)])),trace=[],metrics={battles:0,wild:0,trainer:0,captureSuccess:0,captureFailure:0,potions:0,ballsBought:0,ballsUsed:0,requests:0,aid:0,losses:0,priceBlocked:0},warnings=new Set(),trainingTables=new Set();let serial=0,blocker=null;
 const tx=(type,data={})=>s.economyCommand({type,transactionId:`run-${seed}-${style}-${++serial}`,hubId:'TEST_CENTER',...data});
 const record=label=>{const x=s.snapshot();trace.push({label,money:x.economy.money,balls:x.inventory,items:x.progress.items,party:x.party.map(m=>({id:m.speciesId,level:m.level,exp:m.totalExp,hp:m.hp})),...metrics,questWalkPixels:x.economy.walkedDistance??0})};
 async function center(){await walkTo(s,host.hubs.TEST_CENTER.position);await tx('heal')}
 async function supplies(){const x=s.snapshot();if(x.inventory.ecology_ball>=3)return;await walkTo(s,host.hubs.TEST_CENTER.position);if(x.economy.money<200&&x.inventory.ecology_ball===0&&!x.economy.tutorial.open){await tx('ball-aid');metrics.aid++}
  if(s.snapshot().economy.money<600){await research(s,`quest-${++metrics.requests}`)}
  const count=Math.min(5,Math.floor(s.snapshot().economy.money/200));if(count){await tx('purchase',{itemId:'ecology_ball',quantity:count});metrics.ballsBought+=count}
 }
 async function grow(){for(const p of s.snapshot().pendingMoves){const mon=s.snapshot().party.find(m=>m.instanceId===p.instanceId);if(!mon)continue;const power=id=>catalog.getMoveById(id).power??0;let slot=mon.moves.length<4?mon.moves.length:mon.moves.reduce((i,m,j)=>power(m.id)<power(mon.moves[i].id)?j:i,0);await s.learnMove(p.instanceId,p.moveId,power(p.moveId)>=power(mon.moves[slot]?.id??p.moveId)?slot:null)}for(const m of s.snapshot().party){const sp=catalog.getSpeciesById(m.speciesId);if(sp.evo&&m.level>=sp.evoLevel)await s.evolve(m.instanceId)}}
 function driver(tutorial=false){const seen=new Set(s.snapshot().dex.caught);return b=>{let tries=0;for(let turn=0;turn<1500;turn++){const a=b.snapshot();if(a.phase==='ended'){metrics.battles++;metrics[a.kind==='wild'?'wild':'trainer']++;if(a.outcome==='lost')metrics.losses++;for(const e of a.events){if(e.type==='capture'){metrics.ballsUsed++;metrics[e.success?'captureSuccess':'captureFailure']++}if(e.type==='item')metrics.potions++}return}
    if(a.phase==='forced-switch'){b.act({type:'switch',index:a.party.findIndex(m=>m.hp>0)});continue}
    const m=a.party[a.active],enemy=a.opponents[a.enemyActive],wants=tutorial||style==='frequent_capture'||!seen.has(enemy.speciesId),limit=style==='frequent_capture'?5:2;
    if(style==='frequent_potion'&&m.hp/battleStats(catalog,m).hp<.7){if(a.bagItems.potion>0){b.act({type:'item',transactionId:`potion-${++serial}`,itemId:'potion',instanceId:m.instanceId});continue}else{metrics.priceBlocked++;warnings.add('POTION_PRICE_UNRESOLVED: no extra potions invented; center recovery used')}}
    if(a.kind==='wild'&&wants&&tries<limit&&(a.inventory.ecology_ball>0||tutorial)&&(tutorial||style==='frequent_capture'||enemy.hp/battleStats(catalog,enemy).hp<=.5)){tries++;b.act({type:'capture',ballId:'ecology_ball'});continue}
    b.act({type:'move',moveId:bestMove(a)});
   }throw Error('battle turn bound')};}
 async function wild(){if(metrics.battles>350)throw Error('NORMAL_RUN_BUDGET: 350 battles reached');const stage=s.snapshot().progress.currentStage,table=Object.values(catalog.encounterContract.tables).find(t=>{if(!t.active||t.rod||t.stageId!==stage||t.profile==='NONE')return false;const draft=s.snapshot();draft.encounter.areaId=t.areaId;const error=tableAccess(draft,catalog.encounterContract,t.id);if(error)warnings.add(t.id+': '+error);return !error});if(!table)throw Error('NO_UNLOCKED_TRAINING_ROUTE: '+stage);await center();await supplies();await s.enterArea(table.areaId,table.method);trainingTables.add(table.id);await s.forceEncounter({mode:'test',rng,battleDriver:driver()});await grow();record('wild:'+table.id)}
 try{
  for(const stage of ['PROLOGUE','S1','S2','S3']){
   if(stage!=='PROLOGUE')await s.enterStage(stage);record(stage+':entry');
   for(let guard=0;guard<100;guard++){
    const trainer=Object.values(s.contract.trainers).find(t=>t.stageId===stage&&(style!=='skip_optional'||t.required||t.eventId)&&s.trainerAvailable(t.id));
    const event=Object.values(s.contract.events).find(e=>e.stageId===stage&&s.eventAvailable(e.id));
    const id=trainer?.id??event?.trainerId;
    if(id){const target=Math.max(...s.resolveTrainerParty(id).members.map(m=>m.level));while(Math.max(...s.snapshot().party.map(m=>m.level))<target)await wild();await center();await s.runTrainer(id,{rng,battleDriver:driver()});await grow();record(id);if(!s.snapshot().progress.defeatedTrainers.includes(id)){await wild();continue}continue}
    if(event){await s.runEvent(event.id);if(event.id==='P03_TUTORIAL'){await center();await s.enterArea('P_ECO_CENTER_EDGE','land_grass');await s.runTutorialCapture({rng,battleDriver:driver(true)});await grow()}record(event.id);continue}
    await s.completeStage(stage);record(stage+':complete');break;
   }
  }
 }catch(e){blocker=e.message;record('BLOCKED')}
 const x=s.snapshot();return {seed,style,starterId:x.starterId,status:blocker?'BLOCKED':'COMPLETED_SERVICE_ROUTE',blocker,completedStages:x.progress.completedStages,money:x.economy.money,balls:x.inventory,metrics,questWalkPixels:x.economy.walkedDistance??0,questWalkTiles:(x.economy.walkedDistance??0)/48,warnings:[...warnings],trainingTables:[...trainingTables],assistance:{directMoneyEdit:false,extraBallGift:false,levelOverride:false,forcedCaptureRng:false,sourceLevelsAndExp:true,geography:'STEP2_QA_FIXTURE_ONLY',fieldEncounterTriggers:'Service table selection, not actual stage-map walking; no trigger-frequency tuning conclusion',healing:'Candidate free center via verified QA coordinates'},trace};
}
if(process.argv.includes('--capture'))console.log(JSON.stringify(captureSimulation(),(k,v)=>k==='coverage'?undefined:v));
if(process.argv.includes('--economy')){const results=[];for(const seed of seeds)for(const style of ['new_species','frequent_capture','frequent_potion','skip_optional']){const r=await runEconomy(seed,style);results.push(r);console.log(JSON.stringify({seed,style,status:r.status,stages:r.completedStages,blocker:r.blocker,...r.metrics}));write('economy-runs.json',{seeds,styles:4,normalRun:true,finalGeographicPlaythrough:false,results})}}
