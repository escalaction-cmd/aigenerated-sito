/* Dal file di vendite al volantino: riconoscimento delle colonne, offerte, controlli di legge, composizione delle pagine,
   versioni per negozio. Nessun accesso alla pagina: solo dati, così si può provare da riga di comando. */
(function (g) {
'use strict';
const eur = n => isFinite(n) ? n.toFixed(2).replace('.', ',') : 'n.d.';
const norm = s => String(s || '').toLowerCase().trim();
function num(s) {
  if (s == null) return NaN; let t = String(s).replace(/[^\d,.\-]/g, '');
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(',', '.');
  const n = parseFloat(t); return isFinite(n) ? n : NaN;
}
function pd(s) { const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(String(s || '').trim()); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function fd(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
const days = (a, b) => { const x = pd(a), y = pd(b); return x && y ? Math.round((y - x) / 864e5) + 1 : 0; };

/* ---------- campi e colonne ---------- */
const FIELDS = [
  { k: 'codice', l: 'Codice articolo', req: 1, syn: ['cod', 'codice', 'sku', 'ean', 'articolo', 'item', 'id'] },
  { k: 'titolo', l: 'Titolo dell\'offerta', req: 1, syn: ['descr', 'titolo', 'nome', 'prodotto', 'denominazione', 'title', 'name'] },
  { k: 'marca', l: 'Marca', syn: ['marchio', 'marca', 'brand', 'produttore'] },
  { k: 'formato', l: 'Formato', syn: ['formato', 'pezzatura', 'confezione', 'peso', 'size', 'grammatura', 'quantit'] },
  { k: 'prezzo_pieno', l: 'Prezzo pieno', syn: ['listino', 'pieno', 'barrato', 'regolare', 'originale'], chk: ['listino'] },
  { k: 'min30', l: 'Prezzo più basso dei 30 giorni', syn: ['minimo', '30 g', '30gg', '30 giorni', 'lowest'] },
  { k: 'tipo', l: 'Tipo di promozione', syn: ['tipo', 'meccanica', 'promozione'] },
  { k: 'pezzi', l: 'Pezzi disponibili', syn: ['pezzi disp', 'disponibil', 'stock', 'scorta'] },
  { k: 'limite', l: 'Limite per persona', syn: ['limite', 'per persona'] },
  { k: 'prezzo', l: 'Prezzo in offerta', req: 1, syn: ['promo', 'offerta', 'prezzo', 'price', 'sale'] },
  { k: 'reparto', l: 'Reparto', req: 1, syn: ['repart', 'categ', 'settore', 'famiglia', 'department'] },
  { k: 'dal', l: 'Valido dal', syn: ['inizio', 'dal', 'from', 'start'] },
  { k: 'al', l: 'Valido fino al', syn: ['fine', 'al', 'until', 'end', 'scadenza'] },
  { k: 'priorita', l: 'Priorità', syn: ['priori', 'rank', 'spinta'] },
  { k: 'immagine', l: 'Immagine', syn: ['immag', 'foto', 'img', 'image', 'picture'] }
];
function automap(headers) {
  const map = {}, conf = {}, used = new Set();
  FIELDS.forEach(f => {
    map[f.k] = -1; conf[f.k] = 'none';
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue;
      const h = norm(headers[i]);
      const hit = f.syn.find(s => h === s || (s.length >= 4 && h.includes(s)));
      if (hit) { map[f.k] = i; used.add(i); conf[f.k] = (f.chk && f.chk.includes(hit)) ? 'check' : 'ok'; break; }
    }
  });
  return { map, conf };
}

/* ---------- catalogo, formati, quantità ---------- */
const CATMAP = () => Object.fromEntries((g.CATALOGO || []).map(p => [p.id.toUpperCase(), p]));
function resolve(code) {
  const m = CATMAP(); const c = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (m[c]) return { p: m[c], exact: true };
  const n = c ? c[0] + c.slice(1).replace(/O/g, '0').replace(/[IL]/g, '1') : '';
  return m[n] ? { p: m[n], exact: false } : { p: null, exact: false };
}
function parseFormat(f) {
  const s = String(f || '').toLowerCase().replace(',', '.');
  let m = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|l|cl|ml)/.exec(s), mult = 1, v, u;
  if (m) { mult = +m[1]; v = +m[2]; u = m[3]; }
  else if ((m = /(\d+(?:\.\d+)?)\s*(kg|g|l|cl|ml)\b/.exec(s))) { v = +m[1]; u = m[2]; }
  else if ((m = /(\d+(?:\.\d+)?)\s*(pz|pezzi|rotoli|capsule|buste)/.exec(s))) return { qta: +m[1], unita: 'pz' };
  else return { qta: null, unita: null };
  const k = { kg: [1, 'kg'], g: [.001, 'kg'], l: [1, 'l'], cl: [.01, 'l'], ml: [.001, 'l'] }[u];
  return { qta: Math.round(mult * v * k[0] * 1e4) / 1e4, unita: k[1] };
}
const PERIS = ['freschi', 'ortofrutta'];

/* ---------- offerte ---------- */
function col(S, r, f) { const i = S.map[f]; return i == null || i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); }
function buildOffers(S) {
  S.offers = S.rows.map((r, i) => {
    const code = col(S, r, 'codice'), r0 = resolve(code), p = r0.exact ? r0.p : null;
    const title = col(S, r, 'titolo') || (p && p.nome) || '', brand = col(S, r, 'marca') || (p && p.marca) || '', fmt = col(S, r, 'formato') || (p && p.formato) || '';
    const pf = parseFormat(fmt), tipoRaw = col(S, r, 'tipo');
    const tipo = /sotto/i.test(tipoRaw) ? 'sotto' : /doppio/i.test(tipoRaw) ? 'doppio' : /3x2|2x1|1\s*\+\s*1/i.test(tipoRaw) ? 'mecc' : 'pct';
    const img0 = col(S, r, 'immagine');
    return { id: 'o' + i, code, title, brand, fmt, promo: num(col(S, r, 'prezzo')), full: num(col(S, r, 'prezzo_pieno')), min30: num(col(S, r, 'min30')),
      dept: col(S, r, 'reparto') || (p && p.reparto) || 'Altro', dal: col(S, r, 'dal'), al: col(S, r, 'al'), prio: parseInt(col(S, r, 'priorita')) || 3, tipo,
      pezzi: num(col(S, r, 'pezzi')), limite: num(col(S, r, 'limite')), pid: p ? p.id : null, qta: (p && p.qta) || pf.qta, unita: (p && p.unita) || pf.unita,
      img: p ? p.img : '', newProd: false, pin: false, removed: false, suggest: !p && r0.p ? r0.p.id : null, imgNote: img0 };
  });
  const ds = S.offers.map(o => pd(o.dal)).filter(Boolean), as = S.offers.map(o => pd(o.al)).filter(Boolean);
  S.dal = ds.length ? fd(new Date(Math.min(...ds))) : ''; S.al = as.length ? fd(new Date(Math.max(...as))) : '';
}
function baseDates(S) {
  const act = S.offers.filter(o => !o.removed), non = act.filter(o => o.tipo !== 'sotto'), base = non.length ? non : act;
  const ds = base.map(o => pd(o.dal)).filter(Boolean), as = base.map(o => pd(o.al)).filter(Boolean);
  return { dal: ds.length ? fd(new Date(Math.min(...ds))) : S.dal, al: as.length ? fd(new Date(Math.max(...as))) : S.al };
}
const disc = o => o.full && o.full > o.promo ? Math.round((o.full - o.promo) / o.full * 100) : 0;
function issuesOf(o) {
  const x = [];
  if (o.title.length > 40) x.push({ t: 'titolo', msg: `Titolo troppo lungo: ${o.title.length} caratteri, il modello ne accetta al massimo 40.` });
  if (!o.brand || !o.fmt) x.push({ t: 'marca', msg: `Mancano ${!o.brand && !o.fmt ? 'marca e formato' : !o.brand ? 'la marca' : 'il formato'}.` });
  const prezzoKo = !(o.promo > 0) || (o.tipo !== 'mecc' && o.full && o.promo >= o.full);
  if (prezzoKo) x.push({ t: 'prezzo', msg: isFinite(o.promo) && o.full ? `Il prezzo in offerta (${eur(o.promo)}) non è più basso del prezzo pieno (${eur(o.full)}).` : 'Il prezzo in offerta manca o non è un numero.' });
  if (!o.pid && !o.newProd) x.push({ t: 'catalogo', msg: `Il codice ${o.code || '(vuoto)'} non è nel catalogo.${o.suggest ? ' Forse è ' + o.suggest + '.' : ''}` });
  else if (!o.img) x.push({ t: 'immagine', msg: 'Nessuna immagine per questo prodotto.' });
  if (!prezzoKo && o.tipo !== 'mecc' && isFinite(o.min30) && o.full && !PERIS.includes(norm(o.dept))) {
    if (o.promo >= o.min30) x.push({ t: 'sconto30', msg: `Il prezzo in offerta (${eur(o.promo)}) non è più basso del prezzo più basso dei 30 giorni (${eur(o.min30)}): non è uno sconto.` });
    else if (o.full > o.min30) x.push({ t: 'sconto30', msg: `Il prezzo barrato (${eur(o.full)}) è più alto del prezzo più basso dei 30 giorni (${eur(o.min30)}): lo sconto va calcolato su ${eur(o.min30)}.` });
  }
  if (o.tipo === 'sotto') {
    if (!(o.pezzi > 0) || !(o.limite > 0)) x.push({ t: 'sotto', msg: 'Sottocosto: mancano i pezzi disponibili o il limite per persona.' });
    const n = days(o.dal, o.al); if (n > 10) x.push({ t: 'sotto', msg: `Sottocosto: durata ${n} giorni, il massimo è 10.` });
  }
  if (!o.qta) x.push({ t: 'unita', msg: 'Il prezzo per unità di misura non si può calcolare: indica il formato (per esempio 500 g).' });
  return x;
}
const openIssues = S => S.offers.filter(o => !o.removed).flatMap(o => issuesOf(o).map(i => ({ ...i, o })));
function globalChecks(S) {
  const act = S.offers.filter(o => !o.removed), so = act.filter(o => o.tipo === 'sotto');
  return [
    { ok: so.length <= 50, txt: `Sottocosto: ${so.length} referenze, il massimo è 50.` },
    { ok: true, txt: 'Sottocosto: comunicazione al Comune almeno 10 giorni prima e non più di 3 volte l\'anno (da verificare fuori dalla piattaforma).' },
    { ok: true, txt: 'Freschi e ortofrutta sono esclusi dal controllo del prezzo precedente (art. 17-bis).' }
  ];
}
function shorten(t) { return t.length <= 40 ? t : t.slice(0, 38).replace(/\s+\S*$/, ''); }

/* ---------- composizione ---------- */
const score = o => disc(o) * (4 - Math.min(3, Math.max(1, o.prio)));
function compose(S) {
  const act = S.offers.filter(o => !o.removed), used = new Set(), pages = [];
  const non = act.filter(o => o.tipo !== 'sotto');
  if (S.cfg.cover === 'prezzo') {
    const pins = non.filter(o => o.pin), rest = non.filter(o => !o.pin && o.full && o.img).sort((a, b) => score(b) - score(a));
    const top = [...pins, ...rest].slice(0, 4); top.forEach(o => used.add(o.id));
    pages.push({ tpl: 'cover_price', ids: top.map(o => o.id) });
  } else {
    const top = non.filter(o => o.img).sort((a, b) => (a.pin ? -1 : 0) - (b.pin ? -1 : 0) || score(b) - score(a)).slice(0, 3);
    pages.push({ tpl: 'cover_idea', ids: top.map(o => o.id) });
  }
  const so = act.filter(o => o.tipo === 'sotto');
  for (let i = 0; i < so.length; i += 6) pages.push({ tpl: 'sotto_page', ids: so.slice(i, i + 6).map(o => o.id) });
  if (S.cfg.season) {
    const cand = non.filter(o => !used.has(o.id) && o.img && o.prio === 1).slice(0, 6);
    if (cand.length >= 3) { cand.forEach(o => used.add(o.id)); pages.push({ tpl: 'season_page', ids: cand.map(o => o.id) }); }
  }
  const rest = non.filter(o => !used.has(o.id)), depts = [...new Set(rest.map(o => o.dept))], zones = [];
  const flat = depts.flatMap(d => rest.filter(o => o.dept === d).sort((a, b) => a.prio - b.prio));
  for (let i = 0; i < flat.length; i += 8) {
    const chunk = flat.slice(i, i + 8), ds = [...new Set(chunk.map(o => o.dept))];
    zones.push({ nome: ds.length === 1 ? ds[0] : ds.length === 2 ? ds[0] + ' e ' + ds[1] : ds[0] + ' e altro', ids: chunk.map(o => o.id) });
  }
  let cur = null, rows = 0;
  zones.forEach(z => {
    const r = z.ids.length > 4 ? 2 : 1;
    if (!cur || rows + r > 6 || cur.zones.length >= 4) { cur = { tpl: 'dense_zones', zones: [] }; pages.push(cur); rows = 0; }
    cur.zones.push(z); rows += r;
  });
  if (S.cfg.services) pages.push({ tpl: 'services_page' });
  return pages;
}

/* ---------- versioni per negozio ---------- */
const STORES = [{ id: '014', name: 'Bergamo Centro' }, { id: '027', name: 'Milano Navigli' }, { id: '031', name: 'Torino Lingotto' }, { id: '052', name: 'Bologna Fiera' }, { id: '068', name: 'Verona Porta Nuova' }];
function effOv(S, st) {
  const o = (S.ov && S.ov[st]) || { items: {} }, L = S.locks; let ignored = 0, count = 0; const items = {};
  Object.entries(o.items || {}).forEach(([id, v]) => {
    const e = {};
    if (v.promo != null) { if (!L.prezzi) { e.promo = v.promo; count++; } else ignored++; }
    if (v.img) { if (!L.immagini) { e.img = v.img; count++; } else ignored++; }
    if (v.title) { if (!L.titoli) { e.title = v.title; count++; } else ignored++; }
    if (v.hidden) { if (!L.posizione) { e.hidden = true; count++; } else ignored++; }
    if (Object.keys(e).length) items[id] = e;
  });
  const bd = baseDates(S); let dal = bd.dal, al = bd.al;
  if (o.dal || o.al) { if (!L.validita) { dal = o.dal || dal; al = o.al || al; count++; } else ignored++; }
  return { items, dal, al, count, ignored, dateOv: !!((o.dal || o.al) && !L.validita) };
}
function eff(S, o, st) {
  if (!st) return o; const e = effOv(S, st).items[o.id]; return e ? { ...o, ...(e.promo != null ? { promo: e.promo } : {}), ...(e.img ? { img: e.img } : {}), ...(e.title ? { title: e.title } : {}), hidden: !!e.hidden } : o;
}
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function legale(dal, al) {
  const a = pd(dal), b = pd(al); const per = a && b ? (a.getMonth() === b.getMonth() ? `dal ${a.getDate()} al ${b.getDate()} ${MESI[b.getMonth()]} ${b.getFullYear()}` : `dal ${a.getDate()} ${MESI[a.getMonth()]} al ${b.getDate()} ${MESI[b.getMonth()]} ${b.getFullYear()}`) : 'nel periodo indicato';
  if (g.FOLIFLY_LEGALE != null) return `Offerte valide ${per}. ${g.FOLIFLY_LEGALE}`.trim();
  return `Offerte valide ${per} fino a esaurimento scorte, per quantità adatte a un consumo familiare. Il prezzo per unità di misura è indicato sotto ogni prezzo. Salvo errori di stampa. Insegne, marchi e prodotti sono di fantasia.`;
}
const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MOOD_INK = { festa: 'light', autunno: 'light', fresco: 'dark', colazione: 'dark', casa: 'dark' };
/* Costruisce il piano nel formato dei modelli (Modelli.ctx / Modelli.render) per la sede o per un negozio. */
function toModelPlan(S, store) {
  const comp = S.composition || (S.composition = compose(S)), ov = store ? effOv(S, store) : null;
  const dal = ov ? ov.dal : baseDates(S).dal, al = ov ? ov.al : baseDates(S).al;
  const byId = {}; const cat = [];
  S.offers.forEach(o => {
    const e = eff(S, o, store); byId[o.id] = e;
    cat.push({ id: o.id, nome: e.title, marca: e.brand, formato: e.fmt, qta: e.qta || 0, unita: e.unita || 'kg', reparto: e.dept, prezzo: e.full || e.promo, img: e.img || '' });
  });
  const live = ids => ids.map(i => byId[i]).filter(o => o && !o.hidden);
  const prior = o => (o.full && o.full > o.promo) ? o.full : null;
  const it3 = o => [o.id, o.promo, prior(o)];
  const zdates = os => { if (ov && ov.dateOv) return [dal, al]; const a = os.map(o => pd(o.dal)).filter(Boolean), b = os.map(o => pd(o.al)).filter(Boolean); return [a.length ? fd(new Date(Math.min(...a))) : dal, b.length ? fd(new Date(Math.max(...b))) : al]; };
  const pagine = [];
  comp.forEach(pg => {
    if (pg.tpl === 'cover_price') {
      const os = live(pg.ids); pagine.push({ tpl: 'cover_price', d: { mood: S.cfg.mood, titolo: escH(S.cfg.titolo).replace(/\n/g, '<br>'), sotto: S.cfg.sotto, offerte: os.map(it3) } });
    } else if (pg.tpl === 'cover_idea') {
      const os = live(pg.ids), mx = Math.max(0, ...S.offers.filter(o => !o.removed).map(disc));
      pagine.push({ tpl: 'cover_idea', d: { mood: S.cfg.mood, ink: MOOD_INK[S.cfg.mood] || 'light', kicker: S.cfg.kicker, titolo: escH(S.cfg.titolo).replace(/\n/g, '<br>'), sub: S.cfg.sotto, trio: os.map(o => o.id), bollino: mx ? `fino al<br>-${mx}%` : '', nastro: 'Inoltre, tante altre offerte in tutte le pagine' } });
    } else if (pg.tpl === 'sotto_page') {
      const os = live(pg.ids), n = Math.max(0, ...os.map(o => days(o.dal, o.al)));
      pagine.push({ tpl: 'sotto_page', d: { titolo: 'Sottocosto', durata: `${n || 7} giorni`, offerte: os.map(o => [o.id, o.promo, prior(o), o.pezzi || 0, o.limite || 0]) } });
    } else if (pg.tpl === 'season_page') {
      pagine.push({ tpl: 'season_page', d: { mood: S.cfg.mood, kicker: S.cfg.kicker, titolo: S.cfg.seasonTitle || 'Dolce attesa', offerte: live(pg.ids).map(it3) } });
    } else if (pg.tpl === 'dense_zones') {
      const first = comp.indexOf(pg) === comp.findIndex(p => p.tpl === 'dense_zones');
      const zone = pg.zones.map(z => { const os = live(z.ids), dd = zdates(os); return { nome: z.nome, dal: dd[0], al: dd[1], items: os.map(it3) }; }).filter(z => z.items.length);
      pagine.push({ tpl: 'dense_zones', d: { titolo: first ? 'Spesa a zone' : 'Altre offerte', zone } });
    } else pagine.push({ tpl: pg.tpl, d: { titolo: 'I nostri servizi' } });
  });
  return { plan: { dal, al, legale: legale(dal, al), pagine }, cat };
}

/* ---------- numeri registrati ---------- */
function stats(S) {
  const act = S.offers.filter(o => !o.removed), ds = act.map(disc).filter(d => d > 0);
  const byDept = {}; act.forEach(o => (byDept[o.dept] = byDept[o.dept] || []).push(disc(o)));
  const dr = Object.entries(byDept).map(([d, a]) => [d, Math.round(a.reduce((x, y) => x + y, 0) / a.length)]).sort((a, b) => b[1] - a[1]);
  const mx = act.slice().sort((a, b) => disc(b) - disc(a))[0];
  return { n: act.length, avg: ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0, max: mx ? disc(mx) : 0, maxName: mx ? mx.title : '',
    deep: act.length ? Math.round(act.filter(o => disc(o) >= 30).length / act.length * 100) : 0, dr, sotto: act.filter(o => o.tipo === 'sotto').length };
}
g.Plan = { baseDates, FIELDS, automap, buildOffers, issuesOf, openIssues, globalChecks, compose, toModelPlan, effOv, eff, stats, STORES, resolve, parseFormat, shorten, num, eur, pd, fd, days, disc, legale, norm };
})(window);
