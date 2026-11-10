// Dimissione: il paziente passa in Archivio (sola lettura) fino alla cancellazione automatica.

import { prendi, salvaInsieme } from '../db.js';
import { etichettaPaziente } from '../modello.js';
import { calcolaCancellazione, GIORNI_DOPO_CONTROLLO, GIORNI_DOPO_DIMISSIONE } from '../archivio.js';
import { el, adesso, dataLocale, formatData } from '../util.js';
import { intestazione, fondo, avviso } from '../ui.js';

export async function dimissione(c, id) {
  const p = await prendi('pazienti', id);
  if (!p || p.stato !== 'degenza') { location.hash = id ? `#/paziente/${id}` : '#/'; return; }

  const d = { data: dataLocale(), controllo: '' };
  const nota = el('p', { class: 'campo-nota' });
  const aggiornaNota = () => {
    if (!d.data) { nota.textContent = ''; return; }
    const quando = calcolaCancellazione(d.data, d.controllo || null);
    nota.textContent = `I dati di ${etichettaPaziente(p)} saranno cancellati da questo telefono il ${formatData(quando)} `
      + (d.controllo ? `(controllo + ${GIORNI_DOPO_CONTROLLO} giorni).` : `(dimissione + ${GIORNI_DOPO_DIMISSIONE} giorni, perché manca la data del controllo).`)
      + ' Riceverai un avviso 3 giorni prima e potrai rinviare.';
  };
  aggiornaNota();

  async function conferma() {
    if (!d.data) { avviso('Indica la data di dimissione'); return; }
    if (d.controllo && d.controllo < d.data) { avviso('Il controllo non può essere prima della dimissione'); return; }
    const aggiornato = {
      ...p,
      stato: 'dimesso',
      dimissione: { data: d.data, controllo: d.controllo || null },
      cancellazioneIl: calcolaCancellazione(d.data, d.controllo || null),
      modificatoIl: adesso(),
    };
    await salvaInsieme({ pazienti: [aggiornato] });
    avviso(`${etichettaPaziente(p)} dimesso: ora è in Archivio`);
    location.hash = '#/';
  }

  c.append(
    intestazione({ titolo: `Dimetti ${etichettaPaziente(p)}`, indietro: `#/paziente/${p.id}` }),
    el('div', { class: 'contenuto' },
      el('section', { class: 'blocco' },
        el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'Data di dimissione'),
          el('input', { type: 'date', value: d.data, oninput: (e) => { d.data = e.target.value; aggiornaNota(); } })),
        el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'Data del primo controllo (facoltativa)'),
          el('input', { type: 'date', oninput: (e) => { d.controllo = e.target.value; aggiornaNota(); } })),
        nota),
      el('p', { class: 'avvertenza' }, 'Dopo la dimissione la scheda resta consultabile in Archivio, in sola lettura.')),
    fondo(
      el('a', { class: 'btn', href: `#/paziente/${p.id}` }, 'Annulla'),
      el('button', { type: 'button', class: 'btn btn-primario', onclick: conferma }, 'Conferma dimissione')),
  );
}
