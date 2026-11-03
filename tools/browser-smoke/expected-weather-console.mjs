// A blocked optional weather request is not a successful external fetch.
// Only Chromium's exact transport diagnostic at that same URL can consume it.
export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=34.8806&longitude=128.6211&current=weather_code&timezone=Asia%2FSeoul&timeformat=unixtime';
export const BLOCKED_MESSAGE='Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector';
export function createExpectedWeatherConsole(){
 const pending=new Map();let intercepted=0,matched=0;
 return Object.freeze({
  intercept(page,{url,method,resourceType}){
   if(!page||url!==WEATHER_URL||method!=='GET'||resourceType!=='fetch')return false;
   pending.set(page,(pending.get(page)??0)+1);intercepted++;return true;
  },
  consume(page,{type,text,url,lineNumber}){
   if(type!=='error'||text!==BLOCKED_MESSAGE||url!==WEATHER_URL||lineNumber!==0||!(pending.get(page)>0))return false;
   pending.set(page,pending.get(page)-1);matched++;return true;
  },
  snapshot(){return Object.freeze({intercepted,matched,unmatchedInterceptions:intercepted-matched})}
 });
}
