import {createDirectionInput,pressDirection,releaseDirection,clearDirections,activeDirection} from './movement.mjs';

const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};
const editable=target=>!!target?.closest?.('input,select,textarea,[contenteditable]:not([contenteditable="false"])');
// DOM bindings only. Movement cadence, collision and commands stay with the field.
export function bindFieldControls({root,buttons,document,window,canMove,onPress,onCommand}){
 const input=createDirectionInput(),listeners=[];
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options))};
 const reset=()=>clearDirections(input);
 const ready=()=>{if(!canMove()||editable(document.activeElement)){reset();return false}return true};
 for(const button of buttons){
  listen(button,'pointerdown',event=>{
   if(event.button!==0||!ready())return;
   event.preventDefault();button.setPointerCapture(event.pointerId);
   pressDirection(input,'pointer:'+event.pointerId,button.dataset.dir);onPress(activeDirection(input));
  });
  const release=event=>releaseDirection(input,'pointer:'+event.pointerId);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,release);
  listen(button,'pointermove',event=>{
   const r=button.getBoundingClientRect();
   if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)release(event);
  });
 }
 // Native click is the sole action-button activation: no touchend/click pair.
 listen(root,'pointerdown',event=>{if(event.target.closest?.('button:not([data-dir]),summary'))reset()},true);
 listen(document,'keydown',event=>{
  if(editable(event.target)||event.isComposing){reset();return}
  const key=event.key,dir=dirs[key]??dirs[key.toLowerCase()];
  if(dir){event.preventDefault();if(!event.repeat&&ready()){pressDirection(input,'keyboard:'+event.code,dir);onPress(activeDirection(input))}return}
  if(event.target.tagName==='BUTTON'&&['Enter',' '].includes(key)){if(event.repeat)event.preventDefault();return}
  const command=['z','Z','Enter'].includes(key)?'action':['x','X','Escape'].includes(key)?'cancel':['m','M'].includes(key)?'menu':null;
  if(command){event.preventDefault();reset();if(!event.repeat)onCommand(command)}
 });
 listen(document,'keyup',event=>releaseDirection(input,'keyboard:'+event.code));
 listen(document,'focusin',event=>{if(editable(event.target))reset()});
 listen(document,'visibilitychange',reset);
 for(const type of ['blur','orientationchange','pagehide','resize'])listen(window,type,reset);
 return {reset,get direction(){return ready()?activeDirection(input):null},dispose(){reset();listeners.splice(0).forEach(remove=>remove())}};
}
