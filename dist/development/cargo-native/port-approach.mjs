// Explicit newly selected interaction geometry, separate from unchanged original ports.
import {stableJSON} from '../../compatibility/codec.mjs';
const owned=new WeakMap();
const PINS={"ROOT_SELECTION.json": "5bcc1c1768b1abc074488e7280bd92bd6d1979b5cd1d99ea6b6a6d16474c5668", "NEW_PORT_APPROACH_PROPOSAL.json": "78bb95ec95e6153fe7920bbe74708984e1805f9ed1a484fc6e96dafadb00c6df", "PORT_APPROACH_RLE.json": "26bc03a433a66b9e0b5a85b91dfd49deb85c58413cae62b5aed039ba124bff17"};
const hash=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function loadPortApproach({readBytes}){
 const data={};for(const [name,pin]of Object.entries(PINS)){const input=await readBytes('port-approach-r3/'+name),raw=input instanceof ArrayBuffer?new Uint8Array(input.slice(0)):input instanceof Uint8Array?new Uint8Array(input):null;if(!raw)throw Error('PORT_APPROACH_BYTE_TYPE');if(await hash(raw)!==pin)throw Error('PORT_APPROACH_PIN');data[name]=JSON.parse(new TextDecoder().decode(raw))}
 const rows=new Map();for(const row of data['PORT_APPROACH_RLE.json'].rows){const lines=new Map();for(const[y,l,r]of row.runs){if(!lines.has(y))lines.set(y,[]);lines.get(y).push([l,r])}rows.set(row.id,{sceneId:row.sceneId,signature:stableJSON(row.direction),lines})}
 const authority=Object.freeze({revision:'CARGO_TWELVE_PORT_APPROACH_R3_NATURAL_STOP'});owned.set(authority,rows);return authority;
}
export const isPortApproach=a=>owned.has(a);
export function containsPortApproach(authority,d,foot){const r=owned.get(authority)?.get(d?.id);return !!r&&r.signature===stableJSON(d)&&Array.isArray(foot)&&foot.length===2&&foot.every(Number.isInteger)&&(r.lines.get(foot[1])??[]).some(([l,end])=>foot[0]>=l&&foot[0]<end)}
export function allowsPortApproach(authority,d,foot,material){return containsPortApproach(authority,d,foot)&&material?.sceneId===d.sourceSceneId&&material.isSafeFoot(foot)===true}
