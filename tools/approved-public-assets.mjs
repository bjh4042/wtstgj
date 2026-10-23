/** Public-media boundary: allow selected originals/verified derivatives and OFL fonts only. */
export const APPROVED_ASSET_DIRECTORIES=Object.freeze([
 'approved-title','approved-atlases','approved-terrain','approved-field-proof',
 'approved-prologue','approved-intro','approved-battle-backgrounds','approved-surf','approved-battle-trainers','rc3/fonts'
]);
export const APPROVED_ASSET_DATA=Object.freeze(['golden-living-v1/font.json','golden-living-v2/map.json']);
export function approvedPublicAsset(path,{directory=false}={}){
 const relative=String(path).replaceAll('\\','/').replace(/^.*?dist\/assets\//,'').replace(/^\.\//,'').replace(/^assets\//,'');
 if(directory)return APPROVED_ASSET_DIRECTORIES.some(d=>d===relative||d.startsWith(relative+'/')||relative.startsWith(d+'/'))||APPROVED_ASSET_DATA.some(d=>d.startsWith(relative+'/'));
 if(!/\.(png|webp|svg|woff2?|ttf|bdf|json|md)$/i.test(relative))return false;
 if(/(^|\/)(provenance|source-verification|source-report)\.json$/.test(relative))return false;
 return APPROVED_ASSET_DIRECTORIES.some(d=>relative.startsWith(d+'/'))||APPROVED_ASSET_DATA.includes(relative);
}
