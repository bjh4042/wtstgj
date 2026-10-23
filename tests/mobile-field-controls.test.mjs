import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFieldControls} from '../dist/field-controls.mjs';
class Node extends EventTarget{
 constructor(tag='DIV',dir){super();this.tagName=tag;this.dataset=dir?{dir}:{};this.editable=['INPUT','SELECT','TEXTAREA'].includes(tag)}
 closest(selector){if(selector.startsWith('input'))return this.editable?this:null;return this.tagName==='BUTTON'&&!this.dataset.dir?this:null}
 setPointerCapture(id){this.captured=id}
 getBoundingClientRect(){return {left:0,right:44,top:0,bottom:44}}
}
function fixture(){
 const doc=new Node(),win=new Node(),root=new Node(),up=new Node('BUTTON','up'),right=new Node('BUTTON','right'),commands=[],steps=[];let enabled=true;
 doc.activeElement=root;
 const control=bindFieldControls({root,buttons:[up,right],document:doc,window:win,canMove:()=>enabled,onPress:d=>steps.push(d),onCommand:c=>commands.push(c)});
 const send=(target,type,values={})=>{const e=new Event(type,{cancelable:true});const {target:origin,...props}=values;if(origin)Object.defineProperty(e,'target',{value:origin});Object.assign(e,{button:0,pointerId:1,clientX:20,clientY:20,key:'',code:'',...props});target.dispatchEvent(e);return e};
 return {doc,win,root,up,right,control,commands,steps,send,lock(){enabled=false},unlock(){enabled=true}};
}
test('pointer ownership, outside release, cancel and lost capture cannot leave stuck movement',()=>{
 const f=fixture(),{send,up,right,control}=f;
 send(up,'pointerdown',{pointerId:1});send(right,'pointerdown',{pointerId:2});assert.equal(control.direction,'right');
 send(up,'pointerup',{pointerId:1});assert.equal(control.direction,'right');
 send(right,'pointermove',{pointerId:2,clientX:80});assert.equal(control.direction,null);
 for(const type of ['pointerup','pointercancel','lostpointercapture']){send(up,'pointerdown');send(up,type);assert.equal(control.direction,null)}
 assert.ok(f.steps.every(d=>['up','right'].includes(d)));control.dispose();
});
test('menu/lock/focus/app switch/rotation discard held inputs instead of resuming later',()=>{
 const f=fixture(),{send,up,control,doc,win}=f;
 for(const [node,type] of [[win,'blur'],[win,'orientationchange'],[win,'resize'],[win,'pagehide'],[doc,'visibilitychange']]){send(up,'pointerdown');send(node,type);assert.equal(control.direction,null)}
 send(up,'pointerdown');f.lock();assert.equal(control.direction,null);f.unlock();assert.equal(control.direction,null);
 send(up,'pointerdown');const input=new Node('INPUT');send(doc,'focusin',{target:input});assert.equal(control.direction,null);
 doc.activeElement=input;send(up,'pointerdown');assert.equal(control.direction,null);
 doc.activeElement=f.root;send(up,'pointerdown');send(f.root,'pointerdown',{target:new Node('BUTTON')});assert.equal(control.direction,null);
 control.dispose();
});
test('PC cardinal input shares ownership with pointers; confirmation/cancel/menu do not repeat',()=>{
 const {send,doc,up,control,commands}=fixture();
 send(doc,'keydown',{key:'ArrowUp',code:'ArrowUp'});send(up,'pointerdown',{pointerId:7});
 send(doc,'keyup',{key:'ArrowUp',code:'ArrowUp'});assert.equal(control.direction,'up');send(up,'pointerup',{pointerId:7});assert.equal(control.direction,null);
 for(const key of ['z','x','m']){send(doc,'keydown',{key,code:'Key'+key.toUpperCase()});send(doc,'keydown',{key,repeat:true})}
 assert.deepEqual(commands,['action','cancel','menu']);
 send(doc,'keydown',{key:'Enter',target:new Node('BUTTON')});assert.equal(commands.length,3);
 assert.equal(send(doc,'keydown',{key:'Enter',repeat:true,target:new Node('BUTTON')}).defaultPrevented,true);
 send(doc,'keydown',{key:'ArrowRight',code:'ArrowRight',target:new Node('INPUT')});assert.equal(control.direction,null);
 control.dispose();send(up,'pointerdown');assert.equal(control.direction,null);
});
