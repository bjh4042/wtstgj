// Generated from fixed selected image + original paired contracts. No arbitrary route registration.
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o)};
export const FIXED_REGISTRATION=freeze([
  {
    "pointId": "area-entry:S4_POW_CAMP_PARK_EDGE",
    "sourceRow": {
      "id": "area-entry:S4_POW_CAMP_PARK_EDGE",
      "kind": "warp",
      "mapId": "world:hub:S4",
      "stageId": "S4",
      "areaId": null,
      "x": 9,
      "y": 3,
      "label": "포로수용소유적공원 외곽 녹지",
      "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
      "targetMapId": "world:area:S4_POW_CAMP_PARK_EDGE",
      "target": [
        3,
        12
      ],
      "gate": null,
      "exit": false,
      "reverseId": "area-entry:S4_POW_CAMP_PARK_EDGE:return"
    },
    "sceneId": "world:hub:S4",
    "mapId": "world:hub:S4",
    "revision": "GOHYEON_S4_GREEN_SIGN_LOCAL_FLOOR_NATIVE_FRONT_R2",
    "version": 1,
    "states": {
      "OPEN": {
        "imageSHA": "038580aac4dba41ce4c0712a76bb8977766b5e11b2a0b8507070104ec4b6eafd",
        "maskSHA": "b2f15b237007f2a0a28fa50009db69dcabbd6b0d9f22031bb00b058b1bba5da2"
      },
      "CLOSED": {
        "imageSHA": "3db97399291159f05c050578691023efa43204699f603fe7017498157669e8f4",
        "maskSHA": "98d5ece9a02ae8e79aba916be7d5e81a5ee2770cca3b9ead38375d7b1856c21a"
      }
    },
    "width": 4294,
    "height": 2400,
    "readFoot": [
      500,
      2128
    ],
    "facing": "up",
    "anchor": [
      500,
      2080
    ],
    "route": {
      "from": "world:hub:S4",
      "to": "world:area:S4_POW_CAMP_PARK_EDGE",
      "cell": [
        3,
        12
      ],
      "foot": [
        532,
        879
      ],
      "facing": "down"
    },
    "approach": {
      "type": "SELECTED_NATIVE_FRONT_R2",
      "selectionSHA": "c52123a3085a6a0dcfd5534e65e45083b6ba0fe8d130f887d2df99b9b9a68adf",
      "facing": "up",
      "anchor": [
        500,
        2080
      ],
      "maxDistance": 48,
      "rows": [
        [
          2107,
          482,
          519
        ],
        [
          2108,
          482,
          519
        ],
        [
          2109,
          482,
          519
        ],
        [
          2110,
          482,
          519
        ],
        [
          2111,
          483,
          518
        ],
        [
          2112,
          484,
          517
        ],
        [
          2113,
          485,
          516
        ],
        [
          2114,
          486,
          515
        ],
        [
          2115,
          487,
          514
        ],
        [
          2116,
          488,
          513
        ],
        [
          2117,
          489,
          512
        ],
        [
          2118,
          490,
          511
        ],
        [
          2119,
          491,
          510
        ],
        [
          2120,
          492,
          509
        ],
        [
          2121,
          493,
          508
        ],
        [
          2122,
          494,
          507
        ],
        [
          2123,
          495,
          506
        ],
        [
          2124,
          496,
          505
        ],
        [
          2125,
          497,
          504
        ],
        [
          2126,
          498,
          503
        ],
        [
          2127,
          499,
          502
        ],
        [
          2128,
          500,
          501
        ]
      ]
    }
  },
  {
    "pointId": "area-entry:S4_POW_CAMP_PARK_EDGE:return",
    "sourceRow": {
      "id": "area-entry:S4_POW_CAMP_PARK_EDGE:return",
      "kind": "warp",
      "mapId": "world:area:S4_POW_CAMP_PARK_EDGE",
      "stageId": "S4",
      "areaId": "S4_POW_CAMP_PARK_EDGE",
      "x": 2,
      "y": 12,
      "label": "고현",
      "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
      "targetMapId": "world:hub:S4",
      "target": [
        8,
        3
      ],
      "gate": null,
      "reverseId": "area-entry:S4_POW_CAMP_PARK_EDGE"
    },
    "sceneId": "world:area:S4_POW_CAMP_PARK_EDGE",
    "mapId": "world:area:S4_POW_CAMP_PARK_EDGE",
    "revision": "ROOT_SELECTED_POW_LOCAL_BOUNDARY_LIGHTING_20261028_061220",
    "version": 1,
    "imageSHA": "f3d270e23262cde19d56f88b3dffa7330a25e11140bffbf2bcd8345ab87f36d8",
    "maskSHA": "8b8f2f9ff75400aecba9fd4ed0d1ff6a3898da74ed12195688db33fde8e7f922",
    "width": 1536,
    "height": 1024,
    "readFoot": [
      532,
      927
    ],
    "facing": "down",
    "anchor": [
      532,
      975
    ],
    "route": {
      "from": "world:area:S4_POW_CAMP_PARK_EDGE",
      "to": "world:hub:S4",
      "cell": [
        8,
        3
      ],
      "foot": [
        500,
        2224
      ],
      "facing": "down"
    },
    "approach": {
      "type": "SELECTED_NATIVE_FRONT_R2",
      "selectionSHA": "c52123a3085a6a0dcfd5534e65e45083b6ba0fe8d130f887d2df99b9b9a68adf",
      "facing": "down",
      "anchor": [
        532,
        975
      ],
      "maxDistance": 48,
      "rows": [
        [
          927,
          532,
          533
        ],
        [
          928,
          531,
          534
        ],
        [
          929,
          530,
          535
        ],
        [
          930,
          529,
          536
        ],
        [
          931,
          528,
          537
        ],
        [
          932,
          527,
          538
        ],
        [
          933,
          526,
          539
        ],
        [
          934,
          525,
          540
        ],
        [
          935,
          524,
          541
        ],
        [
          936,
          523,
          542
        ],
        [
          937,
          522,
          543
        ],
        [
          938,
          521,
          544
        ],
        [
          939,
          520,
          545
        ],
        [
          940,
          519,
          546
        ],
        [
          941,
          518,
          547
        ],
        [
          942,
          517,
          548
        ],
        [
          943,
          516,
          549
        ],
        [
          944,
          515,
          550
        ],
        [
          945,
          514,
          551
        ],
        [
          946,
          514,
          551
        ],
        [
          947,
          514,
          551
        ],
        [
          948,
          514,
          551
        ],
        [
          949,
          514,
          551
        ],
        [
          950,
          514,
          551
        ],
        [
          951,
          514,
          551
        ],
        [
          952,
          514,
          551
        ],
        [
          953,
          514,
          551
        ],
        [
          954,
          514,
          551
        ],
        [
          955,
          514,
          551
        ],
        [
          956,
          514,
          551
        ],
        [
          957,
          514,
          551
        ],
        [
          958,
          514,
          551
        ],
        [
          959,
          514,
          551
        ],
        [
          960,
          514,
          551
        ],
        [
          961,
          514,
          551
        ],
        [
          962,
          514,
          551
        ],
        [
          963,
          514,
          551
        ],
        [
          964,
          514,
          551
        ],
        [
          965,
          514,
          551
        ],
        [
          966,
          514,
          551
        ],
        [
          967,
          514,
          551
        ],
        [
          968,
          514,
          551
        ],
        [
          969,
          514,
          551
        ],
        [
          970,
          514,
          551
        ],
        [
          971,
          514,
          551
        ],
        [
          972,
          514,
          551
        ],
        [
          973,
          514,
          551
        ],
        [
          974,
          514,
          551
        ],
        [
          975,
          514,
          551
        ],
        [
          976,
          514,
          551
        ],
        [
          977,
          514,
          551
        ],
        [
          978,
          514,
          551
        ],
        [
          979,
          514,
          551
        ],
        [
          980,
          514,
          551
        ],
        [
          981,
          514,
          551
        ],
        [
          982,
          514,
          551
        ],
        [
          983,
          514,
          551
        ],
        [
          984,
          514,
          551
        ],
        [
          985,
          514,
          551
        ],
        [
          986,
          514,
          551
        ],
        [
          987,
          514,
          551
        ],
        [
          988,
          514,
          551
        ],
        [
          989,
          514,
          551
        ],
        [
          990,
          514,
          551
        ],
        [
          991,
          514,
          551
        ],
        [
          992,
          514,
          551
        ],
        [
          993,
          514,
          551
        ],
        [
          994,
          514,
          551
        ],
        [
          995,
          514,
          551
        ],
        [
          996,
          514,
          551
        ],
        [
          997,
          514,
          551
        ],
        [
          998,
          514,
          551
        ],
        [
          999,
          514,
          551
        ],
        [
          1000,
          514,
          551
        ],
        [
          1001,
          514,
          551
        ],
        [
          1002,
          514,
          551
        ],
        [
          1003,
          514,
          551
        ],
        [
          1004,
          514,
          551
        ],
        [
          1005,
          514,
          551
        ]
      ]
    }
  },
  {
    "pointId": "area-entry:S4_GOHYEON_GREENBELT",
    "sourceRow": {
      "id": "area-entry:S4_GOHYEON_GREENBELT",
      "kind": "warp",
      "mapId": "world:hub:S4",
      "stageId": "S4",
      "areaId": null,
      "x": 4,
      "y": 3,
      "label": "고현 생활권 녹지",
      "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
      "targetMapId": "world:area:S4_GOHYEON_GREENBELT",
      "target": [
        3,
        12
      ],
      "gate": null,
      "exit": false,
      "reverseId": "area-entry:S4_GOHYEON_GREENBELT:return"
    },
    "sceneId": "world:hub:S4",
    "mapId": "world:hub:S4",
    "revision": "GOHYEON_S4_GREEN_SIGN_LOCAL_FLOOR_NATIVE_FRONT_R2",
    "version": 1,
    "states": {
      "OPEN": {
        "imageSHA": "038580aac4dba41ce4c0712a76bb8977766b5e11b2a0b8507070104ec4b6eafd",
        "maskSHA": "b2f15b237007f2a0a28fa50009db69dcabbd6b0d9f22031bb00b058b1bba5da2"
      },
      "CLOSED": {
        "imageSHA": "3db97399291159f05c050578691023efa43204699f603fe7017498157669e8f4",
        "maskSHA": "98d5ece9a02ae8e79aba916be7d5e81a5ee2770cca3b9ead38375d7b1856c21a"
      }
    },
    "width": 4294,
    "height": 2400,
    "readFoot": [
      2792,
      286
    ],
    "approach": {
      "type": "SELECTED_NATIVE_FRONT_R2",
      "selectionSHA": "4c1c085e5ee3620550eb06c045c5a070c6509f37994ba12c2d5207f4ce088995",
      "facing": "left",
      "anchor": [
        2744,
        286
      ],
      "maxDistance": 80,
      "rows": [
        [
          268,
          2788,
          2807
        ],
        [
          269,
          2788,
          2808
        ],
        [
          270,
          2788,
          2809
        ],
        [
          271,
          2788,
          2810
        ],
        [
          272,
          2788,
          2811
        ],
        [
          273,
          2788,
          2812
        ],
        [
          274,
          2788,
          2813
        ],
        [
          275,
          2788,
          2814
        ],
        [
          276,
          2788,
          2815
        ],
        [
          277,
          2788,
          2816
        ],
        [
          278,
          2788,
          2817
        ],
        [
          279,
          2788,
          2818
        ],
        [
          280,
          2788,
          2819
        ],
        [
          281,
          2788,
          2820
        ],
        [
          282,
          2788,
          2821
        ],
        [
          283,
          2788,
          2822
        ],
        [
          284,
          2788,
          2823
        ],
        [
          285,
          2788,
          2824
        ],
        [
          286,
          2788,
          2825
        ],
        [
          287,
          2788,
          2824
        ],
        [
          288,
          2788,
          2823
        ],
        [
          289,
          2788,
          2822
        ],
        [
          290,
          2788,
          2821
        ],
        [
          291,
          2788,
          2820
        ],
        [
          292,
          2788,
          2819
        ],
        [
          293,
          2788,
          2818
        ],
        [
          294,
          2788,
          2817
        ],
        [
          295,
          2788,
          2816
        ],
        [
          296,
          2788,
          2815
        ],
        [
          297,
          2788,
          2814
        ],
        [
          298,
          2788,
          2813
        ],
        [
          299,
          2788,
          2812
        ],
        [
          300,
          2788,
          2811
        ],
        [
          301,
          2788,
          2810
        ],
        [
          302,
          2788,
          2809
        ],
        [
          303,
          2788,
          2808
        ],
        [
          304,
          2788,
          2807
        ]
      ]
    },
    "facing": "left",
    "anchor": [
      2744,
      286
    ],
    "route": {
      "from": "world:hub:S4",
      "to": "world:area:S4_GOHYEON_GREENBELT",
      "cell": [
        3,
        12
      ],
      "foot": [
        120,
        610
      ],
      "facing": "down"
    }
  },
  {
    "pointId": "area-entry:S4_GOHYEON_GREENBELT:return",
    "sourceRow": {
      "id": "area-entry:S4_GOHYEON_GREENBELT:return",
      "kind": "warp",
      "mapId": "world:area:S4_GOHYEON_GREENBELT",
      "stageId": "S4",
      "areaId": "S4_GOHYEON_GREENBELT",
      "x": 2,
      "y": 12,
      "label": "고현",
      "placementStatus": "DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY",
      "targetMapId": "world:hub:S4",
      "target": [
        3,
        3
      ],
      "gate": null,
      "reverseId": "area-entry:S4_GOHYEON_GREENBELT"
    },
    "sceneId": "world:area:S4_GOHYEON_GREENBELT",
    "mapId": "world:area:S4_GOHYEON_GREENBELT",
    "revision": "RECOVERED_GREENBELT_V5_1_SELECTED_ENVIRONMENT_R2",
    "version": 1,
    "imageSHA": "1d2542e68a36b9aed9fe9a0ddfed917f401abac580d89fb8fcbbd4a470c9dc77",
    "maskSHA": "d0990fca19a63e687b623ca357897b189c7a91d4b619bbb2ea8d46f2ee2ad512",
    "width": 1536,
    "height": 1024,
    "readFoot": [
      108,
      610
    ],
    "facing": "left",
    "anchor": [
      60,
      610
    ],
    "route": {
      "from": "world:area:S4_GOHYEON_GREENBELT",
      "to": "world:hub:S4",
      "cell": [
        3,
        3
      ],
      "foot": [
        2840,
        388
      ],
      "facing": "down"
    },
    "approach": {
      "type": "SELECTED_NATIVE_FRONT_R2",
      "selectionSHA": "c52123a3085a6a0dcfd5534e65e45083b6ba0fe8d130f887d2df99b9b9a68adf",
      "facing": "left",
      "anchor": [
        60,
        610
      ],
      "maxDistance": 48,
      "rows": [
        [
          598,
          24,
          97
        ],
        [
          599,
          24,
          98
        ],
        [
          600,
          24,
          99
        ],
        [
          601,
          24,
          100
        ],
        [
          602,
          24,
          101
        ],
        [
          603,
          24,
          102
        ],
        [
          604,
          24,
          103
        ],
        [
          605,
          24,
          104
        ],
        [
          606,
          24,
          105
        ],
        [
          607,
          24,
          106
        ],
        [
          608,
          24,
          107
        ],
        [
          609,
          24,
          108
        ],
        [
          610,
          24,
          109
        ],
        [
          611,
          24,
          108
        ],
        [
          612,
          24,
          107
        ],
        [
          613,
          24,
          106
        ],
        [
          614,
          24,
          105
        ],
        [
          615,
          24,
          104
        ],
        [
          616,
          24,
          103
        ],
        [
          617,
          24,
          102
        ],
        [
          618,
          24,
          101
        ],
        [
          619,
          24,
          100
        ],
        [
          620,
          24,
          99
        ],
        [
          621,
          24,
          98
        ],
        [
          622,
          24,
          97
        ]
      ]
    }
  }
]);
