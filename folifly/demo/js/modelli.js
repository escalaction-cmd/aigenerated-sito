/* Modelli di volantino Folifly: ogni modello è una funzione che prende l'insegna (colori, caratteri, forma dei bollini),
   il catalogo e i dati della pagina, e restituisce l'HTML di una pagina A4. Lo stesso codice serve alla galleria,
   al configuratore e alla stampa in PDF/JPG da Chrome. Tutto inventato: insegne, marchi, prodotti, numeri. */
(function (g) {
'use strict';
const eur = n => n.toFixed(2).replace('.', ',');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
function periodo(dal, al) {
  const a = dal.split('/').map(Number), b = al.split('/').map(Number);
  return a[1] === b[1] ? `Dal ${a[0]} al ${b[0]} ${MESI[b[1]-1]} ${b[2]}` : `Dal ${a[0]} ${MESI[a[1]-1]} al ${b[0]} ${MESI[b[1]-1]} ${b[2]}`;
}
function breve(dal, al) { const a = dal.split('/').map(Number), b = al.split('/').map(Number); return a[1] === b[1] ? `${a[0]} - ${b[0]} ${MESI[b[1]-1]}` : `${a[0]} ${MESI[a[1]-1].slice(0,3)} - ${b[0]} ${MESI[b[1]-1].slice(0,3)}`; }
const STAR = (() => { const p = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? 40 : 50, a = -Math.PI/2 + i*Math.PI/8; p.push((50 + r*Math.cos(a)).toFixed(1) + '% ' + (50 + r*Math.sin(a)).toFixed(1) + '%'); } return 'polygon(' + p.join(',') + ')'; })();
const CUT = 'polygon(0 0,80% 0,100% 26%,100% 100%,0 100%)';
const CIRC = 'circle(50% at 50% 50%)';

/* Tre insegne di esempio. Nomi e colori di fantasia: ognuna ha la sua forma di bollino, il suo carattere e le sue regole. */
const THEMES = {
  mercatoverde: { nome: 'Mercato Verde', tipo: 'Supermercato di prossimità', web: 'www.mercatoverde.example', forma: 'cerchio', clip: CIRC, fw: 400,
    c1: '#1F5B3A', c2: '#E8EFE2', ac: '#F2B01E', acink: '#17211B', pr: '#C7351D', paper: '#FFFDF7', ink: '#17211B', mute: '#5B665F', line: '#DDE2D6',
    fd: "'Anton','Impact',sans-serif" },
  granpiazza: { nome: 'Gran Piazza', tipo: 'Ipermercato', web: 'www.granpiazza.example', forma: 'rettangolo con angolo tagliato', clip: CUT, fw: 800,
    c1: '#1B3FA0', c2: '#E9EEFB', ac: '#FF7A1A', acink: '#101412', pr: '#D81F26', paper: '#FFFFFF', ink: '#101A33', mute: '#56607A', line: '#D8DEEE',
    fd: "'Barlow Condensed','Arial Narrow',sans-serif" },
  soleecasa: { nome: 'Sole & Casa', tipo: 'Discount di quartiere', web: 'www.soleecasa.example', forma: 'stella a 8 punte', clip: STAR, fw: 700,
    c1: '#23282D', c2: '#FFF1C2', ac: '#FFC21A', acink: '#101412', pr: '#D92B20', paper: '#FFFEF8', ink: '#16191C', mute: '#5E625E', line: '#E6E0CC',
    fd: "'Oswald','Impact',sans-serif" }
};

/* ---------- pezzi riusabili ---------- */
const pct = (prior, promo) => Math.round((prior - promo) / prior * 100);
const UNI = { kg: 'al kg', l: 'al litro', pz: 'al pezzo' };
const unit = (p, price) => p.qta ? `${eur(price / p.qta)} € ${UNI[p.unita]}` : '';
function pr(n, size) {
  const t = n.toFixed(2).split('.');
  return `<span class="pr"${size ? ` style="font-size:${size}"` : ''}><b>${t[0]}<sup>,${t[1]}</sup></b><i>€</i></span>`;
}
function wrap(c, cls, inner, brand) {
  const t = c.theme;
  const vars = brand ? `--fw:800;` :
    `--c1:${t.c1};--c2:${t.c2};--ac:${t.ac};--acink:${t.acink};--pr:${t.pr};--paper:${t.paper};--ink:${t.ink};--mute:${t.mute};--line:${t.line};--fd:${t.fd};--fw:${t.fw};--clip:${t.clip};`;
  return `<div class="pg ${cls}" style="${vars}">${inner}</div>`;
}
const hdr = (c, ttl, val) => `<div class="hd"><span class="logo"><i class="mk"></i>${esc(c.theme.nome)}</span><span class="ttl">${ttl}</span><span class="val">${val}</span></div>`;
const ftr = (c, n, extra) => `<div class="ft"><span>${extra || ''}${esc(c.plan.legale)}</span><span>${c.store ? 'Negozio ' + esc(c.store.id) + ' ' + esc(c.store.name) : esc(c.theme.web)} · pag. ${n}</span></div>`;
const img = (c, p) => p.img ? `<img src="${c.asset(p.img)}" alt="${esc(p.nome)}">` : `<svg class="noimg" viewBox="0 0 100 120" role="img" aria-label="Immagine mancante"><rect x="14" y="14" width="72" height="92" rx="10" fill="none" stroke="#9a9a8c" stroke-width="2" stroke-dasharray="5 4"/><text x="50" y="60" text-anchor="middle" font-size="9" fill="#7a7a6c" font-family="Inter,sans-serif">immagine</text><text x="50" y="72" text-anchor="middle" font-size="9" fill="#7a7a6c" font-family="Inter,sans-serif">mancante</text></svg>`;
function cell(c, id, promo, prior, cls) {
  const p = c.cat[id], d = prior ? pct(prior, promo) : 0;
  return `<div class="cell ${cls || ''}" data-pid="${id}">${d ? `<span class="bd">-${d}%</span>` : ''}<div class="im">${img(c, p)}</div>
  <div class="tx"><span class="br">${esc(p.marca)}</span><span class="nm">${esc(p.nome)}</span><span class="fm">${esc(p.formato)}</span>
  <div class="row">${pr(promo)}<div class="meta2">${prior ? `<span class="old">${eur(prior)}</span>` : ''}<span class="up">${unit(p, promo)}</span></div></div></div></div>`;
}
function mini(c, id, promo, prior) {
  const p = c.cat[id], d = prior ? pct(prior, promo) : 0;
  return `<div class="cell mini" data-pid="${id}">${d ? `<span class="bd">-${d}%</span>` : ''}<div class="im">${img(c, p)}</div>
  <div class="tx"><span class="br">${esc(p.marca)} · ${esc(p.formato)}</span><span class="nm">${esc(p.nome)}</span>
  <div class="row">${pr(promo)}<div class="meta2">${prior ? `<span class="old">${eur(prior)}</span>` : ''}<span class="up">${unit(p, promo)}</span></div></div></div></div>`;
}
function qr(seed) {
  let s = seed, o = '';
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const fin = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#101412"/><rect x="${x+1}" y="${y+1}" width="5" height="5" fill="#fff"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#101412"/>`;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) continue;
    if (r() > .52) o += `<rect x="${x}" y="${y}" width="1" height="1" fill="#101412"/>`;
  }
  return `<svg viewBox="0 0 21 21" shape-rendering="crispEdges" role="img" aria-label="QR di esempio">${o}${fin(0,0)}${fin(14,0)}${fin(0,14)}</svg>`;
}

/* ---------- i modelli ---------- */
const T = {};
T.cover_idea = (c, d, n) => {
  const t = c.theme, trio = d.trio.map(id => img(c, c.cat[id])).join('');
  return wrap(c, 'cv1 onphoto', `
  <div class="bgimg" style="background-image:url('${c.asset('web/mood_' + d.mood + '.webp')}')"></div><div class="shade ${d.ink}"></div>
  <div class="ctop"><span class="logo"><i class="mk"></i>${esc(t.nome)}</span><span class="valp">${periodo(c.plan.dal, c.plan.al)}</span></div>
  <div class="bigt ${d.ink === 'dark' ? 'dark' : ''}"><span class="kick">${esc(d.kicker)}</span><h1>${d.titolo}</h1><p>${esc(d.sub)}</p></div>
  <div class="trio">${trio}</div>
  <span class="bd" style="right:6cqw;top:92cqw;--bw:22cqw;--bs:5.4cqw">${d.bollino}</span>
  <div class="ribbon">${esc(d.nastro)}</div>${ftr(c, n)}`);
};
T.cover_price = (c, d, n) => {
  const t = c.theme, xs = [3.2, 26.2, 49.2, 72.2], bubs = ['right:-5cqw;top:-9cqw', 'right:-5cqw;top:6cqw', 'right:-5cqw;top:-9cqw', 'right:-5cqw;top:6cqw'];
  const it = d.offerte.map(([id, promo, prior], i) => { const p = c.cat[id];
    return `<div class="it" data-pid="${id}" style="left:${xs[i]}cqw">${img(c, p)}<div class="bub" style="${bubs[i]}"><div>${pr(promo)}${prior ? `<s>${eur(prior)}</s>` : ''}</div></div><span class="lab">${esc(p.nome)}, ${esc(p.formato)}</span></div>`; }).join('');
  return wrap(c, 'cv2 onphoto', `${hdr(c, 'Prezzi forti', breve(c.plan.dal, c.plan.al))}
  <div class="stage" style="background-image:url('${c.asset('web/mood_' + d.mood + '.webp')}')"><div class="tt"><h1>${d.titolo}</h1><p>${esc(d.sotto)}</p></div>${it}</div>
  <div class="foot2"><b>${esc(t.nome)}</b><span>Il prezzo per unità di misura<br>è sotto ogni prezzo</span></div>${ftr(c, n)}`);
};
T.event_page = (c, d, n) => {
  const m = d.moduli.map((o, i) => {
    const big = o.pct ? `<div class="big">-${o.pct}%</div>` : `<div class="big m">${esc(o.mecc)}</div>`;
    return `<div class="mod" style="top:${i ? 75.5 : 14}cqw"><div class="imgs">${o.prodotti.map(id => '<span>' + img(c, c.cat[id]) + '</span>').join('')}</div>
    <div class="tx"><span class="tag ac">${esc(o.tag)}</span>${big}<h2>${esc(o.titolo)}</h2><p>${esc(o.testo)}</p></div></div>`; }).join('');
  return wrap(c, 'ev', `${hdr(c, esc(d.titolo.split(',')[0]), breve(c.plan.dal, c.plan.al))}${m}${ftr(c, n)}`);
};
T.sotto_page = (c, d, n) => {
  const cells = d.offerte.map(([id, promo, prior, pezzi, lim]) => { const p = c.cat[id], dd = prior ? pct(prior, promo) : 0;
    return `<div class="cell" data-pid="${id}">${dd ? `<span class="bd" style="--bw:7.4cqw;--bs:2.8cqw">-${dd}%</span>` : ''}<div class="im">${img(c, p)}</div>
    <div class="tx"><span class="tag">Sottocosto</span><span class="br">${esc(p.marca)}</span><span class="nm">${esc(p.nome)}</span><span class="fm">${esc(p.formato)}</span>
    <div style="display:flex;align-items:flex-end;gap:1.4cqw">${pr(promo)}${prior ? `<span class="old" style="font-size:1.9cqw;padding-bottom:.6cqw">${eur(prior)}</span>` : ''}</div>
    <span class="up">${unit(p, promo)}</span><div class="meta"><b>${pezzi.toLocaleString('it-IT')}</b> pezzi disponibili<br>Massimo <b>${lim}</b> pezzi a persona</div></div></div>`; }).join('');
  return wrap(c, 'sc', `<div class="band"><span>Sottocosto</span></div>${hdr(c, 'Sottocosto', `${breve(c.plan.dal, c.plan.al)}<br>${esc(d.durata)}, massimo 10`)}
  <div class="grid">${cells}</div>${ftr(c, n, 'Vendita sottocosto comunicata al Comune. ')}`);
};
T.dense_grid = (c, d, n) => {
  const cells = [];
  d.righe.forEach(r => r.forEach(it => {
    if (it.length === 4) { const [id, promo, prior, cli] = it, p = c.cat[id];
      cells.push(`<div class="cell hi" data-pid="${id}"><span class="stamp">Doppio sconto</span><div class="im">${img(c, p)}</div><div class="tx"><span class="br">${esc(p.marca)}</span><span class="nm" style="font-size:2.7cqw">${esc(p.nome)}</span><span class="fm">${esc(p.formato)}</span>
      <div class="two"><div><span class="who">Con la carta -${pct(prior, cli)}%</span><br>${pr(cli)}</div><span class="arr">→</span><div><span class="who">Soci -${pct(prior, promo)}%</span><br>${pr(promo)}</div></div>
      <span class="up">Prezzo pieno ${eur(prior)} · ${unit(p, promo)}</span></div></div>`);
    } else cells.push(cell(c, it[0], it[1], it[2]));
  }));
  const m = d.marca, mp = m.prodotti.map(id => { const p = c.cat[id], v = Math.round(p.prezzo * (1 - m.pct / 100) * 100) / 100; return `<div>${img(c, p)}<span>${eur(v)} €</span></div>`; }).join('');
  return wrap(c, 'dn', `${hdr(c, 'Ogni giorno', breve(c.plan.dal, c.plan.al))}<div class="grid">${cells.join('')}</div>
  <div class="strip"><div class="sb">${esc(m.nome)}<small>${esc(m.testo)}</small></div><div class="pk">${mp}</div><div class="pct">-${m.pct}<small>%</small></div></div>${ftr(c, n)}`);
};
T.dense_zones = (c, d, n) => {
  const t = c.theme, tops = [12.6, 53.2, 93.8], cols = [[t.c1, '#fff', t.c2], [t.ac, t.acink, '#fff'], [t.pr, '#fff', t.c2]];
  const z = d.zone.map((o, i) => { const rows = o.items.length > 4 ? 2 : 1; return `<div class="zone" style="flex:${rows};--zc:${cols[i % 3][0]};--zk:${cols[i % 3][1]};--zbg:${cols[i % 3][2]}"><div class="zh"><span>${esc(o.nome)}</span><small>${periodo(o.dal, o.al)}</small></div>
    <div class="zg" style="grid-template-rows:repeat(${rows},1fr)">${o.items.map(([id, a, b]) => mini(c, id, a, b)).join('')}</div></div>`; }).join('');
  return wrap(c, 'dz', `${hdr(c, esc(d.titolo), breve(c.plan.dal, c.plan.al))}<div class="zones">${z}</div>${ftr(c, n)}`);
};
T.dense_wall = (c, d, n) => {
  const [hid, hp, hb] = d.hero, h = c.cat[hid];
  const hero = `<div class="cell hero2" data-pid="${hid}"><span class="bd" style="--bw:12cqw;--bs:4cqw">-${pct(hb, hp)}%</span><div class="im">${img(c, h)}</div>
    <div class="tx"><span class="tag ac">${esc(d.hero_tag)}</span><span class="br">${esc(h.marca)}</span><span class="nm">${esc(h.nome)}</span><span class="fm">${esc(h.formato)}</span>
    <div class="row">${pr(hp)}<div class="meta2"><span class="old">${eur(hb)}</span><span class="up">${unit(h, hp)}</span></div></div></div></div>`;
  const minis = d.minis.map(([id, a, b]) => mini(c, id, a, b)).join('');
  return wrap(c, 'dw', `${hdr(c, esc(d.titolo), breve(c.plan.dal, c.plan.al))}<div class="grid">${hero}${minis}
    <div class="banner2"><b>${esc(d.banner[0])}</b><span>${esc(d.banner[1])}</span></div></div>${ftr(c, n)}`);
};
T.season_page = (c, d, n) => {
  return wrap(c, 'sg', `${hdr(c, esc(d.kicker), breve(c.plan.dal, c.plan.al))}
  <div class="mood" style="background-image:url('${c.asset('web/mood_' + d.mood + '.webp')}')"><div class="tt"><span>${esc(d.kicker)}</span><h1>${esc(d.titolo)}</h1></div></div>
  <div class="grid">${d.offerte.map(([id, a, b]) => cell(c, id, a, b)).join('')}</div>${ftr(c, n)}`);
};
T.brand_page = (c, d, n) => {
  const [hid, hp, hb] = d.hero, h = c.cat[hid], q = d.concorso;
  const minis = d.altri.map(([id, a, b]) => cell(c, id, a, b)).join('');
  return wrap(c, 'br2', `<div class="bhd"><b>${esc(d.marca)}</b><span>${esc(d.claim)}</span></div>
  <div class="hero" data-pid="${hid}"><span class="bd" style="left:0;top:0;--bw:14cqw;--bs:4.4cqw;background:#2B2118;color:#fff">-${pct(hb, hp)}%</span><div class="im">${img(c, h)}</div>
   <div class="tx"><span class="br">${esc(h.marca)}</span><span class="nm">${esc(h.nome)}</span><span class="fm">${esc(h.formato)}</span><div class="row">${pr(hp)}<div><span class="old">${eur(hb)}</span><br><span class="up">${unit(h, hp)}</span></div></div></div></div>
  <div class="minis">${minis}</div>
  <div class="contest"><div><h2>${esc(q.titolo)}</h2><p>${esc(q.testo)}</p><small>${esc(q.periodo)}. Regolamento nel punto vendita. Concorso di esempio.</small></div><div><div class="qr">${qr(7)}</div><div class="qrl">QR di esempio</div></div></div>
  ${ftr(c, n)}`, true).replace('class="pg br2"', 'class="pg br2 brandp"');
};
T.services_page = (c, d, n) => {
  const t = c.theme;
  return wrap(c, 'sv', `${hdr(c, esc(d.titolo), esc(t.tipo))}<div class="cols">
   <div class="blk"><h2>Carta e app</h2><p>Con la carta fedeltà ricevi i prezzi riservati ai soci e raccogli punti ad ogni spesa. Nell'app trovi il volantino sempre aggiornato e la lista della spesa.</p>
     <div class="qrbox"><div class="qr">${qr(21)}</div><p><b>Scarica l'app</b><br>Inquadra il codice.<br><span class="rules">QR di esempio</span></p></div></div>
   <div class="blk"><h2>Orari</h2><table class="hours"><tr><td>Lunedì e sabato</td><td>8:00 - 20:30</td></tr><tr><td>Martedì e venerdì</td><td>8:00 - 20:00</td></tr><tr><td>Mercoledì e giovedì</td><td>8:00 - 19:30</td></tr><tr><td>Domenica</td><td>9:00 - 13:00</td></tr></table><p class="rules">Indirizzo e orari del tuo negozio cambiano per ogni versione del volantino.</p></div>
   <div class="blk wide"><h2>Servizi</h2><ul><li><b>Spesa online</b>, ritiro in negozio in un'ora</li><li><b>Consegna a casa</b> dal martedì al sabato</li><li><b>Banco del fresco</b> con pane, salumi e formaggi tagliati al momento</li><li><b>Punto ricarica</b> telefonia e pagamenti</li></ul></div>
   <div class="blk wide"><h2>Regole</h2><p class="rules">Le offerte sono valide nei punti vendita che espongono il volantino. Le quantità sono limitate a un consumo familiare. Le immagini sono a titolo di esempio. Prezzi e disponibilità possono variare da negozio a negozio. Prezzo per unità di misura indicato sotto ogni prezzo.</p></div>
  </div>${ftr(c, n)}`);
};

/* ---------- schede dei modelli (per galleria e configuratore) ---------- */
const TEMPLATES = [
  { k: 'cover_idea', n: 'Copertina idea', uso: 'Eventi e stagioni. Una sola immagine forte, nessun prezzo.', fam: 'Copertine',
    campi: ['Titolo di 2 parole', 'Foto d\'atmosfera', '3 prodotti senza prezzo', 'Fascia di sconto massimo', 'Date'],
    perche: 'La copertina decide se si sfoglia il volantino e deve riconoscersi anche senza il nome dell\'insegna.' },
  { k: 'cover_price', n: 'Copertina prezzo', uso: 'Settimane di offerte forti. Foto d\'atmosfera e quattro prezzi grandi sui bollini.', fam: 'Copertine',
    campi: ['Titolo', '4 prodotti con prezzo e prezzo precedente', 'Foto d\'atmosfera', 'Indirizzo web'],
    perche: 'Prezzo e sconto sono ciò che si guarda per primo: l\'immagine resta in secondo piano.' },
  { k: 'event_page', n: 'Pagina evento', uso: 'Uno o due sconti semplici in percentuale o a meccanica (3x2) con i prodotti del gruppo.', fam: 'Pagine forti',
    campi: ['Percentuale o meccanica', 'Gruppo di 3 o 4 prodotti', 'Testo corto sulla condizione (alla cassa, scegli tu)'],
    perche: 'Pochi elementi per pagina e un\'idea sola: l\'attenzione cala con il numero di elementi.' },
  { k: 'sotto_page', n: 'Pagina sottocosto', uso: 'Offerte sotto il costo, con banda laterale e durata massima di 10 giorni.', fam: 'Pagine forti',
    campi: ['6 prodotti con prezzo e prezzo precedente', 'Pezzi disponibili per prodotto', 'Limite di acquisto per persona', 'Date (massimo 10 giorni)'],
    perche: 'La legge chiede quantità disponibile e limite, durata massima di 10 giorni e non più di 50 referenze (D.P.R. 218/2001).' },
  { k: 'dense_grid', n: 'Pagina di reparto', uso: 'La spesa di tutti i giorni: 8 schede, una scheda doppia in evidenza e una fascia del marchio in basso.', fam: 'Pagine di spesa',
    campi: ['7 prodotti con prezzo', 'Un prodotto con doppio sconto (carta e soci)', 'Fascia del marchio con 3 confezioni e percentuale'],
    perche: 'Il riquadro con bordo e le due cifre con freccia mettono in scena l\'offerta forte dentro la pagina densa.' },
  { k: 'dense_zones', n: 'Pagina fitta a zone', uso: 'Tre fasce da 8 prodotti, ognuna con il suo colore e le sue date: 24 prodotti in una pagina.', fam: 'Pagine di spesa',
    campi: ['Tre zone con nome', 'Date per zona', '8 prodotti con prezzo per zona'],
    perche: 'Nei volantini veri le pagine dense si dividono in zone con colore e validità proprie.' },
  { k: 'dense_wall', n: 'Pagina fitta a griglia', uso: 'Un prodotto protagonista, 14 prodotti piccoli e un riquadro per l\'app o la carta.', fam: 'Pagine di spesa',
    campi: ['Prodotto protagonista', '14 prodotti con prezzo', 'Testo del riquadro'],
    perche: 'Il prodotto grande dà il punto d\'ingresso, i piccoli riempiono la pagina senza perdere il prezzo.' },
  { k: 'season_page', n: 'Pagina stagione', uso: 'Pochi prodotti grandi su una foto di stagione. Aria e immagini, prezzi leggibili.', fam: 'Pagine di spesa',
    campi: ['Foto di stagione', 'Titolo', '6 prodotti con prezzo'],
    perche: 'Le pagine di stagione alternano ritmo lento e veloce: le foto portano emozione positiva.' },
  { k: 'brand_page', n: 'Pagina del marchio', uso: 'Spazio di un produttore: marchio, claim, prodotto protagonista, quattro prodotti e concorso.', fam: 'Spazi dei marchi',
    campi: ['Marchio e claim', 'Prodotto protagonista', '4 prodotti', 'Concorso o regolamento', 'QR'],
    perche: 'I produttori finanziano pagine e fasce nel volantino: ogni marchio ha il suo aspetto dentro la griglia dell\'insegna.' },
  { k: 'services_page', n: 'Pagina servizi', uso: 'Ultima pagina: carta, app, orari, servizi e regole.', fam: 'Servizi',
    campi: ['Testi dell\'insegna', 'QR dell\'app', 'Orari del punto vendita', 'Regole'],
    perche: 'Nell\'ultima pagina finiscono tutto ciò che cambia per ogni negozio: indirizzo, orari, regole.' }
];

function ctx(themeKey, cat, plan, asset, store) {
  const map = {}; cat.forEach(p => map[p.id] = p);
  return { theme: THEMES[themeKey], themeKey, cat: map, plan, asset: asset || (x => x), store: store || null };
}
function render(k, c, d, n) { return T[k](c, d, n); }
function flyer(c) { return c.plan.pagine.map((p, i) => ({ k: p.tpl, n: i + 1, html: T[p.tpl](c, p.d, i + 1) })); }
g.Modelli = { THEMES, TEMPLATES, ctx, render, flyer, periodo, unit, pct, eur };
})(typeof window !== 'undefined' ? window : globalThis);
