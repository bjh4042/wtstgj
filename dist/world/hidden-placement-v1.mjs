import {deepFreeze,sha256,stableJSON} from '../compatibility/codec.mjs';
/** Latest explicit user approval; the unapproved candidate remains an immutable audit artifact. */
export const HIDDEN_PLACEMENT_V1=deepFreeze({
  "id": "FACILITIES_HIDDEN_GEOJE_APPROVED_V1",
  "version": 1,
  "approvalStatus": "USER_APPROVED",
  "contentNamespace": "canonical-v1",
  "runtimeEnabled": true,
  "basisCommit": "b083b61221ff50cbb2545b87c632b2704f94d3d8",
  "candidateId": "GEOJE_BALL_HIDDEN_PLACEMENT_CANDIDATE_v1",
  "candidateSha256": "8a326c76d7696dca2afb72b1b9e229f2a1a4ec91860446ed534f2d0b4435bac2",
  "itemId": "geoje_ball",
  "lifetimeCap": 12,
  "quantityPerSlot": 1,
  "automaticStoryReward": false,
  "repeatable": false,
  "shopSale": false,
  "source149AccessExpression": "CAN_ENTER_POST && POST_SANCTUARIES_UNLOCKED",
  "facilityPolicy": "Preserve 12 hub shop/center IDs and coordinates; FINAL facilities outside league rooms; keep three walking survey points",
  "scope": "Gameplay placement approval only; original art/geography/legacy/capture formula unchanged",
  "slots": [
    {
      "slotId": "HIDDEN_GEOJE_01",
      "stage": "S1",
      "discovery": "하천 관찰길 옆 샛길의 숨은 보관함",
      "accessGate": "CAN_ENTER_S1",
      "difficulty": "EASY",
      "missable": true,
      "storyDependency": "지역 진입만 필요; 자동 보상 아님",
      "onceFlag": "WORLD_HIDDEN_GEOJE_01",
      "mapId": "world:area:S1_YEONCHO_STREAM",
      "areaId": "S1_YEONCHO_STREAM",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_02",
      "stage": "S2",
      "discovery": "전망점 뒤 숨은 탐색 표식",
      "accessGate": "CAN_ENTER_S2",
      "difficulty": "EASY",
      "missable": true,
      "storyDependency": "S2 진입; 목격 이벤트와 독립",
      "onceFlag": "WORLD_HIDDEN_GEOJE_02",
      "mapId": "world:area:S2_JANGMOK_BIRD_HILL",
      "areaId": "S2_JANGMOK_BIRD_HILL",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_03",
      "stage": "S3",
      "discovery": "숲 가장자리 우회 통로 끝",
      "accessGate": "CAN_ENTER_S3",
      "difficulty": "MEDIUM",
      "missable": true,
      "storyDependency": "S3 진입만 필요",
      "onceFlag": "WORLD_HIDDEN_GEOJE_03",
      "mapId": "world:area:S3_OKPO_FOREST_EDGE",
      "areaId": "S3_OKPO_FOREST_EDGE",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_04",
      "stage": "S4",
      "discovery": "녹지 NPC의 힌트를 따라 보관함 직접 조사",
      "accessGate": "CAN_ENTER_S4",
      "difficulty": "MEDIUM",
      "missable": true,
      "storyDependency": "S4 진입; 역사 핵심구역 밖",
      "onceFlag": "WORLD_HIDDEN_GEOJE_04",
      "mapId": "world:area:S4_GOHYEON_GREENBELT",
      "areaId": "S4_GOHYEON_GREENBELT",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_05",
      "stage": "S5",
      "discovery": "밭 둘레 샛길의 탐색 지점",
      "accessGate": "CAN_ENTER_S5",
      "difficulty": "MEDIUM",
      "missable": true,
      "storyDependency": "S5 진입; 정글돔 보상과 분리",
      "onceFlag": "WORLD_HIDDEN_GEOJE_05",
      "mapId": "world:area:S5_DUNDEOK_FARMLAND",
      "areaId": "S5_DUNDEOK_FARMLAND",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_06",
      "stage": "S6",
      "discovery": "선택 방향 표식 퍼즐 뒤 보관 장소",
      "accessGate": "CAN_ENTER_S6",
      "difficulty": "MEDIUM",
      "missable": true,
      "storyDependency": "S6 진입; 구조 사건 자동 보상 아님",
      "onceFlag": "WORLD_HIDDEN_GEOJE_06",
      "mapId": "world:area:S6_HAKDONG_FOREST",
      "areaId": "S6_HAKDONG_FOREST",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_07",
      "stage": "S7",
      "discovery": "파도타기 재방문용 암반 샛길 끝",
      "accessGate": "CAN_ENTER_S7 && CAN_SURF",
      "difficulty": "HARD",
      "missable": true,
      "storyDependency": "Surf 해금; 수상 랜덤 전투 불필요",
      "onceFlag": "WORLD_HIDDEN_GEOJE_07",
      "mapId": "world:area:S7_HAEGEUMGANG_ROCKY_COAST",
      "areaId": "S7_HAEGEUMGANG_ROCKY_COAST",
      "quantity": 1,
      "cell": [
        30,
        21
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_08",
      "stage": "S8",
      "discovery": "작은 섬의 숨은 보관함",
      "accessGate": "CAN_ENTER_S8 && CAN_SURF",
      "difficulty": "HARD",
      "missable": true,
      "storyDependency": "S8 접근; 관장 자동 지급과 독립",
      "onceFlag": "WORLD_HIDDEN_GEOJE_08",
      "mapId": "world:area:S8_GUJORA_OFFSHORE",
      "areaId": "S8_GUJORA_OFFSHORE",
      "quantity": 1,
      "cell": [
        30,
        21
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_09",
      "stage": "S9",
      "discovery": "항구 귀환길의 선택 비밀 통로",
      "accessGate": "CAN_ENTER_S9",
      "difficulty": "MEDIUM",
      "missable": true,
      "storyDependency": "S9 진입; 포획선 사건 후에도 재방문 가능",
      "onceFlag": "WORLD_HIDDEN_GEOJE_09",
      "mapId": "world:area:S9_JANGSEUNGPO_RETURN_ROUTE",
      "areaId": "S9_JANGSEUNGPO_RETURN_ROUTE",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_10",
      "stage": "FINAL",
      "discovery": "리그 외부 우회길의 숨은 지점",
      "accessGate": "CAN_ENTER_LEAGUE",
      "difficulty": "HARD",
      "missable": true,
      "storyDependency": "리그 접근; 챔피언 승리와 독립",
      "onceFlag": "WORLD_HIDDEN_GEOJE_10",
      "mapId": "world:hub:FINAL",
      "areaId": null,
      "quantity": 1,
      "cell": [
        21,
        19
      ],
      "permanentlyMissable": false
    },
    {
      "slotId": "HIDDEN_GEOJE_11",
      "stage": "POST",
      "discovery": "도서 탐험 선택 퍼즐 보관함",
      "accessGate": "CAN_ENTER_POST",
      "difficulty": "HARD",
      "missable": true,
      "storyDependency": "POST 진입; 전설 포획 불필요",
      "onceFlag": "WORLD_HIDDEN_GEOJE_11",
      "mapId": "world:area:POST_ISLAND_EXPEDITION",
      "areaId": "POST_ISLAND_EXPEDITION",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false,
      "requiredMarkers": [
        "HIDDEN_GEOJE_11_MARK_A",
        "HIDDEN_GEOJE_11_MARK_B"
      ]
    },
    {
      "slotId": "HIDDEN_GEOJE_12",
      "stage": "POST",
      "discovery": "성역 외곽 숨은 탐색 지점",
      "accessGate": "CAN_ENTER_POST && POST_SANCTUARIES_UNLOCKED",
      "difficulty": "HARD",
      "missable": true,
      "storyDependency": "성역 접근만 필요; 포획 성공과 독립",
      "onceFlag": "WORLD_HIDDEN_GEOJE_12",
      "mapId": "world:area:POST_DEEP_FOREST_SANCTUARY",
      "areaId": "POST_DEEP_FOREST_SANCTUARY",
      "quantity": 1,
      "cell": [
        22,
        2
      ],
      "permanentlyMissable": false
    }
  ]
});
export const HIDDEN_PLACEMENT_HASH=sha256(stableJSON(HIDDEN_PLACEMENT_V1));
