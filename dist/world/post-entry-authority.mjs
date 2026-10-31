// Exact selected POST entry only; compatibility wrapper, not a broad native bypass.
const deepFreeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deepFreeze(v);return Object.freeze(o);};
export const POST_ENTRY_REGISTRATION=deepFreeze({
  "kind": "warp",
  "pointId": "post-entry:nojasan-summit",
  "sourceRow": {
    "id": "post-entry:nojasan-summit",
    "kind": "warp",
    "mapId": "world:hub:POST",
    "stageId": "POST",
    "areaId": null,
    "x": 34,
    "y": 7,
    "label": "노자산 정상 생태관측지",
    "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
    "targetMapId": "world:post:nojasan-summit",
    "target": [
      3,
      12
    ],
    "gate": "CAN_ENTER_POST",
    "exit": false,
    "reverseId": "post-entry:nojasan-summit:return"
  },
  "sourceRowSHA": "890f64398b93bb500c7b281d2ff73bed4abf2f4167215a545174bf3cc2979422",
  "sceneId": "world:hub:POST",
  "mapId": "world:hub:POST",
  "revision": "POST_NATIVE_2SCENE_DEV_R1:hub",
  "version": 1,
  "imageSHA": "29e0513d5d7ed29ba72badb58a4082a0e594853a07ae8e197a6e33e01d6e53f8",
  "maskSHA": "3ecad473fb5bbefce73d9afdf0b0f2ee57862f670f7e781eba1ffb5ecab38e48",
  "inputSHA": "efd4a2be1a5f968e5746a14dd416ab52da3a506d27e398289a364e0606ad9a3e",
  "rows": [
    [
      738,
      2615,
      2670
    ],
    [
      739,
      2616,
      2669
    ],
    [
      740,
      2617,
      2668
    ],
    [
      741,
      2618,
      2667
    ],
    [
      742,
      2619,
      2666
    ],
    [
      743,
      2620,
      2665
    ],
    [
      744,
      2621,
      2664
    ],
    [
      745,
      2622,
      2663
    ],
    [
      746,
      2623,
      2662
    ],
    [
      747,
      2624,
      2661
    ],
    [
      748,
      2625,
      2660
    ],
    [
      749,
      2626,
      2659
    ],
    [
      750,
      2627,
      2658
    ],
    [
      751,
      2628,
      2657
    ],
    [
      752,
      2629,
      2656
    ],
    [
      753,
      2630,
      2655
    ],
    [
      754,
      2631,
      2654
    ],
    [
      755,
      2632,
      2653
    ],
    [
      756,
      2633,
      2652
    ],
    [
      757,
      2634,
      2651
    ],
    [
      758,
      2635,
      2650
    ],
    [
      759,
      2636,
      2649
    ],
    [
      760,
      2637,
      2648
    ],
    [
      761,
      2638,
      2647
    ],
    [
      762,
      2639,
      2646
    ],
    [
      763,
      2640,
      2645
    ],
    [
      764,
      2641,
      2644
    ],
    [
      765,
      2642,
      2643
    ]
  ],
  "count": 784
});
const authorities=new WeakMap(),grants=new WeakMap();
export function createPostEntryAuthority({readNative}={}){if(typeof readNative!=='function')throw Error('NATIVE_ENTRY_READER_REQUIRED');const binding=Object.freeze({});authorities.set(binding,readNative);return binding;}
export const isPostEntryAuthority=a=>authorities.has(a);
export function isNativePostEntryRequest(id,a){const d=a&&Object.getOwnPropertyDescriptor(a,'type');return id===POST_ENTRY_REGISTRATION.pointId&&!!a&&Object.getPrototypeOf(a)===Object.prototype&&Reflect.ownKeys(a).length===1&&!!d&&d.enumerable&&Object.hasOwn(d,'value')&&d.value==='warp';}
function exact(actual,expected){if(expected===null||typeof expected!=='object')return actual===expected;if(!actual||typeof actual!=='object'||Array.isArray(actual)!==Array.isArray(expected)||Reflect.ownKeys(actual).length!==Reflect.ownKeys(expected).length)return false;return Reflect.ownKeys(expected).every(k=>{const d=Object.getOwnPropertyDescriptor(actual,k);return d&&Object.hasOwn(d,'value')&&exact(d.value,expected[k]);});}
export function exactPostEntrySourceRow(p){return exact(p,POST_ENTRY_REGISTRATION.sourceRow);}
function readVerified(a,w,id){const read=authorities.get(a),r=POST_ENTRY_REGISTRATION;if(!read||id!==r.pointId)return null;const s=w.snapshot(),p=w.definition.points[id];if(!exactPostEntrySourceRow(p)||s.position.scene!==r.mapId||s.world?.mapId!==r.mapId)return null;
 const raw=read();if(!raw||Object.getPrototypeOf(raw)!==Object.prototype)return null;const n={};for(const k of ['sceneId','mapId','revision','version','imageSHA','maskSHA','phase','foot','facing','sessionEpoch']){const d=Object.getOwnPropertyDescriptor(raw,k);if(!d||!Object.hasOwn(d,'value')||!d.enumerable)return null;n[k]=d.value;}
 if(['sceneId','mapId','revision','version','imageSHA','maskSHA'].some(k=>n[k]!==r[k])||n.phase!=='field'||!Number.isSafeInteger(n.sessionEpoch)||n.sessionEpoch<0||!['up','down','left','right'].includes(n.facing))return null;
 if(!Array.isArray(n.foot)||Reflect.ownKeys(n.foot).length!==3||n.foot.length!==2)return null;const f=[0,1].map(k=>Object.getOwnPropertyDescriptor(n.foot,String(k)));if(f.some(d=>!d||!Object.hasOwn(d,'value')||!Number.isSafeInteger(d.value)))return null;const[x,y]=f.map(d=>d.value);if(!r.rows.some(([yy,a,b])=>y===yy&&x>=a&&x<b))return null;return n.sessionEpoch;
}
export function mintPostEntryGrant(a,w,id){const epoch=readVerified(a,w,id);if(epoch===null)throw Error('NATIVE_POST_ENTRY_AUTHORITY_REJECTED');const grant=Object.freeze({});grants.set(grant,{a,w,id,epoch});return grant;}
export function validatePostEntryGrant(grant,w,s,id){const g=grants.get(grant),r=POST_ENTRY_REGISTRATION;return !!g&&g.w===w&&g.id===id&&s.position.scene===r.mapId&&s.world?.mapId===r.mapId&&readVerified(g.a,w,id)===g.epoch;}
export function revokePostEntryGrant(grant){grants.delete(grant);}
