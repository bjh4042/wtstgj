// DEV capability only: never wraps window.localStorage or accepts external storage.
const owned=new WeakSet();
export function createCargoMemoryStorage(){const values=new Map();let failure=null,after=false;const api=Object.freeze({getItem:k=>values.get(k)??null,setItem(k,v){if(failure?.(k,'before'))throw Error('TEST_WRITE_FAILURE');values.set(k,String(v));if(after&&failure?.(k,'after'))throw Error('TEST_WRITE_AFTER_FAILURE')},removeItem:k=>values.delete(k),snapshot:()=>Object.fromEntries(values),setFault(fn,{afterWrite=false}={}){failure=fn;after=afterWrite},clearFault(){failure=null;after=false}});owned.add(api);return api}
export const isCargoMemoryStorage=s=>owned.has(s);
