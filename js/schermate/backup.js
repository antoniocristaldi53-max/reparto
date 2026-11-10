// Backup cifrato con password e ripristino da file.
// Il file contiene pazienti, rilevazioni e preferenze (soglie), ma non il PIN.
// Senza la password il file è illeggibile: nessuno (nemmeno tu) può recuperarlo.

import {
  tutti, salvaInsieme, sostituisciTutto, leggiImpostazione, scriviImpostazione,
} from '../db.js';
import { criptoDisponibile, cifra, decifra } from '../cripto.js';
import { caricaSoglie } from '../soglie.js';
import { el, formatQuando, dataLocale } from '../util.js';
import { intestazione, avviso } from '../ui.js';

const IMPOSTAZIONI_NEL_BACKUP = ['soglie', 'ultimaFonte', 'autore', 'bloccoDopoSecondi'];
const LUNGHEZZA_MINIMA = 8;

const campoPassword = (etichetta, nuova = true) => {
  const input = el('input', { type: 'password', autocomplete: nuova ? 'new-password' : 'current-password', autocapitalize: 'off', spellcheck: 'false' });
  return { input, nodo: el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, etichetta), input) };
};

export async function backup(c) {
  c.append(intestazione({ titolo: 'Backup e ripristino', indietro: '#/impostazioni' }));
  const corpo = el('div', { class: 'contenuto' });
  c.append(corpo);

  if (!criptoDisponibile()) {
    corpo.append(el('div', { class: 'banner-avviso' },
      'Il backup cifrato richiede una connessione sicura (HTTPS). Sul Mac funziona aprendo l’app da http://localhost:8000; sull’iPhone sarà disponibile dopo la pubblicazione (tappa 5).'));
    return;
  }

  const ultimo = await leggiImpostazione('ultimoBackup');

  // --- Crea backup ----------------------------------------------------------------------------
  const pw1 = campoPassword('Password del backup');
  const pw2 = campoPassword('Ripeti la password');
  const esito = el('div', { class: 'pila' });
  const btnCrea = el('button', { type: 'button', class: 'btn btn-primario btn-largo', onclick: crea }, 'Prepara il backup');

  async function crea() {
    const pw = pw1.input.value;
    if (pw.length < LUNGHEZZA_MINIMA) { avviso(`Password: almeno ${LUNGHEZZA_MINIMA} caratteri`); return; }
    if (pw !== pw2.input.value) { avviso('Le due password non coincidono'); return; }
    btnCrea.disabled = true;
    btnCrea.textContent = 'Cifratura in corso…';
    try {
      const [pazienti, rilevazioni] = await Promise.all([tutti('pazienti'), tutti('rilevazioni')]);
      const impostazioni = {};
      for (const k of IMPOSTAZIONI_NEL_BACKUP) {
        const v = await leggiImpostazione(k);
        if (v != null) impostazioni[k] = v;
      }
      const busta = await cifra({ pazienti, rilevazioni, impostazioni }, pw);
      const adesso = new Date();
      const nome = `reparto-backup-${dataLocale(adesso)}-${String(adesso.getHours()).padStart(2, '0')}${String(adesso.getMinutes()).padStart(2, '0')}.json`;
      const file = new File([JSON.stringify(busta)], nome, { type: 'application/json' });
      const url = URL.createObjectURL(file);
      pw1.input.value = '';
      pw2.input.value = '';

      // Secondo tocco per salvare: Safari permette download e condivisione solo subito dopo un tocco
      const segna = () => scriviImpostazione('ultimoBackup', adesso.toISOString());
      const puoCondividere = navigator.canShare?.({ files: [file] });
      esito.replaceChildren(
        el('p', {}, `Backup pronto: ${pazienti.length} pazienti, ${rilevazioni.length} rilevazioni.`),
        el('a', { class: 'btn btn-primario btn-largo', href: url, download: nome, onclick: segna }, 'Salva il file'),
        puoCondividere ? el('button', {
          type: 'button', class: 'btn btn-largo',
          onclick: async () => { try { await navigator.share({ files: [file] }); await segna(); } catch { /* annullato */ } },
        }, 'Condividi… (File, AirDrop)') : null,
        el('p', { class: 'campo-nota' }, 'Conservalo in un posto sicuro (es. app File → iCloud Drive). Il file è cifrato: senza password è illeggibile.'));
    } catch (e) {
      avviso(`Errore: ${e.message}`);
    } finally {
      btnCrea.disabled = false;
      btnCrea.textContent = 'Prepara il backup';
    }
  }

  // --- Ripristina -----------------------------------------------------------------------------
  const inputFile = el('input', { type: 'file', class: 'input-file' });
  const pwR = campoPassword('Password del backup', false);
  const anteprima = el('div', { class: 'pila' });
  const btnLeggi = el('button', { type: 'button', class: 'btn btn-largo', onclick: leggi }, 'Leggi il backup');

  async function leggi() {
    const file = inputFile.files?.[0];
    if (!file) { avviso('Scegli prima il file del backup'); return; }
    btnLeggi.disabled = true;
    btnLeggi.textContent = 'Decifratura in corso…';
    try {
      const busta = JSON.parse(await file.text());
      const dati = await decifra(busta, pwR.input.value);
      if (!Array.isArray(dati.pazienti) || !Array.isArray(dati.rilevazioni)) throw new Error('Contenuto del backup non valido.');
      const attuali = (await tutti('pazienti')).length;
      anteprima.replaceChildren(
        el('p', {}, `Backup creato ${formatQuando(busta.creatoIl)}: ${dati.pazienti.length} pazienti, ${dati.rilevazioni.length} rilevazioni.`),
        el('p', { class: 'campo-nota' }, `Su questo telefono ora ci sono ${attuali} pazienti.`),
        el('button', {
          type: 'button', class: 'btn btn-primario btn-largo',
          onclick: () => applica(dati, 'unisci'),
        }, 'Unisci ai dati attuali'),
        el('p', { class: 'campo-nota' }, 'Aggiunge i pazienti del backup e aggiorna quelli già presenti; non cancella nulla.'),
        el('button', {
          type: 'button', class: 'btn btn-pericolo btn-largo',
          onclick: () => applica(dati, 'sostituisci'),
        }, 'Sostituisci tutti i dati'),
        el('p', { class: 'campo-nota' }, 'Cancella i dati attuali e mette al loro posto quelli del backup.'));
    } catch (e) {
      anteprima.replaceChildren(el('p', { class: 'campo-errore' }, e instanceof SyntaxError ? 'Questo file non è un backup dell’app.' : e.message));
    } finally {
      btnLeggi.disabled = false;
      btnLeggi.textContent = 'Leggi il backup';
    }
  }

  async function applica(dati, modo) {
    if (modo === 'sostituisci' && !confirm('Cancellare i dati attuali e sostituirli con quelli del backup?')) return;
    const contenuto = { pazienti: dati.pazienti, rilevazioni: dati.rilevazioni };
    if (modo === 'sostituisci') await sostituisciTutto(contenuto);
    else await salvaInsieme(contenuto);
    for (const [k, v] of Object.entries(dati.impostazioni || {})) {
      if (IMPOSTAZIONI_NEL_BACKUP.includes(k)) await scriviImpostazione(k, v);
    }
    await caricaSoglie();
    avviso('Backup ripristinato');
    location.hash = '#/';
  }

  corpo.append(
    el('section', { class: 'blocco' },
      el('h2', {}, 'Crea un backup'),
      el('p', { class: 'campo-nota' }, ultimo ? `Ultimo backup: ${formatQuando(ultimo)}.` : 'Non hai ancora fatto nessun backup.'),
      el('p', { class: 'campo-nota' }, `Scegli una password di almeno ${LUNGHEZZA_MINIMA} caratteri, diversa dal PIN. Se la dimentichi il backup non si può più aprire.`),
      pw1.nodo, pw2.nodo, btnCrea, esito),
    el('section', { class: 'blocco' },
      el('h2', {}, 'Ripristina da un backup'),
      el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'File del backup'), inputFile),
      pwR.nodo, btnLeggi, anteprima),
  );
}
