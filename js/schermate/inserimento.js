// Schermata 4 — Inserimento rapido dei dati della giornata.
//
// Regole:
//  - Le voci di "stato" (catetere, drenaggi, SNG, alimentazione, mobilizzazione, ferita, terapia)
//    sono precompilate dall'ultimo inserimento e appaiono tratteggiate.
//  - I numeri restano vuoti; l'ultimo valore compare in grigio come promemoria ("ult. 37,2").
//  - Si salvano solo le sezioni che hai toccato (o confermato con "Confermo invariato"):
//    un valore precompilato non viene mai salvato come se fosse di oggi senza un tuo tocco.

import { prendi, rilevazioniDi, salvaInsieme, leggiImpostazione, scriviImpostazione } from '../db.js';
import {
  analizza, nuovaRilevazione, etichettaPaziente, nomeBreveIntervento, podDi, testoPod,
} from '../modello.js';
import {
  FONTI, VITALI, TIPI_DRENAGGIO, ASPETTI_DRENAGGIO, DOSAGGI_DRENAGGIO, ASPETTI_SNG, NAUSEA_VOMITO,
  ALIMENTAZIONE, MOBILIZZAZIONE, FERITA, TERAPIE,
} from '../../config/liste.js';
import { ESAMI, GRUPPI_ESAMI } from '../../config/esami.js';
import { el, perInputDataOra, formatNumero, formatQuando } from '../util.js';
import {
  intestazione, fondo, scelta, gruppo, campoNumero, campoTesto, avviso, SI_NO,
} from '../ui.js';

// Toglie i valori vuoti (anche dentro gli oggetti, es. terapia)
function pulisci(v) {
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (x == null || x === '' || Number.isNaN(x)) continue;
    if (typeof x === 'object' && !Array.isArray(x)) {
      const sub = pulisci(x);
      if (Object.keys(sub).length) out[k] = sub;
    } else out[k] = x;
  }
  return out;
}

const haValori = (s) => Object.keys(pulisci(s.valori)).some((k) => k !== 'n');

export async function inserimento(c, id) {
  const p = await prendi('pazienti', id);
  if (!p) { location.hash = '#/'; return; }
  if (p.stato !== 'degenza') { location.hash = `#/paziente/${id}`; return; } // dimesso: sola lettura
  const a = analizza(p, await rilevazioniDi(id));
  const g = { dataOra: perInputDataOra(), fonte: await leggiImpostazione('ultimaFonte', 'diario') };
  const sezioni = [];
  const pulsanteSalva = el('button', { type: 'button', class: 'btn btn-primario', onclick: salvaTutto }, 'Salva');

  // --- Gestione delle sezioni -------------------------------------------------------------
  function nuova(titolo, categoria, precompilati = {}, rif = null) {
    const pre = pulisci(precompilati);
    const s = {
      titolo, categoria, valori: { ...precompilati }, rif,
      precompilata: !!rif && Object.keys(pre).length > 0,
      toccata: false, fonte: null, errori: new Set(),
    };
    sezioni.push(s);
    return s;
  }

  function aggiorna(s) {
    s.nodo.classList.toggle('precompilata', s.precompilata && !s.toccata);
    let testo = '';
    let classe = 'badge';
    if (s.toccata && s.errori.size) { testo = 'da correggere'; classe += ' errore'; } else if (s.toccata && haValori(s)) { testo = 'da salvare'; classe += ' ok'; } else if (s.precompilata) testo = 'precompilato';
    s.badge.textContent = testo;
    s.badge.className = classe;
  }

  function tocca(s) {
    s.toccata = true;
    aggiorna(s);
    const n = sezioni.filter((x) => x.toccata && haValori(x)).length;
    pulsanteSalva.textContent = n ? `Salva (${n})` : 'Salva';
  }

  function sezioneDom(s, { aperta = false } = {}, ...contenuto) {
    s.badge = el('span', { class: 'badge' });
    const banner = s.precompilata ? el('div', { class: 'banner-precomp' },
      el('span', {}, `Precompilato dall’ultimo inserimento (${formatQuando(s.rif.dataOra)}). Modifica ciò che è cambiato, oppure:`),
      el('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => tocca(s) }, 'Confermo invariato')) : null;
    const fonteDiversa = el('details', { class: 'sotto' },
      el('summary', {}, 'Fonte diversa per questa voce'),
      scelta({ opzioni: FONTI, onCambio: (v) => { s.fonte = v; } }));
    s.nodo = el('details', { class: 'sezione', open: aperta },
      el('summary', {}, el('span', { class: 'sezione-titolo' }, s.titolo), s.badge),
      el('div', { class: 'sezione-corpo' }, banner, contenuto, fonteDiversa));
    aggiorna(s);
    return s.nodo;
  }

  // Campi collegati a una sezione
  const numero = (s, k, opz) => campoNumero({
    ...opz,
    valore: s.valori[k],
    onCambio: (n, err) => {
      s.valori[k] = err ? NaN : n;
      if (err) s.errori.add(k); else s.errori.delete(k);
      tocca(s);
      opz.dopo?.();
    },
  });
  const sceltaDi = (s, k, opzioni, extra = {}) => scelta({
    opzioni, valore: s.valori[k] ?? null, onCambio: (v) => { s.valori[k] = v; tocca(s); }, ...extra,
  });
  const testo = (s, k, opz) => campoTesto({ ...opz, valore: s.valori[k], onCambio: (v) => { s.valori[k] = v; tocca(s); } });
  const ult = (u, dec) => (u ? `ult. ${formatNumero(u.valore, dec)}` : '');

  // --- Data/ora e fonte ---------------------------------------------------------------------
  const blocGlob = el('section', { class: 'blocco' },
    el('label', { class: 'campo' }, el('span', { class: 'campo-etichetta' }, 'Data e ora dei dati'),
      el('input', { type: 'datetime-local', value: g.dataOra, oninput: (e) => { g.dataOra = e.target.value; } })),
    gruppo('Fonte', scelta({ opzioni: FONTI, valore: g.fonte, deselezionabile: false, onCambio: (v) => { g.fonte = v; } })));

  // --- Vitali -------------------------------------------------------------------------------
  const sV = nuova('Vitali', 'vitali');
  const domVitali = sezioneDom(sV, { aperta: true }, el('div', { class: 'griglia-2' }, VITALI.map((x) => numero(sV, x.id, {
    etichetta: x.etichetta, unita: x.unita, min: x.min, max: x.max, decimale: x.decimali > 0, suggerimento: ult(a.vitali[x.id], x.decimali),
  }))));

  // --- Canalizzazione e alimentazione -------------------------------------------------------
  const ug = a.gastro.campi;
  const sG = nuova('Canalizzazione e alimentazione', 'gastro', {
    sng: ug.sng?.valore,
    sngAspetto: ug.sng?.valore === true ? ug.sngAspetto?.valore : null,
    alimentazione: ug.alimentazione?.valore,
  }, a.gastro.ultimo);
  const boxSng = el('div', { class: 'pila', hidden: sG.valori.sng !== true },
    numero(sG, 'sngMl', { etichetta: 'SNG ml/24 h', unita: 'ml', min: 0, max: 5000, decimale: false, suggerimento: ult(ug.sngMl) }),
    gruppo('Aspetto SNG', sceltaDi(sG, 'sngAspetto', ASPETTI_SNG)));
  const giaCanal = a.gastro.primeFeci ? `Già canalizzato a feci (dal POD ${podDi(p, new Date(a.gastro.primeFeci.dataOra))}).`
    : a.gastro.primoGas ? `Già canalizzato a gas (dal POD ${podDi(p, new Date(a.gastro.primoGas.dataOra))}).` : null;
  const domGastro = sezioneDom(sG, { aperta: true },
    el('div', { class: 'griglia-2' }, gruppo('Gas', sceltaDi(sG, 'gas', SI_NO)), gruppo('Feci', sceltaDi(sG, 'feci', SI_NO))),
    giaCanal ? el('p', { class: 'campo-nota' }, giaCanal) : null,
    gruppo('Nausea / vomito', sceltaDi(sG, 'nauseaVomito', NAUSEA_VOMITO)),
    gruppo('SNG', sceltaDi(sG, 'sng', SI_NO, {
      onCambio: (v) => { sG.valori.sng = v; boxSng.hidden = v !== true; tocca(sG); },
    })),
    boxSng,
    gruppo('Alimentazione', sceltaDi(sG, 'alimentazione', ALIMENTAZIONE)));

  // --- Drenaggi (max 2) ---------------------------------------------------------------------
  const domDrenaggi = [1, 2].map((n) => {
    const d = a.drenaggi.find((x) => x.n === n);
    const attivo = !!d && !d.rimosso;
    const pre = attivo ? { sede: d.campi.sede?.valore, tipo: d.campi.tipo?.valore, aspetto: d.campi.aspetto?.valore } : {};
    const titolo = `Drenaggio D${n}${attivo && pre.sede ? ` – ${pre.sede}` : attivo ? '' : ' (nuovo)'}`;
    const s = nuova(titolo, 'drenaggio', pre, attivo ? d.ultimo : null);
    s.valori.n = n;
    const campi = el('div', { class: 'pila' },
      testo(s, 'sede', { etichetta: 'Sede', placeholder: 'es. fianco dx, Douglas, sottoepatico' }),
      gruppo('Tipo', sceltaDi(s, 'tipo', TIPI_DRENAGGIO)),
      numero(s, 'ml', { etichetta: 'Quantità 24 h', unita: 'ml', min: 0, max: 5000, decimale: false, suggerimento: attivo ? ult(d.campi.ml) : '' }),
      gruppo('Aspetto', sceltaDi(s, 'aspetto', ASPETTI_DRENAGGIO)),
      el('details', { class: 'sotto' },
        el('summary', {}, 'Dosaggi sul liquido (facoltativi)'),
        el('div', { class: 'griglia-2' }, DOSAGGI_DRENAGGIO.map((x) => numero(s, x.id, {
          etichetta: x.etichetta, unita: x.unita, min: 0, suggerimento: attivo ? ult(d.campi[x.id]) : '',
        })))),
      gruppo('Rimozione', sceltaDi(s, 'rimosso', [{ id: true, etichetta: 'Drenaggio rimosso' }]),
        'Segna se è stato tolto (alla data e ora indicate in alto).'));
    let contenuto = campi;
    if (d?.rimosso) {
      campi.hidden = true;
      const btnNuovo = el('button', {
        type: 'button', class: 'btn btn-piccolo',
        onclick: () => { campi.hidden = false; btnNuovo.remove(); },
      }, `Nuovo drenaggio in D${n}`);
      contenuto = [el('p', { class: 'campo-nota' }, `D${n} rimosso (${formatQuando(d.ultimo.dataOra)}).`), btnNuovo, campi];
    }
    return sezioneDom(s, { aperta: attivo }, contenuto);
  });

  // --- Diuresi ------------------------------------------------------------------------------
  const ud = a.diuresi;
  const sD = nuova('Diuresi', 'diuresi', { catetere: ud.catetere?.valore }, ud.catetere?.r);
  const notaKgh = el('span', { class: 'campo-nota' });
  const aggiornaKgh = () => {
    const ml = sD.valori.ml;
    if (!p.peso) notaKgh.textContent = 'Per i ml/kg/h inserisci il peso nella scheda del paziente.';
    else notaKgh.textContent = ml > 0 ? `= ${formatNumero(ml / p.peso / 24, 2)} ml/kg/h (peso ${formatNumero(p.peso)} kg)` : '';
  };
  aggiornaKgh();
  const domDiuresi = sezioneDom(sD, { aperta: true },
    numero(sD, 'ml', { etichetta: 'Diuresi 24 h', unita: 'ml', min: 0, max: 15000, decimale: false, suggerimento: ult(ud.ml), dopo: aggiornaKgh }),
    notaKgh,
    gruppo('Catetere vescicale', sceltaDi(sD, 'catetere', SI_NO)));

  // --- Dolore -------------------------------------------------------------------------------
  const sN = nuova('Dolore (NRS)', 'dolore');
  const domDolore = sezioneDom(sN, { aperta: true },
    sceltaDi(sN, 'nrs', Array.from({ length: 11 }, (_, i) => ({ id: i, etichetta: String(i) })), { classe: 'nrs' }),
    a.dolore ? el('span', { class: 'campo-nota' }, `Ultimo: NRS ${a.dolore.valore} (${formatQuando(a.dolore.r.dataOra)})`) : null);

  // --- Mobilizzazione e ferita --------------------------------------------------------------
  const sM = nuova('Mobilizzazione', 'mobilizzazione', { livello: a.mobilizzazione?.valore }, a.mobilizzazione?.r);
  const domMob = sezioneDom(sM, {}, sceltaDi(sM, 'livello', MOBILIZZAZIONE));

  const sF = nuova('Ferita', 'ferita', { stato: a.ferita.stato?.valore }, a.ferita.stato?.r);
  const domFerita = sezioneDom(sF, {},
    sceltaDi(sF, 'stato', FERITA),
    testo(sF, 'nota', { etichetta: 'Nota (facoltativa)', placeholder: 'es. lieve secrezione sierosa al polo inferiore' }));

  // --- Esami --------------------------------------------------------------------------------
  const sE = nuova('Esami', 'esami');
  const campoEsame = (e) => numero(sE, e.id, {
    etichetta: e.etichetta, unita: e.unita, min: 0, max: e.max, suggerimento: ult(a.esami[e.id]),
  });
  const domEsami = sezioneDom(sE, {},
    el('p', { class: 'campo-nota' }, 'Data e ora del prelievo: quelle indicate in alto.'),
    el('div', { class: 'griglia-2' }, ESAMI.filter((e) => e.evidenza).map(campoEsame)),
    GRUPPI_ESAMI.map((gr) => {
      const voci = ESAMI.filter((e) => e.gruppo === gr.id && !e.evidenza);
      return voci.length ? el('details', { class: 'sotto' }, el('summary', {}, gr.nome), el('div', { class: 'griglia-2' }, voci.map(campoEsame))) : null;
    }));

  // --- Terapia (si aggiorna quando cambia) --------------------------------------------------
  const preT = {};
  for (const t of TERAPIE) if (a.terapia[t.id]) preT[t.id] = { ...a.terapia[t.id].valore };
  const sT = nuova('Terapia', 'terapia', preT, a.terapiaUltima);
  for (const t of TERAPIE) if (!sT.valori[t.id]) sT.valori[t.id] = {};
  const domTerapia = sezioneDom(sT, {},
    el('p', { class: 'campo-nota' }, 'Aggiornala solo quando cambia qualcosa.'),
    TERAPIE.map((t) => {
      const o = sT.valori[t.id];
      return el('div', { class: 'pila' },
        gruppo(t.etichetta, scelta({ opzioni: SI_NO, valore: o.attivo ?? null, onCambio: (v) => { o.attivo = v; tocca(sT); } })),
        campoTesto({ valore: o.nome, placeholder: t.esempio, onCambio: (v) => { o.nome = v; tocca(sT); } }));
    }));

  // --- Note ---------------------------------------------------------------------------------
  const sNo = nuova('Note', 'note');
  const domNote = sezioneDom(sNo, {}, testo(sNo, 'testo', { multilinea: true, placeholder: 'Nota libera. Niente nomi o dati identificativi.' }));

  // --- Salvataggio --------------------------------------------------------------------------
  async function salvaTutto() {
    const conErrori = sezioni.filter((s) => s.toccata && s.errori.size);
    if (conErrori.length) {
      conErrori[0].nodo.open = true;
      conErrori[0].nodo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      avviso('Correggi i valori in rosso');
      return;
    }
    const daSalvare = sezioni.filter((s) => s.toccata && haValori(s));
    if (!daSalvare.length) { avviso('Nessun dato da salvare'); return; }
    const quando = new Date(g.dataOra);
    if (Number.isNaN(quando.getTime())) { avviso('Data e ora non valide'); return; }
    if (quando.getTime() > Date.now() + 3600e3 && !confirm('La data/ora indicata è nel futuro. Salvare comunque?')) return;

    const rilevazioni = daSalvare.map((s) => nuovaRilevazione(p.id, s.categoria, pulisci(s.valori), {
      dataOra: quando.toISOString(), fonte: s.fonte || g.fonte,
    }));
    await salvaInsieme({ rilevazioni });
    await scriviImpostazione('ultimaFonte', g.fonte);
    avviso(`Salvato (${rilevazioni.length} ${rilevazioni.length === 1 ? 'voce' : 'voci'})`);
    location.hash = `#/paziente/${p.id}`;
  }

  function esci() {
    if (sezioni.some((s) => s.toccata) && !confirm('Uscire senza salvare? I dati inseriti andranno persi.')) return;
    location.hash = `#/paziente/${p.id}`;
  }

  c.append(
    intestazione({
      titolo: etichettaPaziente(p),
      sottotitolo: ['Inserimento', nomeBreveIntervento(p), testoPod(podDi(p))].filter(Boolean).join(' · '),
      indietro: esci,
    }),
    el('div', { class: 'contenuto' },
      blocGlob, domVitali, domGastro, domDrenaggi, domDiuresi, domDolore, domMob, domFerita, domEsami, domTerapia, domNote),
    fondo(el('button', { type: 'button', class: 'btn', onclick: esci }, 'Annulla'), pulsanteSalva),
  );
}
