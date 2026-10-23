/** Original ecology/coast presentation only. Never writes battle/game/save state. */
export const ECO_CHROME_COLORS=Object.freeze({ink:'#15394B',navy:'#123D57',blue:'#176B8E',teal:'#17695E',foam:'#EDF8F8',paper:'#FFFDF6',gold:'#D7BC70',line:'#A8CBD4'});
export function battleChromeModel({name,hp,maxHP,level}){
 const valid=Number.isFinite(hp)&&Number.isFinite(maxHP)&&maxHP>0;
 return {name:String(name??''),level:Number.isFinite(level)?String(level):'',hp:valid?Math.max(0,hp):null,maxHP:valid?maxHP:null,ratio:valid?Math.max(0,Math.min(1,hp/maxHP)):null,low:valid&&hp/maxHP<=.25};
}
/** Attach once, update with display data derived by the existing battle renderer.
 * Missing HP stays unknown; no guessed stat, turn, weather or status is shown.
 * Existing action nodes/listeners remain untouched. */
export function installPolishedBattleChrome({panel,info,document:doc=globalThis.document}){
 const heading=doc.createElement('div');heading.className='eco-battle-heading';heading.textContent='생태친구와 함께';
 const hud=doc.createElement('div');hud.className='eco-battle-hud';hud.hidden=true;
 const cards=['내 친구','상대'].map(side=>{
  const card=doc.createElement('section');card.className='eco-battle-card';card.setAttribute('aria-label',side);
  const eyebrow=doc.createElement('span');eyebrow.className='eco-battle-side';eyebrow.textContent=side;
  const name=doc.createElement('strong');const details=doc.createElement('span');details.className='eco-battle-details';
  const meter=doc.createElement('div');meter.className='eco-hp-meter';meter.setAttribute('role','meter');const fill=doc.createElement('span');meter.append(fill);
  card.append(eyebrow,name,details,meter);hud.append(card);return {card,name,details,meter,fill};
 });
 panel.prepend(hud);panel.prepend(heading);
 function update({player,enemy}){for(const [index,input] of [player,enemy].entries()){
  const m=battleChromeModel(input),c=cards[index];c.name.textContent=m.name;c.details.textContent=[m.level?`Lv.${m.level}`:'',m.hp===null?'HP 정보 없음':`HP ${m.hp} / ${m.maxHP}`].filter(Boolean).join(' · ');
  c.meter.hidden=m.ratio===null;c.fill.style.width=`${(m.ratio??0)*100}%`;c.card.dataset.low=String(m.low);c.meter.setAttribute('aria-label',m.name+' HP');
  if(m.ratio!==null){c.meter.setAttribute('aria-valuemin','0');c.meter.setAttribute('aria-valuemax',String(m.maxHP));c.meter.setAttribute('aria-valuenow',String(Math.min(m.hp,m.maxHP)));}
 }hud.hidden=false;if(info)info.hidden=true;}
 return {update,hud,heading};
}
