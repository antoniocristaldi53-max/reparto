// Blocco con PIN (4 cifre) all'apertura e quando l'app torna in primo piano dopo un po'.
// Sblocco facoltativo con Face ID (WebAuthn, funziona solo su HTTPS o localhost).
//
// È un blocco dell'interfaccia: protegge da chi prende in mano il telefono sbloccato.
// I dati restano protetti anche dal codice di sblocco dell'iPhone.

import {
  leggiImpostazione, scriviImpostazione, eliminaImpostazione, svuotaTutto,
} from './db.js';
import {
  criptoDisponibile, improntaPin, casuale, inBase64, daBase64,
} from './cripto.js';
import { el } from './util.js';

const CIFRE = 4; // lunghezza dei PIN nuovi
const CIFRE_PIN_VECCHI = 6; // i PIN creati prima (6 cifre) continuano a funzionare finché non li cambi
const ITERAZIONI_PIN = 200000;
const ERRORI_PRIMA_DI_ATTESA = 5;

let protezioneAttiva = false;
let schermoAperto = false;
export const protezione = () => protezioneAttiva;

// --- Face ID (WebAuthn) ------------------------------------------------------------------------

export async function faceIdPossibile() {
  try {
    return globalThis.isSecureContext === true && !!window.PublicKeyCredential
      && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function faceIdAttivo() {
  const f = await leggiImpostazione('faceId');
  return !!f && f.rpId === location.hostname;
}

export async function attivaFaceId() {
  const credenziale = await navigator.credentials.create({
    publicKey: {
      challenge: casuale(32),
      rp: { name: 'Reparto' },
      user: { id: casuale(16), name: 'reparto', displayName: 'Reparto' }, // nessun dato personale
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  await scriviImpostazione('faceId', { id: inBase64(credenziale.rawId), rpId: location.hostname });
}

export const disattivaFaceId = () => eliminaImpostazione('faceId');

async function sbloccaConFaceId() {
  const f = await leggiImpostazione('faceId');
  if (!f) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: {
        challenge: casuale(32),
        allowCredentials: [{ type: 'public-key', id: daBase64(f.id) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    const flag = new Uint8Array(r.response.authenticatorData)[32];
    return (flag & 0x04) !== 0; // il telefono ha verificato davvero la persona (Face ID / codice)
  } catch { return false; }
}

// --- PIN ---------------------------------------------------------------------------------------

async function verificaPin(pin) {
  const d = await leggiImpostazione('pin');
  return !!d && (await improntaPin(pin, daBase64(d.sale), d.iterazioni)) === d.impronta;
}

async function salvaPin(pin) {
  const sale = casuale(16);
  await scriviImpostazione('pin', {
    sale: inBase64(sale), impronta: await improntaPin(pin, sale, ITERAZIONI_PIN), iterazioni: ITERAZIONI_PIN, cifre: pin.length,
  });
}

const pinTroppoSemplice = (pin) => /^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin);

// Dopo 5 errori: attesa crescente (30 s, 1 min, 2 min… fino a 15 min). Resta anche se si ricarica la pagina.
async function secondiDiAttesa() {
  const t = await leggiImpostazione('pinTentativi', { errori: 0, bloccatoFino: 0 });
  return Math.max(0, Math.ceil((t.bloccatoFino - Date.now()) / 1000));
}
async function registraErrore() {
  const t = await leggiImpostazione('pinTentativi', { errori: 0, bloccatoFino: 0 });
  t.errori += 1;
  if (t.errori >= ERRORI_PRIMA_DI_ATTESA) {
    t.bloccatoFino = Date.now() + Math.min(30000 * 2 ** (t.errori - ERRORI_PRIMA_DI_ATTESA), 15 * 60000);
  }
  await scriviImpostazione('pinTentativi', t);
}
const azzeraErrori = () => scriviImpostazione('pinTentativi', { errori: 0, bloccatoFino: 0 });

// Schermo del PIN. modo: 'crea' | 'sblocca' | 'cambia'.
// Restituisce true quando è finito (false se annullato: possibile solo in 'cambia').
export function schermoPin(modo) {
  return new Promise((risolvi) => {
    schermoAperto = true;
    let fase = modo === 'crea' ? 'nuovo' : 'attuale';
    let digitato = '';
    let primo = '';
    let occupato = false;

    const titolo = el('div', { class: 'blocco-titolo' });
    const spiegazione = el('div', { class: 'campo-nota blocco-spiegazione' });
    // lunghezza attesa: quella del PIN salvato quando lo si verifica, 4 cifre quando se ne crea uno
    let cifreSalvato = CIFRE;
    leggiImpostazione('pin').then((d) => { if (d) { cifreSalvato = d.cifre ?? CIFRE_PIN_VECCHI; aggiorna(); } });
    const lunghezza = () => (fase === 'attuale' ? cifreSalvato : CIFRE);
    const pallini = el('div', { class: 'pallini', 'aria-hidden': 'true' });
    const messaggio = el('div', { class: 'blocco-messaggio', role: 'alert' });

    const TITOLI = {
      attuale: modo === 'cambia' ? 'PIN attuale' : 'Inserisci il PIN',
      nuovo: modo === 'crea' ? `Crea un PIN di ${CIFRE} cifre` : `Nuovo PIN (${CIFRE} cifre)`,
      conferma: 'Ripeti il PIN',
    };
    function aggiorna() {
      titolo.textContent = TITOLI[fase];
      spiegazione.textContent = fase === 'nuovo' && modo === 'crea'
        ? 'Servirà ogni volta che apri l’app. Non è il codice dell’iPhone.' : '';
      pallini.replaceChildren(...Array.from({ length: lunghezza() }, (_, i) => el('span', { class: i < digitato.length ? 'pieno' : null })));
    }

    function chiudi(esito) {
      document.removeEventListener('keydown', tastiera);
      schermo.remove();
      document.body.classList.remove('bloccato');
      schermoAperto = false;
      risolvi(esito);
    }

    async function completo() {
      const pin = digitato;
      digitato = '';
      if (fase === 'attuale') {
        const attesa = await secondiDiAttesa();
        if (attesa) { messaggio.textContent = `Troppi tentativi. Riprova tra ${attesa} s.`; return; }
        if (await verificaPin(pin)) {
          await azzeraErrori();
          messaggio.textContent = '';
          if (modo === 'sblocca') { chiudi(true); return; }
          fase = 'nuovo';
        } else {
          await registraErrore();
          const nuovaAttesa = await secondiDiAttesa();
          messaggio.textContent = nuovaAttesa ? `PIN errato. Troppi tentativi: riprova tra ${nuovaAttesa} s.` : 'PIN errato.';
        }
      } else if (fase === 'nuovo') {
        if (pinTroppoSemplice(pin)) { messaggio.textContent = 'PIN troppo semplice: evita cifre uguali o in fila.'; return; }
        primo = pin;
        messaggio.textContent = '';
        fase = 'conferma';
      } else {
        if (pin !== primo) { messaggio.textContent = 'I due PIN non coincidono. Ricomincia.'; fase = 'nuovo'; return; }
        await salvaPin(pin);
        await azzeraErrori();
        chiudi(true);
      }
    }

    async function premi(cifra) {
      if (occupato || digitato.length >= lunghezza()) return;
      digitato += cifra;
      aggiorna();
      if (digitato.length === lunghezza()) {
        occupato = true;
        await completo();
        occupato = false;
        aggiorna();
      }
    }
    function cancella() { digitato = digitato.slice(0, -1); aggiorna(); }
    function tastiera(e) {
      if (/^\d$/.test(e.key)) premi(e.key);
      else if (e.key === 'Backspace') cancella();
    }

    async function dimenticato() {
      if (!confirm('Senza PIN l’unico modo per riusare l’app è CANCELLARE TUTTI I DATI di questo telefono.\nPotrai poi ripristinare un backup, se ne hai uno.\n\nContinuare?')) return;
      if (!confirm('Confermi la cancellazione di tutti i pazienti e i dati? Non si può annullare.')) return;
      await svuotaTutto();
      await Promise.all(['pin', 'faceId', 'pinTentativi'].map(eliminaImpostazione));
      modo = 'crea';
      fase = 'nuovo';
      TITOLI.nuovo = `Crea un PIN di ${CIFRE} cifre`;
      messaggio.textContent = 'Dati cancellati. Crea un nuovo PIN.';
      aggiorna();
      piede.replaceChildren();
    }

    const tasto = (testo, azione, classe = 'tasto', etichetta) => el('button', {
      type: 'button', class: classe, onclick: azione, 'aria-label': etichetta || testo,
    }, testo);
    // invisibile (non nascosto) per non spostare lo 0 nel tastierino
    const tastoFaceId = el('button', { type: 'button', class: 'tasto tasto-testo invisibile', onclick: provaFaceId }, 'Face ID');
    async function provaFaceId() {
      if (await sbloccaConFaceId()) { await azzeraErrori(); chiudi(true); } else messaggio.textContent = 'Face ID non riuscito: usa il PIN.';
    }

    const piede = el('div', { class: 'blocco-piede' },
      modo === 'sblocca' ? el('button', { type: 'button', class: 'link-testo', onclick: dimenticato }, 'PIN dimenticato?') : null,
      modo === 'cambia' ? el('button', { type: 'button', class: 'link-testo', onclick: () => chiudi(false) }, 'Annulla') : null);

    const schermo = el('div', { class: 'schermo-blocco', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Blocco con PIN' },
      el('div', { class: 'blocco-icona', 'aria-hidden': 'true' }, '🔒'),
      titolo, spiegazione,
      pallini,
      messaggio,
      el('div', { class: 'tastierino' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => tasto(n, () => premi(n))),
        tastoFaceId,
        tasto('0', () => premi('0')),
        tasto('⌫', cancella, 'tasto tasto-testo', 'Cancella')),
      piede);

    document.body.classList.add('bloccato');
    document.body.append(schermo);
    document.addEventListener('keydown', tastiera);
    aggiorna();

    if (modo === 'sblocca') {
      faceIdAttivo().then(async (attivo) => {
        if (!attivo || !(await faceIdPossibile())) return;
        tastoFaceId.classList.remove('invisibile');
        provaFaceId(); // Safari potrebbe chiedere un tocco: in quel caso resta il pulsante
      });
    }
  });
}

// Avvio: crea o chiede il PIN, poi blocca di nuovo quando l'app torna in primo piano dopo un po'.
export async function proteggi() {
  if (!criptoDisponibile()) return; // connessione non sicura (prova via Wi-Fi): nessun blocco possibile
  protezioneAttiva = true;
  await schermoPin((await leggiImpostazione('pin')) ? 'sblocca' : 'crea');

  let nascostaDa = null;
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      nascostaDa = Date.now();
      document.body.classList.add('oscurato'); // niente dati nell'anteprima delle app aperte
      return;
    }
    const limite = (await leggiImpostazione('bloccoDopoSecondi', 60)) * 1000;
    if (nascostaDa && Date.now() - nascostaDa >= limite && !schermoAperto) {
      document.body.classList.remove('oscurato');
      await schermoPin('sblocca');
    }
    document.body.classList.remove('oscurato');
  });
}
