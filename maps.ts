import { MapConfig } from './types';

export const MAPS: MapConfig[] = [
  {
    id: 'town',
    name: 'Red9',
    description: 'A classic urban battlefield with tight corners and open streets.',
    thumbnail: 'https://dummyimage.com/400x225/000/000.png',
    floorColor: '#333',
    floorTexture: 'https://picsum.photos/seed/asphalt/512/512',
    skyColor: '#1a1a1a',
    fogColor: '#111',
    fogNear: 20,
    fogFar: 1000,
    spawnPoints: [
      [0, 1.2, 15], [25, 1.2, -10], [-25, 1.2, 10], [0, 1.2, -35], [15, 1.2, 40], [-15, 1.2, -40]
    ],
    side1SpawnPoints: [[0, 1.2, 15], [25, 1.2, -10], [-25, 1.2, 10]],
    side2SpawnPoints: [[0, 1.2, -35], [15, 1.2, 40], [-15, 1.2, -40]],
    craftingTablePos: [0, 1.5, -110],
    interactables: [
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-25, 0, -15], color: '#ff0000' },
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [25, 0, 5], color: '#00ff00' },
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [-35, 0, 35], color: '#ffff00' },
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [35, 0, -35], color: '#ff8800' },
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [0, 0, -45], color: '#4f46e2' },
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [82, 0, 85], color: '#9333ea' },
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [-75, 0, -70], color: '#4b5563' },
      { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [75, 0, -75], color: '#06b2d2' },
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [-85, 0, 75], color: '#3b82f6' },
      { id: 'vulture', type: 'PERK: Loot Vision', cost: 3000, pos: [85, 0, 25], color: '#84cc16' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [-50, 0, 0], color: '#db2677' },
      { id: 'slider', type: 'PERK: Slide Boom', cost: 2500, pos: [50, 0, 0], color: '#fb923c' },
      { id: 'winter', type: 'PERK: Ice Shield', cost: 3000, pos: [-70, 0, -70], color: '#a5f3fc' },
      { id: 'dying', type: 'PERK: Death Defy', cost: 4000, pos: [-80, 0, 75], color: '#ef4444' },
      { id: 'razor', type: 'PERK: Sharp Edge', cost: 2500, pos: [70, 0, -75], color: '#a855f7' },
      { id: 'timeslip', type: 'PERK: Time Warp', cost: 2000, pos: [-30, 0, 35], color: '#67e8f9' },
      { id: 'bandolier', type: 'PERK: Deep Pockets', cost: 2500, pos: [20, 0, 5], color: '#fbbf24' },
      { id: 'tortoise', type: 'PERK: Armor Shell', cost: 3000, pos: [-20, 0, -15], color: '#10b981' },
      { id: 'blaze', type: 'PERK: Fire Trail', cost: 2500, pos: [5, 0, -45], color: '#ea580c' },
      { id: 'stronghold', type: 'PERK: Fortress', cost: 2500, pos: [0, 0, 60], color: '#78350f' },
      { id: 'blood', type: 'PERK: Wolf Spirit', cost: 3000, pos: [60, 0, 30], color: '#991b1b' },
      { id: 'elemental', type: 'PERK: Chaos Burst', cost: 3000, pos: [-60, 0, -30], color: '#ec4899' },
      { id: 'healthRefill', type: 'Health Refill', cost: 1500, pos: [0, 0, -40] },
      { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 0] },
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [88, 0, 85] },
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, -95] },
      { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [20, 1.5, 18] },
      { id: 'wall_m14', type: 'WALLBUY: M14', cost: 500, pos: [-30, 1.5, 50] },
      { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [30, 1.5, -27] },
      { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [-70, 1.5, -52] },
      { id: 'wall_galil', type: 'WALLBUY: GALIL', cost: 2000, pos: [70, 1.5, -60] },
      { id: 'bowie', type: 'WALLBUY: Bowie Knife', cost: 3000, pos: [-54, 1.5, 6.1], rotation: [0, 0, 0], color: '#ffffff' }
    ],
    objects: [
      { type: 'building', pos: [-25, 5, -15], args: [14, 10, 20], color: "#800000", label: "BANK", lightColor: "#ff4444", doorCost: 2500, doorId: "bank_door" },
      { type: 'building', pos: [25, 6, 5], args: [18, 12, 25], color: "#a52a2a", label: "BAR", lightColor: "#ff6666", doorCost: 1500, doorId: "bar_door" },
      { type: 'building', pos: [-35, 9, 35], args: [22, 18, 30], color: "#660000", label: "CHURCH", lightColor: "#ff8888", doorCost: 2000, doorId: "church_door" },
      { type: 'building', pos: [35, 4, -35], args: [25, 8, 15], color: "#440000", label: "DINER", lightColor: "#ff0000", doorCost: 750, doorId: "diner_door" },
      { type: 'building', pos: [0, 7.5, -45], args: [18, 15, 18], color: "#550000", label: "APARTMENTS", lightColor: "#ff9999", doorCost: 1000, doorId: "apt_door" },
      { type: 'building', pos: [85, 5, 85], args: [15, 10, 15], color: "#333333", label: "GARAGE", lightColor: "#ffffff", doorCost: 750, doorId: "garage_door" },
      { type: 'building', pos: [-75, 6, -70], args: [35, 12, 35], color: "#222222", label: "FACTORY", lightColor: "#00ff00", doorCost: 2000, doorId: "factory_door" },
      { type: 'building', pos: [75, 8, -75], args: [28, 16, 28], color: "#444444", label: "HOSPITAL", lightColor: "#00ffff", doorCost: 2000, doorId: "hospital_door" },
      { type: 'building', pos: [-85, 5, 75], args: [25, 10, 45], color: "#332211", label: "WAREHOUSE", lightColor: "#ffff00", doorCost: 1500, doorId: "warehouse_door" },
      { type: 'building', pos: [85, 6, 25], args: [22, 12, 22], color: "#112233", label: "POLICE", lightColor: "#0000ff", doorCost: 1500, doorId: "police_door" },
      { type: 'building', pos: [-50, 4, 0], args: [12, 8, 12], color: "#223311", label: "STORE", lightColor: "#aaff00", doorCost: 500, doorId: "store_door" },
      { type: 'building', pos: [50, 4, 0], args: [12, 8, 12], color: "#331122", label: "OFFICE", lightColor: "#ff00aa", doorCost: 500, doorId: "office_door" },
      { type: 'building', pos: [0, 5, 60], args: [20, 10, 20], color: "#444455", label: "GYM", lightColor: "#78350f", doorCost: 1000, doorId: "gym_door" },
      { type: 'building', pos: [60, 4, 30], args: [15, 8, 15], color: "#664444", label: "KENNEL", lightColor: "#991b1b", doorCost: 1000, doorId: "kennel_door" },
      { type: 'building', pos: [-60, 6, -30], args: [15, 12, 15], color: "#556655", label: "LAB", lightColor: "#ec4899", doorCost: 1000, doorId: "lab_door" },
      { type: 'streetlight', pos: [10, 0, 10], color: '#ffddaa' },
      { type: 'streetlight', pos: [-10, 0, -10], color: '#ffddaa' },
      { type: 'streetlight', pos: [10, 0, -30], color: '#ffddaa' },
      { type: 'streetlight', pos: [-30, 0, 20], color: '#ffddaa' },
      { type: 'streetlight', pos: [40, 0, 40], color: '#ffddaa' },
      { type: 'streetlight', pos: [-40, 0, -40], color: '#ffddaa' },
      { type: 'streetlight', pos: [60, 0, -20], color: '#ffddaa' },
      { type: 'streetlight', pos: [-60, 0, 20], color: '#ffddaa' },
      { type: 'box', pos: [120, 5, 0], args: [1, 10, 240], color: '#4a4a4a', texture: 'https://picsum.photos/seed/concrete/512/512' },
      { type: 'box', pos: [-120, 5, 0], args: [1, 10, 240], color: '#4a4a4a', texture: 'https://picsum.photos/seed/concrete/512/512' },
      { type: 'box', pos: [0, 5, 120], args: [240, 10, 1], color: '#4a4a4a', texture: 'https://picsum.photos/seed/concrete/512/512' },
      { type: 'box', pos: [0, 5, -120], args: [240, 10, 1], color: '#4a4a4a', texture: 'https://picsum.photos/seed/concrete/512/512' },
    ]
  },
  {
    id: 'bunker',
    name: 'Spendawg',
    description: 'Tight underground corridors with metallic walls and dim lights.',
    thumbnail: 'https://dummyimage.com/400x225/000/000.png',
    floorColor: '#222',
    floorTexture: 'https://picsum.photos/seed/metalfloor/512/512',
    skyColor: '#000',
    fogColor: '#000',
    fogNear: 5,
    fogFar: 1000,
    spawnPoints: [
      [15, 1.2, 15], [-15, 1.2, 15], [15, 1.2, -15], [-15, 1.2, -15],
      [30, 1.2, 0], [-30, 1.2, 0], [0, 1.2, 30], [0, 1.2, -30]
    ],
    side1SpawnPoints: [[15, 1.2, 15], [-15, 1.2, 15], [30, 1.2, 0], [0, 1.2, 30]],
    side2SpawnPoints: [[15, 1.2, -15], [-15, 1.2, -15], [-30, 1.2, 0], [0, 1.2, -30]],
    craftingTablePos: [0, 1.5, -50],
    interactables: [
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-10, 0, -10], color: '#ff0000' },
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [10, 0, 10], color: '#00ff00' },
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [-20, 0, 20], color: '#ffff00' },
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [20, 0, -20], color: '#ff8800' },
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [-30, 0, -30], color: '#4f46e2' },
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [30, 0, -30], color: '#9333ea' },
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [-30, 0, 30], color: '#4b5563' },
      { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [0, 0, 35], color: '#06b2d2' },
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [0, 0, 15], color: '#3b82f6' },
      { id: 'vulture', type: 'PERK: Loot Vision', cost: 3000, pos: [-40, 0, -40], color: '#84cc16' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [40, 0, 40], color: '#db2677' },
      { id: 'slider', type: 'PERK: Slide Boom', cost: 2500, pos: [0, 0, -40], color: '#fb923c' },
      { id: 'winter', type: 'PERK: Ice Shield', cost: 3000, pos: [40, 0, -40], color: '#a5f3fc' },
      { id: 'dying', type: 'PERK: Death Defy', cost: 4000, pos: [-40, 0, 40], color: '#ef4444' },
      { id: 'razor', type: 'PERK: Sharp Edge', cost: 2500, pos: [30, 0, 30], color: '#a855f7' },
      { id: 'timeslip', type: 'PERK: Time Warp', cost: 2000, pos: [-30, 0, -10], color: '#67e8f9' },
      { id: 'bandolier', type: 'PERK: Deep Pockets', cost: 2500, pos: [15, 0, -10], color: '#fbbf24' },
      { id: 'tortoise', type: 'PERK: Armor Shell', cost: 3000, pos: [-15, 0, 10], color: '#10b981' },
      { id: 'blaze', type: 'PERK: Fire Trail', cost: 2500, pos: [10, 0, -15], color: '#ea580c' },
      { id: 'stronghold', type: 'PERK: Fortress', cost: 2500, pos: [45, 0, -15], color: '#78350f' },
      { id: 'blood', type: 'PERK: Wolf Spirit', cost: 3000, pos: [-45, 0, 15], color: '#991b1b' },
      { id: 'elemental', type: 'PERK: Chaos Burst', cost: 3000, pos: [0, 0, -55], color: '#ec4899' },
      { id: 'healthRefill', type: 'Health Refill', cost: 1500, pos: [0, 0, -25] },
      { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 0] },
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [50, 0, 50] },
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, 60] },
      { id: 'bowie', type: 'WALLBUY: Bowie Knife', cost: 3000, pos: [20.6, 1.5, 5], rotation: [0, Math.PI / 2, 0], color: '#ffffff' }
    ],
    objects: [
      { type: 'streetlight', pos: [10, 0, 10], color: '#aaddff' },
      { type: 'streetlight', pos: [-10, 0, -10], color: '#aaddff' },
      { type: 'streetlight', pos: [30, 0, 30], color: '#aaddff' },
      { type: 'streetlight', pos: [-30, 0, -30], color: '#aaddff' },
      { type: 'box', pos: [60, 2.5, 0], args: [1, 5, 121], color: '#222', texture: 'https://picsum.photos/seed/rusted/512/512' },
      { type: 'box', pos: [-60, 2.5, 0], args: [1, 5, 121], color: '#222', texture: 'https://picsum.photos/seed/rusted/512/512' },
      { type: 'box', pos: [0, 2.5, 60], args: [121, 5, 1], color: '#222', texture: 'https://picsum.photos/seed/rusted/512/512' },
      { type: 'box', pos: [0, 2.5, -60], args: [121, 5, 1], color: '#222', texture: 'https://picsum.photos/seed/rusted/512/512' },
      { type: 'box', pos: [20, 2.5, 0], args: [1, 5, 40], color: '#333', texture: 'https://picsum.photos/seed/metal/512/512' },
      { type: 'box', pos: [-20, 2.5, 0], args: [1, 5, 40], color: '#333', texture: 'https://picsum.photos/seed/metal/512/512' },
    ]
  },
  {
    id: 'mukkatown',
    name: 'MUKKATOWN',
    description: 'A destroyed nuclear testing neighborhood. 1:1 Scale Remaster.',
    thumbnail: 'https://dummyimage.com/400x225/aa7755/000.png&text=MUKKATOWN',
    floorColor: '#5c4033',
    floorTexture: 'https://picsum.photos/seed/dirt/512/512',
    skyColor: '#ffcc88',
    fogColor: '#aa7755',
    fogNear: 20,
    fogFar: 1000,
    spawnPoints: [
      [0, 1.2, 0], [10, 1.2, 10], [-10, 1.2, -10], [10, 1.2, -10], [-10, 1.2, 10]
    ],
    side1SpawnPoints: [[0, 1.2, 0], [10, 1.2, 10], [10, 1.2, -10]],
    side2SpawnPoints: [[-10, 1.2, -10], [-10, 1.2, 10]],
    craftingTablePos: [0, 1.5, -10],
    interactables: [
      // Yellow House Perks (West)
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-65, 0, 5], color: '#ff0000' }, // Inside Yellow House (Living Room)
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [-65, 0, -5], color: '#00ff00' }, // Inside Yellow House (Kitchen)
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [-85, 0, 0], color: '#4f46e2' }, // Yellow Backyard
      
      // Green House Perks (East)
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [65, 0, 5], color: '#ffff00' }, // Inside Green House (Living Room)
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [65, 0, -5], color: '#ff8800' }, // Inside Green House (Kitchen)
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [85, 0, 0], color: '#9333ea' }, // Green Backyard

      // Street/Garage Perks
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [0, 0, 25], color: '#3b82f6' }, // Near Bus/Spawn
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [-65, 0, 35], color: '#4b5563' }, // Yellow Garage
      { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [65, 0, 35], color: '#06b2d2' }, // Green Garage
      
      // Other Perks scattered
      { id: 'vulture', type: 'PERK: Loot Vision', cost: 3000, pos: [-85, 0, 30], color: '#84cc16' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [85, 0, 30], color: '#db2677' },
      { id: 'slider', type: 'PERK: Slide Boom', cost: 2500, pos: [-85, 0, -30], color: '#fb923c' },
      { id: 'winter', type: 'PERK: Ice Shield', cost: 3000, pos: [85, 0, -30], color: '#a5f3fc' },
      { id: 'dying', type: 'PERK: Death Defy', cost: 4000, pos: [-30, 0, -50], color: '#ef4444' }, // Near Garden
      { id: 'razor', type: 'PERK: Sharp Edge', cost: 2500, pos: [30, 0, -50], color: '#a855f7' },
      { id: 'timeslip', type: 'PERK: Time Warp', cost: 2000, pos: [0, 0, -55], color: '#67e8f9' },
      { id: 'bandolier', type: 'PERK: Deep Pockets', cost: 2500, pos: [0, 0, 55], color: '#fbbf24' },
      { id: 'tortoise', type: 'PERK: Armor Shell', cost: 3000, pos: [-30, 0, 50], color: '#10b981' },
      { id: 'blaze', type: 'PERK: Fire Trail', cost: 2500, pos: [30, 0, 50], color: '#ea580c' },
      { id: 'stronghold', type: 'PERK: Fortress', cost: 2500, pos: [-50, 0, 0], color: '#78350f' },
      { id: 'blood', type: 'PERK: Wolf Spirit', cost: 3000, pos: [50, 0, 0], color: '#991b1b' },
      { id: 'elemental', type: 'PERK: Chaos Burst', cost: 3000, pos: [0, 0, -75], color: '#ec4899' },
      
      { id: 'healthRefill', type: 'Health Refill', cost: 1500, pos: [0, 0, -15] },
      { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, 10] },
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [85, 0, -15] }, // Green Backyard
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, 90] },
      
      // Wall Buys - Adjusted for new building positions
      { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [-52, 1.5, 0], rotation: [0, Math.PI / 2, 0] }, // Yellow House Front Wall
      { id: 'wall_m14', type: 'WALLBUY: M14', cost: 500, pos: [52, 1.5, 0], rotation: [0, -Math.PI / 2, 0] }, // Green House Front Wall
      { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [0, 1.5, -35], rotation: [0, 0, 0] }, // Bus
      { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [-65, 1.5, -15], rotation: [0, 0, 0] }, // Yellow House Inside
      { id: 'wall_galil', type: 'WALLBUY: GALIL', cost: 2000, pos: [65, 1.5, -15], rotation: [0, 0, 0] }, // Green House Inside
      { id: 'bowie', type: 'WALLBUY: Bowie Knife', cost: 3000, pos: [0, 1.5, 40], rotation: [0, Math.PI, 0], color: '#ffffff' }
    ],
    objects: [
      // Yellow House (West) - Scaled Up 1.5x
      { type: 'building', pos: [-65, 7.5, 0], args: [30, 15, 38], color: "#eab308", label: "YELLOW HOUSE", lightColor: "#ffffaa", doorCost: 750, doorId: "yellow_house_door" },
      { type: 'building', pos: [-65, 6, 30], args: [18, 12, 22], color: "#ca8a04", label: "GARAGE", lightColor: "#ffffaa", doorCost: 500, doorId: "yellow_garage_door", backDoor: true },
      
      // Green House (East) - Scaled Up 1.5x
      { type: 'building', pos: [65, 7.5, 0], args: [30, 15, 38], color: "#22c55e", label: "GREEN HOUSE", lightColor: "#aaffaa", doorCost: 750, doorId: "green_house_door" },
      { type: 'building', pos: [65, 6, 30], args: [18, 12, 22], color: "#16a34a", label: "GARAGE", lightColor: "#aaffaa", doorCost: 500, doorId: "green_garage_door", backDoor: true },
      
      // Vehicles & Obstacles - Scaled Up
      { type: 'box', pos: [0, 3.5, -30], args: [9, 7, 27], color: '#475569', texture: 'https://picsum.photos/seed/bus/512/512' }, // Bus
      { type: 'box', pos: [0, 4, 30], args: [9, 9, 27], color: '#f97316', texture: 'https://picsum.photos/seed/movingtruck/512/512' }, // Moving Truck
      { type: 'box', pos: [0, 3, -15], args: [6, 6, 0.8], color: '#ffffff', texture: 'https://dummyimage.com/512x512/fff/000.png&text=MUKKATOWN' }, // Sign
      
      // Fences (Boundaries) - Expanded to +/- 100 X, +/- 120 Z
      { type: 'box', pos: [100, 7.5, 0], args: [1, 15, 240], color: '#4a4a4a', texture: 'https://picsum.photos/seed/fence/512/512' },
      { type: 'box', pos: [-100, 7.5, 0], args: [1, 15, 240], color: '#4a4a4a', texture: 'https://picsum.photos/seed/fence/512/512' },
      { type: 'box', pos: [0, 7.5, 120], args: [200, 15, 1], color: '#4a4a4a', texture: 'https://picsum.photos/seed/fence/512/512' },
      { type: 'box', pos: [0, 7.5, -120], args: [200, 15, 1], color: '#4a4a4a', texture: 'https://picsum.photos/seed/fence/512/512' },
      
      // Streetlights
      { type: 'streetlight', pos: [-25, 0, -60], color: '#ffddaa' },
      { type: 'streetlight', pos: [25, 0, -60], color: '#ffddaa' },
      { type: 'streetlight', pos: [-25, 0, 60], color: '#ffddaa' },
      { type: 'streetlight', pos: [25, 0, 60], color: '#ffddaa' }
    ]
  },
  {
    id: 'king_robbos_farm',
    name: 'King Robbos farm',
    description: 'A desolate farm overrun by the undead. 1:1 Scale Remaster.',
    thumbnail: 'https://dummyimage.com/400x225/556644/000.png&text=Farm',
    floorColor: '#3f4c3b',
    floorTexture: 'https://picsum.photos/seed/grass/512/512',
    skyColor: '#1a1a2e',
    fogColor: '#0f172a',
    fogNear: 15,
    fogFar: 1000,
    spawnPoints: [
      [0, 1.2, 20], [10, 1.2, 20], [-10, 1.2, 20], [0, 1.2, 30], [0, 1.2, 10]
    ],
    side1SpawnPoints: [[0, 1.2, 20], [10, 1.2, 20]],
    side2SpawnPoints: [[-10, 1.2, 20], [0, 1.2, 30], [0, 1.2, 10]],
    craftingTablePos: [0, 1.5, 30],
    interactables: [
      // Barn Perks (North)
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [0, 0, -50], color: '#ff0000' }, // Inside Barn
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [15, 0, -50], color: '#00ff00' }, // Inside Barn
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [-15, 0, -50], color: '#ff8800' }, // Inside Barn
      
      // House Perks (West)
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [-60, 0, 0], color: '#3b82f6' }, // Inside House
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [-60, 0, 10], color: '#ffff00' }, // Inside House
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [-60, 0, -10], color: '#4f46e2' }, // Inside House
      
      // Shed/Outside Perks
      { id: 'tombstone', type: 'PERK: Tombstone Soda', cost: 2000, pos: [50, 0, 0], color: '#4b5563' }, // Near Shed
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [50, 0, 20], color: '#9333ea' },
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [50, 0, -20], color: '#4b5563' },
      
      // Other Perks
      { id: 'vulture', type: 'PERK: Loot Vision', cost: 3000, pos: [0, 0, 50], color: '#84cc16' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [-30, 0, 50], color: '#db2677' },
      { id: 'slider', type: 'PERK: Slide Boom', cost: 2500, pos: [30, 0, 50], color: '#fb923c' },
      { id: 'winter', type: 'PERK: Ice Shield', cost: 3000, pos: [-30, 0, -80], color: '#a5f3fc' }, // Behind Barn
      { id: 'dying', type: 'PERK: Death Defy', cost: 4000, pos: [30, 0, -80], color: '#ef4444' },
      { id: 'razor', type: 'PERK: Sharp Edge', cost: 2500, pos: [-80, 0, 0], color: '#a855f7' }, // Behind House
      { id: 'timeslip', type: 'PERK: Time Warp', cost: 2000, pos: [-80, 0, 30], color: '#67e8f9' },
      { id: 'bandolier', type: 'PERK: Deep Pockets', cost: 2500, pos: [-80, 0, -30], color: '#fbbf24' },
      { id: 'tortoise', type: 'PERK: Armor Shell', cost: 3000, pos: [80, 0, 0], color: '#10b981' }, // Behind Shed
      { id: 'blaze', type: 'PERK: Fire Trail', cost: 2500, pos: [80, 0, 30], color: '#ea580c' },
      { id: 'stronghold', type: 'PERK: Fortress', cost: 2500, pos: [80, 0, -30], color: '#78350f' },
      { id: 'blood', type: 'PERK: Wolf Spirit', cost: 3000, pos: [0, 0, -90], color: '#991b1b' },
      { id: 'elemental', type: 'PERK: Chaos Burst', cost: 3000, pos: [0, 0, 70], color: '#ec4899' },

      { id: 'healthRefill', type: 'Health Refill', cost: 1500, pos: [0, 0, 10] },
      { id: 'box', type: 'Gun Box', cost: 950, pos: [0, 0, -20] }, // Near Barn entrance
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, -60] }, // Inside Barn Back
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, 80] },
      
      // Wall Buys - Adjusted
      { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [-46, 1.5, 0], rotation: [0, Math.PI / 2, 0] }, // House Wall
      { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [0, 1.5, -36], rotation: [0, 0, 0] }, // Barn Front
      { id: 'wall_rpd', type: 'WALLBUY: RPD', cost: 2500, pos: [0, 1.5, -64], rotation: [0, Math.PI, 0] }, // Barn Back
      { id: 'wall_remington', type: 'WALLBUY: REMINGTON', cost: 1200, pos: [40, 1.5, 0], rotation: [0, -Math.PI / 2, 0] }, // Shed Wall
      { id: 'bowie', type: 'WALLBUY: Bowie Knife', cost: 3000, pos: [-60, 1.5, -14], rotation: [0, 0, 0] } // House Inside
    ],
    objects: [
      // Barn (North) - Scaled Up
      { type: 'building', pos: [0, 9, -50], args: [40, 18, 30], color: "#7f1d1d", label: "BARN", lightColor: "#ffaa00", doorCost: 750, doorId: "barn_door" },
      
      // House (West) - Scaled Up
      { type: 'building', pos: [-60, 7.5, 0], args: [30, 15, 30], color: "#fef3c7", label: "FARMHOUSE", lightColor: "#ffffaa", doorCost: 750, doorId: "house_door" },
      
      // Shed (East) - Scaled Up
      { type: 'building', pos: [50, 5, 0], args: [18, 10, 18], color: "#78350f", label: "SHED", lightColor: "#ffffaa", doorCost: 500, doorId: "shed_door" },
      
      // Vehicles & Obstacles
      { type: 'box', pos: [20, 3, 30], args: [8, 6, 14], color: '#1e293b', texture: 'https://picsum.photos/seed/tractor/512/512' }, // Tractor
      { type: 'box', pos: [-20, 2.5, 40], args: [8, 5, 16], color: '#475569', texture: 'https://picsum.photos/seed/truck/512/512' }, // Truck
      { type: 'box', pos: [0, 1.5, 0], args: [6, 3, 6], color: '#a16207', texture: 'https://picsum.photos/seed/hay/512/512' }, // Hay bales
      { type: 'crow', pos: [0, 10, -50], label: 'crow_1' },
      { type: 'crow', pos: [-60, 8, 0], label: 'crow_2' },
      { type: 'crow', pos: [50, 6, 0], label: 'crow_3' },
      { type: 'crow', pos: [20, 2, 30], label: 'crow_4' },
      { type: 'crow', pos: [-80, 2, 0], label: 'crow_5' },
      
      // Fences (Boundaries) - Expanded to +/- 100 X, +/- 100 Z
      { type: 'box', pos: [100, 5, 0], args: [1, 10, 200], color: '#27272a', texture: 'https://picsum.photos/seed/wood/512/512' },
      { type: 'box', pos: [-100, 5, 0], args: [1, 10, 200], color: '#27272a', texture: 'https://picsum.photos/seed/wood/512/512' },
      { type: 'box', pos: [0, 5, 100], args: [200, 10, 1], color: '#27272a', texture: 'https://picsum.photos/seed/wood/512/512' },
      { type: 'box', pos: [0, 5, -100], args: [200, 10, 1], color: '#27272a', texture: 'https://picsum.photos/seed/wood/512/512' },
      
      // Streetlights
      { type: 'streetlight', pos: [-30, 0, 30], color: '#ffddaa' },
      { type: 'streetlight', pos: [30, 0, 30], color: '#ffddaa' },
      { type: 'streetlight', pos: [0, 0, -20], color: '#ffddaa' }
    ]
  },
  {
    id: 'z-town',
    name: 'Z-Town',
    description: 'A massive open world connecting all areas. Beware the lava and catch the bus!',
    thumbnail: 'https://dummyimage.com/400x225/331100/ffaa00.png&text=Z-Town',
    floorColor: '#2a1a10',
    floorTexture: 'https://picsum.photos/seed/dirt/512/512',
    skyColor: '#331100',
    fogColor: '#220a00',
    fogNear: 10,
    fogFar: 1000,
    spawnPoints: [
      [12, 1.2, -12], // Bus Depot (Outside)
      [0, 1.2, -150], // Town Street
      [-100, 1.2, 80], // Farm Yard
      [100, 1.2, 80] // Power Station Yard
    ],
    side1SpawnPoints: [[12, 1.2, -12], [-100, 1.2, 80]],
    side2SpawnPoints: [[0, 1.2, -150], [100, 1.2, 80]],
    craftingTablePos: [0, 1.5, -10],
    interactables: [
      // Bus Depot Area (Start) - Building at (0, 0, -25)
      { id: 'bus_door', type: 'Open Bus', cost: 0, pos: [0, 0, -30] },
      { id: 'truck_door', type: 'Open Truck', cost: 0, pos: [0, 0, 30] },
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [-10, 0, -25], color: '#3b82f6' },
      { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [10, 1.5, -20], rotation: [0, -Math.PI / 2, 0] },
      { id: 'wall_m14', type: 'WALLBUY: M14', cost: 500, pos: [10, 1.5, -30], rotation: [0, -Math.PI / 2, 0] },
      
      // Town Area (North - Group at 0, 0, -150)
      // Bank at (0, 0, -180), Bar at (40, 0, -180)
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [40, 0, -180], color: '#ff0000' }, // In Bar
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [20, 0, -180], color: '#ffff00' }, // Near Bar
      { id: 'box_town', type: 'Gun Box', cost: 950, pos: [40, 0, -170] }, // Outside Bar
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, -180] }, // In Bank Vault
      { id: 'wall_galil', type: 'WALLBUY: GALIL', cost: 2000, pos: [0, 1.5, -190], rotation: [0, 0, 0] }, // Bank Back Wall
 
      // Farm Area (West - Group at -100, 0, 100)
      // House at (-100, 0, 120), Barn at (-130, 0, 100)
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [-130, 0, 100], color: '#ff8800' }, // In Barn
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [-100, 0, 120], color: '#00ff00' }, // In House
      { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [-100, 1.5, 110], rotation: [0, Math.PI, 0] }, // House Front
      { id: 'box_farm', type: 'Gun Box', cost: 950, pos: [-130, 0, 110] }, // Barn Side
 
      // Power Station (East - Group at 100, 0, 100)
      // Building at (100, 0, 120)
      { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [100, 0, 120], color: '#06b2d2' },
      { id: 'tombstone', type: 'PERK: Tombstone Soda', cost: 2000, pos: [110, 0, 120], color: '#4b5563' },
      { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [90, 1.5, 120], rotation: [0, Math.PI / 2, 0] },
      
      // Diner (Far West - Group at -150, 0, 0)
      // Diner at (-150, 0, -20)
      { id: 'speed_diner', type: 'PERK: Fast Hands', cost: 3000, pos: [-150, 0, -20], color: '#00ff00' }, // In Diner
      { id: 'box_diner', type: 'Gun Box', cost: 950, pos: [-125, 0, -10] }, // In Garage
      
      // Scattered Perks
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [0, 0, 50], color: '#4f46e2' }, // Middle of nowhere
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [-50, 0, 50], color: '#9333ea' },
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [50, 0, -50], color: '#4b5563' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [-50, 0, -50], color: '#db2677' },
      
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, -200] }, // Behind Town
    ],
    objects: [
      // Bus Depot (Start)
      { type: 'building', pos: [0, 5, -25], args: [20, 10, 20], color: "#444", label: "DEPOT", lightColor: "#aaa", doorCost: 750, doorId: "depot_door" },
      
      // Town Area
      { type: 'building', pos: [0, 7.5, -180], args: [30, 15, 20], color: "#800000", label: "BANK", lightColor: "#ff4444", doorCost: 1000, doorId: "bank_door_tranzit" },
      { type: 'building', pos: [40, 6, -180], args: [20, 12, 20], color: "#a52a2a", label: "BAR", lightColor: "#ff6666", doorCost: 1000, doorId: "bar_door_tranzit" },
      
      // Farm Area
      { type: 'building', pos: [-100, 7.5, 120], args: [25, 15, 25], color: "#fef3c7", label: "FARMHOUSE", lightColor: "#ffffaa", doorCost: 1000, doorId: "farmhouse_door_tranzit" },
      { type: 'building', pos: [-130, 9, 100], args: [30, 18, 25], color: "#7f1d1d", label: "BARN", lightColor: "#ffaa00", doorCost: 1000, doorId: "barn_door_tranzit" },

      // Power Station Area
      { type: 'building', pos: [100, 10, 120], args: [40, 20, 30], color: "#222", label: "POWER STATION", lightColor: "#00ffff", doorCost: 1500, doorId: "power_door" },

      // Diner Area
      { type: 'building', pos: [-150, 5, -20], args: [25, 10, 20], color: "#440000", label: "DINER", lightColor: "#ff0000", doorCost: 750, doorId: "diner_door_tranzit" },
      { type: 'building', pos: [-125, 6, -10], args: [15, 12, 15], color: "#333", label: "GARAGE", lightColor: "#fff", doorCost: 750, doorId: "diner_garage_door" },

      // Roads (Asphalt with markings)
      { type: 'box', pos: [0, 0.1, 0], args: [400, 0.1, 20], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      { type: 'box', pos: [0, 0.1, 100], args: [400, 0.1, 20], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      { type: 'box', pos: [100, 0.1, 0], args: [20, 0.1, 400], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      { type: 'box', pos: [-100, 0.1, 0], args: [20, 0.1, 400], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      
      // Road Markings (Yellow lines)
      { type: 'box', pos: [0, 0.15, 0], args: [400, 0.1, 0.5], color: '#eab308' },
      { type: 'box', pos: [0, 0.15, 100], args: [400, 0.1, 0.5], color: '#eab308' },
      { type: 'box', pos: [100, 0.15, 0], args: [0.5, 0.1, 400], color: '#eab308' },
      { type: 'box', pos: [-100, 0.15, 0], args: [0.5, 0.1, 400], color: '#eab308' },

      // Additional Roads for Bus Path
      { type: 'box', pos: [0, 0.1, -100], args: [20, 0.1, 200], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      { type: 'box', pos: [0, 0.15, -100], args: [0.5, 0.1, 200], color: '#eab308' },
      { type: 'box', pos: [-150, 0.1, 0], args: [100, 0.1, 20], color: '#222', texture: 'https://picsum.photos/seed/asphalt/512/512', label: 'road' },
      { type: 'box', pos: [-150, 0.15, 0], args: [100, 0.1, 0.5], color: '#eab308' },

      // Add more doors
      { type: 'building', pos: [50, 5, 50], args: [20, 10, 20], color: "#555", label: "SHED", lightColor: "#fff", doorCost: 500, doorId: "shed_door_tranzit" },
      { type: 'building', pos: [-50, 5, 50], args: [20, 10, 20], color: "#555", label: "SHED2", lightColor: "#fff", doorCost: 500, doorId: "shed2_door_tranzit" },

    ]
  },
  {
    id: 't_dogs_land',
    name: "T-DOG'S LAND",
    description: 'A magical forest filled with giant mushrooms and hidden secrets.',
    thumbnail: 'https://dummyimage.com/400x225/4a148c/ff00ff.png&text=Mushroom+Land',
    floorColor: '#2b3a1a', // dark mossy green
    floorTexture: 'https://picsum.photos/seed/moss/512/512',
    skyColor: '#1a0b2e', // dark purple
    fogColor: '#4a148c', // magic purple fog
    fogNear: 5,
    fogFar: 800,
    spawnPoints: [
      [0, 1.2, 0], [5, 1.2, 5], [-5, 1.2, -5], [5, 1.2, -5], [-5, 1.2, 5]
    ],
    side1SpawnPoints: [[0, 1.2, 0], [5, 1.2, 5], [-5, 1.2, -5]],
    side2SpawnPoints: [[5, 1.2, -5], [-5, 1.2, 5]],
    craftingTablePos: [0, 1.5, -20],
    interactables: [
      { id: 'jugg', type: 'PERK: Toughness Brew', cost: 2500, pos: [-30, 0, -30], color: '#ff0000' },
      { id: 'speed', type: 'PERK: Fast Hands', cost: 3000, pos: [30, 0, -30], color: '#00ff00' },
      { id: 'stamin', type: 'PERK: Marathon Soda', cost: 2000, pos: [-40, 0, 40], color: '#ffff00' },
      { id: 'double', type: 'PERK: Double Shot', cost: 2000, pos: [40, 0, 40], color: '#ff8800' },
      { id: 'mule', type: 'PERK: Third Arm', cost: 4000, pos: [0, 0, -50], color: '#4f46e2' },
      { id: 'phd', type: 'PERK: Blast Proof', cost: 2500, pos: [-50, 0, 0], color: '#9333ea' },
      { id: 'deadshot', type: 'PERK: Aim Assist', cost: 1500, pos: [50, 0, 0], color: '#4b5563' },
      { id: 'electric', type: 'PERK: Shock Burst', cost: 2000, pos: [60, 0, -60], color: '#06b2d2' },
      { id: 'revive', type: 'PERK: Life Brew', cost: 1500, pos: [15, 0, 15], color: '#3b82f6' },
      { id: 'vulture', type: 'PERK: Loot Vision', cost: 3000, pos: [-60, 0, 60], color: '#84cc16' },
      { id: 'widow', type: 'PERK: Spider Brew', cost: 4000, pos: [60, 0, 60], color: '#db2677' },
      { id: 'slider', type: 'PERK: Slide Boom', cost: 2500, pos: [-60, 0, -60], color: '#fb923c' },
      { id: 'winter', type: 'PERK: Ice Shield', cost: 3000, pos: [0, 0, 70], color: '#a5f3fc' },
      { id: 'dying', type: 'PERK: Death Defy', cost: 4000, pos: [-20, 0, 80], color: '#ef4444' },
      { id: 'razor', type: 'PERK: Sharp Edge', cost: 2500, pos: [20, 0, 80], color: '#a855f7' },
      { id: 'timeslip', type: 'PERK: Time Warp', cost: 2000, pos: [-80, 0, 20], color: '#67e8f9' },
      { id: 'bandolier', type: 'PERK: Deep Pockets', cost: 2500, pos: [80, 0, 20], color: '#fbbf24' },
      { id: 'tortoise', type: 'PERK: Armor Shell', cost: 3000, pos: [-80, 0, -20], color: '#10b981' },
      { id: 'tombstone', type: 'PERK: Tombstone Soda', cost: 2000, pos: [30, 0, 70], color: '#4b5563' },
      { id: 'blaze', type: 'PERK: Fire Trail', cost: 2500, pos: [80, 0, -20], color: '#ea580c' },
      { id: 'stronghold', type: 'PERK: Fortress', cost: 2500, pos: [0, 0, -80], color: '#78350f' },
      { id: 'blood', type: 'PERK: Wolf Spirit', cost: 3000, pos: [70, 0, -40], color: '#991b1b' },
      { id: 'elemental', type: 'PERK: Chaos Burst', cost: 3000, pos: [-70, 0, -40], color: '#ec4899' },
      { id: 'healthRefill', type: 'Health Refill', cost: 1500, pos: [0, 0, 20] },
      { id: 'box', type: 'Gun Box', cost: 950, pos: [10, 0, -10] },
      { id: 'pap', type: 'Upgrade Station', cost: 5000, pos: [0, 0, -110] },
      { id: 'buyableEnding', type: 'Buyable Ending', cost: 50000, pos: [0, 0, 110] },
      { id: 'wall_mp5', type: 'WALLBUY: MP5', cost: 1000, pos: [-20, 1.5, 0] },
      { id: 'wall_m14', type: 'WALLBUY: M14', cost: 500, pos: [20, 1.5, 0] },
      { id: 'wall_olympia', type: 'WALLBUY: OLYMPIA', cost: 500, pos: [0, 1.5, 30] },
      { id: 'wall_ak47', type: 'WALLBUY: AK-47', cost: 1800, pos: [-40, 1.5, 0] },
      { id: 'wall_galil', type: 'WALLBUY: GALIL', cost: 2000, pos: [40, 1.5, 0] },
      { id: 'wall_rpd', type: 'WALLBUY: RPD', cost: 2500, pos: [0, 1.5, 40] },
      { id: 'wall_remington', type: 'WALLBUY: REMINGTON', cost: 1200, pos: [0, 1.5, -40] },
      { id: 'bowie', type: 'WALLBUY: Bowie Knife', cost: 3000, pos: [25, 1.5, 25], rotation: [0, 0, 0], color: '#ffffff' }
    ],
    objects: [
      ...(() => {
        const objs: any[] = [];
        const existingPos: {x: number, z: number, r: number}[] = [
          { x: 0, z: 0, r: 15 }, // Player Spawn
          { x: 10, z: -10, r: 12 }, // Mystery Box
          { x: 0, z: 100, r: 18 }, // Grave
        ];

        // Avoid perks
        [
          [15, 1.5, 15], [-15, 1.5, -15], [30, 1.5, 0], [-30, 1.5, 0], 
          [0, 1.5, 30], [0, 1.5, -30], [-15, 1.5, 15], [15, 1.5, -15]
        ].forEach(p => existingPos.push({ x: p[0], z: p[2], r: 10 }));

        // Generate Trees and Mushrooms (increased count significantly for Mushroom Land)
        for (let i = 0; i < 700; i++) {
          const type = Math.random() > 0.85 ? 'tree' : 'mushroom'; // Heavily prioritize mushrooms
          const isMushroom = type === 'mushroom';
          
          let x = 0, z = 0;
          let found = false;
          let attempts = 0;
          
          while (!found && attempts < 40) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 150; // Avoid spawn area
            x = Math.cos(angle) * dist;
            z = Math.sin(angle) * dist;
            
            // Randomized sizing - focused on making them "massive"
            const sizeBase = 4 + Math.random() * 18;
            const sizeX = isMushroom ? sizeBase * 1.6 : sizeBase;
            const sizeY = isMushroom ? sizeBase * 1.4 : sizeBase * 2.2;
            
            // Poisson-like spacing based on size
            const margin = isMushroom ? sizeX * 1.5 : sizeX * 1.8;
            
            const isOverlapping = existingPos.some(p => {
              const dx = x - p.x;
              const dz = z - p.z;
              return (dx*dx + dz*dz) < (p.r + margin) * (p.r + margin);
            });
            
            if (!isOverlapping) {
              found = true;
              existingPos.push({ x, z, r: margin });
              
              const colors = ['#e11d48', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#f43f5e', '#a855f7', '#6366f1'];
              const color = isMushroom ? colors[Math.floor(Math.random() * colors.length)] : (['#14532d', '#166534', '#15803d'][Math.floor(Math.random() * 3)]);
              
              objs.push({
                type: type,
                pos: [x, 0, z],
                args: [sizeX, sizeY, sizeX],
                color: color
              } as any);
            }
            attempts++;
          }
        }
        return objs;
      })(),
      // Island Magic Area (Surround the map, but not the center)
      ...Array.from({ length: 400 }).map((_, i) => { // reduced count for better visibility
         const angle = Math.random() * Math.PI * 2;
         const radius = 140 + Math.random() * 200; // further out
         const x = Math.cos(angle) * radius;
         const z = Math.sin(angle) * radius;
         return {
           type: 'mushroom',
           pos: [x, 0, z] as [number, number, number],
           args: [Math.random() * 0.5 + 0.3, Math.random() * 2 + 1],
           color: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)]
         };
      }),
      ...Array.from({ length: 300 }).map((_, i) => { // reduced count for better performance/visibility
         const angle = Math.random() * Math.PI * 2;
         const radius = 130 + Math.random() * 200; // further out
         const x = Math.cos(angle) * radius;
         const z = Math.sin(angle) * radius;
         return {
           type: 'box',
           pos: [x, 1.5, z] as [number, number, number],
           args: [0.5, 3, 1.5],
           color: '#4e342e', // Chocolate brown
           label: 'chocolate_bar',
           rotation: [0, Math.random() * Math.PI, Math.random() * 0.5 - 0.25] as [number, number, number]
         };
      })
    ]
  }
];
