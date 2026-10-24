export default {
  "status": "BOUNDED_TUFT_ANIMATION_CANDIDATE",
  "logicalWorld": [
    1024,
    1536
  ],
  "sourceDensity": 1.4140625,
  "footprint": [
    [
      180,
      402
    ],
    [
      214,
      400
    ],
    [
      229,
      420
    ],
    [
      228,
      445
    ],
    [
      242,
      474
    ],
    [
      242,
      495
    ],
    [
      214,
      505
    ],
    [
      183,
      492
    ],
    [
      170,
      460
    ],
    [
      172,
      423
    ]
  ],
  "masters": [
    {
      "id": "A",
      "file": "TUFT_A_NATIVE_26_PAD4.png",
      "rawSize": [
        1401,
        1123
      ],
      "rawRoot": [
        720,
        1027
      ],
      "rawTipMeasurementY": 128,
      "rawToNativeUniformScale": 0.04089613459399333,
      "nativeSize": [
        66,
        54
      ],
      "nativeRoot": [
        33.445216907675196,
        46.000330228031146
      ],
      "logicalBladeHeight": 26,
      "nativeAlphaBounds": [
        6,
        7,
        61,
        49
      ],
      "transparentGuard": 4,
      "cleanupRectangleRaw": null,
      "cleanupPurpose": null,
      "sourceSHA256": "12cff6d1c3e37a252f684da51f310aa1c95c16a594a558e5e1f1ce836b179d36",
      "sha256": "0bb65957af57a41203b99031ce5c13d186c1193ec887d796834d26b5e7cc5834"
    },
    {
      "id": "B",
      "file": "TUFT_B_NATIVE_26_PAD4.png",
      "rawSize": [
        1402,
        1122
      ],
      "rawRoot": [
        717,
        990
      ],
      "rawTipMeasurementY": 306,
      "rawToNativeUniformScale": 0.05375091374269006,
      "nativeSize": [
        84,
        69
      ],
      "nativeRoot": [
        42.539405153508774,
        57.21340460526316
      ],
      "logicalBladeHeight": 26,
      "nativeAlphaBounds": [
        11,
        18,
        78,
        63
      ],
      "transparentGuard": 4,
      "cleanupRectangleRaw": [
        696,
        394,
        735,
        438
      ],
      "cleanupPurpose": "isolated generated bright alpha speck, not leaf pixels",
      "sourceSHA256": "458383c3fd119d29de7a268499318897833d1a4ab436fc94517f844d9d52665c",
      "sha256": "e64941f0e2fda76c5f7574071fbd9b3066b2fef2ea6f2a61a369e10573e751fb"
    }
  ],
  "instances": [
    {
      "id": "tuft00",
      "master": "A",
      "root": [
        188,
        414
      ],
      "height": 26,
      "mirror": false
    },
    {
      "id": "tuft01",
      "master": "B",
      "root": [
        211,
        416
      ],
      "height": 24,
      "mirror": false
    },
    {
      "id": "tuft02",
      "master": "A",
      "root": [
        180,
        439
      ],
      "height": 25,
      "mirror": true
    },
    {
      "id": "tuft03",
      "master": "A",
      "root": [
        202,
        442
      ],
      "height": 28,
      "mirror": false
    },
    {
      "id": "tuft04",
      "master": "B",
      "root": [
        224,
        444
      ],
      "height": 25,
      "mirror": false
    },
    {
      "id": "tuft05",
      "master": "A",
      "root": [
        182,
        464
      ],
      "height": 24,
      "mirror": false
    },
    {
      "id": "tuft06",
      "master": "A",
      "root": [
        206,
        467
      ],
      "height": 27,
      "mirror": true
    },
    {
      "id": "tuft07",
      "master": "B",
      "root": [
        231,
        469
      ],
      "height": 26,
      "mirror": false
    },
    {
      "id": "tuft08",
      "master": "A",
      "root": [
        189,
        489
      ],
      "height": 25,
      "mirror": false
    },
    {
      "id": "tuft09",
      "master": "A",
      "root": [
        214,
        492
      ],
      "height": 27,
      "mirror": false
    },
    {
      "id": "tuft10",
      "master": "B",
      "root": [
        235,
        492
      ],
      "height": 24,
      "mirror": true
    },
    {
      "id": "tuft11",
      "master": "A",
      "root": [
        214,
        504
      ],
      "height": 26,
      "mirror": false
    },
    {
      "id": "tuft12",
      "master": "A",
      "root": [
        228,
        497
      ],
      "height": 23,
      "mirror": false
    }
  ],
  "heightRange": [
    20,
    28
  ],
  "nominalHeight": 26,
  "rootAnchor": "lowest painted central root contact, manually measured; fixed under shear",
  "depth": "draw roots behind actor if rootY < actor footY; front otherwise, only occupied patch contact gets front selection",
  "maxNearbyImpulsedTufts": 4,
  "impulseRadiusLogical": 34,
  "maxTipDisplacementLogical": 3.2,
  "settleSeconds": 0.44,
  "encountersActive": false,
  "canonicalAreaId": null,
  "soundAsset": null,
  "audioEnabled": false,
  "fixtureMotionIsNotCollisionApproval": true
};
