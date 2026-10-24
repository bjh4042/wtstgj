// Player-only asset identities; shared trainer/player-boy slots remain unchanged.
export const W03_PLAYER_ATLASES=Object.freeze([
  {
    "lockedCharacterId": "PLAYER_MALE",
    "canonicalRuntimeId": "PLAYER_BOY",
    "displayName": "남자 플레이어",
    "assetId": "human.w03-player-boy.field",
    "filename": "W03_PLAYER_MALE_FIELD_ATLAS_v3.png",
    "runtimePath": "assets/final/humans/w03/players/W03_PLAYER_MALE_FIELD_ATLAS_v3.png",
    "visibleHeightPx": 38,
    "scaleClass": "STANDARD",
    "sha256": "489b3fe4d11777082af62d2e02fa6925dc97fe6e0f5d08f7bc935de4a02db02d"
  },
  {
    "lockedCharacterId": "PLAYER_FEMALE",
    "canonicalRuntimeId": "PLAYER_GIRL",
    "displayName": "여자 플레이어",
    "assetId": "human.w03-player-girl.field",
    "filename": "W03_PLAYER_FEMALE_FIELD_ATLAS_v3.png",
    "runtimePath": "assets/final/humans/w03/players/W03_PLAYER_FEMALE_FIELD_ATLAS_v3.png",
    "visibleHeightPx": 38,
    "scaleClass": "STANDARD",
    "sha256": "4ac68e857b46ca341fb12aeed415e8ef79daba9db0f72d45f2b5f4643913c904"
  }
]);
export function playerFieldAssetId(appearance='boy'){return appearance==='girl'||appearance==='female'||appearance==='player-girl'?W03_PLAYER_ATLASES[1].assetId:W03_PLAYER_ATLASES[0].assetId;}
