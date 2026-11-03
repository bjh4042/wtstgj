import {describeVisiblePlayer} from './resources/map_simulation_20261102/user_feedback_r1/viewport.mjs';
import {GIRL} from './resources/recovery_runtime_20261102/s5_resume/dist/development/hakdong-forest-native/player-data.mjs';
import {selectPlayerFrame} from './resources/recovery_runtime_20261102/s5_resume/dist/development/gohyeon-pair/player-frame.mjs';
/** Presentation-only clamping; never changes the physical/canonical foot. */
export function describeSelectedPlayer({appearance,foot,camera,facing,now=0}){
 if(appearance==='boy')return describeVisiblePlayer({foot,camera,facing,now});
 if(appearance!=='girl'||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isInteger)||!Array.isArray(camera)||camera.length!==4||!camera.every(Number.isInteger)||camera[2]!==1280||camera[3]!==720)throw Error('NATIVE_PLAYER_VISIBILITY');
 const frame=selectPlayerFrame({facing,walking:false,elapsedMs:now}),key='PLAYER_FEMALE.'+['FRONT','RIGHT','LEFT','BACK'][Math.floor(frame/3)]+'.IDLE',row=GIRL.frames[key],scale=80/192;
 const x=foot[0]-camera[0]-row.anchor[0]*scale,y=foot[1]-camera[1]-row.anchor[1]*scale,raw=[x,y,x+row.width*scale,y+row.height*scale],dx=raw[0]<0?Math.ceil(-raw[0]):raw[2]>1280?Math.floor(1280-raw[2]):0,dy=raw[1]<0?Math.ceil(-raw[1]):raw[3]>720?Math.floor(720-raw[3]):0,bounds=Object.freeze([raw[0]+dx,raw[1]+dy,raw[2]+dx,raw[3]+dy]);
 return Object.freeze({frame,key,frameSHA256:row.derivativeSha256,atlasSHA256:GIRL.atlas.sha256,physicalFoot:Object.freeze([...foot]),unclampedBounds:Object.freeze(raw),bounds,visualOffset:Object.freeze([dx,dy]),visibleInside:bounds[0]>=0&&bounds[1]>=0&&bounds[2]<=1280&&bounds[3]<=720,wholeCellInside:raw[0]>=0&&raw[1]>=0&&raw[2]<=1280&&raw[3]<=720});
}
