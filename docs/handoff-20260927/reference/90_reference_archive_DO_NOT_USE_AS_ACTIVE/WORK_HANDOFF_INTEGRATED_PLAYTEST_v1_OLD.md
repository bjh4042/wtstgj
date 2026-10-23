# 거제몬스터 — 통합 플레이테스트 Work 인계 v1

## 목적
현재 canonical data master의 **정적 통합 PASS** 다음 단계다. 기능/밸런스/저장/온라인을 실제 앱에서 검증한다.

## 절대 기준
1. `geoje_final_source_manifest_v1.json`의 `canonical_sources`와 SHA-256 fingerprint만 사용한다.
2. `(1)`, `(2)`, `v2_2`, `v1_1` 등 구 사본을 최신본으로 추정하지 않는다.
3. Species v3는 번호/이름/모티프/75계통만 권위. 최신 획득 Stage/방법은 Acquisition v2 + Encounter v2.3이 권위다.
4. STEP 1 Living Field 및 STEP 2 FR/LG FIELD ENGINE CORE의 정상 기능·아트를 임의 재설계하지 않는다.
5. 테스트 중 발견한 오류만 최소 수정하고, 정상 항목은 임의 변경하지 않는다.

## Phase A — Firebase Rules
- 이 폴더의 `database.rules.json`, `firebase.json`, `package.json`, `tests/database.rules.test.mjs` 사용.
- `npm install` 후 `npm run test:rules`.
- **26/26 PASS 필수**.
- 실패하면 규칙을 최소 수정하고 재실행. 보안 완화로 PASS시키지 않는다.

## Phase B — 새게임→FINAL→POST 진행
- PROLOGUE → S1 연초·하청 → S2 장목 → S3 아주·옥포 → ... → S9 → FINAL → POST.
- 모든 필수 23 트레이너를 실제 동선에서 확인.
- 정글돔: 트레이너 3, 필수1, 랜덤 야생/포획/흑망단 0.
- 포로수용소·흥남철수 핵심 역사구역: 전투/야생/포획 0.
- RIVAL_00~05 모두 발생, 특히 RIVAL_04 누락 금지.
- S2에서 하린과 No.150 직접 목격, 전투 없음. S3에서 흑망단 이름 공개 + RIVAL_02.

## Phase C — 전투/포획
- 1:1 싱글, 4기술, 17타입, Fairy 없음.
- 기술 ID는 MV namespace. TMxx는 아이템/보상에만 존재.
- Gym2 청잠이 Lv16 / 전광맴 Lv17만 승인된 under-level 예외.
- 사천왕 4×6, 챔피언 윤 박사 6.
- 148~150 기본 포획률 4%, 151은 3%. 실패 후 재도전 가능.
- 거제볼은 보장 포획, 평생 지급 총합 12를 넘지 않는다.

## Phase D — 도구/POST
- 기본 낚싯대 1배지 / 좋은 낚싯대 5배지 / 파도타기 7배지 / 최고급 낚싯대 8배지.
- POST 148·149·150 성소는 독립 접근.
- 세 종 포획 → 문양3 → 온섬의 나침반 → 151.
- 151은 Story Flags v2의 `CAN_CAPTURE_151` 조건 모두 만족해야 한다.

## Phase E — Save v2
- 사용자 슬롯 3개. 각 `primary + lastKnownGood`.
- 파티6 + PC 300(30×10).
- `activatedSpeciesNos`, `visitedBusStops`, `tutorialState`, `badgeTraits`, `geojeBallGrantHistory` 검증.
- 최초 윤 박사 승리 때 `firstChampionClearSnapshot` 1회 기록 후 불변.
- background 시간은 `foregroundPlayTimeSeconds`에 추가 금지.
- `.gem` export/import 후 checksum + 이름/별명 validator 재검증.

## Phase F — v1 migration fixture
- PROLOGUE-only v1 fixture: 자동 migration 성공.
- 구 S1~S3 진행 흔적이 있는 fixture: silent auto-migration 금지, reconciliation 요구.
- 온섬볼→거제볼 변환 금지.
- EXP Share는 폐기.
- TM01~49 battle move → MV201~249. 구 TM50은 No.151만 MV312, 그 외 MV250.

## Phase G — Online two-browser
- 챔피언 엔딩 전 온라인 진입 불가 / 이후 가능.
- 방코드 8자리. 방 목록 조회 불가.
- 실제 보유 파티 1~6 사용.
- commit→reveal→resolve→ACK 순서.
- 동일 seed에서 양쪽 stateHash 일치.
- 한쪽 연결 끊기 후 30초 안 재접속 성공.
- DESYNC/INVALID_REVEAL 시 싱글 Save 변화 0.

## 결과 보고 형식
각 Phase를 `PASS / FAIL / BLOCKED`로 표시하고, FAIL이면:
- 재현 절차
- 기대값 / 실제값
- 관련 canonical file/ID
- 수정 파일
- 회귀테스트 결과
을 남긴다.

최종 승인 조건은 데이터 정적 PASS에 더해 Firebase 26/26, 통합 진행, Save/migration, two-browser online, 기기 QA가 모두 PASS인 상태다.