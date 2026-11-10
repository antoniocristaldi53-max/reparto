// Grafici disegnati a mano in SVG (nessuna libreria esterna, funzionano offline).
// Asse X = giorni post-operatori (POD); ogni giorno è una colonna.
//
// serie: [{ tipo: 'linea' | 'barre' | 'intervallo', classe: 's1' | 's2', punti: [{ x, y, y2? }] }]
//  - linea:      x continuo (POD + ora del giorno)
//  - barre:      x = numero del POD (una barra per giorno)
//  - intervallo: segmento verticale da y a y2 (es. PA diastolica → sistolica)

import { formatNumero } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

function s(tag, attributi = {}, testo) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attributi)) if (v != null) e.setAttribute(k, v);
  if (testo != null) e.textContent = testo;
  return e;
}

function passoBello(grezzo) {
  const p = 10 ** Math.floor(Math.log10(grezzo));
  const n = grezzo / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function grafico({
  dominio, serie, riferimenti = [], minimoY, massimoY, includiZero = false, decimali = 0, descrizione = '',
}) {
  const W = 340;
  const H = 170;
  const sx = 40; // margine sinistro (etichette Y)
  const dx = 12;
  const su = 16;
  const giu = 24; // margine basso (numeri dei POD)

  // Scala verticale
  const valori = serie.flatMap((se) => se.punti.flatMap((pt) => (pt.y2 != null ? [pt.y, pt.y2] : [pt.y])));
  riferimenti.forEach((r) => valori.push(r.y));
  if (minimoY != null) valori.push(minimoY);
  if (massimoY != null) valori.push(massimoY);
  if (includiZero) valori.push(0);
  let lo = Math.min(...valori);
  let hi = Math.max(...valori);
  if (hi === lo) { hi += 1; lo -= 1; }
  const passo = passoBello((hi - lo) / 4);
  lo = Math.floor(lo / passo) * passo;
  hi = Math.ceil(hi / passo) * passo;
  if (includiZero && lo < 0 && Math.min(...valori) >= 0) lo = 0;

  const [x0, x1] = dominio;
  const X = (x) => sx + ((x - x0) / (x1 - x0)) * (W - sx - dx);
  const Y = (y) => su + ((hi - y) / (hi - lo)) * (H - su - giu);
  const larghezzaGiorno = X(x0 + 1) - X(x0);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafico', role: 'img', 'aria-label': descrizione });

  // Griglia orizzontale ed etichette Y
  const decY = passo < 1 ? 1 : 0;
  for (let v = lo; v <= hi + passo / 1000; v += passo) {
    svg.append(
      s('line', { x1: sx, x2: W - dx, y1: Y(v), y2: Y(v), class: 'g-griglia' }),
      s('text', { x: sx - 6, y: Y(v) + 4, class: 'g-asse', 'text-anchor': 'end' }, formatNumero(v, decY)),
    );
  }

  // Colonne dei giorni e numeri dei POD
  const ogni = x1 - x0 > 12 ? 2 : 1;
  const prefisso = larghezzaGiorno >= 44 ? 'POD ' : ''; // "POD 3" se c'è spazio, altrimenti solo "3"
  for (let g = x0; g < x1; g++) {
    svg.append(s('line', { x1: X(g), x2: X(g), y1: su, y2: H - giu, class: 'g-giorno' }));
    if ((g - x0) % ogni === 0) {
      svg.append(s('text', { x: (X(g) + X(g + 1)) / 2, y: H - 7, class: 'g-asse', 'text-anchor': 'middle' }, g < 0 ? 'pre-op' : `${prefisso}${g}`));
    }
  }
  svg.append(s('line', { x1: X(x1), x2: X(x1), y1: su, y2: H - giu, class: 'g-giorno' }));

  // Linee di soglia
  riferimenti.forEach((r) => {
    svg.append(
      s('line', { x1: sx, x2: W - dx, y1: Y(r.y), y2: Y(r.y), class: 'g-rif' }),
      s('text', { x: sx + 4, y: Y(r.y) - 4, class: 'g-rif-testo' }, r.etichetta),
    );
  });

  // Serie
  const nBarre = serie.filter((se) => se.tipo === 'barre' && se.punti.length).length;
  let iBarra = 0;
  const etichettaValore = (x, y, testo, classe) => {
    const vicinoAlBordo = X(x) > W - dx - 18;
    svg.append(s('text', {
      x: vicinoAlBordo ? X(x) - 4 : X(x),
      y: Math.max(su - 4, Y(y) - 8),
      class: `g-valore ${classe}`,
      'text-anchor': vicinoAlBordo ? 'end' : 'middle',
    }, testo));
  };

  for (const se of serie) {
    const pts = se.punti;
    if (!pts.length) continue;

    if (se.tipo === 'linea') {
      if (pts.length > 1) svg.append(s('polyline', { points: pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(' '), class: `g-linea ${se.classe}` }));
      pts.forEach((p) => svg.append(s('circle', { cx: X(p.x), cy: Y(p.y), r: 3.2, class: `g-punto ${se.classe}` })));
      const u = pts.at(-1);
      etichettaValore(u.x, u.y, formatNumero(u.y, decimali), se.classe);
    } else if (se.tipo === 'intervallo') {
      pts.forEach((p) => svg.append(s('line', { x1: X(p.x), x2: X(p.x), y1: Y(p.y), y2: Y(p.y2), class: `g-intervallo ${se.classe}` })));
      const u = pts.at(-1);
      etichettaValore(u.x, u.y, `${formatNumero(u.y)}/${formatNumero(u.y2)}`, se.classe);
    } else if (se.tipo === 'barre') {
      const bw = Math.min(24, (larghezzaGiorno * 0.72) / nBarre);
      const scarto = (iBarra - (nBarre - 1) / 2) * bw;
      const base = Y(Math.max(lo, 0));
      pts.forEach((p) => {
        const cx = (X(p.x) + X(p.x + 1)) / 2 + scarto;
        const yv = Y(p.y);
        svg.append(s('rect', {
          x: cx - bw / 2 + 1, y: Math.min(yv, base), width: Math.max(bw - 2, 2), height: Math.max(Math.abs(base - yv), 1), rx: 2, class: `g-barra ${se.classe}`,
        }));
        if (larghezzaGiorno / nBarre >= 26) {
          svg.append(s('text', { x: cx, y: Math.max(su - 4, yv - 4), class: 'g-valore-piccolo', 'text-anchor': 'middle' }, formatNumero(p.y, decimali)));
        }
      });
      iBarra++;
    }
  }
  return svg;
}
