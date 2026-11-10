// Ciclo di vita dopo la dimissione:
// dimissione → Archivio in sola lettura → cancellazione automatica
//   a data del primo controllo + 7 giorni (oppure dimissione + 30 giorni se manca il controllo),
//   con avviso 3 giorni prima e possibilità di rinviare.

import { tutti, eliminaPaziente } from './db.js';
import { dataLocale, giorniTra } from './util.js';

export const GIORNI_DOPO_CONTROLLO = 7;
export const GIORNI_DOPO_DIMISSIONE = 30;
export const GIORNI_AVVISO = 3;
export const GIORNI_RINVIO = 7;

export function aggiungiGiorni(data, n) {
  const [y, m, g] = data.split('-').map(Number);
  return dataLocale(new Date(y, m - 1, g + n));
}

export const calcolaCancellazione = (dataDimissione, dataControllo) => (dataControllo
  ? aggiungiGiorni(dataControllo, GIORNI_DOPO_CONTROLLO)
  : aggiungiGiorni(dataDimissione, GIORNI_DOPO_DIMISSIONE));

export const giorniAllaCancellazione = (p, oggi = dataLocale()) => giorniTra(oggi, p.cancellazioneIl);

export const inScadenza = (p, oggi = dataLocale()) => p.stato === 'dimesso' && giorniAllaCancellazione(p, oggi) <= GIORNI_AVVISO;

// Cancella i pazienti archiviati arrivati alla data di cancellazione. Restituisce quanti.
export async function cancellaScaduti(oggi = dataLocale()) {
  const scaduti = (await tutti('pazienti')).filter((p) => p.stato === 'dimesso' && p.cancellazioneIl && p.cancellazioneIl <= oggi);
  for (const p of scaduti) await eliminaPaziente(p.id);
  return scaduti.length;
}
