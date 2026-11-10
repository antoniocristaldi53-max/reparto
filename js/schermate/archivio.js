// Archivio: pazienti dimessi, in sola lettura, fino alla cancellazione automatica.

import { tutti, salvaInsieme } from '../db.js';
import { etichettaPaziente, nomeBreveIntervento } from '../modello.js';
import {
  cancellaScaduti, giorniAllaCancellazione, inScadenza, aggiungiGiorni, GIORNI_RINVIO,
} from '../archivio.js';
import { el, adesso, dataLocale, formatData } from '../util.js';
import { intestazione, avviso } from '../ui.js';

export async function archivio(c) {
  const cancellati = await cancellaScaduti();
  if (cancellati) avviso(`${cancellati} ${cancellati === 1 ? 'paziente cancellato' : 'pazienti cancellati'} dall’archivio (data raggiunta)`);

  const oggi = dataLocale();
  const dimessi = (await tutti('pazienti'))
    .filter((p) => p.stato === 'dimesso')
    .sort((a, b) => a.cancellazioneIl.localeCompare(b.cancellazioneIl));

  async function aggiorna(p, modifiche, messaggio) {
    await salvaInsieme({ pazienti: [{ ...p, ...modifiche, modificatoIl: adesso() }] });
    avviso(messaggio);
    c.replaceChildren();
    await archivio(c);
  }

  const rinvia = (p) => aggiorna(p, {
    cancellazioneIl: aggiungiGiorni(p.cancellazioneIl > oggi ? p.cancellazioneIl : oggi, GIORNI_RINVIO),
  }, `Cancellazione rinviata di ${GIORNI_RINVIO} giorni`);

  const riapri = (p) => {
    if (!confirm(`Riportare ${etichettaPaziente(p)} in reparto (annulla la dimissione)?`)) return;
    aggiorna(p, { stato: 'degenza', dimissione: null, cancellazioneIl: null }, 'Paziente di nuovo in reparto');
  };

  const righe = dimessi.map((p) => {
    const giorni = giorniAllaCancellazione(p, oggi);
    const quando = giorni <= 0 ? 'oggi' : giorni === 1 ? 'domani' : `tra ${giorni} giorni`;
    return el('div', { class: `blocco ${inScadenza(p, oggi) ? 'blocco-allerte attenzione' : ''}` },
      el('a', { class: 'riga-link-archivio', href: `#/paziente/${p.id}` },
        el('div', { class: 'riga-intest' }, `${etichettaPaziente(p)} · ${nomeBreveIntervento(p)}`),
        el('div', { class: 'campo-nota' },
          `Dimesso il ${formatData(p.dimissione?.data)}`,
          p.dimissione?.controllo ? ` · controllo ${formatData(p.dimissione.controllo)}` : ' · controllo non indicato'),
        el('div', { class: inScadenza(p, oggi) ? 'attenzione' : 'campo-nota' },
          `Cancellazione automatica ${quando} (${formatData(p.cancellazioneIl)})`)),
      el('div', { class: 'fondo-interno' },
        el('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => rinvia(p) }, `Rinvia ${GIORNI_RINVIO} gg`),
        el('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => riapri(p) }, 'Riporta in reparto')));
  });

  c.append(
    intestazione({ titolo: 'Archivio', sottotitolo: `${dimessi.length} ${dimessi.length === 1 ? 'paziente dimesso' : 'pazienti dimessi'}`, indietro: '#/' }),
    el('div', { class: 'contenuto' },
      righe.length ? righe : el('p', { class: 'vuoto lista-vuota' }, 'Nessun paziente in archivio.'),
      el('p', { class: 'avvertenza' }, 'I pazienti dimessi si cancellano da soli: 7 giorni dopo il primo controllo, oppure 30 giorni dopo la dimissione se il controllo non è indicato.')),
  );
}
