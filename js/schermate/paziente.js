// Crea / modifica paziente. Solo letto, iniziali ed età: mai nome, cognome, data di nascita, CF.

import { prendi, tutti, salvaInsieme, eliminaPaziente } from '../db.js';
import { nuovoPaziente, nuovaRilevazione, etichettaPaziente } from '../modello.js';
import { INTERVENTI } from '../../config/interventi.js';
import { VIE, SESSI } from '../../config/liste.js';
import {
  el, adesso, dataLocale, normalizzaLetto, nomeLetto, soloLettere, formatIniziali,
} from '../util.js';
import {
  intestazione, fondo, scelta, gruppo, campoNumero, campoTesto, avviso,
} from '../ui.js';

export async function formPaziente(c, id) {
  const esistente = id ? await prendi('pazienti', id) : null;
  if (id && !esistente) { location.hash = '#/'; return; }
  if (esistente && esistente.stato !== 'degenza') { location.hash = `#/paziente/${id}`; return; } // dimesso: sola lettura

  const d = esistente
    ? structuredClone(esistente)
    : { letto: '', iniziali: '', eta: null, sesso: null, peso: null, intervento: { tipo: '', dettaglio: '', data: dataLocale(), via: null, operatore: '' } };
  const errori = new Set();
  const numero = (k, opz) => campoNumero({
    ...opz,
    valore: d[k],
    onCambio: (n, err) => { d[k] = n; if (err) errori.add(k); else errori.delete(k); },
  });

  const inputIniziali = campoTesto({
    etichetta: 'Iniziali',
    valore: d.iniziali,
    placeholder: 'es. M.R.',
    attributi: { autocapitalize: 'characters', maxlength: '8' },
    onCambio: (v) => { d.iniziali = v || ''; },
  });
  inputIniziali.querySelector('input').addEventListener('blur', (e) => { e.target.value = formatIniziali(e.target.value); });

  const selectIntervento = el('select', { onchange: (e) => { d.intervento.tipo = e.target.value; } },
    el('option', { value: '' }, '— scegli —'),
    INTERVENTI.map((i) => el('option', { value: i.id, selected: i.id === d.intervento.tipo }, i.nome)));
  const inputData = el('input', { type: 'date', value: d.intervento.data || '', oninput: (e) => { d.intervento.data = e.target.value; } });

  async function salvaPaziente() {
    const letto = normalizzaLetto(d.letto);
    const lettere = soloLettere(d.iniziali);
    const problemi = [];
    if (!letto) problemi.push('Indica il letto.');
    if (lettere.length < 1 || lettere.length > 3) problemi.push('Iniziali: da 1 a 3 lettere (es. M.R.).');
    if (d.eta == null || !Number.isInteger(d.eta) || d.eta < 0 || d.eta > 110) problemi.push('Età: numero intero tra 0 e 110.');
    if (errori.size) problemi.push('Correggi i campi in rosso.');
    if (!d.intervento.tipo) problemi.push('Scegli l’intervento.');
    if (!d.intervento.data) problemi.push('Indica la data dell’intervento.');
    if (problemi.length) { avviso(problemi[0]); return; }

    const altri = (await tutti('pazienti')).filter((p) => p.stato === 'degenza' && p.id !== d.id && normalizzaLetto(p.letto) === letto);
    if (altri.length && !confirm(`${nomeLetto(letto)} risulta già occupato da ${altri.map((p) => p.iniziali).join(', ')}. Salvare comunque?`)) return;

    const dati = {
      letto,
      iniziali: formatIniziali(lettere),
      eta: d.eta,
      sesso: d.sesso || null,
      peso: d.peso || null,
      intervento: {
        tipo: d.intervento.tipo,
        dettaglio: (d.intervento.dettaglio || '').trim(),
        data: d.intervento.data,
        via: d.intervento.via || null,
        operatore: (d.intervento.operatore || '').trim(),
      },
    };

    let p;
    const rilevazioni = [];
    if (esistente) {
      p = { ...esistente, ...dati, modificatoIl: adesso() };
      if (normalizzaLetto(esistente.letto) !== letto) {
        // Il cambio letto resta nello storico
        rilevazioni.push(nuovaRilevazione(p.id, 'letto', { da: esistente.letto, a: letto }, { dataOra: adesso(), fonte: 'io' }));
      }
    } else {
      p = nuovoPaziente(dati);
    }
    await salvaInsieme({ pazienti: [p], rilevazioni });
    avviso('Paziente salvato');
    location.hash = `#/paziente/${p.id}`;
  }

  async function elimina() {
    if (!confirm(`Eliminare definitivamente ${etichettaPaziente(esistente)} e tutti i suoi dati?\nNon si può annullare.`)) return;
    await eliminaPaziente(esistente.id);
    avviso('Paziente eliminato');
    location.hash = '#/';
  }

  const tornaA = esistente ? `#/paziente/${esistente.id}` : '#/';

  c.append(
    intestazione({ titolo: esistente ? `Modifica ${etichettaPaziente(esistente)}` : 'Nuovo paziente', indietro: tornaA }),
    el('div', { class: 'contenuto' },
      el('section', { class: 'blocco' },
        el('h2', {}, 'Paziente'),
        el('div', { class: 'griglia-2' },
          campoTesto({
            etichetta: 'Letto', valore: d.letto, placeholder: 'es. 12',
            attributi: { inputmode: 'text', autocapitalize: 'characters', maxlength: '6' },
            onCambio: (v) => { d.letto = v || ''; },
          }),
          inputIniziali),
        el('p', { class: 'campo-nota' }, 'Solo le iniziali: niente nome, cognome, data di nascita o codice fiscale.'),
        el('div', { class: 'griglia-2' },
          numero('eta', { etichetta: 'Età', unita: 'anni', min: 0, max: 110, decimale: false }),
          numero('peso', { etichetta: 'Peso (facoltativo)', unita: 'kg', min: 20, max: 300 })),
        el('p', { class: 'campo-nota' }, 'Il peso serve a calcolare la diuresi in ml/kg/h.'),
        gruppo('Sesso (facoltativo)', scelta({ opzioni: SESSI, valore: d.sesso, onCambio: (v) => { d.sesso = v; } }))),
      el('section', { class: 'blocco' },
        el('h2', {}, 'Intervento'),
        el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'Tipo'), selectIntervento),
        campoTesto({
          etichetta: 'Dettaglio (facoltativo)', valore: d.intervento.dettaglio, placeholder: 'es. Emicolectomia dx',
          onCambio: (v) => { d.intervento.dettaglio = v || ''; },
        }),
        el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'Data intervento'), inputData),
        gruppo('Via', scelta({ opzioni: VIE, valore: d.intervento.via, onCambio: (v) => { d.intervento.via = v; } })),
        campoTesto({
          etichetta: 'Primo operatore (facoltativo)', valore: d.intervento.operatore, placeholder: 'es. Dr. Rossi',
          onCambio: (v) => { d.intervento.operatore = v || ''; },
        })),
      esistente ? el('button', { type: 'button', class: 'btn btn-pericolo btn-largo', onclick: elimina }, 'Elimina paziente') : null),
    fondo(
      el('a', { class: 'btn', href: tornaA }, 'Annulla'),
      el('button', { type: 'button', class: 'btn btn-primario', onclick: salvaPaziente }, 'Salva')),
  );
}
