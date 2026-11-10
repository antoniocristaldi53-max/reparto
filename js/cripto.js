// Cifratura con le funzioni del browser (Web Crypto), nessuna libreria esterna.
//  - PIN: se ne salva solo l'impronta (PBKDF2-SHA-256), mai il PIN in chiaro.
//  - Backup: AES-GCM 256 bit, con chiave ricavata dalla password con PBKDF2 (600.000 passaggi).
//
// Web Crypto funziona solo su connessione sicura (HTTPS, oppure localhost sul Mac).
// Sull'iPhone in prova via Wi-Fi (http://192.168…) non c'è: PIN e backup arriveranno
// sull'iPhone con la pubblicazione su HTTPS (tappa 5).

const codifica = new TextEncoder();
const decodifica = new TextDecoder();

export const criptoDisponibile = () => globalThis.isSecureContext === true && !!globalThis.crypto?.subtle;

export const casuale = (n) => crypto.getRandomValues(new Uint8Array(n));

export function inBase64(dati) {
  const b = new Uint8Array(dati);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export const daBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const chiaveBase = (segreto) => crypto.subtle.importKey('raw', codifica.encode(segreto), 'PBKDF2', false, ['deriveBits', 'deriveKey']);

// Impronta del PIN (per confrontarlo senza salvarlo)
export async function improntaPin(pin, sale, iterazioni) {
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sale, iterations: iterazioni, hash: 'SHA-256' }, await chiaveBase(pin), 256,
  );
  return inBase64(bits);
}

const ITERAZIONI_BACKUP = 600000;

async function chiaveAes(password, sale, iterazioni, uso) {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sale, iterations: iterazioni, hash: 'SHA-256' },
    await chiaveBase(password), { name: 'AES-GCM', length: 256 }, false, [uso],
  );
}

// Restituisce la "busta" del backup (oggetto JSON da salvare su file)
export async function cifra(oggetto, password) {
  const sale = casuale(16);
  const iv = casuale(12);
  const chiave = await chiaveAes(password, sale, ITERAZIONI_BACKUP, 'encrypt');
  const dati = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chiave, codifica.encode(JSON.stringify(oggetto)));
  return {
    formato: 'app-reparto-backup',
    versione: 1,
    creatoIl: new Date().toISOString(),
    kdf: { nome: 'PBKDF2', hash: 'SHA-256', iterazioni: ITERAZIONI_BACKUP, sale: inBase64(sale) },
    cifratura: { nome: 'AES-GCM', iv: inBase64(iv) },
    dati: inBase64(dati),
  };
}

export async function decifra(busta, password) {
  if (busta?.formato !== 'app-reparto-backup' || busta.versione !== 1) throw new Error('Questo file non è un backup dell’app.');
  const chiave = await chiaveAes(password, daBase64(busta.kdf.sale), busta.kdf.iterazioni, 'decrypt');
  let chiaro;
  try {
    chiaro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: daBase64(busta.cifratura.iv) }, chiave, daBase64(busta.dati));
  } catch {
    throw new Error('Password errata, oppure file danneggiato.');
  }
  return JSON.parse(decodifica.decode(chiaro));
}
