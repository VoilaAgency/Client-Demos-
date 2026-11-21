'use strict';
const stageConfig={
  "title": "Basspod",
  "slug": "basspod",
  "scene": "basspod",
  "hasCable": false,
  "scaleNote": "Scale uses the labeled 20 \u00d7 20 ft ADA deck (about 80 \u00d7 80 source pixels), cross-checked against the 20 ft FOH footprint. PNG tracing is approximate; all unmarked heights require confirmation.",
  "scaleStatus": "ADA / 20 ft reference",
  "stageHeight": 6,
  "defaultTarget": 11.5,
  "defaultScale": 0.25,
  "mainDeck": [
    [
      1221,
      1310
    ],
    [
      981,
      1310
    ],
    [
      981,
      695
    ],
    [
      1221,
      695
    ]
  ],
  "aisleWidth": 0,
  "sourceCameraMarkers": [
    {
      "point": [
        541,
        1037
      ],
      "label": "CAM 1"
    },
    {
      "point": [
        541,
        949
      ],
      "label": "CAM 2"
    },
    {
      "point": [
        953,
        1126
      ],
      "label": "CAM 3"
    },
    {
      "point": [
        961,
        915
      ],
      "label": "CAM 4"
    },
    {
      "point": [
        1001,
        1091
      ],
      "label": "CAM 5"
    },
    {
      "point": [
        332,
        1354
      ],
      "label": "CAM 6"
    },
    {
      "point": [
        988,
        1000
      ],
      "label": "CAM 7"
    },
    {
      "point": [
        384,
        591
      ],
      "label": "CAM 8"
    }
  ],
  "paths": [
    [
      [
        933,
        1192
      ],
      [
        661,
        1192
      ],
      [
        382,
        1317
      ],
      [
        382,
        1558
      ]
    ]
  ],
  "vipAreas": [
    {
      "label": "VIP FLOOR",
      "footprint": [
        [
          928,
          1685
        ],
        [
          396,
          1685
        ],
        [
          396,
          1337
        ],
        [
          661,
          1210
        ],
        [
          928,
          1210
        ]
      ]
    }
  ],
  "towers": [],
  "surroundPanels": [],
  "roof": null,
  "trusses": []
};
const plot2026={"origin": [1000, 1000], "stageFront": 979, "rail": 931, "stageEnds": [695, 1310], "audience": [[926, 1162], [661, 1162], [351, 1302], [286, 1414], [286, 1544], [-349, 1544], [-349, 1102], [-264, 1102], [-264, 995], [-349, 995], [-349, 660], [-134, 589], [921, 589]], "foh": [[554, 1055], [471, 1055], [471, 938], [554, 938]], "divider": [], "crossAisle": [], "camera1": [541, 1037], "camera2": [541, 949], "crane": [332, 1354], "stageFootprint": [[1221, 1310], [981, 1310], [981, 695], [1221, 695]]};
const siteBoundary=[[1286, 1326], [936, 1325], [936, 1700], [356, 1700], [356, 1560], [-352, 1560], [-352, 585], [921, 570], [1286, 480]];
const productionDecks=[{"footprint": [[554, 1055], [471, 1055], [471, 938], [554, 938]], "label": "FOH / CAM 1 + 2", "height": 7, "equipmentStacks": 3}, {"footprint": [[471, 1055], [271, 1055], [271, 938], [471, 938]], "label": "FOH / PRODUCTION", "height": 2, "equipmentStacks": 3}, {"footprint": [[365, 1403], [293, 1403], [293, 1322], [365, 1322]], "label": "JIB / CAM 6", "height": 2, "equipmentStacks": 0}, {"footprint": [[-271, 1095], [-351, 1095], [-351, 1015], [-271, 1015]], "label": "ADA / 20 \u00d7 20 FT", "height": 2, "equipmentStacks": 0}, {"footprint": [[401, 603], [369, 603], [369, 580], [401, 580]], "label": "REVERSE PTZ / PROPOSED", "height": 1, "equipmentStacks": 0}];
const vipDecks=[];
const cableRoute=[[1010, 1000], [990, 1000]];
const defaultScale=stageConfig.defaultScale;
const defaultCable={travel:50,height:35,pan:0,tilt:-5,lockDJ:false};
const worldPoint=([px,py],scale)=>[(py-1000)*scale,(1000-px)*scale];
const frontAt=scale=>(1000-plot2026.stageFront)*scale;
const railAt=scale=>(1000-plot2026.rail)*scale;
const widthAt=scale=>(plot2026.stageEnds[1]-plot2026.stageEnds[0])*scale;
const presets={
  "cam1": {
    "name": "2026 / CAM 1 \u00b7 FOH upper",
    "source": [
      541,
      1037
    ],
    "sensor": 36,
    "lenses": [
      35,
      100,
      435
    ]
  },
  "cam2": {
    "name": "2026 / CAM 2 \u00b7 FOH lower",
    "source": [
      541,
      949
    ],
    "sensor": 36,
    "lenses": [
      35,
      100,
      435
    ]
  },
  "cam3": {
    "name": "2026 / CAM 3 \u00b7 Stage L pit \u00b7 wireless",
    "source": [
      953,
      1126
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
      961,
      915
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
      1001,
      1091
    ],
    "sensor": 36,
    "lenses": [
      30,
      60,
      90
    ]
  },
  "cam6": {
    "name": "2026 / CAM 6 \u00b7 40 ft jib base",
    "source": [
      332,
      1354
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
      988,
      1000
    ],
    "sensor": 36,
    "lenses": [
      16,
      24,
      35
    ]
  },
  "cam8": {
    "name": "2026 / CAM 8 \u00b7 reverse PTZ \u00b7 proposed",
    "source": [
      384,
      591
    ],
    "sensor": 36,
    "lenses": [
      16,
      35,
      70
    ],
    "aimSource": [
      1000,
      1000
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
const heights={"cam1": [12.5, 11.5], "cam2": [12.5, 11.5], "cam3": [5.5, 11.5], "cam4": [5.5, 11.5], "cam5": [11.5, 11.5], "cam6": [24, 11.5], "cam7": [9.5, 11.5], "cam8": [12, 11.5], "pitCrowd": [5.5, 5.6], "deck": [11.5, 11.5], "deckCenter": [11.5, 5.6]};
