/** Keep the UTF-8 BOM: authoritative hashes cover original bytes, not parsed text.
 * Response.text() strips it from the two canonical CSVs. Parse only after validation.
 */
export async function readCanonicalSource(file){
 const response=await fetch(new URL('../data/canonical-handoff-v1/'+file,import.meta.url));
 if(!response.ok)throw Error('Canonical source unavailable: '+file);
 return new TextDecoder('utf-8',{ignoreBOM:true,fatal:true}).decode(await response.arrayBuffer());
}
