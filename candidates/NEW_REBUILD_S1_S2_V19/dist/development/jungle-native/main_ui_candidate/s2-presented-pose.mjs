// Private provider status + owned pose only; does not advance/freeze movement or clock.
export function isS2FrameCurrent(status,pose,elapsedMs,minutes){
 const d=status?.displayed;return status?.ready===true&&!status.lastError&&!!d&&d.foot[0]===pose.foot[0]&&d.foot[1]===pose.foot[1]&&d.facing===pose.facing&&d.elapsedMs===elapsedMs&&d.minutes===minutes;
}
