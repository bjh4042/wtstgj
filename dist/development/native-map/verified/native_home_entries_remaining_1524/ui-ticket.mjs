/** UI-only stale completion guard; never changes scene or gameplay state. */
export function createUITicket(){let epoch=0;return {begin:()=>++epoch,invalidate:()=>++epoch,isCurrent:token=>token===epoch}}
