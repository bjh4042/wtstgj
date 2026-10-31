const deep=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')deep(v);return Object.freeze(o)};
export const WETLAND_SCENES=deep({
  "approach": {
    "sceneId": "native:yeoncho:local",
    "mapId": "world:hub:S1",
    "revision": "S1_NEW_WETLAND_APPROACH_PLATE_R1",
    "width": 4812,
    "height": 1719,
    "imageSHA": "9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357",
    "maskSHA": "52b160edf30aa29be3ceaf88d77a8ff93dd404c208a054d6aab15f7c136c5061",
    "maskPath": "./assets/s1-approach-exclusive.u8",
    "imagePath": "../s1-local/assets/yeoncho-open.png",
    "renderPlateSHA": "1d61a5f9f7658b34fba5027cb6020856ff176eaa7e958c78b728fb301775c9fb",
    "supportCount": 18808
  },
  "wetland": {
    "sceneId": "native:hacheong:wetland",
    "mapId": "world:area:S1_HACHEONG_WETLAND",
    "revision": "HACHEONG_WETLAND_ENV_SELECTED_R1",
    "width": 2836,
    "height": 1820,
    "imageSHA": "8b4fa4c1de830dada770e2ef10a66db93911ee0844f1daf51e17492c9cf7bdd2",
    "maskSHA": "c9df772acf34490f73ffe968eedf6d4d51fe03de68120e0df8472c48a5d11c6f",
    "maskPath": "./assets/wetland-safe.u8",
    "imagePath": "./assets/wetland-selected-env.png",
    "supportCount": 400632
  }
});
