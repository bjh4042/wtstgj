// NEW design policy, not recovered original collision. Width: four idle shoe poses.
// Depth 8 is an explicit ground-plane design assumption; stride tips may overhang.
export const GROUND_CONTACT=Object.freeze({id:'NEW_COMMON_FOOT_IDLE30_DEPTH8',width:30,height:8,offsetHalfOpen:Object.freeze([-15,-4,15,4])});
export function contactSafe(raw,width,height,x,y){
 if(!(raw instanceof Uint8Array)||raw.length!==width*height||!Number.isInteger(x)||!Number.isInteger(y))return false;
 const [a,b,c,d]=GROUND_CONTACT.offsetHalfOpen;
 if(x+a<0||y+b<0||x+c>width||y+d>height)return false;
 for(let yy=y+b;yy<y+d;yy++)for(let xx=x+a;xx<x+c;xx++)if(raw[yy*width+xx]!==1)return false;
 return true;
}
export function contactIntersects(x,y,[l,t,r,b]){
 const [a,c,d,e]=GROUND_CONTACT.offsetHalfOpen;
 return x+a<r&&x+d>l&&y+c<b&&y+e>t;
}
