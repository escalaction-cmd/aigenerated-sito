/* Folifly, editor a oggetti: il documento del volantino. Solo dati e regole, nessun accesso alla pagina (si prova con Node).
   Un volantino ha uno o più formati; ogni formato ha le sue pagine; ogni pagina è un elenco di oggetti in mm, dal basso verso l'alto.
   Vedi studio/06_editor_a_oggetti.md. */
(function (g) {
'use strict';
const V = 1;
const FORMATI = {
  a4: { nome: 'A4', w: 210, h: 297, carta: true },
  a5: { nome: 'A5', w: 148, h: 210, carta: true },
  a6: { nome: 'A6', w: 105, h: 148, carta: true },
  a3: { nome: 'A3', w: 297, h: 420, carta: true },
  dl: { nome: 'DL', w: 99, h: 210, carta: true },
  post45: { nome: 'Post 4:5', w: 216, h: 270, px: [1440, 1800] },
  post11: { nome: 'Post quadrato', w: 216, h: 216, px: [1080, 1080] },
  storia916: { nome: 'Storia 9:16', w: 162, h: 288, px: [1080, 1920] },
  libero: { nome: 'Misura libera', w: 210, h: 297, carta: true, libero: true }
};
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const UNI = { kg: 'al kg', l: 'al litro', pz: 'al pezzo' };
const TOK = ['c1', 'c2', 'ac', 'acink', 'pr', 'paper', 'ink', 'mute', 'line'];
const eur = n => n.toFixed(2).replace('.', ',');
const clona = x => JSON.parse(JSON.stringify(x));

function nuovo(fid) {
  const id = FORMATI[fid] ? fid : 'a4', f = FORMATI[id];
  return { v: V, formati: [{ id, w: f.w, h: f.h, pagine: [] }] };
}
let conta = 0;
function nid(pref) {
  let r = ''; for (let i = 0; i < 5; i++) r += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
  return (pref || 'k') + r + (++conta).toString(36);
}

/* ---------- visite ---------- */
function ogni(pagina, fn) {
  const giro = (lista, padre) => (lista || []).forEach(o => { fn(o, padre); if (o.t === 'gruppo') giro(o.figli, o); });
  giro(pagina.oggetti, null);
}
function trova(doc, id) {
  for (const f of doc.formati || []) for (const p of f.pagine || []) {
    let r = null; ogni(p, (o, padre) => { if (!r && o.id === id) r = { o, pagina: p, padre, formato: f }; });
    if (r) return r;
  }
  return null;
}
function bbox(lista) {
  if (!lista || !lista.length) return { x: 0, y: 0, w: 0, h: 0 };
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  lista.forEach(o => { a = Math.min(a, o.x); b = Math.min(b, o.y); c = Math.max(c, o.x + o.w); d = Math.max(d, o.y + o.h); });
  return { x: a, y: b, w: c - a, h: d - b };
}

/* ---------- valori dai dati ---------- */
function pd(s) { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim()); return m ? [+m[1], +m[2], +m[3]] : null; }
const dt = a => new Date(a[2], a[1] - 1, a[0]);
function periodo(dal, al) {
  const a = pd(dal), b = pd(al); if (!a || !b) return '';
  return a[1] === b[1] ? `Dal ${a[0]} al ${b[0]} ${MESI[b[1] - 1]} ${b[2]}` : `Dal ${a[0]} ${MESI[a[1] - 1]} al ${b[0]} ${MESI[b[1] - 1]} ${b[2]}`;
}
function breve(dal, al) {
  const a = pd(dal), b = pd(al); if (!a || !b) return '';
  return a[1] === b[1] ? `${a[0]} - ${b[0]} ${MESI[b[1] - 1]}` : `${a[0]} ${MESI[a[1] - 1].slice(0, 3)} - ${b[0]} ${MESI[b[1] - 1].slice(0, 3)}`;
}
const fmtD = d => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
/* date di un gruppo di offerte (zone): le più ampie; se il negozio ha date sue valgono quelle */
function dateDi(ids, ctx) {
  if (ctx.dateFisse || !Array.isArray(ids)) return [ctx.dal, ctx.al];
  const os = ids.map(i => ctx.off[i]).filter(o => o && !o.removed && !o.hidden);
  const a = os.map(o => pd(o.dal)).filter(Boolean).map(dt), b = os.map(o => pd(o.al)).filter(Boolean).map(dt);
  return [a.length ? fmtD(new Date(Math.min(...a))) : ctx.dal, b.length ? fmtD(new Date(Math.max(...b))) : ctx.al];
}
const giorni = o => { const a = pd(o.dal), b = pd(o.al); return a && b ? Math.round((dt(b) - dt(a)) / 864e5) + 1 : 0; };
const prior = o => (o.full && o.full > o.promo) ? o.full : null;
const VUOTO = { vuoto: true };
function valore(bind, ctx) {
  if (!bind || !ctx) return VUOTO;
  const f = bind.f;
  if (typeof bind.o === 'string') {
    const o = ctx.off && ctx.off[bind.o];
    if (!o || o.removed || o.hidden) return { vuoto: true, assente: true };
    const t = s => s ? { testo: String(s), vuoto: false } : VUOTO;
    switch (f) {
      case 'prezzo': return isFinite(o.promo) && o.promo > 0 ? { num: o.promo, vuoto: false } : VUOTO;
      case 'barrato': { const p = prior(o); return p ? t(eur(p)) : VUOTO; }
      case 'unitario': return o.qta && isFinite(o.promo) ? t(`${eur(o.promo / o.qta)} € ${UNI[o.unita] || UNI.kg}`) : VUOTO;
      case 'sconto': { const p = prior(o); return p ? t(`-${Math.round((p - o.promo) / p * 100)}%`) : VUOTO; }
      case 'nome': return t(o.title);
      case 'marca': return t(o.brand);
      case 'formato': return t(o.fmt);
      case 'marca_formato': return t([o.brand, o.fmt].filter(Boolean).join(' · '));
      case 'nome_formato': return t([o.title, o.fmt].filter(Boolean).join(', '));
      case 'reparto': return t(o.dept);
      case 'foto': return o.img ? { src: o.img, vuoto: false } : VUOTO;
      case 'sottocosto': return t(`**${(o.pezzi || 0).toLocaleString('it-IT')}** pezzi disponibili\nMassimo **${o.limite || 0}** pezzi a persona`);
      default: return VUOTO;
    }
  }
  const t = s => s ? { testo: String(s), vuoto: false } : VUOTO;
  switch (f) {
    case 'periodo': { const d = dateDi(bind.o, ctx); return t(periodo(d[0], d[1])); }
    case 'breve': return t(breve(ctx.dal, ctx.al));
    case 'breve_durata': {
      const os = (bind.o || []).map(i => ctx.off[i]).filter(o => o && !o.removed && !o.hidden), n = Math.max(0, ...os.map(giorni));
      return t(`${breve(ctx.dal, ctx.al)}\n${n || 7} giorni, massimo 10`);
    }
    case 'legale': return t((bind.pre || '') + (ctx.legale || ''));
    case 'piede': return t(`${ctx.negozio ? 'Negozio ' + ctx.negozio.id + ' ' + ctx.negozio.name : (ctx.web || '')} · pag. ${ctx.nPagina}`);
    case 'insegna': return t(ctx.insegna);
    case 'web': return t(ctx.web);
    case 'tipo': return t(ctx.tipo);
    case 'logo': return ctx.logo ? { src: ctx.logo, vuoto: false } : VUOTO;
    case 'sconto_max': {
      const m = Math.max(0, ...Object.values(ctx.off || {}).filter(o => !o.removed && !o.hidden).map(o => { const p = prior(o); return p ? Math.round((p - o.promo) / p * 100) : 0; }));
      return m ? t(`fino al\n-${m}%`) : VUOTO;
    }
    default: return VUOTO;
  }
}
/* un prezzo scritto a mano in un testo libero sfugge ai controlli: si avvisa */
function prezzoNelTesto(s) {
  const x = String(s || '');
  return /\d+(?:[.,]\d{1,2})?\s*(?:€|eur\b|euro\b)/i.test(x) || /(?:€|\beur\b|\beuro\b)\s*\d/i.test(x);
}

/* ---------- stile: solo valori sicuri ---------- */
const STILE_OK = {
  colore: /^(?:#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|transparent|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/,
  sfumatura: /^(?![^]*(?:url|expression|var)\b)linear-gradient\([0-9a-z.,%()#\s-]{3,600}\)$/i,
  ombra: /^(?![^]*(?:url|expression|var)\b)[0-9a-z.,%()#\s-]{1,300}$/i,
  ritaglio: /^(?![^]*(?:url|expression|var)\b)(?:polygon|circle|ellipse|inset)\([0-9a-z.,%\s-]{1,800}\)$/i
};
function colore(c, tema) {
  if (typeof c !== 'string') return '';
  if (TOK.includes(c)) return (tema && tema[c]) || '';
  return STILE_OK.colore.test(c.trim()) ? c.trim() : '';
}

/* ---------- abbondanza: fondi e foto di sfondo che toccano il bordo escono di 3 mm ---------- */
function abbondanza(pagina, formato, mm) {
  const b = mm == null ? 3 : mm, W = formato.w, H = formato.h, tol = 0.6;
  ogni(pagina, o => {
    if (o.r) return;
    if (!(o.t === 'forma' || (o.t === 'immagine' && o.fit !== 'contain' && !(o.bind && o.bind.f === 'foto')))) return;
    if (o.x <= tol) { o.w += o.x + b; o.x = -b; }
    if (o.y <= tol) { o.h += o.y + b; o.y = -b; }
    if (o.x + o.w >= W - tol) o.w = W + b - o.x;
    if (o.y + o.h >= H - tol) o.h = H + b - o.y;
  });
}

/* ---------- lucchetti predefiniti per i negozi ---------- */
const BLOCCATI = ['logo', 'insegna', 'legale', 'piede', 'periodo', 'breve', 'breve_durata', 'web', 'tipo'];
function lockPredefinito(o) {
  if (o.bind && typeof o.bind.o !== 'string' && BLOCCATI.includes(o.bind.f)) return true;
  return ['testata', 'piede', 'fondo'].includes(o.ruolo);
}

/* ---------- prodotti impaginati e vaschetta ---------- */
/* fi: solo un formato (la vaschetta del formato aperto); senza, tutti */
function offerteImpaginate(doc, fi) {
  const s = new Set();
  (doc.formati || []).forEach((f, i) => { if (fi != null && i !== fi) return; (f.pagine || []).forEach(p => ogni(p, o => { if (!o.nasc && o.bind && typeof o.bind.o === 'string') s.add(o.bind.o); })); });
  return s;
}
function vaschetta(doc, offerte, fi) {
  const s = offerteImpaginate(doc, fi);
  return (offerte || []).filter(o => !o.removed && !o.hidden && !s.has(o.id)).map(o => o.id);
}

/* ---------- scheda prodotto fatta dal programma (vaschetta, formati nuovi) ----------
   Misure in mm con un'unità u legata alla scheda; i corpi in pt = mm × 2,835. */
function scheda(id, box, variante) {
  const { x, y, w, h } = box, PT = 2.8346, r3 = v => Math.round(v * 1000) / 1000;
  const b = (f, extra) => ({ id: nid(), bind: { o: id, f }, ...extra });
  const T = (f, nome, X, Y, W, size, extra) => b(f, { t: 'testo', nome, x: r3(X), y: r3(Y), w: r3(W), h: r3(size * (extra.lh || 1.15) * (extra.max || 1)), font: 'fb', pt: r3(size * PT), lh: 1.15, ...extra });
  const figli = [{ id: nid(), t: 'forma', nome: 'Fondo della scheda', ruolo: 'scheda', x, y, w, h, fill: '#FFFFFF', bordo: { w: 0.4, col: 'line' } }];
  if (variante === 'orizzontale') {
    // u dallo spazio vero: le righe (marca, nome su 2 righe, formato, prezzo, prezzo al kg) stanno in altezza, una parola lunga del nome in larghezza
    const pad = Math.max(1.2, h * 0.07), fw = Math.min(w * 0.4, h - 2 * pad), tx = x + pad + fw + pad * 0.8, tw = x + w - pad - tx;
    const u = Math.min((h - 2 * pad) / 6.4, tw / 7.4);
    figli.push(b('foto', { t: 'immagine', nome: 'Foto', x: r3(x + pad), y: r3(y + pad), w: r3(fw), h: r3(h - 2 * pad), fit: 'contain' }));
    let cy = y + pad;
    figli.push(T('marca', 'Marca', tx, cy, tw, 0.55 * u, { peso: 700, col: 'mute', nowrap: true })); cy += 0.55 * u * 1.15 + 0.25 * u;
    figli.push(T('nome', 'Nome', tx, cy, tw, 0.8 * u, { peso: 800, col: 'ink', up: true, max: 2, lh: 1.08 })); cy += 0.8 * u * 1.08 * 2 + 0.2 * u;
    figli.push(T('formato', 'Formato', tx, cy, tw, 0.6 * u, { peso: 500, col: 'mute', nowrap: true }));
    const ps = 2 * u, ph = ps * 0.85, py = y + h - pad - ph - 0.75 * u;
    figli.push(b('prezzo', { t: 'prezzo', nome: 'Prezzo', x: r3(tx), y: r3(py), w: r3(tw * 0.62), h: r3(ph), font: 'fd', pt: r3(ps * PT), col: 'pr' }));
    figli.push(T('barrato', 'Prezzo barrato', tx + tw * 0.64, py + 0.1 * u, tw * 0.36, 0.62 * u, { peso: 600, col: 'mute', barr: true, nowrap: true }));
    figli.push(T('unitario', 'Prezzo al kg', tx, y + h - pad - 0.55 * u * 1.15, tw, 0.5 * u, { peso: 500, col: 'mute', nowrap: true }));
  } else {
    const pad = Math.max(1.2, w * 0.06), fh = h * 0.44, tw = w - 2 * pad, u = Math.min(w / 8, (h - 2 * pad - fh) / 6, tw / 7.4);
    figli.push(b('foto', { t: 'immagine', nome: 'Foto', x: r3(x + pad), y: r3(y + pad), w: r3(tw), h: r3(fh), fit: 'contain' }));
    let cy = y + pad + fh + 0.45 * u;
    figli.push(T('marca', 'Marca', x + pad, cy, tw, 0.55 * u, { peso: 700, col: 'mute', nowrap: true })); cy += 0.55 * u * 1.15 + 0.2 * u;
    figli.push(T('nome', 'Nome', x + pad, cy, tw, 0.75 * u, { peso: 800, col: 'ink', up: true, max: 2, lh: 1.08 })); cy += 0.75 * u * 1.08 * 2 + 0.15 * u;
    figli.push(T('formato', 'Formato', x + pad, cy, tw, 0.58 * u, { peso: 500, col: 'mute', nowrap: true }));
    const ps = Math.min(2.4 * u, (y + h - pad - (cy + 0.58 * u * 1.15)) / 0.85), ph = ps * 0.85, py = y + h - pad - ph;
    figli.push(b('prezzo', { t: 'prezzo', nome: 'Prezzo', x: r3(x + pad), y: r3(py), w: r3(tw * 0.6), h: r3(ph), font: 'fd', pt: r3(ps * PT), col: 'pr' }));
    figli.push(T('barrato', 'Prezzo barrato', x + pad + tw * 0.62, py, tw * 0.38, 0.62 * u, { peso: 600, col: 'mute', barr: true, nowrap: true, alin: 'right' }));
    figli.push(T('unitario', 'Prezzo al kg', x + pad + tw * 0.62, y + h - pad - 0.5 * u * 1.15, tw * 0.38, 0.5 * u, { peso: 500, col: 'mute', nowrap: true, alin: 'right' }));
  }
  const sz = Math.min(w, h) * 0.22;
  figli.push(b('sconto', { t: 'sconto', nome: 'Bollino dello sconto', x, y, w: r3(sz), h: r3(sz), fill: 'ac', col: 'acink', clip: 'tema', font: 'fd', pt: r3(sz * 0.3 * PT), lh: 0.95 }));
  return { id: nid('g'), t: 'gruppo', nome: 'Prodotto', bind: { o: id }, x, y, w, h, figli };
}

/* ---------- negozi: versione del negozio = documento della sede + modifiche permesse dai lucchetti ---------- */
const NUMERI = { x: [-500, 2000], y: [-500, 2000], w: [0.5, 3000], h: [0.5, 3000], r: [-360, 360], pt: [1, 800], op: [0, 1], lh: [0.5, 3], ls: [-0.5, 2], raggio: [0, 500], peso: [100, 900], max: [1, 20] };
const SCELTE = { alin: ['left', 'center', 'right'], fit: ['contain', 'cover', 'fill'], v: ['top', 'middle', 'bottom'] };
const SI_NO = ['nasc', 'up', 'ital', 'barr', 'nowrap'];
const FAMIGLIE_OK = ['fd', 'fb', 'Inter', 'Anton', 'Barlow Condensed', 'Oswald', 'Bricolage Grotesque'];
const CAMPI_FOGLIA = ['x', 'y', 'w', 'h', 'r', 'nasc', 's', 'col', 'pt', 'fill', 'font', 'peso', 'alin', 'up', 'op', 'fit', 'src', 'lh', 'ls', 'v', 'bordo', 'raggio', 'clip', 'ital', 'barr', 'max', 'nowrap'];
const CAMPI_GRUPPO = ['x', 'y', 'w', 'h', 'nasc'];
const TIPI_NUOVI = ['testo', 'immagine', 'forma'];
/* pezzi della scheda che la legge chiede di mostrare: il negozio li sposta ma non li toglie */
const OBBLIGATORI = ['prezzo', 'barrato', 'unitario', 'sottocosto'];
const obbligatorio = o => !!(o && o.bind && typeof o.bind.o === 'string' && OBBLIGATORI.includes(o.bind.f));
const MAX_NUOVI = 60, MAX_TESTO = 500;
const okFill = v => typeof v === 'string' && (TOK.includes(v) || STILE_OK.colore.test(v) || STILE_OK.sfumatura.test(v));
/* un valore di un campo è accettabile? (le stesse regole le applica il server) */
function valido(k, v) {
  if (k in NUMERI) return typeof v === 'number' && isFinite(v) && v >= NUMERI[k][0] && v <= NUMERI[k][1];
  if (k in SCELTE) return SCELTE[k].includes(v);
  if (SI_NO.includes(k)) return typeof v === 'boolean';
  if (k === 's') return typeof v === 'string';
  if (k === 'col') return typeof v === 'string' && (TOK.includes(v) || STILE_OK.colore.test(v));
  if (k === 'fill') return okFill(v);
  if (k === 'font') return FAMIGLIE_OK.includes(v);
  if (k === 'src') return typeof v === 'string' && v.length <= 300 && !v.includes('..') && /^\/(?:f\/\d+\/[0-9a-f]{32}\.(?:png|jpg|webp)|lavoro\/lib\/[\w.-]+\.(?:png|jpe?g|webp))$/.test(v);
  if (k === 'clip') return v === 'tema' || (typeof v === 'string' && STILE_OK.ritaglio.test(v));
  if (k === 'bordo') return v && typeof v === 'object' && typeof v.w === 'number' && v.w >= 0 && v.w <= 20 && (TOK.includes(v.col) || STILE_OK.colore.test(String(v.col || '')));
  return false;
}
/* un oggetto è bloccato se lo è lui o un gruppo che lo contiene */
function bloccato(doc, id) {
  let r = trova(doc, id); if (!r) return true;
  if (r.o.lock) return true;
  while (r && r.padre) { if (r.padre.lock) return true; r = trova(doc, r.padre.id); }
  return false;
}
const profondita = (doc, id) => { let n = 0, r = trova(doc, id); while (r && r.padre) { n++; r = trova(doc, r.padre.id); } return n; };
function trasforma(o, ox, oy, f, dx, dy) {
  // scala attorno a (ox, oy) e sposta: per i pezzi di una scheda che si sposta o si ingrandisce
  o.x = Math.round((ox + (o.x - ox) * f + dx) * 1000) / 1000; o.y = Math.round((oy + (o.y - oy) * f + dy) * 1000) / 1000;
  o.w = Math.round(o.w * f * 1000) / 1000; o.h = Math.round(o.h * f * 1000) / 1000;
  if (f !== 1) { if (o.pt) o.pt = Math.round(o.pt * f * 1000) / 1000; if (o.bordo && o.bordo.w) o.bordo = { ...o.bordo, w: o.bordo.w * f }; if (o.raggio) o.raggio *= f; }
  if (o.t === 'gruppo') (o.figli || []).forEach(c => trasforma(c, ox, oy, f, dx, dy));
}
function applica(o, campi, locks) {
  if (!campi || typeof campi !== 'object') return false;
  let fatto = false;
  if (o.t === 'gruppo') {
    const x = valido('x', campi.x) ? campi.x : o.x, y = valido('y', campi.y) ? campi.y : o.y, w = valido('w', campi.w) ? campi.w : o.w;
    const f = o.w ? w / o.w : 1;
    if (x !== o.x || y !== o.y || f !== 1) { const ox = o.x, oy = o.y; trasforma(o, ox, oy, f, x - ox, y - oy); o.x = x; o.y = y; fatto = true; }
    if (campi.nasc === true && !(o.bind && typeof o.bind.o === 'string' && locks.posizione)) { o.nasc = true; fatto = true; }
    return fatto;
  }
  CAMPI_FOGLIA.forEach(k => {
    if (!(k in campi) || !valido(k, campi[k])) return;
    if (k === 's' && (o.t !== 'testo' || o.bind)) return;
    if (k === 'src' && (o.t !== 'immagine' || o.bind)) return;
    if (k === 'nasc' && (!campi.nasc || obbligatorio(o))) return;
    o[k] = k === 'bordo' ? { w: campi.bordo.w, col: campi.bordo.col } : k === 's' ? campi.s.slice(0, MAX_TESTO) : campi[k]; fatto = true;
  });
  return fatto;
}
function pulisciNuovo(n) {
  if (!n || typeof n !== 'object' || !TIPI_NUOVI.includes(n.t) || typeof n.id !== 'string' || !/^[a-z][a-z0-9]{1,23}$/.test(n.id)) return null;
  const o = { id: n.id, t: n.t, negozio: true, nome: typeof n.nome === 'string' ? n.nome.slice(0, 60) : (n.t === 'testo' ? 'Testo del negozio' : n.t === 'immagine' ? 'Immagine del negozio' : 'Forma del negozio') };
  for (const k of ['x', 'y', 'w', 'h']) { if (!valido(k, n[k])) return null; o[k] = n[k]; }
  CAMPI_FOGLIA.forEach(k => { if (!(k in o) && k in n && valido(k, n[k])) o[k] = k === 'bordo' ? { w: n.bordo.w, col: n.bordo.col } : k === 's' ? n.s.slice(0, MAX_TESTO) : n[k]; });
  if (o.t === 'immagine' && !o.src) return null;
  return o;
}
function perNegozio(doc, ov, locks) {
  const v = clona(doc); ov = ov || {}; locks = locks || {};
  const obj = ov.obj && typeof ov.obj === 'object' ? ov.obj : {};
  Object.keys(obj).filter(id => trova(v, id) && !bloccato(v, id)).sort((a, b) => profondita(v, a) - profondita(v, b))
    .forEach(id => applica(trova(v, id).o, obj[id], locks));
  const pagine = {}; (v.formati || []).forEach(f => (f.pagine || []).forEach(p => { pagine[p.id] = p; }));
  (Array.isArray(ov.nuovi) ? ov.nuovi : []).slice(0, MAX_NUOVI).forEach(n => { const o = pulisciNuovo(n); if (o && pagine[n.p] && !trova(v, o.id)) pagine[n.p].oggetti.push(o); });
  return v;
}
function modificheNegozio(doc, ov, locks) {
  ov = ov || {}; const obj = ov.obj && typeof ov.obj === 'object' ? ov.obj : {}, v = clona(doc);
  let oggetti = 0, ignorate = 0;
  Object.keys(obj).forEach(id => { const r = trova(v, id); if (r && !bloccato(v, id) && applica(Doc_clona(r.o), obj[id], locks || {})) oggetti++; else ignorate++; });
  const pagine = new Set(); (doc.formati || []).forEach(f => (f.pagine || []).forEach(p => pagine.add(p.id)));
  const nuovi = (Array.isArray(ov.nuovi) ? ov.nuovi : []).slice(0, MAX_NUOVI).filter(n => pulisciNuovo(n) && pagine.has(n.p)).length;
  return { oggetti, ignorate, nuovi };
}
const Doc_clona = clona;
const uguale = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 0.005 : JSON.stringify(a) === JSON.stringify(b);
/* dalle pagine modificate nell'editor del negozio alle sole differenze permesse (il contrario di perNegozio) */
function patch(base, mod, locks) {
  const obj = {}, nuovi = [];
  const diff = (B, M, attesa) => {
    // attesa: come sarebbe B dopo lo spostamento del gruppo che lo contiene
    const A = attesa || B, d = {};
    if (B.t === 'gruppo') {
      CAMPI_GRUPPO.forEach(k => { if (k === 'nasc') { if (M.nasc && !B.nasc) d.nasc = true; return; } if (!uguale(A[k], M[k])) d[k] = M[k]; });
      const f = A.w ? M.w / A.w : 1;
      (B.figli || []).forEach(cB => {
        const cM = (M.figli || []).find(c => c.id === cB.id);
        if (!cM) { if (!cB.lock && !obbligatorio(cB)) obj[cB.id] = { nasc: true }; return; }
        const att = clona(cB); trasforma(att, A.x, A.y, f, M.x - A.x, M.y - A.y);
        if (!cB.lock) diff(cB, cM, att);
      });
    } else {
      CAMPI_FOGLIA.forEach(k => {
        if (k === 's' && (B.t !== 'testo' || B.bind)) return;
        if (k === 'src' && (B.t !== 'immagine' || B.bind)) return;
        if (k === 'nasc') { if (M.nasc && !B.nasc && !obbligatorio(B)) d.nasc = true; return; }
        if (k in M && !uguale(A[k], M[k]) && valido(k, M[k])) d[k] = M[k];
      });
    }
    if (Object.keys(d).length) obj[B.id] = d;
  };
  (base.formati || []).forEach((fB, fi) => (fB.pagine || []).forEach(pB => {
    const fM = (mod.formati || [])[fi], pM = fM && (fM.pagine || []).find(p => p.id === pB.id);
    pB.oggetti.forEach(oB => {
      if (oB.lock) return;
      const oM = pM && pM.oggetti.find(o => o.id === oB.id);
      if (!oM) { obj[oB.id] = { nasc: true }; return; }
      diff(oB, oM);
    });
    if (pM) pM.oggetti.forEach(oM => { if (!trova(base, oM.id) && TIPI_NUOVI.includes(oM.t)) { const n = pulisciNuovo(oM); if (n) nuovi.push({ ...n, p: pB.id }); } });
  }));
  return { obj, nuovi: nuovi.slice(0, MAX_NUOVI) };
}

g.Doc = { V, FORMATI, MESI, TOK, nuovo, nid, ogni, trova, bbox, valore, periodo, breve, prezzoNelTesto, STILE_OK, colore, abbondanza, lockPredefinito,
  offerteImpaginate, vaschetta, scheda, perNegozio, patch, modificheNegozio, bloccato, valido, obbligatorio, clona, eur, MAX_NUOVI, MAX_TESTO };
})(typeof window !== 'undefined' ? window : globalThis);
