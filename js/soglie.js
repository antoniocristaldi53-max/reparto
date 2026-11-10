// Soglie in uso: i valori predefiniti di config/soglie.js più le modifiche fatte nelle Impostazioni.

import { SOGLIE } from '../config/soglie.js';
import { leggiImpostazione, scriviImpostazione } from './db.js';

let attuali = { ...SOGLIE };

export const soglie = () => attuali;

export async function caricaSoglie() {
  const modifiche = await leggiImpostazione('soglie', {});
  attuali = { ...SOGLIE, ...modifiche };
}

// Salva solo i valori diversi dai predefiniti
export async function salvaSoglie(nuove) {
  const modifiche = {};
  for (const [k, v] of Object.entries(nuove)) if (k in SOGLIE && v !== SOGLIE[k]) modifiche[k] = v;
  await scriviImpostazione('soglie', modifiche);
  attuali = { ...SOGLIE, ...modifiche };
}
