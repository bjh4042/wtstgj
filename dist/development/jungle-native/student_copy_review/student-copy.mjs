export function progressText(j){return `전망 ${j.a?'관찰 완료':'미관찰'} · 물길 ${j.bConnected.filter(Boolean).length}/3 연결 · 좁은잎 ${j.observed[0]?'기록 완료':'미관찰'} · 갈래잎 ${j.observed[1]?'기록 완료':'미관찰'} · ${j.gateOpen?'보드워크 열림':`순서 ${j.progress}/3`}`}
export function actionFeedback(r){if(r.alreadyOpen)return'이미 보드워크 길이 열려 있어요.';if(r.message)return r.message;return r.ok?'관찰 기록을 확인했어요.':'키를 뗀 뒤 표식을 바라보고 다시 조사해 주세요.'}
export function completionStatus(r){return r?.message??(r?.completed?'정글돔 식생 관찰 완료 · 원래 보상을 확인했습니다.':'처리를 마쳤습니다.')}
