/** Optional display copy only. Never a gate, reward, difficulty or save mutation. */
export const PRE_RIVAL_GUIDANCE='센터 회복은 무료예요. 회복약과 볼을 준비하고 주변에서 친구를 만나 보세요. 회복약은 대결 중에도 쓸 수 있어요.';
export const LOSS_RECOVERY_GUIDANCE='센터에서 다시 준비할 수 있어요. 회복은 무료예요. 주변을 탐험하거나 회복약을 챙겨 다시 도전해 보세요.';
export function preRivalGuidance(save,mapId){return mapId==='world:hub:PROLOGUE'&&save?.progress?.completedEvents?.includes('P02_FIRST_PARTNER')&&!save.progress.defeatedTrainers?.includes('RIVAL_00')?PRE_RIVAL_GUIDANCE:''}
