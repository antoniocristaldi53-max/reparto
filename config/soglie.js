// Soglie delle allerte (valori predefiniti). Si possono cambiare dalle Impostazioni:
// le modifiche restano salvate sul telefono, questo file resta il riferimento.

export const SOGLIE = {
  tc: 38.0, // °C, febbre (TC ≥)
  fc: 100, // bpm, tachicardia (FC >)
  pas: 100, // mmHg, qSOFA (PAS ≤)
  fr: 22, // atti/min, qSOFA (FR ≥)
  spo2: 93, // % (SpO2 ≤)
  nrs: 4, // NRS ≥
  diuresiMlKgH: 0.5, // ml/kg/h su 24 h, KDIGO (diuresi <; serve il peso)
  drenaggioAumentoPct: 50, // % rispetto al giorno prima (provvisorio)
  liquidoDalPod: 3, // dosaggi sul liquido di drenaggio valutati da questo POD
  amilasiLimiteSup: 100, // U/l, limite superiore dell'amilasi sierica DEL VOSTRO LABORATORIO
  amilasiVolte: 3, // amilasi liquido > 3 × limite sup. sierico (ISGPS 2016)
  bilirubinaVolte: 3, // bilirubina liquido ≥ 3 × sierica (ISGLS)
  trigliceridi: 110, // mg/dl, chyle leak (ISGPS)
  pcrColorettale: 172, // mg/l, PCR > in POD 3 dopo chirurgia colorettale (Singh 2014)
  pcrPod: 3,
  hbCaloAttenzione: 2, // g/dl dal riferimento post-op → attenzione
  hbCaloAllerta: 3, // g/dl dal riferimento post-op → allerta (ISGPS PPH)
  hbMinima: 7, // g/dl, Hb <
};

// Come compaiono nelle Impostazioni
export const VOCI_SOGLIE = [
  { gruppo: 'Vitali (misure delle ultime 24 h)' },
  { id: 'tc', etichetta: 'Febbre: TC ≥', unita: '°C' },
  { id: 'fc', etichetta: 'Tachicardia: FC >', unita: 'bpm' },
  { id: 'pas', etichetta: 'Ipotensione: PAS ≤', unita: 'mmHg', nota: 'qSOFA' },
  { id: 'fr', etichetta: 'Tachipnea: FR ≥', unita: 'atti/min', nota: 'qSOFA' },
  { id: 'spo2', etichetta: 'Desaturazione: SpO2 ≤', unita: '%' },
  { id: 'nrs', etichetta: 'Dolore: NRS ≥', unita: '' },
  { gruppo: 'Diuresi' },
  { id: 'diuresiMlKgH', etichetta: 'Oliguria: diuresi <', unita: 'ml/kg/h', nota: 'KDIGO; serve il peso del paziente' },
  { gruppo: 'Drenaggi' },
  { id: 'drenaggioAumentoPct', etichetta: 'Volume in aumento ≥', unita: '% sul giorno prima', nota: 'Valore provvisorio' },
  { id: 'liquidoDalPod', etichetta: 'Dosaggi sul liquido valutati dal POD', unita: '' },
  { id: 'amilasiLimiteSup', etichetta: 'Amilasi sierica: limite superiore', unita: 'U/l', nota: 'Metti il valore del vostro laboratorio' },
  { id: 'amilasiVolte', etichetta: 'Amilasi liquido > … volte il limite sup.', unita: '×', nota: 'ISGPS 2016' },
  { id: 'bilirubinaVolte', etichetta: 'Bilirubina liquido ≥ … volte la sierica', unita: '×', nota: 'ISGLS' },
  { id: 'trigliceridi', etichetta: 'Trigliceridi liquido ≥', unita: 'mg/dl', nota: 'Chyle leak (ISGPS)' },
  { gruppo: 'Esami' },
  { id: 'pcrColorettale', etichetta: 'PCR dopo chirurgia colorettale >', unita: 'mg/l', nota: 'Singh 2014' },
  { id: 'pcrPod', etichetta: '… misurata in POD', unita: '' },
  { id: 'hbCaloAttenzione', etichetta: 'Hb: calo dal post-op ≥ (attenzione)', unita: 'g/dl' },
  { id: 'hbCaloAllerta', etichetta: 'Hb: calo dal post-op ≥ (allerta)', unita: 'g/dl', nota: 'ISGPS PPH' },
  { id: 'hbMinima', etichetta: 'Hb <', unita: 'g/dl' },
];
