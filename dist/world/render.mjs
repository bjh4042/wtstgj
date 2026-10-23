import {drawApprovedEventMarker} from '../art/approved-event-markers.mjs';
import {loadPrologueDecorations,drawPrologueGround,prologueDecorationLayers,prologueSuggestedCameraY,drawSemanticPoint} from './prologue-decoration.mjs';
import {loadApprovedFieldProof,approvedObjectEntries} from '../art/approved-field-proof.mjs';
import {loadApprovedPlayers,drawApprovedPlayer} from '../art/approved-player-field.mjs';
import {drawApprovedNPC} from '../art/approved-npc-field.mjs';
import {loadApprovedTerrain,drawApprovedTile} from '../approved-field-terrain.mjs';
import {loadAsset,peekAsset} from '../asset-runtime.mjs';
import {humanPose} from '../asset-manifest.mjs';
import {drawW03Human} from '../art/w03-human-field.mjs';
import {playerFieldAssetId} from '../art/w03-player-field.mjs';
import {drawTilePlaceholder,tileSource} from '../tileset-contract.mjs';
import {TILE_DEFAULT_ANIMATIONS,resolveTileAnimation,drawAnimatedTile} from '../presentation/tile-animation.mjs';
import {drawResolvedEnvironment} from '../presentation/weather-layer.mjs';
import {GRID} from './definition.mjs';
export function drawWorld(c,w,environment,now,{motion=null,diagnostics=true,actorHeight=38,compositionPreview=false,centerScale=null,cameraY=null}={}){
 const m=w.map,s=w.snapshot(),f=w.field,W=c.canvas.width,H=c.canvas.height,t=motion?.scene===f.scene?Math.min(1,(now-motion.start)/180):1,px=t<1?motion.x+(f.x-motion.x)*t:f.x,py=t<1?motion.y+(f.y-motion.y)*t:f.y,cx=Math.max(0,Math.min(m.width*GRID-W,px-W/2)),cy=cameraY??(m.id==='world:hub:PROLOGUE'?prologueSuggestedCameraY(py,H,m.height*GRID):Math.max(0,Math.min(m.height*GRID-H,py-H/2)));
 loadApprovedPlayers();loadApprovedTerrain();loadApprovedFieldProof();loadPrologueDecorations();c.clearRect(0,0,W,H);c.imageSmoothingEnabled=false;c.save();c.translate(-Math.round(cx),-Math.round(cy));
 for(let y=Math.floor(cy/GRID);y<Math.min(m.height,Math.ceil((cy+H)/GRID));y++)for(let x=Math.floor(cx/GRID);x<Math.min(m.width,Math.ceil((cx+W)/GRID));x++){const neighbors=[[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]].map(([dx,dy])=>m.tiles[y+dy]?.[x+dx]??m.tiles[y][x]);drawApprovedTile(c,m.tiles[y][x],x*GRID,y*GRID,GRID,now,{neighbors});}
 drawPrologueGround(c,w,now);
 const objectLayers=[...m.solidObjects.flatMap(o=>approvedObjectEntries(o.assetId,o.rect,GRID,{objectScale:o.assetId==='building.ecocenter'?centerScale:null})??[]),...prologueDecorationLayers({map:m,prologueCompositionProposal:compositionPreview})];
 for(const o of m.solidObjects)if(o.assetId==='building.ecocenter'){const[x,y,a,b]=o.rect;for(let dy=0;dy<b;dy++)for(let dx=0;dx<a;dx++)drawApprovedTile(c,4,(x+dx)*GRID,(y+dy)*GRID,GRID,now);}
 if(m.puzzle){c.fillStyle=s.world.puzzles.includes(m.puzzle.id)?'#8bbf85':'#452f68';c.fillRect(m.puzzle.gate[0]*GRID,m.puzzle.gate[1]*GRID,GRID,GRID)}
 for(const id of m.points){const p=w.definition.points[id];if(drawSemanticPoint(c,p,{diagnostics}))continue;if(['event','trainer','post-deferred','enhanced-league-info','harin-rematch','hidden-hint-npc'].includes(p.kind))continue;c.fillStyle=p.markerColor??({warp:'#af91dd',heal:'#e6b2cc',shop:'#f4ce74',fishing:'#74c0ef',research:'#9ddd8d'}[p.kind]??'#7ed7cf');c.fillRect(p.x*GRID+8,p.y*GRID+8,32,32);c.fillStyle='#123';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(p.markerGlyph??({warp:'문',heal:'센터',shop:'상점',fishing:'낚시',research:'조사',puzzle:'장치',acquisition:'관찰',tutorial:'연습',compass:'조립','hidden-geoje':'조사','hidden-clue':'표식','hidden-marker':'표식'})[p.kind]??'안내',p.x*GRID+24,p.y*GRID+29)}
 const actors=[...f.core.npcs.map(n=>({...n,assetId:n.fieldAssetId??null,label:w.definition.points[n.pointId]?.label})),{isPlayer:true,x:px,y:py,assetId:playerFieldAssetId(s.player.appearance),facing:f.facing,moving:t<1,walk:f.walk,label:'나'}].sort((a,b)=>a.y-b.y);
 for(const a of [...actors,...objectLayers.map(o=>({y:o.depth,renderObject:o.draw}))].sort((a,b)=>a.y-b.y)){if(a.renderObject){a.renderObject(c);continue}if(a.isPlayer){drawApprovedPlayer(c,{...a,appearance:s.player.appearance,visibleHeight:actorHeight});continue}if(drawApprovedNPC(c,{...a,visibleHeight:actorHeight}))continue;if(!a.assetId){drawApprovedEventMarker(c,a);continue}loadAsset(a.assetId);const art=peekAsset(a.assetId);if(art&&(diagnostics||art.status!=='placeholder')){if(!drawW03Human(c,art,a)){const pose=humanPose(a.facing,a.moving,a.walk,{legacy:art.status==='legacy'});c.drawImage(art.image,...pose.source,a.x-pose.anchor[0]*.45,a.y-pose.anchor[1]*.45,43.2,54)}}else{c.fillStyle='#ffda75';c.fillRect(a.x-12,a.y-36,24,36)}if(diagnostics){c.fillStyle='#153549';c.fillRect(a.x-65,a.y+5,130,19);c.fillStyle='white';c.font='13px sans-serif';c.textAlign='center';c.fillText(a.label?.slice(0,17)??'',a.x,a.y+19)}}
 if(f.core.sequence?.kind==='trainer'){const n=f.core.npcs.find(n=>n.id===f.core.sequence.npcId);if(n){c.fillStyle='#ffe';c.font='bold 30px sans-serif';c.fillText('!',n.x,n.y-60)}}
 c.restore();drawResolvedEnvironment(c,environment.getFrame(m),now,W,H);
}
