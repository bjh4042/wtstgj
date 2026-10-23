/** Non-secret transaction identifier for DEV controls, including HTTP previews.
 * getRandomValues is available without randomUUID's secure-context restriction.
 */
export function devRequestId(crypto=globalThis.crypto){
 if(typeof crypto?.randomUUID==='function')return crypto.randomUUID();
 if(typeof crypto?.getRandomValues!=='function')throw Error('DEV request ID generator unavailable');
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 return 'dev-request-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
