// Piccole funzioni di utilità: id, date, numeri, costruzione del DOM.

// Id univoco (UUID v4). crypto.randomUUID esiste solo su HTTPS/localhost:
// sull'iPhone in prova via Wi-Fi (http) si usa il metodo alternativo.
export function nuovoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const adesso = () => new Date().toISOString();

const due = (n) => String(n).padStart(2, '0');

// Data locale 'AAAA-MM-GG'
export function dataLocale(d = new Date()) {
  d = d instanceof Date ? d : new Date(d);
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

// Valore per <input type="datetime-local">
export function perInputDataOra(d = new Date()) {
  return `${dataLocale(d)}T${due(d.getHours())}:${due(d.getMinutes())}`;
}

// Giorni di calendario tra due date 'AAAA-MM-GG' (b − a)
export function giorniTra(a, b) {
  const [y1, m1, g1] = a.split('-').map(Number);
  const [y2, m2, g2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, g2) - Date.UTC(y1, m1 - 1, g1)) / 86400000);
}

export function formatData(aaaammgg) {
  if (!aaaammgg) return '';
  const [y, m, g] = aaaammgg.split('-');
  return `${g}/${m}/${y}`;
}

// "oggi 08:30", "ieri 20:00", "05/11 14:00"
export function formatQuando(iso, ora = new Date()) {
  const d = new Date(iso);
  const diff = giorniTra(dataLocale(d), dataLocale(ora));
  const hh = `${due(d.getHours())}:${due(d.getMinutes())}`;
  if (diff === 0) return `oggi ${hh}`;
  if (diff === 1) return `ieri ${hh}`;
  return `${due(d.getDate())}/${due(d.getMonth() + 1)} ${hh}`;
}

// "" se il dato è di oggi, altrimenti "ieri" / "3 gg fa"
export function etaDato(iso, ora = new Date()) {
  const diff = giorniTra(dataLocale(new Date(iso)), dataLocale(ora));
  if (diff <= 0) return '';
  if (diff === 1) return 'ieri';
  return `${diff} gg fa`;
}

// Numeri all'italiana: 1.400 · 37,2. Senza "decimali" toglie gli zeri finali (max 2).
export function formatNumero(n, decimali) {
  if (n == null || Number.isNaN(n)) return '';
  let s = Math.abs(n).toFixed(decimali ?? 2);
  if (decimali == null && s.includes('.')) s = s.replace(/\.?0+$/, '');
  const [int, dec] = s.split('.');
  const conPunti = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '−' : '') + conPunti + (dec ? `,${dec}` : '');
}

// Accetta "37,2" o "37.2". Restituisce null se vuoto, NaN se non è un numero.
export function parseNumero(testo) {
  if (testo == null) return null;
  const s = String(testo).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const frecciaTra = (attuale, precedente) => {
  if (attuale == null || precedente == null) return '';
  if (attuale > precedente) return '↑';
  if (attuale < precedente) return '↓';
  return '=';
};

// Etichetta di un id in una lista {id, etichetta}
export const nomeDi = (lista, id) => (id == null ? null : lista.find((o) => o.id === id)?.etichetta ?? String(id));

// Letto: "12" → "L12"; "L12" digitato → salvato come "12"
export const normalizzaLetto = (s) => String(s ?? '').trim().toUpperCase().replace(/^L(?=\d)/, '');
export const nomeLetto = (letto) => (/^\d/.test(String(letto)) ? `L${letto}` : String(letto));
export const confrontaLetti = (a, b) => String(a).localeCompare(String(b), 'it', { numeric: true });

// "mr" → "M.R."
export function soloLettere(s) {
  return String(s ?? '').toUpperCase().replace(/[^A-ZÀ-ÖØ-Ý]/g, '');
}
export function formatIniziali(s) {
  const l = soloLettere(s);
  return l ? `${l.split('').join('.')}.` : '';
}

// Crea un elemento: el('div', {class: 'x', onclick: f}, 'testo', altroElemento)
export function el(tag, attributi, ...figli) {
  const e = document.createElement(tag);
  if (attributi instanceof Node || typeof attributi === 'string' || Array.isArray(attributi)) {
    figli.unshift(attributi);
    attributi = null;
  }
  for (const [k, v] of Object.entries(attributi || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false || f === '') continue;
    e.append(f instanceof Node ? f : String(f));
  }
  return e;
}
