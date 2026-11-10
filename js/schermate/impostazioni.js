// Impostazioni: soglie delle allerte, dati di prova, cancellazione.
// Sicurezza (PIN, Face ID, backup) e archivio.

import {
  salvaInsieme, svuotaTutto, leggiImpostazione, scriviImpostazione,
} from '../db.js';
import {
  protezione, schermoPin, faceIdPossibile, faceIdAttivo, attivaFaceId, disattivaFaceId,
} from '../blocco.js';
import { generaDatiProva } from '../dati-prova.js';
import { installata, offlineAttivo } from '../pwa.js';
import { VERSIONE } from '../versione.js';
import { SOGLIE, VOCI_SOGLIE } from '../../config/soglie.js';
import { soglie, salvaSoglie } from '../soglie.js';
import { el, formatNumero, formatQuando } from '../util.js';
import {
  intestazione, avviso, campoNumero, scelta, gruppo,
} from '../ui.js';

export async function impostazioni(c) {
  let persistente = false;
  try { persistente = await navigator.storage?.persisted?.(); } catch { /* non supportato */ }

  async function caricaProva() {
    if (!confirm('Aggiungere 6 pazienti INVENTATI (5 in reparto, 1 in archivio), per provare l’app?')) return;
    await salvaInsieme(generaDatiProva());
    avviso('Pazienti di prova caricati');
    location.hash = '#/';
  }

  async function cancellaTutto() {
    if (!confirm('Cancellare TUTTI i pazienti e i dati da questo dispositivo?')) return;
    if (!confirm('Sicuro? L’operazione non si può annullare e non esiste ancora un backup.')) return;
    await svuotaTutto();
    avviso('Dati cancellati');
    location.hash = '#/';
  }

  // --- Soglie delle allerte ---------------------------------------------------------------
  const valori = { ...soglie() };
  const errori = new Set();
  const campiSoglie = VOCI_SOGLIE.map((v) => {
    if (v.gruppo) return el('div', { class: 'campo-etichetta titolo-gruppo' }, v.gruppo);
    const diverso = valori[v.id] !== SOGLIE[v.id];
    return campoNumero({
      etichetta: v.etichetta,
      unita: v.unita,
      valore: valori[v.id],
      min: 0,
      suggerimento: `predefinito ${formatNumero(SOGLIE[v.id])}`,
      onCambio: (n, err) => {
        if (err || n == null) errori.add(v.id); else { errori.delete(v.id); valori[v.id] = n; }
      },
    }).appendChild(el('span', { class: 'campo-nota' },
      [v.nota, diverso ? `modificata (predefinito ${formatNumero(SOGLIE[v.id])})` : null].filter(Boolean).join(' · ')))
      .parentNode;
  });

  async function salvaValori() {
    if (errori.size) { avviso('Correggi i valori in rosso o vuoti'); return; }
    await salvaSoglie(valori);
    avviso('Soglie salvate');
    location.hash = '#/';
  }

  async function ripristina() {
    if (!confirm('Riportare tutte le soglie ai valori predefiniti?')) return;
    await salvaSoglie({ ...SOGLIE });
    avviso('Soglie predefinite ripristinate');
    location.hash = '#/';
  }

  const modificate = VOCI_SOGLIE.filter((v) => v.id && soglie()[v.id] !== SOGLIE[v.id]).length;

  // --- Sicurezza --------------------------------------------------------------------------
  let bSicurezza;
  if (!protezione()) {
    bSicurezza = el('section', { class: 'blocco' }, el('h2', {}, 'Sicurezza'),
      el('p', { class: 'campo-nota' }, 'PIN, Face ID e backup cifrato richiedono una connessione sicura (HTTPS). Sul Mac funzionano da http://localhost:8000; sull’iPhone dopo la pubblicazione (tappa 5).'));
  } else {
    const [fidPossibile, fidAttivo, bloccoDopo, ultimoBackup] = await Promise.all([
      faceIdPossibile(), faceIdAttivo(), leggiImpostazione('bloccoDopoSecondi', 60), leggiImpostazione('ultimoBackup'),
    ]);
    const cambiaPin = async () => { if (await schermoPin('cambia')) avviso('PIN cambiato'); };
    const faceId = async () => {
      try {
        if (fidAttivo) { await disattivaFaceId(); avviso('Face ID disattivato'); } else { await attivaFaceId(); avviso('Face ID attivato'); }
        c.replaceChildren();
        await impostazioni(c);
      } catch { avviso('Face ID non attivato (annullato o non disponibile)'); }
    };
    bSicurezza = el('section', { class: 'blocco' },
      el('h2', {}, 'Sicurezza'),
      el('button', { type: 'button', class: 'btn btn-largo', onclick: cambiaPin }, 'Cambia PIN'),
      fidPossibile
        ? el('button', { type: 'button', class: 'btn btn-largo', onclick: faceId }, fidAttivo ? 'Disattiva sblocco con Face ID' : 'Attiva sblocco con Face ID')
        : el('p', { class: 'campo-nota' }, 'Sblocco con Face ID non disponibile su questo dispositivo/browser.'),
      gruppo('Richiedi il PIN quando torni nell’app dopo', scelta({
        opzioni: [{ id: 0, etichetta: 'subito' }, { id: 60, etichetta: '1 minuto' }, { id: 300, etichetta: '5 minuti' }],
        valore: bloccoDopo,
        deselezionabile: false,
        onCambio: async (v) => { await scriviImpostazione('bloccoDopoSecondi', v); avviso('Salvato'); },
      })),
      el('a', { class: 'btn btn-primario btn-largo', href: '#/backup' }, 'Backup e ripristino'),
      el('p', { class: 'campo-nota' }, ultimoBackup ? `Ultimo backup: ${formatQuando(ultimoBackup)}.` : 'Non hai ancora fatto nessun backup.'));
  }

  c.append(
    intestazione({ titolo: 'Impostazioni', indietro: '#/' }),
    el('div', { class: 'contenuto' },
      bSicurezza,
      el('a', { class: 'btn btn-largo', href: '#/archivio' }, 'Archivio pazienti dimessi'),
      el('details', { class: 'sezione' },
        el('summary', {}, el('span', { class: 'sezione-titolo' }, 'Soglie delle allerte'),
          el('span', { class: 'badge' }, modificate ? `${modificate} ${modificate === 1 ? 'modificata' : 'modificate'}` : '')),
        el('div', { class: 'sezione-corpo' },
          el('p', { class: 'campo-nota' }, 'Valgono per le allerte nella lista e nella scheda, e per le linee rosse nei grafici.'),
          campiSoglie,
          el('button', { type: 'button', class: 'btn btn-primario btn-largo', onclick: salvaValori }, 'Salva soglie'),
          el('button', { type: 'button', class: 'btn btn-largo', onclick: ripristina }, 'Ripristina predefinite'))),
      el('section', { class: 'blocco' },
        el('h2', {}, 'Dati di prova'),
        el('p', { class: 'campo-nota' }, 'Aggiunge 5 pazienti inventati in reparto (letti 3, 7, 12, 15, 21) e 1 già dimesso in Archivio.'),
        el('button', { type: 'button', class: 'btn btn-largo', onclick: caricaProva }, 'Carica pazienti di prova')),
      el('section', { class: 'blocco' },
        el('h2', {}, 'Cancella tutto'),
        el('p', { class: 'campo-nota' }, 'Elimina tutti i pazienti e i dati salvati su questo dispositivo.'),
        el('button', { type: 'button', class: 'btn btn-pericolo btn-largo', onclick: cancellaTutto }, 'Cancella tutti i dati')),
      el('section', { class: 'blocco' },
        el('h2', {}, 'Installazione e informazioni'),
        installata()
          ? el('p', {}, '✓ App installata sulla schermata Home.')
          : el('div', { class: 'banner-avviso' },
            'Per installarla sull’iPhone: in Safari tocca Condividi (il quadrato con la freccia) → “Aggiungi alla schermata Home”. ',
            'Attenzione: i dati della app installata sono separati da quelli di Safari. Usa sempre l’app dalla schermata Home.'),
        el('p', { class: 'campo-nota' }, offlineAttivo()
          ? '✓ Funziona anche senza rete (copia dell’app salvata sul telefono).'
          : 'Uso senza rete: si attiva quando l’app è pubblicata su HTTPS.'),
        el('p', { class: 'campo-nota' }, 'I dati restano solo su questo dispositivo. Nessun dato viene inviato in rete.'),
        el('p', { class: 'campo-nota' }, persistente
          ? 'Il browser ha concesso l’archiviazione persistente.'
          : 'Fuori dalla schermata Home, Safari può cancellare i dati se non apri l’app per 7 giorni: installala e fai backup regolari.'),
        el('p', { class: 'campo-nota' }, `Versione dell’app: ${VERSIONE}`))),
  );
}
