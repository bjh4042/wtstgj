// Layer movement uses original masks and only two registered adjacent-layer bands.
const deepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){for(const v of Object.values(o))deepFreeze(v);Object.freeze(o)}return o};
export const BANDS=deepFreeze([{id:'lower',rect:[1079,437,1112,475],layers:['ground','stairs'],top:437,bottom:474},{id:'upper',rect:[1079,228,1112,259],layers:['stairs','upper'],top:228,bottom:258}]);
export class LayerWalker{
 constructor({foot=[125,568],layer='ground',supports}){this.foot=[...foot];this.layer=layer;this.transit=null;this.supports=supports;this.facing='right';this.epoch=0}
 move(dx,dy){if(!Number.isInteger(dx)||!Number.isInteger(dy)||(dx&&dy)||Math.abs(dx||dy)>240)return 0;if(dx)this.facing=dx<0?'left':'right';if(dy)this.facing=dy<0?'up':'down';let n=0;for(;n<Math.abs(dx||dy);n++){const q=[this.foot[0]+Math.sign(dx),this.foot[1]+Math.sign(dy)];if(!this.step(q,Math.sign(dy)))break}return n}
 step(q,dy){if(!Array.isArray(q)||q.length!==2||!q.every(Number.isInteger)||!Number.isInteger(dy)||Math.abs(q[0]-this.foot[0])+Math.abs(q[1]-this.foot[1])!==1||dy!==q[1]-this.foot[1])return false;const inside=(b,p)=>p[0]>=b.rect[0]&&p[0]<b.rect[2]&&p[1]>=b.rect[1]&&p[1]<b.rect[3];let b=this.transit;
 if(b){if(!dy||!inside(b,q)||!this.supports(b.layers,q))return false;this.foot=[...q];if(q[1]===b.top){this.layer=b.layers[1];this.transit=null}else if(q[1]===b.bottom){this.layer=b.layers[0];this.transit=null}return true}
 b=BANDS.find(b=>dy&&inside(b,q)&&b.layers.includes(this.layer)&&((dy<0&&this.layer===b.layers[0]&&this.foot[1]>=b.bottom)||(dy>0&&this.layer===b.layers[1]&&this.foot[1]<=b.top)));
 if(b&&this.supports(b.layers,q)){this.transit=b;this.foot=[...q];return true}
 if(!this.supports([this.layer],q))return false;this.foot=[...q];return true
 }
}
