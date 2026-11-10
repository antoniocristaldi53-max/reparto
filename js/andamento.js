// Calcoli per l'Andamento: mette ogni rilevazione sul suo giorno post-operatorio (POD)
// e su una posizione continua nel tempo (es. POD 2 alle 18:00 → x = 2,75).

import { podDi } from './modello.js';

const PRE_OP_MASSIMO = 3; // giorni prima dell'intervento mostrati al massimo

export function datiAndamento(p, rilevazioni, ora = new Date()) {
  const [y, m, d] = p.intervento.data.split('-').map(Number);
  const zero = new Date(y, m - 1, d).getTime(); // mezzanotte del giorno dell'intervento

  const tutte = [...rilevazioni]
    .sort((a, b) => (a.dataOra < b.dataOra ? -1 : a.dataOra > b.dataOra ? 1 : 0))
    .map((r) => {
      const t = new Date(r.dataOra);
      return { r, v: r.valori, x: (t.getTime() - zero) / 86400000, pod: podDi(p, t) };
    })
    .filter((c) => c.pod >= -PRE_OP_MASSIMO);

  const podOggi = podDi(p, ora);
  const podMin = Math.min(0, ...tutte.map((c) => c.pod));
  const podMax = Math.max(podOggi, 0, ...tutte.map((c) => c.pod));
  const giorni = [];
  for (let g = podMin; g <= podMax; g++) giorni.push(g);

  const perGiorno = new Map(giorni.map((g) => [g, []]));
  tutte.forEach((c) => perGiorno.get(c.pod)?.push(c));

  return {
    tutte, giorni, perGiorno, podOggi,
    dominio: [podMin, podMax + 1],
    dataDelGiorno: (g) => new Date(y, m - 1, d + g),
  };
}

// Rilevazioni di una categoria (con filtro facoltativo)
export const diCategoria = (A, categoria, filtro = () => true) => A.tutte.filter((c) => c.r.categoria === categoria && filtro(c));

// Punti nel tempo (per le linee): un punto per ogni misura
export const puntiNelTempo = (lista, chiave) => lista.filter((c) => c.v[chiave] != null).map((c) => ({ x: c.x, y: c.v[chiave] }));

// Un valore per giorno (per le barre): l'ultimo inserito in quel giorno
export function puntiGiornalieri(lista, chiave) {
  const m = new Map();
  lista.forEach((c) => { if (c.v[chiave] != null) m.set(c.pod, c.v[chiave]); });
  return [...m].map(([pod, y]) => ({ x: pod, y }));
}
