/* Folifly, editor a oggetti: il disegno. Dal documento all'HTML della pagina, in mm e pt.
   Lo stesso HTML serve allo schermo (scalato), ai JPG e ai PSD (SVG con foreignObject) e al PDF vettoriale (Chrome sul server).
   Funzione pura: nessun accesso alla pagina. Ogni testo è scappato; colori, sfumature, ombre e ritagli passano da Doc.STILE_OK. */
(function (g) {
'use strict';
const Doc = g.Doc;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = v => { const x = Math.round((+v || 0) * 1000) / 1000; return String(Object.is(x, -0) ? 0 : x); };
const FAMIGLIE = { Inter: "'Inter',system-ui,sans-serif", Anton: "'Anton','Impact',sans-serif", 'Barlow Condensed': "'Barlow Condensed','Arial Narrow',sans-serif",
  Oswald: "'Oswald','Impact',sans-serif", 'Bricolage Grotesque': "'Bricolage Grotesque','Inter',sans-serif" };
function famiglia(f) { return f === 'fd' ? 'var(--fd)' : f === 'fb' || !f ? 'var(--fb)' : (FAMIGLIE[f] || 'var(--fb)'); }
function testoHTML(s) { return esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
function prezzoHTML(v) { const t = (+v).toFixed(2).split('.'); return `<span class="pr"><b>${t[0]}<sup>,${t[1]}</sup></b><i>€</i></span>`; }
const SRC_OK = /^(?:data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+|(?:\/|\.\/)?[\w\-./]+\.(?:png|jpe?g|webp|svg)(?:\?[\w=&.-]*)?)$/;
function sorgente(src, ctx) {
  if (typeof src !== 'string' || src.includes('..') || !SRC_OK.test(src)) return '';
  const u = ctx && ctx.asset ? ctx.asset(src) : src;
  return typeof u === 'string' && (u.startsWith('data:') || SRC_OK.test(u) || /^blob:/.test(u)) ? u : '';
}
const ok = (re, v) => typeof v === 'string' && re.test(v.trim()) ? v.trim() : '';
const NOIMG = '<svg class="noimg" viewBox="0 0 100 120" role="img" aria-label="Immagine mancante"><rect x="14" y="14" width="72" height="92" rx="10" fill="none" stroke="#9a9a8c" stroke-width="2" stroke-dasharray="5 4"/><text x="50" y="60" text-anchor="middle" font-size="9" fill="#7a7a6c" font-family="Inter,sans-serif">immagine</text><text x="50" y="72" text-anchor="middle" font-size="9" fill="#7a7a6c" font-family="Inter,sans-serif">mancante</text></svg>';

function riempimento(f, tema) {
  if (typeof f !== 'string' || !f) return '';
  if (/^linear-gradient\(/i.test(f)) return ok(Doc.STILE_OK.sfumatura, f);
  return Doc.colore(f, tema);
}
function ritaglio(c) { return c === 'tema' ? 'var(--clip)' : ok(Doc.STILE_OK.ritaglio, c); }
function posizione(o, ox, oy) {
  let s = `left:${n(o.x - ox)}mm;top:${n(o.y - oy)}mm;width:${n(o.w)}mm;height:${n(o.h)}mm`;
  if (o.r) s += `;transform:rotate(${n(o.r)}deg)`;
  if (o.op != null && o.op < 1) s += `;opacity:${n(Math.max(0, o.op))}`;
  return s;
}
const ALLINEA = { left: 'flex-start', center: 'center', right: 'flex-end' };
const VERT = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
function stileTesto(o, tema) {
  const col = Doc.colore(o.col || 'ink', tema) || Doc.colore('ink', tema) || '#111111';
  let s = `font-family:${famiglia(o.font)};font-weight:${o.peso ? +o.peso : (o.font === 'fd' ? 'var(--fw,400)' : 400)};font-size:${n(o.pt || 10)}pt;line-height:${n(o.lh || 1.1)};color:${col};text-align:${['left', 'center', 'right'].includes(o.alin) ? o.alin : 'left'}`;
  if (o.ls) s += `;letter-spacing:${n(o.ls)}em`;
  if (o.up) s += ';text-transform:uppercase';
  if (o.ital) s += ';font-style:italic';
  if (o.barr) s += ';text-decoration:line-through;text-decoration-thickness:.12em';
  const sh = ok(Doc.STILE_OK.ombra, o.ombra); if (sh) s += `;text-shadow:${sh}`;
  if (o.pesoB) s += `;--pb:${+o.pesoB}`;
  if (o.nowrap) s += ';white-space:nowrap' + (o.bind ? ';overflow:hidden;text-overflow:ellipsis' : '');
  if (o.max) s += `;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${Math.max(1, Math.round(o.max))};overflow:hidden`;
  return s;
}
function contenitore(o, tema) {
  // il riquadro: riempimento, bordo, angoli, ritaglio, spazio interno, allineamento verticale
  let s = `;justify-content:${VERT[o.v] || 'flex-start'}`;
  const f = riempimento(o.fill, tema); if (f) s += `;background:${f}`;
  if (o.bordo && o.bordo.w > 0) { const c = Doc.colore(o.bordo.col || 'line', tema); if (c) s += `;border:${n(o.bordo.w)}mm solid ${c}`; }
  if (o.raggio) s += `;border-radius:${n(o.raggio)}mm`;
  const cp = ritaglio(o.clip); if (cp) s += `;clip-path:${cp}`;
  if (o.pad) { const p = Array.isArray(o.pad) ? o.pad : [o.pad, o.pad]; s += ';padding:' + p.slice(0, 4).map(v => n(v) + 'mm').join(' '); }
  return s;
}

function oggetto(o, ctx, opz, ox, oy) {
  opz = opz || {}; ox = ox || 0; oy = oy || 0;
  if (!o || o.nasc) return '';
  const tema = (ctx && ctx.tema) || {}, ed = !!opz.editor;
  const id = ed ? ` data-id="${esc(o.id)}"` : '';
  const v = o.bind ? Doc.valore(o.bind, ctx) : null;
  if (v && v.assente) return '';
  const pos = posizione(o, ox, oy);
  const vuoto = (html, cls) => ed ? `<div class="fo t-${o.t} vuoto${cls || ''}"${id} style="${pos}"></div>` : html;
  switch (o.t) {
    case 'gruppo': {
      const dentro = (o.figli || []).map(f => oggetto(f, ctx, opz, o.x, o.y)).join('');
      return `<div class="fo t-gruppo"${id} style="${pos}">${dentro}</div>`;
    }
    case 'testo': {
      const s = v ? (v.vuoto ? '' : v.testo) : (o.s || '');
      if (!s) return vuoto('');
      return `<div class="fo t-testo"${id} style="${pos}${contenitore(o, tema)}"><div class="tx" style="${stileTesto(o, tema)}">${testoHTML(s)}</div></div>`;
    }
    case 'prezzo': {
      if (!v || v.vuoto) return vuoto('');
      const col = Doc.colore(o.col || 'pr', tema) || '#C00000';
      return `<div class="fo t-prezzo"${id} style="${pos};align-items:${ALLINEA[o.alin] || 'flex-start'}${contenitore(o, tema)}"><div style="font-family:${famiglia(o.font || 'fd')};font-size:${n(o.pt || 30)}pt;color:${col};display:flex">${prezzoHTML(v.num)}</div></div>`;
    }
    case 'sconto': {
      const s = v ? (v.vuoto ? '' : v.testo) : (o.s || '');
      if (!s) return vuoto('');
      const f = riempimento(o.fill || 'ac', tema), col = Doc.colore(o.col || 'acink', tema), cp = ritaglio(o.clip || 'tema');
      return `<div class="fo t-sconto"${id} style="${pos};${f ? 'background:' + f + ';' : ''}${cp ? 'clip-path:' + cp + ';' : ''}color:${col};font-family:${famiglia(o.font || 'fd')};font-weight:${o.peso ? +o.peso : 'var(--fw,400)'};font-size:${n(o.pt || 12)}pt;line-height:${n(o.lh || 0.95)}${o.up ? ';text-transform:uppercase' : ''}">${testoHTML(s)}</div>`;
    }
    case 'immagine': {
      const src = v ? (v.vuoto ? '' : sorgente(v.src, ctx)) : sorgente(o.src, ctx);
      if (!src) {
        if (o.bind && o.bind.f === 'foto') return `<div class="fo t-immagine"${id} style="${pos}">${NOIMG}</div>`;
        return vuoto('');
      }
      const fit = ['contain', 'cover', 'fill'].includes(o.fit) ? o.fit : (o.bind && o.bind.f === 'foto' ? 'contain' : 'cover');
      const posi = typeof o.posi === 'string' && /^[a-z0-9.%\s]{1,30}$/i.test(o.posi) ? o.posi : 'center';
      const fl = typeof o.filtro === 'string' && /^drop-shadow\(/.test(o.filtro) ? ok(Doc.STILE_OK.ombra, o.filtro) : '';
      return `<div class="fo t-immagine"${id} style="${pos}${contenitore(o, tema)}"><img src="${esc(src)}" alt="${esc(o.nome || '')}" style="object-fit:${fit};object-position:${posi}${fl ? ';filter:' + fl : ''}"></div>`;
    }
    case 'forma':
      return `<div class="fo t-forma"${id} style="${pos}${contenitore(o, tema)}"></div>`;
    default: return '';
  }
}

function variabili(t) {
  const v = ['c1', 'c2', 'ac', 'acink', 'pr', 'paper', 'ink', 'mute', 'line'].map(k => Doc.colore(t[k], t) ? `--${k}:${t[k]}` : '').filter(Boolean);
  if (t.fd && /^[\w\s',-]+$/.test(t.fd)) v.push(`--fd:${t.fd}`);
  if (t.fw) v.push(`--fw:${+t.fw || 400}`);
  const cp = ok(Doc.STILE_OK.ritaglio, t.clip); if (cp) v.push(`--clip:${cp}`);
  return v.join(';');
}
function pagina(pg, formato, ctx, opz) {
  opz = opz || {};
  const b = opz.vista ? 0 : (opz.abbondanza || 0), t = (ctx && ctx.tema) || {};
  const fondo = opz.trasparente ? 'transparent' : (riempimento(pg.fondo || 'paper', t) || '#FFFFFF');
  // finestra: solo un riquadro della pagina (un livello del PSD), con l'origine spostata nel suo angolo
  const V = opz.vista, W = V ? V.w : formato.w + 2 * b, H = V ? V.h : formato.h + 2 * b, ox = V ? -V.x : b, oy = V ? -V.y : b;
  // carattere proprio dell'insegna: la regola @font-face è fatta dal nostro codice (F.carattereProprio) con un indirizzo già controllato
  const face = typeof t.face === 'string' && /^@font-face\{font-family:'[\w-]+';src:url\('\/f\/\d+\/[0-9a-f]{32}\.(?:woff2|woff|ttf|otf)'\);font-display:block\}$/.test(t.face) ? `<style>${t.face}</style>` : '';
  // abbondanza per la tipografia: si allungano fondi e foto di sfondo che toccano il bordo, su una copia (il documento resta com'è)
  let lista = pg.oggetti || [];
  if (b > 0) { const c = Doc.clona({ oggetti: lista }); Doc.abbondanza(c, formato, b); lista = c.oggetti; }
  const dentro = lista.map(o => oggetto(o, ctx, opz)).join('');
  return `<div class="fpg"${opz.editor ? ` data-pg="${esc(pg.id)}"` : ''} style="width:${n(W)}mm;height:${n(H)}mm;background:${fondo};${variabili(t)}">${face}<div class="fin" style="left:${n(ox)}mm;top:${n(oy)}mm">${dentro}</div></div>`;
}

g.Disegno = { pagina, oggetto, prezzoHTML, testoHTML, esc, sorgente, FAMIGLIE };
})(typeof window !== 'undefined' ? window : globalThis);
