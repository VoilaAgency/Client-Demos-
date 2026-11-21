'use strict';
const stageConfig={
  "title": "Quantum Valley",
  "slug": "quantum-valley",
  "scene": "quantum",
  "hasCable": false,
  "scaleNote": "Scale uses the labeled 16 \u00d7 22 ft FOH deck (about 80 \u00d7 110 source pixels), cross-checked against the 16 \u00d7 16 ft ADA deck. PNG tracing is approximate; roof, rig and platform heights remain estimates.",
  "scaleStatus": "FOH / 16 \u00d7 22 ft reference",
  "stageHeight": 6,
  "defaultTarget": 11.5,
  "defaultScale": 0.2,
  "mainDeck": [
    [
      965,
      1324
    ],
    [
      965,
      678
    ],
    [
      1096,
      678
    ],
    [
      1096,
      1324
    ]
  ],
  "aisleWidth": 0,
  "sourceCameraMarkers": [
    {
      "point": [
        419,
        993
      ],
      "label": "CAM 1"
    },
    {
      "point": [
        708,
        1146
      ],
      "label": "CAM 2"
    },
    {
      "point": [
        957,
        1126
      ],
      "label": "CAM 3"
    },
    {
      "point": [
        1019,
        884
      ],
      "label": "CAM 4"
    },
    {
      "point": [
        946,
        793
      ],
      "label": "CAM 5"
    },
    {
      "point": [
        991,
        1000
      ],
      "label": "CAM 6"
    },
    {
      "point": [
        1048,
        1000
      ],
      "label": "CAM 7"
    }
  ],
  "paths": [
    [
      [
        428,
        1149
      ],
      [
        939,
        1149
      ]
    ],
    [
      [
        260,
        1324
      ],
      [
        260,
        670
      ],
      [
        1255,
        670
      ],
      [
        1255,
        1324
      ],
      [
        260,
        1324
      ]
    ]
  ],
  "vipAreas": [
    {
      "label": "VIP FLOOR",
      "footprint": [
        [
          430,
          1313
        ],
        [
          430,
          1156
        ],
        [
          933,
          1156
        ],
        [
          933,
          1313
        ]
      ]
    }
  ],
  "towers": [],
  "surroundPanels": [],
  "roof": {
    "left": -65,
    "right": 65,
    "near": -48,
    "far": 145,
    "height": 40
  },
  "trusses": []
};
const plot2026={"origin": [1000, 1000], "stageFront": 965, "rail": 942, "stageEnds": [679, 1316], "audience": [[428, 1313], [428, 1154], [278, 1154], [278, 783], [519, 783], [519, 680], [942, 680], [942, 1313]], "foh": [[401, 758], [401, 678], [511, 678], [511, 758]], "divider": [], "crossAisle": [], "camera1": [419, 993], "camera2": [708, 1146], "crane": [946, 793], "stageFootprint": [[965, 1324], [965, 678], [1096, 678], [1096, 1324]]};
const siteBoundary=[[252, 1340], [252, 666], [1269, 666], [1269, 1357], [943, 1357], [943, 1340]];
const productionDecks=[{"footprint": [[401, 758], [401, 678], [511, 678], [511, 758]], "label": "FOH / 16 \u00d7 22 FT", "height": 7, "equipmentStacks": 3}, {"footprint": [[340, 1306], [340, 1226], [420, 1226], [420, 1306]], "label": "ADA / 16 \u00d7 16 FT", "height": 2, "equipmentStacks": 0}, {"footprint": [[409, 1003], [409, 983], [429, 983], [429, 1003]], "label": "CAM 1 / GROUND POSITION", "height": 0, "equipmentStacks": 0}];
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
    "name": "2026 / CAM 1 \u00b7 central rear floor",
    "source": [
      419,
      993
    ],
    "sensor": 36,
    "lenses": [
      35,
      100,
      435
    ]
  },
  "cam2": {
    "name": "2026 / CAM 2 \u00b7 handheld \u00b7 wireless",
    "source": [
      708,
      1146
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "cam3": {
    "name": "2026 / CAM 3 \u00b7 Stage L pit",
    "source": [
      957,
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
    "name": "2026 / CAM 4 \u00b7 onstage handheld",
    "source": [
      1019,
      884
    ],
    "sensor": 36,
    "lenses": [
      30,
      60,
      90
    ]
  },
  "cam5": {
    "name": "2026 / CAM 5 \u00b7 40 ft jib base",
    "source": [
      946,
      793
    ],
    "sensor": 36,
    "lenses": [
      35,
      85,
      145
    ]
  },
  "cam6": {
    "name": "2026 / CAM 6 \u00b7 DJ desk lockoff",
    "source": [
      991,
      1000
    ],
    "sensor": 36,
    "lenses": [
      16,
      24,
      35
    ]
  },
  "cam7": {
    "name": "2026 / CAM 7 \u00b7 reverse PTZ",
    "source": [
      1048,
      1000
    ],
    "sensor": 36,
    "lenses": [
      16,
      35,
      70
    ],
    "aimSource": [
      425,
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
const heights={"cam1": [5.5, 11.5], "cam2": [5.5, 11.5], "cam3": [5.5, 11.5], "cam4": [11.5, 11.5], "cam5": [24, 11.5], "cam6": [9.5, 11.5], "cam7": [20, 5.6], "pitCrowd": [5.5, 5.6], "deck": [11.5, 11.5], "deckCenter": [11.5, 5.6]};
