import {loadApprovedTerrain,drawApprovedTerrain,drawApprovedGrass,drawApprovedWaterEffects,isApprovedWater} from './approved-field-terrain.mjs';
import {loadApprovedNPCs,drawApprovedNPC} from './art/approved-npc-field.mjs';
import {loadApprovedFieldProof,queueApprovedFieldProof} from './art/approved-field-proof.mjs';
import {loadApprovedPlayers,drawApprovedPlayer} from './art/approved-player-field.mjs';
import {drawResolvedEnvironment} from './presentation/weather-layer.mjs';
import {mapPresentation} from './presentation/map-presentation.mjs';
import {TILE_ANIMATION_OPTIONS,TILE_DEFAULT_ANIMATIONS,resolveTileAnimation,drawAnimatedTile} from './presentation/tile-animation.mjs';
import {transitionFrame} from './presentation/battle-transition.mjs';
// @ts-check
import {drawFieldFollower} from './follower-render.mjs';
import {createFieldAnimation,tickFieldAnimation,environmentFrames,updateGrassInteraction,grassAt,emitFieldEffect,FIELD_ANIMATION} from './field-animation.mjs';
import {GRASS_PATCHES} from './field-grass-data.mjs';
import {createFieldCore,coreWalkable,fieldInputLocked,lockField,unlockField,startNPCDialogue,endNPCDialogue,recordFieldMovement,tryLedge,tryMapConnection,tickFieldCore} from './field-engine-core.mjs';
import {QA_MAPS,behaviorAt} from './field-behavior.mjs';
import {FIELD_ASSET_IDS,LEGACY_FIELD_KEYS,humanPose,FIELD_HUMAN_IDS} from './asset-manifest.mjs';
import {drawW03Human} from './art/w03-human-field.mjs';
import {playerFieldAssetId,W03_PLAYER_ATLASES} from './art/w03-player-field.mjs';
import {loadAsset,peekAsset,assetsUsePlaceholders} from './asset-runtime.mjs';
import {FIELD_MAP_PATH} from './art/field-bindings.mjs';
import {drawTilePlaceholder,tileSource,behaviorTileId} from './tileset-contract.mjs';
import {geojeEnvironment} from './environment-service.mjs';
import {GOLDEN_MAP_DATA} from './golden-map-data.mjs';
import {loadFieldBitmapFont,drawFieldText,fieldTextWidth,bitmapFontStats} from './field-bitmap-text.mjs';
/** Playable first region: tile atlas + independent depth-sorted entities. */
export const GOLDEN_SAVE_KEY='geoje.monsters.golden-field.v1';
export const GOLDEN_VIEW={width:1536,height:1024};
/** @typedef {'up'|'down'|'left'|'right'} Direction */
/** @typedef {{id:string,src:string,x:number,y:number,w:number,h:number,depth:number,layer:string,foregroundSplit?:number}} MapObject */
/** @typedef {{width:number,height:number,tile:number,columns:number,rows:number,tiles:number[][],objects:MapObject[]}} FieldMap */
/** @typedef {{x:number,y:number,facing:Direction,scene:string,humanId?:string,follower?:any,core:import('./field-engine-core.mjs').FieldCore,doorX:number,walk:number,moving:boolean,cooldown:number,menu:number|null,dialogue:string[],dialogueIndex:number,transition:null|{kind:'enter'|'exit',elapsed:number,switched:boolean}}} GoldenState */
/** @type {FieldMap|null} */ let map=null;
/** @type {Map<string,HTMLImageElement>} */ const images=new Map();
/** @type {import('./field-bitmap-text.mjs').TextRun[]} */ let textRuns=[];
let ready=false;
/** @type {HTMLCanvasElement|null} */ let terrainCache=null;
/** @type {Uint8ClampedArray|null} */ let waterMask=null;
export const fieldAnimation=createFieldAnimation();
/** @param {number} dt @param {boolean} paused */
export function updateGoldenEnvironment(dt,paused=false){tickFieldAnimation(fieldAnimation,dt,paused)}
/** @param {GoldenState} s */
export function updateGoldenGrass(s){updateGrassInteraction(fieldAnimation,s)}
export const goldenEnvironmentStats=()=>({...environmentFrames(fieldAnimation),frozen:fieldAnimation.freeze,time:Math.round(fieldAnimation.time),grassCell:fieldAnimation.previousCell,effects:fieldAnimation.effects.map(e=>({...e,age:Math.round(e.age)}))});
/** @param {URLSearchParams} q */
export function configureGoldenQA(q){fieldAnimation.freeze=q.get("qa")==="1";fieldAnimation.qaFrame=Math.max(0,Number(q.get("frame"))||0);fieldAnimation.time=0;fieldAnimation.effects=[];fieldAnimation.previousCell="";fieldAnimation.qaGrassFrame=Math.max(0,Math.min(3,Number(q.get("grass"))||0));fieldAnimation.qaGrassId=q.get("pose")==="grass"?"3":"";}

export const INVESTIGATOR_ATLAS=Object.freeze({src:'field.character-npc-v1.investigator-atlas',width:96,height:120,anchorX:49,anchorY:120,rows:Object.freeze({down:0,left:1,right:2,up:3}),walk:Object.freeze([1,3,2,3])});
/** @param {Direction} facing @param {boolean} moving @param {number} walk */
export function investigatorAtlasPose(facing,moving,walk){const row=INVESTIGATOR_ATLAS.rows[facing],frame=moving?INVESTIGATOR_ATLAS.walk[Math.floor(walk/26)%INVESTIGATOR_ATLAS.walk.length]:0;return {row,frame,sx:frame*INVESTIGATOR_ATLAS.width,sy:row*INVESTIGATOR_ATLAS.height,dx:-INVESTIGATOR_ATLAS.anchorX,dy:-INVESTIGATOR_ATLAS.anchorY}}
export const GOLDEN_MENU=['도감','생태친구','가방','탐험가','저장','설정'];
export const GOLDEN_ACTIONS=['dex','party','bag','explorer','save','settings'];
const descriptions=['만난 생태몬과 도감 기록을 확인합니다.','함께 다니는 생태친구를 확인합니다.','가방에 든 도구를 확인합니다.','탐험가와 현재 지역을 확인합니다.','지금까지의 모험을 저장합니다.','소리와 조작 설정을 확인합니다.'];
/** @param {any} saved @param {{qa?:boolean,scenario?:string,movement?:string}} options @returns {GoldenState} */
export function createGoldenField(saved=null,options={}){
  const s=/** @type {GoldenState} */({core:createFieldCore(saved,options),x:765,y:448,facing:/** @type {Direction} */('up'),scene:/** @type {'outdoor'|'interior'} */('outdoor'),doorX:765,walk:0,moving:false,cooldown:0,menu:null,dialogue:[],dialogueIndex:0,transition:null});
  if(saved&&(['outdoor','interior'].includes(saved.scene)||(options.qa&&QA_MAPS[saved.scene]))&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
    s.scene=saved.scene;s.x=Math.max(48,Math.min(1488,saved.x));s.y=Math.max(80,Math.min(990,saved.y));
    if(['up','down','left','right'].includes(saved.facing))s.facing=saved.facing;
    s.doorX=Number.isFinite(saved.doorX)?Math.max(672,Math.min(788,saved.doorX)):765;
    if(!goldenWalkable(s,s.x,s.y)){s.scene='outdoor';s.x=765;s.y=448}
  }
  if(options.qa&&!saved){s.scene='qa_a';s.x=options.scenario==='connection'?1230:options.scenario==='blocked'?840:options.scenario==='ledge'?456:600;s.y=options.scenario==='connection'?800:options.scenario==='blocked'?408:624;s.facing='down';if(options.scenario==='area')s.core.area={name:'장승포 해안길',age:0}}
  return s;
}
/** @param {GoldenState} s */
export function serializeGolden(s){return {version:1,scene:s.scene,x:Math.round(s.x),y:Math.round(s.y),facing:s.facing,doorX:Math.round(s.doorX),...(s.core.defeated.length?{defeatedTrainers:[...s.core.defeated]}:{})}}
/** @param {GoldenState} s @param {number} dt @param {boolean} paused */
export function updateGoldenCore(s,dt,paused=false){tickFieldCore(s,dt,fieldAnimation,paused||fieldAnimation.freeze)}
export async function loadGoldenAssets(){
  const response=await fetch(FIELD_MAP_PATH);if(!response.ok)throw Error('시작 지역 지도를 불러오지 못했습니다.');
  const data=await response.json();map={...data,objects:data.objects.map(o=>({...o,src:LEGACY_FIELD_KEYS[o.src]??o.src}))};
  await Promise.all(FIELD_ASSET_IDS.filter(id=>!/^field\.(ui|grass|animation|effects)\./.test(id)&&!['field.ground-atlas','field.decoration-atlas'].includes(id)).map(async id=>{const result=await loadAsset(id);images.set(id,result.image)}));
  await Promise.all(['human.player-boy.field','human.player-girl.field','human.investigator.field','human.fisherman.field','human.researcher.field','tileset.field.v1'].map(id=>loadAsset(id)));
  await loadApprovedPlayers();
  await loadApprovedFieldProof();
  await loadApprovedTerrain();
  await loadApprovedNPCs();
  await loadFieldBitmapFont();
  ready=true;
}
export const goldenAssetsReady=()=>ready;
/** @param {number} x @param {number} y @param {number[]} r */
function inside(x,y,r){return x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3]}
/** @param {GoldenState} s @param {number} x @param {number} y */
export function goldenWalkable(s,x,y){return coreWalkable(s,x,y)}
/** @param {GoldenState} s */
function enter(s){if(s.transition)return null;s.doorX=s.x;lockField(s,'door');s.transition={kind:'enter',elapsed:0,switched:false};s.moving=false;return 'transition'}
/** @param {GoldenState} s */
function leave(s){if(s.transition)return null;lockField(s,'door');s.transition={kind:'exit',elapsed:0,switched:false};s.moving=false;return 'transition'}
/** @param {GoldenState} s @param {Direction|null} direction @param {number} dt @returns {string|null} */
export function moveGolden(s,direction,dt){
  if(s.transition){
    const t=s.transition;t.elapsed+=Math.min(dt,.05);s.moving=false;
    if(t.elapsed>=(FIELD_ANIMATION.door.openMs+FIELD_ANIMATION.door.approachMs+FIELD_ANIMATION.door.fadeMs)/1000&&!t.switched){t.switched=true;s.scene=t.kind==='enter'?'interior':'outdoor';s.x=t.kind==='enter'?768:s.doorX;s.y=t.kind==='enter'?869:395;s.facing=t.kind==='enter'?'up':'down';s.walk=0;}
    if(t.elapsed>=FIELD_ANIMATION.door.totalMs/1000){s.transition=null;s.cooldown=.4;s.core.stepDistance=0;unlockField(s);return t.kind}return null;
  }
  if(fieldInputLocked(s)){s.moving=false;return null}
  s.cooldown=Math.max(0,s.cooldown-dt);s.moving=false;
  if(!direction||s.menu!==null||s.dialogue.length)return null;
  s.facing=direction;const speed=260,dist=Math.min(dt,.05)*speed;
  const [dx,dy]=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[direction];
  for(let remaining=dist;remaining>0;){const d=Math.min(remaining,3);remaining-=d;
    const x=s.x+dx*d,y=s.y+dy*d;
    if(!s.cooldown&&s.scene==='outdoor'&&direction==='up'&&x>=672&&x<=788&&y<=371&&y>=345)return enter(s);
    if(!s.cooldown&&s.scene==='interior'&&direction==='down'&&x>=680&&x<=850&&y>=926)return leave(s);
    if(tryMapConnection(s,direction,x,y))return 'connection';
    if(tryLedge(s,direction,x,y))return 'ledge';
    if(!goldenWalkable(s,x,y)){
      const wx=Math.round(s.x+dx*48),wy=Math.round(s.y+dy*24);
      if(s.scene==='outdoor'&&wx>=0&&wx<1536&&wy>=0&&wy<1024&&isApprovedWater(wx,wy))emitFieldEffect(fieldAnimation,'ripple',wx,wy);
      break;
    }
    s.x=x;s.y=y;s.walk+=d;s.moving=true;
    if(recordFieldMovement(s,d))return 'encounter';
  }return null;
}
/** @param {GoldenState} s @param {string} text */
export function goldenSay(s,text){s.menu=null;s.dialogue=wrapPages(text);s.dialogueIndex=0;s.moving=false}
/** @param {string} text */
function wrapPages(text){
  const lines=[];for(const paragraph of text.split('\n')){let line='';for(const ch of paragraph){if(fieldTextWidth(line+ch,4)>1376){lines.push(line);line=''}line+=ch}lines.push(line)}
  const pages=[];for(let i=0;i<lines.length;i+=2)pages.push(lines.slice(i,i+2).join('\n'));return pages;
}
/** @param {GoldenState} s @returns {string|null} */
export function interactGolden(s){
  if(s.transition||(fieldInputLocked(s)&&!s.dialogue.length))return null;
  if(s.menu!==null)return GOLDEN_ACTIONS[s.menu];
  if(s.dialogue.length){if(++s.dialogueIndex>=s.dialogue.length){s.dialogue=[];s.dialogueIndex=0;endNPCDialogue(s)}return null}
  const vector=({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]})[s.facing];
  const npc=s.core.npcs.filter(n=>n.map===s.scene).find(n=>{const dx=n.x-s.x,dy=n.y-s.y;return Math.hypot(dx,dy)<135&&dx*vector[0]+dy*vector[1]>8});
  if(npc){goldenSay(s,startNPCDialogue(s,npc));return npc.action||null}
  if(QA_MAPS[s.scene]){goldenSay(s,'방향키로 걸으며 지형을 살펴보세요.');return null}
  if(s.scene==='interior'){
    if(s.y>870&&s.x>660&&s.x<860)return leave(s);
    goldenSay(s,'거제 생태센터 · 관찰 연구실\n남쪽 문으로 나가면 해안길로 돌아갑니다.');return null;
  }
  if(s.x>=672&&s.x<=788&&s.y<435&&s.facing==='up')return enter(s);
  if(Math.hypot(s.x-209,s.y-545)<145){goldenSay(s,'장승포 해안길 →\n계단을 내려가면 방파제와 부두가 이어집니다.');return null}
  if(Math.hypot(s.x-1045,s.y-433)<120){goldenSay(s,'자연과 사람이 함께하는 거제\n거제 생태센터에서 쉬어 가세요.');return null}
  // Wild encounters are exclusively checked by completed walking steps.
  goldenSay(s,'NPC나 안내판 가까이에서 Z 또는 A를 누르세요.\nM 또는 메뉴 버튼으로 모험 메뉴를 엽니다.');return null;
}
/** @param {GoldenState} s */
export function toggleGoldenMenu(s){if(fieldInputLocked(s))return;s.dialogue=[];s.menu=s.menu===null?1:null;s.moving=false}
/** @param {GoldenState} s @param {Direction} direction */
export function moveGoldenMenu(s,direction){if(s.menu!==null)s.menu=(s.menu+(['up','left'].includes(direction)?5:1))%6}
/** @param {GoldenState} s */
export function closeGoldenUI(s){s.menu=null;s.dialogue=[];s.dialogueIndex=0;endNPCDialogue(s)}
/** @param {GoldenState} s */
export function goldenCamera(s){return fieldAnimation.freeze||s.scene!=='outdoor'?0:Math.max(0,Math.min(128,Math.round(s.y-815)))}
/** @param {CanvasRenderingContext2D} c @param {string} src @param {number} x @param {number} y @param {number} scale */
function sprite(c,src,x,y,scale=1){if(src.startsWith('field.animation.')||src.startsWith('field.grass.')||src.startsWith('field.effects.')){if(peekAsset(src)?.status==='placeholder'||useContractTerrain())return;}const im=images.get(src);if(im)c.drawImage(im,Math.round(x),Math.round(y),im.width*scale,im.height*scale)}
/** @param {CanvasRenderingContext2D} c @param {string} text @param {number} x @param {number} y */
function pixelText(c,text,x,y){
  textRuns.push({text,x,y,scale:4,color:'#ffffff',maxWidth:1400});
}
/** Text is presented last so small glyphs are not downsampled before DPR expansion.
 * @param {CanvasRenderingContext2D} c @param {number} ratio */
export function drawGoldenText(c,ratio=1){for(const run of textRuns)drawFieldText(c,run,ratio)}
export const goldenTextStats=bitmapFontStats;
/** @param {{id:string,x:number,y:number}} p */
function grassFrame(p){const e=fieldAnimation.effects.find(e=>e.kind==='tallGrass'&&e.x===p.x&&e.y===p.y);return fieldAnimation.freeze?(fieldAnimation.qaGrassId===p.id?fieldAnimation.qaGrassFrame:0):e?Math.min(3,Math.floor(e.age/90)):0}
/** @param {CanvasRenderingContext2D} c @param {typeof GRASS_PATCHES[number]} p @param {number} frame @param {number} camera */
function drawGrassPatch(c,p,frame,camera){drawApprovedGrass(c,p,frame,camera)}
/** @param {CanvasRenderingContext2D} c @param {GoldenState} s */
export function drawGoldenField(c,s){
  textRuns=[];
  c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;c.clearRect(0,0,1536,1024);
  if(!ready||!map){c.fillStyle='#152b36';c.fillRect(0,0,1536,1024);c.fillStyle='#fff';c.font='36px sans-serif';c.fillText('거제 해안길을 불러오는 중…',450,510);return}
  const camera=goldenCamera(s),presentationFrame=geojeEnvironment.getFrame(mapPresentation(s.scene));
  const t=s.transition,doorMs=t?t.elapsed*1000:0;
  const approach=t?(t.switched?(t.kind==='exit'?-Math.round(24*(1-Math.min(1,(doorMs-420)/140))):0):-Math.round((t.kind==='enter'?1:-1)*24*Math.min(1,Math.max(0,(doorMs-120)/140)))):0;
  /** @type {{depth:number,draw:()=>void}[]} */ const entities=[];
  if(s.scene==='outdoor'){
    textRuns.push({text:'거제 생태센터',x:613,y:185,scale:3,color:'#175b94',maxWidth:240,tracking:-3});
    textRuns.push({text:'장승포 해안길',x:128,y:421-camera,scale:2,color:'#574e43',maxWidth:159,tracking:-1});
    ['자연과','사람이','함께하는','거제'].forEach((text,i)=>textRuns.push({text,x:1010,y:254+i*31-camera,scale:2,color:'#576d89',maxWidth:i===3?48:88,tracking:-2}));
    textRuns[0].y-=camera;
    drawApprovedTerrain(c,s.scene,camera,fieldAnimation.time);
    for(const p of GRASS_PATCHES)drawGrassPatch(c,p,grassFrame(p),camera);
    for(const o of map.objects){
      const split=o.foregroundSplit,im=images.get(o.src);
      const actor=s.core.npcs.find(n=>n.id===o.id&&n.map===s.scene);if(actor){entities.push({depth:actor.y,draw:()=>{if(drawApprovedNPC(c,actor,camera)){drawGrassForeground(c,actor.x,actor.y,camera)}else if(actor.id!=='npc_left'&&drawHumanAsset(c,FIELD_HUMAN_IDS[actor.id]??'researcher',actor.x,actor.y,actor.facing,actor.moving,actor.walk,camera,true)){drawGrassForeground(c,actor.x,actor.y,camera)}else if(actor.id==='npc_left'){drawInvestigatorActor(c,actor.x,actor.y,actor.facing,actor.moving,actor.walk,camera);drawGrassForeground(c,actor.x,actor.y,camera)}else sprite(c,o.src,o.x+actor.x-actor.homeX,o.y+actor.y-actor.homeY-camera)}});continue}
      if(queueApprovedFieldProof(entities,o.src,c,camera,!!t))continue;
      if(split&&im){
        // Lower trunk/base and upper occluder share the same native source and anchor.
        const part=(/** @type {number} */sy,/** @type {number} */sh)=>()=>c.drawImage(im,0,sy,o.w,sh,o.x,o.y+sy-camera,o.w,sh);
        entities.push({depth:o.depth,draw:part(split,o.h-split)},{depth:o.depth+1,draw:part(0,split)});
      }else{const draw=()=>sprite(c,o.src,o.x,o.y-camera,1);if(o.depth===0)draw();else entities.push({depth:o.depth,draw})}
    }
  }else if(s.scene==='interior'){
    c.fillStyle='#171c25';c.fillRect(0,0,1536,1024);
    for(let y=192;y<960;y+=96)for(let x=288;x<1248;x+=96)sprite(c,'field.interior.floor',x,y,3);
    for(let x=288;x<1248;x+=96)sprite(c,'field.interior.wall',x,96,3);
    for(const [id,x,y,depth] of [['shelf',336,190,250],['shelf',960,190,250],['table',404,350,540],['table',852,350,540],['chair',420,560,650]]){
      entities.push({depth:Number(depth),draw:()=>sprite(c,`field.interior.${id}`,Number(x),Number(y),3)});
    }
    entities.push({depth:334,draw:()=>{drawApprovedNPC(c,{id:'researcher',x:775,y:335,facing:'down',moving:false,walk:0},0)}});
    // Doorway uses the recovered ecocenter's original stone sill, not invented art.
    const building=images.get('field.objects.ecocenter');if(building)c.drawImage(building,132,329,150,20,693,930,150,20);
  }else if(QA_MAPS[s.scene]){
    const qa=QA_MAPS[s.scene];c.fillStyle='#171c25';c.fillRect(0,0,1536,1024);
    for(let y=192;y<960;y+=96)for(let x=288;x<1248;x+=96)sprite(c,'field.interior.floor',x,y,3);
    for(const o of qa.solids)for(let y=o.rect[1];y<o.rect[1]+o.rect[3];y+=48)for(let x=o.rect[0];x<o.rect[0]+o.rect[2];x+=48)(()=>{const wall=images.get('field.interior.wall');if(wall)c.drawImage(wall,0,0,16,16,x,y,48,48)})();
    for(const l of qa.ledges){const sill=images.get('field.objects.ecocenter');if(sill)for(let x=l.rect[0];x<l.rect[0]+l.rect[2];x+=48)c.drawImage(sill,132,329,48,20,x,l.rect[1],48,20)}
    const sample=images.get('field.ground-atlas');for(const r of qa.grass)if(sample)for(let y=r[1];y<r[1]+r[3];y+=48)for(let x=r[0];x<r[0]+r[2];x+=48)c.drawImage(sample,192,384,48,48,x,y,48,48);
    for(const n of s.core.npcs.filter(n=>n.map===s.scene)){entities.push({depth:n.y,draw:()=>drawActor(c,n.x,n.y,n.facing,n.moving,n.walk,0)})}
  }
  if(s.scene!=='outdoor'&&(useContractTerrain()))drawContractTerrain(c,s.scene,0);
  // Approved ecology-center door state is rendered in its own socket above.
  if(s.follower?.visible)entities.push({depth:s.follower.y,draw:()=>{drawFieldFollower(c,s.follower,{camera});if(s.scene==='outdoor')drawGrassForeground(c,s.follower.x,s.follower.y,camera)}});
  entities.push({depth:s.y,draw:()=>{
    // Approved player assets are exclusive: missing/loading art must not select legacy sprites.
    drawApprovedPlayer(c,{appearance:s.humanId,x:s.x,y:s.y+approach-s.core.jumpOffset,facing:s.facing,moving:s.moving||!!approach,walk:approach?Math.abs(approach)*4:s.walk},camera);
  }});
  entities.sort((a,b)=>a.depth-b.depth).forEach(e=>e.draw());
  if(s.scene==='outdoor'){
    drawApprovedWaterEffects(c,fieldAnimation.effects,camera);
    drawGrassForeground(c,s.x,s.y,camera)
  }

  for(const e of fieldAnimation.effects){
    if(e.kind==='exclamation'||e.kind==='question')textRuns.push({text:e.kind==='exclamation'?'!':'?',x:e.x-10,y:e.y-camera,scale:3,color:'#ffffff'});
    if(e.kind==='landingDust'){const spread=Math.floor(e.age/35);for(const sign of [-1,1])textRuns.push({text:'.',x:Math.round(e.x+sign*(12+spread)),y:Math.round(e.y-15-camera),scale:2,color:'#c9c2a0'})}
  }
  drawResolvedEnvironment(c,presentationFrame,fieldAnimation.time,1536,1024);
  if(s.core.sequence?.kind==='encounter'&&!s.core.battleReady){const phase=transitionFrame(s.core.sequence.elapsed);if(phase.stripe){c.fillStyle='#111b25';for(let y=0;y<1024;y+=32)c.fillRect(0,y,1536,16)} }
  // Responsive DOM owns area/menu/dialogue UI; world framing is independent.
  if(t){textRuns=[];const amount=doorMs<260?0:doorMs<420?(doorMs-260)/160:Math.max(0,1-(doorMs-420)/140);const band=Math.round(512*amount);c.fillStyle='#111b25';c.fillRect(0,0,1536,band);c.fillRect(0,1024-band,1536,band)}
}

/** @param {CanvasRenderingContext2D} c @param {number} x @param {number} y @param {Direction} facing @param {boolean} moving @param {number} walk @param {number} camera */
function drawInvestigatorActor(c,x,y,facing,moving,walk,camera){if(drawHumanAsset(c,'investigator',x,y,facing,moving,walk,camera,true))return;const im=images.get(INVESTIGATOR_ATLAS.src),pose=investigatorAtlasPose(facing,moving,walk);if(im)c.drawImage(im,pose.sx,pose.sy,INVESTIGATOR_ATLAS.width,INVESTIGATOR_ATLAS.height,Math.round(x)+pose.dx,Math.round(y)+pose.dy-camera,INVESTIGATOR_ATLAS.width,INVESTIGATOR_ATLAS.height)}
/** Repaint only the lower 42 native pixels of the local grass patch in front of an actor.
 * @param {CanvasRenderingContext2D} c @param {number} x @param {number} y @param {number} camera */
function drawGrassForeground(c,x,y,camera){
 const p=grassAt(x,y);if(!p)return;c.save();c.beginPath();c.rect(0,Math.round(y)-14-camera,1536,Math.max(0,p.y+p.h-Math.round(y)+14));c.clip();drawGrassPatch(c,p,grassFrame(p),camera);c.restore()}

/** Restore only the legacy npc_left extraction footprint from the clean grass column 94px east.
 * The source is the same cached terrain and existing grass frames; no sprite pixels or new art.
 * @param {CanvasRenderingContext2D} c @param {number} camera @param {number|null} [foregroundTop] */
function drawNPCLeftTerrainRepair(c,camera,foregroundTop=null){
 const x=99,y=244,w=94,h=119,top=Math.max(y,foregroundTop??y);if(top>=y+h)return;
 c.save();c.beginPath();c.rect(x,top-camera,w,y+h-top);c.clip();
 if(foregroundTop===null&&terrainCache)c.drawImage(terrainCache,x+94,y,w,h,x,y-camera,w,h);
 for(const [targetId,sourceId] of [['5','6'],['6','7'],['9','10'],['10','11']]){const target=GRASS_PATCHES.find(p=>p.id===targetId),source=GRASS_PATCHES.find(p=>p.id===sourceId);if(target&&source)sprite(c,`field.grass.${source.id}_${grassFrame(target)}`,source.x-94,source.y-camera)}
 c.restore();
}

/** QA actor: reuses existing four-direction atlas, never substitutes real NPC art.
 * @param {CanvasRenderingContext2D} c @param {number} x @param {number} y @param {Direction} facing @param {boolean} moving @param {number} walk @param {number} camera */
function drawActor(c,x,y,facing,moving,walk,camera){const im=images.get('field.player.player-atlas'),row=['down','left','right','up'].indexOf(facing),frame=moving?[1,3,2,3][Math.floor(walk/26)%4]:0;if(im)c.drawImage(im,frame*96,row*120,96,120,Math.round(x)-49,Math.round(y)-120-camera,96,120)}

/** Final 12-frame contract; the approved legacy rendering stays intact until replacement exists. */
export function drawHumanAsset(c,id,x,y,facing,moving,walk,camera=0,finalOnly=false){
 const art=peekAsset(id.startsWith('human.')?id:`human.${id}.field`);if(!art||(finalOnly&&art.status==='legacy')||(finalOnly&&art.status==='placeholder'&&!assetsUsePlaceholders()&&['fisherman','researcher'].includes(id)))return false;
 if(drawW03Human(c,art,{x,y,facing,moving,walk},camera))return true;
 const pose=humanPose(facing,moving,walk,{legacy:art.status==='legacy'});
 c.drawImage(art.image,...pose.source,Math.round(x)-pose.anchor[0],Math.round(y)-pose.anchor[1]-camera,96,120);return true;
}
function drawContractTerrain(c,scene,camera){
 const art=peekAsset('tileset.field.v1');for(let y=0;y<1024;y+=48)for(let x=0;x<1536;x+=48){const tile=behaviorTileId(behaviorAt(scene,x+24,y+24).id);const animationId=TILE_DEFAULT_ANIMATIONS[tile];if(animationId){const options={...TILE_ANIMATION_OPTIONS,weather:geojeEnvironment.getState().weather},frame=resolveTileAnimation(animationId,fieldAnimation.time,options);loadAsset(frame.assetId);drawAnimatedTile(c,animationId,fieldAnimation.time,x,y-camera,48,{...options,art:peekAsset(frame.assetId),baseArt:art?.status==='final'?{...art,source:tileSource(tile)}:null})}else if(art?.status==='final')c.drawImage(art.image,...tileSource(tile),x,y-camera,48,48);else drawTilePlaceholder(c,tile,x,y-camera,48)}
}

function useContractTerrain(){return assetsUsePlaceholders()||peekAsset('tileset.field.v1')?.status==='final'||['field.ground-atlas','field.decoration-atlas'].some(id=>peekAsset(id)?.status==='placeholder');}
