// Modello dei dati e calcoli (POD, ultimi valori, riga riassunto).
//
// Pronto per la Fase 2: ogni record ha un id univoco, data/ora e autore,
// e le rilevazioni non vengono mai sovrascritte (si aggiungono).

import { INTERVENTI } from '../config/interventi.js';
import { VITALI, TERAPIE, ASPETTI_DRENAGGIO, SOGLIA_APIRETICO } from '../config/liste.js';
import { ESAMI } from '../config/esami.js';
import {
  nuovoId, adesso, dataLocale, giorniTra, etaDato, formatNumero, frecciaTra, nomeDi, nomeLetto,
} from './util.js';

let autore = 'io'; // nella Fase 2 diventerà il nome di chi inserisce il dato
export const impostaAutore = (a) => { if (a) autore = a; };

export function nuovoPaziente(dati) {
  const t = adesso();
  return { id: nuovoId(), ...dati, stato: 'degenza', creatoIl: t, modificatoIl: t, autore };
}

// categoria: vitali | dolore | diuresi | drenaggio | gastro | mobilizzazione | ferita | esami | terapia | note | letto
export function nuovaRilevazione(pazienteId, categoria, valori, { dataOra, fonte }) {
  return { id: nuovoId(), pazienteId, categoria, valori, dataOra, fonte, autore, creatoIl: adesso() };
}

export const interventoDi = (p) => INTERVENTI.find((i) => i.id === p.intervento?.tipo) || null;

export function nomeBreveIntervento(p) {
  if (p.intervento?.dettaglio) return p.intervento.dettaglio;
  const i = interventoDi(p);
  if (!i) return '';
  return i.id === 'altro' ? 'Altro intervento' : i.nome;
}

export function podDi(p, quando = new Date()) {
  if (!p.intervento?.data) return null;
  return giorniTra(p.intervento.data, dataLocale(quando));
}

export const testoPod = (pod) => (pod == null ? '' : pod < 0 ? 'pre-op' : `POD ${pod}`);

export const etichettaPaziente = (p) => `${nomeLetto(p.letto)} ${p.iniziali} ${p.eta}`;

// Ultimo e penultimo valore di una chiave in una lista ordinata per data
function ultimoCon(lista, chiave) {
  let ultimo = null;
  for (let i = lista.length - 1; i >= 0; i--) {
    const v = lista[i].valori?.[chiave];
    if (v == null) continue;
    if (!ultimo) ultimo = { valore: v, r: lista[i], precedente: null };
    else { ultimo.precedente = { valore: v, r: lista[i] }; break; }
  }
  return ultimo;
}

const campi = (lista, chiavi) => Object.fromEntries(chiavi.map((k) => [k, ultimoCon(lista, k)]));

// Riassume tutte le rilevazioni di un paziente
export function analizza(paziente, rilevazioni, ora = new Date()) {
  const ord = [...rilevazioni].sort((x, y) => (x.dataOra < y.dataOra ? -1 : x.dataOra > y.dataOra ? 1 : 0));
  const per = (cat) => ord.filter((r) => r.categoria === cat);

  const vit = per('vitali');
  const limite24h = ora.getTime() - 24 * 3600e3;
  let tcMax24 = null;
  for (const r of vit) {
    const t = r.valori.tc;
    if (t != null && new Date(r.dataOra).getTime() >= limite24h && (!tcMax24 || t > tcMax24.valore)) tcMax24 = { valore: t, r };
  }

  const gl = per('gastro');
  const dren = per('drenaggio');
  const ter = per('terapia');

  return {
    vitali: campi(vit, VITALI.map((v) => v.id)),
    tcMax24,
    gastro: {
      presente: gl.length > 0,
      ultimo: gl.at(-1) || null,
      primoGas: gl.find((r) => r.valori.gas === true) || null,
      primeFeci: gl.find((r) => r.valori.feci === true) || null,
      campi: campi(gl, ['gas', 'feci', 'nauseaVomito', 'sng', 'sngMl', 'sngAspetto', 'alimentazione']),
    },
    drenaggi: [1, 2].map((n) => {
      const l = dren.filter((r) => r.valori.n === n);
      if (!l.length) return null;
      const ultimo = l.at(-1);
      return {
        n, ultimo, rimosso: ultimo.valori.rimosso === true,
        campi: campi(l, ['sede', 'tipo', 'ml', 'aspetto', 'amilasi', 'bilirubina', 'trigliceridi']),
      };
    }).filter(Boolean),
    diuresi: campi(per('diuresi'), ['ml', 'catetere']),
    dolore: ultimoCon(per('dolore'), 'nrs'),
    mobilizzazione: ultimoCon(per('mobilizzazione'), 'livello'),
    ferita: campi(per('ferita'), ['stato', 'nota']),
    esami: campi(per('esami'), ESAMI.map((e) => e.id)),
    terapia: campi(ter, TERAPIE.map((t) => t.id)),
    terapiaUltima: ter.at(-1) || null,
    note: per('note').reverse(),
    letti: per('letto'),
  };
}

// Riga da leggere ad alta voce nella lista del reparto
export function riassunto(p, a, ora = new Date()) {
  const intestazione = [etichettaPaziente(p), nomeBreveIntervento(p), testoPod(podDi(p, ora))].filter(Boolean).join(' · ');
  const parti = [];
  const vecchio = (r) => etaDato(r.dataOra, ora);
  const febbre = (t) => (t < SOGLIA_APIRETICO ? 'apiretico' : `TC ${formatNumero(t, 1)}`);

  // Ogni voce ha una "chiave" (per colorarla se c'è un'allerta) e un "verso":
  // +1 se l'aumento è un peggioramento, −1 se è un miglioramento.

  // 1. Febbre (massima delle ultime 24 h; se manca, l'ultima misura)
  if (a.tcMax24) parti.push({ chiave: 'tc', testo: febbre(a.tcMax24.valore) });
  else if (a.vitali.tc) parti.push({ chiave: 'tc', testo: febbre(a.vitali.tc.valore), vecchio: vecchio(a.vitali.tc.r) });

  // 2. Canalizzazione e SNG
  const g = a.gastro;
  if (g.primeFeci) parti.push({ chiave: 'canalizzazione', testo: 'canalizzato a feci' });
  else if (g.primoGas) parti.push({ chiave: 'canalizzazione', testo: 'canalizzato a gas' });
  else if (g.presente) parti.push({ chiave: 'canalizzazione', testo: 'non canalizzato', vecchio: vecchio(g.ultimo) });
  if (g.campi.sng?.valore === true) {
    const ml = g.campi.sngMl;
    parti.push({
      chiave: 'sng',
      verso: 1,
      testo: `SNG${ml ? ` ${formatNumero(ml.valore)} ml` : ''}`,
      freccia: ml ? frecciaTra(ml.valore, ml.precedente?.valore) : '',
      vecchio: vecchio(g.campi.sng.r),
    });
  }

  // 3. Drenaggi in sede
  for (const d of a.drenaggi) {
    if (d.rimosso) continue;
    const ml = d.campi.ml;
    const asp = d.campi.aspetto;
    parti.push({
      chiave: `d${d.n}`,
      verso: 1,
      testo: [`D${d.n}`, ml && `${formatNumero(ml.valore)} ml`, asp && nomeDi(ASPETTI_DRENAGGIO, asp.valore)].filter(Boolean).join(' '),
      freccia: ml ? frecciaTra(ml.valore, ml.precedente?.valore) : '',
      vecchio: vecchio(ml ? ml.r : d.ultimo),
    });
  }

  // 4. Diuresi
  if (a.diuresi.ml) parti.push({ chiave: 'diuresi', testo: `diuresi ${formatNumero(a.diuresi.ml.valore)} ml`, vecchio: vecchio(a.diuresi.ml.r) });

  // 5. Dolore, PCR, Hb
  if (a.dolore) {
    parti.push({
      chiave: 'nrs', verso: 1, testo: `NRS ${a.dolore.valore}`, freccia: frecciaTra(a.dolore.valore, a.dolore.precedente?.valore), vecchio: vecchio(a.dolore.r),
    });
  }
  for (const [k, nome, verso] of [['pcr', 'PCR', 1], ['hb', 'Hb', -1]]) {
    const e = a.esami[k];
    if (e) parti.push({ chiave: k, verso, testo: `${nome} ${formatNumero(e.valore)}`, freccia: frecciaTra(e.valore, e.precedente?.valore), vecchio: vecchio(e.r) });
  }

  return { intestazione, parti };
}

export const testoParte = (x) => `${x.testo}${x.freccia ? ` ${x.freccia}` : ''}${x.vecchio ? ` (${x.vecchio})` : ''}`;
