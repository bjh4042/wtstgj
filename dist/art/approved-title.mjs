/** Selected original masters. Presentation-only; no replacement of save or title controls. */
export const APPROVED_TITLE=Object.freeze({
 'title.desktop':Object.freeze({src:'assets/approved-title/desktop.png',width:1728,height:960}),
 'title.mobile':Object.freeze({src:'assets/approved-title/mobile.png',width:390,height:844}),
 'title.logo':Object.freeze({src:'assets/approved-title/logo.svg',width:640,height:140})
});
export function approvedTitleMarkup(){
 const desktop=APPROVED_TITLE['title.desktop'],mobile=APPROVED_TITLE['title.mobile'],logo=APPROVED_TITLE['title.logo'];
 return `<picture><source media="(orientation: portrait)" srcset="${mobile.src}"><img src="${desktop.src}" alt="거제 해변의 생태몬"></picture><span class="start-prompt">눌러서 시작 · Enter / Z</span><span class="title-logo"><img src="${logo.src}" alt="생태몬스터:거제도"></span>`;
}
