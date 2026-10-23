import {resolveSpeciesAssets} from './species-asset-resolver.mjs';
import {peekAsset,loadAsset} from './asset-runtime.mjs';
import {followerPose,followerRect,followerMetadata} from './species-asset-contract.mjs';
/** Render only: image fetches never gate path sampling, collision, or game progression. */
export function drawFieldFollower(c,f,{camera=0,unitScale=1,metadata=undefined,pose=undefined}={}){
 const slots=resolveSpeciesAssets(f?.speciesReference??{namespace:'work-v2',speciesId:f?.speciesId});
 if(!f?.visible||!slots)return false;
 const id=slots.fieldFollower.atlas,asset=peekAsset(id),m=followerMetadata(null,{...slots.fieldFollower,...metadata}),p=followerPose(pose?.facing??f.facing,pose?false:f.moving,f.walk,pose?.frame??null),r=followerRect(f.x,f.y-camera,m,unitScale);
 if(typeof Image!=='undefined')loadAsset(id);
 c.save();c.imageSmoothingEnabled=false;
 if(asset)c.drawImage(asset.image,...p.source,r.x,r.y,r.width,r.height);
 else {const scale=m.visualScale*unitScale;c.fillStyle='#658c9e';c.fillRect(r.x+27*scale,r.y+58*scale,44*scale,62*scale);c.fillStyle='#fff';c.font=`${Math.max(9,12*scale)}px monospace`;c.fillText(String(f.speciesId),r.x+34*scale,r.y+98*scale)}
 c.restore();return true;
}
