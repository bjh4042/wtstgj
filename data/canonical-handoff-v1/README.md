# canonical-handoff-v1 — 이 폴더의 문서에 대하여

이 폴더의 JSON/CSV는 2026년 9월 기획 인수(handoff) 때 받은 **기준 데이터**입니다. 게임은 시작할 때 이 파일들을
읽어 쓰지만(도감·조우·트레이너·스테이지 표 등), 파일 안의 **설명·검증 기록은 그때 시점 그대로**이며 현재
게임 동작을 설명하지 않습니다. 게임 동작을 바꾸지 않도록 파일 자체는 고치지 않았습니다. (2026-11-22, v1.0)

## 지금 게임과 다른 점

- **저장 파일 형식**: `geoje_save_schema_v2.json`, `geoje_final_source_manifest_v1.json`,
  `geoje_cross_validation_report_v2.json`에 적힌 `.gem` 은 옛 계획입니다. 지금 게임이 내보내고 불러오는 백업
  파일은 **`.stm`** 입니다(옵션 → 백업 파일 내보내기 / 불러오기, 안내는 `guide.html`). 슬롯 3개는 기기 안
  브라우저 저장소(localStorage)에 그대로 남습니다.
- **교차 검증 보고서**: `geoje_cross_validation_report_v2.json`(2026-09-17)의 `canonical_file_fingerprints`는
  그 뒤 온라인 대전 파일이 고쳐지기 전의 값이라 아래 3개 파일의 크기·SHA-256이 맞지 않습니다. 현재 값의 기준은
  `geoje_canonical_handoff_index_v1.json`이며, 이 폴더의 다른 데이터 파일은 모두 그 색인과 일치합니다.

  | 파일 | 현재 크기 | 현재 SHA-256 |
  |---|---|---|
  | geoje_online_battle_master_v1.json | 13578 | 15576e95979c1e58e94a67a238016f9554a91342dbe647e2aa5723ff22eed242 |
  | geoje_online_battle_firebase_rules_contract_v1.json | 22979 | 6b20bda26c745579d35507d5790945294a1ae428f3aa5fe5da8b3df1d27b3835 |
  | database.rules.json | 17394 | 8cff90f662ad2c5add5eaeac93e26550a9efa01da8019eb9abf0e248f37058cb |

- **온라인 대전(Firebase)**: v1.0에서는 꺼져 있습니다. 규칙 계약의 에뮬레이터 테스트 26건은 대전을 켜기 전에
  따로 해야 합니다.
- **빌드 검증 기록**: 사이트 최상위의 `HANDOFF_BUILD_VERIFICATION.json`이 실제 빌드의 검증 기록입니다
  (버전, 빌드 번호, 날짜, 테스트 결과). 빌드·테스트·배포 방법은 개발 폴더의 `docs-0.5/BUILD_AND_DEPLOY.md`에 있습니다.
