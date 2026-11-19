/* Folifly, editor a oggetti: l'interazione. Si monta in un contenitore con Editor.monta(el, cfg).
   La pagina è disegnata da Disegno (lo stesso HTML dell'uscita); sopra c'è un livello con selezione, maniglie e guide.
   Misure del documento in mm; lo schermo le scala. I controlli dell'editor usano l'attributo data-ed (mai data-a, che è del percorso).
   cfg: {doc, formato:0, pagina:0, ctx:(i)=>ctx, ruolo:'sede'|'negozio', puo:(o, azione)=>bool, onCambio:(doc, motivo), onSeleziona:(o|null),
         immagini:()=>[{src,nome}], carica:(file)=>Promise<url>, pannelloProdotto:(idOfferta)=>html|null, extra:()=>html} */
(function (g) {
'use strict';
const Doc = g.Doc, Dis = g.Disegno;
const PXMM = 96 / 25.4, MAX_STORIA = 60, SICUREZZA = 4;
const esc = Dis.esc;
const s = d => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = {
  testo: s('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
  immagine: s('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 8"/>'),
  forma: s('<rect x="3" y="11" width="9" height="9" rx="1"/><circle cx="16" cy="8" r="5"/>'),
  annulla: s('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  ripeti: s('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>'),
  su: s('<path d="M12 19V6M6 11l6-6 6 6"/>'),
  giu: s('<path d="M12 5v13M6 13l6 6 6-6"/>'),
  cima: s('<path d="M5 4h14M12 20V9M7 14l5-5 5 5"/>'),
  fondo: s('<path d="M5 20h14M12 4v11M7 10l5 5 5-5"/>'),
  duplica: s('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  elimina: s('<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  lucchetto: s('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  aperto: s('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
  meno: s('<path d="M5 12h14"/>'), piu: s('<path d="M12 5v14M5 12h14"/>'),
  avviso: s('<path d="M12 8v5M12 16.5v.5"/><path d="M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>'),
  esci: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  sx: s('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), cx: s('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'), dx: s('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>')
};
const TIPO = { testo: 'Testo', prezzo: 'Prezzo', sconto: 'Bollino', immagine: 'Immagine', forma: 'Forma', gruppo: 'Scheda prodotto' };
const CAMPI = { nome: 'il nome del prodotto', marca: 'la marca', formato: 'il formato', marca_formato: 'marca e formato', nome_formato: 'nome e formato', prezzo: 'il prezzo in offerta',
  barrato: 'il prezzo precedente', unitario: 'il prezzo per unità di misura', sconto: 'lo sconto', foto: 'la foto del catalogo', sottocosto: 'pezzi e limite del sottocosto',
  periodo: 'le date di validità', breve: 'le date di validità', breve_durata: 'date e durata', legale: 'il testo legale dell\'insegna', piede: 'negozio e numero di pagina',
  insegna: 'il nome dell\'insegna', logo: 'il logo dell\'insegna', sconto_max: 'lo sconto più alto', tipo: 'il tipo di negozio', web: 'il sito dell\'insegna' };
const STILI = ['font', 'peso', 'pt', 'col', 'alin', 'up', 'lh', 'ls', 'fill', 'bordo', 'raggio', 'clip', 'op', 'fit', 'src', 'nome', 'v', 'max', 'nowrap', 'ital', 'barr', 'posi'];
const MAN = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
/* parole della barra e degli avvisi: italiano, oppure inglese con cfg.lingua = 'en' (la landing in inglese). Il pannello resta in italiano. */
const PAROLE = { en: { 'Testo': 'Text', 'Immagine': 'Image', 'Forma': 'Shape', 'Annulla': 'Undo', 'Ripeti': 'Redo', 'Porta in cima': 'Bring to front', 'Porta avanti': 'Bring forward',
  'Porta indietro': 'Send backward', 'Porta in fondo': 'Send to back', 'Duplica': 'Duplicate', 'Elimina': 'Delete', 'Blocca per i negozi': 'Lock for stores', 'Bloccato per i negozi': 'Locked for stores',
  'Rimpicciolisci': 'Zoom out', 'Adatta alla larghezza': 'Fit', 'Ingrandisci': 'Zoom in', 'Rettangolo': 'Rectangle', 'Cerchio': 'Circle', "Bollino dell'insegna": 'Banner badge',
  'Carica una tua immagine': 'Upload your image', 'Bloccato dalla sede': 'Locked by head office', 'Bloccato dalla sede.': 'Locked by head office.', 'Strumenti dell\'editor': 'Editor tools',
  'Questo oggetto non si può spostare.': 'This object cannot be moved.', 'Bloccato: i negozi non possono cambiarlo.': 'Locked: stores cannot change it.', 'Libero: i negozi possono cambiarlo.': 'Open: stores can change it.',
  'Pagina da modificare. Frecce per spostare, Invio per scrivere, Canc per eliminare.': 'Page to edit. Arrows to move, Enter to type, Delete to remove.', 'Scrivi qui il tuo testo': 'Type your text here' } };
const r2 = v => Math.round(v * 100) / 100;
const ridotto = () => g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;

function monta(el, cfg) {
  const st = { doc: cfg.doc, fi: cfg.formato || 0, pi: cfg.pagina || 0, sel: [], gruppo: null, zoom: 1, storia: [], futuro: [], scrive: null, drag: null, k: 1, menu: '' };
  const ruolo = cfg.ruolo === 'negozio' ? 'negozio' : 'sede';
  const P_ = (PAROLE[cfg.lingua] || {}), tr = k => P_[k] || k;
  const puo = (o, a) => !cfg.puo || cfg.puo(o, a) !== false;
  const F = () => st.doc.formati[st.fi];
  const P = () => F().pagine[st.pi];
  const ctx = () => cfg.ctx ? cfg.ctx(st.pi) : {};
  el.innerHTML = `<div class="ed" data-ruolo="${ruolo}">
    <div class="ed-barra" role="toolbar" aria-label="${tr('Strumenti dell\'editor')}">
      <div class="ed-gr"><button type="button" data-ed="testo">${ICO.testo}<span>${tr('Testo')}</span></button><button type="button" data-ed="immagine" aria-expanded="false">${ICO.immagine}<span>${tr('Immagine')}</span></button><button type="button" data-ed="forma" aria-expanded="false">${ICO.forma}<span>${tr('Forma')}</span></button></div>
      <div class="ed-gr"><button type="button" data-ed="annulla" aria-label="${tr('Annulla')}" title="${tr('Annulla')} (Ctrl+Z)">${ICO.annulla}</button><button type="button" data-ed="ripeti" aria-label="${tr('Ripeti')}" title="${tr('Ripeti')} (Maiusc+Ctrl+Z)">${ICO.ripeti}</button></div>
      <div class="ed-gr"><button type="button" data-ed="cima" aria-label="${tr('Porta in cima')}" title="${tr('Porta in cima')}">${ICO.cima}</button><button type="button" data-ed="su" aria-label="${tr('Porta avanti')}" title="${tr('Porta avanti')}">${ICO.su}</button><button type="button" data-ed="giu" aria-label="${tr('Porta indietro')}" title="${tr('Porta indietro')}">${ICO.giu}</button><button type="button" data-ed="fondo" aria-label="${tr('Porta in fondo')}" title="${tr('Porta in fondo')}">${ICO.fondo}</button></div>
      <div class="ed-gr"><button type="button" data-ed="duplica" aria-label="${tr('Duplica')}" title="${tr('Duplica')} (Ctrl+D)">${ICO.duplica}</button><button type="button" data-ed="elimina" aria-label="${tr('Elimina')}" title="${tr('Elimina')} (Canc)">${ICO.elimina}</button></div>
      <div class="ed-gr"${ruolo === 'negozio' ? ' hidden' : ''}><button type="button" data-ed="blocca" aria-pressed="false"${ruolo === 'negozio' ? ' hidden' : ''}>${ICO.lucchetto}<span>${tr('Blocca per i negozi')}</span></button></div>
      <div class="ed-gr ed-zoom"><button type="button" data-ed="zoom-" aria-label="${tr('Rimpicciolisci')}">${ICO.meno}</button><button type="button" data-ed="adatta" class="ed-z" aria-label="${tr('Adatta alla larghezza')}">100%</button><button type="button" data-ed="zoom+" aria-label="${tr('Ingrandisci')}">${ICO.piu}</button></div>
    </div>
    <div class="ed-menu" data-menu="forma" hidden><button type="button" data-ed="nuova-forma" data-f="rett">${tr('Rettangolo')}</button><button type="button" data-ed="nuova-forma" data-f="cerchio">${tr('Cerchio')}</button><button type="button" data-ed="nuova-forma" data-f="bollino">${tr("Bollino dell'insegna")}</button></div>
    <div class="ed-menu" data-menu="immagine" hidden></div>
    <div class="ed-corpo">
      <div class="ed-tavolo" tabindex="0" aria-label="${tr('Pagina da modificare. Frecce per spostare, Invio per scrivere, Canc per eliminare.')}">
        <div class="ed-foglio"><div class="ed-pagina"></div><div class="ed-sopra"></div></div>
      </div>
      <aside class="ed-pannello" aria-label="Proprietà e livelli">
        <section class="ed-prop"></section>
        <section class="ed-liv-box"><h3 class="ed-h">Livelli</h3><div class="ed-livelli" role="list"></div></section>
        <div class="ed-extra"></div>
      </aside>
    </div>
    <div class="ed-annuncio" role="status" aria-live="polite"></div>
  </div>`;
  const root = el.querySelector('.ed'), $ = q => root.querySelector(q);
  const barra = $('.ed-barra'), tavolo = $('.ed-tavolo'), foglio = $('.ed-foglio'), pag = $('.ed-pagina'), sopra = $('.ed-sopra'), prop = $('.ed-prop'), livelli = $('.ed-livelli'), extra = $('.ed-extra');
  const annuncia = t => { const a = $('.ed-annuncio'); a.textContent = ''; setTimeout(() => { a.textContent = t; }, 30); };

  /* ---------- modello ---------- */
  const trova = id => Doc.trova(st.doc, id);
  const lista = padre => padre ? padre.figli : P().oggetti;
  const oggSel = () => st.sel.map(id => trova(id)).filter(Boolean);
  const scatta = () => { st.storia.push(JSON.stringify(st.doc)); if (st.storia.length > MAX_STORIA) st.storia.shift(); st.futuro = []; };
  const cambia = motivo => { if (cfg.onCambio) cfg.onCambio(st.doc, motivo); };
  function aggiornaGruppi(id) {
    let r = trova(id);
    while (r && r.padre) { const p = r.padre; Object.assign(p, Doc.bbox(p.figli)); r = trova(p.id); }
  }
  function sposta1(o, dx, dy) { o.x = r2(o.x + dx); o.y = r2(o.y + dy); if (o.t === 'gruppo') o.figli.forEach(f => sposta1(f, dx, dy)); }
  function scala1(o, ox, oy, f) {
    o.x = r2(ox + (o.x - ox) * f); o.y = r2(oy + (o.y - oy) * f); o.w = r2(o.w * f); o.h = r2(o.h * f);
    if (o.pt) o.pt = r2(o.pt * f);
    if (o.bordo && o.bordo.w) o.bordo = { ...o.bordo, w: r2(o.bordo.w * f) };
    if (o.raggio) o.raggio = r2(o.raggio * f);
    if (o.pad) o.pad = (Array.isArray(o.pad) ? o.pad : [o.pad]).map(v => r2(v * f));
    if (o.t === 'gruppo') o.figli.forEach(c => scala1(c, ox, oy, f));
  }
  function nuoviId(o) { o.id = Doc.nid(o.t === 'gruppo' ? 'g' : 'k'); if (o.figli) o.figli.forEach(nuoviId); return o; }

  /* ---------- disegno ---------- */
  function misura() {
    const W = F().w * PXMM, H = F().h * PXMM;
    // si parte con la pagina intera: in larghezza e, sul computer (area con altezza massima), anche in altezza
    const cs = getComputedStyle(tavolo), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const disp = Math.max(120, tavolo.clientWidth - pad), maxH = parseFloat(cs.maxHeight);
    let k = disp / W; if (isFinite(maxH) && maxH > 200) k = Math.min(k, (maxH - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / H);
    st.k = Math.max(0.1, k * st.zoom);
    foglio.style.width = (W * st.k) + 'px'; foglio.style.height = (H * st.k) + 'px';
    const p = pag.firstElementChild; if (p) { p.style.transform = `scale(${st.k})`; p.style.transformOrigin = '0 0'; }
    pag.scrollTop = 0; pag.scrollLeft = 0;   // la pagina si ritaglia ma non scorre mai (la selezione resterebbe spostata)
    $('.ed-z').textContent = Math.round(st.zoom * 100) + '%';
  }
  const S = () => st.k * PXMM;                   // px dello schermo per mm
  function disegna() {
    if (st.pi >= F().pagine.length) st.pi = Math.max(0, F().pagine.length - 1);
    st.sel = st.sel.filter(id => trova(id));
    if (st.gruppo && !trova(st.gruppo)) st.gruppo = null;
    pag.innerHTML = P() ? Dis.pagina(P(), F(), ctx(), { editor: true }) : '';
    misura(); sopraDisegna(); pannello(); strati(); bottoni();
  }
  function elementoDi(id) { return pag.querySelector(`[data-id="${CSS.escape(id)}"]`); }
  function rigenera(o) {
    // ridisegna un solo oggetto (durante le maniglie), con lo spostamento del gruppo che lo contiene
    const e = elementoDi(o.id); if (!e) return;
    const r = trova(o.id), ox = r && r.padre ? r.padre.x : 0, oy = r && r.padre ? r.padre.y : 0;
    const t = document.createElement('div'); t.innerHTML = Dis.oggetto(o, ctx(), { editor: true }, ox, oy);
    if (t.firstElementChild) e.replaceWith(t.firstElementChild);
  }
  function scatola(o) { const k = S(); return { l: o.x * k, t: o.y * k, w: o.w * k, h: o.h * k }; }
  function sopraDisegna(guide) {
    let h = '';
    const os = oggSel().map(r => r.o);
    if (st.gruppo) { const gr = trova(st.gruppo); if (gr) { const b = scatola(gr.o); h += `<div class="ed-gruppo-attivo" style="left:${b.l}px;top:${b.t}px;width:${b.w}px;height:${b.h}px"></div>`; } }
    os.forEach((o, i) => {
      const b = scatola(o), una = os.length === 1, blocc = !puo(o, 'sposta');
      const rot = o.r ? `;transform:rotate(${o.r}deg)` : '';
      h += `<div class="ed-sel${blocc ? ' bloccato' : ''}" data-sel="${esc(o.id)}" style="left:${b.l}px;top:${b.t}px;width:${b.w}px;height:${b.h}px${rot}">`;
      if (una && !blocc) {
        const lati = o.t === 'gruppo' || o.t === 'prezzo' ? ['nw', 'ne', 'se', 'sw'] : MAN;
        h += lati.map(m => `<span class="ed-man" data-m="${m}"></span>`).join('');
        if (o.t !== 'gruppo' && puo(o, 'ruota')) h += '<span class="ed-man ed-rot" data-m="rot" title="Ruota (Maiusc: passi di 15°)"></span>';
      }
      if (o.lock || blocc) h += `<span class="ed-lucchetto" title="${tr(ruolo === 'negozio' ? 'Bloccato dalla sede' : 'Bloccato per i negozi')}">${ICO.lucchetto}</span>`;
      h += '</div>';
      if (i === 0 && una) h += `<div class="ed-misure" style="left:${b.l}px;top:${b.t + b.h + 6}px">${r2(o.w)} × ${r2(o.h)} mm</div>`;
    });
    avvisi().filter(a => a.pagina === st.pi && a.formato === st.fi).forEach(a => {
      const r = trova(a.id); if (!r) return; const b = scatola(r.o);
      h += `<span class="ed-avviso-prezzo" style="left:${b.l + b.w - 10}px;top:${b.t - 10}px" title="${esc(a.msg)}">${ICO.avviso}</span>`;
    });
    (guide || []).forEach(gd => { h += gd.asse === 'x' ? `<i class="ed-guida v" style="left:${gd.v * S()}px"></i>` : `<i class="ed-guida o" style="top:${gd.v * S()}px"></i>`; });
    sopra.innerHTML = h;
  }

  /* ---------- pannello ---------- */
  const COLORI = ['c1', 'c2', 'ac', 'pr', 'ink', 'mute', 'paper', '#FFFFFF'];
  function campioni(campo, val, tema) {
    return `<div class="ed-campioni" role="group" aria-label="Colore">${COLORI.map(c => `<button type="button" class="ed-campione${val === c ? ' on' : ''}" data-ed="colore" data-campo="${campo}" data-v="${c}" style="background:${Doc.colore(c, tema) || c}" aria-label="${c}" aria-pressed="${val === c}"></button>`).join('')}
      <label class="ed-colore-libero" title="Altro colore"><input type="color" data-campo-c="${campo}" value="${/^#[0-9a-f]{6}$/i.test(Doc.colore(val, tema)) ? Doc.colore(val, tema) : '#000000'}" aria-label="Altro colore"></label></div>`;
  }
  const num = (campo, v, lab, passo, dis) => `<label class="ed-num"><span>${lab}</span><input type="number" inputmode="decimal" step="${passo || 0.5}" data-campo="${campo}" value="${r2(v || 0)}"${dis ? ' disabled' : ''}></label>`;
  function pannello() {
    const os = oggSel(), tema = ctx().tema || {};
    let h = '';
    if (!os.length) {
      h = `<h3 class="ed-h">Pagina ${st.pi + 1}</h3><p class="ed-nota">Tocca un oggetto nella pagina per cambiarlo. Doppio clic su una scheda per spostarne i pezzi. Con Alt premuto le calamite si spengono.</p>`;
    } else if (os.length > 1) {
      h = `<h3 class="ed-h">${os.length} oggetti selezionati</h3><p class="ed-nota">Trascinali insieme, oppure usa la barra per duplicarli, eliminarli${ruolo === 'sede' ? ' o bloccarli' : ''}.</p>`;
    } else {
      const { o, padre } = os[0], lib = puo(o, 'sposta'), stile = puo(o, 'stile');
      h += `<div class="ed-ptitolo"><span class="ed-tipo">${TIPO[o.t] || 'Oggetto'}</span><h3 class="ed-h">${esc(o.nome || TIPO[o.t] || 'Oggetto')}</h3></div>`;
      if (ruolo === 'negozio' && (o.lock || !lib)) h += `<div class="ed-blocco">${ICO.lucchetto}<span>Bloccato dalla sede: non puoi spostarlo né cambiarlo.</span></div>`;
      if (ruolo === 'sede') h += `<button type="button" class="ed-interruttore" data-ed="blocca" aria-pressed="${!!o.lock}">${o.lock ? ICO.lucchetto : ICO.aperto}<span>${o.lock ? 'Bloccato per i negozi' : 'I negozi possono cambiarlo'}</span></button>`;
      if (o.bind && o.bind.f && o.t !== 'gruppo') h += `<div class="ed-dati">${ICO.lucchetto}<span>Collegato ai dati: mostra ${CAMPI[o.bind.f] || 'un dato'}. Il contenuto viene dai dati e si cambia nei dati, non qui.</span></div>`;
      const offerta = o.bind && typeof o.bind.o === 'string' ? o.bind.o : (padre && padre.bind && typeof padre.bind.o === 'string' ? padre.bind.o : null);
      if (offerta && cfg.pannelloProdotto) { const pp = cfg.pannelloProdotto(offerta); if (pp) h += `<div class="ed-prodotto">${pp}</div>`; }
      if (o.t === 'gruppo') h += `<p class="ed-nota">Doppio clic sulla scheda per spostare foto, nome e prezzo uno per uno.</p>`;
      if (padre) h += `<button type="button" class="ed-link" data-ed="esci-gruppo">${ICO.esci}<span>Torna alla scheda intera</span></button>`;
      h += `<div class="ed-sez"><span class="ed-lbl">Posizione e misura (mm)</span><div class="ed-griglia">${num('x', o.x, 'X', 0.5, !lib)}${num('y', o.y, 'Y', 0.5, !lib)}${num('w', o.w, 'Largh.', 0.5, !lib)}${num('h', o.h, 'Alt.', 0.5, !lib)}${o.t !== 'gruppo' ? num('r', o.r || 0, 'Rotaz. °', 1, !lib || !puo(o, 'ruota')) : ''}</div></div>`;
      if (o.t === 'testo' && !o.bind) h += `<div class="ed-sez"><label class="ed-lbl" for="ed-testo">Testo</label><textarea id="ed-testo" rows="3" data-campo="s"${puo(o, 'testo') ? '' : ' disabled'}>${esc(o.s || '')}</textarea><span class="ed-nota">Per il grassetto: **parola**. I prezzi non si scrivono qui: aggiungi un prodotto.</span></div>`;
      if (['testo', 'prezzo', 'sconto'].includes(o.t)) {
        h += `<div class="ed-sez"><span class="ed-lbl">Carattere</span><div class="ed-griglia">
          <label class="ed-num ed-largo"><span>Famiglia</span><select data-campo="font"${stile ? '' : ' disabled'}><option value="fd"${o.font === 'fd' ? ' selected' : ''}>Titoli dell'insegna</option><option value="fb"${o.font !== 'fd' ? ' selected' : ''}>Testo (Inter)</option></select></label>
          ${num('pt', o.pt || 12, 'Corpo pt', 0.5, !stile)}
          ${o.t === 'testo' ? `<label class="ed-num"><span>Peso</span><select data-campo="peso"${stile ? '' : ' disabled'}>${[400, 500, 600, 700, 800].map(p => `<option value="${p}"${(+o.peso || (o.font === 'fd' ? +tema.fw || 400 : 400)) === p ? ' selected' : ''}>${p}</option>`).join('')}</select></label>` : ''}
        </div>${campioni('col', o.col, tema)}
        ${o.t === 'testo' ? `<div class="ed-allinea" role="group" aria-label="Allineamento">${['left', 'center', 'right'].map((a, i) => `<button type="button" data-ed="allinea" data-v="${a}" aria-pressed="${(o.alin || 'left') === a}" aria-label="${['A sinistra', 'Al centro', 'A destra'][i]}"${stile ? '' : ' disabled'}>${[ICO.sx, ICO.cx, ICO.dx][i]}</button>`).join('')}<button type="button" data-ed="maiuscolo" aria-pressed="${!!o.up}"${stile ? '' : ' disabled'}>AA</button></div>` : ''}</div>`;
      }
      if (o.t === 'forma' || o.t === 'sconto' || (o.t === 'testo' && o.fill)) {
        h += `<div class="ed-sez"><span class="ed-lbl">Riempimento</span>${/^linear-gradient/.test(o.fill || '') ? '<p class="ed-nota">Sfumatura del modello.</p>' : ''}${campioni('fill', o.fill, tema)}</div>`;
      }
      if (o.t === 'forma') h += `<div class="ed-sez"><div class="ed-griglia">${num('bordo', o.bordo ? o.bordo.w : 0, 'Bordo mm', 0.1, !stile)}${num('raggio', o.raggio || 0, 'Angoli mm', 0.5, !stile)}
        <label class="ed-num ed-largo"><span>Forma</span><select data-campo="clip"${stile ? '' : ' disabled'}><option value=""${!o.clip ? ' selected' : ''}>Rettangolo</option><option value="circle(50% at 50% 50%)"${/^circle/.test(o.clip || '') ? ' selected' : ''}>Cerchio</option><option value="tema"${o.clip === 'tema' ? ' selected' : ''}>Bollino dell'insegna</option></select></label></div></div>`;
      if (o.t === 'immagine' && !o.bind) h += `<div class="ed-sez"><div class="ed-griglia"><label class="ed-num ed-largo"><span>Adatta</span><select data-campo="fit"${stile ? '' : ' disabled'}><option value="contain"${o.fit === 'contain' ? ' selected' : ''}>Intera</option><option value="cover"${o.fit !== 'contain' ? ' selected' : ''}>Riempi il riquadro</option></select></label></div>
        <button type="button" class="ed-link" data-ed="immagine"${stile ? '' : ' disabled'}>${ICO.immagine}<span>Cambia immagine</span></button></div>`;
      if (o.t !== 'gruppo') h += `<div class="ed-sez"><div class="ed-griglia">${num('op', Math.round((o.op == null ? 1 : o.op) * 100), 'Opacità %', 5, !stile)}</div></div>`;
    }
    prop.innerHTML = h;
    if (cfg.extra) extra.innerHTML = cfg.extra() || '';
  }
  function strati() {
    const gr = st.gruppo ? trova(st.gruppo) : null, l = (gr ? gr.o.figli : (P() ? P().oggetti : [])).slice().reverse();
    livelli.innerHTML = (gr ? `<div class="ed-liv" role="listitem"><button type="button" class="ed-liv-nome" data-ed="esci-gruppo">${ICO.esci}<span>Esci dalla scheda</span></button></div>` : '') + l.map(o => {
      const on = st.sel.includes(o.id), bl = o.lock || !puo(o, 'sposta');
      const lucc = ruolo === 'sede' ? `<button type="button" class="ed-liv-lk" tabindex="-1" data-ed="blocca-uno" data-id="${esc(o.id)}" aria-pressed="${!!o.lock}" aria-label="${o.lock ? 'Sblocca' : 'Blocca'} per i negozi">${o.lock ? ICO.lucchetto : ICO.aperto}</button>` : (bl ? `<span class="ed-liv-lk" title="Bloccato dalla sede">${ICO.lucchetto}</span>` : '');
      return `<div class="ed-liv${on ? ' on' : ''}" role="listitem"><button type="button" class="ed-liv-nome" data-ed="scegli" data-id="${esc(o.id)}" aria-pressed="${on}"><span class="ed-tipo">${TIPO[o.t] || ''}</span><span>${esc(o.nome || TIPO[o.t] || 'Oggetto')}</span></button>${lucc}</div>`;
    }).join('');
  }
  function bottoni() {
    const os = oggSel(), uno = os.length > 0, lib = os.every(r => puo(r.o, 'sposta'));
    const set = (a, on) => { const b = barra.querySelector(`[data-ed="${a}"]`); if (b) b.disabled = !on; };
    set('annulla', st.storia.length > 0); set('ripeti', st.futuro.length > 0);
    ['cima', 'su', 'giu', 'fondo', 'duplica'].forEach(a => set(a, uno && lib)); set('elimina', uno && os.every(r => puo(r.o, 'elimina')));
    const bl = barra.querySelector('[data-ed="blocca"]'); if (bl) { bl.disabled = !uno; const tutti = uno && os.every(r => r.o.lock); bl.setAttribute('aria-pressed', String(tutti)); bl.innerHTML = (tutti ? ICO.lucchetto : ICO.aperto) + `<span>${tr(tutti ? 'Bloccato per i negozi' : 'Blocca per i negozi')}</span>`; }
    ['testo', 'immagine', 'forma'].forEach(a => set(a, puo({ t: a }, 'aggiungi')));
  }

  /* ---------- selezione ---------- */
  function seleziona(ids, piu) {
    ids = (Array.isArray(ids) ? ids : ids ? [ids] : []).filter(id => trova(id));
    if (piu) { ids.forEach(id => { st.sel = st.sel.includes(id) ? st.sel.filter(x => x !== id) : [...st.sel, id]; }); }
    else st.sel = ids;
    if (st.sel.length === 1) { const r = trova(st.sel[0]); st.gruppo = r && r.padre ? r.padre.id : (st.gruppo === st.sel[0] ? null : (r && r.padre ? r.padre.id : null)); }
    else if (!st.sel.length) { /* resta nel gruppo */ }
    sopraDisegna(); pannello(); strati(); bottoni();
    if (cfg.onSeleziona) cfg.onSeleziona(st.sel.length === 1 ? trova(st.sel[0]).o : null);
  }
  function catena(e) { const c = []; while (e && e !== pag) { if (e.dataset && e.dataset.id) c.push(e.dataset.id); e = e.parentElement; } return c; }
  function scegliDa(e) {
    const c = catena(e); if (!c.length) return null;
    if (st.gruppo && c.includes(st.gruppo)) { const i = c.indexOf(st.gruppo); return i > 0 ? c[i - 1] : st.gruppo; }
    return c[c.length - 1];
  }
  function sotto(x, y) {
    const tutti = document.elementsFromPoint(x, y).filter(e => pag.contains(e) && e !== pag);
    return tutti.find(e => e.closest('[data-id]')) || null;
  }

  /* ---------- azioni ---------- */
  function esegui(motivo, fn, ids) {
    scatta(); fn(); (ids || st.sel).forEach(aggiornaGruppi); disegna(); cambia(motivo);
  }
  function scuoti() {
    const b = sopra.querySelector('.ed-sel'), l = sopra.querySelector('.ed-lucchetto');
    [b, l].forEach(x => { if (!x) return; x.classList.remove('ed-scuoti', 'scuoti'); void x.offsetWidth; x.classList.add('ed-scuoti', 'scuoti'); });
    annuncia(tr(ruolo === 'negozio' ? 'Bloccato dalla sede.' : 'Questo oggetto non si può spostare.'));
  }
  const API = {
    sposta(id, dx, dy) { const r = trova(id); if (!r || !puo(r.o, 'sposta')) return false; esegui('sposta', () => sposta1(r.o, dx, dy), [id]); return true; },
    ridimensiona(id, b) {
      const r = trova(id); if (!r || !puo(r.o, 'misura')) return false;
      esegui('misura', () => { const o = r.o; if (o.t === 'gruppo') { const f = b.w / o.w; scala1(o, o.x, o.y, f); sposta1(o, b.x - o.x, b.y - o.y); } else Object.assign(o, { x: r2(b.x), y: r2(b.y), w: r2(Math.max(1, b.w)), h: r2(Math.max(1, b.h)) }); }, [id]);
      return true;
    },
    ruota(id, gradi) { const r = trova(id); if (!r || r.o.t === 'gruppo' || !puo(r.o, 'ruota')) return false; esegui('ruota', () => { r.o.r = ((Math.round(gradi * 10) / 10) % 360 + 360) % 360; if (r.o.r > 180) r.o.r -= 360; if (!r.o.r) delete r.o.r; }, [id]); return true; },
    aggiungi(tipo, opz) {
      opz = opz || {};
      if (!puo({ t: tipo }, 'aggiungi')) return null;
      const W = F().w, H = F().h, cx = opz.x != null ? opz.x : W / 2, cy = opz.y != null ? opz.y : H / 3;
      let o;
      if (tipo === 'testo') o = { t: 'testo', nome: opz.nome || (opz.s ? String(opz.s).replace(/\*\*/g, '').replace(/\n/g, ' ').slice(0, 32) : tr('Testo')), s: opz.s || tr('Scrivi qui il tuo testo'), font: opz.font || 'fd', pt: opz.pt || 28, col: opz.col || 'ink', lh: 1.05, x: cx, y: cy, w: opz.w || Math.min(120, W * 0.6), h: opz.h || 14 };
      else if (tipo === 'immagine') o = { t: 'immagine', nome: opz.nome || 'Immagine', src: opz.src, fit: opz.fit || 'contain', x: cx, y: cy, w: opz.w || 50, h: opz.h || 50 };
      else if (tipo === 'forma') o = { t: 'forma', nome: opz.forma === 'cerchio' ? 'Cerchio' : opz.forma === 'bollino' ? 'Bollino' : 'Rettangolo', fill: opz.fill || (opz.forma === 'bollino' ? 'pr' : 'ac'), x: cx, y: cy, w: opz.w || 40, h: opz.h || (opz.forma === 'rett' || !opz.forma ? 24 : 40), ...(opz.forma === 'cerchio' ? { clip: 'circle(50% at 50% 50%)' } : opz.forma === 'bollino' ? { clip: 'tema' } : {}) };
      else if (tipo === 'prodotto') o = Doc.scheda(opz.o, { x: cx, y: cy, w: opz.w || 58, h: opz.h || 70 }, opz.variante || 'verticale');
      else return null;
      if (opz.x == null && tipo !== 'prodotto') o.x = r2(cx - o.w / 2);
      o.id = Doc.nid(o.t === 'gruppo' ? 'g' : 'k'); if (o.figli) o.figli.forEach(nuoviId);
      if (ruolo === 'negozio') o.negozio = true;
      st.gruppo = null;
      esegui('aggiungi', () => P().oggetti.push(o), []);
      seleziona(o.id);
      const e = elementoDi(o.id); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return o.id;
    },
    elimina(ids) {
      ids = (ids || st.sel).filter(id => { const r = trova(id); return r && puo(r.o, 'elimina'); }); if (!ids.length) return false;
      const padri = ids.map(id => trova(id).padre).filter(Boolean).map(p => p.id);
      esegui('elimina', () => ids.forEach(id => { const r = trova(id); const l = lista(r.padre); l.splice(l.indexOf(r.o), 1); }), []);
      padri.forEach(id => { const r = trova(id); if (r) { if (!r.o.figli.length) { const l = lista(r.padre); l.splice(l.indexOf(r.o), 1); } else aggiornaGruppi(r.o.figli[0].id); } });
      st.sel = []; disegna(); return true;
    },
    duplica(ids) {
      ids = (ids || st.sel).filter(id => { const r = trova(id); return r && puo(r.o, 'sposta'); }); if (!ids.length) return [];
      const nuovi = [];
      esegui('duplica', () => ids.forEach(id => { const r = trova(id), c = nuoviId(Doc.clona(r.o)); delete c.lock; if (ruolo === 'negozio') c.negozio = true; sposta1(c, 5, 5); const l = lista(r.padre); l.splice(l.indexOf(r.o) + 1, 0, c); nuovi.push(c.id); }), ids);
      seleziona(nuovi); return nuovi;
    },
    ordine(id, dove) {
      const r = trova(id); if (!r || !puo(r.o, 'sposta')) return false;
      esegui('ordine', () => { const l = lista(r.padre), i = l.indexOf(r.o); l.splice(i, 1); const j = dove === 'cima' ? l.length : dove === 'fondo' ? 0 : dove === 'su' ? Math.min(l.length, i + 1) : Math.max(0, i - 1); l.splice(j, 0, r.o); }, [id]);
      return true;
    },
    testo(id, t) { const r = trova(id); if (!r || r.o.t !== 'testo' || r.o.bind || !puo(r.o, 'testo')) return false; t = String(t).replace(/\r\n?/g, '\n').slice(0, 2000); if (t === r.o.s) return false; esegui('testo', () => { r.o.s = t; }, [id]); return true; },
    stile(id, campi) {
      const r = trova(id); if (!r || !puo(r.o, 'stile')) return false;
      esegui('stile', () => Object.keys(campi).forEach(k => { if (!STILI.includes(k)) return; if (campi[k] === '' || campi[k] == null) delete r.o[k]; else r.o[k] = campi[k]; }), [id]);
      return true;
    },
    blocca(ids, si) { if (ruolo !== 'sede') return false; ids = ids || st.sel; esegui('blocca', () => ids.forEach(id => { const r = trova(id); if (r) { if (si) r.o.lock = true; else delete r.o.lock; } }), ids); return true; },
    // modifica fatta da fuori (piattaforma: pagine aggiunte, ricomposte, spostate): si annulla come le altre
    modifica(fn, motivo) { esegui(motivo || 'modifica', () => fn(st.doc), []); return true; },
    annulla() { if (!st.storia.length) return false; st.futuro.push(JSON.stringify(st.doc)); st.doc = JSON.parse(st.storia.pop()); disegna(); cambia('annulla'); return true; },
    ripeti() { if (!st.futuro.length) return false; st.storia.push(JSON.stringify(st.doc)); st.doc = JSON.parse(st.futuro.pop()); disegna(); cambia('ripeti'); return true; }
  };

  /* ---------- avvisi: prezzi scritti a mano ---------- */
  function avvisi() {
    const out = [];
    (st.doc.formati || []).forEach((f, fi) => (f.pagine || []).forEach((p, pi) => Doc.ogni(p, o => {
      if (o.t === 'testo' && !o.bind && !o.nasc && Doc.prezzoNelTesto(o.s)) out.push({ id: o.id, formato: fi, pagina: pi, msg: 'Prezzo scritto a mano: i controlli di legge non lo vedono. Usa un prodotto collegato ai dati.' });
    })));
    return out;
  }

  /* ---------- scrittura dei testi ---------- */
  function scrivi(id) {
    const r = trova(id); if (!r || r.o.t !== 'testo' || r.o.bind) { if (r && r.o.bind) annuncia('Questo testo viene dai dati: si cambia nei dati.'); return; }
    if (!puo(r.o, 'testo')) { scuoti(); return; }
    const e = elementoDi(id); if (!e) return;
    let tx = e.querySelector('.tx');
    if (!tx) { e.innerHTML = '<div class="tx"></div>'; tx = e.querySelector('.tx'); }
    st.scrive = id; e.classList.add('ed-scrive');
    tx.textContent = r.o.s || ''; tx.setAttribute('contenteditable', 'true'); tx.setAttribute('spellcheck', 'true');
    // mentre si scrive: niente maiuscolo automatico (si salvano le lettere come sono scritte) e a capo visibili
    tx.style.webkitLineClamp = 'unset'; tx.style.display = 'block'; tx.style.textTransform = 'none'; tx.style.whiteSpace = 'pre-wrap';
    tx.focus();
    const rg = document.createRange(); rg.selectNodeContents(tx); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg);
    const fine = () => { tx.removeEventListener('blur', fine); if (st.scrive !== id) return; st.scrive = null; const t = tx.innerText.replace(/\n$/, ''); if (!API.testo(id, t)) disegna(); tavolo.focus({ preventScroll: true }); };
    tx.addEventListener('blur', fine);
    tx.addEventListener('keydown', ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fine(); } }, { once: false });
    sopra.innerHTML = '';
  }

  /* ---------- trascinamenti ---------- */
  function calamite(b, escludi) {
    const W = F().w, H = F().h, thr = 6 / S();
    const pagX = [0, W / 2, W, SICUREZZA, W - SICUREZZA], pagY = [0, H / 2, H, SICUREZZA, H - SICUREZZA];
    const altriX = [], altriY = [];
    P().oggetti.forEach(o => { if (escludi.includes(o.id) || o.nasc) return; altriX.push(o.x, o.x + o.w / 2, o.x + o.w); altriY.push(o.y, o.y + o.h / 2, o.y + o.h); });
    const best = (vals, cand) => { let m = null; vals.forEach(v => cand.forEach(c => { const d = c - v; if (Math.abs(d) <= thr && (!m || Math.abs(d) < Math.abs(m.d))) m = { d, v: c }; })); return m; };
    const xs = [b.x, b.x + b.w / 2, b.x + b.w], ys = [b.y, b.y + b.h / 2, b.y + b.h];
    const gx = best(xs, pagX) || best(xs, altriX), gy = best(ys, pagY) || best(ys, altriY);
    return { dx: gx ? gx.d : 0, dy: gy ? gy.d : 0, guide: [...(gx ? [{ asse: 'x', v: gx.v }] : []), ...(gy ? [{ asse: 'y', v: gy.v }] : [])] };
  }
  function puntoMm(ev) { const r = foglio.getBoundingClientRect(); return { x: (ev.clientX - r.left) / S(), y: (ev.clientY - r.top) / S() }; }
  function iniziaSposta(ev) {
    const os = oggSel(); if (!os.length) return;
    st.drag = { tipo: 'sposta', id: ev.pointerId, p0: { x: ev.clientX, y: ev.clientY }, os: os.map(r => ({ id: r.o.id, b: { x: r.o.x, y: r.o.y, w: r.o.w, h: r.o.h } })), mosso: false, bloccato: !os.every(r => puo(r.o, 'sposta')) };
    try { foglio.setPointerCapture(ev.pointerId); } catch (e) {}
  }
  function iniziaManiglia(ev, m) {
    const r = trova(st.sel[0]); if (!r) return;
    st.drag = { tipo: m === 'rot' ? 'ruota' : 'misura', m, id: ev.pointerId, p0: puntoMm(ev), o0: Doc.clona(r.o), mosso: false };
    try { foglio.setPointerCapture(ev.pointerId); } catch (e) {}
  }
  function muovi(ev) {
    const d = st.drag; if (!d || ev.pointerId !== d.id) return;
    if (d.tipo === 'sposta') {
      const dxp = ev.clientX - d.p0.x, dyp = ev.clientY - d.p0.y;
      if (!d.mosso && Math.hypot(dxp, dyp) < 3) return;
      if (!d.mosso && d.bloccato) { d.mosso = true; scuoti(); return; }
      if (d.bloccato) return;
      d.mosso = true;
      let dx = dxp / S(), dy = dyp / S(), guide = [];
      if (!ev.altKey) { const b = Doc.bbox(d.os.map(o => ({ ...o.b, x: o.b.x + dx, y: o.b.y + dy }))); const c = calamite(b, d.os.map(o => o.id)); dx += c.dx; dy += c.dy; guide = c.guide; }
      d.dx = dx; d.dy = dy;
      d.os.forEach(o => { const e = elementoDi(o.id); if (e) e.style.translate = `${dx}mm ${dy}mm`; });
      const k = S(); sopra.querySelectorAll('.ed-sel').forEach(b => { b.style.translate = `${dx * k}px ${dy * k}px`; });
      sopra.querySelectorAll('.ed-guida').forEach(x => x.remove());
      guide.forEach(gd => sopra.insertAdjacentHTML('beforeend', gd.asse === 'x' ? `<i class="ed-guida v" style="left:${gd.v * k}px"></i>` : `<i class="ed-guida o" style="top:${gd.v * k}px"></i>`));
      return;
    }
    const p = puntoMm(ev), o0 = d.o0, r = trova(o0.id); if (!r) return;
    d.mosso = true;
    if (d.tipo === 'ruota') {
      const cx = o0.x + o0.w / 2, cy = o0.y + o0.h / 2; let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15;
      d.fine = { r: Math.round(a * 10) / 10 }; const t = { ...Doc.clona(o0), r: d.fine.r }; rigenera(t); sopraTemp(t); return;
    }
    // misura: angoli proporzionali per foto, schede, prezzi, bollini e testi; lati liberi
    const m = d.m, dx = p.x - d.p0.x, dy = p.y - d.p0.y;
    let x = o0.x, y = o0.y, w = o0.w, h = o0.h;
    if (m.includes('e')) w = o0.w + dx; if (m.includes('w')) { w = o0.w - dx; x = o0.x + dx; }
    if (m.includes('s')) h = o0.h + dy; if (m.includes('n')) { h = o0.h - dy; y = o0.y + dy; }
    const angolo = m.length === 2, prop = angolo && (['immagine', 'gruppo', 'prezzo', 'sconto', 'testo'].includes(o0.t) ? !ev.shiftKey : ev.shiftKey);
    if (prop) {
      const f = Math.max(w / o0.w, h / o0.h); w = o0.w * f; h = o0.h * f;
      if (m.includes('w')) x = o0.x + o0.w - w; if (m.includes('n')) y = o0.y + o0.h - h;
    }
    w = Math.max(2, w); h = Math.max(2, h);
    const t = Doc.clona(o0);
    if (o0.t === 'gruppo' || (prop && ['testo', 'prezzo', 'sconto'].includes(o0.t))) { scala1(t, o0.x, o0.y, w / o0.w); sposta1(t, x - o0.x, y - o0.y); }
    else Object.assign(t, { x, y, w, h });
    d.fine = t; rigenera(t); sopraTemp(t);
  }
  function sopraTemp(t) { const b = scatola(t), e = sopra.querySelector('.ed-sel'); if (e) Object.assign(e.style, { left: b.l + 'px', top: b.t + 'px', width: b.w + 'px', height: b.h + 'px', transform: t.r ? `rotate(${t.r}deg)` : '' }); const mi = sopra.querySelector('.ed-misure'); if (mi) { mi.textContent = `${r2(t.w)} × ${r2(t.h)} mm`; mi.style.left = b.l + 'px'; mi.style.top = (b.t + b.h + 6) + 'px'; } }
  function lascia(ev) {
    const d = st.drag; if (!d || ev.pointerId !== d.id) return; st.drag = null;
    try { foglio.releasePointerCapture(ev.pointerId); } catch (e) {}
    if (!d.mosso || d.bloccato) { if (d.tipo !== 'sposta') disegna(); return; }
    if (d.tipo === 'sposta') {
      if (!d.dx && !d.dy) { disegna(); return; }
      esegui('sposta', () => d.os.forEach(o => { const r = trova(o.id); if (r) sposta1(r.o, d.dx, d.dy); }), d.os.map(o => o.id));
      return;
    }
    if (d.tipo === 'ruota') { API.ruota(d.o0.id, d.fine ? d.fine.r : d.o0.r || 0); return; }
    if (d.fine) { const t = d.fine; esegui('misura', () => { const r = trova(t.id); const l = lista(r.padre); l[l.indexOf(r.o)] = t; }, [t.id]); }
  }

  /* ---------- eventi ---------- */
  foglio.addEventListener('pointerdown', ev => {
    if (ev.button > 0 || st.scrive) return;
    tavolo.focus({ preventScroll: true });
    const man = ev.target.closest('.ed-man');
    if (man) { ev.preventDefault(); iniziaManiglia(ev, man.dataset.m); return; }
    const box = ev.target.closest('.ed-sel');
    if (box) {
      if (ev.shiftKey) { const e = sotto(ev.clientX, ev.clientY); const id = e && scegliDa(e); if (id) seleziona(id, true); return; }
      ev.preventDefault(); iniziaSposta(ev); return;
    }
    const e = ev.target.closest('.ed-pagina [data-id]');
    if (!e) { if (st.sel.length || st.gruppo) { st.gruppo = null; seleziona([]); } return; }
    const id = scegliDa(e);
    if (st.gruppo && !catena(e).includes(st.gruppo)) st.gruppo = null;
    seleziona(id, ev.shiftKey);
    if (ev.pointerType !== 'touch' && !ev.shiftKey) { ev.preventDefault(); iniziaSposta(ev); }
  });
  foglio.addEventListener('pointermove', muovi);
  foglio.addEventListener('pointerup', lascia);
  foglio.addEventListener('pointercancel', ev => { if (st.drag && st.drag.id === ev.pointerId) { st.drag = null; disegna(); } });
  foglio.addEventListener('dblclick', ev => {
    const e = sotto(ev.clientX, ev.clientY); if (!e) return;
    const c = catena(e); if (!c.length) return;
    const top = trova(c[c.length - 1]);
    if (top && top.o.t === 'gruppo' && st.gruppo !== top.o.id) { st.gruppo = top.o.id; const i = c.indexOf(top.o.id); seleziona(i > 0 ? c[i - 1] : top.o.id); return; }
    const id = scegliDa(e), r = trova(id);
    if (r && r.o.t === 'testo') { seleziona(id); scrivi(id); }
  });
  root.addEventListener('keydown', ev => {
    const t = ev.target, campo = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
    if (campo) return;
    const mod = ev.ctrlKey || ev.metaKey, k = ev.key;
    if (mod && (k === 'z' || k === 'Z')) { ev.preventDefault(); ev.shiftKey ? API.ripeti() : API.annulla(); return; }
    if (mod && (k === 'y' || k === 'Y')) { ev.preventDefault(); API.ripeti(); return; }
    if (mod && (k === 'd' || k === 'D')) { ev.preventDefault(); API.duplica(); return; }
    if (k.startsWith('Arrow') && st.sel.length) {
      ev.preventDefault(); const p = ev.shiftKey ? 10 : 1, dx = k === 'ArrowLeft' ? -p : k === 'ArrowRight' ? p : 0, dy = k === 'ArrowUp' ? -p : k === 'ArrowDown' ? p : 0;
      const os = oggSel(); if (!os.every(r => puo(r.o, 'sposta'))) { scuoti(); return; }
      esegui('sposta', () => os.forEach(r => sposta1(r.o, dx, dy))); return;
    }
    if ((k === 'Delete' || k === 'Backspace') && st.sel.length) { ev.preventDefault(); if (!API.elimina()) scuoti(); return; }
    if (k === 'Escape') { if (st.gruppo) { const gid = st.gruppo; st.gruppo = null; seleziona(gid); } else if (st.sel.length) seleziona([]); return; }
    if (k === 'Enter' && t.tagName !== 'BUTTON' && st.sel.length === 1) {
      const r = trova(st.sel[0]); ev.preventDefault();
      if (r.o.t === 'gruppo') { st.gruppo = r.o.id; seleziona(r.o.figli.length ? r.o.figli[r.o.figli.length - 1].id : r.o.id); }
      else if (r.o.t === 'testo') scrivi(r.o.id);
      return;
    }
    if (k === 'Tab' && t === tavolo) {
      const l = (st.gruppo ? trova(st.gruppo).o.figli : P().oggetti).filter(o => !o.nasc), i = l.findIndex(o => o.id === st.sel[0]);
      const j = i + (ev.shiftKey ? -1 : 1); if (j < 0 || j >= l.length) return;
      ev.preventDefault(); seleziona(l[j].id); annuncia((l[j].nome || TIPO[l[j].t]) + ' selezionato');
    }
  });
  root.addEventListener('click', ev => {
    const b = ev.target.closest('[data-ed]'); if (!b || b.disabled || !root.contains(b)) return;
    const a = b.dataset.ed;
    const chiudiMenu = () => { root.querySelectorAll('.ed-menu').forEach(m => m.hidden = true); barra.querySelectorAll('[aria-expanded]').forEach(x => x.setAttribute('aria-expanded', 'false')); };
    if (a === 'testo') { chiudiMenu(); const W = F().w; const id = API.aggiungi('testo', { x: W * 0.2, y: F().h * 0.4 }); if (id) setTimeout(() => scrivi(id), 0); }
    else if (a === 'forma' || a === 'immagine') {
      const m = root.querySelector(`.ed-menu[data-menu="${a}"]`), aperto = !m.hidden; chiudiMenu();
      if (!aperto) {
        if (a === 'immagine') m.innerHTML = (cfg.immagini ? cfg.immagini() : []).slice(0, 60).map(i => `<button type="button" class="ed-img" data-ed="nuova-immagine" data-src="${esc(i.src)}" title="${esc(i.nome || '')}"><img src="${esc(i.src)}" alt="${esc(i.nome || '')}" loading="lazy"></button>`).join('') + (cfg.carica ? `<label class="ed-carica">${tr('Carica una tua immagine')}<input type="file" accept="image/png,image/jpeg,image/webp" data-ed-file hidden></label>` : '');
        m.hidden = false; const bt = barra.querySelector(`[data-ed="${a}"]`); if (bt) bt.setAttribute('aria-expanded', 'true');
      }
    }
    else if (a === 'nuova-forma') { chiudiMenu(); API.aggiungi('forma', { forma: b.dataset.f }); }
    else if (a === 'nuova-immagine') { chiudiMenu(); immagineScelta(b.dataset.src); }
    else if (a === 'annulla') API.annulla(); else if (a === 'ripeti') API.ripeti();
    else if (['cima', 'su', 'giu', 'fondo'].includes(a)) st.sel.slice().forEach(id => API.ordine(id, a));
    else if (a === 'duplica') API.duplica(); else if (a === 'elimina') { if (!API.elimina()) scuoti(); }
    else if (a === 'blocca') { const tutti = oggSel().every(r => r.o.lock); API.blocca(null, !tutti); annuncia(tr(!tutti ? 'Bloccato: i negozi non possono cambiarlo.' : 'Libero: i negozi possono cambiarlo.')); }
    else if (a === 'blocca-uno') { const r = trova(b.dataset.id); if (r) API.blocca([r.o.id], !r.o.lock); }
    else if (a === 'scegli') { const id = b.dataset.id; seleziona(id); const e = livelli.querySelector(`[data-ed="scegli"][data-id="${CSS.escape(id)}"]`); if (e) e.focus(); }
    else if (a === 'esci-gruppo') { const gid = st.gruppo; st.gruppo = null; seleziona(gid || []); }
    else if (a === 'zoom+') { st.zoom = Math.min(4, st.zoom * 1.25); misura(); sopraDisegna(); }
    else if (a === 'zoom-') { st.zoom = Math.max(0.4, st.zoom / 1.25); misura(); sopraDisegna(); }
    else if (a === 'adatta') { st.zoom = 1; misura(); sopraDisegna(); }
    else if (a === 'colore') { const id = st.sel[0]; if (id) API.stile(id, { [b.dataset.campo]: b.dataset.v }); }
    else if (a === 'allinea') { const id = st.sel[0]; if (id) API.stile(id, { alin: b.dataset.v === 'left' ? '' : b.dataset.v }); }
    else if (a === 'maiuscolo') { const id = st.sel[0], r = id && trova(id); if (r) API.stile(id, { up: r.o.up ? '' : true }); }
  });
  function immagineScelta(src) {
    const r = st.sel.length === 1 ? trova(st.sel[0]) : null;
    const i = new Image(); i.onload = () => {
      const ratio = i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : 1;
      if (r && r.o.t === 'immagine' && !r.o.bind) API.stile(r.o.id, { src });
      else { const h = 50, w = Math.min(F().w * 0.8, h * ratio); API.aggiungi('immagine', { src, w, h: w / ratio }); }
    };
    i.onerror = () => annuncia('Immagine non leggibile.');
    i.src = src;
  }
  root.addEventListener('change', async ev => {
    const t = ev.target;
    if (t.matches('[data-ed-file]') && t.files[0] && cfg.carica) { try { const u = await cfg.carica(t.files[0]); root.querySelectorAll('.ed-menu').forEach(m => m.hidden = true); immagineScelta(u); } catch (e) { annuncia(e.message || 'Caricamento non riuscito.'); } return; }
    const id = st.sel[0]; if (!id) return; const r = trova(id); if (!r) return;
    if (t.dataset.campoC) { API.stile(id, { [t.dataset.campoC]: t.value.toUpperCase() }); return; }
    const c = t.dataset.campo; if (!c) return;
    const v = t.value;
    if (c === 's') { API.testo(id, v); return; }
    if (['x', 'y', 'w', 'h'].includes(c)) { const n = parseFloat(String(v).replace(',', '.')); if (!isFinite(n)) return; const o = r.o, b = { x: o.x, y: o.y, w: o.w, h: o.h }; b[c] = n; if (c === 'x' || c === 'y') API.sposta(id, b.x - o.x, b.y - o.y); else { if (o.t === 'gruppo') { const f = c === 'w' ? n / o.w : n / o.h; b.w = o.w * f; b.h = o.h * f; } API.ridimensiona(id, b); } return; }
    if (c === 'r') { API.ruota(id, parseFloat(v) || 0); return; }
    if (c === 'pt') { const n = parseFloat(String(v).replace(',', '.')); if (n > 1 && n < 800) API.stile(id, { pt: n }); return; }
    if (c === 'op') { const n = Math.max(0, Math.min(100, parseFloat(v) || 0)); API.stile(id, { op: n >= 100 ? '' : n / 100 }); return; }
    if (c === 'bordo') { const n = Math.max(0, parseFloat(String(v).replace(',', '.')) || 0); API.stile(id, { bordo: n ? { w: n, col: (r.o.bordo && r.o.bordo.col) || 'ink' } : '' }); return; }
    if (c === 'raggio') { const n = Math.max(0, parseFloat(String(v).replace(',', '.')) || 0); API.stile(id, { raggio: n || '' }); return; }
    if (c === 'peso') { API.stile(id, { peso: +v }); return; }
    API.stile(id, { [c]: v });
  });
  if (g.ResizeObserver) new ResizeObserver(() => { misura(); sopraDisegna(); }).observe(tavolo);

  disegna();
  Object.defineProperty(API, 'doc', { get: () => st.doc, enumerable: true });
  return Object.assign(API, {
    el: root,
    pagina(i) { if (i == null) return st.pi; st.pi = Math.max(0, Math.min(F().pagine.length - 1, i)); st.sel = []; st.gruppo = null; disegna(); },
    seleziona(id) { const r = id && trova(id); st.gruppo = r && r.padre ? r.padre.id : null; seleziona(id || []); },
    selezione: () => st.sel.slice(),
    scala: () => S(),
    formato: () => ({ ...F(), pagine: undefined }),
    indiceFormato: () => st.fi,
    cambiaFormato(i) { st.fi = Math.max(0, Math.min(st.doc.formati.length - 1, i)); st.pi = 0; st.sel = []; st.gruppo = null; st.zoom = 1; disegna(); },
    zoom(k) { if (k) { st.zoom = k; misura(); sopraDisegna(); } return st.zoom; },
    ridisegna(doc) { if (doc) st.doc = doc; disegna(); },
    avvisi,
    scuoti,
    distruggi() { el.innerHTML = ''; }
  });
}

g.Editor = { monta, ICO };
})(window);
