/* Configuratore Folifly: sei passi dal file di vendite ai file per la stampa. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = Plan.eur;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const I = {
  lock: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  open: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
  ok: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  warn: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/></svg>',
  up: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  dots: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="18" cy="12" r="1.8"/></svg>',
  next: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};
const STEPS = [['file', 'Il file'], ['colonne', 'Le colonne'], ['controllo', 'Il controllo'], ['volantino', 'Il volantino'], ['negozi', 'I negozi'], ['uscita', 'L\'uscita']];
const THEMES = Modelli.THEMES, FIELDS = Plan.FIELDS, STORES = Plan.STORES;
const MOODS = [['fresco', 'Fresco'], ['colazione', 'Colazione'], ['casa', 'Casa pulita'], ['autunno', 'Autunno'], ['festa', 'Festa']];
const PNAME = { cover_idea: 'Copertina', cover_price: 'Copertina', sotto_page: 'Sottocosto', season_page: 'Stagione', dense_zones: 'Offerte', services_page: 'Servizi' };
const CHECKS = [['Lettura delle righe', null], ['Titoli, marche e formati', ['titolo', 'marca']], ['Prezzi', ['prezzo']], ['Abbinamento al catalogo', ['catalogo']], ['Immagini', ['immagine']],
  ['Prezzo precedente a 30 giorni', ['sconto30']], ['Sottocosto', ['sotto']], ['Prezzo per unità di misura', ['unita']]];
const LOCKS = [['prezzi', 'Prezzi', 'Il negozio non può cambiare il prezzo in offerta.'], ['immagini', 'Immagini', 'Il negozio può usare una foto del suo prodotto.'], ['titoli', 'Titoli e marche', 'Il negozio non può cambiare i testi.'],
  ['posizione', 'Prodotti e posizione', 'Togliere un prodotto dalla pagina del negozio.'], ['validita', 'Date di validità', 'Un negozio che apre in un altro giorno.']];

const fresh = () => ({
  step: 0, max: 0, name: 'Settimana 48', insegna: 'mercatoverde',
  cfg: { cover: 'prezzo', mood: 'fresco', kicker: 'Offerte della settimana', titolo: 'La spesa\nintelligente', sotto: 'Freschi, dispensa e casa a prezzi forti', season: false, services: true, seasonTitle: 'Dolce attesa' },
  fileName: '', headers: [], rows: [], map: {}, conf: {}, dirty: false, offers: [], composition: null, chk: { i: 0, done: false }, open: '', log: [], initIssues: null, fixes: 0,
  page: 0, sel: null, imgCtx: null, locks: { prezzi: true, immagini: false, titoli: true, posizione: true, validita: false }, view: 'sede', ov: {},
  exp: { pdf: true, jpg: true, psd: false }, dpi: 150, expStores: { sede: true, '027': true }, gen: null, t0: 0, remembered: false, server: false, vector: true, dal: '', al: ''
});
let S = fresh(), timer = null;

/* ---------- pagine del volantino ---------- */
function modelPages(store) {
  const m = Plan.toModelPlan(S, store || null), st = store ? STORES.find(x => x.id === store) : null;
  const c = Modelli.ctx(S.insegna, m.cat, m.plan, x => x.replace(/^web\//, 'img/'), st);
  return m.plan.pagine.map((p, i) => ({ k: p.tpl, html: Modelli.render(p.tpl, c, p.d, i + 1) }));
}
const fit = h => `<div class="fit">${h}</div>`;
function fitAll() {
  document.querySelectorAll('.fit').forEach(f => { const p = f.firstElementChild; if (!p) return; const k = f.clientWidth / 800; p.style.transform = `scale(${k})`; f.style.height = (800 * 297 / 210 * k) + 'px'; });
  document.querySelectorAll('.paper [data-pid]').forEach(e => e.classList.toggle('sel', e.dataset.pid === S.sel));
}
if (window.ResizeObserver) new ResizeObserver(() => fitAll()).observe(document.body);
const offer = id => S.offers.find(o => o.id === id);
const invalidate = () => { S.composition = null; };
function pagerHTML(pages) {
  return `<div class="strip" role="group" aria-label="Pagine del volantino">${pages.map((p, i) => `<button class="thumb" data-a="page" data-i="${i}" aria-current="${i === S.page}" aria-label="Pagina ${i + 1}, ${PNAME[p.k]}">${fit(p.html)}<span>${i + 1}. ${PNAME[p.k]}</span></button>`).join('')}</div>`;
}
function galleryHTML(cur) {
  return `<div class="gal big">${CATALOGO.map(p => `<button data-a="imgPick" data-k="${esc(p.img)}" class="${cur === p.img ? 'on' : ''}" aria-label="${esc(p.nome)}" title="${esc(p.nome)}"><img src="${p.img}" alt="${esc(p.nome)}" loading="lazy"></button>`).join('')}</div>
  <label class="btn sec sm" style="justify-self:start">${I.up} Carica una tua immagine<input type="file" accept="image/*" data-ch="imgUp" hidden></label>`;
}

/* ---------- passo 1: il file ---------- */
const SAMPLE_PREVIEW = null;
function stepFile() {
  const loaded = S.rows.length > 0, H = loaded ? S.headers : [], R = loaded ? S.rows : [];
  const tbl = loaded ? `<div class="tbl"><table><thead><tr>${H.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${R.slice(0, 6).map(r => `<tr>${H.map((_, i) => `<td>${esc(r[i])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
  return `<div><h1>Parti dal file di vendite</h1><p class="lede">Carica il piano della settimana così com'è, in CSV o in Excel. Non serve riordinare le colonne né pulire i dati prima: ci pensano i passi dopo.</p></div>
  <div class="grid2">
   <div class="card">
    <div class="field"><label for="vname">Nome del volantino</label><input type="text" id="vname" value="${esc(S.name)}" data-in="name" autocomplete="off"></div>
    <div class="field"><span class="lbl" id="ilab">Insegna di esempio</span>
     <div class="insegne" role="radiogroup" aria-labelledby="ilab">${Object.entries(THEMES).map(([k, o]) => `<button class="ins" role="radio" aria-checked="${S.insegna === k}" aria-pressed="${S.insegna === k}" data-a="insegna" data-k="${k}"><span class="sw" style="background:${o.c1}"><i style="background:${o.ac};clip-path:${o.clip}"></i></span><span><b>${o.nome}</b><small>${o.tipo}</small></span></button>`).join('')}</div></div>
    <div class="cfgrow"><div class="field"><label for="ccover">Copertina</label><select id="ccover" data-ch="cfg" data-f="cover"><option value="prezzo"${S.cfg.cover === 'prezzo' ? ' selected' : ''}>Prezzo: quattro prezzi grandi</option><option value="idea"${S.cfg.cover === 'idea' ? ' selected' : ''}>Idea: una sola immagine</option></select></div>
     <div class="field"><label for="cmood">Foto d'atmosfera</label><select id="cmood" data-ch="cfg" data-f="mood">${MOODS.map(([k, l]) => `<option value="${k}"${S.cfg.mood === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <div class="field"><label for="ctit">Titolo della copertina (due righe al massimo)</label><textarea id="ctit" data-in="titolo" rows="2">${esc(S.cfg.titolo)}</textarea></div>
    <div class="field"><label for="csub">Frase sotto il titolo</label><input type="text" id="csub" value="${esc(S.cfg.sotto)}" data-in="sotto" autocomplete="off"></div>
   </div>
   <div class="card">
    <div class="row between"><div><span class="lbl">File di vendite</span><h2>${loaded ? esc(S.fileName) : 'Nessun file caricato'}</h2></div><span class="pill ${loaded ? 'ok' : 'no'}">${loaded ? `${S.rows.length} righe, ${S.headers.length} colonne` : 'Da caricare'}</span></div>
    ${loaded ? tbl + `<p class="note">Le prime 6 righe di ${S.rows.length}.</p>` : `<p class="note">Il file d'esempio ha 76 righe e 16 colonne dai nomi di tutti i giorni, e contiene di proposito 12 problemi da trovare e correggere: titoli lunghi, prezzi sbagliati, sconti non coerenti con i 30 giorni, sottocosto incompleti.</p>`}
    <div class="row">
     ${loaded ? `<button class="btn" data-a="next">Avanti: le colonne ${I.next}</button>` : `<button class="btn" data-a="useSample">Usa il file d'esempio</button>`}
     ${loaded ? '<button class="btn sec" data-a="useSample">Rimetti il file d\'esempio</button>' : ''}
    </div>
    <label class="drop" id="drop">${I.up}<b>${loaded ? 'Oppure carica un altro file' : 'Oppure carica un tuo file'}</b><span class="small">Trascina qui un file CSV o Excel, oppure tocca per sceglierlo.</span><input type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain" data-ch="file" hidden></label>
    <p class="note dl">Scarica l'esempio: <a href="data/settimana-48-offerte.csv" download>CSV</a> · <a href="data/settimana-48-offerte.xlsx" download>Excel</a></p>
   </div>
  </div>`;
}

/* ---------- passo 2: le colonne ---------- */
function stepMap() {
  const need = FIELDS.filter(f => f.req && S.map[f.k] < 0).length, used = new Set(Object.values(S.map)), unused = S.headers.filter((_, i) => !used.has(i));
  return `<div><h1>Le colonne si riconoscono da sole</h1><p class="lede">Folifly legge i nomi delle colonne del tuo file e li abbina ai campi del volantino. Controlla solo quelli segnati in giallo. ${S.remembered ? '<b>Questo file ha le stesse colonne della settimana scorsa: l\'abbinamento è già ricordato.</b>' : ''}</p></div>
  <div class="map" role="table" aria-label="Abbinamento delle colonne">
   <div class="mrow head" role="row"><span>Campo del volantino</span><span>Colonna del tuo file</span><span>Primo valore e stato</span></div>
   ${FIELDS.map(f => {
     const i = S.map[f.k], c = S.conf[f.k];
     const st = i < 0 ? (f.req ? '<span class="pill bad">Manca</span>' : '<span class="pill no">Non usata</span>') : c === 'check' ? `<span class="pill chk">${I.warn} Da confermare</span> <button class="btn sm sec" data-a="mapOk" data-f="${f.k}">Conferma</button>` : '<span class="pill ok">Riconosciuta</span>';
     return `<div class="mrow" role="row"><div><b>${f.l}</b> ${f.req ? '<span class="req">obbligatorio</span>' : ''}</div>
      <div><select aria-label="Colonna per ${esc(f.l)}" data-ch="mapSel" data-f="${f.k}"><option value="-1"${i < 0 ? ' selected' : ''}>Non usare</option>${S.headers.map((h, j) => `<option value="${j}"${i === j ? ' selected' : ''}>${esc(h)}</option>`).join('')}</select></div>
      <div class="row" style="gap:8px"><span class="sample" title="${esc(i >= 0 ? S.rows[0][i] : '')}">${i >= 0 ? esc(S.rows[0][i]) : ''}</span>${st}</div></div>`;
   }).join('')}
  </div>
  ${unused.length ? `<p class="small muted">Colonne che restano nel file e non vengono usate: ${unused.map(esc).join(', ')}. Non vanno tolte né sistemate.</p>` : ''}
  ${need ? `<div class="banner">${I.warn}<span>Mancano ${need} campi obbligatori. Scegli una colonna per ognuno.</span></div>` : ''}`;
}

/* ---------- passo 3: il controllo ---------- */
const TLAB = { titolo: 'Titolo', marca: 'Marca o formato', prezzo: 'Prezzo', catalogo: 'Catalogo', immagine: 'Immagine', sconto30: '30 giorni', sotto: 'Sottocosto', unita: 'Unità di misura' };
function proposal(x) {
  const o = x.o;
  if (x.t === 'titolo') return Plan.shorten(o.title);
  if (x.t === 'prezzo') return o.full ? Math.floor(o.full * 0.7 * 100) / 100 : null;
  if (x.t === 'catalogo') return o.suggest;
  if (x.t === 'sconto30') return o.promo < o.min30 ? 'usa30' : 'togli';
  if (x.t === 'sotto') return Plan.days(o.dal, o.al) > 10 ? 'dieci' : null;
  return null;
}
function fixHTML(x) {
  const o = x.o, pr = proposal(x);
  if (x.t === 'titolo') return `<div class="fix"><div class="field"><label for="fx">Nuovo titolo (massimo 40 caratteri)</label><input type="text" id="fx" value="${esc(pr)}" maxlength="40"></div><div class="row"><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="titolo">Usa questo titolo</button><span class="small muted">Proposta di Folifly, modificabile.</span></div></div>`;
  if (x.t === 'marca') return `<div class="fix"><div class="two"><div class="field"><label for="fx">Marca</label><input type="text" id="fx" value="${esc(o.brand)}"></div><div class="field"><label for="fx2">Formato (per esempio 500 g)</label><input type="text" id="fx2" value="${esc(o.fmt)}"></div></div><div><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="marca">Salva</button></div></div>`;
  if (x.t === 'prezzo') return `<div class="fix"><div class="field"><label for="fx">Prezzo in offerta</label><input type="text" id="fx" inputmode="decimal" value="${pr != null ? eur(pr) : eur(o.promo)}"></div><div class="row"><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="prezzo">Usa questo prezzo</button><span class="small muted">${pr != null ? 'Proposta: 30% di sconto sul prezzo pieno. Controlla sul piano di vendita.' : 'Controlla sul piano di vendita.'}</span></div></div>`;
  if (x.t === 'catalogo') return `<div class="fix"><div class="field"><label for="fx">Codice del catalogo</label><select id="fx"><option value="">Scegli un codice</option>${CATALOGO.map(p => `<option value="${p.id}"${pr === p.id ? ' selected' : ''}>${p.id}, ${esc(p.nome)}, ${esc(p.formato)}</option>`).join('')}</select></div>
    <div class="row"><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="catalogo">Usa questo codice</button><button class="btn sm sec" data-a="newProd" data-id="${o.id}">È un prodotto nuovo</button>${pr ? `<span class="small muted">Proposta: ${pr}. Nel file c'è una lettera al posto di una cifra.</span>` : '<span class="small muted">Se è nuovo, dopo scegli o carichi la sua immagine.</span>'}</div></div>`;
  if (x.t === 'immagine') return `<div class="fix"><p class="small muted">Scegli un'immagine dalla libreria oppure carica la tua.</p>${galleryHTML('')}</div>`;
  if (x.t === 'sconto30') {
    const a = o.promo < o.min30;
    return `<div class="fix"><p class="small muted">Lo sconto si calcola sul prezzo più basso dei 30 giorni prima, non sul prezzo di listino (art. 17-bis del Codice del consumo).</p><div class="row">${a ? `<button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="sconto30" data-m="usa30">Usa ${eur(o.min30)} come prezzo precedente</button>` : ''}<button class="btn sm sec" data-a="fixApply" data-id="${o.id}" data-t="sconto30" data-m="togli">Togli prezzo barrato e sconto</button></div></div>`;
  }
  if (x.t === 'sotto') return `<div class="fix"><div class="two"><div class="field"><label for="fx">Pezzi disponibili</label><input type="text" id="fx" inputmode="numeric" value="${isFinite(o.pezzi) ? o.pezzi : ''}"></div><div class="field"><label for="fx2">Limite per persona</label><input type="text" id="fx2" inputmode="numeric" value="${isFinite(o.limite) ? o.limite : ''}"></div></div>
    <div class="row"><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="sotto">Salva</button>${Plan.days(o.dal, o.al) > 10 ? `<button class="btn sm sec" data-a="fixApply" data-id="${o.id}" data-t="sotto" data-m="dieci">Porta la durata a 10 giorni</button>` : ''}</div></div>`;
  if (x.t === 'unita') return `<div class="fix"><div class="field"><label for="fx">Formato (per esempio 500 g, 1,5 L, 6 pezzi)</label><input type="text" id="fx" value="${esc(o.fmt)}"></div><div><button class="btn sm" data-a="fixApply" data-id="${o.id}" data-t="unita">Salva</button></div></div>`;
  return '';
}
function stepCheck() {
  const open = Plan.openIssues(S), run = S.chk.i, total = CHECKS.length;
  const rows = CHECKS.map(([label, ts], i) => {
    let cls = '', res = '', ic = I.dots;
    if (i < run) {
      const n = ts ? open.filter(x => ts.includes(x.t)).length : 0;
      if (i === 0) { cls = 'ok'; res = `${S.offers.length} righe lette`; ic = I.ok; }
      else if (n) { cls = 'bad'; res = `${n} da correggere`; ic = I.warn; } else { cls = 'ok'; res = 'Tutto a posto'; ic = I.ok; }
    } else if (i === run) { cls = 'run'; res = 'Controllo in corso'; } else res = 'In attesa';
    return `<li class="${cls}"><span class="st">${ic}</span><span class="t">${label}</span><span class="r">${res}</span></li>`;
  }).join('');
  const done = run >= total;
  const issues = done ? open.map(x => {
    const key = x.o.id + x.t, isOpen = S.open === key;
    return `<div class="issue"><div class="hd"><div><span class="pill chk">${TLAB[x.t]}</span><div class="nm">${esc(x.o.title || '(senza titolo)')} <span class="mono muted">${esc(x.o.code)}</span></div><div class="small muted">${esc(x.msg)}</div></div>
     <button class="btn sec sm" data-a="fixOpen" data-k="${key}" data-id="${x.o.id}" aria-expanded="${isOpen}">${isOpen ? 'Chiudi' : 'Correggi'}</button></div>${isOpen ? fixHTML(x) : ''}</div>`;
  }).join('') : '';
  return `<div><h1>Il controllo prima di comporre</h1><p class="lede">Folifly legge ogni riga e segnala ciò che romperebbe il volantino o non sarebbe in regola. I problemi si correggono qui, senza tornare al file.</p></div>
  <ul class="checks" aria-label="Controlli">${rows}</ul>
  ${done ? `<div class="card flat">${Plan.globalChecks(S).map(g => `<div class="logline">${I.ok}<span>${esc(g.txt)}</span></div>`).join('')}</div>
  <div class="row between"><div><h2>${open.length ? `${open.length} ${open.length === 1 ? 'cosa da correggere' : 'cose da correggere'}` : 'Tutto a posto'}</h2><p class="small muted">${open.length ? 'Puoi correggere una alla volta, oppure accettare le proposte.' : 'Il file è pronto per essere composto.'}</p></div>${open.some(x => proposal(x)) ? '<button class="btn" data-a="fixAll">Accetta tutte le proposte</button>' : ''}</div>
  <div class="issues">${issues}</div>
  ${S.log.length ? `<div class="card flat"><span class="lbl">Corretto finora (${S.log.length})</span>${S.log.map(l => `<div class="logline">${I.ok}<span>${esc(l)}</span></div>`).join('')}</div>` : ''}` : ''}`;
}
function fixApply(id, t, mode) {
  const o = offer(id), el = $('#fx'), v = el ? el.value.trim() : '';
  if (t === 'titolo') { if (!v) return; o.title = v.slice(0, 40); S.log.push(`Titolo accorciato: ${o.title}`); }
  else if (t === 'marca') { o.brand = v; o.fmt = ($('#fx2') || { value: '' }).value.trim(); if (!o.brand || !o.fmt) { toast('Servono sia la marca sia il formato.'); return; } const pf = Plan.parseFormat(o.fmt); if (!o.qta) { o.qta = pf.qta; o.unita = pf.unita; } S.log.push(`Marca e formato aggiunti: ${o.title}`); }
  else if (t === 'prezzo') { const n = Plan.num(v); if (!isFinite(n) || n <= 0) { toast('Scrivi un prezzo, per esempio 0,69.'); return; } if (o.full && n >= o.full) { toast('Il prezzo in offerta deve essere più basso del prezzo pieno.'); return; } o.promo = n; S.log.push(`Prezzo corretto: ${o.title} a ${eur(n)}`); }
  else if (t === 'catalogo') { const p = CATALOGO.find(x => x.id === v); if (!p) { toast('Scegli un codice dall\'elenco.'); return; } const old = o.code; o.code = p.id; o.pid = p.id; o.img = p.img; o.qta = p.qta; o.unita = p.unita; o.newProd = false; if (!o.brand) o.brand = p.marca; if (!o.fmt) o.fmt = p.formato; S.log.push(`Codice ${old} cambiato in ${p.id}`); }
  else if (t === 'sconto30') { if (mode === 'usa30') { o.full = o.min30; S.log.push(`Prezzo precedente portato a ${eur(o.min30)}: ${o.title}`); } else { o.full = NaN; S.log.push(`Prezzo barrato tolto: ${o.title}`); } }
  else if (t === 'sotto') {
    if (mode === 'dieci') { const d = Plan.pd(o.dal); if (d) { d.setDate(d.getDate() + 9); o.al = Plan.fd(d); S.log.push(`Sottocosto portato a 10 giorni: ${o.title}`); } }
    else { const a = Plan.num(v), b = Plan.num(($('#fx2') || { value: '' }).value); if (!(a > 0) || !(b > 0)) { toast('Servono pezzi disponibili e limite per persona.'); return; } o.pezzi = a; o.limite = b; S.log.push(`Sottocosto completato: ${o.title}`); }
  }
  else if (t === 'unita') { const pf = Plan.parseFormat(v); if (!pf.qta) { toast('Non riconosco il formato. Prova con 500 g o 1,5 L.'); return; } o.fmt = v; o.qta = pf.qta; o.unita = pf.unita; S.log.push(`Formato indicato: ${o.title}`); }
  S.fixes++; S.open = ''; invalidate(); render();
}
function applyImg(path) {
  const c = S.imgCtx; if (!c) return; const o = offer(c.id);
  if (c.mode === 'fix') { o.img = path; S.log.push(`Immagine abbinata: ${o.title}`); S.fixes++; S.open = ''; S.imgCtx = null; }
  else if (c.mode === 'sede') { o.img = path; S.imgCtx = null; toast('Immagine sostituita in tutto il volantino.'); }
  else if (c.mode === 'store') { const ov = ovOf(S.view); (ov.items[c.id] = ov.items[c.id] || {}).img = path; S.imgCtx = null; toast('Immagine cambiata solo per questo negozio.'); }
  invalidate(); render();
}

/* ---------- passo 4: il volantino ---------- */
function stepPreview() {
  const pages = modelPages(null); if (S.page >= pages.length) S.page = pages.length - 1;
  const o = S.sel ? offer(S.sel) : null, removed = S.offers.filter(x => x.removed);
  let panel;
  if (o) {
    const iss = Plan.issuesOf(o);
    panel = `<div class="card"><div class="preview-p" style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;align-items:center"><div class="im">${o.img ? `<img src="${esc(o.img)}" alt="">` : '<span class="small muted">Senza immagine</span>'}</div><div><span class="lbl">${esc(o.dept)}</span><h3>${esc(o.title)}</h3><div class="small muted">${esc(o.brand)} · ${esc(o.fmt)}</div></div></div>
     <dl class="kv"><dt>Codice</dt><dd class="mono">${esc(o.code)}</dd><dt>Prezzo</dt><dd>${eur(o.promo)} €</dd><dt>Prezzo precedente</dt><dd>${o.full ? eur(o.full) + ' €' : 'nessuno'}</dd><dt>Sconto</dt><dd>${Plan.disc(o)}%</dd><dt>Priorità</dt><dd>${o.prio}</dd></dl>
     ${iss.length ? `<div class="banner">${I.warn}<span>Da rivedere: ${iss.map(i => esc(i.msg)).join(' ')} <button class="btn ghost sm" data-a="goStep" data-i="2">Torna al controllo</button></span></div>` : ''}
     <div class="row"><button class="btn sec sm" data-a="imgOpen" data-id="${o.id}">Sostituisci l'immagine</button><button class="btn sec sm" data-a="pin" data-id="${o.id}">${o.pin ? 'Togli dalla copertina' : 'Porta in copertina'}</button><button class="btn sec sm" data-a="removeP" data-id="${o.id}">Togli dal volantino</button></div>
     ${S.imgCtx && S.imgCtx.mode === 'sede' ? galleryHTML(o.img) : ''}
     <button class="btn ghost sm" data-a="selClose">Chiudi la scheda</button></div>`;
  } else {
    const st = Plan.stats(S);
    panel = `<div class="card"><h2>Si è composto da solo</h2><p class="small muted">${st.n} offerte in ${pages.length} pagine: la copertina, ${S.offers.filter(x => x.tipo === 'sotto' && !x.removed).length} offerte sottocosto, le zone per reparto e i servizi.</p>
     <p class="small">Tocca un prodotto nella pagina per cambiargli l'immagine, portarlo in copertina o toglierlo.</p>
     <div class="field"><label class="lbl" for="cvr">Copertina</label><select id="cvr" data-ch="cfg" data-f="cover"><option value="prezzo"${S.cfg.cover === 'prezzo' ? ' selected' : ''}>Prezzo</option><option value="idea"${S.cfg.cover === 'idea' ? ' selected' : ''}>Idea</option></select></div>
     <label class="row small" style="gap:8px"><input type="checkbox" data-ch="opt" data-f="season" ${S.cfg.season ? 'checked' : ''}> Aggiungi una pagina di stagione con le offerte di priorità 1</label>
     <label class="row small" style="gap:8px"><input type="checkbox" data-ch="opt" data-f="services" ${S.cfg.services ? 'checked' : ''}> Aggiungi la pagina dei servizi</label>
     ${removed.length ? `<div><span class="lbl">Tolti dal volantino (${removed.length})</span>${removed.map(x => `<div class="row between small" style="padding:6px 0"><span>${esc(x.title)}</span><button class="btn ghost sm" data-a="restoreP" data-id="${x.id}">Rimetti</button></div>`).join('')}</div>` : ''}</div>`;
  }
  return `<div><h1>Il volantino si compone dai modelli</h1><p class="lede">Ogni pagina nasce da un modello e dai dati del file. Layout, immagini e prezzi restano sotto il tuo controllo.</p></div>
  ${pagerHTML(pages)}
  <div class="work"><div class="paper">${fit(pages[S.page].html)}</div><aside class="panel" aria-label="Scheda del prodotto">${panel}</aside></div>`;
}

/* ---------- passo 5: i negozi ---------- */
const ovOf = st => S.ov[st] = S.ov[st] || { items: {} };
function stepStores() {
  const st = S.view === 'sede' ? null : S.view, store = st ? STORES.find(s => s.id === st) : null, L = S.locks;
  const pages = modelPages(st); if (S.page >= pages.length) S.page = pages.length - 1;
  const o = S.sel && st ? offer(S.sel) : null;
  let panel;
  if (!st) {
    panel = `<div class="card"><h2>Versioni per negozio</h2><p class="small muted">Ogni negozio riceve la sua versione. Vedi quante modifiche locali ha, già filtrate dai lucchetti. Scegli un negozio per provare a modificarlo.</p>
      <div class="stores">${STORES.map(s => { const e = Plan.effOv(S, s.id); return `<button class="store" data-a="view" data-s="${s.id}" aria-pressed="false"><span><b>${s.id}</b> ${esc(s.name)}</span><span class="c">${e.count} ${e.count === 1 ? 'modifica' : 'modifiche'}${e.ignored ? `<br>${e.ignored} ignorate (bloccate)` : ''}</span></button>`; }).join('')}</div></div>`;
  } else {
    const ov = ovOf(st), it = o ? (ov.items[o.id] || {}) : {};
    const lockmsg = t => `<div class="lockmsg">${I.lock} ${t}</div>`;
    panel = `<div class="card"><div><span class="lbl">Stai lavorando come</span><h2>Negozio ${store.id}, ${esc(store.name)}</h2></div>
     <div class="field"><span class="lbl">Date di validità</span><div class="two"><input type="text" id="vdal" aria-label="Valido dal" value="${esc(ov.dal || Plan.baseDates(S).dal)}" ${L.validita ? 'readonly' : ''}><input type="text" id="val" aria-label="Valido fino al" value="${esc(ov.al || Plan.baseDates(S).al)}" ${L.validita ? 'readonly' : ''}></div>
      ${L.validita ? lockmsg('Bloccate dalla sede.') : '<div class="row"><button class="btn sm sec" data-a="ovDates">Salva le date</button></div>'}</div>
     ${o ? `<hr style="border:0;border-top:1px solid var(--line);width:100%;margin:0"><div><span class="lbl">${esc(o.dept)}</span><h3>${esc(o.title)}</h3></div>
      <div class="field"><label for="ovp">Prezzo in offerta</label><input type="text" id="ovp" inputmode="decimal" value="${eur(it.promo != null ? it.promo : o.promo)}" ${L.prezzi ? 'readonly' : ''}>${L.prezzi ? lockmsg('Bloccato dalla sede. Solo la sede può cambiarlo.') : ''}</div>
      <div class="field"><label for="ovt">Titolo</label><input type="text" id="ovt" value="${esc(it.title || o.title)}" maxlength="40" ${L.titoli ? 'readonly' : ''}>${L.titoli ? lockmsg('Bloccato dalla sede. Solo la sede può cambiarlo.') : ''}</div>
      ${L.prezzi && L.titoli ? '' : `<div class="row"><button class="btn sm" data-a="ovSave" data-id="${o.id}">Salva le modifiche</button></div>`}
      <div class="field"><span class="lbl">Immagine</span>${L.immagini ? lockmsg('Bloccata dalla sede.') : `<div><button class="btn sec sm" data-a="ovImg" data-id="${o.id}">Usa un'altra immagine</button></div>${S.imgCtx && S.imgCtx.mode === 'store' ? galleryHTML(it.img || o.img) : ''}`}</div>
      <div class="field"><span class="lbl">Prodotto nella pagina</span>${L.posizione ? lockmsg('Togliere un prodotto è bloccato dalla sede.') : `<div><button class="btn sec sm" data-a="ovHide" data-id="${o.id}">Togli dal volantino di questo negozio</button></div>`}</div>
      ${Object.keys(it).length ? `<div><button class="btn ghost sm" data-a="ovReset" data-id="${o.id}">Annulla le modifiche su questo prodotto</button></div>` : ''}` : '<p class="small muted">Tocca un prodotto nella pagina per provare a cambiarlo. Ciò che la sede ha bloccato resta in sola lettura.</p>'}
     <button class="btn ghost sm" data-a="view" data-s="sede">Torna alla vista della sede</button></div>`;
  }
  return `<div><h1>I negozi cambiano solo ciò che lasci libero</h1><p class="lede">Blocca con un lucchetto ciò che nessun negozio deve toccare. Poi prova a lavorare come un negozio: i campi bloccati non si lasciano modificare, e le versioni dei negozi escono davvero nei file.</p></div>
  <div class="card"><h2>Cosa possono cambiare i negozi</h2><div class="locks">${LOCKS.map(([k, n, d]) => `<div class="lockrow"><div><b>${n}</b><div class="d">${d}</div></div><button class="lk" data-a="lock" data-k="${k}" aria-pressed="${L[k]}" aria-label="${n}: ${L[k] ? 'bloccato' : 'libero'}">${L[k] ? I.lock + ' Bloccato' : I.open + ' Libero'}</button></div>`).join('')}</div></div>
  ${pagerHTML(pages)}
  <div class="work slim"><div class="stage">${st ? `<div class="banner store">${I.lock}<span>Vista del negozio ${store.id}. Cambi solo ciò che la sede ha lasciato libero.</span></div>` : `<div class="banner">${I.ok}<span>Vista della sede: così partono i volantini a tutti i negozi.</span></div>`}
   <div class="paper">${fit(pages[S.page].html)}</div></div><aside class="panel">${panel}</aside></div>`;
}

/* ---------- passo 6: l'uscita ---------- */
function biHTML() {
  const st = Plan.stats(S), open = Plan.openIssues(S).length, init = S.initIssues == null ? 0 : S.initIssues, n = S.offers.length;
  const clean = n ? Math.round((n - init) / n * 100) : 100, sec = Math.max(1, Math.round((Date.now() - S.t0) / 1000)), mm = Math.floor(sec / 60), ss = String(sec % 60).padStart(2, '0');
  const chg = STORES.reduce((a, s) => a + Plan.effOv(S, s.id).count, 0);
  return `<div class="card"><div class="row between"><div><span class="lbl">Dati registrati da questo volantino</span><h2>Cosa ha imparato la piattaforma</h2></div><span class="pill no">Proposta, da confermare</span></div>
   <div class="bi"><div class="m"><b>${st.n}</b><span>offerte nel volantino</span></div><div class="m"><b>${st.avg}%</b><span>sconto medio, il più alto ${st.max}%</span></div><div class="m"><b>${st.deep}%</b><span>offerte con sconto da 30% in su</span></div>
   <div class="m"><b>${clean}%</b><span>righe giuste al primo controllo (${n - init} su ${n})</span></div><div class="m"><b>${S.fixes}</b><span>correzioni fatte, ${open} ancora aperte</span></div><div class="m"><b>${st.sotto}</b><span>offerte sottocosto, su un massimo di 50</span></div>
   <div class="m"><b>${mm}:${ss}</b><span>dal file all'uscita, in questa prova</span></div><div class="m"><b>${chg}</b><span>modifiche dei negozi che hanno effetto</span></div></div>
   <div><span class="lbl">Sconto medio per reparto</span><div class="bars" style="margin-top:8px">${st.dr.map(([d, v]) => `<div class="bar1"><span>${esc(d)}</span><span class="t"><i style="width:${Math.min(100, v * 2)}%"></i></span><span class="v">${v}%</span></div>`).join('')}</div></div>
   <p class="small muted">Questi numeri nascono dal lavoro, senza chiedere nulla al team. Per una catena diventano mix e profondità degli sconti, conformità, tempi e qualità dei dati su tutte le settimane.</p></div>`;
}
const slug = s => Plan.norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'volantino';
function stepOut() {
  const ids = ['sede', ...STORES.map(s => s.id)], sel = ids.filter(i => S.expStores[i]);
  const nPages = modelPages(null).length, nf = (S.exp.jpg ? nPages : 0) + (S.exp.psd ? nPages : 0) + (S.exp.pdf ? 1 : 0), total = sel.length * nf, g = S.gen;
  return `<div><h1>L'uscita: stampa, digitale e file per la tipografia</h1><p class="lede">Scegli i formati, la qualità e le versioni. Folifly prepara i file veri: puoi scaricarli uno per uno o tutti insieme in un archivio.</p></div>
  <div class="fmtcards">
   <button class="fcard" data-a="exp" data-k="pdf" aria-pressed="${S.exp.pdf}"><span class="big">PDF</span><b>Per la stampa</b><ul><li>A4, una pagina per foglio</li><li>${S.server && S.vector ? 'Vettoriale con i caratteri incorporati (dal server)' : 'A 300 o 150 dpi, immagine per pagina'}</li><li>Senza abbondanza e senza CMYK (da decidere con la tipografia)</li></ul></button>
   <button class="fcard" data-a="exp" data-k="jpg" aria-pressed="${S.exp.jpg}"><span class="big">JPG</span><b>Per il digitale</b><ul><li>Una immagine per pagina, A4</li><li>App, sito, social e messaggi</li></ul></button>
   <button class="fcard" data-a="exp" data-k="psd" aria-pressed="${S.exp.psd}"><span class="big">PSD</span><b>A livelli</b><ul><li>Tre livelli: sfondo, confezioni, testi e prezzi</li><li>Guide di sicurezza a 4 mm</li><li>File grandi: meglio un negozio per volta</li></ul></button>
  </div>
  <div class="card"><div class="row between"><h2>Versioni e qualità</h2><div class="row"><button class="btn ghost sm" data-a="storesAll" data-v="1">Tutte</button><button class="btn ghost sm" data-a="storesAll" data-v="0">Nessuna</button></div></div>
   <div class="row">${ids.map(i => `<button class="switch" data-a="expStore" data-s="${i}" aria-pressed="${!!S.expStores[i]}">${i === 'sede' ? 'Sede' : i + ' ' + esc(STORES.find(s => s.id === i).name)}</button>`).join('')}</div>
   <div class="row"><span class="lbl">Qualità</span><button class="switch" data-a="dpi" data-v="150" aria-pressed="${S.dpi === 150}">150 dpi, veloce</button><button class="switch" data-a="dpi" data-v="300" aria-pressed="${S.dpi === 300}">300 dpi, per la stampa</button>
    ${S.server ? `<button class="switch" data-a="vector" aria-pressed="${S.vector}">PDF vettoriale</button>` : '<span class="note">Per il PDF vettoriale avvia l\'app con il file avvia.command.</span>'}</div>
   <div class="row between"><p><b>${total}</b> ${total === 1 ? 'file' : 'file'} da preparare (${sel.length} ${sel.length === 1 ? 'versione' : 'versioni'}, ${nPages} pagine).</p><button class="btn" data-a="gen" ${total && !(g && !g.done) ? '' : 'disabled'}>${g && g.done ? 'Prepara di nuovo' : 'Prepara i file'}</button></div>
   ${g ? `<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${g.total}" aria-valuenow="${g.i}"><i style="width:${g.total ? Math.round(g.i / g.total * 100) : 0}%"></i></div><p class="note">${esc(g.txt || '')}</p>
    ${g.err ? `<div class="banner">${I.warn}<span>${esc(g.err)}</span></div>` : ''}
    ${g.done && g.files ? `<div class="banner">${I.ok}<span>Pronti ${g.files.length} file. Scaricali qui sotto.</span></div>${g.zipUrl ? `<p><a class="btn" id="zipLink" href="${g.zipUrl}" download="${esc(slug(S.name))}.zip">Scarica tutto in un archivio ZIP</a></p>` : ''}
     <div class="files">${g.files.map(f => `<div>${I.ok}<a href="${f.url}" download="${esc(f.name)}">${esc(f.name)}</a><span class="muted">${(f.blob.size / 1048576).toFixed(1)} MB</span></div>`).join('')}</div>` : ''}` : ''}
  </div>
  ${biHTML()}
  <div class="card flat"><div class="row between"><div><h2>La settimana dopo</h2><p class="small muted">Il nuovo piano entra nello stesso modello. Le colonne si ricordano: non c'è niente da riconfermare.</p></div><button class="btn sec" data-a="again">Prepara la settimana 49</button></div></div>`;
}

/* ---------- regia ---------- */
function render() {
  const main = $('#main'), sy = window.scrollY;
  main.innerHTML = [stepFile, stepMap, stepCheck, stepPreview, stepStores, stepOut][S.step]();
  $('#volName').textContent = S.name;
  $('#steps').innerHTML = STEPS.map(([k, l], i) => `<li><button class="stp${i < S.max && i !== S.step ? ' done' : ''}" ${i === S.step ? 'aria-current="step"' : ''} data-a="goStep" data-i="${i}" ${i > S.max ? 'disabled' : ''}><span class="n">${i + 1}</span><span class="lab">${l}</span></button></li>`).join('');
  bar(); fitAll(); window.scrollTo(0, sy);
  if (location.hash !== '#' + STEPS[S.step][0]) history.replaceState(null, '', '#' + STEPS[S.step][0]);
}
function canNext() {
  if (S.step === 0) return S.rows.length > 0;
  if (S.step === 1) return FIELDS.every(f => !f.req || S.map[f.k] >= 0) && FIELDS.every(f => S.conf[f.k] !== 'check');
  return true;
}
const NEXT = ['Le colonne', 'Il controllo', 'Il volantino', 'I negozi', 'L\'uscita'];
function bar() {
  const b = $('#bar'), s = S.step; let info = '';
  if (s === 2) { const n = Plan.openIssues(S).length; info = S.chk.i < CHECKS.length ? 'Controllo in corso' : n ? `${n} da correggere` : 'Tutto a posto'; }
  if (s === 1 && !canNext()) info = 'Conferma le colonne in giallo e scegli quelle obbligatorie';
  if (s === 3 || s === 4) info = `Pagina ${S.page + 1} di ${modelPages(s === 4 && S.view !== 'sede' ? S.view : null).length}`;
  const nxt = s < 5 ? `<button class="btn" data-a="next" ${canNext() ? '' : 'disabled'}>${s === 2 && Plan.openIssues(S).length ? `Avanti con ${Plan.openIssues(S).length} da rivedere` : 'Avanti: ' + NEXT[s]} ${I.next}</button>` : '<span></span>';
  b.innerHTML = `${s > 0 ? `<button class="btn sec" data-a="prev">${I.back} Indietro</button>` : '<span></span>'}<span class="info">${info}</span>${nxt}`;
}
function go(i) {
  i = Math.max(0, Math.min(5, i)); if (i > S.max) S.max = i; S.step = i; S.open = ''; S.imgCtx = null;
  if (i === 2) startChecks();
  if (i === 3 || i === 4) { S.sel = null; S.page = 0; }
  render(); window.scrollTo({ top: 0 });
}
function startChecks() {
  if (S.initIssues == null) S.initIssues = new Set(Plan.openIssues(S).map(x => x.o.id)).size;
  if (S.chk.done || reduce) { S.chk.i = CHECKS.length; S.chk.done = true; return; }
  S.chk.i = 0; clearInterval(timer);
  timer = setInterval(() => { S.chk.i++; if (S.chk.i >= CHECKS.length) { clearInterval(timer); S.chk.done = true; } if (S.step === 2) render(); }, 450);
}
function loadTable(rows, name) {
  if (rows.length < 2) { toast('Il file è vuoto o ha una sola riga.'); return false; }
  S.fileName = name; S.headers = rows[0].map(h => String(h).trim()); S.rows = rows.slice(1, 1001).map(r => S.headers.map((_, i) => r[i] == null ? '' : r[i]));
  const a = Plan.automap(S.headers); S.map = a.map; S.conf = a.conf;
  if (S.remembered) Object.keys(S.conf).forEach(k => { if (S.conf[k] === 'check') S.conf[k] = 'ok'; });
  S.offers = []; S.composition = null; S.dirty = false; S.chk = { i: 0, done: false }; S.log = []; S.initIssues = null; S.fixes = 0; S.ov = {}; S.gen = null;
  if (!S.t0) S.t0 = Date.now(); return true;
}
async function useSample() {
  try { const r = await fetch('data/settimana-48-offerte.csv'); if (!r.ok) throw 0; loadTable(Csvx.parseCSV(await r.text()), 'settimana-48-offerte.csv'); render(); }
  catch (e) { toast('Non riesco a leggere il file d\'esempio. Apri l\'app dal server locale (file avvia.command).'); }
}
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 3400); }
function ready() { if (!S.offers.length) Plan.buildOffers(S); }

/* ---------- eventi ---------- */
const A = {
  useSample() { useSample(); },
  insegna(e) { S.insegna = e.dataset.k; render(); },
  next() {
    if (!canNext()) return;
    if (S.step <= 1 && (!S.offers.length || S.dirty)) { Plan.buildOffers(S); S.dirty = false; S.chk = { i: 0, done: false }; S.log = []; S.initIssues = null; S.fixes = 0; S.composition = null; }
    go(S.step + 1);
  },
  prev() { go(S.step - 1); },
  goStep(e) { go(+e.dataset.i); },
  mapOk(e) { S.conf[e.dataset.f] = 'ok'; render(); },
  fixOpen(e) { S.open = S.open === e.dataset.k ? '' : e.dataset.k; S.imgCtx = S.open ? { mode: 'fix', id: e.dataset.id } : null; render(); },
  fixApply(e) { fixApply(e.dataset.id, e.dataset.t, e.dataset.m); },
  newProd(e) { const o = offer(e.dataset.id); o.newProd = true; S.log.push(`Prodotto nuovo: ${o.title}`); S.fixes++; S.open = ''; invalidate(); render(); },
  fixAll() {
    Plan.openIssues(S).forEach(x => {
      const pr = proposal(x), o = x.o; if (pr == null) return;
      if (x.t === 'titolo') { o.title = pr; S.log.push(`Titolo accorciato: ${o.title}`); }
      else if (x.t === 'prezzo') { if (o.full && pr < o.full) { o.promo = pr; S.log.push(`Prezzo corretto: ${o.title} a ${eur(pr)}`); } else return; }
      else if (x.t === 'catalogo') { const p = CATALOGO.find(c => c.id === pr); const old = o.code; o.code = p.id; o.pid = p.id; o.img = p.img; o.qta = p.qta; o.unita = p.unita; S.log.push(`Codice ${old} cambiato in ${p.id}`); }
      else if (x.t === 'sconto30') { if (pr === 'usa30') { o.full = o.min30; S.log.push(`Prezzo precedente portato a ${eur(o.min30)}: ${o.title}`); } else { o.full = NaN; S.log.push(`Prezzo barrato tolto: ${o.title}`); } }
      else if (x.t === 'sotto' && pr === 'dieci') { const d = Plan.pd(o.dal); d.setDate(d.getDate() + 9); o.al = Plan.fd(d); S.log.push(`Sottocosto portato a 10 giorni: ${o.title}`); }
      S.fixes++;
    });
    S.open = ''; invalidate(); render(); toast('Proposte applicate. Controlla l\'elenco di ciò che resta.');
  },
  imgPick(e) { applyImg(e.dataset.k); },
  page(e) { S.page = +e.dataset.i; S.sel = null; render(); },
  selClose() { S.sel = null; S.imgCtx = null; render(); },
  pin(e) { const o = offer(e.dataset.id); o.pin = !o.pin; S.sel = null; invalidate(); S.page = 0; render(); toast(o.pin ? 'Portato in copertina. Un\'altra offerta passa alla sua pagina.' : 'Tolto dalla copertina.'); },
  removeP(e) { offer(e.dataset.id).removed = true; S.sel = null; invalidate(); render(); toast('Tolto dal volantino. Lo rimetti dall\'elenco accanto.'); },
  restoreP(e) { offer(e.dataset.id).removed = false; invalidate(); render(); },
  imgOpen(e) { S.imgCtx = S.imgCtx && S.imgCtx.mode === 'sede' ? null : { mode: 'sede', id: e.dataset.id }; render(); },
  lock(e) { const k = e.dataset.k; S.locks[k] = !S.locks[k]; render(); toast(S.locks[k] ? 'Bloccato: i negozi non possono cambiarlo.' : 'Libero: i negozi possono cambiarlo.'); },
  view(e) { S.view = e.dataset.s; S.sel = null; S.imgCtx = null; S.page = 0; render(); },
  ovDates() { const o = ovOf(S.view); o.dal = $('#vdal').value.trim(); o.al = $('#val').value.trim(); if (!Plan.pd(o.dal) || !Plan.pd(o.al)) { toast('Scrivi le date come 24/11/2026.'); return; } render(); toast('Date salvate per questo negozio.'); },
  ovSave(e) {
    const L = S.locks, o = offer(e.dataset.id), ov = ovOf(S.view), it = ov.items[o.id] = ov.items[o.id] || {};
    if (!L.prezzi) { const n = Plan.num($('#ovp').value); if (isFinite(n) && n > 0 && n !== o.promo) { if (o.full && n >= o.full) { toast('Il prezzo in offerta deve restare sotto il prezzo pieno.'); return; } it.promo = n; } else delete it.promo; }
    if (!L.titoli) { const t = $('#ovt').value.trim(); if (t && t !== o.title) it.title = t; else delete it.title; }
    if (!Object.keys(it).length) delete ov.items[o.id];
    render(); toast('Modifica salvata solo per questo negozio.');
  },
  ovImg(e) { S.imgCtx = S.imgCtx && S.imgCtx.mode === 'store' ? null : { mode: 'store', id: e.dataset.id }; render(); },
  ovHide(e) { (ovOf(S.view).items[e.dataset.id] = ovOf(S.view).items[e.dataset.id] || {}).hidden = true; S.sel = null; render(); toast('Tolto dal volantino di questo negozio.'); },
  ovReset(e) { delete ovOf(S.view).items[e.dataset.id]; render(); },
  exp(e) { S.exp[e.dataset.k] = !S.exp[e.dataset.k]; S.gen = null; render(); },
  expStore(e) { S.expStores[e.dataset.s] = !S.expStores[e.dataset.s]; S.gen = null; render(); },
  storesAll(e) { ['sede', ...STORES.map(s => s.id)].forEach(i => S.expStores[i] = e.dataset.v === '1'); S.gen = null; render(); },
  dpi(e) { S.dpi = +e.dataset.v; S.gen = null; render(); },
  vector() { S.vector = !S.vector; S.gen = null; render(); },
  async gen() {
    const ids = ['sede', ...STORES.map(s => s.id)].filter(i => S.expStores[i]).map(i => i === 'sede' ? null : i);
    S.gen = { i: 0, total: 1, txt: 'Preparazione dei caratteri e delle immagini', done: false }; render();
    try {
      const res = await Export.exportAll({ formats: S.exp, stores: ids, dpi: S.dpi, vector: S.server && S.vector, slug: slug(S.name), pages: s => modelPages(s).map(p => p.html),
        onProgress: (i, t, txt) => { S.gen.i = i; S.gen.total = t; S.gen.txt = txt; const p = $('.prog i'); if (p) p.style.width = Math.round(i / Math.max(1, t) * 100) + '%'; const n = $('.prog + .note'); if (n) n.textContent = txt; } });
      res.files.forEach(f => f.url = URL.createObjectURL(f.blob));
      S.gen = { ...S.gen, done: true, files: res.files, zipUrl: res.zip ? URL.createObjectURL(res.zip) : '', txt: 'Fatto', i: S.gen.total };
    } catch (e) { S.gen = { ...S.gen, done: true, err: 'Qualcosa non è andato: ' + e.message }; }
    render();
  },
  again() { const keep = { server: S.server }; S = fresh(); S.server = keep.server; S.remembered = true; S.name = 'Settimana 49'; history.replaceState(null, '', '#file'); render(); toast('Nuova settimana. Le colonne di questo modello sono ricordate.'); }
};
document.addEventListener('click', ev => {
  const pidEl = ev.target.closest('.paper [data-pid]');
  if (pidEl && (S.step === 3 || S.step === 4)) { if (S.step === 4 && S.view === 'sede') return; const id = pidEl.dataset.pid; S.sel = S.sel === id ? null : id; S.imgCtx = null; render(); return; }
  const e = ev.target.closest('[data-a]'); if (!e || e.tagName === 'LABEL') return;
  const a = A[e.dataset.a]; if (a) { ev.preventDefault(); a(e); }
});
document.addEventListener('change', ev => {
  const e = ev.target, c = e.dataset && e.dataset.ch; if (!c) return;
  if (c === 'mapSel') { const f = e.dataset.f, v = +e.value; FIELDS.forEach(g => { if (g.k !== f && S.map[g.k] === v && v >= 0) { S.map[g.k] = -1; S.conf[g.k] = 'none'; } }); S.map[f] = v; S.conf[f] = v < 0 ? 'none' : 'ok'; S.dirty = true; render(); }
  if (c === 'file' && e.files[0]) readFile(e.files[0]);
  if (c === 'imgUp' && e.files[0]) { const fr = new FileReader(); fr.onload = () => applyImg(fr.result); fr.readAsDataURL(e.files[0]); }
  if (c === 'cfg') { S.cfg[e.dataset.f] = e.value; invalidate(); render(); }
  if (c === 'opt') { S.cfg[e.dataset.f] = e.checked; invalidate(); render(); }
});
document.addEventListener('input', ev => {
  const d = ev.target.dataset && ev.target.dataset.in; if (!d) return;
  if (d === 'name') { S.name = ev.target.value || 'Volantino'; $('#volName').textContent = S.name; }
  if (d === 'titolo') S.cfg.titolo = ev.target.value;
  if (d === 'sotto') S.cfg.sotto = ev.target.value;
});
async function readFile(f) {
  try { const rows = await Csvx.readFileTable(f); if (loadTable(rows, f.name)) render(); } catch (e) { toast(e.message); }
}
document.addEventListener('dragover', ev => { const d = ev.target.closest && ev.target.closest('#drop'); if (d) { ev.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', ev => { const d = ev.target.closest && ev.target.closest('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', ev => { const d = ev.target.closest && ev.target.closest('#drop'); if (d) { ev.preventDefault(); d.classList.remove('over'); if (ev.dataTransfer.files[0]) readFile(ev.dataTransfer.files[0]); } });
window.addEventListener('hashchange', () => { const i = STEPS.findIndex(s => '#' + s[0] === location.hash); if (i >= 0 && i !== S.step && i <= S.max) go(i); });
window.addEventListener('resize', fitAll);

(async function boot() {
  Export.serverAvailable().then(v => { S.server = v; if (S.step === 5) render(); });
  const i = STEPS.findIndex(s => '#' + s[0] === location.hash);
  if (i > 0) { await useSample(); S.conf.prezzo_pieno = 'ok'; Plan.buildOffers(S); S.chk = { i: CHECKS.length, done: true }; S.initIssues = new Set(Plan.openIssues(S).map(x => x.o.id)).size; S.max = i; S.step = i; }
  render();
})();
window.__A = { get S() { return S; }, go, A, modelPages, render, readFile, loadTable };
})();
