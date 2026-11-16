/** Narrow canonical shore proposal. Existing encounter tables and acquisition rules unchanged. */
export const FISHING_EDGE_CELLS=Object.freeze({
 'fishing:P_JANGSEUNGPO_COAST':[11,13],
 'fishing:S1_HACHEONG_BRACKISH':[11,13],
 'fishing:S2_JANGMOK_COAST':[11,13],
 'fishing:S6_HAKDONG_MONGDOL':[13],
 'fishing:S7_HAEGEUMGANG_ROCKY_COAST':[11,13],
 'fishing:S8_JISEPO_HARBOR':[13],
 'fishing:S8_GUJORA_OFFSHORE':[11,13]
});
export function fishingCastTarget(point,mapId,cell){
 if(point.kind!=='fishing'||point.mapId!==mapId)return null;
 if(cell.x===point.x&&cell.y===point.y)return point.water;
 // Fail closed on geometry drift; this is not a general water/shore permission.
 if(point.x!==12||point.y!==18||point.facing!=='down'||point.water?.[0]!==12||point.water?.[1]!==19)return null;
 return cell.y===18&&FISHING_EDGE_CELLS[point.id]?.includes(cell.x)?[cell.x,19]:null;
}
