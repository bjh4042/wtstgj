// Native-space copy only. Common source message, gates, receipts and rewards remain unchanged.
export function gym4ObservationMessage(pointId,result,runtime){
 if(!result||typeof result.message!=='string')return null;
 const done=runtime.world.puzzles.includes('gym-switch:4');
 if(pointId==='puzzle:4:step:1'&&(done||runtime.world.interactions.includes(pointId)))return done?'방문 확인이 끝났습니다. 안내에 따라 관장실로 이동하세요.':'대기석 옆 안내를 확인한 뒤, 오른쪽 방의 책장 옆에서 방문을 확인하세요.';
 if(pointId==='puzzle:4'&&done)return '방문 확인이 끝났습니다. 안내에 따라 관장실로 이동하세요.';
 return null;
}
