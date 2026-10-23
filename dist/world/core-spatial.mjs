// Optional session-local geometry. Legacy players never acquire a binding.
const bindings=new WeakMap();
export const coreSpatial=player=>bindings.get(player);
export function bindCoreSpatial(player,binding){bindings.set(player,binding);return ()=>bindings.delete(player)}
