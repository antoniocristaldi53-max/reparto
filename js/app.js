// Avvio dell'app e passaggio tra le schermate (indirizzi dopo il #).

import { leggiImpostazione, richiediPersistenza } from './db.js';
import { impostaAutore } from './modello.js';
import { caricaSoglie } from './soglie.js';
import { proteggi } from './blocco.js';
import { attivaOffline } from './pwa.js';
import { el } from './util.js';
import { lista } from './schermate/lista.js';
import { formPaziente } from './schermate/paziente.js';
import { inserimento } from './schermate/inserimento.js';
import { scheda } from './schermate/scheda.js';
import { andamento } from './schermate/andamento.js';
import { dimissione } from './schermate/dimissione.js';
import { archivio } from './schermate/archivio.js';
import { backup } from './schermate/backup.js';
import { impostazioni } from './schermate/impostazioni.js';

const app = document.getElementById('app');

const rotte = [
  [/^$/, (c) => lista(c)],
  [/^paziente\/nuovo$/, (c) => formPaziente(c, null)],
  [/^paziente\/([\w-]+)\/modifica$/, (c, id) => formPaziente(c, id)],
  [/^paziente\/([\w-]+)\/inserisci$/, (c, id) => inserimento(c, id)],
  [/^paziente\/([\w-]+)\/andamento$/, (c, id) => andamento(c, id)],
  [/^paziente\/([\w-]+)\/dimetti$/, (c, id) => dimissione(c, id)],
  [/^paziente\/([\w-]+)$/, (c, id) => scheda(c, id)],
  [/^archivio$/, (c) => archivio(c)],
  [/^backup$/, (c) => backup(c)],
  [/^impostazioni$/, (c) => impostazioni(c)],
];

async function mostra() {
  const percorso = location.hash.replace(/^#\/?/, '');
  const c = document.createElement('div');
  app.replaceChildren(c);
  window.scrollTo(0, 0);
  for (const [regola, schermata] of rotte) {
    const m = percorso.match(regola);
    if (!m) continue;
    try {
      await schermata(c, ...m.slice(1));
    } catch (e) {
      console.error(e);
      c.replaceChildren(el('div', { class: 'contenuto' },
        el('p', {}, `Si è verificato un errore: ${e.message}`),
        el('a', { class: 'btn', href: '#/' }, 'Torna alla lista')));
    }
    return;
  }
  location.hash = '#/';
}

(async () => {
  impostaAutore(await leggiImpostazione('autore', 'io'));
  await caricaSoglie();
  richiediPersistenza();
  attivaOffline(); // copia dei file sul telefono per l'uso senza rete
  await proteggi(); // PIN: niente viene mostrato prima dello sblocco
  window.addEventListener('hashchange', mostra);
  mostra();
})();
