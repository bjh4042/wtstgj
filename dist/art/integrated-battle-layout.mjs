/** Scene-only responsive presentation geometry. Does not mutate battle state. */
export function integratedBattleLayout(width,height){
 const w=Math.max(240,width),h=Math.max(220,height),pad=8,hudWidth=Math.min(320,Math.max(138,w*.44)),hudHeight=Math.min(104,h*.34);
 const enemyHUD={x:pad,y:pad,width:hudWidth,height:hudHeight},playerHUD={x:w-pad-hudWidth,y:h-pad-hudHeight,width:hudWidth,height:hudHeight};
 const playerSize=Math.min(w*.34,h-hudHeight-40,Math.max(32,2*(playerHUD.x-8-w*.23))),enemyY=Math.min(h*.52,h-hudHeight-16),enemySize=Math.min(w*.30,enemyY-16,Math.max(32,2*(w*.76-enemyHUD.x-enemyHUD.width-8)));
 const player={x:w*.23,y:h-16,size:playerSize},enemy={x:w*.76,y:enemyY,size:enemySize};
 return {width:w,height:h,enemyHUD,playerHUD,player,enemy,backgroundFit:'cover',backgroundOnlyCrop:true};
}
export function battleActorBox(actor){return {x:actor.x-actor.size/2,y:actor.y-actor.size,width:actor.size,height:actor.size};}
export function rectanglesOverlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function coverBackgroundRect(sourceWidth,sourceHeight,width,height){const scale=Math.max(width/sourceWidth,height/sourceHeight);const sw=width/scale,sh=height/scale;return {source:[(sourceWidth-sw)/2,(sourceHeight-sh)/2,sw,sh],destination:[0,0,width,height]};}
/** Moves existing nodes, preserving their handlers. Call after polished HUD install.
 * refresh() is pure DOM presentation: use before drawing to obtain current scene
 * logical size; pass layout to renderer, not to battle engine/collision/rules.
 */
export function installIntegratedBattleLayout({panel,canvas,hud,info,actions,heading,document:doc=globalThis.document}){
 const stage=doc.createElement('div');stage.className='eco-rpg-stage';
 const band=doc.createElement('div');band.className='eco-rpg-command-band';
 const log=doc.createElement('p');log.className='eco-rpg-battle-log';log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.tabIndex=0;
 panel.classList.add('eco-rpg-battle');stage.append(canvas,hud);band.append(log,actions);panel.append(stage,band);if(heading)heading.hidden=true;if(info)info.hidden=true;
 for(const card of hud.children){card.tabIndex=0;card.setAttribute('aria-label',card.getAttribute('aria-label')+' 상태 · 긴 내용은 스크롤');}
 const statuses=Array.from(hud.children,card=>{const status=doc.createElement('span');status.className='eco-rpg-status';card.append(status);return status});
 let lastLog='';
 function setText({message='',playerStatus='',enemyStatus=''}={}){const value=String(message);if(lastLog!==value){log.textContent=value;lastLog=value;log.scrollTop=0}log.hidden=!value;statuses[0].textContent=String(playerStatus);statuses[1].textContent=String(enemyStatus);statuses.forEach(s=>s.hidden=!s.textContent);}
 function refresh(){const rect=stage.getBoundingClientRect();return integratedBattleLayout(rect.width,rect.height);}
 return {stage,band,log,refresh,setText};
}
/** Existing advance handler stays attached; only label/decoration changes. */
export function styleDialogueAdvance(button){button.setAttribute('aria-label',button.getAttribute('aria-label')||button.textContent||'대화 계속');button.textContent='';button.classList.add('eco-dialogue-advance');}
