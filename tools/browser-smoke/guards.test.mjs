import test from 'node:test';import assert from 'node:assert/strict';import {classifyRequest,footFromStatus,assertSandboxCommand,sandboxEvidence} from './guards.mjs';
test('only exact local origin allowed',()=>{assert.equal(classifyRequest('http://127.0.0.1:4173/wtstgj/'),'local');for(const u of ['https://127.0.0.1:4173/','http://localhost:4173/','http://127.0.0.1:8888/','https://firebase.google.com/'])assert.equal(classifyRequest(u),'unexpected-external-blocked')});
test('only public weather GET is optional and still blocked',()=>{assert.equal(classifyRequest('https://api.open-meteo.com/v1/forecast'),'optional-weather-blocked');assert.equal(classifyRequest('https://api.open-meteo.com/v1/forecast','POST'),'unexpected-external-blocked')});
test('integral UI status only',()=>{assert.deepEqual(footFromStatus('S7 이동 검수 · 발 위치 4000, 770 · 게임 저장 변경 없음','S7'),[4000,770]);assert.throws(()=>footFromStatus('맵 준비 실패','S7'));assert.throws(()=>footFromStatus('S8 이동 검수 · 발 위치 1.5, 2 · 게임 저장 변경 없음','S8'))});
test('sandbox weakening flags rejected',()=>{assertSandboxCommand(['--headless']);for(const flag of ['--no-sandbox','--disable-setuid-sandbox','--disable-web-security','--disable-seccomp-filter-sandbox=1'])assert.throws(()=>assertSandboxCommand([flag]))});
test('sandbox proof requires renderer namespaces or suid AND seccomp',()=>{assert(sandboxEvidence('Namespace sandbox Yes\nSeccomp-BPF sandbox Yes'));assert(sandboxEvidence('SUID sandbox Yes\nSeccomp-BPF sandbox Yes'));assert(!sandboxEvidence('Namespace sandbox No\nSeccomp-BPF sandbox Yes'));assert(!sandboxEvidence('Namespace sandbox Yes\nSeccomp-BPF sandbox No'))});

const modern='Layer 1 Sandbox\tNamespace\nPID namespaces\tYes\nNetwork namespaces\tYes\nSeccomp-BPF sandbox\tYes';
test('Chrome156 explicit namespace table accepted',()=>assert(sandboxEvidence(modern)));
for(const [field,value] of [['Layer 1 Sandbox','Namespace'],['PID namespaces','Yes'],['Network namespaces','Yes'],['Seccomp-BPF sandbox','Yes']]){
 test('reject missing '+field,()=>assert(!sandboxEvidence(modern.split('\n').filter(x=>!x.startsWith(field+'\t')).join('\n'))));
 test('reject No '+field,()=>assert(!sandboxEvidence(modern.replace(field+'\t'+value,field+'\tNo'))));
 test('reject contradictory '+field,()=>assert(!sandboxEvidence(modern+'\n'+field+'\tNo')));
}
test('footer alone and incomplete modern cannot fall through to legacy',()=>{assert(!sandboxEvidence('You are adequately sandboxed.'));assert(!sandboxEvidence(modern.replace('PID namespaces\tYes','PID namespaces\tNo')+'\nNamespace sandbox Yes'))});
test('duplicate contradictory legacy and seccomp rejected',()=>{assert(!sandboxEvidence('Namespace sandbox Yes\nNamespace sandbox No\nSeccomp-BPF sandbox Yes'));assert(!sandboxEvidence('Namespace sandbox Yes\nSeccomp-BPF sandbox Yes\nSeccomp-BPF sandbox No'))});

test('actual Chrome156 ancillary rows do not shadow seccomp',()=>assert(sandboxEvidence(modern+'\nSeccomp-BPF sandbox supports TSYNC\tYes\nPtrace Protection with Yama LSM (Non-broker)\tNo\n\nYou are adequately sandboxed.')));
