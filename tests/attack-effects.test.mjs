import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVES} from '../dist/model.mjs';
import {MOVE_EFFECTS,effectTarget,playMoveAudio,playMoveEffect,resolveMoveEffect} from '../dist/attack-effects.mjs';

function canvasContext(){
 const calls=[],state={};
 const api=new Proxy({calls,beginPath(){},moveTo(...v){calls.push(['moveTo',...v])},lineTo(...v){calls.push(['lineTo',...v])},arc(...v){calls.push(['arc',...v])},quadraticCurveTo(){},bezierCurveTo(){},closePath(){},fill(){calls.push(['fill',state.fillStyle])},stroke(){calls.push(['stroke',state.strokeStyle])},save(){},restore(){},translate(){},rotate(){},setTransform(){},clearRect(){calls.push(['frame']) }},{set(target,key,value){state[key]=value;target[key]=value;return true}});
 return api;
}

function fixture({width=900,reverse=false,brokenContext=false,animationThrows=false}={}){
 const rect=(left,top,w,h)=>({left,top,width:w,height:h});
 const context=canvasContext();
 const canvas={style:{},isConnected:true,width:0,height:0,setAttribute(){},getContext(){if(brokenContext)throw Error('canvas unavailable');return context},remove(){this.isConnected=false;this.removed=true}};
 const document={createElement(tag){assert.equal(tag,'canvas');return canvas}};
 const field={ownerDocument:document,isConnected:true,getBoundingClientRect:()=>rect(0,0,width,width/2.16),append(node){this.child=node;node.isConnected=true}};
 const actorX=reverse?width*.72:width*.12,targetX=reverse?width*.08:width*.7;
 const animations=[];const animate=function(frames,timing){if(animationThrows)throw Error('WAAPI failed');animations.push({node:this,frames,timing});return {cancel(){this.cancelled=true}}};
 const actor={getBoundingClientRect:()=>rect(actorX,width*.20,width*.2,width*.18),animate};
 const target={getBoundingClientRect:()=>rect(targetX,width*.12,width*.2,width*.18),animate};
 return {field,actor,target,canvas,context,animations};
}

function virtualFrames(times){let i=0;return cb=>{queueMicrotask(()=>cb(times[Math.min(i++,times.length-1)]));return i}}

function audioContext(){
 const events=[],destination={};
 return {currentTime:2,destination,events,createOscillator(){const o={frequency:{setValueAtTime(...v){events.push(['frequency',...v])},exponentialRampToValueAtTime(...v){events.push(['frequencyRamp',...v])}},connect(){},disconnect(){},start(v){events.push(['start',v])},stop(v){events.push(['stop',v])}};return o},createGain(){return {gain:{setValueAtTime(...v){events.push(['gain',...v])},exponentialRampToValueAtTime(...v){events.push(['ramp',...v])}},connect(){},disconnect(){}}}};
}

test('effect registry covers the model move keys exactly with distinct visual ids',()=>{
 assert.deepEqual(Object.keys(MOVE_EFFECTS).sort(),Object.keys(MOVES).sort());
 assert.equal(new Set(Object.values(MOVE_EFFECTS).map(v=>v.visual)).size,Object.keys(MOVES).length);
 assert.equal(new Set(Object.values(MOVE_EFFECTS).map(v=>JSON.stringify(v.audio))).size,Object.keys(MOVES).length);
 for(const [key,cfg] of Object.entries(MOVE_EFFECTS)){
  assert.ok(Number.isFinite(cfg.duration)&&cfg.duration>=650,`${key} duration`);
  assert.ok(Number.isFinite(cfg.contact)&&cfg.contact>0&&cfg.contact<1,`${key} contact`);
  assert.ok(['sine','square','triangle','sawtooth'].includes(cfg.audio[0]),`${key} oscillator`);
  assert.ok(cfg.audio[1].length>=2&&cfg.audio[1].every(v=>Number.isFinite(v)&&v>0),`${key} notes`);
 }
 assert.equal(resolveMoveEffect('missing-move').visual,'fallback');
});

test('water renders several bubbles in flight in both battle directions and mobile scale',async()=>{
 for(const options of [{width:900,reverse:false},{width:320,reverse:true}]){
  const f=fixture(options);await playMoveEffect({...f,key:'water',raf:virtualFrames([450,950]),caf(){},now:()=>0,audioContext:null});
  const arcs=f.context.calls.filter(v=>v[0]==='arc');
  assert.ok(arcs.length>=6,'bubble silhouettes should be visible before contact');
  const xs=arcs.map(v=>v[1]);assert.ok(Math.max(...xs)-Math.min(...xs)>options.width*.12,'bubbles should traverse the actor-target path');
  assert.equal(f.canvas.removed,true);
 }
});

test('miss launches the move without the water contact droplets',async()=>{
 const miss=fixture(),hit=fixture();
 await playMoveEffect({...miss,key:'water',outcome:'miss',raf:virtualFrames([700,950]),caf(){},now:()=>0});
 await playMoveEffect({...hit,key:'water',outcome:'hit',raf:virtualFrames([700,950]),caf(){},now:()=>0});
 const droplet=v=>v[0]==='fill'&&v[1]==='#b9f6ff';
 assert.equal(miss.context.calls.some(droplet),false);
 assert.equal(hit.context.calls.some(droplet),true);
});

test('new starter moves use recognizable leaf and fire silhouettes at desktop and phone sizes',async()=>{
 for(const options of [{width:900,reverse:false},{width:320,reverse:true}]){
  const green=fixture(options),flame=fixture(options);
  await playMoveEffect({...green,key:'leaf',raf:virtualFrames([520,850]),caf(){},now:()=>0});
  await playMoveEffect({...flame,key:'fire',raf:virtualFrames([580,910]),caf(){},now:()=>0});
  assert.ok(green.context.calls.filter(v=>v[0]==='fill'&&v[1]==='#78bf65').length>=5,'leaf move should throw several green leaves');
  assert.ok(flame.context.calls.some(v=>v[0]==='fill'&&['#ffad32','#f2692d'].includes(v[1])),'fire move should throw orange flame shapes');
  assert.ok(flame.context.calls.some(v=>v[0]==='fill'&&v[1]==='#ffd45b'),'fire move should shed yellow embers');
  assert.equal(green.canvas.removed,true);assert.equal(flame.canvas.removed,true);
 }
});

test('heal and guard target only the caster and reduced motion resolves in one static frame',async()=>{
 assert.equal(effectTarget('heal'),'self');assert.equal(effectTarget('guard'),'self');assert.equal(effectTarget('water'),'opponent');
 for(const key of ['heal','guard']){const f=fixture();let frames=0;const result=await playMoveEffect({...f,key,reduced:true,raf:virtualFrames([0,160]),caf(){},now:()=>0});frames=f.context.calls.filter(v=>v[0]==='frame').length;assert.equal(result.target,'self');assert.equal(frames,2);assert.equal(f.canvas.removed,true);assert.equal(f.animations.length,0)}
});

test('target recoil is scheduled only for a normal opponent hit',async()=>{
 for(const [outcome,reduced,expected] of [['hit',false,1],['miss',false,0],['hit',true,0]]){const f=fixture();await playMoveEffect({...f,key:'water',outcome,reduced,raf:virtualFrames(reduced?[0,160]:[950]),caf(){},now:()=>0});assert.equal(f.animations.filter(v=>v.node===f.target).length,expected)}
 const self=fixture();await playMoveEffect({...self,key:'heal',raf:virtualFrames([900]),caf(){},now:()=>0});assert.equal(self.animations.filter(v=>v.node===self.target).length,0);
});

test('audio envelopes are finite and zero volume stays silent',()=>{
 const silent=audioContext();assert.equal(playMoveAudio(silent,MOVE_EFFECTS.water,0).count,0);assert.equal(silent.events.length,0);
 const audible=audioContext(),voice=playMoveAudio(audible,MOVE_EFFECTS.mystic,.5,'hit',.2);assert.equal(voice.count,4);
 for(const event of audible.events)for(const value of event.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value));
 assert.ok(audible.events.filter(v=>v[0]==='gain').every(v=>v[1]>0&&v[1]<=.12));voice.stop();
});

test('leaf rustle descends while fire ignition rises and both have separate synthesized timbres',()=>{
 const leafAudio=audioContext(),fireAudio=audioContext();
 assert.equal(playMoveAudio(leafAudio,MOVE_EFFECTS.leaf,.5).count,4);
 assert.equal(playMoveAudio(fireAudio,MOVE_EFFECTS.fire,.5).count,4);
 const leafStart=leafAudio.events.find(v=>v[0]==='frequency')[1],leafEnd=leafAudio.events.find(v=>v[0]==='frequencyRamp')[1];
 const fireStart=fireAudio.events.find(v=>v[0]==='frequency')[1],fireEnd=fireAudio.events.find(v=>v[0]==='frequencyRamp')[1];
 assert.ok(leafEnd<leafStart,'leaf rustle should fall in pitch');
 assert.ok(fireEnd>fireStart,'fire ignition should rise in pitch');
 assert.notDeepEqual(MOVE_EFFECTS.leaf.audio,MOVE_EFFECTS.fire.audio);
});

test('renderer failure and WAAPI failure both settle and remove their overlay',async()=>{
 for(const options of [{brokenContext:true},{animationThrows:true}]){const f=fixture(options);const result=await playMoveEffect({...f,key:'tackle',raf:virtualFrames([800]),caf(){},now:()=>0,watchdogMs:50});assert.equal(result.completed,true);assert.equal(f.canvas.removed,true)}
});
