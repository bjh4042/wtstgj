import {drawHealing} from './healing.mjs?rev=sidegap_0835';
export function renderScene(g,assets,layout,state,{original=false}={}){
 g.clearRect(0,0,768,576);g.drawImage(original?assets.original:assets.room,0,0);
 if(original)return;
 const s=5/12,[x,y]=layout.doctorFoot;
 g.save();g.imageSmoothingEnabled=false;g.drawImage(assets.doctor,0,0,256,256,x-128*s,y-216*s,256*s,256*s);g.restore();
 // Exact original pixels of foreground counter, provided by layout author.
 g.drawImage(assets.foreground,0,0);
 drawHealing(g,state,layout,assets.ball,layout.ballAsset);
}
