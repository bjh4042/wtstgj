import{recoverAtLastHub}from'../../../economy/actions.mjs';
/** Original recovery calculation on an isolated copy, never a grant or commit. */
export function needsHubPresentation(runtime,catalog,host){
 if(runtime===null)return false; // Existing optional initialRuntime uses CanonicalWorld's own default.
 if(runtime.position.scene==='world:hub:S5')return true;
 const probe=structuredClone(runtime);recoverAtLastHub(probe,catalog,host,'PRESENTATION_ONLY_PROBE');
 return probe.economy?.recovery?.status==='RETURNED_VERIFIED_HOST'&&probe.economy.recovery.hubId==='CENTER:S5';
}
