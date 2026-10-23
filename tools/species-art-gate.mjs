import {inflateSync} from 'node:zlib';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {SPECIES_ASSETS,CANONICAL_SPECIES_ASSETS,ASSET_MANIFEST} from '../dist/asset-manifest.mjs';
import {validateAlphaPixels} from '../dist/asset-runtime.mjs';
import {validateFollowerMetadata,FOLLOWER_ATLAS_CONTRACT} from '../dist/species-asset-contract.mjs';
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
/** Import format: non-interlaced 8-bit RGBA or GA PNG, lossless and transparent. */
export function decodeContractPNG(b){
 if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG signature');
 const chunks=[];let offset=8,header,end=false;
 while(offset+12<=b.length){const length=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8),data=b.subarray(offset+8,offset+8+length);if(offset+12+length>b.length)throw Error('Truncated PNG');if(crc32(b.subarray(offset+4,offset+8+length))!==b.readUInt32BE(offset+8+length))throw Error('PNG CRC mismatch');if(!header&&type!=='IHDR')throw Error('Missing PNG header');if(type==='IHDR'){if(header||length!==13)throw Error('Invalid PNG header');header=data}if(type==='IDAT')chunks.push(data);offset+=length+12;if(type==='IEND'){end=true;break}}
 if(!header||!end||offset!==b.length)throw Error('Incomplete PNG');
 const width=header.readUInt32BE(0),height=header.readUInt32BE(4),color=header[9],channels=color===6?4:color===4?2:0;
 if(!width||!height||width>4096||height>4096||header[8]!==8||!channels||header[10]||header[11]||header[12])throw Error('Expected non-interlaced 8-bit RGBA/GA PNG');
 const stride=width*channels,raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*height});if(raw.length!==(stride+1)*height)throw Error('PNG pixel length mismatch');
 const pixels=new Uint8Array(stride*height),rgba=new Uint8ClampedArray(width*height*4);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Invalid PNG filter');for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?pixels[i-channels]:0,b=y?pixels[i-stride]:0,c=y&&x>=channels?pixels[i-stride-channels]:0;pixels[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255}}
 for(let i=0;i<width*height;i++){const p=i*channels;rgba[i*4]=pixels[p];rgba[i*4+1]=channels===4?pixels[p+1]:pixels[p];rgba[i*4+2]=channels===4?pixels[p+2]:pixels[p];rgba[i*4+3]=pixels[p+channels-1]}
 return {width,height,rgba};
}
export function validateSpeciesPNG(asset,bytes){
 const catalog=asset.namespace==='canonical'?CANONICAL_SPECIES_ASSETS:SPECIES_ASSETS;
 if(!catalog[asset.speciesId])throw Error('Unknown species ID');
 const species=catalog[asset.speciesId],ids=[species.battle.front,species.battle.back,species.ui.icon,species.fieldFollower.atlas];
 if(!ids.includes(asset.id)||asset.final.src!==ASSET_MANIFEST[asset.id].final.src)throw Error('Unregistered asset slot/path');
 if(asset.kind==='follower'){validateFollowerMetadata(asset.metadata);if(JSON.stringify(asset.contract)!==JSON.stringify(FOLLOWER_ATLAS_CONTRACT))throw Error('Follower 12-frame contract mismatch')}
 const image=decodeContractPNG(bytes);if(image.width!==asset.final.width||image.height!==asset.final.height)throw Error('Image size mismatch');validateAlphaPixels(asset,image.rgba,image.width,image.height);return true;
}
/** Missing complete species are normal. Selected or partially imported species must supply all four slots. */
export function inspectSpeciesArt(root='dist',selected=[]){return inspectCatalogArt(root,selected,SPECIES_ASSETS)}
export function inspectCanonicalSpeciesArt(root='dist',selected=[]){return inspectCatalogArt(root,selected,CANONICAL_SPECIES_ASSETS)}
function inspectCatalogArt(root,selected,catalog){
 const failures=[],present=[],missing=[],checked=[];
 for(const id of selected)if(!catalog[id])failures.push({speciesId:id,error:'Unknown species ID'});
 for(const [id,s] of Object.entries(catalog)){
  const assets=[s.battle.front,s.battle.back,s.ui.icon,s.fieldFollower.atlas].map(key=>ASSET_MANIFEST[key]);
  const active=selected.map(String).includes(id)||assets.some(a=>existsSync(resolve(root,a.final.src)));
  for(const asset of assets){const path=resolve(root,asset.final.src);if(!path.startsWith(resolve(root)+sep)){failures.push({id:asset.id,error:'Unsafe file path'});continue}
   if(!existsSync(path)){missing.push(asset.id);if(active)failures.push({id:asset.id,error:'Required species image missing'});continue}
   checked.push(asset.id);try{validateSpeciesPNG(asset,readFileSync(path));present.push(asset.id)}catch(error){failures.push({id:asset.id,error:error.message})}
  }
 }
 return {species:151,speciesSlots:604,present,missing,checked,failures};
}
