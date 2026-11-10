// Percorso atteso: confronta i passi del protocollo con i dati inseriti.
//
// Stato di ogni passo:
//   fatto       → avvenuto (secondo i dati o la spunta)
//   oggi        → atteso oggi, non ancora avvenuto
//   ritardo     → il giorno atteso è passato e non è avvenuto
//   futuro      → atteso nei prossimi giorni
//   senza-dati  → non si può dire (es. nessun dato sul catetere)
//   info        → promemoria senza spunta

import { INTERVENTI } from '../config/interventi.js';
import { PERCORSI } from '../config/percorsi.js';
import { podDi } from './modello.js';

const LIVELLI_ALIMENTAZIONE = ['digiuno', 'liquidi/idrica', 'tè-fette-yogurt', 'semiliquida', 'leggero', 'libera'];

// Passi che, se in ritardo, diventano un'allerta "fuori percorso" (con il testo da mostrare)
const TESTO_RITARDO = {
  catetere: () => 'catetere ancora in sede',
  drenaggi: () => 'drenaggi ancora in sede',
  alimentazione: (passo) => `alimentazione non ancora ${passo.livello}`,
  canalizzazione: () => 'non canalizzato',
  mobilizzazione: () => 'non ancora mobilizzato',
};

const scegliVia = (perVia, via) => perVia?.[via] ?? (via === 'robotica' ? perVia?.lps : undefined) ?? perVia?.tutte ?? null;

// "2" → 2 · ">4" → 4 (minimo, senza limite) · "0–1" → 1
export function nottiPreviste(p) {
  const i = INTERVENTI.find((x) => x.id === p.intervento?.tipo);
  const testo = scegliVia(i?.notti, p.intervento?.via);
  if (!testo) return null;
  const aperto = testo.startsWith('>');
  const numeri = testo.match(/\d+/g);
  return { testo, notti: Number(numeri.at(-1)), aperto };
}

export function valutaPercorso(p, rilevazioni, ora = new Date()) {
  const pod = podDi(p, ora);
  const perVia = PERCORSI[p.intervento?.tipo];
  const passiConfig = scegliVia(perVia, p.intervento?.via);
  const notti = nottiPreviste(p);
  if (!passiConfig) {
    let motivo = 'Nessun percorso standard per questo intervento.';
    if (perVia && !p.intervento?.via) motivo = 'Indica la via (open / LPS / robotica) nella scheda del paziente per vedere il percorso.';
    return { disponibile: false, motivo, pod, notti, passi: [] };
  }

  const ord = [...rilevazioni]
    .sort((a, b) => (a.dataOra < b.dataOra ? -1 : a.dataOra > b.dataOra ? 1 : 0))
    .map((r) => ({ r, v: r.valori, pod: podDi(p, new Date(r.dataOra)) }));
  const di = (cat) => ord.filter((x) => x.r.categoria === cat);

  // Ogni controllo restituisce true (avvenuto), false (non avvenuto) o null (nessun dato)
  const controlli = {
    catetere: () => {
      const l = di('diuresi').filter((x) => x.v.catetere != null);
      return l.length ? l.at(-1).v.catetere === false : null;
    },
    drenaggi: () => {
      const l = di('drenaggio');
      if (!l.length) return null;
      const ultimi = new Map();
      l.forEach((x) => ultimi.set(x.v.n, x.v));
      return [...ultimi.values()].every((v) => v.rimosso === true);
    },
    alimentazione: (passo) => {
      const l = di('gastro').filter((x) => x.v.alimentazione);
      if (!l.length) return null;
      const attuale = LIVELLI_ALIMENTAZIONE.indexOf(l.at(-1).v.alimentazione); // NPT → -1: non avvenuto
      return attuale >= LIVELLI_ALIMENTAZIONE.indexOf(passo.livello);
    },
    canalizzazione: () => {
      const l = di('gastro');
      if (!l.length) return null;
      return l.some((x) => x.v.gas === true || x.v.feci === true);
    },
    mobilizzazione: () => {
      const l = di('mobilizzazione').filter((x) => x.v.livello);
      return l.length ? ['poltrona', 'deambula'].includes(l.at(-1).v.livello) : null;
    },
    esame: (passo) => di('esami').filter((x) => x.pod === passo.giorno).some((x) => {
      if (passo.quale === 'emocromo') return x.v.hb != null || x.v.gb != null;
      if (passo.quale === 'calcemia') return x.v.calcemia != null || x.v.ca != null;
      return x.v.pcr != null || Object.keys(x.v).length >= 4; // profilo 3
    }),
    amilasiDrenaggio: (passo) => di('drenaggio').some((x) => x.pod === passo.giorno && x.v.amilasi != null),
    manuale: (passo) => {
      const l = di('percorso').filter((x) => x.v.passo === passo.id);
      return l.length ? l.at(-1).v.fatto === true : false;
    },
  };

  const passi = passiConfig.map((passo) => {
    if (passo.tipo === 'nota') return { ...passo, stato: 'info' };
    const esito = controlli[passo.tipo](passo);
    let stato;
    if (esito === true) stato = 'fatto';
    else if (pod < passo.giorno) stato = 'futuro';
    else if (esito === null) stato = 'senza-dati';
    else if (pod === passo.giorno) stato = 'oggi';
    else stato = 'ritardo';
    const allerta = stato === 'ritardo' && TESTO_RITARDO[passo.tipo]
      ? `${TESTO_RITARDO[passo.tipo](passo)} (atteso G${passo.giorno})` : null;
    return { ...passo, stato, allerta };
  }).sort((a, b) => (a.giorno ?? 99) - (b.giorno ?? 99));

  // Alimentazione: se più passi sono in ritardo, conta solo l'ultimo (gli altri sono superati)
  const alimInRitardo = passi.filter((x) => x.tipo === 'alimentazione' && x.allerta);
  alimInRitardo.slice(0, -1).forEach((x) => { x.allerta = null; });

  return {
    disponibile: true, pod, notti, passi,
    oltreDegenza: !!notti && !notti.aperto && pod > notti.notti,
  };
}
