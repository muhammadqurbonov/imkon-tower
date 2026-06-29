// ═══════════════════════════════════════════════════════════
// IMKON TOWER — app.js
// Ҳамаи маълумот аз Firebase Firestore хонда мешавад
// ═══════════════════════════════════════════════════════════

let properties = [];           // ҳамаи объектҳо аз Firestore
let currentFilter = 'all';
let compareList = [];
let sortMode = 'default';
let activeSearch = { type:'', district:'', pmin:0, pmax:0, rooms:0, area:0 };
let unsubscribeProperties = null;

// ── FORMAT HELPERS ──
function fmt(n){ return Number(n||0).toLocaleString('ru-RU'); }
function formatPrice(n, t){
  const som = Number(n||0);
  if(t==='rent') return `${fmt(som)} сом`;
  if(som >= 1000000) return `${(som/1000000).toFixed(2)} млн сом`;
  return `${fmt(som)} сом`;
}
function parsePriceToSom(val){
  return parseFloat(String(val).replace(/\s/g,'')) || 0;
}
function v(id){ const e=document.getElementById(id); return e? e.value.trim() : ''; }
function emojiFor(kind){
  const map={'Квартира':'🏢','Ҳавлӣ, Дача':'🏠','Котлаван':'🏡','Офис':'🏬','Студия':'🏢'};
  return map[kind]||'🏠';
}

// ── THEME ──
function toggleTheme(){
  const d=document.documentElement;
  const isLight=d.getAttribute('data-theme')==='light';
  d.setAttribute('data-theme',isLight?'':'light');
  localStorage.setItem('it-theme', isLight?'dark':'light');
  const btn=document.getElementById('themeBtn');
  if(btn) btn.textContent = isLight?'🌙':'☀️';
}
(function initTheme(){
  const saved = localStorage.getItem('it-theme');
  if(saved==='light') document.documentElement.setAttribute('data-theme','light');
})();

// ── FIRESTORE: LOAD PROPERTIES (real-time) ──
function listenProperties(callback){
  if(unsubscribeProperties) unsubscribeProperties();
  unsubscribeProperties = db.collection('properties')
    .orderBy('createdAt','desc')
    .onSnapshot(snap=>{
      properties = snap.docs.map(doc=>({ id: doc.id, ...doc.data() }));
      callback && callback(properties);
    }, err=>{
      console.error('Firestore хатогӣ:', err);
      showToast('Хатогӣ дар пайвастшавӣ ба база. Конфиги Firebase-ро санҷед.');
      callback && callback([]);
    });
}

// ── SEARCH ──
function applySearch(){
  activeSearch = {
    type: v('sf-type'),
    district: v('sf-district'),
    pmin: parseFloat(v('sf-pmin'))||0,
    pmax: parseFloat(v('sf-pmax'))||0,
    rooms: parseInt(v('sf-rooms'))||0,
    area: parseFloat(v('sf-area'))||0
  };
  renderCards(currentFilter);
  document.getElementById('listings')?.scrollIntoView({behavior:'smooth'});
}
function resetSearch(){
  ['sf-type','sf-district'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  const r=document.getElementById('sf-rooms'); if(r) r.value='0';
  ['sf-pmin','sf-pmax','sf-area'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  activeSearch={type:'',district:'',pmin:0,pmax:0,rooms:0,area:0};
  renderCards(currentFilter);
}
function applyFilters(list){
  return list.filter(p=>{
    if(activeSearch.type && p.type!==activeSearch.type) return false;
    if(activeSearch.district && p.district!==activeSearch.district) return false;
    if(activeSearch.pmin>0 && p.price<activeSearch.pmin) return false;
    if(activeSearch.pmax>0 && p.price>activeSearch.pmax) return false;
    if(activeSearch.rooms>0 && p.rooms<activeSearch.rooms) return false;
    if(activeSearch.area>0 && p.area<activeSearch.area) return false;
    return true;
  });
}

// ── SORT ──
function sortCards(mode){ sortMode=mode; renderCards(currentFilter); }
function applySort(list){
  const l=[...list];
  if(sortMode==='price-asc') l.sort((a,b)=>a.price-b.price);
  else if(sortMode==='price-desc') l.sort((a,b)=>b.price-a.price);
  else if(sortMode==='area-desc') l.sort((a,b)=>b.area-a.area);
  else if(sortMode==='views-desc') l.sort((a,b)=>(b.views||0)-(a.views||0));
  else if(sortMode==='newest') l.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  return l;
}

// ── SKELETON ──
function showSkeleton(targetId='listingsGrid', count=6){
  const grid=document.getElementById(targetId);
  if(!grid) return;
  grid.innerHTML=Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton sk-img"></div>
      <div class="sk-body">
        <div class="skeleton sk-line" style="height:18px;width:80%;"></div>
        <div class="skeleton sk-line" style="height:13px;width:50%;"></div>
        <div class="skeleton sk-line" style="height:13px;width:65%;margin-top:10px;"></div>
      </div>
    </div>`).join('');
}

// ── PROPERTY CARD (modern real-estate style) ──
function mediaThumb(p){
  if(p.media && p.media.length>0){
    const f=p.media[0];
    return f.type==='video'
      ? `<video src="${f.url}" muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
      : `<img src="${f.url}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`;
  }
  return `<div class="card-media-placeholder">${p.emoji||'🏠'}</div>`;
}
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function isNewListing(p){
  if(!p.createdAt) return false;
  const ts = p.createdAt.seconds ? p.createdAt.seconds*1000 : p.createdAt;
  return (Date.now()-ts) < (7*24*60*60*1000); // 7 рӯзи охир
}

function propertyCardHTML(p){
  const mc = p.media && p.media.length>1 ? `<span class="media-count">📷 ${p.media.length}</span>` : '';
  const vipBadge = p.vip ? `<span class="badge-vip">⭐ VIP</span>` : `<span class="card-badge ${p.type==='rent'?'badge-rent':''}">${p.type==='sell'?'Фурӯш':'Иҷора'}</span>`;
  const newRibbon = (!p.vip && isNewListing(p)) ? `<span class="ribbon-new">Нав</span>` : '';
  return `
    <a class="property-card ${p.vip?'vip':''}" href="property.html?id=${p.id}">
      <div class="card-media">
        ${mediaThumb(p)}
        ${vipBadge}
        ${newRibbon}
        ${mc}
        <span class="view-count">👁 ${p.views||0}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="card-location">📍 ${escapeHtml(p.district)}</div>
        <div class="card-specs">
          <span class="spec">🛏 ${p.rooms} хона</span>
          <span class="spec">📐 ${p.area} м²</span>
          <span class="spec">🏗 ${escapeHtml(p.floor||'—')} ...</span>
        </div>
        <div class="card-footer">
          <div class="card-price">${formatPrice(p.price,p.type)}<small>${p.type==='rent'?'дар моҳ':'нарх'}</small></div>
          <span class="card-cta">Муфассал</span>
        </div>
      </div>
    </a>`;
}

// ── RENDER MAIN GRID ──
function renderCards(filter){
  currentFilter = filter;
  showSkeleton('listingsGrid');
  setTimeout(()=>{
    let list = filter==='all' ? [...properties]
      : filter==='new' ? properties.filter(isNewListing)
      : properties.filter(p=>p.type===filter);
    list = applyFilters(list);
    list = applySort(list);
    const countEl=document.getElementById('resultsCount');
    if(countEl) countEl.textContent = list.length+' объект';
    const grid=document.getElementById('listingsGrid');
    if(!grid) return;
    if(!list.length){
      grid.innerHTML='<p style="color:var(--text-dim);text-align:center;grid-column:1/-1;padding:48px 0;font-size:0.9rem;">Объект ёфт нашуд. Ҷустуҷӯро тағйир диҳед.</p>';
      return;
    }
    grid.innerHTML = list.map(propertyCardHTML).join('');
  },300);
}

function filterCards(f,btn){
  currentFilter=f;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderCards(f);
}

// ── VIP / FEATURED RENDER ──
function renderVipSection(){
  const wrap=document.getElementById('vipGrid');
  if(!wrap) return;
  const vips = properties.filter(p=>p.vip);
  const section=document.getElementById('vipSection');
  if(!vips.length){
    if(section) section.style.display='none';
    return;
  }
  if(section) section.style.display='block';
  wrap.innerHTML = vips.slice(0,6).map(propertyCardHTML).join('');
}

// ── NEW LISTINGS RENDER ──
function renderNewSection(){
  const wrap=document.getElementById('newGrid');
  if(!wrap) return;
  const news=[...properties].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,6);
  wrap.innerHTML = news.length
    ? news.map(propertyCardHTML).join('')
    : '<p style="color:var(--text-dim);font-size:0.88rem;">Ҳоло объекти нав нест.</p>';
}

// ── COMPARE ──
function toggleCompare(id){
  if(compareList.includes(id)){
    compareList = compareList.filter(x=>x!==id);
  } else {
    if(compareList.length>=3){ showToast('Ҳадди аксар 3 объект мукоиса мешавад'); return; }
    compareList.push(id);
  }
  updateCompareBar();
}
function updateCompareBar(){
  const bar=document.getElementById('compareBar');
  const items=document.getElementById('compareItems');
  if(!bar||!items) return;
  if(compareList.length===0){ bar.classList.remove('visible'); return; }
  bar.classList.add('visible');
  items.innerHTML = compareList.map(id=>{
    const p=properties.find(x=>x.id===id);
    return `<div class="compare-item">${p?escapeHtml(p.name).substring(0,25)+'...':'?'} <button onclick="toggleCompare('${id}')">×</button></div>`;
  }).join('');
}
function clearCompare(){ compareList=[]; updateCompareBar(); }
function openCompare(){
  if(compareList.length<2){ showToast('Ҳадди ақал 2 объект интихоб кунед'); return; }
  const ps=compareList.map(id=>properties.find(x=>x.id===id)).filter(Boolean);
  const fields=[
    {label:'Ном',key:p=>p.name},
    {label:'Намуд',key:p=>p.type==='sell'?'Фурӯш':'Иҷора'},
    {label:'Ноҳия',key:p=>p.district},
    {label:'Нарх',key:p=>formatPrice(p.price,p.type)},
    {label:'Майдон',key:p=>p.area+' м²'},
    {label:'Хонаҳо',key:p=>p.rooms+' хона'},
    {label:'Ошёна',key:p=>p.floor||'—'},
  ];
  let html=`<table class="compare-table"><thead><tr><th>Параметр</th>${ps.map(p=>`<th>${p.emoji||'🏠'} ${escapeHtml(p.name).substring(0,20)}</th>`).join('')}</tr></thead><tbody>`;
  fields.forEach(f=>{ html+=`<tr><td class="row-label">${f.label}</td>${ps.map(p=>`<td>${f.key(p)}</td>`).join('')}</tr>`; });
  html+=`</tbody></table>`;
  const wrap=document.getElementById('compareTableWrap');
  if(wrap) wrap.innerHTML=html;
  openModal('compareModal');
}

// ── MORTGAGE CALCULATOR (бе ягон маҳдудияти нархи дастӣ) ──
let downPct = 20;
function setDown(pct, custom){
  downPct = custom!==undefined ? custom : pct;
  document.querySelectorAll('.down-btn').forEach(b=>b.classList.remove('active'));
  if(pct===20) document.getElementById('dp20')?.classList.add('active');
  if(pct===30) document.getElementById('dp30')?.classList.add('active');
  const pctInput=document.getElementById('mortDownPct');
  if(pctInput) pctInput.value = downPct;
  calcMortgage();
}
function onDownPctInput(){
  const val = parseFloat(v('mortDownPct'))||0;
  downPct = Math.max(0, Math.min(100, val));
  document.querySelectorAll('.down-btn').forEach(b=>b.classList.remove('active'));
  calcMortgage();
}
function getMortCurrency(){ return 'som'; }
function onMortPriceInput(){
  const input = document.getElementById('mortPrice');
  let val = parseFloat(input.value.replace(/\s/g,''))||0;
  if(val<0) val=0;
  const el = document.getElementById('mortPriceVal');
  if(el) el.textContent = fmt(val)+' сом';
  calcMortgage();
}
function getRate(){ return 21; }
function calcMortgage(){
  const priceInput = document.getElementById('mortPrice');
  const price = parsePriceToSom(priceInput.value);
  const months = parseInt(document.getElementById('mortTerm').value)||60;
  const rate = 21;
  const down = price*(downPct/100);
  const loan = price-down;
  const r = rate/100/12;
  const monthly = loan>0 ? loan*(r*Math.pow(1+r,months))/(Math.pow(1+r,months)-1) : 0;
  const totalPay = monthly*months;
  const totalInt = totalPay-loan;

  const el = document.getElementById('mortPriceVal');
  if(el) el.textContent = fmt(price)+' сом';

  const tLabel = months<12 ? months+' моҳ' : months===12 ? '1 сол' : (months/12)%1===0 ? (months/12)+' сол' : (months/12).toFixed(1)+' сол';
  const termEl = document.getElementById('mortTermVal');
  if(termEl) termEl.textContent = tLabel;

  const rateFillEl = document.getElementById('rateFill');
  if(rateFillEl) rateFillEl.style.width = '100%';
  const rateLabelEl = document.getElementById('currentRateLabel');
  if(rateLabelEl) rateLabelEl.textContent = '21%';

  const fmtSom = (n) => `${fmt(Math.round(n))} сом`;
  const rPriceEl = document.getElementById('rPrice');
  if(rPriceEl) rPriceEl.textContent = fmtSom(price);
  const rDownEl = document.getElementById('rDown');
  if(rDownEl) rDownEl.textContent = fmtSom(down)+` (${downPct}%)`;
  const rLoanEl = document.getElementById('rLoan');
  if(rLoanEl) rLoanEl.textContent = fmtSom(loan);
  const rRateEl = document.getElementById('rRate');
  if(rRateEl) rRateEl.textContent = '21% солона (доимӣ)';
  const rTermEl = document.getElementById('rTerm');
  if(rTermEl) rTermEl.textContent = tLabel;
  const rMonthlyEl = document.getElementById('rMonthly');
  if(rMonthlyEl) rMonthlyEl.textContent = fmtSom(monthly);
  const rTotalIntEl = document.getElementById('rTotalInterest');
  if(rTotalIntEl) rTotalIntEl.textContent = fmtSom(totalInt);
  const rTotalEl = document.getElementById('rTotal');
  if(rTotalEl) rTotalEl.textContent = fmtSom(totalPay);
}
function openMortgageContact(){
  const price = parsePriceToSom(document.getElementById('mortPrice').value);
  const months = parseInt(document.getElementById('mortTerm').value)||60;
  const down = price*(downPct/100);
  const loan = price-down;
  const r = 21/100/12;
  const monthly = loan>0 ? Math.round(loan*(r*Math.pow(1+r,months))/(Math.pow(1+r,months)-1)) : 0;
  const tLabel = months<12 ? months+' моҳ' : (months/12).toFixed(1)+' сол';
  document.getElementById('mortContactInfo').innerHTML =
    `Маълумоти ҳисоби шумо:<br/>
     💰 Нарх: ${fmt(price)} сом · Пешпардохт: ${downPct}%<br/>
     📅 Муддат: ${tLabel} · Фоиз: <strong style="color:var(--gold)">21%</strong> (доимӣ)<br/>
     💳 Пардохти моҳона: <strong style="color:var(--gold)">${fmt(monthly)} сом</strong>`;
  openModal('mortContactModal');
}
function sendMortContact(ch){
  const n=v('mc-name'), ph=v('mc-phone');
  if(!n||!ph){ showToast('Ном ва телефонро ворид кунед!'); return; }
  const price = parsePriceToSom(document.getElementById('mortPrice').value);
  const months = parseInt(document.getElementById('mortTerm').value)||60;
  const down = price*(downPct/100);
  const loan = price-down;
  const r = 21/100/12;
  const monthly = loan>0 ? Math.round(loan*(r*Math.pow(1+r,months))/(Math.pow(1+r,months)-1)) : 0;
  const tLabel = months<12 ? months+' моҳ' : (months/12).toFixed(1)+' сол';
  const msg = `📊 Маслиҳати Ипотека\n👤 ${n}\n📞 ${ph}\n💰 Нарх: ${fmt(price)} сом\n⬇️ Пешпардохт: ${downPct}% (${fmt(Math.round(down))} сом)\n📅 Муддат: ${tLabel}\n📈 Фоиз: 21% (доимӣ)\n💳 Моҳона: ${fmt(monthly)} сом`;
  if(ch==='wa') openWA(msg); else openTG(msg);
  closeModal('mortContactModal');
  showToast('Хуб! Мо ба зудӣ тамос мегирем ✓');
}

// ── WHATSAPP / TELEGRAM HELPERS ──
function openWA(msg){ window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank'); }
function openTG(msg){ window.open(`https://t.me/${CONTACT.telegram}?text=${encodeURIComponent(msg)}`,'_blank'); }

function buildMsg(label,n,ph,a,k,pr,m){ return `${label}\n👤 ${n||'—'}\n📞 ${ph||'—'}\n📍 ${a||'—'}\n🏠 ${k||'—'}\n💰 ${pr||'—'}\n📝 ${m||'—'}`; }
function sendModalToWA(pfx,label){
  const n=v(pfx+'-name'),ph=v(pfx+'-phone'),a=v(pfx+'-addr'),k=v(pfx+'-kind'),pr=v(pfx+'-price'),m=v(pfx+'-msg');
  if(!n||!ph){ showToast('Ном ва телефонро ворид кунед!'); return; }
  openWA(buildMsg('📢 Эълон: '+label,n,ph,a,k,pr+' сом',m));
  closeModal(pfx==='sm'?'sellModal':'rentOutModal');
  showToast('WhatsApp кушода шуд ✓');
}
function sendModalToTG(pfx,label){
  const n=v(pfx+'-name'),ph=v(pfx+'-phone'),a=v(pfx+'-addr'),k=v(pfx+'-kind'),pr=v(pfx+'-price'),m=v(pfx+'-msg');
  if(!n||!ph){ showToast('Ном ва телефонро ворид кунед!'); return; }
  openTG(buildMsg('📢 Эълон: '+label,n,ph,a,k,pr+' сом',m));
  closeModal(pfx==='sm'?'sellModal':'rentOutModal');
  showToast('Telegram кушода шуд ✓');
}
function sendToWA(pfx){
  const n=v(pfx+'-name'),ph=v(pfx+'-phone'),tp=v(pfx+'-type'),m=v(pfx+'-msg');
  if(!n||!ph){ showToast('Ном ва телефонро ворид кунед!'); return; }
  openWA('📢 Дархост\n👤 '+n+'\n📞 '+ph+'\n🏠 '+tp+'\n📝 '+m);
  showToast('WhatsApp кушода шуд ✓');
}
function sendToTG(pfx){
  const n=v(pfx+'-name'),ph=v(pfx+'-phone'),tp=v(pfx+'-type'),m=v(pfx+'-msg');
  if(!n||!ph){ showToast('Ном ва телефонро ворид кунед!'); return; }
  openTG('📢 Дархост\n👤 '+n+'\n📞 '+ph+'\n🏠 '+tp+'\n📝 '+m);
  showToast('Telegram кушода шуд ✓');
}

// ── MODALS ──
function openModal(id){ document.getElementById(id)?.classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id){ document.getElementById(id)?.classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.modal-overlay').forEach(m=>{ m.addEventListener('click',e=>{ if(e.target===m) closeModal(m.id); }); });
});

// ── TOAST ──
function showToast(msg){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── PARTICLES (hero background) ──
function initParticles(){
  const c=document.getElementById('particles');
  if(!c) return;
  const ctx=c.getContext('2d');
  let W,H,pts;
  function resize(){ W=c.width=c.offsetWidth; H=c.height=c.offsetHeight; }
  function init(){ resize(); pts=Array.from({length:55},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.4+0.3,dx:(Math.random()-0.5)*0.26,dy:-Math.random()*0.36-0.08,o:Math.random()*0.44+0.09})); }
  function draw(){
    ctx.clearRect(0,0,W,H);
    pts.forEach(p=>{
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(201,168,76,${p.o})`;ctx.fill();
      p.x+=p.dx;p.y+=p.dy;
      if(p.y<-5){p.y=H+5;p.x=Math.random()*W;}
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  init();draw();
}

// ── PWA INSTALL ──
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e;
  setTimeout(()=>{ const el=document.getElementById('pwaInstall'); if(el) el.style.display='block'; },3000);
});
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('pwaInstallBtn')?.addEventListener('click',()=>{
    if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.then(()=>{ deferredPrompt=null; document.getElementById('pwaInstall').style.display='none'; }); }
  });
});

// ── PAGE LOADER ──
function hidePageLoader(){
  const l=document.getElementById('pageLoader');
  if(l){ l.classList.add('hide'); setTimeout(()=>l.remove(),400); }
}