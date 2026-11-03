// Portable compatibility backport of the existing selected palm+east-lamp contract.
// Public API name retained for existing walk/presentation consumers; no NPC feature.
// NEW user-selected presentation mask. Immutable S7 art is sampled before actors, never edited.
// Narrow target: eastern plaza palm only. No collision or game-authority API.
export const S7_PALM=Object.freeze({id:'S7_EAST_PLAZA_PALM',bounds:Object.freeze([3100,742,3301,970]),depth:969,
 crown:Object.freeze([[3169,750],[3181,742],[3186,754],[3194,746],[3196,758],[3206,748],[3206,762],[3218,754],[3214,768],[3231,762],[3223,777],[3245,778],[3237,789],[3260,791],[3253,802],[3276,805],[3264,816],[3290,820],[3277,830],[3300,840],[3280,850],[3291,864],[3274,862],[3283,880],[3262,872],[3264,892],[3245,881],[3240,904],[3223,888],[3213,906],[3199,887],[3181,899],[3180,881],[3162,892],[3157,875],[3137,884],[3142,869],[3120,869],[3130,850],[3107,854],[3118,838],[3100,834],[3121,820],[3106,813],[3124,804],[3114,795],[3130,792],[3118,781],[3138,780],[3128,770],[3147,773],[3143,761],[3158,768],[3156,753],[3171,763]].map(Object.freeze)),
 trunk:Object.freeze([[3185,881],[3211,882],[3218,928],[3214,960],[3205,970],[3188,966],[3181,955],[3185,934],[3179,916]].map(Object.freeze))});
function inside(x,y,poly){let b=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],c=poly[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b}return b}
// Crown color guard excludes beige paving between fronds inside the traced silhouette.
// Exact source RGB retained; only alpha coverage is newly selected. Not a generic vegetation classifier.
export function isS7PalmForegroundPixel(x,y,r,g,b){return inside(x+.5,y+.5,S7_PALM.trunk)||(inside(x+.5,y+.5,S7_PALM.crown)&&g>=r-4&&g>=b+12&&Math.max(r,g,b)-Math.min(r,g,b)>=22&&g>=30)}
function createS7PalmOnlyOcclusion({createCanvas}={}){
 const make=createCanvas??((w,h)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}));
 let dead=false,cache=null,patch=null;const clear=()=>{cache=null;if(patch){patch.width=patch.height=0;patch=null}};
 const valid=(ctx,map,c)=>!dead&&map==='S7'&&Array.isArray(c)&&c.length===4&&c.every(Number.isInteger)&&c[0]>=0&&c[1]>=0&&c[2]===ctx.canvas.width&&c[3]===ctx.canvas.height&&!ctx.isContextLost?.();
 function captureBackground(ctx,{map,camera}){clear();if(!valid(ctx,map,camera))return false;const [l,t,r,b]=S7_PALM.bounds,x=Math.max(l,camera[0]),y=Math.max(t,camera[1]),right=Math.min(r,camera[0]+camera[2]),bottom=Math.min(b,camera[1]+camera[3]);if(x>=right||y>=bottom)return false;
  try{const data=ctx.getImageData(x-camera[0],y-camera[1],right-x,bottom-y);for(let yy=0;yy<data.height;yy++)for(let xx=0;xx<data.width;xx++){const i=(yy*data.width+xx)*4;if(!isS7PalmForegroundPixel(x+xx,y+yy,data.data[i],data.data[i+1],data.data[i+2]))data.data[i+3]=0}patch=make(data.width,data.height);const g=patch.getContext('2d');if(!g)throw Error('PALM_CANVAS');g.putImageData(data,0,0);if(!valid(ctx,map,camera))throw Error('PALM_CAPTURE_LOST');cache={ctx,canvas:ctx.canvas,camera:[...camera],x,y};return true}catch(e){clear();throw e}}
 function drawForeground(ctx,{map,camera,foot}){const old=cache;cache=null;if(!old||!valid(ctx,map,camera)||ctx!==old.ctx||ctx.canvas!==old.canvas||JSON.stringify(camera)!==JSON.stringify(old.camera)||!Array.isArray(foot)||foot.length!==2||!foot.every(Number.isFinite))return false;if(foot[1]>=S7_PALM.depth)return false;ctx.save();try{ctx.imageSmoothingEnabled=false;ctx.drawImage(patch,old.x-camera[0],old.y-camera[1]);if(ctx.isContextLost?.())throw Error('PALM_DRAW_LOST')}finally{ctx.restore()}return true}
 return Object.freeze({captureBackground,drawForeground,reset:clear,dispose(){if(dead)return;dead=true;clear()}})
}

export function insidePolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
export function selectedPixel(mask,x,y){return mask.polygons.some(p=>insidePolygon(x+.5,y+.5,p))}

const canvas=(w,h)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
// A frame-local, single-consumption capture from background BEFORE actors. No PNG mutation,
// source re-decode, solidity API, source RGB conversion, whole-rectangle coverage or cached old frame.
export function createSourcePixelLayer({createCanvas=canvas}={}){
 let dead=false,frame=null;const patches=new Map();
 function reset(){frame=null;for(const p of patches.values())p.canvas.width=p.canvas.height=0;patches.clear()}
 function capture(ctx,{camera,masks}){reset();if(dead)throw Error('OCCLUSION_DISPOSED');if(!ctx||ctx.isContextLost?.()||!Array.isArray(camera)||camera.length!==4||!camera.every(Number.isInteger)||camera[2]!==ctx.canvas.width||camera[3]!==ctx.canvas.height)throw Error('OCCLUSION_INPUT');
  try{for(const mask of masks){const [l,t,r,b]=mask.bounds,x=Math.max(l,camera[0]),y=Math.max(t,camera[1]),right=Math.min(r,camera[0]+camera[2]),bottom=Math.min(b,camera[1]+camera[3]);if(x>=right||y>=bottom)continue;const data=ctx.getImageData(x-camera[0],y-camera[1],right-x,bottom-y);for(let yy=0;yy<data.height;yy++)for(let xx=0;xx<data.width;xx++)if(!selectedPixel(mask,x+xx,y+yy))data.data[(yy*data.width+xx)*4+3]=0;const c=createCanvas(data.width,data.height);patches.set(mask.id,{canvas:c,x,y});const g=c.getContext('2d');if(!g)throw Error('OCCLUSION_CONTEXT');g.putImageData(data,0,0)}frame={ctx,canvas:ctx.canvas,camera:[...camera]};return patches.size}catch(e){reset();throw e}}
 function draw(ctx,{camera,id}){if(dead||!frame||frame.ctx!==ctx||frame.canvas!==ctx.canvas||ctx.canvas.width!==frame.camera[2]||ctx.canvas.height!==frame.camera[3]||!Array.isArray(camera)||camera.length!==4||camera.some((v,i)=>v!==frame.camera[i])||ctx.isContextLost?.())throw Error('OCCLUSION_STALE_FRAME');const p=patches.get(id);if(!p)return false;patches.delete(id);try{ctx.drawImage(p.canvas,p.x-camera[0],p.y-camera[1]);return true}finally{p.canvas.width=p.canvas.height=0}}
 return Object.freeze({capture,draw,reset,dispose(){if(dead)return;dead=true;reset()}})
}

// Exact selected pixels from the immutable S7 base. Shadow and paving are NOT foreground.
export const EAST_LAMP=Object.freeze({id:'S7_SMALL_BUILDING_EAST_LAMP',map:'S7',groundY:1242,bounds:Object.freeze([3816,1078,3845,1242]),polygons:Object.freeze([Object.freeze([[3828,1080],[3832,1080],[3833,1088],[3843,1098],[3842,1102],[3840,1104],[3838,1121],[3834,1125],[3833,1130],[3833,1211],[3836,1225],[3841,1232],[3841,1237],[3836,1240],[3825,1240],[3819,1237],[3819,1232],[3824,1225],[3827,1211],[3827,1130],[3826,1125],[3822,1121],[3820,1104],[3818,1102],[3817,1098],[3827,1088]].map(Object.freeze))])});
export function createS7PalmOcclusion(options={}){
 const palm=createS7PalmOnlyOcclusion(options),lamp=createSourcePixelLayer(options);let captured=false;
 return Object.freeze({captureBackground(ctx,args){captured=false;lamp.reset();try{const original=palm.captureBackground(ctx,args);if(args.map==='S7'){lamp.capture(ctx,{camera:args.camera,masks:[EAST_LAMP]});captured=true}return original||captured}catch(e){captured=false;palm.reset();lamp.reset();throw e}},drawForeground(ctx,args){const ready=captured;captured=false;try{const original=palm.drawForeground(ctx,args);let changed=false;if(ready&&args.map==='S7'&&args.foot[1]<EAST_LAMP.groundY)changed=lamp.draw(ctx,{camera:args.camera,id:EAST_LAMP.id});return original||changed}finally{palm.reset();lamp.reset()}},reset(){captured=false;palm.reset();lamp.reset()},dispose(){captured=false;palm.dispose();lamp.dispose()}})
}
