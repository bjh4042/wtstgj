// Resolve raw pinned asset roots at runtime; do not let Vite rewrite directory URLs.
const assetModuleURL=import.meta.url;
export const INPUT_PINS=Object.freeze({"PROPOSAL.json":"f3f946e002ca318e2449c8e918a4071f2411b1a0a5a6b70a754fec46dcc7b5d4","ROOT_SELECTION.json":"fdd405df63fd43147ceeca5faf6eb9547de45a8fa7ae5a1d48698e6cb3a80301","safe49x37.u8":"2ab3f2d872be9f7641542ebf035363cbcca53d81f9f1a4bbea1e8db018970602"});
const sha=async b=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function loadSceneInputs({fetcher=fetch,decode=async bytes=>createImageBitmap(new Blob([bytes],{type:'image/png'}))}={}){
 const decoded=[];const originalDecode=decode;decode=async bytes=>{const bitmap=await originalDecode(bytes);decoded.push(bitmap);return bitmap};try{
 const base=new URL('./',assetModuleURL),read=async(path,expected)=>{const r=await fetcher(new URL(path,base));if(!r.ok)throw Error('INPUT_FETCH_FAILED '+path);const b=await r.arrayBuffer();if(expected&&await sha(b)!==expected)throw Error('INPUT_SHA_MISMATCH '+path);return b;};
 const contract=JSON.parse(new TextDecoder().decode(await read('inputs/PROPOSAL.json',INPUT_PINS['PROPOSAL.json']))),selection=JSON.parse(new TextDecoder().decode(await read('inputs/ROOT_SELECTION.json',INPUT_PINS['ROOT_SELECTION.json'])));
 if(selection.status!=='SELECTED_FOR_NATIVE_GAMEPLAY_INTEGRATION_CANDIDATE'||contract.revision!=='NOJASAN_NATIVE_FLOOR_YEJI_PROPOSAL_R2')throw Error('ROOT_SELECTED_R2_REQUIRED');
 const [mask,map,yeji,player]=await Promise.all([read('inputs/safe49x37.u8',INPUT_PINS['safe49x37.u8']),read('inputs/NOJASAN_STATIC_SELECTED_SOURCE.png','c6d76ae2334c032b7630c2fe547e3921731b558b9b324daa3ff912bf7ba7af66'),read('inputs/YEJI_FIELD12_COMMON256.png','183c1e692e880341eea518743a19bd1c2afeb73a6db388a6b1faf828ec56fc55'),read('inputs/PLAYER_MALE_FIELD12_COMMON256.png','36238353e9a4f943296a289a2c45639ef283e9056a72a6d37a39dc237b860390')]);
 const images={playerAppearance:'boy',map:await decode(map),yeji:await decode(yeji),player:await decode(player)};
 if(images.map.width!==1536||images.map.height!==1024||images.yeji.width!==768||images.yeji.height!==1024||images.player.width!==768||images.player.height!==1024)throw Error('IMAGE_DIMENSION_DRIFT');
 return {contract,selection,safeBytes:new Uint8Array(mask),images};
 }catch(error){for(const bitmap of decoded)bitmap?.close?.();throw error;}
}
