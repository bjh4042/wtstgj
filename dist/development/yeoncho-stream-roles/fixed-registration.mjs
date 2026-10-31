const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o)};
export const STREAM_ROLES=freeze([
  {
    "sceneId": "native:yeoncho:stream:bounded",
    "mapId": "world:area:S1_YEONCHO_STREAM",
    "revision": "YEONCHO_STREAM_RECOVERED_BOUND_CONTACT49_R1",
    "imageSHA": "9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357",
    "maskSHA": "89972322e104d85dd945cb9b1e3bbbeb7ebd88df9650644f03f5562135dfa699",
    "gameplayRevision": "YEONCHO_STREAM_FIXED_THREE_ROLES_R1",
    "pointId": "event:S1_WATER_DECLINE",
    "kind": "event",
    "sourceRow": {
      "id": "event:S1_WATER_DECLINE",
      "kind": "event",
      "mapId": "world:area:S1_YEONCHO_STREAM",
      "stageId": "S1",
      "areaId": "S1_YEONCHO_STREAM",
      "x": 5,
      "y": 11,
      "label": "물가 생태몬이 줄었다는 주민 제보를 듣는다.",
      "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
      "eventId": "S1_WATER_DECLINE",
      "npcId": null
    },
    "requiredFacing": "up",
    "rows": [
      [
        2777,
        1199,
        1222
      ],
      [
        2778,
        1200,
        1221
      ],
      [
        2779,
        1201,
        1220
      ],
      [
        2780,
        1202,
        1219
      ],
      [
        2781,
        1203,
        1218
      ],
      [
        2782,
        1204,
        1217
      ],
      [
        2783,
        1205,
        1216
      ],
      [
        2784,
        1206,
        1215
      ],
      [
        2785,
        1207,
        1214
      ],
      [
        2786,
        1208,
        1213
      ],
      [
        2787,
        1209,
        1212
      ],
      [
        2788,
        1210,
        1211
      ]
    ],
    "actorFoot": [
      1210,
      2740
    ],
    "actorFacing": "down",
    "sourceFacing": "down",
    "identity": "LOCAL_RESIDENT_M_BASE"
  },
  {
    "sceneId": "native:yeoncho:stream:bounded",
    "mapId": "world:area:S1_YEONCHO_STREAM",
    "revision": "YEONCHO_STREAM_RECOVERED_BOUND_CONTACT49_R1",
    "imageSHA": "9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357",
    "maskSHA": "89972322e104d85dd945cb9b1e3bbbeb7ebd88df9650644f03f5562135dfa699",
    "gameplayRevision": "YEONCHO_STREAM_FIXED_THREE_ROLES_R1",
    "pointId": "trainer:ROUTE_S1_01",
    "kind": "trainer",
    "sourceRow": {
      "id": "trainer:ROUTE_S1_01",
      "kind": "trainer",
      "mapId": "world:area:S1_YEONCHO_STREAM",
      "stageId": "S1",
      "areaId": "S1_YEONCHO_STREAM",
      "x": 26,
      "y": 14,
      "label": "다별",
      "placementStatus": "TRAINER_WORLD_20260927_V1",
      "trainerId": "ROUTE_S1_01",
      "npcId": null,
      "eventId": null,
      "required": false,
      "repeatable": false,
      "facing": "left",
      "routeRole": "optional-spur"
    },
    "requiredFacing": "right",
    "rows": [
      [
        2978,
        1702,
        1712
      ],
      [
        2979,
        1701,
        1712
      ],
      [
        2980,
        1700,
        1712
      ],
      [
        2981,
        1699,
        1712
      ],
      [
        2982,
        1698,
        1712
      ],
      [
        2983,
        1697,
        1712
      ],
      [
        2984,
        1696,
        1712
      ],
      [
        2985,
        1695,
        1712
      ],
      [
        2986,
        1694,
        1712
      ],
      [
        2987,
        1693,
        1712
      ],
      [
        2988,
        1692,
        1712
      ],
      [
        2989,
        1691,
        1712
      ],
      [
        2990,
        1690,
        1712
      ],
      [
        2991,
        1689,
        1712
      ],
      [
        2992,
        1688,
        1712
      ],
      [
        2993,
        1687,
        1712
      ],
      [
        2994,
        1686,
        1712
      ],
      [
        2995,
        1685,
        1712
      ],
      [
        2996,
        1684,
        1712
      ],
      [
        2997,
        1683,
        1712
      ],
      [
        2998,
        1682,
        1712
      ],
      [
        2999,
        1681,
        1712
      ],
      [
        3000,
        1680,
        1712
      ],
      [
        3001,
        1681,
        1712
      ],
      [
        3002,
        1682,
        1712
      ],
      [
        3003,
        1683,
        1712
      ],
      [
        3004,
        1684,
        1712
      ],
      [
        3005,
        1685,
        1712
      ],
      [
        3006,
        1686,
        1712
      ],
      [
        3007,
        1687,
        1712
      ],
      [
        3008,
        1688,
        1712
      ],
      [
        3009,
        1689,
        1712
      ],
      [
        3010,
        1690,
        1712
      ],
      [
        3011,
        1691,
        1712
      ],
      [
        3012,
        1692,
        1712
      ],
      [
        3013,
        1693,
        1712
      ],
      [
        3014,
        1694,
        1712
      ],
      [
        3015,
        1695,
        1712
      ],
      [
        3016,
        1696,
        1712
      ],
      [
        3017,
        1697,
        1712
      ],
      [
        3018,
        1698,
        1712
      ],
      [
        3019,
        1699,
        1712
      ],
      [
        3020,
        1700,
        1712
      ],
      [
        3021,
        1701,
        1712
      ],
      [
        3022,
        1702,
        1712
      ],
      [
        3023,
        1703,
        1712
      ],
      [
        3024,
        1704,
        1712
      ]
    ],
    "actorFoot": [
      1760,
      3000
    ],
    "actorFacing": "left",
    "sourceFacing": "left",
    "identity": "LOCAL_WALKER_F_VAR01"
  },
  {
    "sceneId": "native:yeoncho:stream:bounded",
    "mapId": "world:area:S1_YEONCHO_STREAM",
    "revision": "YEONCHO_STREAM_RECOVERED_BOUND_CONTACT49_R1",
    "imageSHA": "9309737253c4f43393162ab6b8ba9b316cb4f32ba030c9630e9c8ae01f152357",
    "maskSHA": "89972322e104d85dd945cb9b1e3bbbeb7ebd88df9650644f03f5562135dfa699",
    "gameplayRevision": "YEONCHO_STREAM_FIXED_THREE_ROLES_R1",
    "pointId": "trainer:ROUTE_S1_07",
    "kind": "trainer",
    "sourceRow": {
      "id": "trainer:ROUTE_S1_07",
      "kind": "trainer",
      "mapId": "world:area:S1_YEONCHO_STREAM",
      "stageId": "S1",
      "areaId": "S1_YEONCHO_STREAM",
      "x": 29,
      "y": 14,
      "label": "하현",
      "placementStatus": "TRAINER_WORLD_20260927_V1",
      "trainerId": "ROUTE_S1_07",
      "npcId": null,
      "eventId": null,
      "required": false,
      "repeatable": false,
      "facing": "left",
      "routeRole": "optional-spur"
    },
    "requiredFacing": "up",
    "rows": [
      [
        5037,
        1131,
        1180
      ],
      [
        5038,
        1131,
        1180
      ],
      [
        5039,
        1131,
        1180
      ],
      [
        5040,
        1131,
        1180
      ],
      [
        5041,
        1131,
        1180
      ],
      [
        5042,
        1131,
        1180
      ],
      [
        5043,
        1131,
        1180
      ],
      [
        5044,
        1131,
        1180
      ],
      [
        5045,
        1131,
        1180
      ],
      [
        5046,
        1131,
        1180
      ],
      [
        5047,
        1131,
        1180
      ],
      [
        5048,
        1131,
        1180
      ],
      [
        5049,
        1131,
        1180
      ],
      [
        5050,
        1131,
        1180
      ],
      [
        5051,
        1131,
        1180
      ],
      [
        5052,
        1131,
        1180
      ],
      [
        5053,
        1131,
        1180
      ],
      [
        5054,
        1131,
        1180
      ],
      [
        5055,
        1131,
        1180
      ],
      [
        5056,
        1131,
        1180
      ],
      [
        5057,
        1132,
        1179
      ],
      [
        5058,
        1133,
        1178
      ],
      [
        5059,
        1134,
        1177
      ],
      [
        5060,
        1135,
        1176
      ],
      [
        5061,
        1136,
        1175
      ],
      [
        5062,
        1137,
        1174
      ],
      [
        5063,
        1138,
        1173
      ],
      [
        5064,
        1139,
        1172
      ]
    ],
    "actorFoot": [
      1155,
      5000
    ],
    "actorFacing": "down",
    "sourceFacing": "left",
    "identity": "ANGLER_M_BASE"
  }
]);
