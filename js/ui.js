// Componenti dell'interfaccia riutilizzati dalle schermate.

import { el, formatNumero, parseNumero } from './util.js';

export const SI_NO = [{ id: true, etichetta: 'Sì' }, { id: false, etichetta: 'No' }];

// Barra in alto. "indietro" può essere un link ('#/') o una funzione.
export function intestazione({ titolo, sottotitolo, indietro, azioni = [] }) {
  let freccia = null;
  if (typeof indietro === 'function') freccia = el('button', { type: 'button', class: 'barra-indietro', 'aria-label': 'Indietro', onclick: indietro }, '‹');
  else if (indietro) freccia = el('a', { class: 'barra-indietro', href: indietro, 'aria-label': 'Indietro' }, '‹');
  return el('header', { class: 'barra' },
    freccia,
    el('div', { class: 'barra-titoli' }, el('h1', {}, titolo), sottotitolo ? el('div', { class: 'barra-sotto' }, sottotitolo) : null),
    el('div', { class: 'barra-azioni' }, azioni));
}

// Barra fissa in basso con i pulsanti principali
export const fondo = (...pulsanti) => el('div', { class: 'fondo' }, el('div', { class: 'fondo-interno' }, pulsanti));

// Gruppo di pulsanti a scelta singola. Toccando di nuovo la scelta attiva la si toglie.
export function scelta({ opzioni, valore = null, onCambio, deselezionabile = true, classe = '' }) {
  let attuale = valore;
  const pulsanti = opzioni.map((o) => el('button', {
    type: 'button',
    class: 'opzione',
    onclick: () => {
      const nuovo = deselezionabile && attuale === o.id ? null : o.id;
      imposta(nuovo);
      onCambio?.(nuovo);
    },
  }, o.etichetta));
  const box = el('div', { class: `segmentato ${classe}`, role: 'group' }, pulsanti);
  function imposta(v) {
    attuale = v;
    pulsanti.forEach((p, i) => p.setAttribute('aria-pressed', String(opzioni[i].id === v)));
  }
  imposta(valore);
  return box;
}

// Etichetta + controllo (per scelte a pulsanti: niente <label>, altrimenti il tocco
// sull'etichetta "premerebbe" il primo pulsante)
export const gruppo = (etichetta, controllo, nota) => el('div', { class: 'campo' },
  el('span', { class: 'campo-etichetta' }, etichetta), controllo, nota ? el('span', { class: 'campo-nota' }, nota) : null);

// Campo numerico: accetta virgola o punto; segnala valori impossibili.
// onCambio(numero | null, messaggioErrore)
export function campoNumero({ etichetta, unita, valore, suggerimento, min, max, decimale = true, onCambio }) {
  const input = el('input', {
    type: 'text', inputmode: decimale ? 'decimal' : 'numeric', autocomplete: 'off',
    placeholder: suggerimento || null, value: valore != null ? formatNumero(valore) : '',
  });
  const errore = el('span', { class: 'campo-errore' });
  input.addEventListener('input', () => {
    const n = parseNumero(input.value);
    let msg = '';
    if (Number.isNaN(n)) msg = 'Non è un numero';
    else if (n != null && ((min != null && n < min) || (max != null && n > max))) {
      msg = `Valore impossibile (${formatNumero(min ?? 0)}–${max != null ? formatNumero(max) : '…'})`;
    }
    errore.textContent = msg;
    input.classList.toggle('invalido', !!msg);
    onCambio?.(Number.isNaN(n) ? null : n, msg);
  });
  return el('label', { class: 'campo' },
    el('span', { class: 'campo-etichetta' }, etichetta),
    el('span', { class: 'input-con-unita' }, input, unita ? el('span', { class: 'unita' }, unita) : null),
    errore);
}

export function campoTesto({ etichetta, valore, placeholder, multilinea = false, onCambio, attributi = {} }) {
  const input = multilinea
    ? el('textarea', { placeholder, ...attributi })
    : el('input', { type: 'text', autocomplete: 'off', placeholder, ...attributi });
  input.value = valore ?? '';
  input.addEventListener('input', () => onCambio?.(input.value.trim() === '' ? null : input.value.trim()));
  return el('label', { class: 'campo' }, etichetta ? el('span', { class: 'campo-etichetta' }, etichetta) : null, input);
}

export function avviso(testo) {
  document.querySelector('.toast')?.remove();
  const t = el('div', { class: 'toast', role: 'status' }, testo);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}
