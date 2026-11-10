// Percorso atteso giorno per giorno (protocollo del reparto, rev. 14/02/2026).
//
// Ogni passo ha un "giorno" (G0 = giorno dell'intervento) entro cui è atteso e un "tipo":
//   catetere, drenaggi, alimentazione, canalizzazione, mobilizzazione → l'app controlla da sola
//     sui dati inseriti; se il giorno è passato e il passo non è avvenuto → "fuori percorso".
//   esame, amilasiDrenaggio → controllati sui dati di quel giorno (promemoria, nessuna allerta).
//   manuale → spunta a mano nella scheda (es. fascia, Rx transito).
//   nota    → solo promemoria, senza spunta.
//
// Le vie sono: lps, open, tutte (vale per qualunque via). La robotica usa il percorso LPS.
//
// ATTENZIONE — due interpretazioni aggiunte da Claude, da confermare:
//  1. "Canalizzazione attesa entro G2" per colon, retto, TAMIS e resezione gastrica
//     (il protocollo dice "drenaggi dopo canalizzazione"; l'esempio "colon POD 3 non canalizzato"
//     indica che al POD 3 è già fuori percorso).
//  2. Gastrectomia totale: alimentazione idrica attesa entro G6 (dopo Rx transito a G5).

const catetere = (giorno, quando = 'dopo visita') => ({ id: 'catetere', tipo: 'catetere', giorno, testo: `Rimozione catetere (${quando})` });
const drenaggi = (giorno, quando = 'dopo visita') => ({ id: 'drenaggi', tipo: 'drenaggi', giorno, testo: `Rimozione drenaggi (${quando})` });
const alimentazione = (giorno, livello, quando) => ({
  id: `alimentazione-G${giorno}`, tipo: 'alimentazione', giorno, livello, testo: `Alimentazione: ${livello}${quando ? ` (${quando})` : ''}`,
});
const canalizzazione = (giorno) => ({ id: 'canalizzazione', tipo: 'canalizzazione', giorno, testo: 'Canalizzazione (almeno a gas)' });
const mobilizzazione = (giorno) => ({ id: 'mobilizzazione', tipo: 'mobilizzazione', giorno, testo: giorno === 0 ? 'Mobilizzazione immediata' : 'Mobilizzazione (poltrona o deambula)' });
const esame = (giorno, quale) => ({
  id: `esame-${quale}-G${giorno}`, tipo: 'esame', giorno, quale,
  testo: { emocromo: 'Emocromo', profilo3: 'Profilo 3', calcemia: 'Calcemia' }[quale],
});
const amilasiDrenaggio = (giorno) => ({ id: `amilasi-drenaggio-G${giorno}`, tipo: 'amilasiDrenaggio', giorno, testo: 'Amilasi sul drenaggio sx' });
const manuale = (giorno, id, testo) => ({ id, tipo: 'manuale', giorno, testo });
const nota = (testo) => ({ id: `nota-${testo}`, tipo: 'nota', giorno: null, testo });

const fascia = manuale(1, 'fascia', 'Fascia addominale');
const stomia = manuale(0, 'stomia', 'Stomia: gestione da G0 (se presente)');

// Comune a tutti: mobilizzazione G1 (immediata in piccola chirurgia); esami G0 emocromo, G1 profilo 3
const base = ({ piccola = false, esami = [esame(0, 'emocromo'), esame(1, 'profilo3')] } = {}) => [mobilizzazione(piccola ? 0 : 1), ...esami];
const alimentazioneColon = [
  alimentazione(1, 'tè-fette-yogurt'),
  alimentazione(2, 'semiliquida'),
  alimentazione(3, 'leggero'),
];
const profilo3OgniGiorno = [1, 2, 3, 4].map((g) => esame(g, 'profilo3'));
const esamiColon = [esame(0, 'emocromo'), ...profilo3OgniGiorno];

const colon = (giornoCatetere, quandoCatetere, open) => [
  ...base({ esami: esamiColon }),
  stomia,
  catetere(giornoCatetere, quandoCatetere),
  canalizzazione(2),
  drenaggi(3, 'G2–3, dopo visita, dopo canalizzazione'),
  ...alimentazioneColon,
  ...(open ? [fascia] : []),
];

const proctologia = [
  ...base({ piccola: true }),
  catetere(1, 'ore 6'),
  manuale(1, 'sonda-rettale', 'Sonda rettale rimossa / zaffo sostituito (in visita)'),
  alimentazione(1, 'leggero'),
];

const erniaOpen = [
  ...base({ piccola: true }),
  catetere(1, 'ore 6, se presente'),
  drenaggi(1, 'dopo visita, se presente'),
  alimentazione(1, 'leggero'),
];

export const PERCORSI = {
  colecistectomia: {
    lps: [...base(), drenaggi(2), alimentazione(1, 'leggero')],
    open: [...base(), catetere(1, 'ore 6'), drenaggi(2), alimentazione(1, 'leggero')],
  },
  tapp: { tutte: [...base(), catetere(1, 'ore 6'), drenaggi(2), alimentazione(1, 'leggero')] },
  'ombelicale-lps': { tutte: [...base(), catetere(1, 'ore 6'), drenaggi(2), alimentazione(1, 'leggero')] },
  starr: { tutte: proctologia },
  emorroidectomia: { tutte: proctologia },
  'ascessi-fistole': { tutte: proctologia },
  colon: {
    lps: colon(2, 'G1–2, dopo visita', false),
    open: colon(2, 'G1–2, dopo visita', true),
  },
  retto: {
    lps: colon(2, 'G1–2, dopo visita', false),
    open: colon(3, 'G2–3, dopo visita', false),
  },
  tamis: { tutte: colon(2, 'G1–2, dopo visita', false) },
  'inguinale-open': { tutte: erniaOpen },
  'ombelicale-open': { tutte: erniaOpen },
  laparocele: {
    lps: [...base(), catetere(1, 'ore 6'), drenaggi(2), alimentazione(1, 'leggero'), fascia],
    open: [...base(), catetere(1, 'dopo visita'), drenaggi(2), alimentazione(1, 'tè-fette-yogurt'), fascia],
  },
  sinus: {
    tutte: [
      ...base({ piccola: true, esami: [esame(1, 'emocromo')] }),
      alimentazione(1, 'libera', 'normale'),
      nota('A casa con drenaggio / zaffo'),
    ],
  },
  dcp: {
    tutte: [
      ...base(),
      catetere(3, 'G2–3, dopo visita'),
      ...alimentazioneColon,
      amilasiDrenaggio(1), amilasiDrenaggio(3), amilasiDrenaggio(5),
      nota('Drenaggi: rimozione quando le amilasi sono negative'),
    ],
  },
  'pancreas-coda': {
    lps: [...base(), catetere(2), ...alimentazioneColon, nota('Drenaggi secondo decorso; dosare l’amilasi prima della rimozione')],
    open: [
      ...base({ esami: [esame(0, 'emocromo'), esame(1, 'profilo3'), esame(3, 'profilo3')] }),
      catetere(2), ...alimentazioneColon, nota('Drenaggi secondo decorso'),
    ],
  },
  gastrica: {
    tutte: [
      ...base(), catetere(2, 'G1–2, dopo visita'), canalizzazione(2),
      drenaggi(3, 'G2–3, dopo canalizzazione'), ...alimentazioneColon, fascia,
    ],
  },
  'gastrectomia-totale': {
    tutte: [
      ...base(), catetere(3, 'G2–3, dopo visita'),
      manuale(5, 'rx-transito', 'Rx transito'),
      drenaggi(6, 'G5–6, dopo Rx transito'),
      alimentazione(6, 'liquidi/idrica', 'dopo Rx transito'),
      fascia,
      nota('Digiuno fino a G5; sondino nasodigiunale se indicato'),
    ],
  },
  tiroidectomia: { tutte: [...base(), drenaggi(2), alimentazione(1, 'leggero'), esame(2, 'calcemia')] },
  iatale: {
    tutte: [
      ...base(), catetere(1), drenaggi(2),
      alimentazione(1, 'tè-fette-yogurt'), alimentazione(2, 'leggero'),
    ],
  },
};
