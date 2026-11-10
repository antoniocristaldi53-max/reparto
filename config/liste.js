// Liste fisse usate nei moduli. Puoi modificarle a mano:
// "id" è il valore salvato (non cambiarlo per voci già usate), "etichetta" è il testo mostrato.

const voci = (...nomi) => nomi.map((n) => ({ id: n, etichetta: n }));

export const FONTI = [
  { id: 'diario', etichetta: 'Diario inf.' },
  { id: 'collega', etichetta: 'Collega' },
  { id: 'io', etichetta: 'Rilevato da me' },
];

export const VIE = [
  { id: 'open', etichetta: 'Open' },
  { id: 'lps', etichetta: 'LPS' },
  { id: 'robotica', etichetta: 'Robotica' },
];

export const SESSI = [
  { id: 'M', etichetta: 'M' },
  { id: 'F', etichetta: 'F' },
];

export const TIPI_DRENAGGIO = [
  { id: 'penrose', etichetta: 'Penrose' },
  { id: 'tubolare', etichetta: 'Tubolare' },
  { id: 'altro', etichetta: 'Altro' },
];

export const ASPETTI_DRENAGGIO = voci(
  'siero-ematico', 'ematico', 'sieroso', 'enterico', 'biliare', 'purulento', 'chiloso',
);

// Dosaggi facoltativi sul liquido di drenaggio
export const DOSAGGI_DRENAGGIO = [
  { id: 'amilasi', etichetta: 'Amilasi', unita: 'U/l' },
  { id: 'bilirubina', etichetta: 'Bilirubina', unita: 'mg/dl' },
  { id: 'trigliceridi', etichetta: 'Trigliceridi', unita: 'mg/dl' },
];

export const ASPETTI_SNG = voci('chiaro', 'biliare', 'enterico', 'ematico', 'caffeano');

export const NAUSEA_VOMITO = [
  { id: 'no', etichetta: 'No' },
  { id: 'nausea', etichetta: 'Nausea' },
  { id: 'vomito', etichetta: 'Vomito' },
];

export const ALIMENTAZIONE = voci(
  'digiuno', 'liquidi/idrica', 'tè-fette-yogurt', 'semiliquida', 'leggero', 'libera', 'NPT',
);

export const MOBILIZZAZIONE = voci('allettato', 'poltrona', 'deambula');

export const FERITA = voci('pulita', 'arrossata', 'secernente', 'deiscenza');

export const TERAPIE = [
  { id: 'liquidi', etichetta: 'Liquidi ev', esempio: 'es. Ringer 1500 ml' },
  { id: 'antibiotico', etichetta: 'Antibiotico', esempio: 'es. cefazolina 2 g' },
  { id: 'tev', etichetta: 'Profilassi TEV', esempio: 'es. enoxaparina 4000 UI' },
  { id: 'analgesia', etichetta: 'Analgesia', esempio: 'es. paracetamolo 1 g x3' },
  { id: 'npt', etichetta: 'NPT', esempio: 'es. sacca 1500 kcal' },
];

// Parametri vitali, con limiti di plausibilità (servono solo a scoprire errori di battitura).
export const VITALI = [
  { id: 'tc', etichetta: 'TC', unita: '°C', min: 33, max: 43, decimali: 1 },
  { id: 'fc', etichetta: 'FC', unita: 'bpm', min: 20, max: 220, decimali: 0 },
  { id: 'pas', etichetta: 'PA sistolica', unita: 'mmHg', min: 40, max: 260, decimali: 0 },
  { id: 'pad', etichetta: 'PA diastolica', unita: 'mmHg', min: 20, max: 160, decimali: 0 },
  { id: 'spo2', etichetta: 'SpO2', unita: '%', min: 50, max: 100, decimali: 0 },
  { id: 'fr', etichetta: 'FR', unita: 'atti/min', min: 4, max: 60, decimali: 0 },
  { id: 'glicemia', etichetta: 'Glicemia', unita: 'mg/dl', min: 20, max: 800, decimali: 0 },
];

// Sotto questa temperatura (massima delle ultime 24 h) il paziente è "apiretico" nella lista.
// Le soglie delle allerte arriveranno nella tappa 3 (config/soglie.js).
export const SOGLIA_APIRETICO = 37.5;
