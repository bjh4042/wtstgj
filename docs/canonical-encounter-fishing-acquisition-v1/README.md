# STEP 7 — Canonical Encounter / Fishing / Acquisition v1

기준: `3551c32e8890940e8d87d6aeebb9eb67542a6cbe` / `checkpoint-canonical-story-stage-trainer-v1`.
새 branch: `canonical-encounter-fishing-acquisition-v1`.
새 checkpoint: `checkpoint-canonical-encounter-fishing-acquisition-v1`.
공개 v21에는 배포하지 않는다. canonical 원본, 기존 species/asset, 기존 테스트 파일은 수정하지 않았다.

## 결과와 완료 범위

| 항목 | 결과 |
|---|---|
| Encounter 지역 | 29/29 등록 및 source coverage 검증 |
| 종 선택 테이블 | 54개 모두 합계 100 / 각각 100,000회 분포 검증 PASS |
| 실제 활성 테이블 | 46개: 이동 25개 + 낚시 21개 |
| 격리 테이블 | 수상 이동 8개: 상위 Acquisition과 충돌하는 slot 42개 |
| Fishing | 7지역 / 70행 / 21개 rod table |
| Acquisition | 75/75 계통 기본형 경로 존재 |
| 151종 | 획득·진화 경로 및 production API 통합 fixture PASS |
| 스타터 random 위반 | 원본 및 활성 테이블 0 |
| special random 위반 | 활성 테이블 0; 원본의 fishing-only 수상 슬롯 42개는 격리 |
| 기존 회귀 | 602/602 PASS |
| 신규 테스트 | 211/211 PASS |
| 전체 | 813/813 PASS, 실패/취소/skip 0 |
| 기타 | typecheck, production build, canonical validator, art validator, DEV module imports, diff check PASS |
| 브라우저 화면 QA | 미실행: 현재 환경에 agent-browser 실행 도구 없음 |

**전체 출시 완료 판정은 아니다.** 151종 통합 테스트는 포획볼과 반복 육성만 QA fixture로 보조한다. 실제 세션은 기존 canonical 보상(초기 생태볼 5개 등)을 그대로 사용한다. 돈 수입/상점 재보급, 29개 canonical 지역의 최종 지리 배치, 아래 8개 수상 테이블 원본 정정이 남아 있다. 무료 볼·임의 재화·새 맵·새 획득 조건을 만들지 않았다.

## 활성화와 실제 게임 연결

- `activateCanonicalEncounterSave(storySave, catalog)`로 검증된 canonical Story 저장에만 명시적으로 적용한다. 원본은 변경하지 않으며 기존 slot store의 원본 archive / lastKnownGood 전략을 유지한다.
- namespace는 `canonical-v1`, catalog identity는 `SPECIES_*` 그대로다. 추가 `encounterVersion = canonical-encounter-v1`이 없는 STEP 6 세션은 기존 상태로 유지된다. legacy에는 적용되지 않는다.
- StoryProgressionService의 동일 transaction lock / 저장 validator / Battle v3 / field transition을 재사용한다. 별도 전투 엔진이나 별도 진행 상태를 만들지 않는다.
- `enterArea`, `encounterStep`, `fish`, `surveyAcquisition`, `acquire`, `assembleCompass`, `evolve`를 통해 실제 세션을 변경한다. 일반 Story event API로 capture proof를 건너뛰지 못한다.
- 기존 field engine에는 WeakMap 기반 opt-in handler 2줄만 추가했다. host에서 `attachCanonicalEncounterField`를 연결하면 실제 완료된 48px 이동과 인접 셀 확인 후 판정한다. 이것은 기존 field world grid이며 TILESET CONTRACT의 32px 원본 셀 규격은 바꾸지 않았다.
- 방향만 변경/벽/메뉴/대화/warp·ledge 순간이동은 걷기 판정이 아니다. 필드 도중 저장 실패 시 service의 pending transaction을 해결한 뒤 입력을 재개해야 한다. DEV host는 이 조건을 지킨다.
- 현재 필드는 기존 artwork/geometry에 canonical area metadata를 연결하는 placeholder host다. 실제 29개 지리 영역을 기존 지도에 임의 배치하지 않는다.
- 전투 배경은 field host의 map/biome을 전달한다. sprite scale/anchor/offset, VFX, audio, placeholder는 기존 Battle v3 경로를 그대로 사용한다.

## 빈도 정책

Trigger와 species weight는 별도 모듈/난수 단계다. `NONE=0`, `SPARSE=.05`, `NORMAL=.09`, `RICH=.12`, `VERY_RICH=.16`.
해안/몽돌/항구/공원 외곽은 SPARSE, 명시한 조사 숲·습지는 RICH, 나머지 승인된 일반 조우는 NORMAL. VERY_RICH는 현재 배정하지 않았다. 도심 핵심 구역에는 임의 table을 만들지 않는다. `urban_green`은 source가 허용한 도심 외곽 녹지이며 도심 핵심 구역과 구분한다.

야생·낚시·고정 포획 전투의 승리/패배/포획/도망 후 안전 걸음 5회. 안전 걸음은 eligible 이동에서만 감소한다. 저장, 메뉴, 대화, 지역 재선택은 초기화하지 않는다. 신규 활성화는 0으로 시작한다.
10번 실패 후 다음 check(11번째)부터 +2pp, 15번째 +4pp, 19번째 +6pp, 23번째 이후 +8pp cap. species weight에는 영향 없음.

각 profile **100,000 encounter intervals**, seed 29521, 안전 걸음 5회 포함:

| Profile | 평균 eligible steps | 중앙값 | 95% drought |
|---|---:|---:|---:|
| SPARSE | 19.25776 | 18 | 37 |
| NORMAL | 14.75803 | 13 | 30 |
| RICH | 12.78882 | 11 | 26 |

SPARSE는 의도한 20~25보다 약간 짧다. 요청된 확률과 dry-streak 정책은 그대로 유지했으며 플레이테스트 후 tuning 대상이다. drought는 전투 종료부터 다음 조우까지의 eligible 걸음 수(안전 5회 포함)다. 실제 거리/초 단위가 아니다.

## Fishing 분포

낚시는 명시적 행동이다. rod 소지와 BADGE_01/05/08 + CAN_FISH gate, area stage, offshore CAN_SURF를 검사한다. 물고기 슬롯 선택 weight를 입질 확률로 재사용하지 않는다. v1에서는 별도 입질 실패율/순발력 손실을 발명하지 않았으며, 승인된 행동이 weighted selection을 시작한다.

아래는 각 테이블 100,000회 표본의 slot 순서 결과다. 동일 rod weight에 동일 seed를 사용하므로 7지역에서 slot별 결과가 같다(독립 700,000회 표본으로 합산하지 않는다).

| Rod | 정의 (%) | 실제 (%) |
|---|---|---|
| basic | 70 / 30 | 70.110 / 29.890 |
| good | 60 / 20 / 20 | 60.216 / 20.004 / 19.780 |
| super | 40 / 40 / 15 / 4 / 1 | 40.217 / 40.003 / 14.770 / 4.053 / 0.957 |

검증 허용 오차는 binomial 6σ + 2/N. 54개 테이블 전체 상세값, species ID, level은 `verification.json`에 기록한다. 격리된 8개도 수학적 분포 자체는 검증했으나 runtime 활성화를 의미하지 않는다.

## 획득 / POST / 진화

- 랜덤 금지종을 허용하는 boolean bypass를 만들지 않았다. table/event gate를 통과한 **단회 session/revision/species/level-bound capability**만 Battle v3 고정/낚시 포획을 허용한다. STEP 7 wild battle에서 capability가 없으면 차단한다.
- 고정 조우는 포획 성공에만 완료된다. 처치/도망/패배 후에는 재도전 가능. source의 불명확한 POST 저빈도 재포획 확장은 아직 활성화하지 않았다.
- 보호종은 공을 소비하지 않는 연구/관찰 동행 등록. 같은 계통의 대체 관찰 이벤트는 중복 개체를 지급하지 않는다.
- NPC 교환은 source의 요구종과 명시적으로 선택한 instance를 소비한다. 파티/박스의 같은 자리를 교환하고 기존 도감 기록은 보존한다. 수신 계통을 현재 보유하면 재교환을 막는다.
- 미선택 스타터 두 계통은 `POST_STARTER_RESEARCH`에서만 획득. 일반 random/fishing에는 전 계통 001~009가 없다.
- 148→149→150 포획, 문양 보상, 나침반, 151 포획은 canonical gate/Story order와 원자적 보상 ledger를 사용한다. Geoje ball 평생 지급 상한 12 유지.
- 특수 이벤트 레벨은 source에 개별 값이 없어 해당 canonical area 권장 최저 레벨을 사용한다. POST 스타터 gift는 기존 스타터 Lv.5. 별도 balance 확정값이 아닌 명시적 adapter 운영 바인딩이다.
- 진화는 Battle v3의 canonical evolution ID/level을 사용한다. 동일 instance/EXP/status/기존 기술 PP 보존, canonical chain으로 검증한 evolutionHistory를 기록해 이전 형태의 기술을 안전하게 유지하고 새 기술은 선택 대기열에 넣는다.
- 현실 날씨/시간은 availability를 바꾸지 않는다. timeModifier/weatherModifier는 둘 다 1.0이다. 반딧불 저녁 조사는 명시적 이야기 조사 행동이며 실제 저녁까지 기다리지 않는다.

## 저장

추가 저장: areaId, method, safeStepsRemaining, dryStreak, eligibleSteps, movementSerial, acquisitionCompleted, fixedCompleted, surveys, receipts. 낚싯대 해금은 기존 story flags와 item inventory로 복원한다.
이벤트/receipt/포획/dex/보상을 같은 저장 transaction으로 처리한다. 3개 슬롯은 서로 독립적이다. 저장 실패 시 원본을 유지하고 재시도 외 명령을 차단하므로 중복 지급이 없다. canonical/legacy 혼합 변환은 하지 않는다.

## 권위 충돌과 남은 blocker

상위 CSV는 064/068/100/102/117/135/139 계통을 fishing-only로 정의한다. 하위 Encounter의 일부 surf table은 그 종을 step random으로 포함한다. **원본 overwrite, slot 삭제, weight 재정규화, 임의 override를 하지 않고 table 전체를 격리**했다.

| 격리 areaId | method |
|---|---|
| S1_HACHEONG_BRACKISH | surf_brackish |
| S2_JANGMOK_COAST | surf_nearshore |
| S6_HAKDONG_MONGDOL | surf_nearshore |
| S7_HAEGEUMGANG_ROCKY_COAST | surf_nearshore |
| S8_JISEPO_HARBOR | surf_nearshore |
| S8_GUJORA_OFFSHORE | surf_offshore |
| S9_JANGSEUNGPO_RETURN_ROUTE | return_surf |
| POST_ISLAND_EXPEDITION | post_surf |

2개 구 special_site_id도 상위 Acquisition 값으로 해석하되 원본은 보존: TRADE_029_CICADA의 S1→S3, LANDMARK_035_FIREFLY의 S2→S1. event identity는 바꾸지 않는다.

기존 canonical validator의 PASS는 기존 STEP 3A 검증 범위다. 신규 deeper authority validation에서 source conflict 42개를 별도 보고한다. runtime quarantine 테스트 PASS를 source conflict 해소로 표시하지 않는다.

미해결: (1) 8개 surf table의 공식 정정/예외 승인, (2) 수입·상점/볼 재보급 정책과 runtime 연결, (3) 29지역의 실제 map region 배치, (4) 브라우저 UI QA. 따라서 무보급 실제 플레이로 151종 완성이 검증됐다고 주장하지 않는다.

## 재현

```sh
node --test --test-reporter=spec tests/*.test.mjs
node tools/validate-encounters.mjs
node tools/validate-canonical.mjs
node tools/validate-art.mjs
npm run typecheck
npm run build
```

DEV 화면은 `?story=1&encounter=1`. 신규 프롤로그를 생성하면 STEP 7이 명시적으로 활성화된다. 기존 Story 슬롯은 자동 업그레이드하지 않는다. 지역/method/profile/base/effective chance/safe/dry/table, 강제 조우, 10,000회 분포, rod 선택/낚시, 연구/교환/고정 조우, 나침반, 진화와 기존 Battle v3 조작이 가능하다. 일반 production UI에는 노출되지 않는다.

## 변경 파일

- `dist/compatibility/encounter-adapter.mjs` — 원본→runtime adapter, 권위 검증/격리, POST 획득 계약.
- `dist/compatibility/canonical-adapter.mjs`, `dist/species-catalog-service.mjs` — immutable 계약 노출.
- `dist/encounter/{frequency,state,access,permit,acquisition,field-hook,field-bridge,simulation,dev}.mjs` — 분리된 확장 계층.
- `dist/story/{save,progression-service,field-bridge,dev}.mjs` — 기존 transaction/전투/DEV host 재사용.
- `dist/battle-v3/{engine,save}.mjs` — 검증된 wild capability 및 진화 기술 상속 지원.
- `dist/field-engine-core.mjs` — opt-in 이동 handler; legacy 기본 경로 보존.
- `tests/canonical-encounter.test.mjs` — 신규 211개.
- `tools/validate-encounters.mjs`, 본 문서 및 `verification.json` — 재현 가능한 감사 자료.
