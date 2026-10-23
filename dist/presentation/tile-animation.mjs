import {TILE_IDS,drawTilePlaceholder} from '../tileset-contract.mjs';
import {resolveWeather} from './weather-layer.mjs';
/** @type {Array<[string,number,number]>} */
const definitions=[['SEA',TILE_IDS.WATER,320],['SHALLOW_WATER',TILE_IDS.WATER_EDGE,360],['FOAM',TILE_IDS.SHORE,240],['COAST_WAVE',TILE_IDS.SHORE,300],['WATERFALL',TILE_IDS.WATER,150],['FLOWING_WATER',TILE_IDS.WATER,220],['TALL_GRASS',TILE_IDS.TALL_GRASS,700]];
export const TILE_ANIMATIONS=Object.freeze(Object.fromEntries(definitions.map(([family,tileId,frameDuration])=>[family+'_ANIM_01',Object.freeze({id:family+'_ANIM_01',family,tileId,frames:Object.freeze([0,1,2].map(n=>'tile.animation.'+family+'.'+n)),frameDuration,loop:true,weatherMultiplier:family!=='TALL_GRASS'})])));
export const TILE_ANIMATION_BINDINGS=Object.freeze({SEA_BASE:'SEA_ANIM_01',SHALLOW_WATER:'SHALLOW_WATER_ANIM_01',FOAM:'FOAM_ANIM_01',COAST_WAVE:'COAST_WAVE_ANIM_01',WATERFALL:'WATERFALL_ANIM_01',FLOWING_WATER:'FLOWING_WATER_ANIM_01',TALL_GRASS:'TALL_GRASS_ANIM_01'});
export const TILE_DEFAULT_ANIMATIONS=Object.freeze({[TILE_IDS.WATER]:'SEA_ANIM_01',[TILE_IDS.SHORE]:'FOAM_ANIM_01',[TILE_IDS.WATER_EDGE]:'SHALLOW_WATER_ANIM_01'});
export const TILE_ANIMATION_OPTIONS={enabled:true,speed:1};
export function resolveTileAnimation(id,timeMs,{weather='CLEAR',enabled=true,speed=1,definition=TILE_ANIMATIONS[id]}={}){
 const d=definition;if(!d||!Array.isArray(d.frames)||!d.frames.length||!Number.isFinite(d.frameDuration)||d.frameDuration<=0)return {id,index:0,assetId:null,fallback:true,intensity:1};
 const w=resolveWeather(weather),multiplier=d.weatherMultiplier?w.waterSpeed:1,elapsed=Math.max(0,Number.isFinite(timeMs)?timeMs:0),rate=Number.isFinite(speed)?Math.max(0,Math.min(4,speed)):1,count=enabled?Math.floor(elapsed*rate*multiplier/d.frameDuration):0,index=d.loop?count%d.frames.length:Math.min(count,d.frames.length-1);
 return {id,tileId:d.tileId,index,assetId:d.frames[index],fallback:false,intensity:d.weatherMultiplier?w.waterIntensity:1};
}
export function drawAnimatedTile(c,id,timeMs,x,y,size=32,{art=null,baseArt=null,enabled=true,weather='CLEAR',speed=1,grid=true}={}){
 const options={enabled,weather,speed},frame=resolveTileAnimation(id,timeMs,options),tileId=frame.tileId??TILE_IDS.GROUND;
 if(art&&art.status!=='placeholder'){c.drawImage(art.image,...art.source,x,y,size,size);return frame}
 if(baseArt&&baseArt.status==='final'){c.drawImage(baseArt.image,...baseArt.source,x,y,size,size);return {...frame,fallback:true}}
 drawTilePlaceholder(c,tileId,x,y,size,{grid});
 if(!frame.fallback&&options.enabled!==false){c.save();c.globalAlpha=.15*frame.intensity;c.fillStyle='#d3eff4';c.fillRect(x+2,y+4+frame.index*5,size-4,2);c.restore()}return frame;
}
