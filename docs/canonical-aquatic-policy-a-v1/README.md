# STEP 7B — Aquatic Policy A Activation & Economy Readiness Audit v1

기준 HEAD `6dc31d01e5e83a7708daabfe18ebac3bab773d5c`와 일치, 작업 트리 clean을 확인하고 `canonical-aquatic-policy-a-v1`을 생성했다. 기존 checkpoint 및 공개 v21은 보존한다. 경제 규칙 신규 활성화는 없다.

## 승인 적용

사용자가 STEP 7B에서 STEP 7A A안 8개 모두를 명시적으로 승인했다. 후보의 대상 ID, 표 전체 내용, 기준 SHA-256 및 파생 인덱스 diff를 검증한 후 별도 승인 정책을 생성했다.

| areaId | method | 원본 슬롯 / 충돌 슬롯 | 승인 결과 |
|---|---|---:|---|
| S1_HACHEONG_BRACKISH | surf_brackish | 5 / 4 | 정책상 제외 |
| S2_JANGMOK_COAST | surf_nearshore | 5 / 4 | 정책상 제외 |
| S6_HAKDONG_MONGDOL | surf_nearshore | 5 / 5 | 정책상 제외 |
| S7_HAEGEUMGANG_ROCKY_COAST | surf_nearshore | 5 / 5 | 정책상 제외 |
| S8_JISEPO_HARBOR | surf_nearshore | 5 / 5 | 정책상 제외 |
| S8_GUJORA_OFFSHORE | surf_offshore | 6 / 6 | 정책상 제외 |
| S9_JANGSEUNGPO_RETURN_ROUTE | return_surf | 6 / 6 | 정책상 제외 |
| POST_ISLAND_EXPEDITION | post_surf | 7 / 7 | 정책상 제외 |

원본 진단 **8표·44슬롯·42충돌 슬롯·고유 7종**은 감사 기록으로 유지한다. 현재 유효 데이터는 **46 활성 / 8 승인 정책상 제외 / 0 미해결 격리**다. 42슬롯만 삭제한 것이 아니며, 갯망이 30·잠수깃 25를 재정규화하지 않았다.

`approved-policy.json`과 `dist/compatibility/aquatic-policy-a-v1.mjs`에 승인 근거, namespace `canonical-v1`, 대상 ID, 원본 version/hash, effective version/hash 및 실제 RFC6902 diff가 있다. 실제 diff는 8개 표 전체 제거 + 파생 출현 참조 44개 제거 + 파생 참조 수 242→198 + 유효 버전/정책 상태 표시다. 미승인 후보의 임시 CANDIDATE_REVIEW_REQUIRED 문구를 승인 상태로 대체했으며 검증 PASS를 강제로 입력하지 않는다.

| 구분 | SHA-256 |
|---|---|
| 변경하지 않은 Encounter v2.3 원본 | `eb1fc73300e52e6005f7c107fb39ff56466aa4ab1e731881513b71b7b4b7768c` |
| 적용 후 유효 JSON (`JSON.stringify(source,null,2)` + LF) | `4b40a654d20319750e9969b498ac21d5ff0b4dfe20247c8416cd00f2824beba2` |

유효 버전: `canonical-encounter-v2.3-policy-a-v1`. handoff 원본과 그 manifest/index 및 STEP 7A 후보 파일은 바꾸지 않았다. 원본 해시를 유효 데이터 해시로 덮어쓰지 않는다.

## Runtime 연결

`canonical-runtime-adapter.mjs`가 원본 fingerprint를 먼저 검증하고 승인 패치를 복사본에 적용한 뒤 기존 adapter 검증을 다시 실행한다. 실제 앱의 canonical 진입점은 이 loader를 사용한다. 원래 `canonical-adapter.mjs`는 감사 및 과거 스냅샷 테스트용 원본 경계로 보존했다. 새 시스템을 우회하여 raw adapter를 runtime에 주입하면 과거 격리 상태가 유지되므로 신규 consumer는 runtime loader를 사용해야 한다.

- 제외 표를 선택해도 정상적인 `POLICY_NO_RANDOM_ENCOUNTER` 결과다. context의 error는 null, profile은 NONE이며 강제 조우도 전투를 만들지 않는다.
- RNG, eligible step, safe step, dry streak를 소비하지 않고 field bridge가 입력 lock을 걸지 않는다. 타지역 표나 placeholder 전투로 대체하지 않는다.
- DEV 선택기 및 분포 검사에서 ‘승인 정책: 랜덤 조우 없음’을 표시한다. 유효 species 출현 안내와 인덱스에는 제외 표 참조가 없다.
- 이전 저장의 수상 `areaId/method`는 정책 제외 ID로 인정하여 그대로 불러온다. 파티·박스·도감·Story state 및 저장 포맷을 이관하거나 치환하지 않는다.
- 파도타기 해금과 이동/충돌 엔진, 섬 접근용 진행 gate는 수정하지 않았다. 실제 지리 맵에서의 수상 동선 검수는 미실행이며, 자동 검증은 기존 field movement bridge가 진행을 잠그거나 조우를 세지 않는지 확인한다.
- Fishing 7지역/70행/21표, 75계통, 특수 이벤트와 Story/Battle 계약은 동일하다. S7 Surf와 S8 최고급 낚싯대 요구를 구분한다.

## 획득 재검증

| 검증 수준 | 결과 | 한계 |
|---|---|---|
| A. 유효 데이터 경로 | 75/75 기본형 경로, 151/151 진화 연결 PASS | 제외 8표를 경로에 계산하지 않음 |
| B. production API 통합 | SPECIES_001 / 004 / 007 스타터별 151종 등록 PASS | 테스트 보조 사용 |
| C. 일반 플레이 | 미검증 | 정상 수입/볼/성장 및 실제 지도 동선의 완주가 아님 |

B는 승인 adapter → Story events/Battle v3 → POST → 포획·낚시·연구·관찰·NPC 교환·미선택 스타터 지급·고정 조우·진화 API를 실행한다. 전설 148→149→150과 나침반→151 조건, 일회성 ledger와 거제볼 총 지급 12개도 확인한다. Story 검증용 과레벨 파티, 수집 단계 생태볼 200개, 레벨 100 보조, 성공을 고정하는 난수를 사용했다. 획득 완료 플래그를 임의로 넣거나 별도의 획득 경로를 추가하지 않았다. 일반 플레이 가능성이나 출시 승인을 의미하지 않는다.

## 재화·상점 감사

파일명 축약: Battle=`geoje_battle_collection_master_v3.json`, Stage=`geoje_stage_master_v2_3.json`, Flags=`geoje_story_flags_master_v2.json`, Trainer=`geoje_trainer_npc_master_v2.json`, Save=`geoje_save_schema_v2.json`. 모두 `dist/data/canonical-handoff-v1/` 아래 원본이다. 정확한 JSON Pointer, runtime symbol 및 미정 항목별 권장안은 `economy-audit.json`에 있다.

| 항목 | 상태 | 확정값·실제 연결·근거 |
|---|---|---|
| 시작 자금 | UNRESOLVED | Save `/default_snapshot/player/money=0`은 초기화 예시. 현재 canonical bootstrap에는 지갑 필드 초기화가 없다. 0원을 확정 기획으로 해석하지 않음 |
| 초기 지급 | CONFIRMED_AND_CONNECTED | Stage `/stages/0/key_rewards`: 도감 1, 생태볼 5, 회복약 3. `TX_PROLOGUE_STARTER_KIT` → P03_TUTORIAL에서 한 번 지급. 그 전 Story 시작은 빈 inventory |
| 회복약 사용 | CONFIRMED_NOT_CONNECTED | Battle items의 potion HP 25 등 효과는 확정. 지급은 progress.items에 저장되지만 canonical 사용 API/UI 없음 |
| 트레이너·관장·리그 상금 | UNRESOLVED | Trainer/Battle/Flags에 숫자 상금 계약이 없고 runtime 현금 지급 없음. 기존 TM·낚싯대·배지는 별도로 연결되어 있음 |
| 반복 수입 | UNRESOLVED | 정상 canonical 반복 현금 수입 없음. 재전투 금지 인물과 챔피언의 repeatable은 변경하지 않음 |
| 볼 가격·품목 해금 | CONFIRMED_NOT_CONNECTED | Battle `/items/catalog`: 생태볼 200/PROLOGUE, 친화볼 600/BADGE2, 공명볼 1200/BADGE5. metadata만 있고 canonical 구매 API/상점 없음 |
| 상점 위치·재고·회복약 가격 | UNRESOLVED | Stage의 배지별 품목 언급과 item unlock은 있으나 상점 ID별 재고/재입고 및 미기재 가격 계약 없음 |
| 판매·판매가 | UNRESOLVED | canonical 판매 가능 목록/판매가/API 없음 |
| 튜토리얼 포획 안전장치 | CONFIRMED_NOT_CONNECTED | Battle `/capture_contract/tutorial_safety`: 최소 0.7, 세 번째 생태볼 보장, 소진 시 3개 보충. runtime 포획 엔진에 해당 분기 없음. 이번에 활성화하지 않음 |
| 자금·볼 동시 소진 복구 | UNRESOLVED | 튜토리얼 밖의 정상 재보급 경로 없음. 튜토리얼 전용 3개 지급을 전역 재보급 허가로 확대하지 않음 |
| 패배 후 재화 | UNRESOLVED | 실제로 던진 볼 소모와 파티 피해는 남고 추가 현금 차감 없음. 지갑 미구현에 따른 무차감을 확정 정책으로 보지 않음. 리그는 기존 checkpoint에서 재개 |
| 무료 회복 API | CONFIRMED_AND_CONNECTED | 기존 `StoryProgressionService.recoverParty`: HP/PP 전체, status 해제, 비용 없음. DEV 회복 버튼 연결 |
| 회복 거점·접근 조건 | UNRESOLVED | canonical 지도별 회복 거점/이용 gate/패배 귀환 지점은 미연결. DEV 어느 위치에서든 회복 가능한 상태를 실제 거점 완성으로 보지 않음 |
| 거제볼 총량·일회성 | CONFIRMED_AND_CONNECTED | Flags `/geoje_ball_grants`의 8회 지급 합계 12. grant ledger 및 save lifetime cap으로 반복 방지 |
| 거제볼 상점 금지 | CONFIRMED_NOT_CONNECTED | 원본 shop=false/price=null 및 최신 결정 일치. 현재 canonical 상점은 없으며 향후 구매 검증에 명시적으로 연결해야 함 |
| 거제볼 포획 확률 | CONFLICT | 원본 GUARANTEED·geoje_ball_probability=1.0, 실제 rules도 1 반환. 최신 ‘유리하되 확정 아님’과 충돌 |

Legacy에는 시작 300코인, 볼 30·회복약 40 상점, 승리 보상과 무료 센터가 있지만 canonical 권위가 아니다. 해당 코드를 이식·변경하지 않았다. 경제 데이터와 Battle 포획 공식을 이번에 수정하지 않았다.

## 거제볼 충돌 상세

원본 `/items/catalog`의 `geoje_ball.capture_multiplier="GUARANTEED"`와 `/capture_contract/geoje_ball_probability=1.0` 두 곳에 남아 있다. `dist/battle-v3/rules.mjs`의 `captureProbability`가 geoje_ball에 1을 반환하고, engine은 그 값으로 실제 판정한다. 최대 HP No.148에 RNG 0.999999로 던져도 성공하는 production 전투 테스트로 확인했다. 단순 문서 오기가 아닌 실제 동작 충돌이다.

최신 사용자 결정(총 12·비매품·반복 불가·전설에 유리하지만 확정 아님)을 보고서에 명시했다. 별도로 승인된 대체 수치가 없어 배율·전설 modifier·상한을 만들지 않았다. **현재 실제 100% 동작은 여전히 남아 있는 blocker**이며, 테스트 PASS는 이를 올바른 기획으로 승인한 뜻이 아니다. 거제볼을 일반 볼 재보급 수단으로 사용하지 않는다.

## 다음 단계에서 결정할 미정 사항만

| 필요한 결정 | 권장 방향 / 이유 |
|---|---|
| 시작 자금과 첫 승 상금 수치 | 필수 포획 비용을 기준으로 산정. 확정 볼 가격은 유지 |
| 반복 정상 수입 방식과 보상량 | 별도 연구 의뢰 등 검토. 재대결 금지 인물 반복 전투로 해결하지 않음 |
| 상점 ID·재고·재입고 및 미기재 회복약 가격 | 접근 가능한 회복 거점과 연결하고, 원본 item unlock 준수 |
| 판매 허용 품목·판매가 | 확정 전 비활성 유지. 핵심/한정 보상 아이템 제외 권장 |
| 본편 볼 소진 복구 범위·수량·조건 | 필수 포획의 진행 불능을 막는 일반 볼 지원 또는 무비용 의뢰 검토 |
| 패배 손실·귀환 및 회복 거점 접근 | 아동 대상 진행 복구를 우선하며 필수 포획 자원을 잃지 않도록 검토 |
| 거제볼 비확정 포획 수치 | 전설 보정·배율·상한 승인 필요. 이번에 임의 설정하지 않음 |

이미 확정된 초기 키트, 일반 볼 가격·해금, 튜토리얼 안전장치, 총 12개 지급은 재설계 대상이 아니라 이후 연결할 항목이다.

## 검증 및 파일

기존 844개 테스트의 본문을 변경하지 않았다. 과거 미승인 스냅샷은 raw adapter로 그대로 검사하고, 새 `tests/aquatic-policy-a.test.mjs`는 승인 후 상태를 별도로 검사한다. `encounter-validation.json`은 유효 46표별 100,000회 분포, 기존 빈도 정책, 75계통 경로를 담는다. `verification.json`에 실행 결과와 보호 파일 해시를 기록한다.

브라우저 QA: **미실행**. 이번 자동 테스트는 실제 지도 동선/화면 검수나 일반 플레이 완주를 대체하지 않는다.

변경 범위: 승인 정책/적용기/runtime adapter, 앱의 canonical loader 연결, 조우 접근/context/DEV/field bridge/이전 위치 저장 호환, 유효 데이터 검증 도구, 승인·경제 감사 도구, 신규 fixture/test와 이 문서 디렉터리. 기존 획득·진화·낚시·전투 공식·경제 수치·아트·follower·환경·맵·legacy 본문은 변경하지 않았다.
