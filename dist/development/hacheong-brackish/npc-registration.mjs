const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o)};
export const BRACKISH_ROLES=freeze([
  {
    "pointId": "trainer:ROUTE_S1_03",
    "kind": "trainer",
    "sourceRow": {
      "id": "trainer:ROUTE_S1_03",
      "kind": "trainer",
      "mapId": "world:area:S1_HACHEONG_BRACKISH",
      "stageId": "S1",
      "areaId": "S1_HACHEONG_BRACKISH",
      "x": 26,
      "y": 14,
      "label": "유담",
      "placementStatus": "TRAINER_WORLD_20260927_V1",
      "trainerId": "ROUTE_S1_03",
      "npcId": null,
      "eventId": null,
      "required": false,
      "repeatable": false,
      "facing": "left",
      "routeRole": "optional-spur"
    },
    "sceneId": "native:hacheong:brackish",
    "mapId": "world:area:S1_HACHEONG_BRACKISH",
    "revision": "HACHEONG_BRACKISH_SELECTED_V5_R1",
    "imageSHA": "ef4d8baacdf450d67984d50d613f8b98b29545b8077402131b21da9fdea3d1b9",
    "maskSHA": "b9570a658c26f0689009e9373a4c19cf1729ad148f8d90e623dda81b770707b0",
    "gameplayRevision": "HACHEONG_BRACKISH_THREE_CONTACT80_LOS_R1",
    "requiredFacing": "up",
    "rows": [
      [
        561,
        991,
        1017
      ],
      [
        562,
        991,
        1017
      ],
      [
        563,
        991,
        1017
      ],
      [
        564,
        991,
        1017
      ],
      [
        565,
        991,
        1017
      ],
      [
        566,
        991,
        1017
      ],
      [
        567,
        991,
        1017
      ],
      [
        568,
        991,
        1017
      ],
      [
        569,
        991,
        1017
      ],
      [
        570,
        991,
        1017
      ],
      [
        571,
        991,
        1017
      ],
      [
        572,
        991,
        1017
      ],
      [
        573,
        991,
        1017
      ],
      [
        574,
        991,
        1017
      ],
      [
        575,
        991,
        1017
      ],
      [
        576,
        991,
        1017
      ],
      [
        577,
        991,
        1017
      ],
      [
        578,
        991,
        1017
      ],
      [
        579,
        991,
        1017
      ],
      [
        580,
        991,
        1017
      ],
      [
        581,
        991,
        1017
      ],
      [
        582,
        991,
        1017
      ],
      [
        583,
        991,
        1017
      ],
      [
        584,
        991,
        1017
      ],
      [
        585,
        991,
        1017
      ],
      [
        586,
        991,
        1017
      ],
      [
        587,
        991,
        1017
      ],
      [
        588,
        991,
        1017
      ],
      [
        589,
        991,
        1017
      ],
      [
        590,
        991,
        1016
      ],
      [
        591,
        991,
        1015
      ],
      [
        592,
        991,
        1014
      ],
      [
        593,
        991,
        1013
      ],
      [
        594,
        991,
        1012
      ],
      [
        595,
        991,
        1011
      ],
      [
        596,
        991,
        1010
      ],
      [
        597,
        992,
        1009
      ],
      [
        598,
        993,
        1008
      ],
      [
        599,
        994,
        1007
      ],
      [
        600,
        995,
        1006
      ],
      [
        601,
        996,
        1005
      ],
      [
        602,
        997,
        1004
      ],
      [
        603,
        998,
        1003
      ],
      [
        604,
        999,
        1002
      ],
      [
        605,
        1000,
        1001
      ]
    ],
    "npcFoot": [
      1000,
      525
    ],
    "npcIdentity": "ANGLER_F_BASE",
    "atlas": {
      "src": "assets/approved-atlases/npc/ANGLER_F_BASE.png",
      "width": 405,
      "height": 784,
      "sha256": "fbc3ad840c2664a7580372ea19f53c14d519bbba0df9a2b9ab7fcd48ede7da55",
      "columns": 3,
      "rows": 4,
      "cellWidth": 135,
      "cellHeight": 196
    },
    "atlasFrame": {
      "atlas": "npc/ANGLER_F_BASE",
      "rect": [
        5,
        2,
        124,
        192
      ],
      "source": [
        5,
        2,
        124,
        192
      ],
      "width": 124,
      "height": 192,
      "bounds": [
        0,
        0,
        124,
        192
      ],
      "anchor": [
        62,
        192
      ],
      "atlasAnchor": [
        67,
        194
      ],
      "slot": [
        0,
        0,
        135,
        196
      ],
      "status": "approved-derivative",
      "derivativeSha256": "d2f7cf601787b762c6049918d44663dad881a5305a2d28eaa67fdbcd3f1878e0",
      "sourceSha256": "26d1f136adb792081df780d9ad17cbba907219935ee625afa4f819894cf811fb",
      "rgbaSha256": "ac9b61b9ca4d77f1f7fc40d56f2ce7b7ccf629ed3143d4c87cb75e9fca1071ef"
    },
    "proposalEvidence": "root-selected native contact80 + front cone + original dry floor ray; canonical logical rule unchanged"
  },
  {
    "pointId": "trainer:ROUTE_S1_04",
    "kind": "trainer",
    "sourceRow": {
      "id": "trainer:ROUTE_S1_04",
      "kind": "trainer",
      "mapId": "world:area:S1_HACHEONG_BRACKISH",
      "stageId": "S1",
      "areaId": "S1_HACHEONG_BRACKISH",
      "x": 7,
      "y": 11,
      "label": "수솔",
      "placementStatus": "TRAINER_WORLD_20260927_V1",
      "trainerId": "ROUTE_S1_04",
      "npcId": null,
      "eventId": null,
      "required": true,
      "repeatable": false,
      "facing": "down",
      "routeRole": "required-crossing"
    },
    "sceneId": "native:hacheong:brackish",
    "mapId": "world:area:S1_HACHEONG_BRACKISH",
    "revision": "HACHEONG_BRACKISH_SELECTED_V5_R1",
    "imageSHA": "ef4d8baacdf450d67984d50d613f8b98b29545b8077402131b21da9fdea3d1b9",
    "maskSHA": "b9570a658c26f0689009e9373a4c19cf1729ad148f8d90e623dda81b770707b0",
    "gameplayRevision": "HACHEONG_BRACKISH_THREE_CONTACT80_LOS_R1",
    "requiredFacing": "up",
    "rows": [
      [
        561,
        549,
        574
      ],
      [
        562,
        549,
        574
      ],
      [
        563,
        549,
        573
      ],
      [
        564,
        549,
        573
      ],
      [
        565,
        549,
        573
      ],
      [
        566,
        549,
        573
      ],
      [
        567,
        549,
        572
      ],
      [
        568,
        549,
        572
      ],
      [
        569,
        549,
        572
      ],
      [
        570,
        549,
        572
      ],
      [
        571,
        549,
        572
      ],
      [
        572,
        549,
        572
      ],
      [
        573,
        549,
        572
      ],
      [
        574,
        549,
        572
      ],
      [
        575,
        549,
        572
      ],
      [
        576,
        549,
        572
      ],
      [
        577,
        549,
        572
      ],
      [
        578,
        549,
        572
      ],
      [
        579,
        549,
        572
      ],
      [
        580,
        549,
        572
      ],
      [
        581,
        549,
        572
      ],
      [
        582,
        549,
        572
      ],
      [
        583,
        549,
        572
      ],
      [
        584,
        549,
        572
      ],
      [
        585,
        549,
        572
      ],
      [
        586,
        549,
        572
      ],
      [
        587,
        549,
        572
      ],
      [
        588,
        549,
        572
      ],
      [
        589,
        549,
        572
      ],
      [
        590,
        549,
        572
      ],
      [
        591,
        549,
        572
      ],
      [
        592,
        549,
        572
      ],
      [
        593,
        549,
        572
      ],
      [
        594,
        549,
        572
      ],
      [
        595,
        550,
        571
      ],
      [
        596,
        551,
        570
      ],
      [
        597,
        552,
        569
      ],
      [
        598,
        553,
        568
      ],
      [
        599,
        554,
        567
      ],
      [
        600,
        555,
        566
      ],
      [
        601,
        556,
        565
      ],
      [
        602,
        557,
        564
      ],
      [
        603,
        558,
        563
      ],
      [
        604,
        559,
        562
      ],
      [
        605,
        560,
        561
      ]
    ],
    "npcFoot": [
      560,
      525
    ],
    "npcIdentity": "LOCAL_RESIDENT_M_BASE",
    "atlas": {
      "src": "assets/approved-atlases/npc/LOCAL_RESIDENT_M_BASE.png",
      "width": 393,
      "height": 784,
      "sha256": "5b578426bffc12f433c4053189ce4983d283d780c7e3b7e176aa83aee995956e",
      "columns": 3,
      "rows": 4,
      "cellWidth": 131,
      "cellHeight": 196
    },
    "atlasFrame": {
      "atlas": "npc/LOCAL_RESIDENT_M_BASE",
      "rect": [
        2,
        2,
        127,
        192
      ],
      "source": [
        2,
        2,
        127,
        192
      ],
      "width": 127,
      "height": 192,
      "bounds": [
        0,
        0,
        127,
        192
      ],
      "anchor": [
        63.5,
        192
      ],
      "atlasAnchor": [
        65.5,
        194
      ],
      "slot": [
        0,
        0,
        131,
        196
      ],
      "status": "approved-derivative",
      "derivativeSha256": "af64e1549423760243587ed1898b4744ce6be4cbd34c087aea34261443ae8f82",
      "sourceSha256": "f4f7d73523e1b78b429bf064f7de456a2aa4052c005e4de6031911a89430d944",
      "rgbaSha256": "cbd469a9c2a59224a95848eea01237cae2da97eed8fade116eb1cd814b7f64d7"
    },
    "proposalEvidence": "root-selected native contact80 + front cone + original dry floor ray; canonical logical rule unchanged"
  },
  {
    "pointId": "trainer:ROUTE_S1_06",
    "kind": "trainer",
    "sourceRow": {
      "id": "trainer:ROUTE_S1_06",
      "kind": "trainer",
      "mapId": "world:area:S1_HACHEONG_BRACKISH",
      "stageId": "S1",
      "areaId": "S1_HACHEONG_BRACKISH",
      "x": 29,
      "y": 14,
      "label": "현온",
      "placementStatus": "TRAINER_WORLD_20260927_V1",
      "trainerId": "ROUTE_S1_06",
      "npcId": null,
      "eventId": null,
      "required": false,
      "repeatable": false,
      "facing": "left",
      "routeRole": "optional-spur"
    },
    "sceneId": "native:hacheong:brackish",
    "mapId": "world:area:S1_HACHEONG_BRACKISH",
    "revision": "HACHEONG_BRACKISH_SELECTED_V5_R1",
    "imageSHA": "ef4d8baacdf450d67984d50d613f8b98b29545b8077402131b21da9fdea3d1b9",
    "maskSHA": "b9570a658c26f0689009e9373a4c19cf1729ad148f8d90e623dda81b770707b0",
    "gameplayRevision": "HACHEONG_BRACKISH_THREE_CONTACT80_LOS_R1",
    "requiredFacing": "left",
    "rows": [
      [
        633,
        138,
        170
      ],
      [
        634,
        138,
        169
      ],
      [
        635,
        139,
        168
      ],
      [
        636,
        139,
        167
      ],
      [
        637,
        139,
        166
      ],
      [
        638,
        139,
        165
      ],
      [
        639,
        139,
        164
      ],
      [
        640,
        139,
        163
      ],
      [
        641,
        139,
        162
      ],
      [
        642,
        139,
        161
      ],
      [
        643,
        139,
        160
      ],
      [
        644,
        139,
        159
      ],
      [
        645,
        139,
        158
      ],
      [
        646,
        139,
        157
      ],
      [
        647,
        139,
        156
      ],
      [
        648,
        139,
        155
      ],
      [
        649,
        139,
        154
      ],
      [
        650,
        139,
        153
      ],
      [
        651,
        139,
        152
      ],
      [
        652,
        139,
        151
      ],
      [
        653,
        139,
        150
      ],
      [
        654,
        139,
        149
      ],
      [
        655,
        139,
        148
      ],
      [
        656,
        139,
        147
      ],
      [
        657,
        139,
        146
      ],
      [
        658,
        139,
        145
      ],
      [
        659,
        139,
        144
      ],
      [
        660,
        139,
        143
      ],
      [
        661,
        139,
        142
      ],
      [
        662,
        139,
        141
      ],
      [
        663,
        139,
        140
      ]
    ],
    "npcFoot": [
      90,
      632
    ],
    "npcIdentity": "ECO_STUDENT_F_BASE",
    "atlas": {
      "src": "assets/approved-atlases/npc/ECO_STUDENT_F_BASE.png",
      "width": 612,
      "height": 784,
      "sha256": "a4410e1cc77fc4ea184c42df783a3a8f056ad8ca108784344fb8dda4247f4d76",
      "columns": 3,
      "rows": 4,
      "cellWidth": 204,
      "cellHeight": 196
    },
    "atlasFrame": {
      "atlas": "npc/ECO_STUDENT_F_BASE",
      "rect": [
        33,
        198,
        138,
        192
      ],
      "source": [
        33,
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
        102,
        390
      ],
      "slot": [
        0,
        196,
        204,
        196
      ],
      "status": "approved-derivative",
      "derivativeSha256": "318fa73ef1c54c8f8fad81b95a5b2b730ca6a89ed7a63615b24dc0f207df7beb",
      "sourceSha256": "1e9490ffc3782739095ba4b9e714b9af180ac08bf936c238ef44eb6a67da674d",
      "rgbaSha256": "01366bd9de7a01eedd19e268928f9ff74b5080c8d28f34cd6998a30ac2282cb7"
    },
    "proposalEvidence": "root-selected native contact80 + front cone + original dry floor ray; canonical logical rule unchanged"
  }
]);
