"""Read-only aggregation of STEP 8's committed traces; never reruns simulations."""
import csv, json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
src=root/'docs/economy-capture-policy-candidate-v1'
out=root/'docs/step8a-evidence';out.mkdir(exist_ok=True)
raw=src/'economy-runs.json';runs=json.loads(raw.read_text())['results']
results=[];stages=[];battles=[]
for i,r in enumerate(runs,1):
 t=r['trace'];m=r['metrics'];run=f'R{i:02}'
 prize=0
 for a,b in zip(t,t[1:]):
  if b['trainer']>a['trainer']:
   gain=b['money']-a['money'];prize+=gain
   battles.append(dict(run=run,trainerId=b['label'],result='lost' if b['losses']>a['losses'] else 'won',prize=gain,party=b['party']))
 assert prize==r['money']-3000+m['ballsBought']*200-m['requests']*400
 for stage in r['completedStages']:
  part=[];inside=False
  for row in t:
   if row['label']==stage+':entry':inside=True
   if inside:part.append(row)
   if row['label']==stage+':complete':break
  a,b=part[0],part[-1]
  stages.append(dict(run=run,stage=stage,moneyEntry=a['money'],moneyExit=b['money'],minimumObservedMoney=min(p['money'] for p in part),wild=b['wild']-a['wild'],trainer=b['trainer']-a['trainer'],requests=b['requests']-a['requests'],aid=b['aid']-a['aid'],losses=b['losses']-a['losses'],partyExit=b['party']))
 stageMoney='/'.join(str(s['moneyExit']) for s in stages if s['run']==run)
 results.append(dict(run=run,seed=r['seed'],starter=r['starterId'],style=r['style'],reached='S3',stageMoney=stageMoney,minimumObservedMoney=min(a['money'] for a in t),prize=prize,requests=m['requests'],researchReward=m['requests']*400,ballsBought=m['ballsBought'],ballsUsed=m['ballsUsed'],ballsRemaining=r['balls']['ecology_ball'],captureAttempts=m['captureSuccess']+m['captureFailure'],captureSuccess=m['captureSuccess'],captureFailure=m['captureFailure'],potions=m['potions'],aid=m['aid'],losses=m['losses'],freeHeals='NOT_RECORDED',wild=m['wild'],trainers=m['trainer'],questSteps=r['questWalkTiles'],questPixels=r['questWalkPixels'],partyLevels='/'.join(str(p['level']) for p in t[-1]['party']),partyIds='/'.join(p['id'] for p in t[-1]['party']),priceBlocked=m['priceBlocked'],blocker=r['blocker'],warnings=r['warnings'],trainingTables=r['trainingTables']))
summary={'sourceCommit':'30be6f46ca31a9f1fe752047fc09064b8af5f385','sourceSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'simulationRerun':False,'minimumDefinition':'minimum among trace checkpoints, not every transaction','prizeDefinition':'sum money deltas at completed trainer battle trace rows, cross-checked against wallet conservation','freeHealCount':'not individually logged; no estimate substituted','seedStarterDesign':'3 fixed seed/starter pairs x4 styles, not full independent seed x starter design','documentedEarlierAbortedRuns':len(json.loads((src/'first-route-blocked-summary.json').read_text())['runs']) if 'runs' in json.loads((src/'first-route-blocked-summary.json').read_text()) else len(json.loads((src/'first-route-blocked-summary.json').read_text())['results']),'runs':results,'stages':stages,'trainerBattles':battles}
(out/'economy-evidence.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (out/'economy-12-runs.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=results[0]);w.writeheader();w.writerows(results)
lines=['# STEP 8 경제 실행 상세 증거','',f'원본 SHA-256: `{summary["sourceSha256"]}`. 기준 commit `30be6f4`. 이번 STEP 8A에서 시뮬레이션을 재실행하지 않았다.','', 'P/S1/S2/S3는 각 단계 완료 직후 소지금이다. 최저값은 기록된 checkpoint 최저이며 거래 중간 순간 최저가 아니다. 상금은 전투 trace의 소지금 증가분을 합산하고 전체 수입/지출 보존식으로 교차 확인했다.','', '| Run | Seed/스타터 | 성향 | P/S1/S2/S3 자금 | 관측 최저 | 상금 | 의뢰/보상 |','|---|---|---|---|---:|---:|---|']
for r in results:lines.append(f'| {r["run"]} | {r["seed"]}/{r["starter"]} | {r["style"]} | {r["stageMoney"]} | {r["minimumObservedMoney"]} | {r["prize"]} | {r["requests"]}/{r["researchReward"]} |')
lines+=['','| Run | 볼 구매/소비/잔여 | 포획 시도/성공/실패 | 회복약 | 지원 | 패배 | 야생/트레이너전 | 의뢰 이동칸 |','|---|---|---|---:|---:|---:|---|---:|']
for r in results:lines.append(f'| {r["run"]} | {r["ballsBought"]}/{r["ballsUsed"]}/{r["ballsRemaining"]} | {r["captureAttempts"]}/{r["captureSuccess"]}/{r["captureFailure"]} | {r["potions"]} | {r["aid"]} | {r["losses"]} | {r["wild"]}/{r["trainers"]} | {r["questSteps"]} |')
lines+=['','| Run | S3 파티 species 순서 | 레벨 순서 | 회복약 가격 부재 시도 |','|---|---|---|---:|']
for r in results:lines.append(f'| {r["run"]} | {r["partyIds"].replace("SPECIES_", "")} | {r["partyLevels"]} | {r["priceBlocked"]} |')
lines+=['', '각 run은 관장 NPC_GYM_01_KANGMIN, NPC_GYM_02_YOUNGJIN, NPC_GYM_03_JEONGUI 승리를 기록했다. R04는 Gym2 첫 패배 후 승리했고 R03은 Gym2 보조 트레이너 첫 패배 후 승리했다. 기타 모든 전투별 승패·보상과 단계별 최저/성장/반복량은 economy-evidence.json에 있다.','', '초기 시도 12회는 모두 S2의 ACQUISITION_STAGE_LOCKED로 중단됐다. 같은 seed/성향을 유지한 채 기존에 해금 가능한 S2_JANGMOK_BIRD_HILL:rare_sky를 선택하도록 실행 경로를 수정한 뒤 현재 12회가 완료됐다. 성공 seed만 추린 결과가 아니다. 단 실제 지도에서 rare_sky까지 걸어갈 수 있는지는 미검증이다.','', '의뢰 이동은 STEP2 QA 배치에서 1회 384px=48px 이동격자 8칸, 총 25회/200칸을 기록했다. 32px 아트 타일과 다른 필드 이동격자다. 이 수치에는 최종 S1~S3 지도 간 이동이나 이동 시간이 없다. 무료 회복 횟수는 개별 기록되지 않아 미상이며, 코드가 매 야생/트레이너전 전 회복을 호출하는 실행 조건은 확인했다.','', '평가 A: 기록된 12 서비스 경로에서 영구 자원 정체 없음. B: 잦은 포획은 의뢰6~11회, 선택전 생략은 야생87~92회이므로 과도한 반복 여부가 미확정. C: S3 잔액8,600~23,000으로 잉여 가능성; 회복약 가격/구매가 미정이라 경제 균형 확정 불가. D: 실제 지도·이동시간 미포함. 정상 서비스 실행 시간은 플레이 시간이 아니다.','', '레벨 강제 변경·자금 직접 주입·볼200개·포획 확정 RNG는 사용하지 않은 기록이다. 튜토리얼 원본 보장과 후보 의뢰/지원은 정상 적용됐다. seed17/193/2026이 각각 스타터001/004/007에 묶여 있어 seed와 스타터 효과를 분리할 수 없다.','']
(out/'economy-evidence.md').write_text('\n'.join(lines))
print('Aggregated',len(results),'existing runs; no simulation rerun')
