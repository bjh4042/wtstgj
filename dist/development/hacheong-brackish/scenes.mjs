const deep=o=>{for(const v of Object.values(o))if(v&&typeof v==="object")deep(v);return Object.freeze(o)};
export const SCENES=deep({
  "east": {
    "sceneId": "native:yeoncho:local",
    "mapId": "world:hub:S1",
    "revision": "S1_NEW_BOUNDED_EAST_R1",
    "width": 4812,
    "height": 1719,
    "imageWidth": 4812,
    "imageHeight": 6709,
    "imageSHA": "9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357",
    "maskSHA": "163cf7b27f4fc21aeaafb87068e87cc393f12bb2f12e4ad7316fbb2acd8f18dc",
    "maskPath": "./assets/s1-east-exclusive.u8",
    "imagePath": "../s1-local/assets/yeoncho-open.png",
    "minX": 1777,
    "readFoot": [
      4183,
      1530
    ]
  },
  "brackish": {
    "sceneId": "native:hacheong:brackish",
    "mapId": "world:area:S1_HACHEONG_BRACKISH",
    "revision": "HACHEONG_BRACKISH_SELECTED_V5_R1",
    "width": 1536,
    "height": 1024,
    "imageWidth": 1536,
    "imageHeight": 1024,
    "imageSHA": "ef4d8baacdf450d67984d50d613f8b98b29545b8077402131b21da9fdea3d1b9",
    "maskSHA": "b9570a658c26f0689009e9373a4c19cf1729ad148f8d90e623dda81b770707b0",
    "maskPath": "./assets/brackish-safe.u8",
    "imagePath": "./assets/brackish-selected-v5.png",
    "minX": 0,
    "readFoot": [
      220,
      659
    ]
  }
});
