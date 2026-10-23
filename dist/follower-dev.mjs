import {SPECIES_ASSETS} from './asset-manifest.mjs';
import {assetMarkup} from './asset-runtime.mjs';
import {followerMetadata,followerPose} from './species-asset-contract.mjs';
import {drawFieldFollower} from './follower-render.mjs';
/** Opt-in local preview only. Overrides presentation, never the party or saved game. */
export function installFollowerDeveloperTools(){
 if(import.meta.env?.DEV!==true||new URLSearchParams(location.search).get('follower')!=='1')return null;
 const state={speciesId:null},panel=document.createElement('details');panel.id='follower-dev';panel.open=true;
 panel.style.cssText='position:fixed;z-index:1001;left:8px;top:8px;width:310px;max-height:95vh;overflow:auto;padding:10px;background:#142d3e;color:white;font:13px sans-serif;border:2px solid #83b4ce';
 panel.innerHTML=`<summary>생태몬 개발자 검사</summary><label>필드 species <select id="follower-species"><option value="0">파티 1번 사용</option>${Object.keys(SPECIES_ASSETS).map(id=>`<option value="${id}">${id}</option>`).join('')}</select></label><p><label>방향 <select id="follower-direction">${['FRONT','RIGHT','LEFT','BACK'].map((s,i)=>`<option value="${['down','right','left','up'][i]}">${s}</option>`).join('')}</select></label> <label>프레임 <select id="follower-frame"><option value="auto">자동</option>${['Idle','WalkA','WalkB'].map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select></label></p>${['visualScale','footAnchorX','footAnchorY','renderOffsetX','renderOffsetY'].map(k=>`<label style="display:block">${k} <input id="follower-${k}" type="number" step="${k==='visualScale'?.05:1}" style="width:75px"></label>`).join('')}<canvas id="follower-preview" width="288" height="220" style="width:288px;background:#35505b"></canvas><output id="follower-pose"></output><div id="follower-slots" style="display:flex;gap:6px"></div><p>십자선 = 필드 발 좌표. 배율·anchor·offset은 검사 화면에서만 적용됩니다.</p>`;
 for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
 document.body.append(panel);const get=id=>panel.querySelector('#follower-'+id),keys=['visualScale','footAnchorX','footAnchorY','renderOffsetX','renderOffsetY'];
 const select=()=>{state.speciesId=Number(get('species').value)||null;const id=state.speciesId??1,m=followerMetadata(id),a=SPECIES_ASSETS[id];for(const k of keys)get(k).value=m[k];get('slots').innerHTML=[['battle.front',a.battle.front],['battle.back',a.battle.back],['ui.icon',a.ui.icon]].map(([label,slot])=>`<div style="width:90px">${label}${assetMarkup(slot,label)}</div>`).join('')};
 get('species').addEventListener('change',select);select();
 const ctx=get('preview').getContext('2d');let raf;
 const draw=time=>{const m=Object.fromEntries(keys.map(k=>[k,Number(get(k).value)])),frame=get('frame').value,facing=get('direction').value,walk=time/12,pose=followerPose(facing,frame==='auto',walk,frame==='auto'?null:Number(frame));ctx.clearRect(0,0,288,220);drawFieldFollower(ctx,{speciesId:state.speciesId??1,x:144,y:195,visible:true,facing,moving:true,walk},{metadata:m,pose:frame==='auto'?undefined:{facing,frame:Number(frame)}});ctx.strokeStyle='#ffe680';ctx.beginPath();ctx.moveTo(132,195);ctx.lineTo(156,195);ctx.moveTo(144,183);ctx.lineTo(144,207);ctx.stroke();get('pose').textContent=`row ${pose.row} / frame ${pose.frame}`;raf=requestAnimationFrame(draw)};
 raf=requestAnimationFrame(draw);window.addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});return state;
}
