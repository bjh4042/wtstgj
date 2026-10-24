/** QA-only: never call real ServiceWorker.register or offer installation. */
export function isolatePreviewPWA(win){
 const nav=win.navigator;
 const own=Object.getOwnPropertyDescriptor(nav,'serviceWorker');
 if(own&&!own.configurable)throw Error('검수 PWA 격리 불가');
 const disabled=Object.freeze({register:async()=>Object.freeze({scope:'QA_DISABLED_NO_REGISTRATION'})});
 Object.defineProperty(nav,'serviceWorker',{value:disabled,configurable:true});
 if(nav.serviceWorker!==disabled)throw Error('검수 PWA 격리 실패');
 win.addEventListener('beforeinstallprompt',event=>{event.preventDefault();event.stopImmediatePropagation()},{capture:true});
 return disabled;
}
