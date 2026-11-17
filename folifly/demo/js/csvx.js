/* Lettura del file di vendite: CSV (virgola, punto e virgola o tabulazione) ed Excel (xlsx, xls). Il file resta sul dispositivo. */
(function (g) {
'use strict';
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const delim = [';', ',', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); if (row.some(x => x.trim() !== '')) rows.push(row); }
  return rows;
}
async function readFileTable(file) {
  const name = file.name || 'file';
  if (/\.(xlsx|xlsm|xls)$/i.test(name)) {
    if (!g.XLSX) throw new Error('La lettura di Excel non è disponibile.');
    const wb = g.XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = g.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', dateNF: 'dd/mm/yyyy' });
    return rows.filter(r => r.some(x => String(x).trim() !== '')).map(r => r.map(x => String(x)));
  }
  if (/\.(csv|txt|tsv)$/i.test(name) || /text/.test(file.type || '')) return parseCSV(await file.text());
  throw new Error('Formato non riconosciuto. Usa un file CSV o Excel.');
}
g.Csvx = { parseCSV, readFileTable };
})(window);
