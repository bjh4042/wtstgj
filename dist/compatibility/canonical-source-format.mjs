// Source file names and CSV parsing are shared data utilities. Keep them free
// of either active or staged runtime adapter imports.
export const SOURCE_FILES=Object.freeze({species:'geoje_species_151_v3_final.json',battle:'geoje_battle_collection_master_v3.json',stage:'geoje_stage_master_v2_3.json',trainer:'geoje_trainer_npc_master_v2.json',flags:'geoje_story_flags_master_v2.json',encounter:'geoje_encounter_master_v2_3.json',fishing:'geoje_fishing_master_v1_1.csv',acquisition:'geoje_acquisition_master_v2.csv',character:'geoje_character_npc_master_v2.json',save:'geoje_save_schema_v2.json',migration:'geoje_save_migration_alias_v1_to_v2.json',manifest:'geoje_final_source_manifest_v1.json',index:'geoje_canonical_handoff_index_v1.json',historical:'geoje_cross_validation_report_v2.json',online:'geoje_online_battle_master_v1.json',onlineRules:'geoje_online_battle_firebase_rules_contract_v1.json',rules:'database.rules.json'});

export function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(!quoted&&(c===','||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[]}}else cell+=c}
 if(quoted)throw Error('Unclosed CSV quote');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
 const header=rows.shift()??[];if(new Set(header).size!==header.length)throw Error('Duplicate CSV header');
 return rows.map(r=>{if(r.length!==header.length)throw Error('CSV column count mismatch');return Object.fromEntries(header.map((h,i)=>[h,r[i]]))});
}
