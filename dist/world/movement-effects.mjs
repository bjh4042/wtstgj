import {GRID} from './definition.mjs';
// Fixed original step effects on a private draft; no authority or live-world handle.
export function applyOriginalWalkCounters(s,d){s.world.walkedTiles++;s.world.walkedMsEstimate+=d.walkMs;if(s.economy?.policyId)s.economy.walkedDistance=(s.economy.walkedDistance??0)+GRID;}
