// REBUILD_R1: only the newest preparation may release the retained-frame gate.
// This gate owns no source state, persistence, render loop or restore authority.
export function createPreparationGate(){
 let current=null;
 return Object.freeze({
  begin(){const token=Object.freeze({});current=token;return token},
  finish(token){if(token!==current)return false;current=null;return true},
  get pending(){return current!==null}
 });
}
