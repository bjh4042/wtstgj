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
export function sandboxEvidence(text){return /(?:Namespace|SUID) sandbox\s+Yes/i.test(text)&&/Seccomp-BPF sandbox\s+Yes/i.test(text)}
