// ═══════════════════════════════════════════════════════════
// common.js — Унсурҳои умумӣ барои ҳамаи саҳифаҳо
// (тугмаи WhatsApp шинокунанда, toast, page-loader, тугмаи install)
// Ин файл бояд ПЕШ аз </body> бо innerHTML тазриқ карда шавад
// ═══════════════════════════════════════════════════════════

function injectCommonWidgets(){
  // Тугмаи шинокунандаи WhatsApp
  if(!document.getElementById('waFloatBtn')){
    const wa = document.createElement('a');
    wa.id = 'waFloatBtn';
    wa.className = 'wa-float';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent('Салом! Ман дар бораи хонаҳои шумо маълумот мехоҳам.')}`;
    wa.innerHTML = `
      <span class="wa-tooltip">Бо мо дар WhatsApp сӯҳбат кунед</span>
      <svg viewBox="0 0 32 32"><path d="M16.04 3C9.36 3 3.96 8.4 3.96 15.08c0 2.4.65 4.64 1.78 6.58L4 29l7.55-1.98a12.04 12.04 0 0 0 4.49.87h.01c6.68 0 12.08-5.4 12.08-12.08C28.13 8.4 22.72 3 16.04 3zm0 21.92h-.01a9.84 9.84 0 0 1-5.02-1.38l-.36-.21-3.74.98 1-3.64-.24-.37a9.86 9.86 0 0 1-1.51-5.22c0-5.45 4.43-9.88 9.89-9.88 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.46-4.44 9.88-9.9 9.88zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.93 8.93 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.15-.15.34-.39.5-.59.17-.2.22-.34.34-.57.12-.22.06-.4-.04-.55-.1-.15-.6-1.45-.82-1.99-.22-.52-.44-.45-.6-.46h-.52c-.17 0-.45.07-.69.32-.24.27-.92.9-.92 2.18 0 1.28.94 2.52 1.07 2.7.13.17 1.83 2.8 4.46 3.83 2.63 1.03 2.63.68 3.1.64.47-.04 1.52-.6 1.73-1.18.21-.58.21-1.08.15-1.18-.06-.1-.24-.16-.54-.31z"/></svg>`;
    document.body.appendChild(wa);
  }
  // Toast
  if(!document.getElementById('toast')){
    const t=document.createElement('div'); t.id='toast'; document.body.appendChild(t);
  }
  // PWA install bubble
  if(!document.getElementById('pwaInstall')){
    const p=document.createElement('div'); p.id='pwaInstall';
    p.innerHTML = `
      <button class="pwa-close" onclick="document.getElementById('pwaInstall').style.display='none'">×</button>
      <h4>📱 Ба телефон насб кун</h4>
      <p>Imkon Tower-ро монанди App истифода кун — интернетсоз!</p>
      <div class="pwa-btns">
        <button class="btn-gold" style="font-size:0.8rem;padding:7px 14px;" id="pwaInstallBtn">Насб кун</button>
        <button class="btn-outline" style="font-size:0.8rem;padding:7px 12px;" onclick="document.getElementById('pwaInstall').style.display='none'">Баъд</button>
      </div>`;
    document.body.appendChild(p);
  }
}
document.addEventListener('DOMContentLoaded', injectCommonWidgets);
