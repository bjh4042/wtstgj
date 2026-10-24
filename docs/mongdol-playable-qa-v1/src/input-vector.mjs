export const KEYMAP={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
const vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function inputVector(heldKeyCodes,pointerDirections){let x=0,y=0;for(const direction of [...Array.from(heldKeyCodes,code=>KEYMAP[code]),...pointerDirections]){const v=vectors[direction];if(v){x+=v[0];y+=v[1];}}return {x:Math.sign(x),y:Math.sign(y)};}
export function deferNativeActivation(code,isNativeControl){return isNativeControl&&(code==='Enter'||code==='Space');}
