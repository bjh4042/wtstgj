import {createCanonicalStoryGame,activateCanonicalEncounterSave} from '../story/save.mjs';
import {activateApprovedNewGame} from './approved-v1.mjs';
import {APPROVED_ID,activateConfirmedEconomy} from './contract.mjs';
import {activateCandidateNewGame} from './candidate.mjs';
export function createEconomyGame(catalog,options){
 const original=activateCanonicalEncounterSave(createCanonicalStoryGame(catalog,options),catalog);
 return catalog.economyPolicy?.id===APPROVED_ID?activateApprovedNewGame(original,catalog):catalog.economyPolicy?activateCandidateNewGame(original,catalog):activateConfirmedEconomy(original);
}
