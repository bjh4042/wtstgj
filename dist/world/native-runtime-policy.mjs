/** Native map ownership never blocks the already-owned canonical battle controls. */
export function allowCanonicalCommand({active,blocked,battle,battleOwned=false}){return !!active&&(!blocked||!!battle&&!!battleOwned)}
/** Native scene is drawn behind canonical battle, but its movement/clock is frozen. */
export function nativeFrameDelta(dt,{battle=false,dialogue=false}={}){return battle||dialogue?0:dt}
