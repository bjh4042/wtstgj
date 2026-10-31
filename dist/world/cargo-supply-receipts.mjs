import{CARGO_SUPPLY_ROWS as ROWS}from'./cargo-supply-rows.mjs';
import{sha256,stableJSON}from'../compatibility/codec.mjs';
export function cargoSupplyReceipt(id){if(typeof id!=='string'||!Object.hasOwn(ROWS,id))throw Error('CARGO_SUPPLY_ID_REJECTED');const r=ROWS[id];return Object.freeze({kind:'cargo-supply-claim',policy:'CARGO_SUPPLY_V1',chestId:id,itemId:r.itemId,quantity:r.quantity});}
export function cargoSupplyRequest(id){const{kind,...r}=cargoSupplyReceipt(id);return Object.freeze({type:kind,...r});}
export const cargoSupplyKey=id=>{cargoSupplyReceipt(id);return'cargo-supply-v1:'+id;};
/** Read ONLY the committed CanonicalWorld snapshot. No candidate draft, pending UI or local boolean. */
export function cargoSupplyCommitted(snapshot,id){const old=snapshot?.economy?.transactions?.[cargoSupplyKey(id)];return !!old&&old.fingerprint===sha256(stableJSON(cargoSupplyRequest(id)))&&stableJSON(old.result)===stableJSON(cargoSupplyReceipt(id));}
