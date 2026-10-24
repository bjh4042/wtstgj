import {IDENTITY_SOURCE_SHA256} from './species-registry.mjs';
export const LEGACY_CONTENT=Object.freeze({contentNamespace:'legacy-work-v2',contentVersion:'v2_2026-09-11',speciesNamespace:'work-v2'});
export const CANONICAL_CONTENT=Object.freeze({contentNamespace:'canonical-v1',contentVersion:'geoje_species_151_v3_final@'+IDENTITY_SOURCE_SHA256.slice(0,12),speciesNamespace:'canonical'});
export function contentDescriptor(namespace){return namespace===LEGACY_CONTENT.contentNamespace?LEGACY_CONTENT:namespace===CANONICAL_CONTENT.contentNamespace?CANONICAL_CONTENT:null}
