// ═══════════════════════════════════════════════════════════
// map.js — Leaflet + OpenStreetMap + Nominatim Geocoding
// ═══════════════════════════════════════════════════════════

let _detailMap = null;
let _adminMiniMap = null;
let _adminMiniMarker = null;

function loadLeaflet(callback){
  if(window.L){ callback(); return; }
  if(!document.getElementById('leaflet-css')){
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = callback;
  script.onerror = ()=>{ console.error('Leaflet боргирӣ нашуд.'); };
  document.head.appendChild(script);
}

// ── Харитаи саҳифаи муфассал ──
function renderDetailMap(lat, lng, title){
  const el = document.getElementById('detailMap');
  if(!el) return;
  if(!lat || !lng){ el.style.display='none'; return; }
  loadLeaflet(()=>{
    if(_detailMap){ _detailMap.remove(); _detailMap = null; }
    el.style.height = '320px';
    _detailMap = L.map('detailMap').setView([parseFloat(lat), parseFloat(lng)], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(_detailMap);
    const icon = L.divIcon({
      html: `<div style="background:linear-gradient(135deg,#C9A84C,#E8C96A);width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
      className: '', iconSize:[36,36], iconAnchor:[18,36], popupAnchor:[0,-36]
    });
    L.marker([parseFloat(lat), parseFloat(lng)], {icon})
      .addTo(_detailMap)
      .bindPopup(`<b>${title||'Объект'}</b>`)
      .openPopup();
  });
}

// ── Харитаи admin бо поиск ──
function initAdminMiniMap(onPick, initLat, initLng){
  const el = document.getElementById('miniMap');
  if(!el) return;

  // Поиск UI-ро илова кун
  if(!document.getElementById('mapSearchBox')){
    const searchWrap = document.createElement('div');
    searchWrap.id = 'mapSearchBox';
    searchWrap.style.cssText = `
      display:flex; gap:8px; margin-bottom:8px;
    `;
    searchWrap.innerHTML = `
      <input 
        id="mapSearchInput" 
        type="text" 
        placeholder="🔍 Масалан: кӯчаи Рӯдакӣ 25, Душанбе"
        style="
          flex:1; padding:10px 14px; border-radius:8px;
          border:1px solid var(--border,#2a3f5f);
          background:var(--input-bg,#0d1e35); color:var(--text,#e8e8e8);
          font-size:0.85rem; outline:none;
        "
        onkeydown="if(event.key==='Enter') searchAddress()"
      />
      <button 
        onclick="searchAddress()" 
        style="
          padding:10px 18px; border-radius:8px; border:none; cursor:pointer;
          background:linear-gradient(135deg,#C9A84C,#E8C96A);
          color:#0A1628; font-weight:600; font-size:0.85rem; white-space:nowrap;
        "
      >Ёб кун</button>
    `;
    el.parentNode.insertBefore(searchWrap, el);

    // Натиҷаҳои поиск
    const resultsList = document.createElement('div');
    resultsList.id = 'searchResults';
    resultsList.style.cssText = `
      display:none; position:absolute; z-index:9999;
      background:var(--card-bg,#0d1e35); border:1px solid var(--border,#2a3f5f);
      border-radius:8px; max-height:200px; overflow-y:auto;
      box-shadow:0 8px 24px rgba(0,0,0,0.4); min-width:300px;
    `;
    searchWrap.style.position = 'relative';
    searchWrap.appendChild(resultsList);
  }

  loadLeaflet(()=>{
    if(_adminMiniMap){ _adminMiniMap.remove(); _adminMiniMap = null; _adminMiniMarker = null; }

    el.style.height = '260px';
    el.style.borderRadius = '10px';
    el.style.overflow = 'hidden';

    const center = (initLat && initLng)
      ? [parseFloat(initLat), parseFloat(initLng)]
      : [38.5598, 68.7870];

    _adminMiniMap = L.map('miniMap').setView(center, initLat ? 14 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(_adminMiniMap);

    if(initLat && initLng){
      _adminMiniMarker = L.marker(center, {draggable:true}).addTo(_adminMiniMap);
      _adminMiniMarker.on('dragend', e=>{
        const p = e.target.getLatLng();
        onPick(p.lat, p.lng);
      });
    }

    _adminMiniMap.on('click', e=>{
      const {lat, lng} = e.latlng;
      if(_adminMiniMarker) _adminMiniMarker.setLatLng(e.latlng);
      else {
        _adminMiniMarker = L.marker(e.latlng, {draggable:true}).addTo(_adminMiniMap);
        _adminMiniMarker.on('dragend', ev=>{
          const p = ev.target.getLatLng();
          onPick(p.lat, p.lng);
        });
      }
      onPick(lat, lng);
    });

    // onPick-ро global сохт то searchAddress дастрас кунад
    window._mapOnPick = onPick;
  });
}

// ── Nominatim поиск ──
let _searchTimeout = null;

async function searchAddress(){
  const query = document.getElementById('mapSearchInput')?.value?.trim();
  if(!query) return;

  const btn = document.querySelector('#mapSearchBox button');
  if(btn){ btn.textContent = '⏳'; btn.disabled = true; }

  try {
    // Душанбе, Тоҷикистон — viewbox барои дақиқтар натиҷа
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query + ', Душанбе, Тоҷикистон')}&` +
      `format=json&limit=5&countrycodes=tj&` +
      `viewbox=68.5,38.4,69.1,38.8&bounded=0`;

    const res = await fetch(url, {
      headers: { 'Accept-Language': 'tg,ru,en' }
    });
    const data = await res.json();

    showSearchResults(data);
  } catch(err) {
    console.error('Поиск хатогӣ:', err);
    showToast('Поиск кор накард. Интернетро санҷед.');
  } finally {
    if(btn){ btn.textContent = 'Ёб кун'; btn.disabled = false; }
  }
}

function showSearchResults(results){
  const box = document.getElementById('searchResults');
  if(!box) return;

  if(!results || results.length === 0){
    box.style.display = 'block';
    box.innerHTML = `<div style="padding:12px 16px;color:var(--text-dim,#8a9bb0);font-size:0.83rem;">Ёфт нашуд. Дигар навис кун.</div>`;
    return;
  }

  box.style.display = 'block';
  box.innerHTML = results.map((r, i) => `
    <div 
      onclick="selectSearchResult(${r.lat}, ${r.lon}, '${escSR(r.display_name)}')"
      style="
        padding:10px 16px; cursor:pointer; font-size:0.82rem;
        color:var(--text,#e8e8e8); border-bottom:1px solid var(--border,#1e3a5f);
        transition:background 0.15s;
      "
      onmouseover="this.style.background='rgba(201,168,76,0.12)'"
      onmouseout="this.style.background=''"
    >
      📍 ${r.display_name}
    </div>
  `).join('');

  // Берун клик кунад — пӯш
  setTimeout(()=>{
    document.addEventListener('click', function closeResults(e){
      if(!e.target.closest('#mapSearchBox')){
        box.style.display = 'none';
        document.removeEventListener('click', closeResults);
      }
    });
  }, 100);
}

function escSR(str){
  return (str||'').replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 80);
}

function selectSearchResult(lat, lng, name){
  const box = document.getElementById('searchResults');
  if(box) box.style.display = 'none';

  const input = document.getElementById('mapSearchInput');
  if(input) input.value = name.slice(0, 60);

  if(!_adminMiniMap) return;

  const pos = [parseFloat(lat), parseFloat(lng)];
  _adminMiniMap.setView(pos, 16);

  if(_adminMiniMarker) _adminMiniMarker.setLatLng(pos);
  else {
    _adminMiniMarker = L.marker(pos, {draggable:true}).addTo(_adminMiniMap);
    _adminMiniMarker.on('dragend', e=>{
      const p = e.target.getLatLng();
      if(window._mapOnPick) window._mapOnPick(p.lat, p.lng);
    });
  }

  if(window._mapOnPick) window._mapOnPick(parseFloat(lat), parseFloat(lng));
}