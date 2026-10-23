import {presentationAudio} from './presentation/audio-hooks.mjs';
import {resolveWeather} from './presentation/weather-layer.mjs';
import {geojeEnvironment,TIME_STATES,WEATHER_STATES} from './environment-service.mjs';
import {configureAssets,assetStats} from './asset-runtime.mjs';
export function installPipelineDeveloperTools(){
 const query=new URLSearchParams(location.search),enabled=import.meta.env?.DEV===true&&query.get('pipeline')==='1';
 if(enabled)configureAssets({placeholder:query.get('art')==='placeholder'});
 // Consumers may subscribe to this hook; no new audio playback is forced on the player.
 geojeEnvironment.subscribe((state,visuals)=>{window.dispatchEvent(new CustomEvent('geoje:environment-audio',{detail:{state,sound:visuals.sound}}));const weather=resolveWeather(state.weather);presentationAudio.emit(weather.weatherSfxId,{channel:'weather',gain:weather.gain})});
 geojeEnvironment.start();window.addEventListener('pagehide',()=>geojeEnvironment.stop());
 if(!enabled)return;
 const panel=document.createElement('details');panel.id='pipeline-dev';panel.open=true;
 panel.style.cssText='position:fixed;z-index:1000;top:8px;right:8px;max-width:290px;padding:10px;background:#142d3e;color:white;border:2px solid #7fa7bc;font:14px sans-serif';
 panel.innerHTML=`<summary>에셋·환경 개발자 검사</summary><label>시간 <select id="mock-time">${TIME_STATES.map(t=>`<option ${t==='DAY'?'selected':''}>${t}</option>`).join('')}</select></label><label> 날씨 <select id="mock-weather">${WEATHER_STATES.map(w=>`<option>${w}</option>`).join('')}</select></label><p><button id="placeholder-switch">${query.get('art')==='placeholder'?'기존 아트로':'모든 아트 placeholder로'}</button></p><output id="pipeline-status"></output>`;
 document.body.append(panel);panel.querySelectorAll('button,select').forEach(e=>{e.style.color='#142d3e';e.style.background='#ffffff';e.style.fontSize='14px'});
 const apply=()=>geojeEnvironment.setMock({time:panel.querySelector('#mock-time').value,weather:panel.querySelector('#mock-weather').value});
 panel.querySelectorAll('select').forEach(select=>select.addEventListener('change',apply));
 panel.querySelector('#placeholder-switch').onclick=()=>{query.set('art',query.get('art')==='placeholder'?'normal':'placeholder');location.search=query.toString()};
 const report=()=>{const a=assetStats(),e=geojeEnvironment.getState();panel.querySelector('output').textContent=`${e.time} / ${e.weather} · 최종 ${a.final} · 기존 ${a.legacy} · 대체 ${a.placeholder}`;};
 geojeEnvironment.subscribe(report);setInterval(report,1500);report();
}
