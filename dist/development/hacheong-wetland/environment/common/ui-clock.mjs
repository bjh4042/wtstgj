// UI driver consumes the existing single owner; never constructs or resets a clock.
export const normalizeMinute=x=>((x%1440)+1440)%1440;
export function createLightingDemoDriver(clock){
 let demo=null,lastDemo=null;
 function hold(){demo=null;clock.setLightingRate(0);}
 function start(to){const {absoluteMinutes:from,elapsedMs:startElapsed}=clock.read();demo={from,to,startElapsed};lastDemo=demo;clock.setLightingRate((to-from)/8000);}
 return Object.freeze({hold,scrub(minutes){hold();clock.scrubLighting(minutes);},startNext(target){const now=clock.read().absoluteMinutes,next=now-normalizeMinute(now)+target;start(next>now?next:next+1440);},reverse(){start((demo||lastDemo)?.from??clock.read().absoluteMinutes-300);},tick(delta,paused){if(paused)return;clock.tick(delta);if(demo&&clock.read().elapsedMs-demo.startElapsed>=8000){clock.scrubLighting(demo.to);hold();}}});
}
