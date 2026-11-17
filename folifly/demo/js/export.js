/* Uscita: da ogni pagina (HTML dei modelli) si ottengono immagini JPG, PDF e PSD a livelli.
   La pagina viene disegnata dal browser stesso (SVG con foreignObject), con caratteri e immagini incorporati, e poi portata a 150 o 300 dpi. */
(function (g) {
'use strict';
const FONTS = [['Anton', 400, 'anton-latin-400-normal'], ['Barlow Condensed', 700, 'barlow-condensed-latin-700-normal'], ['Barlow Condensed', 800, 'barlow-condensed-latin-800-normal'],
  ['Oswald', 700, 'oswald-latin-700-normal'], ['Inter', 400, 'inter-latin-400-normal'], ['Inter', 500, 'inter-latin-500-normal'], ['Inter', 600, 'inter-latin-600-normal'], ['Inter', 700, 'inter-latin-700-normal'], ['Inter', 800, 'inter-latin-800-normal']];
let fontCss = null, modCss = null; const cache = {};
async function toData(url) {
  if (url.startsWith('data:')) return url;
  if (cache[url]) return cache[url];
  const r = await fetch(url); if (!r.ok) throw new Error('File non trovato: ' + url);
  const b = await r.blob();
  return cache[url] = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
}
async function init() {
  if (fontCss) return;
  modCss = await (await fetch('css/modelli.css')).text();
  fontCss = '';
  for (const [fam, w, f] of FONTS) fontCss += `@font-face{font-family:'${fam}';font-weight:${w};src:url(${await toData('fonts/' + f + '.woff2')}) format('woff2')}`;
}
async function inline(html) {
  const urls = new Set(); html.replace(/(?:src="|url\(')(?!data:)([^"')]+)/g, (m, u) => { urls.add(u); return m; });
  const map = {}; for (const u of urls) map[u] = await toData(u);
  return html.replace(/(src="|url\(')(?!data:)([^"')]+)/g, (m, a, u) => a + map[u]);
}
const PASS = {
  full: '',
  sfondo: '.pg *{color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}.pg img,.pg .noimg{visibility:hidden!important}',
  confezioni: '.pg{background:transparent!important}.pg *{visibility:hidden!important}.pg img,.pg .noimg{visibility:visible!important}',
  testi: '.pg{background:transparent!important}.pg *{background:none!important;box-shadow:none!important;border-color:transparent!important;outline:none!important;clip-path:none!important}.pg img,.pg .noimg,.pg .bgimg,.pg .shade{visibility:hidden!important}'
};
function svgOf(html, css, w) {
  const h = Math.round(w * 297 / 210), box = document.createElement('div');
  box.innerHTML = html;
  const st = document.createElement('style'); st.textContent = fontCss + modCss + css;
  const root = document.createElement('div'); root.setAttribute('style', `width:${w}px;height:${h}px`);
  root.append(st, ...box.childNodes);
  const xml = new XMLSerializer().serializeToString(root);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">${xml}</foreignObject></svg>`;
}
async function renderCanvas(htmlInlined, dpi, pass) {
  const w = 794, W = Math.round(210 / 25.4 * dpi), H = Math.round(297 / 25.4 * dpi);
  const svg = svgOf(htmlInlined, PASS[pass || 'full'], w);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Disegno della pagina non riuscito')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); if (pass === 'full') { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); }
  x.drawImage(img, 0, 0, W, H); return c;
}
const blobOf = (c, type, q) => new Promise(r => c.toBlob(r, type, q));
async function psdOf(html, dpi, comp) {
  const [a, b, t] = [await renderCanvas(html, dpi, 'sfondo'), await renderCanvas(html, dpi, 'confezioni'), await renderCanvas(html, dpi, 'testi')];
  const W = comp.width, H = comp.height, m = Math.round(4 / 25.4 * dpi);
  const psd = { width: W, height: H, canvas: comp,
    children: [{ name: 'Sfondo e grafica', canvas: a, left: 0, top: 0 }, { name: 'Confezioni', canvas: b, left: 0, top: 0 }, { name: 'Testi e prezzi', canvas: t, left: 0, top: 0 }],
    imageResources: { gridAndGuidesInformation: { grid: { horizontal: 288, vertical: 288 }, guides: [{ direction: 'vertical', location: m }, { direction: 'vertical', location: W - m }, { direction: 'horizontal', location: m }, { direction: 'horizontal', location: H - m }] },
      resolutionInfo: { horizontalResolution: dpi, horizontalResolutionUnit: 'PPI', widthUnit: 'Millimeters', verticalResolution: dpi, verticalResolutionUnit: 'PPI', heightUnit: 'Millimeters' } } };
  const buf = g.agPsd.writePsd(psd, { generateThumbnail: true });
  return new Blob([buf], { type: 'image/vnd.adobe.photoshop' });
}
async function serverAvailable() { try { const r = await fetch('api/ping', { cache: 'no-store' }); return r.ok; } catch (e) { return false; } }
async function serverPdf(htmls) {
  const r = await fetch('api/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pages: htmls }) });
  if (!r.ok) throw new Error('Il server non è riuscito a creare il PDF'); return await r.blob();
}
/* opts: {formats:{pdf,jpg,psd}, stores:[id|null], dpi, vector, pages:(store)=>[html], slug, onProgress(done,total,txt)} */
async function exportAll(opts) {
  await init();
  const out = [], f = opts.formats; let done = 0, total = 0;
  const pagesBy = {}; for (const s of opts.stores) { pagesBy[s] = opts.pages(s); total += pagesBy[s].length * ((f.jpg || (f.pdf && !opts.vector) || f.psd) ? 1 : 0) + (f.pdf && opts.vector ? 1 : 0); }
  const tick = txt => opts.onProgress && opts.onProgress(done, total, txt);
  for (const s of opts.stores) {
    const tag = s ? 'negozio-' + s : 'sede', base = `${opts.slug}_${tag}`, htmls = pagesBy[s], jpegs = [];
    for (let i = 0; i < htmls.length; i++) {
      const needRaster = f.jpg || (f.pdf && !opts.vector) || f.psd;
      if (needRaster) {
        const html = await inline(htmls[i]), comp = await renderCanvas(html, opts.dpi, 'full'), n = String(i + 1).padStart(2, '0');
        if (f.jpg) out.push({ name: `${base}_pagina-${n}.jpg`, blob: await blobOf(comp, 'image/jpeg', 0.92), store: s });
        if (f.pdf && !opts.vector) jpegs.push(comp.toDataURL('image/jpeg', 0.9));
        if (f.psd) out.push({ name: `${base}_pagina-${n}.psd`, blob: await psdOf(html, opts.dpi, comp), store: s });
        done++; tick(`${tag}, pagina ${i + 1} di ${htmls.length}`);
      }
    }
    if (f.pdf && opts.vector) { out.push({ name: `${base}_stampa.pdf`, blob: await serverPdf(htmls), store: s }); done++; tick(`${tag}, PDF vettoriale`); }
    else if (f.pdf) {
      const { jsPDF } = g.jspdf, pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      jpegs.forEach((d, i) => { if (i) pdf.addPage('a4'); pdf.addImage(d, 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
      out.push({ name: `${base}_stampa.pdf`, blob: pdf.output('blob'), store: s });
    }
  }
  const zip = new g.JSZip(); out.forEach(o => zip.folder(o.store ? 'negozio-' + o.store : 'sede').file(o.name, o.blob));
  const zipBlob = out.length > 1 ? await zip.generateAsync({ type: 'blob', compression: 'STORE' }) : null;
  return { files: out, zip: zipBlob };
}
g.Export = { init, exportAll, renderCanvas, inline, serverAvailable, toData };
})(window);
