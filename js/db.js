// Salvataggio dei dati sul dispositivo (IndexedDB). Nessun dato esce dal telefono.
//
// Archivi:
//  - pazienti:     un record per paziente
//  - rilevazioni:  ogni valore inserito (vitali, drenaggi, esami…), mai sovrascritto
//  - impostazioni: preferenze dell'app (chiave → valore)

const NOME_DB = 'app-reparto';
const VERSIONE = 1;
let dbPromessa;

function apri() {
  if (!dbPromessa) {
    dbPromessa = new Promise((ok, ko) => {
      const req = indexedDB.open(NOME_DB, VERSIONE);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pazienti')) db.createObjectStore('pazienti', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('rilevazioni')) {
          const s = db.createObjectStore('rilevazioni', { keyPath: 'id' });
          s.createIndex('pazienteId', 'pazienteId');
        }
        if (!db.objectStoreNames.contains('impostazioni')) db.createObjectStore('impostazioni', { keyPath: 'chiave' });
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => ko(req.error);
    });
  }
  return dbPromessa;
}

const richiesta = (req) => new Promise((ok, ko) => {
  req.onsuccess = () => ok(req.result);
  req.onerror = () => ko(req.error);
});

const fine = (tx) => new Promise((ok, ko) => {
  tx.oncomplete = () => ok();
  tx.onerror = () => ko(tx.error);
  tx.onabort = () => ko(tx.error);
});

export async function tutti(archivio) {
  const db = await apri();
  return richiesta(db.transaction(archivio).objectStore(archivio).getAll());
}

export async function prendi(archivio, id) {
  const db = await apri();
  return richiesta(db.transaction(archivio).objectStore(archivio).get(id));
}

export async function rilevazioniDi(pazienteId) {
  const db = await apri();
  return richiesta(db.transaction('rilevazioni').objectStore('rilevazioni').index('pazienteId').getAll(pazienteId));
}

// Salva in un'unica operazione (tutto o niente): { pazienti: [...], rilevazioni: [...] }
export async function salvaInsieme({ pazienti = [], rilevazioni = [] }) {
  const db = await apri();
  const tx = db.transaction(['pazienti', 'rilevazioni'], 'readwrite');
  pazienti.forEach((p) => tx.objectStore('pazienti').put(p));
  rilevazioni.forEach((r) => tx.objectStore('rilevazioni').put(r));
  return fine(tx);
}

export async function eliminaPaziente(id) {
  const db = await apri();
  const tx = db.transaction(['pazienti', 'rilevazioni'], 'readwrite');
  tx.objectStore('pazienti').delete(id);
  const ril = tx.objectStore('rilevazioni');
  const req = ril.index('pazienteId').getAllKeys(id);
  req.onsuccess = () => req.result.forEach((k) => ril.delete(k));
  return fine(tx);
}

export async function svuotaTutto() {
  const db = await apri();
  const tx = db.transaction(['pazienti', 'rilevazioni'], 'readwrite');
  tx.objectStore('pazienti').clear();
  tx.objectStore('rilevazioni').clear();
  return fine(tx);
}

// Ripristino "sostituisci tutto": cancella e reinserisce in un'unica operazione (tutto o niente)
export async function sostituisciTutto({ pazienti = [], rilevazioni = [] }) {
  const db = await apri();
  const tx = db.transaction(['pazienti', 'rilevazioni'], 'readwrite');
  tx.objectStore('pazienti').clear();
  tx.objectStore('rilevazioni').clear();
  pazienti.forEach((p) => tx.objectStore('pazienti').put(p));
  rilevazioni.forEach((r) => tx.objectStore('rilevazioni').put(r));
  return fine(tx);
}

export async function eliminaImpostazione(chiave) {
  const db = await apri();
  const tx = db.transaction('impostazioni', 'readwrite');
  tx.objectStore('impostazioni').delete(chiave);
  return fine(tx);
}

export async function leggiImpostazione(chiave, predefinito = null) {
  const r = await prendi('impostazioni', chiave);
  return r ? r.valore : predefinito;
}

export async function scriviImpostazione(chiave, valore) {
  const db = await apri();
  const tx = db.transaction('impostazioni', 'readwrite');
  tx.objectStore('impostazioni').put({ chiave, valore });
  return fine(tx);
}

// Chiede al browser di non cancellare i dati per mancanza di spazio.
export async function richiediPersistenza() {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* non supportato: nessun problema */ }
}
