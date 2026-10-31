import {S4TargetScene} from './target-scene.mjs';
export class AnimatedS4TargetScene extends S4TargetScene {
 constructor(options){super(options);this.walking=false}
 stop(){super.stop();this.walking=false}
 frame(dt,dir){this.walking=super.frame(dt,dir);return this.walking}
 draw(ctx,environment){if(this.disposed)throw Error('SCENE_DISPOSED');if(!Number.isFinite(environment?.minutes)||!Number.isFinite(environment?.elapsedMs))throw Error('MAIN_CLOCK_REQUIRED');return this.renderer(ctx,{...this.getLocation(),walking:this.walking},environment)}
}
