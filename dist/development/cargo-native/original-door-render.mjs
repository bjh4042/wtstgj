/** Registered 130x52 steel leaves and 146x60 frame, with constant 8px jambs. */
export function drawDoor(ctx,images,{cx,cy,width,progress}){
 const e=progress*progress*(3-2*progress),x=cx-width/2,y=cy-44;
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,52);ctx.clip();
 ctx.drawImage(images.panel,0,0,65,52,x-width/2*e,y,width/2,52);
 ctx.drawImage(images.panel,65,0,65,52,cx+width/2*e,y,width/2,52);ctx.restore();
 // 8px side posts fixed; only horizontal header is stretched.
 ctx.drawImage(images.frame,0,0,8,60,x-8,cy-52,8,60);
 ctx.drawImage(images.frame,138,0,8,60,x+width,cy-52,8,60);
 ctx.drawImage(images.frame,8,0,130,8,x,cy-52,width,8);
}
export function drawAtDoorDepth(actorFootY,doorPivotY,drawActor,drawDoorLayer){
 if(actorFootY<=doorPivotY+8){drawActor();drawDoorLayer();}else{drawDoorLayer();drawActor();}
}
