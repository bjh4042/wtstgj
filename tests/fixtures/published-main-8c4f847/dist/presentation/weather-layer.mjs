export const WEATHER_EFFECTS=Object.freeze({
 CLEAR:Object.freeze({brightness:1,saturation:1,tint:'#000000',opacity:0,density:0,splashes:0,waterSpeed:1,waterIntensity:1,weatherSfxId:null,gain:0}),
 CLOUDY:Object.freeze({brightness:.93,saturation:.91,tint:'#708497',opacity:.05,density:0,splashes:0,waterSpeed:1,waterIntensity:1,weatherSfxId:null,gain:0}),
 RAIN:Object.freeze({brightness:.88,saturation:.9,tint:'#39536a',opacity:.07,density:80,splashes:14,waterSpeed:1.15,waterIntensity:1.12,weatherSfxId:'weather.rain.light',gain:.45}),
 HEAVY_RAIN:Object.freeze({brightness:.78,saturation:.83,tint:'#233b52',opacity:.13,density:180,splashes:40,waterSpeed:1.35,waterIntensity:1.3,weatherSfxId:'weather.rain.heavy',gain:.75})
});
export function resolveWeather(weather='CLEAR',{sheltered=false}={}){return WEATHER_EFFECTS[sheltered?'CLEAR':weather]??WEATHER_EFFECTS.CLEAR}
export function drawWeatherLayer(c,weather,timeMs,width,height){
 const w=typeof weather==='string'?resolveWeather(weather):weather;if(!w.opacity&&!w.density)return;
 c.save();if(w.opacity){c.globalAlpha=w.opacity;c.fillStyle=w.tint;c.fillRect(0,0,width,height)}c.globalAlpha=.6;c.strokeStyle='#c6dfea';c.lineWidth=2;
 for(let i=0;i<w.density;i++){const x=(i*127.3+timeMs*.08)%width,y=(i*79.7+timeMs*.6)%height;c.beginPath();c.moveTo(x,y);c.lineTo(x-7,y+19);c.stroke()}
 c.globalAlpha=.32;for(let i=0;i<w.splashes;i++){const x=(i*193)%width,y=(i*131)%height,r=(timeMs/90+i)%6;c.beginPath();c.ellipse(x,y,r*2,r,0,0,Math.PI*2);c.stroke()}c.restore();
}
/** Apply only to the completed field framebuffer, before UI. UI and map pixels on disk are untouched. */
export function drawResolvedEnvironment(c,{lighting:l,weather:w},timeMs,width,height){
 const brightness=l.brightness*w.brightness,saturation=l.saturation*w.saturation;
 if(c.canvas&&(brightness!==1||saturation!==1||l.contrast!==1)){c.save();c.filter=`brightness(${brightness}) saturate(${saturation}) contrast(${l.contrast})`;c.globalCompositeOperation='copy';c.drawImage(c.canvas,0,0,width,height);c.restore()}
 if(l.tintOpacity){c.save();c.globalAlpha=l.tintOpacity;c.fillStyle=`rgb(${l.ambientTint.map(Math.round).join(',')})`;c.fillRect(0,0,width,height);c.restore()}
 if(l.shadowIntensity&&c.createRadialGradient){c.save();const gradient=c.createRadialGradient(width/2,height/2,height*.1,width/2,height/2,width*.7);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,`rgba(0,8,20,${l.shadowIntensity})`);c.fillStyle=gradient;c.fillRect(0,0,width,height);c.restore()}
 drawWeatherLayer(c,w,timeMs,width,height);
}
