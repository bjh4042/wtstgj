// New-game starter configuration. Canonical catalog IDs and names remain unchanged.
const family=(id,type,members)=>Object.freeze({id,type,members:Object.freeze(members)});

export const STARTER_FAMILIES=Object.freeze([
 family(139,'풀',[139,140]),
 family(67,'물',[67,68,69]),
 family(70,'불',[70,71,72])
]);

export const STARTER_IDS=Object.freeze(STARTER_FAMILIES.map(row=>row.id));
export const STARTER_FAMILY_IDS=Object.freeze(STARTER_FAMILIES.flatMap(row=>row.members));
const STARTER_FAMILY_ID_SET=new Set(STARTER_FAMILY_IDS);

export const starterFamilyFor=id=>STARTER_FAMILIES.find(row=>row.members.includes(id))??null;
export const isStarterFamilyId=id=>STARTER_FAMILY_ID_SET.has(id);
