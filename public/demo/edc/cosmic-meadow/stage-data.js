'use strict';
const stageConfig={
  "title": "Cosmic Meadow",
  "slug": "cosmic-meadow",
  "scene": "cosmic",
  "hasCable": false,
  "scaleNote": "Scale uses the labeled 16 \u00d7 16 ft Stage B footprint (76 source pixels). Deck, scenic, FOH and flag-stand heights are working estimates.",
  "scaleStatus": "Stage B / 16 ft reference",
  "stageHeight": 7.25,
  "defaultTarget": 12.75,
  "defaultScale": 0.21052631578947367,
  "mainDeck": [
    [
      1016,
      1520
    ],
    [
      1016,
      505
    ],
    [
      1149,
      505
    ],
    [
      1149,
      1520
    ]
  ],
  "aisleWidth": 0,
  "sourceCameraMarkers": [
    {
      "point": [
        547,
        1296
      ],
      "label": "CAM 1"
    },
    {
      "point": [
        188,
        995
      ],
      "label": "CAM 2"
    },
    {
      "point": [
        971,
        1124
      ],
      "label": "CAM 3"
    },
    {
      "point": [
        987,
        852
      ],
      "label": "CAM 4"
    },
    {
      "point": [
        1027,
        948
      ],
      "label": "CAM 5"
    },
    {
      "point": [
        496,
        784
      ],
      "label": "CAM 6"
    },
    {
      "point": [
        992,
        1000
      ],
      "label": "CAM 7"
    },
    {
      "point": [
        493,
        992
      ],
      "label": "CAM 8"
    }
  ],
  "paths": [],
  "vipAreas": [
    {
      "label": "VIP FLOOR",
      "footprint": [
        [
          741,
          843
        ],
        [
          741,
          353
        ],
        [
          929,
          341
        ],
        [
          929,
          843
        ]
      ]
    }
  ],
  "towers": [
    {
      "point": [
        439,
        1240
      ],
      "height": 32,
      "width": 6
    },
    {
      "point": [
        440,
        737
      ],
      "height": 32,
      "width": 6
    },
    {
      "point": [
        520,
        1739
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        635,
        1795
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        812,
        1756
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        928,
        1672
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        509,
        324
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        636,
        179
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        831,
        208
      ],
      "height": 30,
      "width": 3
    },
    {
      "point": [
        942,
        317
      ],
      "height": 30,
      "width": 3
    }
  ],
  "surroundPanels": [],
  "roof": null,
  "trusses": []
};
const plot2026={"origin": [1000, 1000], "stageFront": 968, "rail": 943, "stageEnds": [501, 1514], "audience": [[947, 1618], [929, 1676], [881, 1711], [743, 1751], [577, 1780], [468, 1747], [441, 1606], [423, 1366], [415, 1096], [415, 891], [439, 651], [454, 411], [507, 245], [614, 191], [756, 163], [886, 207], [947, 341]], "foh": [[206, 1129], [194, 1108], [197, 878], [220, 863], [261, 885], [261, 1111], [243, 1128]], "divider": [], "crossAisle": [], "camera1": [547, 1296], "camera2": [188, 995], "crane": [496, 784], "stageFootprint": [[1041, 1523], [980, 1485], [959, 1401], [983, 1316], [1008, 1228], [966, 1127], [950, 1041], [962, 946], [1008, 819], [990, 723], [971, 646], [986, 544], [1045, 496], [1149, 511], [1158, 789], [1235, 791], [1234, 1164], [1162, 1165], [1149, 1527]]};
const siteBoundary=[[146, 1819], [118, 1331], [113, 1001], [126, 651], [216, 211], [338, 141], [871, 141], [1061, 281], [1211, 401], [1224, 1541], [1101, 1781], [867, 1845], [451, 1845]];
const productionDecks=[{"footprint": [[206, 1129], [194, 1108], [197, 878], [220, 863], [261, 885], [261, 1111], [243, 1128]], "label": "FOH / flag stand", "height": 8, "equipmentStacks": 3}, {"footprint": [[450, 1292], [450, 1185], [567, 1185], [567, 1292]], "label": "ADA / CAM 1", "height": 2, "equipmentStacks": 0}, {"footprint": [[423, 1034], [423, 958], [499, 958], [499, 1034]], "label": "Stage B / PTZ", "height": 2, "equipmentStacks": 0}, {"footprint": [[417, 795], [417, 699], [437, 677], [494, 677], [516, 700], [516, 795]], "label": "JIB / CAM 6", "height": 2, "equipmentStacks": 1}];
const vipDecks=[{"label": "SPEEDWAY GRANDSTAND", "corners": [[144, 161], [144, 1821], [29, 1821], [29, 161]], "heights": [14, 21, 28, 35]}];
const cableRoute=[[1010, 1000], [990, 1000]];
const defaultScale=stageConfig.defaultScale;
const defaultCable={travel:50,height:35,pan:0,tilt:-5,lockDJ:false};
const worldPoint=([px,py],scale)=>[(py-1000)*scale,(1000-px)*scale];
const frontAt=scale=>(1000-plot2026.stageFront)*scale;
const railAt=scale=>(1000-plot2026.rail)*scale;
const widthAt=scale=>(plot2026.stageEnds[1]-plot2026.stageEnds[0])*scale;
const presets={
  "cam1": {
    "name": "2026 / CAM 1 \u00b7 ADA deck \u00b7 proposed",
    "source": [
      547,
      1296
    ],
    "sensor": 36,
    "lenses": [
      35,
      100,
      435
    ]
  },
  "cam2": {
    "name": "2026 / CAM 2 \u00b7 elevated flag stand \u00b7 proposed",
    "source": [
      188,
      995
    ],
    "sensor": 36,
    "lenses": [
      35,
      100,
      435
    ]
  },
  "cam3": {
    "name": "2026 / CAM 3 \u00b7 Stage L pit",
    "source": [
      971,
      1124
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "cam4": {
    "name": "2026 / CAM 4 \u00b7 Stage R pit",
    "source": [
      987,
      852
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "cam5": {
    "name": "2026 / CAM 5 \u00b7 onstage handheld",
    "source": [
      1027,
      948
    ],
    "sensor": 36,
    "lenses": [
      30,
      60,
      90
    ]
  },
  "cam6": {
    "name": "2026 / CAM 6 \u00b7 40 ft jib \u00b7 proposed base",
    "source": [
      496,
      784
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "cam7": {
    "name": "2026 / CAM 7 \u00b7 DJ desk lockoff",
    "source": [
      992,
      1000
    ],
    "sensor": 36,
    "lenses": [
      16,
      24,
      35
    ],
    "aimSource": [
      1000,
      1000
    ]
  },
  "cam8": {
    "name": "2026 / CAM 8 \u00b7 Stage B reverse PTZ \u00b7 proposed",
    "source": [
      493,
      992
    ],
    "sensor": 36,
    "lenses": [
      16,
      35,
      70
    ],
    "aimSource": [
      226,
      992
    ]
  },
  "pitCrowd": {
    "name": "Pit / crowd reverse",
    "camera": [
      0,
      0
    ],
    "aim": [
      0,
      35
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "deck": {
    "name": "Deck / off-axis",
    "camera": [
      -10,
      -8
    ],
    "aim": [
      0,
      0
    ],
    "sensor": 36,
    "lenses": [
      30,
      60,
      90
    ]
  },
  "deckCenter": {
    "name": "Deck / center reverse",
    "camera": [
      0,
      -10
    ],
    "aim": [
      0,
      35
    ],
    "sensor": 36,
    "lenses": [
      30,
      60,
      90
    ]
  }
};
const heights={"cam1": [7.5, 12.75], "cam2": [14, 12.75], "cam3": [5.5, 12.75], "cam4": [5.5, 12.75], "cam5": [12.75, 12.75], "cam6": [24, 12.75], "cam7": [10.6, 12.5], "cam8": [8, 5.6], "pitCrowd": [5.5, 5.6], "deck": [12.75, 12.75], "deckCenter": [12.75, 5.6]};
