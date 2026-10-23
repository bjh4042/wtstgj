import {CanonicalWorld} from '../../dist/world/service.mjs';
import {createCanonicalCreature} from '../../dist/canonical-session.mjs';
import {validateCanonicalStorySave} from '../../dist/story/save.mjs';
import {cellPosition} from '../../dist/world/definition.mjs';
import {syncWorldLocation} from '../../dist/world/state.mjs';
import {ENHANCED_LEAGUE_V1 as policy} from '../../dist/story/enhanced-league.mjs';
/** Isolated fabricated POST checkpoint for boundary tests. No playthrough/growth evidence. */
export function postLeagueFixture(adapter){
 const w=new CanonicalWorld({adapter,mode:'test'}),s=w.snapshot(),c=w.story.contract,p=s.progress;
 s.party=[createCanonicalCreature(w.catalog,s.starterId,5)];s.dex={seen:[s.starterId],caught:[s.starterId]};
 p.completedStages=c.sequence.filter(id=>id!=='POST');
 p.completedEvents=Object.values(c.events).filter(e=>e.active&&!e.acquisitionOnly&&e.stageId!=='POST').map(e=>e.id);
 p.defeatedTrainers=Object.values(c.trainers).filter(t=>t.stageId!=='POST').map(t=>t.id);
 p.flags=Object.fromEntries(Object.values(c.flags).map(f=>[f.id,f.set_by.some(id=>p.completedEvents.includes(c.aliases[id]??id))]));
 p.gymClears=c.gyms.map(g=>g.id);p.badges=c.gyms.map(g=>g.badgeId);p.leagueWins=[...c.elite];p.leagueRunState='idle';
 p.rewardClaims=Object.values(c.rewards).filter(r=>p.completedEvents.includes(r.triggerEvent)).map(r=>r.id);
 p.items={potion:3};s.economy.money=1234;s.inventory.ecology_ball=2;
 s.position=cellPosition(policy.entryMapId,...policy.safeCell);syncWorldLocation(s,w.host);
 const clean=validateCanonicalStorySave(s,w.catalog);w.dispose();return clean;
}
export const isolatedStorage=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}};
