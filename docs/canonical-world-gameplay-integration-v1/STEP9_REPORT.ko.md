# STEP 9 — CANONICAL WORLD & GAMEPLAY INTEGRATION v1

작성일: 2026-09-22. 기준: c68139a8a4be82b60057db46ad641cf334cfb14c.
검증된 실행 소스: a2c875eabd847c9da85bc80ecb959536196a1773.
브랜치: canonical-world-gameplay-integration-v1.
최종 문서/증거 commit과 checkpoint의 전체 SHA는 별도 handoff 메타데이터에서 확인한다.

## 결론과 완료 범위

placeholder 월드 55개, 351개 interaction point를 기존 canonical 서비스에 연결했다.
자동 검사상 12 Stage, 29 Encounter area, 일반/하위 Trainer 55명 + 주요 인물 전투 22개, 8 Gym, League 5개 방, POST 진입이 연결된다.
기존 942개 + 신규 58개 = 1,000/1,000 PASS. 원본·아트·후보 정책 등 보호 대상 1,028개 파일은 기준과 SHA-256이 같다.

**STEP 9 전체 완료/출시 승인으로 판정하지 않는다.** 실제 브라우저 S1~S3 완주, 정상 성장·자금으로 본편 월드 완주, 모바일 emulator/실기기, POST 예지·하린 전투는 아직 미검증 또는 차단 상태다.
자동 전편 fixture는 Lv100 파티와 고정 난수 보조를 사용했다. 서비스 fixture의 성공을 일반 플레이 성공으로 바꾸어 표현하지 않는다.

새 월드는 개발 서버 실제 index entry의 `?world=1&qa=1`에서만 선택 진입한다. 일반 canonical과 경제 후보 버튼은 분리되어 있다.
기존 앱의 기본 entry와 배포 빌드는 기존 게임 경로를 유지한다. 공개 v21은 배포하지 않았다.

## 1. 월드 계약과 변경 파일

- `dist/world/definition.mjs`: map/area/stage/biome/lighting/background, warp/actor/trainer/event/zone/fishing/research/shop/heal/landmark 계약.
- `state.mjs`: 좌표·게이트·충돌·이동·방문·퍼즐·동선 계측, 저장 검증.
- `service.mjs`: 기존 StoryProgressionService/Battle v3/Encounter/Acquisition/Economy를 호출하는 공간 계층.
- `core-spatial.mjs`: 기존 Field Engine에 선택적 map collision/sight hook. 기존 맵 fallback 유지.
- `reachability.mjs`: 맵 graph 및 tile BFS, 잘못된 warp/actor/point 검출.
- `save-store.mjs`: 기존 atomic 3-slot 재사용, 후보/QA 저장 prefix 분리.
- `render.mjs`: 기존 manifest/placeholder/환경/타일 애니메이션 재사용.
- `entry.mjs`, `world.css`, `dist/game-entry.mjs`, `dist/index.html`: 실제 DEV game entry, 키보드/버튼·상점·센터·파티·Battle UI 연결.
- 최소 수정: `dist/field-engine-core.mjs`, `dist/story/progression-service.mjs`, `dist/story/save.mjs`, `dist/economy/actions.mjs`.
- 신규 검증: `tests/canonical-world.test.mjs`, `tests/helpers/world-fixture.mjs`, `scripts/world-evidence.mjs`.
- 후보 및 결과: 이 문서와 같은 폴더의 JSON·로그·스크린샷.

아트 셀 계약 32×32는 변경하지 않았다. 월드의 논리/표시 한 칸은 기존 런타임 좌표에 맞춘 48 단위이며 tile ID와 asset 파일을 분리한다.
모든 위치는 `DEV_PLACEMENT_NOT_FINAL_GEOGRAPHY`. 실제 거제 상대 방향을 축약 좌표와 stage road 방향에 반영했지만 GIS/최종 지리 승인 자료는 아니다.

## 2. Stage별 연결

| Stage | 지역 | 맵 수 | 전투 배치 수 | 상태 |
|---|---|---:|---:|---|
| PROLOGUE | 장승포·생태센터 | 3 | 1 | 이벤트/스타터/다음 지역 gate |
| S1 | 연초·하청 | 5 | 8 | Gym1/구역/회복/상점 |
| S2 | 장목 | 4 | 7 | Gym2/150 목격, 전투 아님 |
| S3 | 아주·옥포 | 4 | 8 | Gym3/흑망단 공개/RIVAL |
| S4 | 고현 | 4 | 6 | Gym4/역사 구역 제한 |
| S5 | 거제면·둔덕 | 5 | 9 | Gym5/정글돔 랜덤 금지 |
| S6 | 동부·학동 | 4 | 8 | Gym6/구조·해안 |
| S7 | 남부·해금강 | 5 | 10 | Gym7/Surf gate |
| S8 | 일운·지세포 | 5 | 10 | Gym8/최고급 낚싯대 gate |
| S9 | 장승포 귀환·흑망단 포획선 | 4 | 5 | canonical S9 source |
| FINAL | 계룡산 리그 | 6 | 5 | 사천왕→윤 박사 |
| POST | 자유탐험·성역 | 6 | 0 | 전설/151 접근, 추가 전투 보류 |

맵 목록은 부록 A, 351개 point의 정확한 좌표·gate·ID는 `world-inventory.json`에 있다.
단순 graph에서 gate를 무시한 도달 가능성과, 실제 진행 상태를 갱신하는 동선 fixture를 분리했다.

## 3. Encounter 29지역 및 Policy A

46개 유효표 = 보행 랜덤 25개 + 낚시 21개. 46개 전부를 풀숲 표로 잘못 연결하지 않는다.
29개 area는 실제 map에 대응한다. areaId + method + gate를 기준으로 기존 canonical selection을 사용한다.
정확한 method/profile/제외 표 목록은 부록 B에 있다.

승인 제외 8개 Surf 표는 물 tile 통행만 허용하고 랜덤 전투 및 eligible step 소비를 하지 않는다.
대체 지역 표/임의 species/weight 재정규화 없음. 46 활성 / 8 정책 제외 / 미해결 격리 0 유지.
안전 5걸음·dry streak·조우/weight 분리·기본 시간/날씨 배율은 원본 그대로다.

## 4. Fishing 7지역

| areaId | 지점/방향 | 물 tile | 표 |
|---|---|---|---|
| P_JANGSEUNGPO_COAST | (12,18), 남쪽 | (12,19) | basic/good/super |
| S1_HACHEONG_BRACKISH | 동일 | 동일 | basic/good/super |
| S2_JANGMOK_COAST | 동일 | 동일 | basic/good/super |
| S6_HAKDONG_MONGDOL | 동일 | 동일 | basic/good/super |
| S7_HAEGEUMGANG_ROCKY_COAST | 동일 | 동일 | basic/good/super |
| S8_JISEPO_HARBOR | 동일 | 동일 | basic/good/super |
| S8_GUJORA_OFFSHORE | 동일 | 동일 | basic/good/super |

7개 marker, 21개 rod table, 70행 보존. 정확한 좌표 위에서 물을 바라보아야 한다.
낚싯대 소유/진행 gate는 기존 서비스가 판단한다. S7만으로 super rod/S8 조건을 우회하지 못한다.
모든 물 tile에 낚시 허용을 확장하지 않았다.

## 5. Observation / Research / Acquisition

45개 기존 acquisition event를 실제 interaction point에 배치했다. 별도로 튜토리얼 1, 나침반 1, 반복 조사점 3이 있다.
관찰/연구/구조/보호/해양 관찰/NPC 교환은 기존 acquisition ID, 요구 조건, once flag와 API를 사용한다.
관찰 전용종을 볼 포획 대상으로 바꾸지 않았다. NPC 교환은 실제 요구 종 instance를 선택해야 한다.
45개 point의 ID/지도/요구 조건은 부록 C, 상세는 inventory JSON이다.

## 6. 상점과 센터

12 Stage hub마다 상점과 센터 1개씩 배치했다. 모두 DEV placement이며 최종 상권/지리 LOCK이 아니다.
상점 UI는 확정 가격/해금을 표시한다: 생태볼 200/PROLOGUE, 친화볼 600/BADGE2, 공명볼 1200/BADGE5.
일반 세션의 미승인 자금·재고 계약을 임의 완성하지 않았으므로 **일반 세션 구매는 승인 대기**다. 후보 모드에서만 기존 후보 구매 정산을 호출한다.
거제볼·핵심 장비 임의 판매 없음.

센터는 기존 party recovery를 호출한다. 후보 모드는 HP/PP/상태/기절 회복 및 지원/의뢰를 기존 경제 거래로 처리한다.
실제로 방문한 hub만 귀환 등록. 유효한 walkable landing/진행 접근 조건을 검사한다.
미등록/잘못된 마지막 거점의 fallback은 PROLOGUE 안전 위치다. 테스트에서 벽/물/미해금 POST 귀환을 차단했다.

## 7. 반복 조사 의뢰 동선 및 경제 증거

| 순서 | 관찰/보고 위치 | 이동 칸 |
|---|---|---:|
| 1 | P_ECO_CENTER_EDGE (31,11) 숲 관찰 | 40 |
| 2 | P_JANGSEUNGPO_COAST (30,17) 해안 관찰 | 64 |
| 3 | PROLOGUE hub (32,16) 항구 관찰 | 67 |
| 4 | 센터 (5,12) 보고 | 29 |
| 합계 | hub + 2개 area, 서로 다른 3점 | 200 |

생성된 월드의 실제 이동 API와 브라우저 키보드 경로 모두 200칸을 확인했다.
0.22초/칸 기준 **순수 이동 44초 추정**이다. 대화·warp 지연·사고 시간·전투를 포함한 실제 평균 플레이 시간은 측정하지 않았다.
후보 시작 3,000 → 정상 의뢰 보고 400 → 3,400. 테스트 자금 추가/레벨 상승/볼 공급 없이 이 의뢰를 실행했다.
같은 회차 재보고와 저장/불러오기로 보상이 늘지 않았다.
이 결과는 **비전투 반복 수입 동선 검사**이며 정상 성장 본편 완주 run이 아니다.

STEP8의 한 화면 QA 배치와 달리 두 지역 왕복과 hub 관찰을 필요로 한다. 초반부터 유료 장비/포획 없이 접근한다.
첫 상점과 무료 센터는 PROLOGUE hub (9,12)/(5,12). 친화볼은 Gym2 이후, 공명볼은 Gym5 이후 기존 badge gate가 열려야 구매 가능하다.
볼 소진 지원은 같은 센터에서만 조건을 검사한다. 일반 세션에는 후보 지원이 켜지지 않는다.
S3까지의 정상 자금·성장·전투/이동 포함 경제 균형 run은 이번 결과에 없다.

## 8. Trainer / NPC / Gym / League

55명은 일반 루트 35 + 체육관 하위 20명이다. 여기에 canonical 주요 인물 전투 22개를 더해 77개 trainer ID를 연결했다.
이름이 아니라 canonical NPC ID / fieldAsset ID / trainer ID / event ID를 분리했다.
기존 Field Core cardinal sight·가림·접근·대화·전환을 재사용한다. 저장된 defeated 상태는 재진입 후 유지된다.
잘못된 축의 sight와 벽 너머 발견 차단, actor collision, 중복 전투 방지가 자동 검사에 포함된다.

체육관은 8개 독립 interior, 입구/왕복 출구/하위 trainer/스위치 통로/관장으로 구성한다.
순서: 강민 WATER → 영진 ELECTRIC → 정의 GRASS → 진성 NORMAL → 명주 BUG → 주혁 ROCK → 우상 FLYING → 닥터 채 POISON.
퍼즐은 기능 검증용 최소 스위치 구조이며 최종 퍼즐 디자인으로 승인된 것이 아니다.

리그는 윤우→시윤→은미→준호→윤 박사 5개 방과 선행 승리 gate를 사용한다.
Story/Battle 결과와 위치는 기존 atomic 저장 경로로 정산한다. 저장에 연결한 세션은 각 전투/진행 후 자동 저장된다.
POST warp는 챔피언 클리어 후 열리며 자유 재방문을 유지한다.

## 9. POST

148/149/150 고정 조우, 실패·도주 후 재도전, 나침반 조건, 151 지역/획득 gate를 기존 source대로 연결했다.
실제 world 이동 API를 사용하는 별도 테스트에서 전설 4개 경로까지 검증했다.
이 테스트는 **QA 볼 20개와 난수 0**을 사용했으므로 일반 포획률/경제 검증이 아니다.

접근 가능한 하린·예지 interaction은 있으나 파티를 임의 생성하지 않았다.
- POST 하린: 현재 canonical source에 POST 재대결 party가 없음. 명시적으로 차단/사유 표시.
- 예지: enhanced league source에 EDNA preview 종 및 아직 활성화하지 않은 gate/party가 있어 차단.
본편 RIVAL00~05, S2 목격, S3 공개, S9 동료 흐름은 기존 active event 순서 그대로다.

## 10. 거제볼 숨김 배치 후보

`GEOJE_BALL_HIDDEN_PLACEMENT_CANDIDATE_v1.json`에 12개 후보를 제출했다.
각 1개, S1~S9 각각 1개 + FINAL 1개 + POST 2개. 좌표/새 flag/퍼즐은 runtime 미등록이다.
샛길/숨은 NPC/선택 퍼즐/섬 보관함 등의 방식이며 지나칠 수 있지만 영구 missable은 없고 재방문 가능하게 제안했다.
`approvalStatus=PENDING_USER_APPROVAL`, `runtimeEnabled=false`.

기존 원본 자동 배분표는 삭제하지 않았다.
**새 world marker가 있는 세션에서는 역사적 자동 거제볼 보상을 중지**하며 기존 보유량/원장/lifetime cap=12를 보존한다.
구 저장/legacy에는 일괄 재이관·아이템 삭제를 적용하지 않았다.
숨겨진 12개 위치 승인과 포획 배율 승인은 별개다.
일반 세션의 기존 100% 포획 충돌은 여전히 승인 적용 대기다.

## 11. 후보 정책 불변

시작금 3,000; 상금 L×40/80/120; 조사 400; 일반볼0+money<200이면 센터 지원3; 후보 구매 전용/일반 해금 소모품 무제한 재고; 패배 금전 차감0; 거제볼 일반×3/148~151×5/cap95%.
모두 기존 후보 모드에만 존재하며 새 수치 승인/변경은 없다.
후보 config SHA-256:
`2a94d49207f679cd5012e090f2e2a9e503b7e0ae2bb54a7541016bc5f5464a84`.

## 12. 환경·아트·follower 보존

맵별 biome/lighting/background ID, 실외 weather support, Mock/local time hook이 있다.
전투 background/앞뒤 sprite scale-anchor-offset/VFX/audio는 기존 Battle v3 presentation을 사용한다.
NPC/건물/tile/background/생태몬을 manifest ID로 참조하며 파일 경로를 새 gameplay 로직에 넣지 않았다.
최종 인간20명·생태몬151종·건물·타일·배경·음원이 없어도 기존 placeholder/silent fallback으로 작동한다.
follower 코드/12프레임 계약/manifest/metadata는 변경하지 않았고 새 활성화나 그림 제작도 하지 않았다.

## 13. 자동 검증

| 검사 | 결과 | 범위/제한 |
|---|---|---|
| 기존 회귀 | 942/942 PASS | 기존 테스트 기대값 변경 없음 |
| 신규 월드 | 58/58 PASS | 격리/저장/동선/게이트/전투/후보 보존 |
| 전체 | 1,000/1,000 PASS | fail 0, skip 0, cancel 0 |
| build | PASS | 기존 bundle 500KB 경고 유지 |
| typecheck | PASS | 프로젝트 기존 지정 범위; 모든 신규 JS의 엄격 타입 검사를 뜻하지 않음 |
| 신규 주요 모듈 node --check | PASS | entry/service/definition |
| graph/BFS | 55 map / 351 point PASS | 잘못된 목적지·고립·벽 NPC negative test 포함 |
| 원본/아트/후보/follower 보호 | 1,028파일 SHA 일치 | `preservation.json` |
| 일반 경제·실제 완주 | NOT_RUN | 자동 fixture와 구분 |

전체 로그 `full-test.log`가 최종 1,000개 실행 증거다.
`new-test.log`는 중간 단계 52개 실행 기록으로 보존했으며 최종 58개 결과로 재표기하지 않았다.
전체 기능 run은 기존 production API를 사용해 8,447칸, 77 Battle v3 승리, 8 badge, 챔피언, POST까지 진행했다.
Lv100 파티/고정 .99 RNG/전투 전 회복을 썼다. 정상 레벨 성장·자금/포획·실제 시간의 균형 증거가 아니다.

## 14. 실제 브라우저 QA

별도 가짜 demo가 아니라 DEV game entry에서 실행했다. 후보 저장은 `geoje.dev.world-candidate-v1.`; 일반 QA는 `geoje.dev.world-qa-v1.`을 사용한다.
세부 기대/실제/commit은 `browser-qa.json`에 기록한다.
PROLOGUE keyboard movement, map warp, 관찰3점, 보고, 후보 상점/잠금, 저장/불러오기, 메뉴 잠금, D-pad pointer click을 확인했다.
추가로 실제 Lv.5 점삵이로 하린 RIVAL00을 승리하고, 초기 생태볼5/회복약3 지급, 회복약 사용(HP14→19, 3→2), 효과 없는 재사용의 미소모를 확인했다. 레벨/돈/난수를 강제 조작하지 않았다.
S1까지 키보드로 진입해 Gym1 왕복/스위치, 하청 갈고미 Lv.6 관찰 획득(볼 미소모), 미해금 rod 차단을 확인했다.
연초 하천 풀숲에서 실제 랜덤 물챙이 Lv.5 전투가 시작됐다. 첫 포획 실패로 생태볼5→4, HP19→16, 이후 도주→안전 걸음5→저장/불러오기 동일 상태를 확인했다.
S1 센터로 실제 이동해 HP16→19 회복, 돈3800/볼4/회복약2 불변을 확인했다. 최종 화면은 browser-s1-center.jpg다.
정상 browser 진행은 S1 일부까지이며 Gym1 클리어/S2/S3/본편 완주를 주장하지 않는다.
브라우저 fixture 파일 업로드는 권한 거절로 중단했고 우회하지 않았다.
S2/S3 브라우저 전체 구간, 해금된 낚시 전투/성공 포획/패배 귀환/기절·상태 회복은 미실행 또는 부분 실행으로 별도 기록한다.
모바일 emulator viewport 제어 수단이 없어 BLOCKED, 실제 iPhone/Android는 미실행이다.
D-pad의 마우스 pointer click을 모바일 터치 검증으로 계산하지 않았다.

## 15. 남은 blocker / 승인 사항

| 항목 | 필요한 다음 작업 |
|---|---|
| S1~S3 실제 브라우저 완료 | 정상 성장 플레이 또는 별도 승인된 QA 저장을 허용된 경로로 사용해 검증 |
| 정상 경제/성장 월드 run | 다중 seed·스타터·성향, 실제 이동/회복/포획 소비 포함 재측정 |
| 예지 enhanced league | preview 종 identity와 canonical party/gate 확정·활성화 범위 결정 |
| 하린 POST 재대결 | canonical POST party/timing source 필요 |
| 거제볼12곳 | 분배·발견 방식·최종 좌표/재방문 승인. 현재 미적용 |
| 경제/거제볼 포획 후보 | 승인 전 일반 기본값 비활성; 일반100% 충돌 미해결 |
| 상점/센터 위치 | DEV placement를 실제 지리/플레이 동선으로 검수 |
| 미정 품목 가격/stock | 기존 확정 볼 외 새로운 가격 생성 없음 |
| 모바일/실기기 | 별도 viewport/실기기 환경 검수 |
| 최종 아트/음원 | 계약에 맞춘 PNG/SFX 투입; 현재 placeholder |

## 16. 보존 / 복원 / 실행

초기 작업 도중 이전 작업 경로의 파일이 사라져 기존 STEP8A 복원 bundle에서 기준 커밋을 복원했다.
이후 코드는 대화 범위의 작업 경로에 재구성하고 단계별 commit으로 보존했다.
기존 기준/안정 checkpoint와 원본 복원 패키지는 변경하지 않았다. 중간 유실 경로의 미완성 파일을 최종 증거로 사용하지 않았다.

설치/검증: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`.
로컬 실행: `npm run dev -- --host 127.0.0.1` 후 실제 게임 entry의 `?world=1&qa=1`.
관리형 환경에서는 승인된 preview 절차를 사용한다. 직접 공개 배포는 하지 않는다.
동선/무결성 증거 재생성: `node scripts/world-evidence.mjs`.
브라우저 진입 후 일반 또는 명시적 후보 새 게임 선택 → 지도/목표 안내에서 좌표 확인 → 방향키/Z/M.
후보 저장을 일반 slot에 가져오지 않는다. 기존 non-world 저장은 자동 재배치하지 않고 원본을 유지한다.

롤백은 기존 checkpoint를 별도 branch/worktree로 열어 수행한다. 현재 branch를 reset/clean 하거나 기존 tag를 옮기지 않는다.
최종 source/checkpoint·원격 SHA·증거 ZIP 무결성은 별도 handoff 메타데이터와 함께 제공한다.

## 부록 A. 전체 55개 map 목록

| mapId | 표시 지역 | kind | biome / lighting | trainer 수 |
|---|---|---|---|---:|
| world:hub:PROLOGUE | 장승포 · 거제 생태센터 | hub | COAST/COAST | 1 |
| world:hub:S1 | 연초 · 하청 | hub | RURAL/RURAL | 1 |
| world:hub:S2 | 장목 | hub | COAST/COAST | 0 |
| world:hub:S3 | 아주 · 옥포 | hub | FOREST/FOREST | 1 |
| world:hub:S4 | 고현 | hub | URBAN/URBAN | 0 |
| world:hub:S5 | 거제면 · 둔덕 | hub | RURAL/RURAL | 1 |
| world:hub:S6 | 동부 · 학동 | hub | ROCKY_SHORE/COAST | 0 |
| world:hub:S7 | 남부 · 해금강 | hub | CLIFF/CLIFF | 1 |
| world:hub:S8 | 일운 · 지세포 | hub | COAST/COAST | 1 |
| world:hub:S9 | 장승포 귀환 · 흑망단 포획선 | hub | COAST/COAST | 0 |
| world:hub:FINAL | 계룡산 생태리그 | hub | LEAGUE/GYM | 0 |
| world:hub:POST | 거제 전역 · 도서 자유탐험 | hub | COAST/COAST | 0 |
| world:area:P_ECO_CENTER_EDGE | 생태센터 주변 숲길 | area | FOREST/FOREST | 0 |
| world:area:P_JANGSEUNGPO_COAST | 장승포 해안길 | area | COAST/COAST | 0 |
| world:area:S3_AJU_GRASSLAND | 아주 초지길 | area | GRASSLAND/RURAL | 2 |
| world:area:S3_OKPO_FOREST_EDGE | 옥포 숲 가장자리 | area | FOREST/FOREST | 2 |
| world:area:S1_YEONCHO_STREAM | 연초 하천길 | area | RURAL/RURAL | 1 |
| world:area:S1_HACHEONG_WETLAND | 하청 습지 | area | RURAL/RURAL | 1 |
| world:area:S1_HACHEONG_BRACKISH | 하청 기수 해안 | area | COAST/COAST | 2 |
| world:area:S2_JANGMOK_COAST | 장목 해안길 | area | COAST/COAST | 2 |
| world:area:S2_JANGMOK_BIRD_HILL | 장목 철새 언덕 | area | GRASSLAND/RURAL | 2 |
| world:area:S4_GOHYEON_GREENBELT | 고현 생활권 녹지 | area | URBAN/URBAN | 2 |
| world:area:S4_POW_CAMP_PARK_EDGE | 포로수용소유적공원 외곽 녹지 | area | URBAN/URBAN | 1 |
| world:area:S5_DUNDEOK_FARMLAND | 둔덕 들녘 | area | RURAL/RURAL | 1 |
| world:area:S5_DUNDEOK_FOREST_STREAM | 둔덕 숲계곡 | area | FOREST/FOREST | 0 |
| world:area:S6_HAKDONG_MONGDOL | 학동몽돌해변 | area | ROCKY_SHORE/COAST | 3 |
| world:area:S6_HAKDONG_FOREST | 학동 숲길 | area | FOREST/FOREST | 1 |
| world:area:S7_NAMBU_CLIFF | 남부 절벽길 | area | CLIFF/CLIFF | 2 |
| world:area:S7_NAMBU_COOL_VALLEY | 남부 서늘한 계곡 | area | FOREST/FOREST | 1 |
| world:area:S7_HAEGEUMGANG_ROCKY_COAST | 해금강 바위해안 | area | ROCKY_SHORE/COAST | 2 |
| world:area:S8_JISEPO_HARBOR | 지세포항 | area | COAST/COAST | 3 |
| world:area:S8_GUJORA_OFFSHORE | 구조라 외해 | area | COAST/COAST | 2 |
| world:area:S8_ILUN_CORAL_RESEARCH_ZONE | 일운 산호보호 연구구역 | area | COAST/COAST | 0 |
| world:area:S9_JANGSEUNGPO_RETURN_ROUTE | 장승포 귀환길 | area | COAST/COAST | 2 |
| world:area:POST_ISLAND_EXPEDITION | 도서 탐험지 | area | FOREST/FOREST | 0 |
| world:area:POST_BLUE_CURRENT_SANCTUARY | 푸른해류의 성소 | area | COAST/COAST | 0 |
| world:area:POST_DEEP_FOREST_SANCTUARY | 깊은숲 성소 | area | FOREST/FOREST | 0 |
| world:area:POST_SEA_WIND_ALTAR | 해풍의 제단 | area | CLIFF/CLIFF | 0 |
| world:area:POST_ONSEOM_GARDEN | 온섬의 정원 | area | FOREST/FOREST | 0 |
| world:area:S5_GEOJE_JUNGLE_DOME | 거제식물원 정글돔 | area | INDOOR/INDOOR | 3 |
| world:area:S9_HUNGNAM_MEMORIAL_PARK | 흥남철수 기념공원 | area | URBAN/URBAN | 0 |
| world:gym:1 | 1관 · 강민 | gym | GYM/GYM | 3 |
| world:gym:2 | 2관 · 영진 | gym | GYM/GYM | 3 |
| world:gym:3 | 3관 · 정의 | gym | GYM/GYM | 3 |
| world:gym:4 | 4관 · 진성 | gym | GYM/GYM | 3 |
| world:gym:5 | 5관 · 명주 | gym | GYM/GYM | 4 |
| world:gym:6 | 6관 · 주혁 | gym | GYM/GYM | 4 |
| world:gym:7 | 7관 · 우상 | gym | GYM/GYM | 4 |
| world:gym:8 | 8관 · 닥터 채 | gym | GYM/GYM | 4 |
| world:league:1 | 윤우의 방 | league | LEAGUE/GYM | 1 |
| world:league:2 | 시윤의 방 | league | LEAGUE/GYM | 1 |
| world:league:3 | 은미의 방 | league | LEAGUE/GYM | 1 |
| world:league:4 | 준호의 방 | league | LEAGUE/GYM | 1 |
| world:league:5 | 윤 박사의 방 | league | LEAGUE/GYM | 1 |
| world:ship:S9 | 흑망단 포획선 | ship | INDOOR/INDOOR | 3 |

## 부록 B. 29개 area 연결

각 area의 mapId는 `world:area:` + areaId다. 실제 레벨/weight/해금은 기존 Encounter/Fishing/Acquisition 원본과 adapter를 재사용한다.

| areaId | Stage | 보행 method (profile) | Policy A 제외 tableId |
|---|---|---|---|
| P_ECO_CENTER_EDGE | PROLOGUE | land_grass (NORMAL) | — |
| P_JANGSEUNGPO_COAST | PROLOGUE | shore_walk (SPARSE) | — |
| S3_AJU_GRASSLAND | S3 | land_grass (NORMAL) | — |
| S3_OKPO_FOREST_EDGE | S3 | forest_edge (RICH) | — |
| S1_YEONCHO_STREAM | S1 | riverbank (NORMAL) | — |
| S1_HACHEONG_WETLAND | S1 | wetland_walk (RICH) | — |
| S1_HACHEONG_BRACKISH | S1 | shore_walk (SPARSE) | S1_HACHEONG_BRACKISH:surf_brackish |
| S2_JANGMOK_COAST | S2 | shore_walk (SPARSE) | S2_JANGMOK_COAST:surf_nearshore |
| S2_JANGMOK_BIRD_HILL | S2 | open_field (NORMAL), rare_sky (NORMAL) | — |
| S4_GOHYEON_GREENBELT | S4 | urban_green (NORMAL), riverbank (NORMAL) | — |
| S4_POW_CAMP_PARK_EDGE | S4 | park_edge (SPARSE) | — |
| S5_DUNDEOK_FARMLAND | S5 | farmland (NORMAL), wet_field (NORMAL) | — |
| S5_DUNDEOK_FOREST_STREAM | S5 | forest_stream (RICH) | — |
| S6_HAKDONG_MONGDOL | S6 | rocky_shore (SPARSE) | S6_HAKDONG_MONGDOL:surf_nearshore |
| S6_HAKDONG_FOREST | S6 | forest (RICH) | — |
| S7_NAMBU_CLIFF | S7 | mountain_cliff (NORMAL) | — |
| S7_NAMBU_COOL_VALLEY | S7 | valley_forest (NORMAL) | — |
| S7_HAEGEUMGANG_ROCKY_COAST | S7 | rocky_shore (SPARSE) | S7_HAEGEUMGANG_ROCKY_COAST:surf_nearshore |
| S8_JISEPO_HARBOR | S8 | harbor_edge (SPARSE) | S8_JISEPO_HARBOR:surf_nearshore |
| S8_GUJORA_OFFSHORE | S8 | 보행 랜덤 없음 | S8_GUJORA_OFFSHORE:surf_offshore |
| S8_ILUN_CORAL_RESEARCH_ZONE | S8 | 보행 랜덤 없음 | — |
| S9_JANGSEUNGPO_RETURN_ROUTE | S9 | return_land (NORMAL) | S9_JANGSEUNGPO_RETURN_ROUTE:return_surf |
| POST_ISLAND_EXPEDITION | POST | post_forest (RICH), post_sky (RICH) | POST_ISLAND_EXPEDITION:post_surf |
| POST_BLUE_CURRENT_SANCTUARY | POST | 보행 랜덤 없음 | — |
| POST_DEEP_FOREST_SANCTUARY | POST | 보행 랜덤 없음 | — |
| POST_SEA_WIND_ALTAR | POST | 보행 랜덤 없음 | — |
| POST_ONSEOM_GARDEN | POST | 보행 랜덤 없음 | — |
| S5_GEOJE_JUNGLE_DOME | S5 | 보행 랜덤 없음 | — |
| S9_HUNGNAM_MEMORIAL_PARK | S9 | 보행 랜덤 없음 | — |

## 부록 C. 45개 Acquisition interaction

| acquisition ID | mapId | 추가 요구 조건(원본) |
|---|---|---|
| TRADE_029_CICADA | world:area:S3_AJU_GRASSLAND | 기존 Acquisition gate |
| TRADE_113_MACHILUS | world:area:S6_HAKDONG_FOREST | 기존 Acquisition gate |
| TRADE_143_OYSTER | world:area:S8_JISEPO_HARBOR | 기존 Acquisition gate |
| LANDMARK_035_FIREFLY | world:area:S1_YEONCHO_STREAM | story_evening_survey |
| LANDMARK_104_MONGDOL | world:area:S6_HAKDONG_MONGDOL | 기존 Acquisition gate |
| LANDMARK_119_OSEK_ROCK | world:area:S7_NAMBU_CLIFF | 기존 Acquisition gate |
| LANDMARK_121_HAEGEUMGANG_CAVE | world:area:S7_HAEGEUMGANG_ROCKY_COAST | field_ability_surf |
| OBSERVE_049_BRACKISH_SNAIL | world:area:S1_HACHEONG_BRACKISH | 기존 Acquisition gate |
| OBSERVE_051_SHORE_CRAB | world:area:S1_HACHEONG_BRACKISH | 기존 Acquisition gate |
| OBSERVE_053_PLOVER | world:area:S1_YEONCHO_STREAM | 기존 Acquisition gate |
| RESEARCH_054_DONGSARI | world:area:S1_YEONCHO_STREAM | 기존 Acquisition gate |
| MIGRATION_056_CRANE_S1 | world:area:S1_YEONCHO_STREAM | 기존 Acquisition gate |
| MIGRATION_058_SWAN_S1 | world:area:S1_YEONCHO_STREAM | 기존 Acquisition gate |
| MIGRATION_056_CRANE_S2 | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| MIGRATION_058_SWAN_S2 | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| RESEARCH_060_UTRICULARIA | world:area:S1_HACHEONG_WETLAND | 기존 Acquisition gate |
| RESEARCH_060_UTRICULARIA_S5 | world:area:S5_DUNDEOK_FARMLAND | 기존 Acquisition gate |
| OBSERVE_072_EAGLE | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| OBSERVE_074_FALCON | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| OBSERVE_075_OSPREY | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| OBSERVE_076_HOBBY | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| OBSERVE_077_KITE | world:area:S2_JANGMOK_BIRD_HILL | 기존 Acquisition gate |
| RESEARCH_084_OTTER | world:area:S4_GOHYEON_GREENBELT | 기존 Acquisition gate |
| OBSERVE_086_OWL | world:area:S4_POW_CAMP_PARK_EDGE | 기존 Acquisition gate |
| RESEARCH_094_DUNG_BEETLE | world:area:S5_DUNDEOK_FARMLAND | 기존 Acquisition gate |
| OBSERVE_098_PARADISE_FLYCATCHER | world:area:S5_DUNDEOK_FOREST_STREAM | 기존 Acquisition gate |
| OBSERVE_099_HONEY_BUZZARD | world:area:S5_DUNDEOK_FARMLAND | 기존 Acquisition gate |
| RESEARCH_107_PITTA | world:area:S6_HAKDONG_FOREST | 기존 Acquisition gate |
| RESCUE_109_GEOJE_SNAIL | world:area:S6_HAKDONG_FOREST | 기존 Acquisition gate |
| RESEARCH_127_SEOKGOK | world:area:S7_NAMBU_COOL_VALLEY | 기존 Acquisition gate |
| RESEARCH_129_SONGI | world:area:S7_NAMBU_COOL_VALLEY | 기존 Acquisition gate |
| OBSERVE_131_WHITE_TAILED_EAGLE | world:area:S7_NAMBU_CLIFF | 기존 Acquisition gate |
| OBSERVE_132_SPARROWHAWK | world:area:S7_NAMBU_CLIFF | 기존 Acquisition gate |
| OBSERVE_133_GOSHAWK | world:area:S7_NAMBU_CLIFF | 기존 Acquisition gate |
| OBSERVE_134_VULTURE | world:area:S7_NAMBU_CLIFF | 기존 Acquisition gate |
| OBSERVE_137_SEAHORSE | world:area:S8_GUJORA_OFFSHORE | field_ability_surf |
| RESEARCH_141_FINLESS_PORPOISE | world:area:S8_GUJORA_OFFSHORE | field_ability_surf |
| SPECIAL_145_PUNGRAN | world:area:S7_NAMBU_COOL_VALLEY | 기존 Acquisition gate |
| SPECIAL_146_CORAL | world:area:S8_ILUN_CORAL_RESEARCH_ZONE | 기존 Acquisition gate |
| SPECIAL_147_DAEHEUNG | world:area:S7_NAMBU_COOL_VALLEY | 기존 Acquisition gate |
| POST_STARTER_RESEARCH | world:area:POST_ISLAND_EXPEDITION | 기존 Acquisition gate |
| LEGEND_148_CAPTURE | world:area:POST_BLUE_CURRENT_SANCTUARY | 기존 Acquisition gate |
| LEGEND_149_CAPTURE | world:area:POST_DEEP_FOREST_SANCTUARY | 기존 Acquisition gate |
| LEGEND_150_CAPTURE | world:area:POST_SEA_WIND_ALTAR | 기존 Acquisition gate |
| MYTHIC_151_CAPTURE | world:area:POST_ONSEOM_GARDEN | 기존 Acquisition gate |
