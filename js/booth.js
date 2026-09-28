const opener = document.querySelector('#menu-booth');
const dialog = document.createElement('dialog');
dialog.id = 'booth-dialog';
dialog.className = 'booth-dialog';
dialog.setAttribute('aria-labelledby', 'booth-title');
dialog.innerHTML = `<header class="booth-header"><div><h2 id="booth-title">Booth</h2><p>October 1–2 · Garden</p></div><button type="button" class="booth-close" aria-label="Close booth guide">Close ×</button></header><div class="booth-layout"><p role="status">Loading the booth guide…</p></div>`;
document.body.append(dialog);
let loaded = false;
opener.addEventListener('click', async () => {
  dialog.showModal();
  if (loaded) return;
  try {
    const response = await fetch('data/booths.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('Booth data unavailable');
    const data = await response.json();
    build(data);
    loaded = true;
  } catch {
    dialog.querySelector('.booth-layout').textContent = 'The booth guide could not load. Close and reopen to try again.';
  }
});
dialog.querySelector('.booth-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => opener.focus());
dialog.addEventListener('click', e => {
  const r = dialog.getBoundingClientRect();
  if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close();
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}
function logos(booth) {
  const box = el('span','booth-logo-box');
  for (const path of booth.logos) {
    const img = el('img'); img.src = path; img.alt = `${booth.name} logo`; img.loading='lazy'; box.append(img);
  }
  if (!booth.logos.length) box.append(el('span','booth-logo-pending','Logo pending'));
  return box;
}
function build(data) {
  const layout = dialog.querySelector('.booth-layout'); layout.replaceChildren();
  const mapPanel = el('section','booth-map-panel'); mapPanel.setAttribute('aria-label','Booth map');
  const viewport = el('div','booth-map-viewport'); viewport.tabIndex=0; viewport.setAttribute('aria-label','Booth map. Scroll to move; use the zoom buttons to enlarge.');
  const canvas = el('div','booth-map-canvas');
  // Schematic traced from the supplied plan; Canva booth labels take precedence.
  canvas.innerHTML = `<svg viewBox="0 0 1000 540" aria-label="Garden, deck and Ballroom A–B entrance" role="img">
    <path d="M55 355 L30 246 L65 170 L140 200 L305 90 L700 90 L815 42 L850 128 L940 145 L980 355 Z" fill="#fff" stroke="#1f296a" stroke-width="2"/>
    <path d="M155 325 L195 205 L335 125 L565 125 L670 166 L666 325 Z" fill="#e8f2e8" stroke="#1f296a" stroke-width="2"/>
    <path d="M65 187 L128 212 L78 310 L48 248 Z" fill="#e8f2e8" stroke="#1f296a" stroke-width="2"/>
    <path d="M720 130 L735 82 L815 42 L850 113 L850 130 Z" fill="#f3f5fa" stroke="#1f296a" stroke-width="2"/>
    <path d="M730 105 L838 137 M733 93 L843 124" fill="none" stroke="#1f296a"/>
    <rect x="270" y="355" width="640" height="70" fill="#f5f3eb" stroke="#1f296a" stroke-width="2"/>
    <path d="M270 425 H980 V500 H270 Z" fill="#f3f5fa" stroke="#1f296a" stroke-width="2"/>
    <path d="M900 425 L944 382" stroke="#0069a0" stroke-width="3"/>
    <path d="M900 382 Q944 382 944 425" stroke="#0069a0" fill="none" stroke-dasharray="4 4"/>
    <text x="370" y="225">Garden</text><text x="737" y="170">Stage</text>
    <text x="550" y="347" text-anchor="middle">Walkway</text>
    <text x="900" y="463" text-anchor="end">Ballroom A–B</text>
    <text x="921" y="372" text-anchor="middle" style="fill:#0069a0;font-weight:700">Door</text>
  </svg>`;
  viewport.append(canvas);
  const tools = el('div','booth-map-tools');
  let base = 1000, zoom = 1;
  function resize(scale, center) {
    const oldWidth = canvas.getBoundingClientRect().width;
    const px = center?.x ?? viewport.clientWidth/2, py = center?.y ?? viewport.clientHeight/2;
    const cx=(viewport.scrollLeft+px)/oldWidth, cy=(viewport.scrollTop+py)/oldWidth;
    zoom=Math.max(.35,Math.min(2.5,scale));
    canvas.style.width=`${base*zoom}px`;
    const width=canvas.getBoundingClientRect().width;
    canvas.style.setProperty('--booth-map-font', `${Math.max(8, Math.min(22, width*.018))}px`);
    viewport.scrollLeft=cx*width-px; viewport.scrollTop=cy*width-py;
  }
  for (const [label, action] of [['−',()=>resize(zoom/1.25)],['+',()=>resize(zoom*1.25)],['Fit map',()=>{resize(viewport.clientWidth/base);viewport.scrollTo(0,0);}]]) {
    const button=el('button','',label);button.type='button';button.setAttribute('aria-label',label==='+'?'Zoom in':label==='−'?'Zoom out':label);button.addEventListener('click',action);tools.append(button);
  }
  let pinch=null;
  const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  viewport.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch={distance:distance(e.touches),zoom};}}, {passive:true});
  viewport.addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){e.preventDefault();const r=viewport.getBoundingClientRect();resize(pinch.zoom*distance(e.touches)/pinch.distance,{x:(e.touches[0].clientX+e.touches[1].clientX)/2-r.left,y:(e.touches[0].clientY+e.touches[1].clientY)/2-r.top});}}, {passive:false});
  viewport.addEventListener('touchend',()=>{pinch=null;});
  mapPanel.append(viewport,tools,el('p','booth-map-note','Enter from Ballroom A–B. Select a booth number or logo.'));
  const side=el('section','booth-sidebar');side.setAttribute('aria-label','Exhibitors');
  const detail=el('div','booth-detail');detail.id='booth-detail';detail.tabIndex=-1;
  const list=el('div','booth-list');
  const status=el('p','sr-only');status.setAttribute('role','status');
  function select(booth, fromMap) {
    for(const button of layout.querySelectorAll('[data-booth]')) button.setAttribute('aria-pressed',String(Number(button.dataset.booth)===booth.number));
    detail.replaceChildren(logos(booth),el('h3','',`${booth.number}. ${booth.name}`));
    if (booth.description) detail.append(el('p','',booth.description));
    const links=el('div','booth-detail-links');
    for(const item of booth.links){const a=el('a','',item.label);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    if(!booth.links.length) links.append(el('p','booth-review-note','Official website pending review.'));
    detail.append(links);
    status.textContent=`Booth ${booth.number}, ${booth.name}, selected.`;
    if(fromMap){detail.scrollIntoView({block:'nearest',behavior:'instant'});detail.focus({preventScroll:true});}
    else {
      const pin=canvas.querySelector(`[data-booth="${booth.number}"]`);
      viewport.scrollTo({left:pin.offsetLeft-viewport.clientWidth/2,top:pin.offsetTop-viewport.clientHeight/2,behavior:'instant'});
      if(matchMedia('(max-width:760px)').matches) mapPanel.scrollIntoView({block:'start',behavior:'instant'});
      else side.scrollTop=0;
    }
  }
  for(const booth of data.booths) {
    const pin=el('button','booth-pin',String(booth.number));pin.type='button';pin.style.left=`${booth.x/10}%`;pin.style.top=`${booth.y/5.4}%`;
    pin.dataset.booth=booth.number;pin.setAttribute('aria-label',`Booth ${booth.number}: ${booth.name}`);pin.setAttribute('aria-pressed','false');pin.setAttribute('aria-controls','booth-detail');pin.addEventListener('click',()=>select(booth,true));canvas.append(pin);
    const tile=el('button','booth-tile');tile.type='button';tile.dataset.booth=booth.number;tile.setAttribute('aria-label',`Select booth ${booth.number}: ${booth.name}`);tile.setAttribute('aria-pressed','false');tile.setAttribute('aria-controls','booth-detail');
    tile.append(el('span','booth-tile-number',String(booth.number)),logos(booth),el('span','booth-tile-name',booth.name));tile.addEventListener('click',()=>select(booth,false));list.append(tile);
  }
  side.append(detail,list);layout.append(mapPanel,side,status);
  dialog.querySelector('.booth-header p').textContent=`${data.dates} · Garden`;
  requestAnimationFrame(()=>{resize(matchMedia('(max-width:760px)').matches ? .9 : viewport.clientWidth/base);viewport.scrollLeft=viewport.scrollWidth-viewport.clientWidth;viewport.scrollTop=viewport.scrollHeight-viewport.clientHeight;});
}
