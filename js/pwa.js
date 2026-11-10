// App installabile e offline: registrazione del service worker e avviso di aggiornamento.

import { el } from './util.js';

// Indirizzo ufficiale dell'app pubblicata (HTTPS). È quello da aggiungere alla schermata Home.
export const INDIRIZZO_APP = 'https://antoniocristaldi53-max.github.io/reparto/';

// Sul Mac (localhost) e via Wi-Fi il service worker è spento, così vedi subito ogni modifica.
// Per provarlo in locale aggiungi ?offline all'indirizzo (es. http://localhost:8000/?offline).
const inSviluppo = () => location.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);

export const installata = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

export const offlineAttivo = () => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;

function proponiAggiornamento(nuovo) {
  if (document.querySelector('.banner-aggiornamento')) return;
  const banner = el('div', { class: 'banner-aggiornamento', role: 'status' },
    el('span', {}, 'È disponibile una nuova versione dell’app.'),
    el('button', {
      type: 'button', class: 'btn btn-piccolo btn-primario',
      onclick: () => { banner.querySelector('button').textContent = 'Aggiorno…'; nuovo.postMessage('aggiorna'); },
    }, 'Aggiorna'));
  document.body.append(banner);
}

export async function attivaOffline() {
  if (!('serviceWorker' in navigator)) return;
  if (inSviluppo() && !new URLSearchParams(location.search).has('offline')) return;

  const avevaVersione = !!navigator.serviceWorker.controller;
  let ricaricata = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // passaggio alla versione nuova dopo "Aggiorna" (non al primo avvio)
    if (avevaVersione && !ricaricata) { ricaricata = true; location.reload(); }
  });

  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    if (reg.waiting && navigator.serviceWorker.controller) proponiAggiornamento(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuovo = reg.installing;
      nuovo?.addEventListener('statechange', () => {
        if (nuovo.state === 'installed' && navigator.serviceWorker.controller) proponiAggiornamento(nuovo);
      });
    });
    // controlla se c'è un aggiornamento ogni volta che riapri l'app
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  } catch (e) {
    console.warn('Service worker non registrato:', e);
  }
}
