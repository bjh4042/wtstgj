# STEP 7A — Canonical Aquatic Encounter Reconciliation v1

기준: `e5e52e3cfd099f640ab8c00642d7ee19d5fad71f`. 기준 HEAD와 일치하는 상태에서 별도 `canonical-aquatic-encounter-reconciliation-v1` 브랜치를 만들었다. 공개 v21과 이전 checkpoint는 변경하지 않는다.

## 결론

수상 8표의 총 44슬롯 중 **42슬롯 / 고유 종 7종**에서 명시적 `random_spawn_allowed=False`와 Surf 랜덤 배치가 충돌한다. 기존 STEP 7 진단 및 첨부 감사와 일치한다. **현재 활성 46표 / 격리 8표 / 승인 대기 8표**이며, 승인 대기는 격리 8표와 같은 집합이다. 원본 규칙 충돌은 아직 해결되지 않았다.

`audit.json`은 44슬롯 각각의 canonical ID, 번호, 이름, weight, level, Acquisition 필드, 실제 해금 조건, S1/S6/S7/S8/POST 판정, 정확한 JSON Pointer/CSV 레코드 행과 Fishing 참조를 포함한다. `source-audit.json`은 첨부 원본 사본이다. 감사 자료는 승인된 패치가 아니다.

## 실제 구현 수정

1. 낚시 허용 검사를 `primary_acquisition` 문자열에 의존하던 잠재 결함을 수정했다. Encounter와 Fishing의 해당 지역·낚싯대·종·weight·level 일치 및 Acquisition의 포획/interaction 허용을 확인한다. 명시된 fishing 허용은 Surf 허용으로 확장되지 않는다. 기존 70행이 모두 막혀 있었다는 뜻은 아니다.
2. `tableAccess`에서 계통별 기존 `field_requirements`를 누락하던 결함을 수정했다. S7 종료로 S8 진입이 열려도 BADGE08/최고급 낚싯대가 없는 상태를 구별한다. 격리를 해제한 **테스트 전용 사본**으로 수정 전 허용·수정 후 차단을 재현했다. 실제 8표는 전후 모두 격리되어 있었으므로 기존 runtime에서 실제 우회가 발생했다고 주장하지 않는다.
3. 관찰/연구 전용 interaction을 일반 포획 표로 승인하지 않는 검사를 명시하고, 격리 뒤에 있는 각 진행 조건을 보여주는 읽기 전용 `explainTableAccess`를 추가했다. 진단 결과는 접근 허가를 대체하지 않는다.

핵심 두 결함은 수정 전 재현 테스트 **0/2 PASS**, 수정 후 **2/2 PASS**였다. 표의 weight·종·해금 조건은 바꾸지 않았다.

## 원본 의미 충돌

| 번호 / 종 | 반복 충돌 슬롯 | 최초 단계 | 기존 요구 |
|---|---:|---|---|
| 064 은치리 | 4 | S1 | basic_rod |
| 068 대구미 | 1 | S2 | basic_rod |
| 100 등푸리 | 8 | S5 | good_rod |
| 102 볼꼬미 | 8 | S5 | good_rod |
| 117 문꾸리 | 8 | S6 | good_rod |
| 135 꼴쭈기 | 7 | S8 | super_rod |
| 139 복방울 | 6 | S8 | super_rod |

이 7종은 일반 볼 포획 및 standard_battle_capture가 허용되지만 랜덤 출현은 금지되어 있다. 낚시 허용, 볼 포획 허용, 수상 랜덤 출현 허용은 별개다. 요구 장비를 추가하는 것만으로 랜덤 금지를 해제할 수 없다.

Surf는 BADGE07 + SURF_LICENSED + field_ability_surf, 최고급 낚시는 BADGE08 + super_rod를 요구한다. S1 지역의 수상표도 S7 이후 재방문용일 수 있으므로 지역 stage만으로 판정하지 않는다. `audit.json`에 원본 gate/보상 transaction 참조와 체크포인트 판정을 기록했다.

## 테이블별 정정 후보 및 승인 결정

**A안(권장): 해당 수상 랜덤 표 제거, 수상 이동·기존 낚시·관찰/특수 이벤트와 해금은 유지.** 영구적인 랜덤 조우 제거이므로 사용자 승인이 필요하다. **B안: 종/비율을 재설계**하되 별도의 정확한 슬롯 승인을 받아야 한다. B안의 종이나 weight를 임의 작성하지 않았다. 현 규칙을 그대로 두고 전체 표를 활성화할 수 있는 구현 수정만의 해결책은 없다.

| areaId / method | 변경 전 충돌/전체 | A안 변경 후 제안 | 필요한 결정 |
|---|---:|---|---|
| S1_HACHEONG_BRACKISH / surf_brackish | 4/5 | 수상 랜덤 없음; 갯망이 30%를 100%로 변경하지 않음 | A 승인 또는 B 재설계 |
| S2_JANGMOK_COAST / surf_nearshore | 4/5 | 수상 랜덤 없음; 잠수깃 25%를 100%로 변경하지 않음 | A 승인 또는 B 재설계 |
| S6_HAKDONG_MONGDOL / surf_nearshore | 5/5 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |
| S7_HAEGEUMGANG_ROCKY_COAST / surf_nearshore | 5/5 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |
| S8_JISEPO_HARBOR / surf_nearshore | 5/5 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |
| S8_GUJORA_OFFSHORE / surf_offshore | 6/6 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |
| S9_JANGSEUNGPO_RETURN_ROUTE / return_surf | 6/6 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |
| POST_ISLAND_EXPEDITION / post_surf | 7/7 | 수상 랜덤 없음 | A 승인 또는 B 재설계 |

근거: 첫 두 표는 금지 슬롯을 제외하면 합계가 각각 30/25에 불과하고, 나머지는 빈 표가 된다. 자동 재정규화·다른 지역 표 대체는 하지 않는다. A안은 최초 획득 시점과 낚싯대별 70행/해금을 보존하여 최고급 낚싯대 가치를 유지한다. 재방문에서 랜덤 Surf 전투가 없어지는 게임 규칙 변경은 명시적으로 승인받아야 한다. 기존 갯망이/잠수깃의 다른 정상 경로는 후보 파일에 기록했다.

`candidate-A.UNAPPROVED.json`은 원본 SHA와 각 표의 전체 `test`/`remove` diff를 담는다. **8개 모두 A 승인인 경우에만 해당 후보가 유효**하며, 일부만 승인되면 다시 생성해야 한다. 파생 species_acquisition_index의 Surf 참조 44개 제거(242→198)도 별도 diff에 포함되어 있다. validation 상태를 임의 PASS로 만들지 않고 CANDIDATE_REVIEW_REQUIRED로 표시한다. 승인 후에도 새 source revision/manifest fingerprint 및 전체 검증이 필요하다. 현재 loader는 이 파일을 읽지 않는다.

## 검증 및 보존

- 기존 813개 테스트 유지. 신규 31개: 8표/42충돌, 낚시/Surf 분리, S7/S8 장비 게이트, 재방문, 연구 전용 포획 차단, 정상 표 보존, 미승인 후보 비연결, 빈 표/격리 표 타지역 대체 금지, 저장/legacy/확률 보존 등을 검사한다.
- 상세 실행 결과와 원본 보존 증거는 `verification.json`, `baseline.json`, `audit.json`에 기록한다.
- 첨부에 있는 Acquisition·Encounter SHA-256은 현재 원본과 모두 MATCH. Fishing·Stage·Story는 첨부 해시가 없어 NOT_PROVIDED이며, 현재 권위 index/manifest 해시와 일치한다.
- 54표 전체 및 활성 46표 payload, Fishing 70행, Acquisition 75계통, species 151, 빈도 설정을 기준 해시와 대조한다. 원본 데이터·assets·Story·Battle v3·저장 파일을 수정하지 않았다.
- 브라우저 QA: **미실행**. 자동 service/fixture 검증과 구분한다. 실제 29개 지리 맵 배치 및 자원 소모를 견디는 전체 플레이 검증은 이번 작업 범위가 아니다.

| 기존 빈도 정책 / 100,000 조우 시뮬레이션 | 평균 eligible steps | 중앙값 | 95% drought |
|---|---:|---:|---:|
| SPARSE | 19.25776 | 18 | 37 |
| NORMAL | 14.75803 | 13 | 30 |
| RICH | 12.78882 | 11 | 26 |

안전 걸음 5회, dry-streak, trigger/weight 분리, 시간·날씨 modifier 1.0은 보존했다.

## 변경 파일

- `dist/compatibility/encounter-adapter.mjs`: 명시적 낚시 승인 및 interaction 검사.
- `dist/encounter/access.mjs`: 계통 요구 장비 적용 및 읽기 전용 진단.
- `tools/validate-encounters.mjs`: 동일한 낚시 분류 원칙 적용.
- `tools/audit-aquatic.mjs`: 원본/첨부/기존 진단 대조 및 미승인 후보 생성.
- `tests/aquatic-reconciliation.test.mjs`: 신규 회귀 테스트.
- 이 문서 디렉터리: 첨부 사본, 기준 해시, 44슬롯 감사, 후보 diff, 실행 증거.

## 다음 재화·상점·볼 재보급 단계

원본의 볼 가격 200/600/1200 및 비매품 설정은 이미 존재하므로 임의 재설정하지 않는다. 다음 단계에서 확정할 것은 시작 자금, 트레이너별 상금/재전투 수입, 기타 반복 수입, 패배 시 손실, 상점 위치·진행별 재고/구매 조건, 볼 소진 시 진행 불능을 막을 재보급 정책이다. 현재 경로 검증 fixture가 볼과 육성을 공급한다는 사실은 정상 경제 순환을 증명하지 않는다. Surf 정정 승인 여부와 별도로 이 재화 정책이 필요하다.
