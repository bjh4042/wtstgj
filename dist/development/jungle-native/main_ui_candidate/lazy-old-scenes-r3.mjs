import {preparePrologueSupport} from '../../prologue-native/support-r3.mjs';
import {prepareForestSupport,prepareCoastSupport} from '../../prologue-areas/support-r3.mjs';
import {prepareGym5Support} from '../gym5_native_candidate/support-r3.mjs';
import {preparePrologue} from '../../prologue-native/presentation.mjs';
import {preparePrologueForest,preparePrologueCoast} from '../../prologue-areas/presentation.mjs';
import {prepareGym5} from '../gym5_native_candidate/presentation.mjs';
const cancelled=()=>Object.assign(Error('OLD_SCENE_PRESENTATION_CANCELLED'),{name:'AbortError'});
async function lazy(supportFactory,fullFactory,options){const support=await supportFactory(options);let dead=false,value=null,pending=null,epoch=0,queue=Promise.resolve(),controller=null;
 const check=e=>{if(dead||options.signal?.aborted||e!==epoch)throw cancelled()};
 function releasePresentation(){++epoch;controller?.abort();value?.dispose();value=null;pending=null;}
 function ensurePresentation(){try{check(epoch)}catch(e){return Promise.reject(e)}if(value)return Promise.resolve(value);if(pending)return pending;const e=++epoch;controller=new AbortController();const signal=controller.signal;const onabort=()=>controller?.abort();options.signal?.addEventListener('abort',onabort,{once:true});const job=queue.catch(()=>{}).then(async()=>{let v;try{check(e);v=await fullFactory({...options,signal});check(e);value=v;return v;}catch(error){v?.dispose();throw error;}finally{options.signal?.removeEventListener('abort',onabort);if(e===epoch)pending=null;}});queue=job;pending=job;return job;}
 return Object.freeze({...support,get pinsVerified(){return !dead&&!!value?.pinsVerified},get allDeclaredBytesVerified(){return !dead&&!!value?.pinsVerified},verificationScope:'ORIGINAL_PROVIDER_FULL_CLOSURE',get supportPinsVerified(){return !dead&&support.supportPinsVerified},get presentationPinsVerified(){return !dead&&!!value?.pinsVerified},get presentationReady(){return !dead&&!!value},ensurePresentation,releasePresentation,draw(...args){check(epoch);if(!value)throw Error('OLD_SCENE_PRESENTATION_NOT_READY');return value.draw(...args)},dispose(){if(dead)return;dead=true;releasePresentation();support.dispose()}});
}
export const prepareLazyPrologue=o=>lazy(preparePrologueSupport,preparePrologue,o??{});
export const prepareLazyForest=o=>lazy(prepareForestSupport,preparePrologueForest,o??{});
export const prepareLazyCoast=o=>lazy(prepareCoastSupport,preparePrologueCoast,o??{});
export const prepareLazyGym5=o=>lazy(prepareGym5Support,prepareGym5,o??{});
