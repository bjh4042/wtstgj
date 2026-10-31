import{gym4VisualState}from'../gohyeon-gym4/visual-state.mjs';
// Native sidecar only; caller has already verified the original canonical transition.
// Never discard an active pose or mask/identity corruption, and never relocate feet.
export function gym4SavedPose(runtime,pose,support,contract){
 if(pose===null){if(runtime.position.scene==='world:gym:4')throw Error('GYM4_ACTIVE_POSE_REQUIRED');return null;}
 if(!support?.pinsVerified||support.validate(pose)!==true)throw Error('GYM4_STORED_POSE_INVALID');
 const state=gym4VisualState(runtime,contract);
 const safe=support.safe(pose.foot,state);if(!support.pinsVerified||typeof safe!=='boolean')throw Error('GYM4_SUPPORT_LIFECYCLE');
 if(runtime.position.scene!=='world:gym:4'&&safe===false)return null;
 return structuredClone(support.describe(pose.foot,pose.facing,state));
}
