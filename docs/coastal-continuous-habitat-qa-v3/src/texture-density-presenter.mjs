import contract from './asset-contract.mjs';
import {S} from './camera-core.mjs';
export function createTextureDensityPresenter({makeCanvas,renderer,width=960,height=540,guard=4}){
 if(![width,height,guard].every(Number.isFinite)||![width,height,guard].every(Number.isInteger)||width<=0||height<=0||guard<1)throw Error('Invalid presenter dimensions');
 const surface=makeCanvas(Math.ceil(width*S)+guard*2,Math.ceil(height*S)+guard*2),sc=surface.getContext('2d');
 return {surface,render(out,state,{presentationScale=1,dpr=1,mode=state.drawMode,actorVisible=state.actorVisible}={}){
  const {x,y}=state.camera;if(![x,y,presentationScale,dpr].every(Number.isFinite)||presentationScale<=0||dpr<=0)throw Error('Non-finite/invalid viewport');
  if(x<contract.cameraBounds.x[0]||x>contract.cameraBounds.x[1]||y<contract.cameraBounds.y[0]||y>contract.cameraBounds.y[1])throw Error('Outside restricted pilot camera coverage');
  const z=presentationScale*dpr,w=Math.round(width*z),h=Math.round(height*z);if(out.canvas.width!==w||out.canvas.height!==h)throw Error('Output canvas size must match presentation scale and DPR');
  const nx=Math.floor(x*S),ny=Math.floor(y*S),fx=x*S-nx,fy=y*S-ny;
  sc.resetTransform();sc.clearRect(0,0,surface.width,surface.height);sc.setTransform(1,0,0,1,guard-nx,guard-ny);sc.imageSmoothingEnabled=true;
  renderer.renderNative(sc,state,{mode,actorVisible,visibleNativeRect:[nx-guard,ny-guard,surface.width,surface.height]});sc.resetTransform();
  out.resetTransform();out.clearRect(0,0,w,h);out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high';out.setTransform(z,0,0,z,0,0);
  out.drawImage(surface,0,0,surface.width,surface.height,(-guard-fx)/S,(-guard-fy)/S,surface.width/S,surface.height/S);out.resetTransform();
  return {camera:[x,y],nativeSamplingOrigin:[nx,ny],fractionalNativeCamera:[fx,fy],sourceDensity:S,nativeIntermediate:[surface.width,surface.height],intermediateBytes:surface.width*surface.height*4,renderMode:mode,noCameraSnap:true};
 }};
}
