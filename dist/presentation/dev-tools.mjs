import {drawBattleVfx} from './vfx-render.mjs';
import {geojeEnvironment,createMockEnvironment,TIME_STATES,WEATHER_STATES} from '../environment-service.mjs';
import {createLocalTimeProvider,createGeojeTimeProvider} from './time-provider.mjs';
import {createMockWeatherProvider,createSplitEnvironmentProvider} from './weather-provider.mjs';
import {LIGHTING_PROFILES} from './lighting.mjs';
import {BIOMES,mapPresentation} from './map-presentation.mjs';
import {resolveBattleBackground} from './battle-background.mjs';
import {BATTLE_DISPLAY_DEFAULTS,battleDisplayMetadata} from './battle-display.mjs';
import {drawBattleSpecies} from './battle-render.mjs';
import {VFX_FAMILIES,createMoveVfxCatalog,resolveMoveVfx,drawVfxPlaceholder,emitVfxAudio} from './battle-vfx.mjs';
import {TILE_ANIMATIONS,TILE_ANIMATION_OPTIONS,drawAnimatedTile,resolveTileAnimation} from './tile-animation.mjs';
import {drawResolvedEnvironment} from './weather-layer.mjs';
import {loadAsset,peekAsset} from '../asset-runtime.mjs';
import {SpeciesCatalogService} from '../species-catalog-service.mjs';
/** DEV only: uses presentation services, not a second game engine. No follower changes. */
export function installHGSSDeveloperTools(adapter){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('hgss')!=='1')return null;
 const catalog=new SpeciesCatalogService({namespace:'canonical',adapter}),moves=createMoveVfxCatalog(adapter.moves),weatherProvider=createMockWeatherProvider(geojeEnvironment.getState().weather);
 const panel=document.createElement('details');panel.id='hgss-dev';panel.open=true;panel.style.cssText='position:fixed;z-index:1050;right:6px;top:6px;width:min(480px,96vw);max-height:96vh;overflow:auto;padding:10px;background:#142d3e;color:white;border:2px solid #85b5cb;font:14px sans-serif';
 const options=values=>values.map(v=>`<option value="${v}">${v}</option>`).join('');
 panel.innerHTML=`<summary>HGSS 구조 도입 · 개발 검사</summary><fieldset><legend>Environment</legend><label>시간 provider <select data-h="provider">${options(['MOCK','LOCAL','GEOJE'])}</select></label><label> 시각 <input data-h="time" type="time" step="60" value="12:00"></label><label> 강제 상태 <select data-h="state">${options(['CLOCK',...TIME_STATES])}</select></label><label> 조명 <select data-h="profile">${options(Object.keys(LIGHTING_PROFILES))}</select></label><label> 날씨 <select data-h="weather">${options(WEATHER_STATES)}</select></label><output data-h="environment" style="display:block;white-space:pre-wrap"></output></fieldset><fieldset><legend>Battle display</legend><label>Biome <select data-h="biome">${options(BIOMES)}</select></label><label> 배경 override <select data-h="override">${options(['AUTO',...BIOMES.map(b=>'battle.biome.'+b)])}</select></label><label> Species <select data-h="species"></select></label><label> 조정 시점 <select data-h="side">${options(['Front','Back'])}</select></label><div data-h="metadata"></div><button data-h="reset">metadata 초기화</button><canvas data-h="battle" width="432" height="240" style="width:100%;display:block"></canvas><output data-h="background" style="display:block"></output></fieldset><fieldset><legend>Common VFX</legend><label>기술 <select data-h="move"></select></label><button data-h="move-play">기술 VFX 실행</button><label>Family <select data-h="family">${options(VFX_FAMILIES)}</select></label><button data-h="vfx-play">Family 실행</button></fieldset><fieldset><legend>Field tile animation</legend><label><input data-h="enabled" type="checkbox" checked> 켜기</label><label> 속도 <input data-h="speed" type="range" min="0" max="3" step=".1" value="1"></label><canvas data-h="tiles" width="432" height="100" style="width:100%;display:block"></canvas></fieldset><output data-h="result" role="status"></output>`;
 document.body.append(panel);const get=k=>panel.querySelector(`[data-h="${k}"]`),say=s=>get('result').textContent=s;
 panel.querySelectorAll('input,select,button').forEach(e=>{e.style.maxWidth='100%';e.style.fontSize='14px'});panel.addEventListener('keydown',e=>e.stopPropagation());panel.addEventListener('keyup',e=>e.stopPropagation());
 get('species').replaceChildren(...catalog.records.map(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.id} ${s.name}`;return o}));
 get('move').replaceChildren(...Object.values(adapter.moves).map(m=>{const o=document.createElement('option');o.value=m.id;o.textContent=`${m.id} ${m.name}`;return o}));
 let metadata={},activeVfx=null,raf=0,last=0,clock=0,stopped=false;const safe=fn=>async()=>{try{await fn()}catch(e){say(e.message)}};
 const reference=()=>({namespace:'canonical',speciesId:get('species').value});
 function metadataControls(){const side=get('side').value,m=battleDisplayMetadata(reference(),metadata);get('metadata').replaceChildren();for(const label of ['VisualScale','AnchorX','AnchorY','OffsetX','OffsetY']){const key=label==='VisualScale'?'battleVisualScale'+side:'battle'+label.replace(/[XY]$/,'')+side+label.at(-1),wrap=document.createElement('label'),input=document.createElement('input');input.type='number';input.step=label.includes('Offset')?'1':'.05';input.min=label.includes('Offset')?'-256':'0';input.max=label.includes('Offset')?'256':label.includes('Anchor')?'1':'3';input.value=m[key];input.style.width='64px';input.dataset.metadataKey=key;input.oninput=()=>metadata[key]=Number(input.value);wrap.textContent=label+' ';wrap.append(input);get('metadata').append(wrap)}}
 async function mockClock(){const weather=get('weather').value;await geojeEnvironment.setProvider(createMockEnvironment({time:'DAY',weather}));get('provider').value='MOCK';const [h,m]=get('time').value.split(':').map(Number);if(get('state').value==='CLOCK')geojeEnvironment.setMockTime(h*60+m);else geojeEnvironment.setMock({time:get('state').value})}
 get('time').oninput=safe(()=>{get('state').value='CLOCK';return mockClock()});get('state').onchange=safe(mockClock);
 get('provider').onchange=safe(async()=>{if(get('provider').value==='MOCK')return mockClock();weatherProvider.set(get('weather').value);const timeProvider=get('provider').value==='GEOJE'?createGeojeTimeProvider():createLocalTimeProvider();await geojeEnvironment.setProvider(createSplitEnvironmentProvider({timeProvider,weatherProvider}));get('state').value='CLOCK'});
 get('weather').onchange=safe(async()=>{weatherProvider.set(get('weather').value);if(get('provider').value==='MOCK')geojeEnvironment.setMock({weather:get('weather').value});else await geojeEnvironment.refresh()});
 get('profile').onchange=()=>geojeEnvironment.setLightingProfile(get('profile').value);
 get('enabled').onchange=()=>TILE_ANIMATION_OPTIONS.enabled=get('enabled').checked;get('speed').oninput=()=>TILE_ANIMATION_OPTIONS.speed=Number(get('speed').value);
 get('side').onchange=metadataControls;get('species').onchange=()=>{metadata={};metadataControls()};get('reset').onclick=()=>{metadata={};metadataControls()};
 function play(family,variant='default',timing){activeVfx={family,variant,timing,start:clock};emitVfxAudio(family);say(`VFX ${family} · silent audio hook`)}
 get('vfx-play').onclick=()=>play(get('family').value);get('move-play').onclick=()=>{const v=resolveMoveVfx(moves,get('move').value).effects[0];get('family').value=v.family;play(v.family,v.variant,v.timing)};
 const battleCanvas=get('battle'),tiles=get('tiles'),bc=battleCanvas.getContext('2d'),tc=tiles.getContext('2d');
 function draw(now){if(stopped)return;const dt=Math.min(50,Math.max(0,now-last));last=now;if(!document.hidden)clock+=dt;
  const map=mapPresentation({id:'dev-preview',biomeId:get('biome').value,lightingProfileId:get('profile').value,...(get('override').value==='AUTO'?{}:{battleBackgroundId:get('override').value})}),bg=resolveBattleBackground(map),frame=geojeEnvironment.getFrame(map);loadAsset(bg.assetId);const art=peekAsset(bg.assetId);
  bc.clearRect(0,0,432,240);if(art)bc.drawImage(art.image,...art.source,0,0,432,240);else{bc.fillStyle='#425966';bc.fillRect(0,0,432,240)}
  drawBattleSpecies(bc,reference(),'front',320,145,{size:110,metadata});drawBattleSpecies(bc,reference(),'back',115,228,{size:125,metadata});
  bc.strokeStyle='#ffe68c';for(const [x,y] of [[320,145],[115,228]]){bc.beginPath();bc.moveTo(x-14,y);bc.lineTo(x+14,y);bc.moveTo(x,y-8);bc.lineTo(x,y+8);bc.stroke()}
  if(activeVfx){const v=drawBattleVfx(bc,activeVfx.family,clock-activeVfx.start,{variant:activeVfx.variant,timing:activeVfx.timing});if(v.done)activeVfx=null}
  get('background').textContent=`${bg.biomeId} → ${bg.assetId} · ${art?.status??'placeholder'}`;
  tc.clearRect(0,0,432,100);tc.fillStyle='#597464';tc.fillRect(0,0,432,100);
  Object.keys(TILE_ANIMATIONS).forEach((id,i)=>{const opts={...TILE_ANIMATION_OPTIONS,weather:geojeEnvironment.getState().weather},f=resolveTileAnimation(id,clock,opts);loadAsset(f.assetId);drawAnimatedTile(tc,id,clock,8+i*60,18,48,{...opts,art:peekAsset(f.assetId)})});drawResolvedEnvironment(tc,frame,clock,432,100);
  const l=frame.lighting;get('environment').textContent=`${l.time} ${l.minutes.toFixed(1)}분 · ${l.from} → ${l.to} ${(l.interpolation*100).toFixed(1)}%\n밝기 ${l.brightness.toFixed(2)} 채도 ${l.saturation.toFixed(2)} 대비 ${l.contrast.toFixed(2)} 그림자 ${l.shadowIntensity.toFixed(2)}\nwater ×${frame.weather.waterSpeed} / ${geojeEnvironment.getState().weather}`;
  raf=requestAnimationFrame(draw);
 }
 metadataControls();raf=requestAnimationFrame(draw);const stop=()=>{stopped=true;cancelAnimationFrame(raf);geojeEnvironment.setLightingProfile(null)};window.addEventListener('pagehide',stop,{once:true});
 return {panel,stop,catalog,moves};
}
