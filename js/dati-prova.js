// Pazienti di prova, TUTTI INVENTATI: servono solo a vedere come funziona l'app.
// Le date sono calcolate rispetto a oggi, così il POD è sempre realistico.

import { nuovoPaziente, nuovaRilevazione } from './modello.js';
import { dataLocale } from './util.js';
import { calcolaCancellazione } from './archivio.js';

const vit = (tc, fc, pas, pad, spo2, fr) => ({ tc, fc, pas, pad, spo2, fr });
const gas = (gasSi, feci, alimentazione, extra = {}) => ({ gas: gasSi, feci, nauseaVomito: 'no', sng: false, alimentazione, ...extra });

// Ogni giornata: elenco di [ora, categoria, valori, fonte]
const PROFILI = [
  {
    paziente: { letto: '3', iniziali: 'A.B.', eta: 72, sesso: 'F', peso: 65, intervento: { tipo: 'colon', dettaglio: 'Emicolectomia dx', via: 'lps', operatore: 'Dr. Esempio' } },
    pod: 3,
    giorni: [
      [[14, 'terapia', { liquidi: { attivo: true, nome: 'Ringer 1500 ml' }, antibiotico: { attivo: true, nome: 'cefazolina 2 g' }, tev: { attivo: true, nome: 'enoxaparina 4000 UI' }, analgesia: { attivo: true, nome: 'paracetamolo + ketorolac' }, npt: { attivo: false } }, 'io'],
        [20, 'vitali', vit(37.4, 88, 125, 75, 96, 16), 'diario'], [20, 'dolore', { nrs: 5 }, 'diario'],
        [20, 'esami', { hb: 11.8, gb: 12.1 }, 'io'],
        [20, 'drenaggio', { n: 1, sede: 'fianco dx', tipo: 'tubolare', ml: 150, aspetto: 'siero-ematico' }, 'diario'],
        [20, 'gastro', gas(false, false, 'digiuno'), 'diario'], [20, 'diuresi', { ml: 900, catetere: true }, 'diario'],
        [20, 'mobilizzazione', { livello: 'allettato' }, 'diario']],
      [[8, 'vitali', vit(37.6, 92, 120, 70, 95, 18), 'diario'],
        [8, 'esami', { pcr: 95, hb: 11.0, gb: 13.0, neutrofili: 82, plt: 210, creatinina: 0.9, na: 138, k: 4.1 }, 'io'],
        [9, 'diuresi', { ml: 1300, catetere: true }, 'diario'],
        [9, 'drenaggio', { n: 1, sede: 'fianco dx', tipo: 'tubolare', ml: 120, aspetto: 'siero-ematico' }, 'io'],
        [9, 'gastro', gas(false, false, 'tè-fette-yogurt', { nauseaVomito: 'nausea' }), 'io'],
        [9, 'dolore', { nrs: 4 }, 'io'], [9, 'mobilizzazione', { livello: 'poltrona' }, 'io'], [9, 'ferita', { stato: 'pulita' }, 'io'],
        [20, 'vitali', vit(37.3, 86, 118, 72, 96, 16), 'diario']],
      [[8, 'vitali', vit(37.2, 84, 122, 74, 97, 16), 'diario'],
        [8, 'esami', { pcr: 150, hb: 10.6, gb: 11.2 }, 'io'],
        [9, 'diuresi', { ml: 1500, catetere: false }, 'diario'],
        [9, 'drenaggio', { n: 1, sede: 'fianco dx', tipo: 'tubolare', ml: 100, aspetto: 'sieroso' }, 'io'],
        [9, 'gastro', gas(true, false, 'semiliquida'), 'io'], [9, 'dolore', { nrs: 3 }, 'io'],
        [9, 'mobilizzazione', { livello: 'deambula' }, 'io'],
        [9, 'terapia', { liquidi: { attivo: true, nome: 'Ringer 1000 ml' }, antibiotico: { attivo: false }, tev: { attivo: true, nome: 'enoxaparina 4000 UI' }, analgesia: { attivo: true, nome: 'paracetamolo 1 g x3' }, npt: { attivo: false } }, 'io'],
        [20, 'vitali', vit(37.0, 80, 120, 70, 97, 15), 'diario']],
      [[8, 'vitali', vit(36.8, 78, 124, 76, 98, 15), 'diario'],
        [8, 'esami', { pcr: 120, hb: 10.8, gb: 9.8 }, 'io'],
        [9, 'diuresi', { ml: 1400, catetere: false }, 'diario'],
        [9, 'drenaggio', { n: 1, sede: 'fianco dx', tipo: 'tubolare', ml: 80, aspetto: 'siero-ematico' }, 'io'],
        [9, 'gastro', gas(true, false, 'leggero'), 'io'], [9, 'dolore', { nrs: 2 }, 'io']],
    ],
  },
  {
    paziente: { letto: '7', iniziali: 'C.D.', eta: 58, sesso: 'M', peso: 82, intervento: { tipo: 'colecistectomia', dettaglio: '', via: 'lps', operatore: 'Dr. Esempio' } },
    pod: 1,
    giorni: [
      [[13, 'vitali', vit(36.9, 76, 135, 80, 98, 14), 'diario'], [13, 'dolore', { nrs: 4 }, 'diario'],
        [13, 'drenaggio', { n: 1, sede: 'sottoepatico', tipo: 'tubolare', ml: 50, aspetto: 'siero-ematico' }, 'io'],
        [13, 'diuresi', { catetere: false }, 'diario'],
        [13, 'esami', { hb: 14.2, gb: 9.1 }, 'io']],
      [[8, 'vitali', vit(36.7, 72, 130, 78, 98, 14), 'diario'], [8, 'dolore', { nrs: 2 }, 'io'],
        [8, 'drenaggio', { n: 1, sede: 'sottoepatico', tipo: 'tubolare', ml: 30, aspetto: 'sieroso' }, 'io'],
        [8, 'gastro', gas(true, false, 'leggero'), 'io'], [8, 'mobilizzazione', { livello: 'deambula' }, 'io'],
        [8, 'ferita', { stato: 'pulita' }, 'io'],
        [8, 'esami', { pcr: 18, hb: 13.8, gb: 8.4 }, 'io']],
    ],
  },
  {
    paziente: { letto: '12', iniziali: 'M.R.', eta: 67, sesso: 'M', peso: 78, intervento: { tipo: 'colon', dettaglio: 'Resezione anteriore', via: 'open', operatore: 'Dr. Esempio' } },
    pod: 4,
    giorni: [
      [[18, 'vitali', vit(37.3, 90, 130, 80, 96, 16), 'diario'], [18, 'dolore', { nrs: 4 }, 'diario'],
        [18, 'drenaggio', { n: 1, sede: 'Douglas', tipo: 'tubolare', ml: 100, aspetto: 'siero-ematico' }, 'diario'],
        [18, 'diuresi', { ml: 800, catetere: true }, 'diario'], [18, 'gastro', gas(false, false, 'digiuno'), 'diario'],
        [18, 'esami', { hb: 12.4, gb: 11.0 }, 'io']],
      [[8, 'vitali', vit(37.5, 94, 125, 75, 95, 18), 'diario'], [8, 'esami', { pcr: 110, hb: 11.6, gb: 12.8 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'Douglas', tipo: 'tubolare', ml: 80, aspetto: 'siero-ematico' }, 'io'],
        [9, 'diuresi', { ml: 1200, catetere: true }, 'diario'], [9, 'gastro', gas(false, false, 'tè-fette-yogurt'), 'io'],
        [9, 'dolore', { nrs: 3 }, 'io'], [9, 'mobilizzazione', { livello: 'poltrona' }, 'io']],
      [[8, 'vitali', vit(37.8, 98, 120, 70, 95, 18), 'diario'], [8, 'esami', { pcr: 160, hb: 11.2, gb: 13.5 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'Douglas', tipo: 'tubolare', ml: 60, aspetto: 'siero-ematico' }, 'io'],
        [9, 'diuresi', { ml: 1100, catetere: true }, 'diario'], [9, 'gastro', gas(false, false, 'semiliquida', { nauseaVomito: 'nausea' }), 'io'],
        [9, 'dolore', { nrs: 4 }, 'io']],
      [[8, 'vitali', vit(38.3, 104, 115, 68, 94, 20), 'diario'], [8, 'esami', { pcr: 190, hb: 10.9, gb: 15.2 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'Douglas', tipo: 'tubolare', ml: 90, aspetto: 'siero-ematico' }, 'io'],
        [9, 'diuresi', { ml: 900, catetere: true }, 'diario'], [9, 'gastro', gas(false, false, 'semiliquida', { nauseaVomito: 'vomito' }), 'io'],
        [9, 'dolore', { nrs: 5 }, 'io'], [20, 'vitali', vit(38.6, 108, 110, 65, 94, 22), 'diario']],
      [[8, 'vitali', vit(38.4, 106, 105, 62, 93, 22), 'diario'], [8, 'esami', { pcr: 230, hb: 10.5, gb: 16.8, pct: 2.1, lattati: 2.4 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'Douglas', tipo: 'tubolare', ml: 180, aspetto: 'enterico' }, 'io'],
        [9, 'diuresi', { ml: 650, catetere: true }, 'diario'], [9, 'gastro', gas(false, false, 'digiuno'), 'io'],
        [9, 'dolore', { nrs: 6 }, 'io'], [9, 'note', { testo: 'Avvisato il medico di guardia. In attesa di TC addome.' }, 'io']],
    ],
  },
  {
    paziente: { letto: '15', iniziali: 'E.F.', eta: 45, sesso: 'F', peso: null, intervento: { tipo: 'tiroidectomia', dettaglio: 'Tiroidectomia totale', via: 'open', operatore: 'Dr. Esempio' } },
    pod: 1,
    giorni: [
      [[14, 'vitali', vit(36.8, 80, 120, 75, 98, 14), 'diario'], [14, 'dolore', { nrs: 3 }, 'diario'],
        [14, 'drenaggio', { n: 1, sede: 'loggia tiroidea', tipo: 'tubolare', ml: 40, aspetto: 'ematico' }, 'diario']],
      [[8, 'vitali', vit(36.6, 74, 118, 72, 99, 14), 'diario'], [8, 'dolore', { nrs: 2 }, 'io'],
        [8, 'drenaggio', { n: 1, sede: 'loggia tiroidea', tipo: 'tubolare', ml: 25, aspetto: 'siero-ematico' }, 'io'],
        [8, 'esami', { hb: 12.9, gb: 7.6, calcemia: 8.4 }, 'io'], [8, 'gastro', gas(true, false, 'leggero'), 'io'],
        [8, 'mobilizzazione', { livello: 'deambula' }, 'io']],
    ],
  },
  {
    paziente: { letto: '21', iniziali: 'G.H.', eta: 80, sesso: 'M', peso: 70, intervento: { tipo: 'gastrectomia-totale', dettaglio: '', via: 'open', operatore: 'Dr. Esempio' } },
    pod: 2,
    giorni: [
      [[19, 'vitali', vit(37.2, 88, 140, 82, 96, 16), 'diario'], [19, 'dolore', { nrs: 4 }, 'diario'],
        [19, 'drenaggio', { n: 1, sede: 'anastomosi', tipo: 'tubolare', ml: 150, aspetto: 'siero-ematico' }, 'diario'],
        [19, 'drenaggio', { n: 2, sede: 'sottoepatico', tipo: 'tubolare', ml: 60, aspetto: 'siero-ematico' }, 'diario'],
        [19, 'gastro', gas(false, false, 'digiuno', { sng: true, sngMl: 300, sngAspetto: 'ematico' }), 'diario'],
        [19, 'diuresi', { ml: 700, catetere: true }, 'diario']],
      [[8, 'vitali', vit(37.4, 86, 135, 80, 96, 16), 'diario'], [8, 'esami', { pcr: 120, hb: 10.4, gb: 11.8, albumina: 2.9 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'anastomosi', tipo: 'tubolare', ml: 120, aspetto: 'sieroso' }, 'io'],
        [9, 'drenaggio', { n: 2, sede: 'sottoepatico', tipo: 'tubolare', ml: 40, aspetto: 'sieroso' }, 'io'],
        [9, 'gastro', gas(false, false, 'digiuno', { sng: true, sngMl: 200, sngAspetto: 'biliare' }), 'io'],
        [9, 'diuresi', { ml: 1600, catetere: true }, 'diario'], [9, 'dolore', { nrs: 3 }, 'io'],
        [9, 'terapia', { liquidi: { attivo: true, nome: 'Ringer + glucosata 2000 ml' }, antibiotico: { attivo: true, nome: 'amoxicillina/clavulanato' }, tev: { attivo: true, nome: 'enoxaparina 4000 UI' }, analgesia: { attivo: true, nome: 'elastomero' }, npt: { attivo: true, nome: 'sacca 1500 kcal' } }, 'io']],
      [[8, 'vitali', vit(37.1, 82, 130, 78, 97, 15), 'diario'], [8, 'esami', { pcr: 95, hb: 10.6, gb: 10.2 }, 'io'],
        [9, 'drenaggio', { n: 1, sede: 'anastomosi', tipo: 'tubolare', ml: 90, aspetto: 'sieroso' }, 'io'],
        [9, 'drenaggio', { n: 2, sede: 'sottoepatico', tipo: 'tubolare', ml: 20, aspetto: 'sieroso', rimosso: true }, 'io'],
        [9, 'gastro', gas(true, false, 'digiuno', { sng: true, sngMl: 120, sngAspetto: 'chiaro' }), 'io'],
        [9, 'diuresi', { ml: 1500, catetere: true }, 'diario'], [9, 'dolore', { nrs: 2 }, 'io'],
        [9, 'mobilizzazione', { livello: 'poltrona' }, 'io']],
    ],
  },
];

export function generaDatiProva(ora = new Date()) {
  const pazienti = [];
  const rilevazioni = [];
  for (const profilo of PROFILI) {
    const giornoIntervento = new Date(ora);
    giornoIntervento.setDate(giornoIntervento.getDate() - profilo.pod);
    const p = nuovoPaziente(structuredClone(profilo.paziente));
    p.intervento.data = dataLocale(giornoIntervento);
    pazienti.push(p);
    profilo.giorni.forEach((voci, d) => {
      for (const [hh, categoria, valori, fonte] of voci) {
        const quando = new Date(giornoIntervento);
        quando.setDate(quando.getDate() + d);
        quando.setHours(hh, 0, 0, 0);
        if (quando > ora) continue; // niente dati "dal futuro"
        rilevazioni.push(nuovaRilevazione(p.id, categoria, structuredClone(valori), { dataOra: quando.toISOString(), fonte }));
      }
    });
  }
  // Un paziente già dimesso (in Archivio), con cancellazione automatica tra 2 giorni: serve a provare l'avviso
  const dimissione = new Date(ora);
  dimissione.setDate(dimissione.getDate() - 28);
  const intervento = new Date(dimissione);
  intervento.setDate(intervento.getDate() - 2);
  const dimesso = nuovoPaziente({
    letto: '5', iniziali: 'I.L.', eta: 39, sesso: 'F', peso: 60,
    intervento: { tipo: 'colecistectomia', dettaglio: '', via: 'lps', operatore: 'Dr. Esempio', data: dataLocale(intervento) },
  });
  dimesso.stato = 'dimesso';
  dimesso.dimissione = { data: dataLocale(dimissione), controllo: null };
  dimesso.cancellazioneIl = calcolaCancellazione(dimesso.dimissione.data, null);
  pazienti.push(dimesso);
  [0, 1, 2].forEach((d) => {
    const quando = new Date(intervento);
    quando.setDate(quando.getDate() + d);
    quando.setHours(9, 0, 0, 0);
    rilevazioni.push(nuovaRilevazione(dimesso.id, 'vitali', vit(36.8 - d * 0.1, 76, 120, 75, 98, 14), { dataOra: quando.toISOString(), fonte: 'diario' }));
  });

  return { pazienti, rilevazioni };
}
