import {isShopCounterFoot} from './counter-predicate.mjs';
// NEW R3 logical geometry / pure presentation candidate. No canonical authority, saves or purchases.
const dirs=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
export function createShopR3Walker(registry,safe,{foot=registry.entry,facing='up'}={}){
 if(!(safe instanceof Uint8Array)||safe.length!==960*720||safe.some(x=>x!==0&&x!==1))throw Error('R3_MASK_SHAPE');const mask=safe.slice(),support=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isSafeInteger)&&p[0]>=0&&p[0]<960&&p[1]>=0&&p[1]<720&&mask[p[1]*960+p[0]]===1;if(!support(foot)||!Object.hasOwn(dirs,facing))throw Error('R3_UNSUPPORTED_NO_SNAP');let pos=[...foot],face=facing,locked=false,disposed=false;
 return Object.freeze({snapshot:()=>({sceneId:registry.sceneId,revision:registry.revision,foot:[...pos],facing:face}),support,step(d){if(disposed||locked)return false;if(!Object.hasOwn(dirs,d))throw Error('R3_CARDINAL');face=d;const q=[pos[0]+dirs[d][0],pos[1]+dirs[d][1]];if(!support(q))return false;pos=q;return true},setLocked:v=>{locked=v===true},inspect(){if(disposed||locked)return null;return face==='up'&&isShopCounterFoot(pos)?Object.freeze({type:'SHOP_COUNTER_INTENT_ONLY',sceneId:registry.sceneId}):null},dispose(){disposed=true;locked=true;mask.fill(0)}})
}
const foreground=[
 {id:'front_counter',depth:305,poly:[[274,227],[676,227],[676,305],[274,305]]},
 {id:'counter_west',depth:305,poly:[[283,168],[305,168],[313,207],[336,211],[336,251],[313,251],[313,305],[274,305],[274,260]]},
 {id:'counter_east',depth:305,poly:[[651,168],[670,168],[676,260],[676,305],[651,305]]},
 {id:'shelf_west',depth:475,poly:[[273,375],[286,375],[286,366],[327,366],[327,374],[367,374],[371,369],[391,369],[401,378],[411,382],[411,475],[273,475]]},
 {id:'shelf_east',depth:475,poly:[[547,375],[584,370],[628,372],[641,366],[661,368],[674,378],[686,381],[686,475],[547,475]]}
];
export const R3_FOREGROUND_REGISTRATION=foreground;
export function createShopR3Renderer({image,cashier,canvasFactory}){
 if(image.width!==1448||image.height!==1086)throw Error('R3_ART_SIZE');const logical=canvasFactory(960,720),g=logical.getContext('2d');let disposed=false;
 const clip=(ctx,item)=>{ctx.save();ctx.beginPath();item.poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(image,0,0,1448,1086,0,0,960,720);ctx.restore()};
 const drawActor=(ctx,img,foot)=>{ctx.drawImage(img,0,0,img.width,img.height,foot[0]-53,foot[1]-90,107,107)};
 return Object.freeze({draw(ctx,{player,foot,facing='up',drawGuides=false}){if(disposed)throw Error('R3_RENDERER_DISPOSED');if(!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger))throw Error('R3_POSE');g.save();try{g.clearRect(0,0,960,720);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(image,0,0,1448,1086,0,0,960,720);drawActor(g,cashier,[480,240]);for(const f of foreground)if(240<f.depth)clip(g,f);drawActor(g,player,foot);for(const f of foreground)if(foot[1]<f.depth)clip(g,f);if(drawGuides){g.strokeStyle='#ff00ff';g.strokeRect(foot[0]-24,foot[1]-18,49,37)}}finally{g.restore()}if(ctx.canvas.width!==960||ctx.canvas.height!==540)throw Error('R3_NATIVE_VIEWPORT');const camera=[0,Math.max(0,Math.min(180,foot[1]-270))];ctx.save();try{ctx.clearRect(0,0,960,540);ctx.imageSmoothingEnabled=false;ctx.drawImage(logical,camera[0],camera[1],960,540,0,0,960,540)}finally{ctx.restore()}return{logicalSize:[960,720],sourceSize:[1448,1086],sourceScale:120/181,actorLogicalSize:107,viewportScale:1,camera,facing}},dispose(){if(disposed)return;disposed=true;logical.width=0;logical.height=0}})
}
