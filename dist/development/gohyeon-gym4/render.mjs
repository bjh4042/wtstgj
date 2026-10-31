import{createGym4DoorLayerRenderer}from'./door-layers.mjs';
import{selectPlayerFrame}from'../gohyeon-pair/player-frame.mjs';
// Original interior pixels: no invented outdoor ambient/lights. One host clock for gait.
export function createGym4Renderer({inputs,canvasFactory}){
 if(typeof canvasFactory!=='function')throw Error('GYM4_CANVAS_FACTORY_REQUIRED');
 const owned=[],layers={};let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;for(const l of Object.values(layers))l.dispose();for(const c of owned){c.width=1;c.height=1}};
 const crop=im=>{const c=canvasFactory(im.width,im.height);owned.push(c);const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,im.width,im.height).data;let l=im.width,t=im.height,r=-1,b=-1;for(let y=0;y<im.height;y++)for(let xx=0;xx<im.width;xx++)if(d[(y*im.width+xx)*4+3]){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,y);b=Math.max(b,y)}if(r<l)throw Error('GYM4_EMPTY_ACTOR');return[l,t,r-l+1,b-t+1]};
 try{const bounds={sub01:crop(inputs.sub01),sub02:crop(inputs.sub02)};for(const s of ['04','05'])layers[s]=createGym4DoorLayerRenderer({image:inputs['image'+s],parts:inputs.doorLayers.parts,state:s,canvasFactory});
 const common=(ctx,im,foot,frame=0)=>{const scale=80/192;ctx.drawImage(im,(frame%3)*256,Math.floor(frame/3)*256,256,256,foot[0]-128*scale,foot[1]-216*scale,256*scale,256*scale)};
 const generic=(ctx,k,foot)=>{const b=bounds[k],width=b[2]*80/b[3];ctx.drawImage(inputs[k],...b,foot[0]-width/2,foot[1]-80,width,80)};
 return Object.freeze({draw(ctx,{state,foot,facing,walking=false},clock){if(disposed)return false;if(!Object.hasOwn(layers,state)||!Number.isFinite(clock?.elapsedMs))throw Error('GYM4_RENDER_STATE');const frame=selectPlayerFrame({facing,walking,elapsedMs:clock.elapsedMs}),camera=[Math.max(0,Math.min(488,Math.round(foot[0]-480))),Math.max(0,Math.min(546,Math.round(foot[1]-270)))];if(ctx.canvas.width!==960)ctx.canvas.width=960;if(ctx.canvas.height!==540)ctx.canvas.height=540;ctx.save();try{ctx.translate(-camera[0],-camera[1]);ctx.drawImage(inputs['image'+state],0,0);layers[state].draw(ctx,[{foot:[238,859],draw:c=>generic(c,'sub01',[238,859])},{foot:[635,840],draw:c=>generic(c,'sub02',[635,840])},{foot:[1188,335],draw:c=>common(c,inputs.leader,[1188,335])},{foot,draw:c=>common(c,inputs.player,foot,frame)}])}finally{ctx.restore()}return{camera,frame,ambientApplications:0,sourcePixelsUnchanged:true}},dispose});
 }catch(error){dispose();throw error}
}
