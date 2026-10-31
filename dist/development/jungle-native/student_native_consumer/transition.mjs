import {APPROACH_REGIONS,insideApproach} from './approach-regions.mjs';
// NEW explicit local scene registration candidate, not a recovered historical warp.
export function localWarp(s,{pressed=false,released=false,pinsVerified=false}={}){
 if(released)return{...s,warpLock:false};
 if(!pressed||s.warpLock||!pinsVerified||!['OPEN','CLOSED'].includes(s.interiorState))return s;
 if(s.scene==='jungle-exterior-r7'&&insideApproach(APPROACH_REGIONS.exterior,s.foot)&&s.facing==='up')return{...s,scene:'jungle-interior-r2',foot:[125,568],facing:'right',warpLock:true};
 if(s.scene==='jungle-interior-r2'&&insideApproach(APPROACH_REGIONS[s.interiorState],s.foot)&&s.facing==='left')return{...s,scene:'jungle-exterior-r7',foot:[768,439],facing:'down',warpLock:true};
 return s;
}
