import test from 'node:test';
import assert from 'node:assert/strict';
import {postChecklist20260927,relocateRoamer20260927,roamerAt20260927,roamingEligible20260927} from '../dist/story/post-20260927.mjs';

const contract={speciesIdsByNumber:{148:'SPECIES_148',149:'SPECIES_149',150:'SPECIES_150',151:'SPECIES_151'}};
const sample=()=>({progress:{completedEvents:[],items:{}},dex:{caught:[]},world:{},fieldResearch:{completedResearchQuestIds:[],claimedResearchRewardIds:[]}});
const world={roamingNodeApproval:'APPROVED',maps:{'world:post:route':{stageId:'POST',width:12,height:12}},roamingNodes:{148:{mapId:'world:post:route',cells:[[2,3],[7,8]],nodeIds:['roam:148:1','roam:148:2']},151:{mapId:'world:post:route',cells:[[5,6]],nodeIds:['roam:151:1']}}};
test('POST checklist derives optional captures separately from sanctuary resolution',()=>{
 const s=sample();s.progress.completedEvents.push('FINAL_CHAMPION','POST_SANCTUARY_148_RESOLVED');s.progress.items.sea_emblem=1;
 const c=postChecklist20260927(s,contract);
 assert.equal(c.onlineFriendBattle,true);assert.deepEqual(c.sanctuaries['148'],{resolved:true,caught:false,emblem:true});assert.equal(c.compass,false);
 s.fieldResearch.completedResearchQuestIds.push('QUEST_A');assert.deepEqual(postChecklist20260927(s,contract).fieldResearch.completedQuestIds,['QUEST_A']);
});
test('uncaught legends roam only after ending, No151 only after first fixed battle',()=>{
 const s=sample();assert.equal(relocateRoamer20260927(s,contract,world,148,()=>0),null);
 s.progress.completedEvents.push('YEJI_FINAL_ENDING');assert.equal(roamingEligible20260927(s,contract,151),false);
 assert.deepEqual(relocateRoamer20260927(s,contract,world,148,()=>0),{mapId:'world:post:route',x:2,y:3});
 assert.equal(roamerAt20260927(s,contract,'world:post:route',2,3),148);
 assert.deepEqual(relocateRoamer20260927(s,contract,world,148,()=>0),{mapId:'world:post:route',x:7,y:8});
 s.dex.caught.push('SPECIES_148');assert.equal(roamerAt20260927(s,contract,'world:post:route',7,8),null);
 s.progress.completedEvents.push('POST_ONSEOM_GARDEN_FIRST_151');assert.deepEqual(relocateRoamer20260927(s,contract,world,151,()=>0),{mapId:'world:post:route',x:5,y:6});
});
test('roaming fails closed with absent or unapproved node pool',()=>{
 const s=sample();s.progress.completedEvents.push('YEJI_FINAL_ENDING');
 assert.equal(relocateRoamer20260927(s,contract,{},148),null);
 assert.equal(relocateRoamer20260927(s,contract,{maps:{'world:core':{stageId:'S1',width:10,height:10}},roamingNodes:{148:{mapId:'world:core',cells:[[2,2]]}}},148),null);
 assert.equal(relocateRoamer20260927(s,contract,{...world,roamingNodeApproval:'UNAPPROVED_DEV_TEST_ONLY'},148),null);
 assert.equal(relocateRoamer20260927(s,contract,{...world,roamingNodes:{148:{...world.roamingNodes[148],nodeIds:['wrong','roam:148:2']}}},148),null);
 const formerlyApproved=sample();formerlyApproved.progress.completedEvents.push('YEJI_FINAL_ENDING');
 assert.ok(relocateRoamer20260927(formerlyApproved,contract,world,148,()=>0));
 assert.equal(roamerAt20260927(formerlyApproved,contract,'world:post:route',2,3,{...world,roamingNodeApproval:'UNAPPROVED_DEV_TEST_ONLY'}),null);
 assert.deepEqual(s.world,{});
});
