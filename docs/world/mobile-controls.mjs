// Load mobile-controls.css after the existing presentation skins.

/** CSS pixels only: the renderer's authored 960×540 bitmap is never resized. */
export function fitCanonicalField({width, height, top = 0, dockHeight = 0, gap = 12}) {
 const availableWidth = Math.max(0, width);
 const availableHeight = Math.max(0, height - Math.max(0, top) - dockHeight - gap);
 const scale = Math.max(0, Math.min(availableWidth / 960, availableHeight / 540));
 return {width: 960 * scale, height: 540 * scale};
}

/** Add presentation only; retain the original buttons, focus and input handlers. */
export function installCanonicalMobileControls(root) {
 const win = root.ownerDocument.defaultView;
 const dock = root.querySelector('.world-touch');
 const canvas = root.querySelector('[data-w="field"]');
 const battlePanel = root.querySelector('[data-w="battle-panel"]');
 if (!dock || !canvas) return {update() {}, destroy() {}};
 const media = win.matchMedia('(max-width: 900px), (any-pointer: coarse)');
 const viewport = win.visualViewport;
 const properties = ['--mobile-vv-top', '--mobile-vv-left', '--mobile-vv-width', '--mobile-vv-height', '--mobile-dock-height', '--mobile-field-width', '--mobile-field-height'];
 const previous = properties.map(name => [name, root.style.getPropertyValue(name)]);
 const oldLabel = dock.getAttribute('aria-label');
 const oldRole = dock.getAttribute('role');
 dock.setAttribute('role', 'group');
 dock.setAttribute('aria-label', '이동 및 행동 조작');
 let destroyed = false;
 let frame = 0;
 const set = (name, value) => {
  const next = `${Math.round(value * 100) / 100}px`;
  if (root.style.getPropertyValue(name) !== next) root.style.setProperty(name, next);
 };
 function update() {
  if (destroyed) return;
  root.classList.toggle('mobile-controls-active', media.matches);
  if (!media.matches) return;
  const height = viewport?.height ?? win.innerHeight;
  const width = viewport?.width ?? win.innerWidth;
  const top = viewport?.offsetTop ?? 0;
  set('--mobile-vv-top', top);
  set('--mobile-vv-left', viewport?.offsetLeft ?? 0);
  set('--mobile-vv-width', width);
  set('--mobile-vv-height', height);
  const dockHeight = dock.getBoundingClientRect().height;
  set('--mobile-dock-height', dockHeight);
  const play = canvas.parentElement;
  const style = win.getComputedStyle(play);
  const contentWidth = play.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0');
  const fitted = fitCanonicalField({width: Math.min(width, contentWidth), height, top: canvas.getBoundingClientRect().top - top, dockHeight});
  set('--mobile-field-width', fitted.width);
  set('--mobile-field-height', fitted.height);
 }
 function schedule() {
  if (!destroyed && !frame) frame = win.requestAnimationFrame(() => {frame = 0; update();});
 }
 win.addEventListener('resize', schedule);
 win.addEventListener('scroll', schedule, {passive: true});
 win.addEventListener('orientationchange', schedule);
 viewport?.addEventListener('resize', schedule);
 viewport?.addEventListener('scroll', schedule);
 media.addEventListener('change', schedule);
 const observer = win.ResizeObserver ? new win.ResizeObserver(schedule) : null;
 observer?.observe(dock);
 observer?.observe(canvas.parentElement);
 const mutations = win.MutationObserver && battlePanel ? new win.MutationObserver(schedule) : null;
 mutations?.observe(battlePanel, {attributes: true, attributeFilter: ['hidden']});
 update();
 return {
  update,
  destroy() {
   if (destroyed) return;
   destroyed = true;
   win.cancelAnimationFrame(frame);
   observer?.disconnect();
   mutations?.disconnect();
   win.removeEventListener('resize', schedule);
   win.removeEventListener('scroll', schedule);
   win.removeEventListener('orientationchange', schedule);
   viewport?.removeEventListener('resize', schedule);
   viewport?.removeEventListener('scroll', schedule);
   media.removeEventListener('change', schedule);
   root.classList.remove('mobile-controls-active');
   for (const [name, value] of previous) value ? root.style.setProperty(name, value) : root.style.removeProperty(name);
   for (const [name, value] of [['aria-label', oldLabel], ['role', oldRole]]) value === null ? dock.removeAttribute(name) : dock.setAttribute(name, value);
  }
 };
}
