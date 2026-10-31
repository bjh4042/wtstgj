const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o)};
export const PROLOGUE_RIVAL=freeze({
  "status": "ROOT_SELECTED_PROLOGUE_HARIN_WEST",
  "mapId": "world:hub:PROLOGUE",
  "sceneId": "native:prologue:exterior",
  "revision": "PROLOGUE_SELECTED_HUB_LAMP_JUNCTION_R3",
  "imageSHA": "d31ee97f9210999b0b7bb3bc29f8ac61fe7b6bcfea1eb946dfe8c58585939f9a",
  "maskSHA": "052a5e927ef28040cf58021c24736f5f7dde5c178c1a727a3b3ee70e91f3b14e",
  "npcFoot": [
    1810,
    590
  ],
  "npcFacing": "right",
  "contactCenter": [
    1890,
    590
  ],
  "playerFacing": "left",
  "radius": 24,
  "actorFootprint": [
    49,
    37
  ],
  "playerFootprint": [
    49,
    37
  ],
  "occupiedRadius": [
    48,
    36
  ],
  "atlas": {
    "src": "assets/approved-atlases/npc/HARIN.png",
    "width": 480,
    "height": 784,
    "sha256": "eb8e1e17debaa1ffbdbde69bd86360c86cd971ff053a99e5954bdedf2f0adb02",
    "columns": 3,
    "rows": 4,
    "cellWidth": 160,
    "cellHeight": 196
  },
  "frame": {
    "atlas": "npc/HARIN",
    "rect": [
      11,
      198,
      138,
      192
    ],
    "source": [
      11,
      198,
      138,
      192
    ],
    "width": 138,
    "height": 192,
    "bounds": [
      0,
      0,
      138,
      192
    ],
    "anchor": [
      69,
      192
    ],
    "atlasAnchor": [
      80,
      390
    ],
    "slot": [
      0,
      196,
      160,
      196
    ],
    "status": "approved-derivative",
    "derivativeSha256": "f634d5324f210743d2bc8a7fa2663ba38e479437265ffa040b9f317bbace5816",
    "sourceSha256": "de0e7c00c363773e16a38bb92a2890263d996256c49fbf4d3f0e7beaefce432f",
    "rgbaSha256": "3c818aa9ed1391ccd327778c24c46e8517ec36419b203ed637dd981d407a4726"
  },
  "sourceRow": {
    "id": "trainer:RIVAL_00",
    "kind": "trainer",
    "mapId": "world:hub:PROLOGUE",
    "stageId": "PROLOGUE",
    "areaId": null,
    "x": 24,
    "y": 14,
    "label": "하린",
    "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
    "trainerId": "RIVAL_00",
    "npcId": "NPC_RIVAL_HARIN",
    "eventId": "RIVAL_00",
    "required": true,
    "repeatable": false
  }
});
