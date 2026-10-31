/** Candidate presentation only. No world, story, starter, rewards, grants or RAF. */
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o)};
export const LAB=freeze({sceneId:'native:prologue:lab-r3',mapId:'world:hub:PROLOGUE',width:960,height:640,entry:[480,570],doctor:[470,265],consult:[470,345],facing:'down',imageSHA:'18bfa1a6a136392d8c5e492f228eace9b8c6632d69050d1bd0ce9e978845ce2b'});
const dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},dist=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
export function createLabProvider({safe,assets={},foot=LAB.entry,facing='up',onSuccessfulPixel=()=>{},released:initialReleased=false,left:initialLeft=false}={}){
 if(!(safe instanceof Uint8Array)||safe.length!==960*640)throw Error('LAB_MASK_REQUIRED');const mask=new Uint8Array(safe);let p=[...foot],f=facing,moving=false,focused=true,reader=false,pending=false,disposed=false,carry=0,released=initialReleased,left=initialLeft;
 const publicSafe=q=>Array.isArray(q)&&q.length===2&&q.every(Number.isInteger)&&q[0]>=0&&q[0]<960&&q[1]>=0&&q[1]<640&&mask[q[1]*960+q[0]]===1;
 // Occupied actor ground is separate from unchanged original architectural mask.
 const npcClear=q=>Math.abs(q[0]-470)>48||Math.abs(q[1]-265)>36;
 const support=q=>publicSafe(q)&&npcClear(q),returnRegion=q=>publicSafe(q)&&dist(q,LAB.entry)<=24;
 if(!support(p)||!dirs[f])throw Error('LAB_POSE_UNSUPPORTED');
 const snapshot=()=>Object.freeze({sceneId:LAB.sceneId,mapId:LAB.mapId,foot:Object.freeze([...p]),facing:f,moving,focused,reader,pending,released,left,disposed});
 const stop=()=>{moving=false;carry=0};
 return Object.freeze({snapshot,support,returnRegion,canConsult(){return !disposed&&focused&&!moving&&!reader&&!pending&&f==='up'&&publicSafe(p)&&dist(p,LAB.consult)<=24&&Math.abs(p[0]-470)<=24&&p[1]>265},canReturn(){return !disposed&&focused&&!moving&&!reader&&!pending&&released&&left&&f==='down'&&returnRegion(p)},releaseAction(){released=true;stop()},setFocused(v){focused=v===true;stop()},setReader(v){reader=v===true;stop()},setPending(v){pending=v===true;stop()},stop,
 frame(dt,dir){if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw Error('LAB_DELTA_REQUIRED');if(!focused||reader||pending||!dirs[dir]){stop();return}f=dir;carry+=Math.min(dt,50)*.12;const steps=Math.floor(carry);carry-=steps;moving=false;for(let i=0;i<steps;i++){const q=[p[0]+dirs[dir][0],p[1]+dirs[dir][1]];if(!support(q)){stop();break}const from=[...p];p=q;moving=true;if(!returnRegion(p))left=true;if(onSuccessfulPixel(snapshot(),{from,to:[...p],distance:1})===false){carry=0;break}if(pending)break}},
 draw(ctx,{elapsedMs=0,playerFrame=9}={}){if(disposed)return;const cy=Math.max(0,Math.min(100,p[1]-270));ctx.save();try{ctx.clearRect(0,0,960,540);ctx.translate(0,-cy);ctx.drawImage(assets.room,0,0);const s=5/12;ctx.drawImage(assets.yoon,0,0,256,256,470-128*s,265-216*s,256*s,256*s);const actor=assets.playerFrames?.['actor:'+playerFrame];if(actor){if(actor.width!==107||actor.height!==107)throw Error('LAB_PLAYER107_REQUIRED');ctx.drawImage(actor,p[0]-53,p[1]-90)}/* Original furniture pixel-depth copies only, never invented alpha polygons. */for(const o of [[286,140,656,215],[55,370,294,467],[625,370,902,469]])if(p[1]<o[3]){const[x,y,X,Y]=o;ctx.drawImage(assets.room,x,y,X-x,Y-y,x,y,X-x,Y-y)}}finally{ctx.restore()}},dispose(){disposed=true;stop()}})
}
