// Service worker: tiene una copia dei file dell'app sul telefono, così funziona anche senza rete.
// Gestisce solo il CODICE dell'app: i dati dei pazienti stanno in IndexedDB e non passano di qui.
//
// Quando l'app viene aggiornata cambia la VERSIONE: il telefono scarica i file nuovi in
// background e l'app propone "Aggiorna" (niente ricariche a sorpresa durante un inserimento).

// INIZIO ELENCO — generato da strumenti/prepara-pubblicazione.py, non modificare a mano
const VERSIONE = '2026-11-10-c3736e1a36';
const FILE = [
  "./",
  "config/esami.js",
  "config/interventi.js",
  "config/liste.js",
  "config/percorsi.js",
  "config/soglie.js",
  "css/style.css",
  "icone/icona-180.png",
  "icone/icona-192.png",
  "icone/icona-512.png",
  "index.html",
  "js/allerte.js",
  "js/andamento.js",
  "js/app.js",
  "js/archivio.js",
  "js/blocco.js",
  "js/cripto.js",
  "js/dati-prova.js",
  "js/db.js",
  "js/grafico.js",
  "js/modello.js",
  "js/percorso.js",
  "js/pwa.js",
  "js/schermate/andamento.js",
  "js/schermate/archivio.js",
  "js/schermate/backup.js",
  "js/schermate/dimissione.js",
  "js/schermate/impostazioni.js",
  "js/schermate/inserimento.js",
  "js/schermate/lista.js",
  "js/schermate/paziente.js",
  "js/schermate/scheda.js",
  "js/soglie.js",
  "js/ui.js",
  "js/util.js",
  "js/versione.js",
  "manifest.webmanifest"
];
// FINE ELENCO

const CACHE = `reparto-${VERSIONE}`;

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILE.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((nomi) => Promise.all(nomi.filter((n) => n.startsWith('reparto-') && n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// L'app chiede di passare subito alla versione nuova (tocco su "Aggiorna")
self.addEventListener('message', (evento) => {
  if (evento.data === 'aggiorna') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET' || new URL(richiesta.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(richiesta, { ignoreSearch: true })
      .then((copia) => copia || fetch(richiesta))
      .catch(() => (richiesta.mode === 'navigate' ? caches.match('./') : Response.error())),
  );
});
