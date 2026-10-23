// @ts-check
import {FIELD_FONT_PATH} from './art/field-bindings.mjs';
/** BDF bitmaps, never browser font rasterisation. Cache only requested glyphs. */
/** @typedef {{advance:number,box:number[],rows:string[]}} Glyph */
/** @typedef {{text:string,x:number,y:number,scale:number,color:string,maxWidth?:number,tracking?:number}} TextRun */
/** @type {Record<string,Glyph>} */ let glyphData={};
/** @type {Map<string,HTMLCanvasElement>} */ const cache=new Map();
const missing=new Set();
export async function loadFieldBitmapFont(){
  const r=await fetch(FIELD_FONT_PATH);
  if(!r.ok)throw Error('픽셀 글꼴을 불러오지 못했습니다.');
  glyphData=(await r.json()).glyphs;
}
/** @param {string} ch */
function glyph(ch){if(!glyphData[ch])missing.add(ch);return glyphData[ch]??glyphData['?']}
export function bitmapFontStats(){return {loaded:Object.keys(glyphData).length,cached:cache.size,missing:[...missing].join(''),alpha:'0/255',source:'BDF'}}
/** Baseline metrics are from the BDF; Hangul, Latin and digits share it.
 * @param {string} text @param {number} scale @param {number} tracking */
export function fieldTextWidth(text,scale=4,tracking=0){
  let x=0,right=0;for(const ch of text){const g=glyph(ch);if(!g)continue;right=Math.max(right,x+(g.box[0]+g.box[2])*scale);x+=g.advance*scale+tracking}return right;
}
/** @param {string} ch @param {string} color */
function raster(ch,color){
  const key=ch+color;let canvas=cache.get(key);if(canvas)return canvas;
  const g=glyph(ch);if(!g||!g.box[0]||!g.box[1])return null;
  canvas=document.createElement('canvas');canvas.width=g.box[0];canvas.height=g.box[1];
  const c=canvas.getContext('2d');if(!c)return null;c.fillStyle=color;
  for(let y=0;y<g.rows.length;y++){const row=g.rows[y],bits=parseInt(row,16),count=row.length*4;for(let x=0;x<g.box[0];x++)if((bits>>> (count-1-x))&1)c.fillRect(x,y,1,1)}
  cache.set(key,canvas);return canvas;
}
/** Paint directly at physical framebuffer coordinates after world presentation.
 * Every destination edge is integral; no CSS font, transform or alpha blending.
 * @param {CanvasRenderingContext2D} c @param {TextRun} run @param {number} ratio */
export function drawFieldText(c,run,ratio=1){
  c.imageSmoothingEnabled=false;
  const requested=run.scale*ratio;
  let scale=Math.max(1,Math.round(requested));
  if(run.maxWidth&&fieldTextWidth(run.text,scale,(run.tracking??0)*ratio)>run.maxWidth*ratio)scale=Math.max(1,scale-1);
  // Tiny signs cannot contain a full 11px glyph at low physical resolutions.
  // Keep their exact panel bounds with explicit nearest-neighbour decimation.
  if(run.maxWidth&&fieldTextWidth(run.text,scale,(run.tracking??0)*ratio)>run.maxWidth*ratio)scale=requested;
  let x=Math.round(run.x*ratio);const baseline=Math.round((run.y+11*run.scale)*ratio);
  const tracking=Math.round((run.tracking??0)*ratio);
  for(const ch of run.text){const g=glyph(ch);if(!g)continue;const im=raster(ch,run.color);
    if(im){const dx=Math.round(x+g.box[2]*scale),dy=Math.round(baseline-(g.box[1]+g.box[3])*scale),w=Math.max(1,Math.round(g.box[0]*scale)),h=Math.max(1,Math.round(g.box[1]*scale));c.drawImage(im,dx,dy,w,h)}
    x+=Math.round(g.advance*scale)+tracking;
  }
}
