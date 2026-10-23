// Optional session-local interception; no flag or catalog stored on the global field engine.
const handlers=new WeakMap();
export function setEncounterMovementHandler(field,handler){handlers.set(field,handler);return ()=>handlers.delete(field)}
export function encounterMovementHandler(field){return handlers.get(field)??null}
