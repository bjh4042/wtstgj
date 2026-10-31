const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o)}return o};
export const CARGO_SUPPLY_ROWS=freeze({
  "S9_SHIP_CHEST_01": {
    "id": "S9_SHIP_CHEST_01",
    "sceneId": "ship_deck_a",
    "mapId": "world:ship:S9",
    "itemId": "hyper_potion",
    "quantity": 2,
    "item": {
      "id": "hyper_potion",
      "name": "고급회복약",
      "pocket": "items",
      "effect": {
        "hp_restore": 120
      },
      "unlock": "BADGE4",
      "price": 1000,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [],
    "historicalMissingSourceGuards": [],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_UNSELECTED_PLACEMENT"
  },
  "S9_SHIP_CHEST_02": {
    "id": "S9_SHIP_CHEST_02",
    "sceneId": "ship_deck_b",
    "mapId": "world:ship:S9",
    "itemId": "full_heal",
    "quantity": 2,
    "item": {
      "id": "full_heal",
      "name": "만능치료제",
      "pocket": "items",
      "effect": {
        "cure": [
          "all_status"
        ]
      },
      "unlock": "BADGE6",
      "price": 500,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [
      "BLACKNET_S9_GRUNT_05"
    ],
    "historicalMissingSourceGuards": [
      "BLACKNET_S9_GRUNT_05"
    ],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_MISSING_SOURCE_GUARD"
  },
  "S9_SHIP_CHEST_03": {
    "id": "S9_SHIP_CHEST_03",
    "sceneId": "ship_hold_a",
    "mapId": "world:ship:S9",
    "itemId": "hyper_potion",
    "quantity": 2,
    "item": {
      "id": "hyper_potion",
      "name": "고급회복약",
      "pocket": "items",
      "effect": {
        "hp_restore": 120
      },
      "unlock": "BADGE4",
      "price": 1000,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [],
    "historicalMissingSourceGuards": [],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_UNSELECTED_PLACEMENT"
  },
  "S9_SHIP_CHEST_04": {
    "id": "S9_SHIP_CHEST_04",
    "sceneId": "ship_hold_b",
    "mapId": "world:ship:S9",
    "itemId": "affinity_ball",
    "quantity": 3,
    "item": {
      "id": "affinity_ball",
      "name": "친화볼",
      "pocket": "capture_balls",
      "capture_multiplier": 1.5,
      "unlock": "BADGE2",
      "price": 600,
      "shop": true
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [
      "BLACKNET_S9_GRUNT_08"
    ],
    "historicalMissingSourceGuards": [
      "BLACKNET_S9_GRUNT_08"
    ],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_MISSING_SOURCE_GUARD"
  },
  "S9_SHIP_CHEST_05": {
    "id": "S9_SHIP_CHEST_05",
    "sceneId": "ship_cabins",
    "mapId": "world:ship:S9",
    "itemId": "full_heal",
    "quantity": 2,
    "item": {
      "id": "full_heal",
      "name": "만능치료제",
      "pocket": "items",
      "effect": {
        "cure": [
          "all_status"
        ]
      },
      "unlock": "BADGE6",
      "price": 500,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [
      "BLACKNET_S9_GRUNT_10"
    ],
    "historicalMissingSourceGuards": [
      "BLACKNET_S9_GRUNT_10"
    ],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_MISSING_SOURCE_GUARD"
  },
  "S9_SHIP_CHEST_06": {
    "id": "S9_SHIP_CHEST_06",
    "sceneId": "ship_cabins",
    "mapId": "world:ship:S9",
    "itemId": "super_potion",
    "quantity": 3,
    "item": {
      "id": "super_potion",
      "name": "좋은회복약",
      "pocket": "items",
      "effect": {
        "hp_restore": 60
      },
      "unlock": "BADGE2",
      "price": 500,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [],
    "historicalMissingSourceGuards": [],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_UNSELECTED_PLACEMENT"
  },
  "S9_SHIP_CHEST_07": {
    "id": "S9_SHIP_CHEST_07",
    "sceneId": "ship_engine",
    "mapId": "world:ship:S9",
    "itemId": "resonance_ball",
    "quantity": 2,
    "item": {
      "id": "resonance_ball",
      "name": "공명볼",
      "pocket": "capture_balls",
      "capture_multiplier": 2,
      "unlock": "BADGE5",
      "price": 1200,
      "shop": true
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [
      "BLACKNET_S9_GRUNT_11"
    ],
    "historicalMissingSourceGuards": [
      "BLACKNET_S9_GRUNT_11"
    ],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_MISSING_SOURCE_GUARD"
  },
  "S9_SHIP_CHEST_08": {
    "id": "S9_SHIP_CHEST_08",
    "sceneId": "ship_bridge",
    "mapId": "world:ship:S9",
    "itemId": "hyper_potion",
    "quantity": 2,
    "item": {
      "id": "hyper_potion",
      "name": "고급회복약",
      "pocket": "items",
      "effect": {
        "hp_restore": 120
      },
      "unlock": "BADGE4",
      "price": 1000,
      "shop": true,
      "consumableApprovalId": "CANONICAL_CONSUMABLES_APPROVED_V1"
    },
    "guardEncounterIds": [],
    "missingSourceGuards": [],
    "status": "ROOT_SELECTED_NEW_REGISTRATION_CANDIDATE",
    "claimScope": "SAVE_SLOT",
    "refill": false,
    "historicalGuardEncounterIds": [],
    "historicalMissingSourceGuards": [],
    "newGuardSelection": "ROOT_SELECTION_CARGO_CHEST_PHYSICAL_20261029",
    "historicalStatus": "HOLD_UNSELECTED_PLACEMENT",
    "historicalAccessCondition": "after existing bridge gate but before Hwigyeong engagement",
    "newAccessSelection": "PREBOSS_SOUTH_SUPPLY_EXISTING_SHIP_GATE_ONLY"
  }
});
