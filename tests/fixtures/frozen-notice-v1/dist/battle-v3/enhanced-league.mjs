import {assertEnhancedLeagueReady,ENHANCED_LEAGUE_V1,leagueResultPending} from '../story/enhanced-league.mjs';
import {validateCanonicalStorySave,storyBattleInput} from '../story/save.mjs';
import {createGameSession} from '../canonical-session.mjs';
import {startSessionBattle} from './engine.mjs';
import {startYejiLeagueBattle} from './preview-opponents.mjs';

/** Temporary opponent binding, not global trainer/story registration. */
export function startEnhancedLeagueBattle(story,catalog,adapter,{attempt,index,rng,map}={}){
 assertEnhancedLeagueReady(adapter);const s=validateCanonicalStorySave(story,catalog);
 if(!leagueResultPending(s,attempt,index))throw Error('Enhanced league result already committed');
 const session=createGameSession(storyBattleInput(s,catalog),catalog),battleMap={...map,biomeId:'LEAGUE',battleBackgroundId:'battle.biome.LEAGUE'};
 if(index===4)return startYejiLeagueBattle(session,{adapter,story:s,rng,map:battleMap});
 const team=adapter.battleRuntime.enhancedEliteParties.teams[ENHANCED_LEAGUE_V1.order[index]];
 if(!team?.party||team.status!=='READY')throw Error('Enhanced opponent unavailable');
 const bound={...adapter,storyRuntime:{...adapter.storyRuntime,parties:{...adapter.storyRuntime.parties,[team.party.id]:team.party}}};
 return startSessionBattle(session,{kind:'trainer',partyId:team.party.id,opponents:team.party.members,map:battleMap,rng},{adapter:bound});
}
