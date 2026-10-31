// Preserve exact old pose identities on old support; new identity only on new ground.
export function composeS1JourneySupport(old,extra){
 const safe=f=>old.safe(f)||extra.safe(f);
 const describe=(f,d)=>old.safe(f)?old.describe(f,d):extra.describe(f,d);
 const validate=n=>{const d=n&&Object.getOwnPropertyDescriptor(n,'foot');if(!d?.enumerable||!Object.hasOwn(d,'value'))return false;return old.safe(d.value)?old.validate(n)===true:extra.validate(n)===true};
 return Object.freeze({get supportPinsVerified(){return old.supportPinsVerified&&extra.supportPinsVerified},safe,describe,validate});
}
