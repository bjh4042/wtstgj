# STEP 8 — Economy & Capture Policy Candidate v1

기준 `6007bbeeea5d65e24342356569703fc0c28055ee` 및 clean 작업 트리를 확인한 후 `economy-capture-policy-candidate-v1`에서 작업했다. 과거 커밋으로 되돌리지 않았다. 기존 안정 checkpoint를 유지했다. 공개 v21 배포·교체는 하지 않았다.

**후보 정책은 PENDING_USER_APPROVAL이며 일반 canonical 기본값이 아니다. 일반 세션의 거제볼 100% 충돌은 후보 수정 검증 완료 / 승인 적용 대기다.** 브라우저와 최종 지도 동선 검수는 완료하지 않았다. 원격 소스 동기화도 Sites 통신 오류로 BLOCKED다.

## 확정 기능 연결

| 기능 | 결과 / 근거 |
|---|---|
| 초기 생태볼 5·회복약 3·도감 1 | 기존 `TX_PROLOGUE_STARTER_KIT` / `P03_TUTORIAL` 지급과 원장을 재사용. 이벤트 재실행·기존 저장 활성화로 재지급하지 않음. Stage `/stages/0/key_rewards` |
| 일반 볼 가격·해금 | 원본 Battle `/items/catalog`에서 읽는 구매 견적·검증 연결. 생태볼 200/PROLOGUE, 친화볼 600/BADGE2, 공명볼 1200/BADGE5. 일반 세션의 미정 지갑·재고를 임의 생성하지 않음. 구매 정산·화면은 후보 세션에서 검증 |
| 회복약 | 원본 HP 25. 필드 `economyCommand(use-item)` 및 Battle v3 `item` 연결. 효과 없음·잘못된 대상·기절 대상 거부. 성공 시 한 번만 소모 |
| 기타 원본 효과 | 60/120/full HP, 상태 치료, 50/100% 부활, 단일 기술 PP 10 지원. `max_ether.pp_restore_all="partial"` 수치 미정이므로 사용 차단. 가격 미정 물품은 판매하지 않음 |
| 전투 아이템 턴 | 기존 switch/capture와 동일한 비기술 행동 흐름: 아이템 한 번 처리 후 상대 행동 1회. source에 별도 item-turn 수치는 없으므로 기존 엔진 운용 규칙 재사용임을 명시 |
| 튜토리얼 | Battle `/capture_contract/tutorial_safety`의 최소 0.7·세 번째 생태볼 보장·소진 시 3개. P03 이후/P04 이전, `P_ECO_CENTER_EDGE:land_grass`에서 **명시적인 연습 전투** 호출에만 일회용 capability 부여. 일반 랜덤전·낚시·트레이너·전설전에는 부여하지 않음 |
| 튜토리얼 범위 세부 | 원본에는 별도 고정 상대 ID가 없어 기존 프롤로그 표의 종/레벨을 사용. 종을 새로 배정하지 않음. 세 번째 투척 카운터·리필 기록 저장, 포획 성공 시 종료. 기존 진행 저장에는 연습 기회를 소급 부여하지 않음 |
| 거제볼 제한 | 기존 지급 이벤트 8건/총 12개 원장, 비판매, 비반복 유지. 일반 볼 지원 조건에서 거제볼은 제외 |

`createEconomyGame()`는 일반 catalog에서 확정 기능만 만든다. 기존 Story DEV 호스트는 `activateConfirmedEconomy()`로 필드/전투 아이템을 연결한다. STEP 6/7 원본 save factory와 구 snapshot API는 유지한다. 신규 경제 상태는 기존 필드를 덮어쓰지 않는 versioned `economy` sidecar다. 일반 wallet은 `null`로 미확정임을 표현하며 Save default 0을 시작 자금으로 해석하지 않는다.

## 후보 정책 — 승인 전 일반 활성화 없음

정확한 정책 및 SHA-256은 `policy-provenance.json`, 실행 설정은 `dist/economy/candidate.mjs`에 있다.

| 항목 | 후보 값·규칙 |
|---|---|
| 식별 | `ECONOMY_CAPTURE_CANDIDATE_V1`, version 1, `PENDING_USER_APPROVAL`, `defaultEnabled=false` |
| 시작 자금 | 3,000, 새 게임 원장 한 번. 기존 진행/일반 저장 전환·소급 보충 금지 |
| 상금 | 전투 시작 파티 최고 L × 40/80/120. 77개 canonical battle ID의 단일 분류표 사용. 55 일반/체육관 부하 ×40, 하린 6·간부 2 ×80, 관장 8·휘경·사천왕 4·챔피언 ×120 |
| 개별 원본 금액 | STEP 7B 감사에 확정된 숫자 상금 없음. `confirmedIndividualPrizes` 우선 경로는 있으나 빈 값이며 새 금액을 확정으로 표시하지 않음 |
| 승리 정산 | 실제 Battle v3 승리만. 비반복 인물은 first-win 원장, 이미 반복 허용된 인물만 별개 battle instance 정산. 반복 가능 여부 변경 없음 |
| 반복 의뢰 | 새 회차 수락 → 서로 다른 3점 관찰 → 센터 보고 400. 이전 회차 관찰 재사용 불가. 볼·유료 장비·시간·날씨 요구 없음 |
| 상점 | 해금된 일반 볼 무한 재고 구매만. 200/600/1200 원본 값 유지. 되팔기 없음. 가격 미정·거제볼·핵심 장비·중요 물건 구매 차단 |
| 본편 볼 지원 | 일반 볼 3종 총합 0, 돈 <200, 센터 상호작용 시 생태볼 3. 거제볼 제외. 튜토리얼 진행 중에는 본편 지원 차단. 새로운 조건 충족 시 재지원 가능 |
| 패배 | 돈 차감 없음, 사용 아이템 반환 없음, 진행 롤백 없음. 검증된 마지막 센터/초기 거점 복귀 후 HP/PP/상태/기절 회복 |
| 회복 | 센터 무료·횟수 제한 없음. 위치·접근 조건 미확인 시 `BLOCKED_UNVERIFIED_DESTINATION`, 실제 귀환 성공으로 표시하지 않음 |
| 거제볼 | 일반 합법 대상 ×3, 고정 `SPECIES_148`~`SPECIES_151` ×5, 둘을 중복 곱하지 않음. 기존 HP/상태/Retry/CaptureBase 유지, 상한 0.95 |

후보 catalog는 명시적 DEV/TEST 선택만 허용한다. 브라우저 `?economy=1`도 DEV에서만 열리고 새 게임 버튼 선택 전에는 후보 저장을 만들지 않는다. 공개 번들에서 이 진입 경로는 제거된다. `?story=1`의 일반 canonical 세션은 후보를 선택하지 않는다.

후보 저장 키는 `geoje.dev.economy-candidate-v1.` 접두사로 기존 슬롯 API 전체를 격리한다. 실제 SLOT_1/2/3·legacy 키를 사용하지 않는다. 일반 save/load/import는 후보 marker를 거부한다. import를 시도하면 원본 보관만 하고 일반 슬롯에 활성화하지 않는다.

## 거래·장애 검증

기존 Story draft → 검증 → persistence → commit 흐름, 슬롯 checksum·원본 archive·lastKnownGood·오래된 탭 보호를 재사용했다. 구매는 돈 차감과 볼 증가를 같은 draft에 기록한다. 정수·범위·ID·해금·잔액·인벤토리 상한을 검사한다. 거래 ID에 요청 fingerprint를 묶어 동일 재전송은 재실행하지 않고, 다른 payload 재사용은 거부한다.

저장 실패 후 pending 상태에서 새 거래를 막고 정확한 pending snapshot을 재시도한다. primary 쓰기 성공 후 오류가 난 경우에도 기존 committed snapshot과 정확히 비교해 재시도를 인식한다. 다른 탭의 다른 저장은 이 경로로 덮어쓰지 않는다.

독립 fault-injection: 돈0/볼0, 거제볼만 남음, 전원 기절, 구매 저장 전 실패, primary 저장 후 오류, 지원 지급 저장 실패. 정상 성장 run과 분리했다. 거제볼만 남은 통합 fixture는 기존 과레벨 스토리 fixture로 만든 본편 클리어 시점의 정당한 6개 지급 원장(전체 상한 12개는 기존 회귀 검증)을 사용하고 인벤토리 소진 상태를 주입했다. 이 fixture는 정상 플레이나 지원되는 save migration의 증거가 아니다.

## 포획 시뮬레이션

151 identity 중 Acquisition의 일반 볼 허용 계통에 속한 89종의 확률을 검사했다. 나머지 62종은 차단 목록으로 기록하며 3% 하한으로 경로를 만들지 않았다. 진화형 확률을 계산했다고 해당 진화형의 직접 조우를 새로 허용하는 것은 아니다. 실제 battle 생성은 기존 Encounter/Acquisition capability를 계속 요구한다.

- HP 100/50/25%/1HP × 상태 없음/마비/수면 × 실패 0/2/5 × 볼 4종 = **12,816 조건**.
- seed **17, 193, 2026**, 조건별 seed당 1,000회 = 총 **38,448,000 Bernoulli 판정**.
- 공식 대비 최대 절대 오차 **0.9083 percentage points**, 사전 허용 오차 3.5pp 이내.
- 상한 조건에서도 거제볼 실패 확인. 실제 Battle v3 투척 실패도 별도 테스트.
- 비율 검사는 정확한 25%를 위해 분수 HP를 공식 입력에 사용했다. 실제 전투 HP는 정수이며 반올림에 따라 표시 확률이 조금 다를 수 있다.
- 같은 난수 표본을 조건마다 사용하는 common-random-number 비교다. 38,448,000건이 모두 독립 표본이라고 주장하지 않는다.

| 대상·조건 | 기존 일반 세션 거제볼 | 후보 거제볼 |
|---|---:|---:|
| 148/149/150, HP25%·수면·실패0 | 100% | **57.375%** |
| 151, 동일 조건 | 100% | **43.03125%** |
| 후보 상한 | 해당 없음(100% 예외) | **95%** |

원본의 `GUARANTEED`와 일반 runtime의 probability=1.0은 보존했다. 새 배율 승인 전이므로 **충돌 전체 해결로 보고하지 않는다**. 튜토리얼의 제한된 100% 예외는 별도이며 제거하지 않았다.

전체 공식·실측·seed별 비율은 `capture-grid.csv`, 차단 종·검사 방식은 `capture-summary.json`에 있다.

## 정상 경제·성장 서비스 실행

**3 seed × 4 성향 = 12/12, PROLOGUE → S1 관장 → S2 → S3 완료.** 모든 스타터 선택을 seed에 고정 배정했다. 처음 정한 seed를 유지했으며 성공 seed만 선택하지 않았다. 승리·포획·EXP·레벨업·진화·기술 학습·상금은 production API를 사용했다. 돈 직접 증액·볼 200개·레벨 강제 상승·포획 성공 난수 조작 없음. 후보 시작 3,000과 기존 지급, 실제 전투 상금, 후보 의뢰/지원만 사용했다.

| 성향 | S3 종료 돈 범위 | 볼 구매 / 소비 범위 | 의뢰 횟수 | 지원 횟수 | 비고 |
|---|---:|---|---|---|---|
| 새 종 위주 | 21,000~22,000 | 10~15 / 11~13 | 0 | 0 | 중복 종 포획 억제 |
| 자주 포획 | 8,600~9,600 | 84~99 / 93~102 | 6~11 | 1~2 | 실패 53~62회, 자원 복구 경로 사용 |
| 회복약 자주 사용 | 21,000~23,000 | 5~15 / 7~15 | 0 | 0 | 초기 회복약 3개 소진; 미정 가격으로 추가 구매 차단, 센터 사용 |
| 선택 트레이너 일부 생략 | 13,680 | 15 / 13~17 | 0 | 0 | 필요한 경험치는 정상 야생전에서 획득 |

회복약 사용을 자주 시도하는 실행에서 미정 가격/재보급 문제가 드러났다. 임의 가격이나 아이템을 추가하지 않았다. 초반 상금 누적으로 S3 잔액이 높은 결과도 남겼으며 자동으로 공식을 조정하지 않았다.

**검증 범위:** 필드 Stage 지역 이동은 서비스 context 선택이다. 실제 29개 지도 동선을 걸은 검증이 아니다. 의뢰 이동만 기존 `qa_a` 충돌 검증 좌표에서 production walking 명령으로 실행했다. 센터(384,384), 관찰(480,384)/(480,480)/(384,480), 회차당 384px = 기존 필드 그리드 8칸. 의뢰 6/8/11회에서 각각 48/64/88칸을 걸었다. 이를 최종 본편 지리·관찰점 확정으로 취급하지 않는다.

처음 S2의 shore_walk/open_field를 선택했을 때 `ACQUISITION_STAGE_LOCKED`로 차단됐다. 원본·게이트를 수정하지 않았다. 시뮬레이터의 명시적 지역 선택에서 게이트를 통과하는 기존 `S2_JANGMOK_BIRD_HILL:rare_sky`를 사용했다. 런타임의 빈 표/제외 표를 다른 지역으로 자동 대체하는 기능을 추가하지 않았다. 실제 본편에서 이 method의 접근 동선은 미검증이다. 초기 차단 결과는 `first-route-blocked-summary.json`에 보존한다.

시점별 돈·구매·소모·잔여·포획·회복약·성장·패배·조사 이동은 `economy-runs.json`; seed별 요약은 `economy-summary.md`.

## 테스트 및 실행 범위

| 검증 | 결과 |
|---|---|
| 기존 회귀 | **873/873 PASS** |
| 신규 확정/후보·장애 검증 | **63/63 PASS** |
| 전체 | **936/936 PASS, 0 FAIL, 0 SKIP** |
| Build / 기존 field typecheck | PASS |
| Art / canonical / encounter validation | PASS; 46 활성 / 8 승인 정책상 제외 / 미해결 격리 0 |
| 서비스 기반 정상 성장 run | 12/12 S3 완료, 최종 지리 검증 아님 |
| 화면 상점·회복약·센터·지원·패배귀환·reload | **BLOCKED / 미실행** — browser 연결 후 로컬 DEV 주소가 `net::ERR_BLOCKED_BY_CLIENT`로 거부됨. 우회하지 않음 |
| 원격 소스 동기화 | **BLOCKED** — Sites get_site 및 source write credential의 Transport send error. 로컬 commit/checkpoint와 구분 |
| 공개 v21 | 배포 명령·버전 교체 없음. 현재 원격 상태 재조회는 통신 오류로 미확인 |

기존 테스트 873개를 삭제하지 않았다. STEP 7B의 “튜토리얼 미연결” 소스 검사는 당시 `6007bbe` 엔진을 바이트 그대로 저장한 역사 fixture를 대상으로 바꿨고, 기존 부정 assertion을 유지했다. 신규 테스트는 fixture 원본 일치 및 새 연결을 각각 검증한다. 구 거제볼 100% 테스트는 기존 일반 세션 대상으로 그대로 남아 있다.

명령: `npm test`, `npm run build`, `npm run typecheck`, `node tools/validate-art.mjs`, `node tools/validate-canonical.mjs`, `node tools/validate-encounters.mjs`, `node tools/simulate-economy-candidate.mjs --capture --economy`. 로그는 `verification/`에 보존했다.

## 남은 결정·blocker

| 미정/승인 대기 | 현재 처리 | 다음 결정 |
|---|---|---|
| 시작 3,000·상금 40/80/120·의뢰400·지원·무료회복/패배·무한재고 | 후보 전용 | 수치/규칙 승인 여부. S3 잔액과 포획 성향별 소모 차이를 검토 |
| 거제볼 ×3/×5·상한95% | 후보 검증 완료, 일반100% 유지 | 대체 배율 승인. 총량12·비판매·비반복은 재승인 불필요 |
| 회복/상태/부활/PP 아이템 가격·판매 목록 | 구매 차단 | 원본 효과·해금 유지, 승인 가격표만 추가 |
| max_ether의 partial PP량 | 사용 차단 | 정확한 회복량 |
| 최종 센터·상점·관찰점 ID/좌표·접근 동선 | QA fixture만 존재 | 초기 지역 무료 도보 왕복 배치와 각 거점 검수 |
| S2 rare_sky 실제 접근 | 서비스 게이트 PASS | 본편 지도에 해당 method가 접근 가능하게 연결되는지 확인 |
| 브라우저 / 원격 동기화 | 현재 환경에서 BLOCKED | 연결 가능한 환경에서 화면 검수·소스 동기화 재실행 |

가격이나 지리·스토리를 새로 확정하지 않았다. 기존 재대결 금지 인물을 반복 수입으로 바꾸지 않았다.

## 승인 후 최소 적용과 롤백

`activation-plan.PENDING.json`은 실행되지 않은 변경 명세다. 단순히 `defaultEnabled=true`만 바꾸면 save 검증·격리 경계와 충돌하므로 하지 않는다. 승인 후 정확한 후보 해시를 새 APPROVED policy ID로 보존하고, canonical loader/session 선택·approved save 검증·최종 host binding만 연결한다. 후보 save 자동 반입은 계속 차단한다. 기존 저장 자금의 소급 덮어쓰기는 하지 않는다.

롤백은 approved policy 선택 제거와 별도 revert commit으로 한다. 정책별 저장은 원본 보관 후 활성화 전 normal-slot backup으로 복구하며 marker를 지워 강제 해석하지 않는다. 기존 checkpoint/원본/공개 v21을 reset하지 않는다.

## 변경 파일

- `dist/economy/`: contract, candidate config, trainer ID 분류표, actions, session factory, tutorial capability, 격리 store, DEV 배치/패널.
- `dist/battle-v3/engine.mjs`, `rules.mjs`: 확정 아이템/튜토리얼과 후보 거제볼 계산 경로.
- `dist/story/progression-service.mjs`, `save.mjs`, `dev.mjs`: 기존 정산 재사용, 전투 후 후보 상금/회복, 아이템 소모 병합.
- `dist/canonical-session.mjs`, `species-catalog-service.mjs`, `compatibility/save-slots.mjs`, `app.js`: catalog/save 경계 및 DEV 진입.
- `tests/economy-capture-candidate.test.mjs`, `tests/helpers/economy-fixture.mjs`, STEP 7B 역사 fixture/참조 변경.
- `tools/simulate-economy-candidate.mjs`, `tools/report-economy-candidate.mjs` 및 이 보고서/검증 산출물.

원본 canonical 파일·승인된 수상 제외 정책·legacy 로직·아트·follower·타일·환경·VFX 파일은 변경하지 않았다. 원본/승인/후보 버전과 해시는 `policy-provenance.json`에 각각 기록했다.

로컬 branch: `economy-capture-policy-candidate-v1`. 로컬 checkpoint: `checkpoint-economy-capture-policy-candidate-v1`. 원격 동기화 미완료. 기존 checkpoint의 객체 ID는 `verification/preserved-checkpoints.txt`에 보존했다.
