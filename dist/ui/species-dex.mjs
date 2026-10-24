import {DEX_METADATA} from './species-dex-data.mjs';
import {approvedSpeciesArt} from '../approved-species.mjs';
export const DEX_STAT_FIELDS=Object.freeze(['hp','atk','def','spa','spd','spe']);
export const DEX_STAT_LABELS=Object.freeze(['HP','공격','방어','특수공격','특수방어','스피드']);
export const escapeDex=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeDex;
const contains=(list,id)=>(list??[]).includes(id);
/** Project immutable catalog fields only. A caught record does not bypass the existing seen gate. */
export function dexRecord(catalog,dex,id,{metadata=DEX_METADATA.records}={}){
 const mon=catalog.getSpeciesById(id);if(!mon||!Number.isInteger(mon.number??mon.id))return null;
 const number=mon.number??mon.id,seen=contains(dex.seen,id),caught=contains(dex.caught,id);
 if(!seen)return {id,number,seen:false,caught,name:'???',types:[],stats:[],motif:null,description:null};
 const canonical=catalog.namespace==='canonical',data=canonical?metadata[id]:null;
 // Metadata with a stale identity is never attached by ordinal or a guessed name.
 const info=data?.name===mon.name?data:null;
 const values=catalog.getBaseStats(id);
 const stats=DEX_STAT_FIELDS.map((field,i)=>({field,label:DEX_STAT_LABELS[i],value:Number.isInteger(values?.[i])?values[i]:null}));
 const chain=catalog.getEvolutionChain?.(id)??[];
 return {id,number,seen,caught,name:mon.name,types:info?.typeNamesKo??mon.types??[],stats,
  motif:info?.motif??mon.real??null,motifKind:info?.motifKind??'unverified',taxonGroup:info?.taxonGroup??null,
  description:info?.description??mon.description??(canonical?null:mon.fact)??null,
  descriptionKind:info?.descriptionKind??(mon.description?'existing-description':mon.fact?'existing-game-note':'missing'),
  ecology:info?.ecology??null,chainNames:chain.length?chain.map(x=>contains(dex.seen,x.id)?x.name:'???'):info?.chainNames?.map(name=>name===mon.name?name:'???')??[],
  provenance:canonical?{source:DEX_METADATA.sourceFile,sha256:DEX_METADATA.sourceSha256,statsSource:DEX_METADATA.battleSourceFile,statsSha256:DEX_METADATA.battleSourceSha256}:null};
}
export function selectDexRecords(catalog,dex,{query='',filter='all'}={}){
 const q=query.trim().toLocaleLowerCase('ko');
 return catalog.records.filter(mon=>Number.isInteger(mon.number??mon.id)).map(mon=>dexRecord(catalog,dex,mon.id)).filter(mon=>
  (filter==='seen'?mon.seen:filter==='caught'?mon.caught:filter==='unseen'?!mon.seen:true)&&
  (!q||String(mon.number).includes(q)||String(mon.number).padStart(3,'0').includes(q)||mon.seen&&`${mon.name} ${mon.motif??''}`.toLocaleLowerCase('ko').includes(q)));
}
export function dexArtMarkup(record){
 if(!record?.seen||!String(record.id).startsWith('SPECIES_'))return '';
 const art=approvedSpeciesArt({namespace:'canonical',speciesId:record.id},'front');if(!art?.src||!art?.source)return '';
 const [x,y,w,h]=art.source;
 return `<svg class="eco-dex-art" role="img" aria-label="${esc(record.name)}" viewBox="${x} ${y} ${w} ${h}"><image href="${esc(art.src)}" width="${art.width}" height="${art.height}"/></svg>`;
}
export function dexDetailMarkup(record,{art=true}={}){
 if(!record)return '<p>도감 기록을 찾을 수 없습니다.</p>';
 if(!record.seen)return '<p class="eco-dex-locked">아직 만나지 못한 생태몬이에요. 만나면 설명과 종족값을 볼 수 있어요.</p>';
 const real=record.motifKind==='actual_living_organism',motifHeading=real?'모티프 동식물':record.motifKind==='natural_landform'?'모티프 자연지형':record.motifKind==='original_fantasy'?'모티프 · 오리지널 상징':'모티프';
 const group={animal:'동물',plant:'식물',fungus:'균류'}[record.taxonGroup];
 const note=real?'실제 생물의 거제 서식·보호등급은 공식 자료 확인 전입니다.':record.motifKind==='unverified'?'현실 생물 분류 미확인':'실제 동식물 한 종이 아닌 게임의 지형·상징 모티프입니다.';
 return `<article class="eco-dex-detail" data-dex-detail="${esc(record.id)}"><header class="eco-dex-hero">${art?dexArtMarkup(record):''}<div><p class="eco-dex-kicker">No.${String(record.number).padStart(3,'0')} · ${record.caught?'포획':'발견'}</p><h3>${esc(record.name)}</h3><p class="eco-dex-types">${record.types.map(t=>`<span>${esc(t)}</span>`).join('')}</p></div></header><section class="eco-dex-copy"><h4>생태몬 설명 · 게임 설정</h4><p>${esc(record.description??'설명 준비 중입니다.')}</p></section><section><h4>종족값</h4><p class="eco-dex-note">레벨·개체의 현재 능력치가 아닌 종의 기본 능력치입니다.</p><dl class="eco-dex-stats">${record.stats.map(s=>`<div data-stat="${s.field}"><dt>${s.label}</dt><dd>${s.value??'미확인'}</dd></div>`).join('')}</dl></section><section class="eco-dex-motif"><h4>${motifHeading}</h4><p class="eco-dex-motif-name">${esc(record.motif??'미확인')}${group?' · '+group:''}</p><p class="eco-dex-note">${note} 게임의 타입·진화·능력치는 실제 생물학과 별개입니다.</p>${record.ecology?`<p>${esc(record.ecology.text)}</p>`:''}</section>${record.chainNames?.length>1?`<section><h4>성장 계통 · 게임 설정</h4><p>${record.chainNames.map(esc).join(' → ')}</p></section>`:''}${record.provenance?`<details class="eco-dex-provenance"><summary>기록 근거</summary><p>이름·모티프·성장 계통: 151종 도감 마스터 v3<br>종족값·대결 역할: 대결·수집 마스터 v3<br>설명은 위 게임 설정을 요약한 문장입니다. 새 생태 사실이나 신규 이야기를 추가하지 않았습니다.</p></details>`:''}</article>`;
}
export function dexListMarkup(records,{seen=0,caught=0,total=151,query='',filter='all'}={}){
 return `<div class="eco-dex-count">발견 ${seen}/${total} · 포획 ${caught}/${total}</div><div class="eco-dex-tools"><label>이름·번호·모티프 검색<input type="search" data-dex-search value="${esc(query)}" placeholder="발견한 생태몬 찾기"></label><label>기록<select data-dex-filter>${[['all','전체'],['seen','발견'],['caught','포획'],['unseen','미발견']].map(([v,n])=>`<option value="${v}"${filter===v?' selected':''}>${n}</option>`).join('')}</select></label></div><ul class="eco-dex-list">${records.map(mon=>`<li><button type="button" data-dex-id="${esc(mon.id)}" ${mon.seen?'':'disabled'}><span class="eco-dex-number">${String(mon.number).padStart(3,'0')}</span><span><strong>${esc(mon.name)}</strong><small>${mon.seen?esc(mon.motif??'모티프 미확인'):'아직 만나지 못했어요'}</small></span><span class="eco-dex-state">${mon.caught?'포획':mon.seen?'발견':'미발견'}</span></button></li>`).join('')||'<li class="eco-dex-empty">검색 결과가 없습니다.</li>'}</ul>`;
}
