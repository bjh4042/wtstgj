// @ts-check
// Native-pixel map logic; independent of sprite assets.
export const GOLDEN_MAP_DATA={
  "outdoor": {
    "walkable": [
      [665, 776, 178, 74],
      [
        28,
        65,
        1074,
        523
      ],
      [
        28,
        550,
        755,
        98
      ],
      [
        267,
        618,
        92,
        145
      ],
      [
        350,
        680,
        477,
        60
      ],
      [
        834,
        638,
        140,
        59
      ],
      [
        588,
        709,
        80,
        229
      ]
    ],
    "solids": [
      {
        "id": "ecocenter",
        "rect": [
          522,
          0,
          462,
          350
        ]
      },
      {
        "id": "npc_left",
        "rect": [
          120,
          340,
          60,
          24
        ]
      },
      {
        "id": "lamp",
        "rect": [
          538,
          534,
          39,
          24
        ]
      },
      {
        "id": "sign_left",
        "rect": [
          98,
          518,
          224,
          32
        ]
      },
      {
        "id": "sign_right",
        "rect": [
          995,
          409,
          104,
          28
        ]
      },
      {
        "id": "fence_0",
        "rect": [
          0,
          527,
          80,
          24
        ]
      },
      {
        "id": "fence_1",
        "rect": [
          325,
          527,
          195,
          24
        ]
      },
      {
        "id": "fence_2",
        "rect": [
          382,
          138,
          131,
          22
        ]
      },
      {
        "id": "fence_3",
        "rect": [
          984,
          213,
          121,
          22
        ]
      },
      {
        "id": "tree",
        "rect": [
          411,
          58,
          63,
          26
        ]
      },
      {
        "id": "tree_west",
        "rect": [
          0,
          0,
          49,
          183
        ]
      },
      {
        "id": "tree_north",
        "rect": [
          76,
          0,
          299,
          21
        ]
      },
      {
        "id": "mailbox",
        "rect": [
          451,
          325,
          52,
          24
        ]
      },
      {
        "id": "npc_fishing",
        "rect": [
          815,
          767,
          62,
          22
        ]
      }
    ]
  },
  "interior": {
    "walkable": [
      [
        326,
        275,
        884,
        674
      ]
    ],
    "solids": [
      {
        "id": "0",
        "rect": [
          404,
          382,
          288,
          158
        ]
      },
      {
        "id": "1",
        "rect": [
          852,
          382,
          192,
          150
        ]
      },
      {
        "id": "2",
        "rect": [
          738,
          310,
          60,
          24
        ]
      },
      {
        "id": "3",
        "rect": [
          432,
          585,
          76,
          54
        ]
      }
    ]
  },
  "doors": {
    "outside": {
      "rect": [
        672,
        345,
        116,
        26
      ],
      "spawn": [
        765,
        395
      ]
    },
    "inside": {
      "rect": [
        680,
        926,
        170,
        23
      ],
      "spawn": [
        768,
        869
      ]
    }
  },
  "entities": [
    {
      "id": "npc_left",
      "map": "outdoor",
      "position": [
        150,
        363
      ],
      "facing": "right",
      "radius": 135,
      "dialogue": "탐험가: 거제의 숲과 바다를 함께 살펴봐요!\n방향키 또는 WASD로 걷고, Z로 이야기를 나눠요."
    },
    {
      "id": "npc_fishing",
      "map": "outdoor",
      "position": [
        848,
        790
      ],
      "facing": "right",
      "radius": 135,
      "dialogue": "낚시꾼: 오늘 바다는 참 잔잔하네요.\n방파제 계단을 따라오면 이 부두에 닿아요."
    },
    {
      "id": "researcher",
      "map": "interior",
      "position": [
        768,
        334
      ],
      "facing": "down",
      "radius": 135,
      "action": "heal",
      "dialogue": "윤 연구원: 거제 생태센터에 잘 왔어요!\n생태친구의 기운을 회복해 드릴게요."
    }
  ],
  "grassZones": [
    [
      0,
      40,
      365,
      337
    ]
  ]
};
