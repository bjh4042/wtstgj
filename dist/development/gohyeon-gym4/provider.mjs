import{createGym4Renderer}from'./render.mjs';
import{gym4VisualState}from'./visual-state.mjs';
const D=Object.freeze({up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]});
// Internal provider foundation only. No authority, save codec, warp or original action dispatch.
export function createGym4Provider({inputs,canvasFactory}){
 const renderer=createGym4Renderer({inputs,canvasFactory});let disposed=false;
 const safe=(state,foot)=>!disposed&&['04','05'].includes(state)&&Array.isArray(foot)&&foot.length===2&&foot.every(Number.isInteger)&&foot[0]>=0&&foot[0]<1448&&foot[1]>=0&&foot[1]<1086&&inputs['safe'+state][foot[1]*1448+foot[0]]===1;
 const describe=(runtime,contract,foot,facing)=>{const state=gym4VisualState(runtime,contract);if(!safe(state,foot)||!Object.hasOwn(D,facing))throw Error('GYM4_SAME_FOOT_SUPPORT_HOLD');return Object.freeze({mapId:'world:gym:4',state,foot:Object.freeze([...foot]),facing})};
 return Object.freeze({safe,describe,
 createWalker(initial){if(!safe(initial.state,initial.foot)||!Object.hasOwn(D,initial.facing))throw Error('GYM4_WALKER_INITIAL');let state=initial.state,foot=[...initial.foot],facing=initial.facing,walking=false,locked=false,debt=0,dead=false;return Object.freeze({read(){return Object.freeze({state,foot:Object.freeze([...foot]),facing,walking})},setLocked(value){locked=value===true;if(locked){debt=0;walking=false}},stop(){debt=0;walking=false},adopt(next){if(dead||!Object.hasOwn(D,next.facing)||!safe(next.state,next.foot)||next.foot[0]!==foot[0]||next.foot[1]!==foot[1])throw Error('GYM4_SAME_FOOT_STATE_HOLD');state=next.state;facing=next.facing;debt=0;walking=false},frame(dt,dir,onSuccessfulPixel){walking=false;if(dead||disposed||locked){debt=0;return 0}if(!Number.isFinite(dt)||dt<0)throw Error('GYM4_FRAME_DT');if(!dir){debt=0;return 0}if(!Object.hasOwn(D,dir))throw Error('GYM4_DIRECTION');facing=dir;debt+=Math.min(dt,100)*.12;let moved=0;while(debt>=1){const before=[...foot],next=[foot[0]+D[dir][0],foot[1]+D[dir][1]];if(!safe(state,next)){debt=0;break}foot=next;debt-=1;moved++;walking=true;if(onSuccessfulPixel?.(Object.freeze({from:Object.freeze(before),to:Object.freeze([...next]),distance:1}))===false){debt=0;break}}return moved},dispose(){dead=true;debt=0;walking=false}})},
 draw(ctx,pose,clock){if(disposed)return false;return renderer.draw(ctx,pose,clock)},dispose(){if(disposed)return;disposed=true;renderer.dispose()}})
}
