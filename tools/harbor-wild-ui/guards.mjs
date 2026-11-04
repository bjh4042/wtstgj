export const ORIGIN='http://127.0.0.1:4173';
export function classifyRequest(url,method='GET'){
 const u=new URL(url);
 if(u.origin===ORIGIN)return 'local';
 if(u.protocol==='data:'||u.protocol==='blob:')return 'inline';
 if(method==='GET'&&u.hostname==='api.open-meteo.com'&&u.protocol==='https:')return 'optional-weather-blocked';
 return 'unexpected-external-blocked';
}
export function footFromStatus(text,map){const m=new RegExp('^'+map+' 이동 검수 · 발 위치 (-?\\d+), (-?\\d+) · 게임 저장 변경 없음$').exec(text);if(!m)throw Error('Unexpected walk status');return m.slice(1).map(Number)}
export function assertSandboxCommand(args){if(!Array.isArray(args)||args.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-seccomp-filter-sandbox|disable-web-security)(?:=|$)/.test(x)))throw Error('Unsafe Chrome launch flags')}
export function sandboxEvidence(text){
 const rows=String(text).split(/\r?\n/).map(x=>x.trim()).map(x=>{const m=/^(.*?)\s+(\S+)$/.exec(x);return m?[m[1].trim(),m[2]]:[]});
 const values=label=>rows.filter(x=>x[0]===label).map(x=>x[1]);
 const exact=(label,value)=>{const v=values(label);return v.length===1&&v[0]===value};
 if(!exact('Seccomp-BPF sandbox','Yes'))return false;
 if(values('Layer 1 Sandbox').length)return exact('Layer 1 Sandbox','Namespace')&&exact('PID namespaces','Yes')&&exact('Network namespaces','Yes');
 return exact('Namespace sandbox','Yes')||exact('SUID sandbox','Yes');
}
