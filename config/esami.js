// Esami di laboratorio. "evidenza: true" = mostrati sempre in cima.
// "max" (facoltativo) serve solo a scoprire errori di battitura.

export const GRUPPI_ESAMI = [
  { id: 'emocromo', nome: 'Emocromo con formula' },
  { id: 'coagulazione', nome: 'Coagulazione' },
  { id: 'rene', nome: 'Glicemia e funzione renale' },
  { id: 'fegato', nome: 'Fegato e pancreas' },
  { id: 'elettroliti', nome: 'Elettroliti' },
  { id: 'proteine', nome: 'Proteine e altro' },
  { id: 'aggiuntivi', nome: 'Aggiuntivi su richiesta' },
];

export const ESAMI = [
  // In evidenza
  { id: 'pcr', etichetta: 'PCR', unita: 'mg/l', gruppo: 'proteine', evidenza: true },
  { id: 'hb', etichetta: 'Hb', unita: 'g/dl', gruppo: 'emocromo', evidenza: true, max: 25 },
  { id: 'gb', etichetta: 'GB', unita: '×10³/µl', gruppo: 'emocromo', evidenza: true, max: 200 },

  // Emocromo con formula
  { id: 'neutrofili', etichetta: 'Neutrofili', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'linfociti', etichetta: 'Linfociti', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'monociti', etichetta: 'Monociti', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'eosinofili', etichetta: 'Eosinofili', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'basofili', etichetta: 'Basofili', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'gr', etichetta: 'GR', unita: '×10⁶/µl', gruppo: 'emocromo', max: 10 },
  { id: 'ht', etichetta: 'Ht', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'mcv', etichetta: 'MCV', unita: 'fl', gruppo: 'emocromo' },
  { id: 'mch', etichetta: 'MCH', unita: 'pg', gruppo: 'emocromo' },
  { id: 'mchc', etichetta: 'MCHC', unita: 'g/dl', gruppo: 'emocromo' },
  { id: 'rdw', etichetta: 'RDW', unita: '%', gruppo: 'emocromo', max: 100 },
  { id: 'plt', etichetta: 'Piastrine', unita: '×10³/µl', gruppo: 'emocromo' },

  // Coagulazione
  { id: 'pt', etichetta: 'PT', unita: '%', gruppo: 'coagulazione', max: 200 },
  { id: 'inr', etichetta: 'INR', unita: '', gruppo: 'coagulazione', max: 20 },
  { id: 'ptt', etichetta: 'PTT', unita: 's', gruppo: 'coagulazione' },
  { id: 'fibrinogeno', etichetta: 'Fibrinogeno', unita: 'mg/dl', gruppo: 'coagulazione' },

  // Glicemia e funzione renale
  { id: 'glicemia', etichetta: 'Glicemia', unita: 'mg/dl', gruppo: 'rene' },
  { id: 'azotemia', etichetta: 'Azotemia', unita: 'mg/dl', gruppo: 'rene' },
  { id: 'creatinina', etichetta: 'Creatinina', unita: 'mg/dl', gruppo: 'rene', max: 30 },
  { id: 'acidoUrico', etichetta: 'Acido urico', unita: 'mg/dl', gruppo: 'rene' },

  // Fegato e pancreas
  { id: 'bilTot', etichetta: 'Bilirubina tot.', unita: 'mg/dl', gruppo: 'fegato' },
  { id: 'bilDir', etichetta: 'Bilirubina dir.', unita: 'mg/dl', gruppo: 'fegato' },
  { id: 'ast', etichetta: 'AST', unita: 'U/l', gruppo: 'fegato' },
  { id: 'alt', etichetta: 'ALT', unita: 'U/l', gruppo: 'fegato' },
  { id: 'ggt', etichetta: 'GGT', unita: 'U/l', gruppo: 'fegato' },
  { id: 'alp', etichetta: 'Fosfatasi alc.', unita: 'U/l', gruppo: 'fegato' },
  { id: 'amilasi', etichetta: 'Amilasi', unita: 'U/l', gruppo: 'fegato' },
  { id: 'lipasi', etichetta: 'Lipasi', unita: 'U/l', gruppo: 'fegato' },

  // Elettroliti
  { id: 'na', etichetta: 'Na', unita: 'mEq/l', gruppo: 'elettroliti', max: 200 },
  { id: 'k', etichetta: 'K', unita: 'mEq/l', gruppo: 'elettroliti', max: 12 },
  { id: 'cl', etichetta: 'Cl', unita: 'mEq/l', gruppo: 'elettroliti', max: 200 },
  { id: 'ca', etichetta: 'Ca totale', unita: 'mg/dl', gruppo: 'elettroliti', max: 20 },

  // Proteine e altro
  { id: 'proteine', etichetta: 'Proteine tot.', unita: 'g/dl', gruppo: 'proteine', max: 15 },
  { id: 'albumina', etichetta: 'Albumina', unita: 'g/dl', gruppo: 'proteine', max: 10 },
  { id: 'ck', etichetta: 'CK', unita: 'U/l', gruppo: 'proteine' },

  // Aggiuntivi su richiesta (l'amilasi del drenaggio si inserisce nella sezione Drenaggi)
  { id: 'at3', etichetta: 'Antitrombina III', unita: '%', gruppo: 'aggiuntivi', max: 200 },
  { id: 'ddimero', etichetta: 'D-dimero', unita: 'ng/ml', gruppo: 'aggiuntivi' },
  { id: 'pct', etichetta: 'PCT', unita: 'ng/ml', gruppo: 'aggiuntivi' },
  { id: 'lattati', etichetta: 'Lattati', unita: 'mmol/l', gruppo: 'aggiuntivi', max: 40 },
  { id: 'calcemia', etichetta: 'Calcemia', unita: 'mg/dl', gruppo: 'aggiuntivi', max: 20 },
];
